import {uploadedMediaOrigin} from './server/media-origin';
import { installProfileVideo } from './server/profile-video';
import { installPeople } from './server/people';
import { installDirectoryRequests } from './server/directory-requests';
import { installDirectorySettings } from './server/directory-settings';
import { installVerification } from './server/verification';
import { startDirectoryMailWorker } from './server/directory-email';
import { installLegalHistory, recordLegalVersion } from './server/legal-history';
import { archiveLegalVersionFile } from './server/legal-history-storage';
import { validateVideoCover } from './shared/video-cover';
import { validatePhotoFocus } from './shared/photo-focus';
import { installWelcome } from './server/welcome';
import { CLOUD, flushCloud, assertCloudHealthy, uploadCloud, signedMedia, signedStaticMedia } from './server/cloud-store';
import { hydrateCloudDatabase } from './server/storage';
import 'dotenv/config';
import { UPLOADS_DIR, DB_FILE, storageDiagnostics } from './server/storage';
import { randomBytes } from 'node:crypto';
import { installSyncpayPayments } from './server/payments.ts';
import { installConsumptionPolicy } from './server/consumption.ts';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { DB, loadDB, DBPost, DBUser, DBStory, DBComment, DBMessage, DBConversation, DBNotification } from './server/db.ts';
import { checkSupabaseConnection, isSupabaseConfigured, updateSupabaseCredentials } from './server/supabase.ts';

async function bootApplication() {
if (CLOUD) { await hydrateCloudDatabase(); loadDB(); }
const app = express();
if (!DB.get().engagementRestored) {
  DB.get().posts.forEach(p => { p.allowComments = true; });
  DB.get().engagementRestored = true; DB.save();
}
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || DB.get().authSecret || randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET && !DB.get().authSecret) { DB.get().authSecret = JWT_SECRET; DB.save(); }
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

// Storage setup for real file uploads
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
    const uniqueName = `yume_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage: CLOUD ? multer.memoryStorage() : storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Middlewares
app.use('/api/directory-requests', express.json({ limit: '16kb' }));
app.use(express.json({ limit: '50mb', verify: (req, _res, buf) => { if (req.url === '/api/syncpay/webhook') (req as any).rawBody = Buffer.from(buf); } }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// No API acknowledgement is sent before its queued remote snapshot is durable.
app.use((req, res, next) => {
  if (!CLOUD || (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/'))) return next();
  try { assertCloudHealthy(); } catch { return res.status(503).json({error:'Banco temporariamente indisponível. Aguarde a reconexão do serviço.'}); }
  const send = res.json.bind(res);
  res.json = ((body: unknown) => {
    flushCloud().then(() => { if (!res.destroyed) send(body); }).catch(() => {
      if (!res.destroyed) { res.removeHeader('Set-Cookie'); res.status(503); send({error:'A gravação no banco não foi confirmada. Reinicie o serviço para reconectar; os dados remotos foram preservados.'}); }
    });
    return res;
  }) as typeof res.json;
  next();
});
// Media is served after the consumption policy below.

// SSE Clients for Live Real-Time Notifications & Messages
interface SSEClient {
  id: string;
  userId: string;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

function broadcastEvent(recipientUserId: string, eventType: string, data: any) {
  const targets = sseClients.filter(c => c.userId === recipientUserId);
  targets.forEach(client => {
    try {
      client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error('Error sending SSE:', e);
    }
  });
}

// Auth Helper Middleware
function getAuthUserId(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado. Por favor faça login.' });
  }
  (req as any).userId = userId;
  next();
}

installWelcome(app, DB, requireAdmin);
installDirectoryRequests(app, DB, requireAdmin);
installDirectorySettings(app, DB, requireAdmin,async()=>{await recordLegalVersion(DB,archiveLegalVersionFile);});
installVerification(app, DB, requireAdmin);
const directoryMail = startDirectoryMailWorker(DB, flushCloud);
installLegalHistory(app, DB);
installConsumptionPolicy(app, DB, JWT_SECRET, getAuthUserId, requireAdmin);
installPeople(app, DB, requireAdmin);
installProfileVideo(app, requireAdmin);
app.use('/uploads', async (req, res, next) => {
  if (!CLOUD) return next();
  try {
    await flushCloud();
    const url = await signedMedia(req.path.slice(1));
    res.setHeader('Cache-Control', 'private, no-store');
    return res.redirect(307, url);
  } catch {
    if (!res.headersSent && !res.destroyed) res.status(503).json({error:'Mídia temporariamente indisponível.'});
  }
});
if (!CLOUD) app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1h', setHeaders: res => res.setHeader('Cache-Control', 'private, max-age=3600') }));

// ----------------------------------------------------
//  SUPABASE INTEGRATION & STATUS
// ----------------------------------------------------
app.get('/api/supabase/public-config', (_req, res) => {
 const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
 const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
 let safe = key.startsWith('sb_publishable_');
 try { safe ||= JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role === 'anon'; } catch {}
 res.json({url, anonKey: safe ? key : ''});
});

app.get('/api/supabase/status', async (_req, res) => {
  if (CLOUD) return res.json({status:'connected',configured:true,connected:true,url:process.env.SUPABASE_URL,tablesFound:['mocinhas_app_state','mocinhas_app_backups'],tablesMissing:[],message:'Persistência Supabase ativa.'});
  const status = await checkSupabaseConnection();
  res.json({
    status: status.connected ? 'connected' : (status.configured ? 'misconfigured' : 'not_configured'),
    configured: status.configured,
    connected: status.connected,
    url: status.url || null,
    tablesFound: status.tablesFound || [],
    tablesMissing: status.tablesMissing || [],
    message: status.connected
      ? 'Supabase conectado com sucesso! '
      : (status.configured ? (status.error || 'Credenciais fornecidas, aguardando validação das tabelas.') : 'Aguardando configuração de SUPABASE_URL e SUPABASE_ANON_KEY.'),
    error: status.error,
  });
});

app.get('/api/supabase/schema', (_req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), CLOUD ? 'supabase/mocinhas_persistence.sql' : 'supabase_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      return res.type('text/plain; charset=utf-8').send(sql);
    }
    res.status(404).send('-- Arquivo supabase_schema.sql não encontrado.');
  } catch (err: any) {
    res.status(500).send(`-- Erro ao ler schema: ${err.message}`);
  }
});

app.post('/api/supabase/config', requireAdmin, express.json(), async (req, res) => {
  if (CLOUD) return res.status(409).json({error:'Para trocar o banco ativo, altere as variáveis do Render e reinicie o serviço. O painel não muda o projeto em uso.'});
  const { url, key, serviceRoleKey } = req.body;
  if (!url || !key) {
    return res.status(400).json({ error: 'URL e Anon Key do Supabase são obrigatórios.' });
  }

  updateSupabaseCredentials(url, key, serviceRoleKey);
  const status = await checkSupabaseConnection();
  res.json({
    success: true,
    message: 'Configurações do Supabase atualizadas com sucesso!',
    status,
  });
});

// ----------------------------------------------------
//  SERVER-SENT-EVENTS (SSE) FOR REAL-TIME SYNC
// ----------------------------------------------------
app.get('/api/events', (req, res) => {
  const token = req.query.token as string;
  let userId: string | null = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (e) {}
  }

  if (!userId) {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `${userId}_${Date.now()}_${Math.random()}`;
  const client: SSEClient = { id: clientId, userId, res };
  sseClients.push(client);

  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// ----------------------------------------------------
//  AUTHENTICATION ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { username, displayName, email, password, gender, avatar, banner, acceptedTerms } = req.body;
  if (!username || !displayName || !email || !password) {
    return res.status(400).json({ error: 'Por favor preencha todos os campos obrigatórios! ' });
  }

  if (!acceptedTerms) {
    return res.status(400).json({ error: 'É obrigatório ler e aceitar os Termos de Uso e Responsabilidade para criar sua conta no mocinhas.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'O username deve ter pelo menos 3 caracteres.' });
  }

  if (DB.findUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'Esse username já está sendo usado por outro usuário! ' });
  }
  if (DB.findUserByEmail(email)) {
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  }

  const selectedAvatar = '/profile-placeholder.svg';

  const passwordHash = bcrypt.hashSync(password, 10);
  const isSuperAdmin = false; // Public signup never grants administrator privileges.

  const newUser: DBUser = {
    id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    avatar: selectedAvatar,
    gender: gender === 'masculino' || gender === 'feminino' || gender === 'outro' ? gender : 'feminino',
    bio: isSuperAdmin ? 'Administrador Oficial da Plataforma ' : ' Bem-vindo ao meu perfil no mocinhas! ',
    banner: banner || 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1200&auto=format&fit=crop&q=80',
    isPrivate: false,
    isVerified: isSuperAdmin,
    isAdmin: isSuperAdmin,
    animeTitle: isSuperAdmin ? 'Administrador Chefe ' : 'Criador Digital ',
    themeColor: '#FF69B4',
    website: '',
    createdAt: new Date().toISOString(),
    acceptedTerms: true,
    acceptedTermsAt: new Date().toISOString(),
  };

  DB.createUser(newUser);

  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });
  const publicUser = DB.toPublicUser(newUser, newUser.id);
  res.json({ token, user: publicUser });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe seu login e senha.' });
  }

  const cleanIdent = identifier.trim().toLowerCase();
  const normalizedIdent = cleanIdent.replace('*', '.');
  const user =
    DB.findUserByUsername(cleanIdent) ||
    DB.findUserByEmail(cleanIdent) ||
    DB.findUserByUsername(normalizedIdent) ||
    DB.findUserByEmail(normalizedIdent);

  if (!user) {
    return res.status(400).json({ error: 'Usuário ou e-mail não encontrado ' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Senha incorreta. Tente novamente! ' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  const publicUser = DB.toPublicUser(user, user.id);
  res.json({ token, user: publicUser });
});

app.get('/api/auth/me', (req, res) => {
  const currentUserId = getAuthUserId(req);
  if (!currentUserId) {
    return res.status(401).json({ error: 'Sessão expirada' });
  }
  const user = DB.findUserById(currentUserId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não existe' });
  }
  res.json({ user: DB.toPublicUser(user, currentUserId) });
});

app.post('/api/auth/recover', (req, res) => {
  const { email } = req.body;
  const user = DB.findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: 'Nenhum perfil encontrado com esse e-mail.' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  DB.updateUser(user.id, { recoveryToken: code });
  res.json({
    success: true,
    message: `Código de recuperação gerado: ${code}  (Use-o para redefinir sua senha)`,
    demoCode: code
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = DB.findUserByEmail(email);
  if (!user || user.recoveryToken !== code) {
    return res.status(400).json({ error: 'Código de recuperação inválido ou expirado.' });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  DB.updateUser(user.id, { passwordHash, recoveryToken: undefined });
  res.json({ success: true, message: 'Senha atualizada com sucesso! ' });
});

app.post('/api/auth/update-password', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body;
  const user = DB.findUserById(userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  DB.updateUser(userId, { passwordHash });
  res.json({ success: true, message: 'Senha alterada com sucesso! ' });
});

app.delete('/api/auth/delete-account', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  DB.deleteUser(userId);
  res.json({ success: true, message: 'Conta excluída com sucesso. Sentiremos sua falta! ' });
});

// ----------------------------------------------------
//  USERS & PROFILES ENDPOINTS
// ----------------------------------------------------
app.get('/api/users/:username', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const { username } = req.params;
  const user = DB.findUserByUsername(username) || DB.findUserById(username);
  if (!user) {
    return res.status(404).json({ error: 'Perfil não encontrado ' });
  }

  const publicUser = DB.toPublicUser(user, currentUserId);
  const canView = DB.canViewUserContent(user.id, currentUserId);

  res.json({ user: publicUser, canViewContent: canView });
});

app.put('/api/users/me/profile', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { displayName, bio, banner, avatar, gender, isPrivate, animeTitle, themeColor, website } = req.body;

  const updated = DB.updateUser(userId, {
    ...(displayName && { displayName: displayName.trim() }),
    ...(bio !== undefined && { bio }),
    ...(banner && { banner }),
    ...(avatar && { avatar }),
    ...(gender && { gender }),
    ...(typeof isPrivate === 'boolean' && { isPrivate }),
    ...(animeTitle !== undefined && { animeTitle }),
    ...(themeColor && { themeColor }),
    ...(website !== undefined && { website }),
  });

  if (!updated) return res.status(404).json({ error: 'Erro ao atualizar perfil' });
  res.json({ user: DB.toPublicUser(updated, userId) });
});

app.post('/api/users/:id/follow', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const targetUserId = req.params.id;

  if (currentUserId === targetUserId) {
    return res.status(400).json({ error: 'Você não pode seguir a si mesma(o) ♡' });
  }

  const targetUser = DB.findUserById(targetUserId);
  if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });

  const currentUser = DB.findUserById(currentUserId)!;
  const rawDb = DB.get();

  // Check if already following
  const existing = rawDb.follows.find(f => f.followerId === currentUserId && f.followingId === targetUserId);
  if (existing) {
    return res.json({ status: existing.status });
  }

  const status = targetUser.isPrivate ? 'pending' : 'accepted';
  const newFollow = {
    id: `f_${Date.now()}`,
    followerId: currentUserId,
    followingId: targetUserId,
    status: status as 'pending' | 'accepted',
    createdAt: new Date().toISOString()
  };
  rawDb.follows.push(newFollow);

  // Notification
  const notif: DBNotification = {
    id: `notif_${Date.now()}`,
    recipientId: targetUserId,
    actorId: currentUserId,
    type: targetUser.isPrivate ? 'follow_request' : 'follow',
    targetId: currentUserId,
    targetType: 'user',
    textSnippet: targetUser.isPrivate ? 'solicitou para seguir seu perfil privado' : 'começou a seguir você ',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  rawDb.notifications.push(notif);
  DB.save();

  broadcastEvent(targetUserId, 'notification', { ...notif, actor: DB.toPublicUser(currentUser) });

  res.json({ status, user: DB.toPublicUser(targetUser, currentUserId) });
});

app.post('/api/users/:id/unfollow', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const targetUserId = req.params.id;
  const rawDb = DB.get();

  rawDb.follows = rawDb.follows.filter(f => !(f.followerId === currentUserId && f.followingId === targetUserId));
  DB.save();

  const targetUser = DB.findUserById(targetUserId);
  res.json({ success: true, user: targetUser ? DB.toPublicUser(targetUser, currentUserId) : null });
});

app.get('/api/users/follow-requests/pending', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();
  const requests = rawDb.follows
    .filter(f => f.followingId === currentUserId && f.status === 'pending')
    .map(f => {
      const u = DB.findUserById(f.followerId);
      return {
        id: f.id,
        followerId: f.followerId,
        createdAt: f.createdAt,
        requester: u ? DB.toPublicUser(u, currentUserId) : null
      };
    })
    .filter(r => r.requester !== null);
  res.json({ requests });
});

app.post('/api/users/follow-requests/:id/accept', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const requestId = req.params.id;
  const rawDb = DB.get();

  const follow = rawDb.follows.find(f => f.id === requestId && f.followingId === currentUserId);
  if (!follow) return res.status(404).json({ error: 'Solicitação não encontrada' });

  follow.status = 'accepted';
  const notif: DBNotification = {
    id: `notif_${Date.now()}`,
    recipientId: follow.followerId,
    actorId: currentUserId,
    type: 'follow_accept',
    targetId: currentUserId,
    targetType: 'user',
    textSnippet: 'aceitou sua solicitação para seguir ',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  rawDb.notifications.push(notif);
  DB.save();

  const currentUser = DB.findUserById(currentUserId)!;
  broadcastEvent(follow.followerId, 'notification', { ...notif, actor: DB.toPublicUser(currentUser) });

  res.json({ success: true });
});

app.post('/api/users/follow-requests/:id/reject', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const requestId = req.params.id;
  const rawDb = DB.get();

  rawDb.follows = rawDb.follows.filter(f => !(f.id === requestId && f.followingId === currentUserId));
  DB.save();
  res.json({ success: true });
});

app.get('/api/users/:id/followers', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();
  const followers = rawDb.follows
    .filter(f => f.followingId === req.params.id && f.status === 'accepted')
    .map(f => {
      const u = DB.findUserById(f.followerId);
      return u ? DB.toPublicUser(u, currentUserId) : null;
    })
    .filter(Boolean);
  res.json({ followers });
});

app.get('/api/users/:id/following', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();
  const following = rawDb.follows
    .filter(f => f.followerId === req.params.id && f.status === 'accepted')
    .map(f => {
      const u = DB.findUserById(f.followingId);
      return u ? DB.toPublicUser(u, currentUserId) : null;
    })
    .filter(Boolean);
  res.json({ following });
});

app.post('/api/users/:id/block', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const targetId = req.params.id;
  const rawDb = DB.get();

  if (!rawDb.blocks.some(b => b.blockerId === currentUserId && b.blockedId === targetId)) {
    rawDb.blocks.push({
      id: `blk_${Date.now()}`,
      blockerId: currentUserId,
      blockedId: targetId,
      createdAt: new Date().toISOString()
    });
    // Remove follows both ways
    rawDb.follows = rawDb.follows.filter(f =>
      !(f.followerId === currentUserId && f.followingId === targetId) &&
      !(f.followerId === targetId && f.followingId === currentUserId)
    );
    DB.save();
  }
  res.json({ success: true });
});

app.post('/api/users/:id/unblock', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const targetId = req.params.id;
  const rawDb = DB.get();
  rawDb.blocks = rawDb.blocks.filter(b => !(b.blockerId === currentUserId && b.blockedId === targetId));
  DB.save();
  res.json({ success: true });
});

app.get('/api/users/me/blocked', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();
  const blockedUsers = rawDb.blocks
    .filter(b => b.blockerId === currentUserId)
    .map(b => {
      const u = DB.findUserById(b.blockedId);
      return u ? DB.toPublicUser(u, currentUserId) : null;
    })
    .filter(Boolean);
  res.json({ blockedUsers });
});

app.post('/api/reports', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const { targetId, targetType, reason } = req.body;
  const rawDb = DB.get();
  rawDb.reports.push({
    id: `rep_${Date.now()}`,
    reporterId: currentUserId,
    targetId,
    targetType,
    reason: reason || 'Conteúdo impróprio',
    createdAt: new Date().toISOString()
  });
  DB.save();
  res.json({ success: true, message: 'Denúncia recebida. Nossa equipe kawaii analisará! ' });
});

// ----------------------------------------------------
//  POSTS & MEDIA ENDPOINTS
// ----------------------------------------------------
app.get('/api/posts', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();

  // Filter blocked users
  let blockedIds: string[] = [];
  if (currentUserId) {
    blockedIds = rawDb.blocks
      .filter(b => b.blockerId === currentUserId || b.blockedId === currentUserId)
      .map(b => (b.blockerId === currentUserId ? b.blockedId : b.blockerId));
  }

  const feedType = (req.query.feed as string) || 'for_you';
  let followingUserIds: string[] = [];
  if (currentUserId && feedType === 'following') {
    followingUserIds = rawDb.follows
      .filter(f => f.followerId === currentUserId && f.status === 'accepted')
      .map(f => f.followingId);
    followingUserIds.push(currentUserId);
  }

  const posts = rawDb.posts
    .filter(p => {
      if (blockedIds.includes(p.userId)) return false;
      if (feedType === 'following' && currentUserId && !followingUserIds.includes(p.userId)) return false;
      return DB.canViewUserContent(p.userId, currentUserId);
    })
    .map(p => {
      const publicPost = DB.toPublicPost(p, currentUserId);
      const createdAtMs = new Date(p.createdAt).getTime();
      const ageMs = Math.max(0, Date.now() - createdAtMs);
      const isWithin1Hour = ageMs <= 3600000;

      let score = 0;
      if (p.isPinned) score += 50000;
      // Brand new posts within 15 minutes get highest priority so user sees them immediately at top!
      if (ageMs <= 900000) {
        score += 25000 - (ageMs / 900000) * 5000;
      } else if (isWithin1Hour) {
        score += 15000 - (ageMs / 3600000) * 3000;
      } else {
        const hoursOld = ageMs / 3600000;
        score += Math.max(0, 5000 - hoursOld * 50);
      }
      // Engagement prioritization
      score += (publicPost.likesCount * 8) + (publicPost.commentsCount * 12);

      return { post: publicPost, score, createdAtMs };
    })
    .sort((a, b) => b.score - a.score || b.createdAtMs - a.createdAtMs)
    .map(item => item.post);

  res.json({ posts });
});

app.post('/api/admin/emergency-cleanup', requireAdmin, (req, res) => {
  const rawDb = DB.get();
  const now = Date.now();
  const initialPosts = rawDb.posts.length;
  const initialStories = rawDb.stories.length;

  rawDb.posts = rawDb.posts.filter(p => {
    if (!p.expiresAt) return true;
    return new Date(p.expiresAt).getTime() > now;
  });

  rawDb.stories = rawDb.stories.filter(s => {
    if (!s.expiresAt) return true;
    return new Date(s.expiresAt).getTime() > now;
  });

  const removedPosts = initialPosts - rawDb.posts.length;
  const removedStories = initialStories - rawDb.stories.length;

  DB.save();
  res.json({
    success: true,
    message: `Limpeza de emergência executada com sucesso! Removidos ${removedPosts} posts e ${removedStories} stories expirados. `,
    removedPosts,
    removedStories
  });
});

app.post('/api/posts', requireAdmin, (req, res) => {
  const currentUserId = (req as any).userId;
  const { media, caption, location, allowComments, isTemporary, durationHours } = req.body;

  if (!media || !Array.isArray(media) || media.length === 0) {
    return res.status(400).json({ error: 'Adicione pelo menos uma foto ou vídeo kawaii! ' });
  }

  try {for(const m of media)if(['image','video','gif'].includes(m.type||'image'))uploadedMediaOrigin(m.url,m.source_handle);}catch(error){return res.status(400).json({error:error instanceof Error?error.message:'Informe a origem.'});}
  try { for (const m of media) if (m.focus !== undefined) { if (!['image','gif'].includes(m.type || 'image')) throw new Error('Destaque disponível apenas para fotos.'); validatePhotoFocus(m.focus); } }
  catch (error: any) { return res.status(400).json({ error: error.message }); }
  try { for (const m of media) if (m.coverTime !== undefined) { if (m.type !== 'video') throw new Error('Capa disponível apenas para vídeos.'); validateVideoCover(m); } }
  catch (error: any) { return res.status(400).json({error:error.message}); }
  let expiresAt: string | undefined = undefined;
  if (isTemporary) {
    const hours = Number(durationHours) || 24;
    expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
  }

  // Parse hashtags (#hashtag) and mentions (@username)
  const textCaption = caption || '';
  const hashtagMatches = textCaption.match(/#[a-zA-Z0-9_À-ÿ]+/g) || [];
  const hashtags = hashtagMatches.map((h: string) => h.replace('#', '').toLowerCase());

  const mentionMatches = textCaption.match(/@[a-zA-Z0-9_.]+/g) || [];
  const mentions: string[] = [];

  const newPost: DBPost = {
    id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: currentUserId,
    media: media.map((m: any, idx: number) => ({
      id: `m_${Date.now()}_${idx}`,
      url: m.url,
      ...(['image','video','gif'].includes(m.type||'image')?uploadedMediaOrigin(m.url,m.source_handle):{}),
      type: m.type || 'image',
      filter: m.filter,
      aspectRatio: m.aspectRatio,
      ...(m.focus !== undefined ? { focus: validatePhotoFocus(m.focus) } : {}),
      thumbnail: m.thumbnail || m.url,
      ...(m.coverTime !== undefined ? {coverTime:validateVideoCover(m).coverTime} : {}),
      fileName: m.fileName || (m.type === 'audio' ? 'Mensagem de Áudio.mp3' : m.type === 'pdf' ? 'Documento.pdf' : undefined),
    })),
    caption: textCaption,
    hashtags,
    mentions,
    location,
    allowComments: allowComments !== false,
    isTemporary: false,
    expiresAt: undefined,
    createdAt: new Date().toISOString(),
  };

  const rawDb = DB.get();
  rawDb.posts.unshift(newPost);

  // Mention notifications
  const currentUser = DB.findUserById(currentUserId)!;
  mentions.forEach((username: string) => {
    const mentionedUser = DB.findUserByUsername(username);
    if (mentionedUser && mentionedUser.id !== currentUserId) {
      const notif: DBNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        recipientId: mentionedUser.id,
        actorId: currentUserId,
        type: 'mention',
        targetId: newPost.id,
        targetType: 'post',
        targetThumbnail: newPost.media[0]?.url,
        textSnippet: 'marcou você em uma publicação ',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      rawDb.notifications.push(notif);
      broadcastEvent(mentionedUser.id, 'notification', { ...notif, actor: DB.toPublicUser(currentUser) });
    }
  });

  DB.save();
  res.json({ post: DB.toPublicPost(newPost, currentUserId) });
});

app.get('/api/posts/:id', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();
  const post = rawDb.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });

  if (!DB.canViewUserContent(post.userId, currentUserId)) {
    return res.status(403).json({ error: 'Esta publicação é de uma conta privada.' });
  }

  res.json({ post: DB.toPublicPost(post, currentUserId) });
});

app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();
  const post = rawDb.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });

  rawDb.posts = rawDb.posts.filter(p => p.id !== req.params.id);
  rawDb.likes = rawDb.likes.filter(l => l.postId !== req.params.id);
  rawDb.comments = rawDb.comments.filter(c => c.postId !== req.params.id);
  rawDb.saves = rawDb.saves.filter(s => s.postId !== req.params.id);
  DB.save();

  res.json({ success: true, message: 'Publicação excluída com sucesso! ' });
});

// ----------------------------------------------------
//  EPHEMERAL 1-HOUR CLEANUP ENDPOINTS
// ----------------------------------------------------
let ephemeral1HourMode = false; // Enabled by default as requested

app.get('/api/ephemeral/settings', (_req, res) => {
  res.json({
    ephemeral1HourMode,
    expiresAfterMinutes: 60,
    message: ephemeral1HourMode
      ? 'Modo Efêmero Ativo: Todo conteúdo expira permanentemente após 1 hora '
      : 'Modo Efêmero Desativado',
  });
});

app.post('/api/ephemeral/settings', requireAuth, (req, res) => {
  const { enabled } = req.body;
  ephemeral1HourMode = Boolean(enabled);
  if (ephemeral1HourMode) {
    DB.cleanEphemeral1HourContent(3600000);
  }
  res.json({ success: true, ephemeral1HourMode });
});

app.post('/api/ephemeral/cleanup', (_req, res) => {
  const results = DB.cleanEphemeral1HourContent(3600000);
  res.json({
    success: true,
    deletedCount: {
      posts: results.deletedPosts,
      messages: results.deletedMessages,
      stories: results.deletedStories,
      groups: results.deletedGroups,
    },
    message: `Limpeza efêmera concluída: ${results.deletedPosts} posts, ${results.deletedMessages} mensagens, ${results.deletedStories} stories e ${results.deletedGroups} grupos expirados removidos! `,
  });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const postId = req.params.id;
  const rawDb = DB.get();

  const post = rawDb.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });

  const existingIdx = rawDb.likes.findIndex(l => l.postId === postId && l.userId === currentUserId);
  let isLiked = false;

  if (existingIdx !== -1) {
    rawDb.likes.splice(existingIdx, 1);
  } else {
    rawDb.likes.push({
      id: `l_${Date.now()}`,
      postId,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    });
    isLiked = true;

    // Create notification if liked other user's post
    if (post.userId !== currentUserId) {
      const currentUser = DB.findUserById(currentUserId)!;
      const notif: DBNotification = {
        id: `notif_${Date.now()}`,
        recipientId: post.userId,
        actorId: currentUserId,
        type: 'like',
        targetId: post.id,
        targetType: 'post',
        targetThumbnail: post.media[0]?.url,
        textSnippet: 'curtiu sua publicação ',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      rawDb.notifications.push(notif);
      broadcastEvent(post.userId, 'notification', { ...notif, actor: DB.toPublicUser(currentUser) });
    }
  }

  DB.save();
  const likesCount = rawDb.likes.filter(l => l.postId === postId).length;
  res.json({ isLiked, likesCount });
});

app.post('/api/posts/:id/save', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const postId = req.params.id;
  const rawDb = DB.get();

  const existingIdx = rawDb.saves.findIndex(s => s.postId === postId && s.userId === currentUserId);
  let isSaved = false;

  if (existingIdx !== -1) {
    rawDb.saves.splice(existingIdx, 1);
  } else {
    rawDb.saves.push({
      id: `s_${Date.now()}`,
      postId,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    });
    isSaved = true;
  }

  DB.save();
  res.json({ isSaved });
});

app.get('/api/posts/:id/comments', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const postId = req.params.id;
  const rawDb = DB.get();

  const allComments = rawDb.comments.filter(c => c.postId === postId);

  const topLevel = allComments
    .filter(c => !c.parentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(c => {
      const author = DB.findUserById(c.userId);
      const likesCount = rawDb.commentLikes.filter(cl => cl.commentId === c.id).length;
      const isLiked = currentUserId ? rawDb.commentLikes.some(cl => cl.commentId === c.id && cl.userId === currentUserId) : false;

      const replies = allComments
        .filter(r => r.parentId === c.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(r => {
          const rAuthor = DB.findUserById(r.userId);
          const rLikes = rawDb.commentLikes.filter(cl => cl.commentId === r.id).length;
          const rIsLiked = currentUserId ? rawDb.commentLikes.some(cl => cl.commentId === r.id && cl.userId === currentUserId) : false;
          return {
            ...r,
            user: rAuthor ? DB.toPublicUser(rAuthor, currentUserId) : null,
            likesCount: rLikes,
            isLiked: rIsLiked
          };
        });

      return {
        ...c,
        user: author ? DB.toPublicUser(author, currentUserId) : null,
        likesCount,
        isLiked,
        replies
      };
    });

  res.json({ comments: topLevel });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const postId = req.params.id;
  const { text, parentId } = req.body;
  if (typeof text !== 'string' || text.length > 2000) return res.status(400).json({ error: 'Comentários devem ter até 2000 caracteres.' });
  if (parentId && !DB.get().comments.some(c => c.id === parentId && c.postId === postId)) return res.status(400).json({ error: 'Resposta inválida.' });

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Escreva algo fofo para comentar! ' });
  }

  const rawDb = DB.get();
  const post = rawDb.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });
  if (post.allowComments === false) {
    return res.status(400).json({ error: 'Os comentários estão desativados nesta publicação.' });
  }

  const newComment: DBComment = {
    id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    postId,
    userId: currentUserId,
    text: text.trim(),
    parentId: parentId || null,
    createdAt: new Date().toISOString()
  };

  rawDb.comments.push(newComment);

  // Notification to post owner or parent comment owner
  const currentUser = DB.findUserById(currentUserId)!;
  const targetRecipientId = parentId
    ? rawDb.comments.find(c => c.id === parentId)?.userId
    : post.userId;

  if (targetRecipientId && targetRecipientId !== currentUserId) {
    const notif: DBNotification = {
      id: `notif_${Date.now()}`,
      recipientId: targetRecipientId,
      actorId: currentUserId,
      type: 'comment',
      targetId: post.id,
      targetType: 'post',
      targetThumbnail: post.media[0]?.url,
      textSnippet: `comentou: "${newComment.text.slice(0, 50)}${newComment.text.length > 50 ? '...' : ''}"`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    rawDb.notifications.push(notif);
    broadcastEvent(targetRecipientId, 'notification', { ...notif, actor: DB.toPublicUser(currentUser) });
  }

  DB.save();
  const totalComments = rawDb.comments.filter(c => c.postId === postId).length;
  res.json({
    comment: {
      ...newComment,
      user: DB.toPublicUser(currentUser, currentUserId),
      likesCount: 0,
      isLiked: false,
      replies: []
    },
    commentsCount: totalComments
  });
});

app.post('/api/comments/:id/like', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const commentId = req.params.id;
  const rawDb = DB.get();

  const idx = rawDb.commentLikes.findIndex(cl => cl.commentId === commentId && cl.userId === currentUserId);
  let isLiked = false;
  if (idx !== -1) {
    rawDb.commentLikes.splice(idx, 1);
  } else {
    rawDb.commentLikes.push({
      id: `cl_${Date.now()}`,
      commentId,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    });
    isLiked = true;
  }
  DB.save();
  const likesCount = rawDb.commentLikes.filter(cl => cl.commentId === commentId).length;
  res.json({ isLiked, likesCount });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const commentId = req.params.id;
  const rawDb = DB.get();

  const comment = rawDb.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comentário não encontrado' });

  const post = rawDb.posts.find(p => p.id === comment.postId);
  if (comment.userId !== currentUserId && post?.userId !== currentUserId && !DB.findUserById(currentUserId)?.isAdmin) {
    return res.status(403).json({ error: 'Você não tem permissão para excluir este comentário.' });
  }

  rawDb.comments = rawDb.comments.filter(c => c.id !== commentId && c.parentId !== commentId);
  rawDb.commentLikes = rawDb.commentLikes.filter(cl => cl.commentId !== commentId);
  DB.save();

  const totalComments = rawDb.comments.filter(c => c.postId === comment.postId).length;
  res.json({ success: true, commentsCount: totalComments, postId: comment.postId });
});

app.get('/api/posts/explore/feed', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();

  const posts = rawDb.posts
    .filter(p => DB.canViewUserContent(p.userId, currentUserId))
    .sort((a, b) => {
      const likesA = rawDb.likes.filter(l => l.postId === a.id).length;
      const likesB = rawDb.likes.filter(l => l.postId === b.id).length;
      return likesB - likesA;
    })
    .map(p => DB.toPublicPost(p, currentUserId));

  res.json({ posts });
});

app.get('/api/posts/reels/feed', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();

  const videoPosts = rawDb.posts
    .filter(p => p.media.some(m => m.type === 'video'))
    .filter(p => DB.canViewUserContent(p.userId, currentUserId))
    .map(p => DB.toPublicPost(p, currentUserId));

  res.json({ reels: videoPosts });
});

app.get('/api/posts/saved/all', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  const savedPostIds = rawDb.saves
    .filter(s => s.userId === currentUserId)
    .map(s => s.postId);

  const posts = rawDb.posts
    .filter(p => savedPostIds.includes(p.id))
    .map(p => DB.toPublicPost(p, currentUserId));

  res.json({ posts });
});

app.get('/api/posts/hashtag/:tag', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const tag = req.params.tag.toLowerCase();
  const rawDb = DB.get();

  const posts = rawDb.posts
    .filter(p => p.hashtags.includes(tag) && DB.canViewUserContent(p.userId, currentUserId))
    .map(p => DB.toPublicPost(p, currentUserId));

  res.json({ tag, count: posts.length, posts });
});

app.get('/api/posts/user/:username', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const user = DB.findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (!DB.canViewUserContent(user.id, currentUserId)) {
    return res.json({ posts: [], isPrivateLocked: true });
  }

  const rawDb = DB.get();
  const posts = rawDb.posts
    .filter(p => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(p => DB.toPublicPost(p, currentUserId));

  res.json({ posts, isPrivateLocked: false });
});

// ----------------------------------------------------
//  STORIES ENDPOINTS (24H EXPIRY)
// ----------------------------------------------------
app.get('/api/stories', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const rawDb = DB.get();
  const now = new Date().getTime();

  // Only stories younger than 24h
  const activeStories = rawDb.stories.filter(s => new Date(s.expiresAt).getTime() > now);

  // Group by user
  const groupedMap: { [userId: string]: DBStory[] } = {};
  activeStories.forEach(s => {
    if (DB.canViewUserContent(s.userId, currentUserId)) {
      if (!groupedMap[s.userId]) groupedMap[s.userId] = [];
      groupedMap[s.userId].push(s);
    }
  });

  const storyGroups = Object.keys(groupedMap).map(userId => {
    const user = DB.findUserById(userId);
    const userStories = groupedMap[userId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const hasUnseen = currentUserId
      ? userStories.some(s => !rawDb.storyViews.some(sv => sv.storyId === s.id && sv.userId === currentUserId))
      : true;

    const enrichedStories = userStories.map(s => {
      const viewsCount = rawDb.storyViews.filter(sv => sv.storyId === s.id).length;
      const isViewed = currentUserId ? rawDb.storyViews.some(sv => sv.storyId === s.id && sv.userId === currentUserId) : false;
      const reactionsCount = rawDb.storyViews.filter(sv => sv.storyId === s.id && sv.reaction).length;
      return {
        ...s,
        user: user ? DB.toPublicUser(user, currentUserId) : null,
        viewsCount,
        isViewed,
        reactionsCount
      };
    });

    return {
      user: user ? DB.toPublicUser(user, currentUserId) : null,
      stories: enrichedStories,
      hasUnseen,
      latestCreatedAt: userStories[userStories.length - 1]?.createdAt || ''
    };
  }).filter(g => g.user !== null);

  res.json({ storyGroups });
});

app.post('/api/stories', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const { mediaUrl, mediaType, textOverlay, stickers, location, mentions, filter } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({ error: 'Mídia obrigatória para o Story ' });
  }

  const newStory: DBStory = {
    id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: currentUserId,
    mediaUrl,
    mediaType: mediaType || 'image',
    textOverlay,
    stickers: stickers || [],
    location,
    mentions: mentions || [],
    filter,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
  };

  const rawDb = DB.get();
  rawDb.stories.push(newStory);
  DB.save();

  res.json({ story: newStory });
});

app.post('/api/stories/:id/view', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const storyId = req.params.id;
  const rawDb = DB.get();

  const story = rawDb.stories.find(s => s.id === storyId);
  if (!story) return res.status(404).json({ error: 'Story não encontrado' });

  if (!rawDb.storyViews.some(sv => sv.storyId === storyId && sv.userId === currentUserId)) {
    rawDb.storyViews.push({
      id: `sv_${Date.now()}`,
      storyId,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    });
    DB.save();
  }

  res.json({ success: true });
});

app.post('/api/stories/:id/react', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const storyId = req.params.id;
  const { reaction } = req.body;
  const rawDb = DB.get();

  const story = rawDb.stories.find(s => s.id === storyId);
  if (!story) return res.status(404).json({ error: 'Story não encontrado' });

  let view = rawDb.storyViews.find(sv => sv.storyId === storyId && sv.userId === currentUserId);
  if (view) {
    view.reaction = reaction || '';
  } else {
    rawDb.storyViews.push({
      id: `sv_${Date.now()}`,
      storyId,
      userId: currentUserId,
      reaction: reaction || '',
      createdAt: new Date().toISOString()
    });
  }

  if (story.userId !== currentUserId) {
    const currentUser = DB.findUserById(currentUserId)!;
    const notif: DBNotification = {
      id: `notif_${Date.now()}`,
      recipientId: story.userId,
      actorId: currentUserId,
      type: 'story_reaction',
      targetId: story.id,
      targetType: 'story',
      targetThumbnail: story.mediaUrl,
      textSnippet: `reagiu ao seu Story com ${reaction || ''}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    rawDb.notifications.push(notif);
    broadcastEvent(story.userId, 'notification', { ...notif, actor: DB.toPublicUser(currentUser) });
  }

  DB.save();
  res.json({ success: true, reaction });
});

app.delete('/api/stories/:id', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const storyId = req.params.id;
  const rawDb = DB.get();

  const story = rawDb.stories.find(s => s.id === storyId);
  if (!story) return res.status(404).json({ error: 'Story não encontrado' });
  if (story.userId !== currentUserId) return res.status(403).json({ error: 'Não autorizado' });

  rawDb.stories = rawDb.stories.filter(s => s.id !== storyId);
  rawDb.storyViews = rawDb.storyViews.filter(sv => sv.storyId !== storyId);
  DB.save();

  res.json({ success: true });
});

// ----------------------------------------------------
//  DIRECT MESSAGES & GROUP CHATS
// ----------------------------------------------------
app.get('/api/conversations', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  const userConvs = rawDb.conversations
    .filter(c => c.participantIds.includes(currentUserId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(c => {
      const participants = c.participantIds
        .map(id => DB.findUserById(id))
        .filter(Boolean)
        .map(u => DB.toPublicUser(u!, currentUserId));

      const messages = rawDb.messages.filter(m => m.conversationId === c.id);
      const lastMessage = messages[messages.length - 1] || undefined;
      const unreadCount = messages.filter(m => m.senderId !== currentUserId && m.status !== 'read').length;

      return {
        id: c.id,
        participantIds: c.participantIds,
        participants,
        isGroup: Boolean(c.isGroup),
        name: c.name,
        description: c.description,
        avatar: c.avatar,
        isPublic: c.isPublic ?? true,
        creatorId: c.creatorId,
        adminIds: c.adminIds || (c.creatorId ? [c.creatorId] : []),
        rules: c.rules,
        inviteCode: c.inviteCode,
        durationMode: c.durationMode || 'permanent',
        messageDurationHours: c.messageDurationHours || 24,
        messagesClearedAt: c.messagesClearedAt,
        lastMessage,
        unreadCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });

  res.json({ conversations: userConvs });
});

app.post('/api/conversations', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const { recipientId } = req.body;

  if (!recipientId || recipientId === currentUserId) {
    return res.status(400).json({ error: 'Destinatário inválido.' });
  }

  const rawDb = DB.get();
  let conv = rawDb.conversations.find(c =>
    !c.isGroup &&
    c.participantIds.length === 2 &&
    c.participantIds.includes(currentUserId) &&
    c.participantIds.includes(recipientId)
  );

  if (!conv) {
    conv = {
      id: `conv_${Date.now()}`,
      participantIds: [currentUserId, recipientId],
      isGroup: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    rawDb.conversations.unshift(conv);
    DB.save();
  }

  const participants = conv.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ conversation: { ...conv, participants, unreadCount: 0 } });
});

// Group Endpoints
app.get('/api/groups/public', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  const publicGroups = rawDb.conversations
    .filter(c => c.isGroup && c.isPublic)
    .sort((a, b) => (b.participantIds?.length || 0) - (a.participantIds?.length || 0))
    .map(c => {
      const participants = c.participantIds
        .map(id => DB.findUserById(id))
        .filter(Boolean)
        .map(u => DB.toPublicUser(u!, currentUserId));

      const messages = rawDb.messages.filter(m => m.conversationId === c.id);
      const lastMessage = messages[messages.length - 1] || undefined;
      const unreadCount = messages.filter(m => m.senderId !== currentUserId && m.status !== 'read').length;

      return {
        id: c.id,
        participantIds: c.participantIds,
        participants,
        isGroup: true,
        name: c.name || 'Grupo Sem Nome',
        description: c.description || '',
        avatar: c.avatar || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=80',
        isPublic: true,
        creatorId: c.creatorId,
        adminIds: c.adminIds || (c.creatorId ? [c.creatorId] : []),
        rules: c.rules,
        inviteCode: c.inviteCode,
        durationMode: c.durationMode || 'permanent',
        messageDurationHours: c.messageDurationHours || 24,
        messagesClearedAt: c.messagesClearedAt,
        lastMessage,
        unreadCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });

  res.json({ groups: publicGroups });
});

app.post('/api/groups', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const {
    name,
    description,
    avatar,
    isPublic = true,
    memberIds = [],
    rules,
    durationMode = 'permanent',
    messageDurationHours = 24
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do grupo é obrigatório.' });
  }

  const rawDb = DB.get();
  const allMemberIds = Array.from(new Set([currentUserId, ...(Array.isArray(memberIds) ? memberIds : [])]));
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newGroup: DBConversation = {
    id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    description: (description || '').trim(),
    avatar: avatar || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=80',
    isGroup: true,
    isPublic: Boolean(isPublic),
    creatorId: currentUserId,
    adminIds: [currentUserId],
    participantIds: allMemberIds,
    rules: rules ? rules.trim() : undefined,
    inviteCode,
    durationMode: durationMode === 'temporary' ? 'temporary' : 'permanent',
    messageDurationHours: Number(messageDurationHours) || 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  rawDb.conversations.unshift(newGroup);

  // System welcome message
  const durationText = newGroup.durationMode === 'temporary'
    ? ` As mensagens expiram a cada ${newGroup.messageDurationHours}h (o grupo é mantido).`
    : ` Grupo permanente.`;

  const welcomeMsg: DBMessage = {
    id: `msg_${Date.now()}_system`,
    conversationId: newGroup.id,
    senderId: currentUserId,
    text: ` Grupo "${newGroup.name}" foi criado com sucesso!${durationText}`,
    status: 'read',
    createdAt: new Date().toISOString()
  };
  rawDb.messages.push(welcomeMsg);

  DB.save();

  const participants = newGroup.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({
    group: {
      ...newGroup,
      participants,
      lastMessage: welcomeMsg,
      unreadCount: 0
    }
  });
});

app.get('/api/groups/:id', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  // If private and not member
  if (!group.isPublic && !group.participantIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Este grupo é privado.' });
  }

  const participants = group.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ group: { ...group, participants } });
});

app.post('/api/groups/:id/join', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const { inviteCode } = req.body;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  if (!group.isPublic && group.inviteCode && group.inviteCode !== inviteCode) {
    return res.status(403).json({ error: 'Código de convite inválido para este grupo privado.' });
  }

  if (!group.participantIds.includes(currentUserId)) {
    group.participantIds.push(currentUserId);
    group.updatedAt = new Date().toISOString();

    const joiningUser = DB.findUserById(currentUserId);
    const joinMsg: DBMessage = {
      id: `msg_${Date.now()}_join`,
      conversationId: group.id,
      senderId: currentUserId,
      text: ` ${joiningUser?.displayName || 'Uma mocinha'} entrou no grupo.`,
      status: 'read',
      createdAt: new Date().toISOString()
    };
    rawDb.messages.push(joinMsg);
    DB.save();
  }

  const participants = group.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ group: { ...group, participants } });
});

app.post('/api/groups/:id/leave', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  group.participantIds = group.participantIds.filter(id => id !== currentUserId);
  group.adminIds = (group.adminIds || []).filter(id => id !== currentUserId);

  // If creator leaves, assign next admin or member
  if (group.creatorId === currentUserId && group.participantIds.length > 0) {
    group.creatorId = group.adminIds?.[0] || group.participantIds[0];
    if (!group.adminIds?.includes(group.creatorId)) {
      group.adminIds = [group.creatorId, ...(group.adminIds || [])];
    }
  }

  const leavingUser = DB.findUserById(currentUserId);
  const leaveMsg: DBMessage = {
    id: `msg_${Date.now()}_leave`,
    conversationId: group.id,
    senderId: currentUserId,
    text: ` ${leavingUser?.displayName || 'Uma mocinha'} saiu do grupo.`,
    status: 'read',
    createdAt: new Date().toISOString()
  };
  rawDb.messages.push(leaveMsg);
  group.updatedAt = new Date().toISOString();

  DB.save();
  res.json({ success: true });
});

app.post('/api/groups/:id/members', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const { userIds } = req.body;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  if (!group.participantIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Você precisa ser membro do grupo para adicionar pessoas.' });
  }

  if (Array.isArray(userIds)) {
    userIds.forEach(uid => {
      if (!group.participantIds.includes(uid)) {
        group.participantIds.push(uid);
      }
    });
    group.updatedAt = new Date().toISOString();
    DB.save();
  }

  const participants = group.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ group: { ...group, participants } });
});

app.delete('/api/groups/:id/members/:userId', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const targetUserId = req.params.userId;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  const isAdmin = group.adminIds?.includes(currentUserId) || group.creatorId === currentUserId;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Apenas administradores podem remover membros.' });
  }

  group.participantIds = group.participantIds.filter(id => id !== targetUserId);
  group.adminIds = (group.adminIds || []).filter(id => id !== targetUserId);
  group.updatedAt = new Date().toISOString();

  DB.save();

  const participants = group.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ group: { ...group, participants } });
});

app.post('/api/groups/:id/admins/:userId', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const targetUserId = req.params.userId;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  const isCreatorOrAdmin = group.creatorId === currentUserId || group.adminIds?.includes(currentUserId);
  if (!isCreatorOrAdmin) {
    return res.status(403).json({ error: 'Apenas criador ou administradores podem alterar permissões.' });
  }

  if (!group.adminIds) group.adminIds = [group.creatorId || currentUserId];

  if (group.adminIds.includes(targetUserId)) {
    group.adminIds = group.adminIds.filter(id => id !== targetUserId);
  } else {
    group.adminIds.push(targetUserId);
  }

  group.updatedAt = new Date().toISOString();
  DB.save();

  const participants = group.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ group: { ...group, participants } });
});

app.put('/api/groups/:id', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const { name, description, avatar, isPublic, rules, durationMode, messageDurationHours } = req.body;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  const isAdmin = group.adminIds?.includes(currentUserId) || group.creatorId === currentUserId;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Apenas administradores podem editar o grupo.' });
  }

  if (name !== undefined && name.trim()) group.name = name.trim();
  if (description !== undefined) group.description = description.trim();
  if (avatar !== undefined) group.avatar = avatar;
  if (isPublic !== undefined) group.isPublic = Boolean(isPublic);
  if (rules !== undefined) group.rules = rules.trim();
  if (durationMode !== undefined) {
    group.durationMode = durationMode === 'temporary' ? 'temporary' : 'permanent';
  }
  if (messageDurationHours !== undefined) {
    group.messageDurationHours = Number(messageDurationHours) || 24;
  }

  group.updatedAt = new Date().toISOString();
  DB.save();

  const participants = group.participantIds
    .map(id => DB.findUserById(id))
    .filter(Boolean)
    .map(u => DB.toPublicUser(u!, currentUserId));

  res.json({ group: { ...group, participants } });
});

// Clear group messages without deleting the group
app.post('/api/groups/:id/clear-messages', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  const isAdmin = group.adminIds?.includes(currentUserId) || group.creatorId === currentUserId;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Apenas administradores podem limpar as mensagens do grupo.' });
  }

  // Delete all messages belonging to this group
  rawDb.messages = rawDb.messages.filter(m => m.conversationId !== groupId);
  group.messagesClearedAt = new Date().toISOString();
  group.updatedAt = new Date().toISOString();

  // System notice
  const noticeMsg: DBMessage = {
    id: `msg_${Date.now()}_cleared`,
    conversationId: group.id,
    senderId: currentUserId,
    text: ` As mensagens anteriores do grupo foram limpas. O grupo continua ativo!`,
    status: 'read',
    createdAt: new Date().toISOString()
  };
  rawDb.messages.push(noticeMsg);
  DB.save();

  res.json({ success: true, message: 'Mensagens do grupo foram limpas com sucesso!' });
});

app.delete('/api/groups/:id', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const groupId = req.params.id;
  const rawDb = DB.get();

  const group = rawDb.conversations.find(c => c.id === groupId && c.isGroup);
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado.' });

  if (group.creatorId !== currentUserId) {
    return res.status(403).json({ error: 'Apenas a criadora do grupo pode excluí-lo.' });
  }

  rawDb.conversations = rawDb.conversations.filter(c => c.id !== groupId);
  rawDb.messages = rawDb.messages.filter(m => m.conversationId !== groupId);
  DB.save();

  res.json({ success: true });
});

app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const convId = req.params.id;
  const rawDb = DB.get();

  const conv = rawDb.conversations.find(c => c.id === convId && c.participantIds.includes(currentUserId));
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  // If group is temporary, prune messages that exceeded duration limit
  if (conv.isGroup && conv.durationMode === 'temporary') {
    const groupDurationMs = (conv.messageDurationHours || 24) * 3600000;
    const now = Date.now();
    const beforeCount = rawDb.messages.length;
    rawDb.messages = rawDb.messages.filter(m => {
      if (m.conversationId === convId) {
        return (now - new Date(m.createdAt).getTime()) < groupDurationMs;
      }
      return true;
    });
    if (rawDb.messages.length !== beforeCount) {
      DB.save();
    }
  }

  // Mark messages from others as read
  let markedCount = 0;
  rawDb.messages.forEach(m => {
    if (m.conversationId === convId && m.senderId !== currentUserId && m.status !== 'read') {
      m.status = 'read';
      markedCount++;
    }
  });
  if (markedCount > 0) DB.save();

  const messages = rawDb.messages
    .filter(m => m.conversationId === convId)
    .map(m => {
      const sender = DB.findUserById(m.senderId);
      const replyTo = m.replyToId ? rawDb.messages.find(rm => rm.id === m.replyToId) : undefined;
      return {
        ...m,
        sender: sender ? DB.toPublicUser(sender, currentUserId) : null,
        replyTo
      };
    });

  res.json({ messages });
});

app.post('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const convId = req.params.id;
  const { text, mediaUrl, mediaType, replyToId } = req.body;

  if (!text?.trim() && !mediaUrl) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  const rawDb = DB.get();
  const conv = rawDb.conversations.find(c => c.id === convId && c.participantIds.includes(currentUserId));
  if (!conv) return res.status(404).json({ error: 'Conversa ou grupo não encontrado' });

  const newMessage: DBMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: convId,
    senderId: currentUserId,
    text: (text || '').trim(),
    mediaUrl,
    mediaType,
    replyToId,
    status: 'delivered',
    createdAt: new Date().toISOString()
  };

  rawDb.messages.push(newMessage);
  conv.updatedAt = new Date().toISOString();

  // Notify other participants
  const senderUser = DB.findUserById(currentUserId)!;
  const otherUserIds = conv.participantIds.filter(id => id !== currentUserId);

  otherUserIds.forEach(targetId => {
    broadcastEvent(targetId, 'message', {
      ...newMessage,
      conversationId: convId,
      isGroup: Boolean(conv.isGroup),
      groupName: conv.name,
      sender: DB.toPublicUser(senderUser)
    });
  });

  DB.save();
  res.json({
    message: {
      ...newMessage,
      sender: DB.toPublicUser(senderUser, currentUserId)
    }
  });
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  const msg = rawDb.messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });
  if (msg.senderId !== currentUserId) return res.status(403).json({ error: 'Você só pode apagar suas mensagens.' });

  rawDb.messages = rawDb.messages.filter(m => m.id !== req.params.id);
  DB.save();
  res.json({ success: true });
});

// ----------------------------------------------------
//  NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------
app.get('/api/notifications', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  const userNotifs = rawDb.notifications
    .filter(n => n.recipientId === currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(n => {
      const actor = DB.findUserById(n.actorId);
      return {
        ...n,
        actor: actor ? DB.toPublicUser(actor, currentUserId) : null
      };
    })
    .filter(n => n.actor !== null);

  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  res.json({ notifications: userNotifs, unreadCount });
});

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  rawDb.notifications.forEach(n => {
    if (n.recipientId === currentUserId) n.isRead = true;
  });
  DB.save();
  res.json({ success: true });
});

app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  const currentUserId = (req as any).userId;
  const rawDb = DB.get();

  const notif = rawDb.notifications.find(n => n.id === req.params.id && n.recipientId === currentUserId);
  if (notif) {
    notif.isRead = true;
    DB.save();
  }
  res.json({ success: true });
});

// ----------------------------------------------------
//  SEARCH ENDPOINT
// ----------------------------------------------------
app.get('/api/search', (req, res) => {
  const currentUserId = getAuthUserId(req) || undefined;
  const q = (req.query.q as string || '').trim().toLowerCase();
  const rawDb = DB.get();

  if (!q) {
    return res.json({ users: [], posts: [], hashtags: [] });
  }

  const matchedUsers = rawDb.users
    .filter(u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || (u.bio && u.bio.toLowerCase().includes(q)))
    .map(u => DB.toPublicUser(u, currentUserId))
    .slice(0, 15);

  const matchedPosts = rawDb.posts
    .filter(p =>
      DB.canViewUserContent(p.userId, currentUserId) &&
      (p.caption.toLowerCase().includes(q) || p.hashtags.some(h => h.includes(q)) || (p.location && p.location.toLowerCase().includes(q)))
    )
    .map(p => DB.toPublicPost(p, currentUserId))
    .slice(0, 20);

  // Hashtag aggregation
  const allHashtags: { [tag: string]: number } = {};
  rawDb.posts.forEach(p => {
    p.hashtags.forEach(h => {
      if (h.includes(q)) {
        allHashtags[h] = (allHashtags[h] || 0) + 1;
      }
    });
  });

  const hashtagList = Object.keys(allHashtags).map(tag => ({ tag, count: allHashtags[tag] }));

  res.json({ users: matchedUsers, posts: matchedPosts, hashtags: hashtagList });
});

// ----------------------------------------------------
//  MEDIA UPLOAD (FILE + BASE64 SUPPORT)
// ----------------------------------------------------
app.post('/api/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (req.file) {
    const isVideo = req.file.mimetype.startsWith('video');
    let url: string;
    try { url = CLOUD ? await uploadCloud(`media_${Date.now()}_${randomBytes(8).toString('hex')}${path.extname(req.file.originalname).replace(/[^.a-zA-Z0-9]/g,'')}`, req.file.buffer, req.file.mimetype) : `/uploads/${req.file.filename}`; }
    catch (e) { return res.status(503).json({error:'Não foi possível salvar a mídia no armazenamento remoto.'}); }
    return res.json({ url, type: isVideo ? 'video' : 'image' });
  }

  // Base64 JSON fallback
  const { data, filename } = req.body;
  if (data && typeof data === 'string') {
    let mime = 'image/jpeg';
    let base64Data = data;
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mime = matches[1];
      base64Data = matches[2];
    }
    const isVideo = mime.startsWith('video');
    const ext = isVideo ? '.mp4' : mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg';
    const cleanFilename = (filename || `upload_${Date.now()}${ext}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fname = `yume_b64_${Date.now()}_${cleanFilename}`;
    const fpath = path.join(UPLOADS_DIR, fname);
    try {
      const bytes = Buffer.from(base64Data, 'base64');
      if (CLOUD) await uploadCloud(fname, bytes, mime);
      else fs.writeFileSync(fpath, bytes);
      return res.json({ url: `/uploads/${fname}`, type: isVideo ? 'video' : 'image' });
    } catch (saveErr: any) {
      console.error('Error saving base64 upload:', saveErr);
      return res.status(500).json({ error: 'Erro ao processar imagem base64' });
    }
  }

  res.status(400).json({ error: 'Nenhum arquivo enviado.' });
});

// ----------------------------------------------------
//  GEMINI AI KAWAII ASSISTANT (SERVER-SIDE)
// ----------------------------------------------------
app.post('/api/ai/kawaii-caption', async (req, res) => {
  const { theme, style } = req.body;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback cute templates if key is missing
      const defaults = [
        ` Dias cor-de-rosa e momentos mágicos! Deixando o mundo mais doce com esse momento especial  #kawaii #animevibes #pinkaesthetic #cute`,
        ` Um pedacinho do meu universo dos sonhos para iluminar seu dia! O que acharam desse look?  #pinkdream #otakugirl #lovelydays #cutie`,
        ` Conectando corações através da arte e da fofura! Tenham um dia brilhante e cheio de estrelinhas~  #chibidreams #magicalgirl #pinklife`,
      ];
      return res.json({ caption: defaults[Math.floor(Math.random() * defaults.length)] });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Escreva uma legenda super fofa, aesthetic, estilo anime/kawaii/Sanrio em Português para uma rede social rosa e branca.
Tema/Ideia da foto: "${theme || 'um dia lindo e cheio de fofura'}".
Estilo: "${style || 'doce, com emojis delicados (, , , , , ), hashtags fofas'}".
A legenda deve ter entre 2 e 4 frases encantadoras, emojis fofos e 4-6 hashtags anime/kawaii populares. Retorne apenas o texto da legenda.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const caption = response.text?.trim() || ' Momento mágico e cheio de amor cor-de-rosa!  #kawaii #pinkaesthetic';
    res.json({ caption });
  } catch (err) {
    console.error('Gemini error:', err);
    res.json({ caption: ' Momentos especiais cheios de brilho e doçura!  #kawaii #pinkvibes #animecute' });
  }
});

// ----------------------------------------------------
//  AUTOMATIC TRANSLATION SERVICE (FAST CACHED PROXY + GEMINI FALLBACK)
// ----------------------------------------------------
const translationCache = new Map<string, string>();

async function translateSingleText(text: string, targetLang: string, sourceLang = 'auto'): Promise<string> {
  const clean = text ? text.trim() : '';
  if (!clean) return '';
  if (targetLang === sourceLang) return clean;

  const cacheKey = `${sourceLang}:${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Try MyMemory API (Very reliable, free, fast)
  try {
    if (sourceLang === 'auto') throw new Error('Use language detection');
    const src = (sourceLang === 'auto' || !sourceLang) ? 'pt' : sourceLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(targetLang)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (resp.ok) {
      const data = (await resp.json()) as any;
      if (data?.responseData?.translatedText && data.responseStatus === 200) {
        const translated = data.responseData.translatedText.trim();
        if (translated && !translated.startsWith('MYMEMORY WARNING:')) {
          if (translationCache.size > 5000) {
            const firstKey = translationCache.keys().next().value;
            if (firstKey) translationCache.delete(firstKey);
          }
          translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    // Fall through
  }

  // 2. Try Google Translate gtx endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(clean)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (resp.ok) {
      const data = (await resp.json()) as any;
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((chunk: any) => (Array.isArray(chunk) ? chunk[0] : '')).join('');
        if (translated) {
          translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 3. Fallback to Gemini AI if available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Translate the following text into target language code "${targetLang}". Preserve all emojis, hashtags (#tag), and mentions (@user). Return ONLY the translated text without quotes:\n\n${clean}`;
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const geminiTranslated = res.text?.trim();
      if (geminiTranslated) {
        translationCache.set(cacheKey, geminiTranslated);
        return geminiTranslated;
      }
    } catch (gErr) {
      console.error('Gemini translate fallback error:', gErr);
    }
  }

  throw new Error('Translation provider unavailable');
}

app.post('/api/translate', async (req, res) => {
  const { text, targetLang, sourceLang } = req.body;
  if (!text || typeof text !== 'string' || text.length > 4000 || !['pt','en','es','fr','de','it','ja','ko','zh','ru','ar'].includes(targetLang)) {
    return res.status(400).json({ error: 'Invalid translation request' });
  }

  try {
    const translatedText = await translateSingleText(text, targetLang || 'en', sourceLang || 'auto');
    res.json({ translatedText, targetLang: targetLang || 'en' });
  } catch (err) {
    res.status(503).json({ error: 'Translation provider unavailable' });
  }
});

// ----------------------------------------------------
//  ADMIN ENDPOINTS & MANAGEMENT
// ----------------------------------------------------
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado. Faça login como administrador.' });
  }
  const user = DB.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado.' });
  }
  const isAdmin = user.isAdmin === true;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito à administração da plataforma.' });
  }
  (req as any).userId = userId;
  next();
}

app.get('/api/admin/storage', requireAdmin, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(storageDiagnostics());
});
app.get('/api/admin/storage/export', requireAdmin, async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { await flushCloud(); } catch { return res.status(503).json({error:'Não foi possível confirmar o banco remoto.'}); }
  res.attachment(`mocinhas-backup-${new Date().toISOString().slice(0,10)}.json`);
  res.json(DB.get());
});

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const rawDb = DB.get();
  res.json({
    totalUsers: rawDb.users.length,
    totalPosts: rawDb.posts.length,
    totalStories: rawDb.stories.length,
    totalMessages: rawDb.messages.length,
  });
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const rawDb = DB.get();
  const users = rawDb.users.map(u => DB.toPublicUser(u));
  res.json({ users });
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { isVerified, isAdmin } = req.body;
  const rawDb = DB.get();
  const user = rawDb.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  if (isVerified !== undefined) user.isVerified = !!isVerified;
  if (isAdmin !== undefined) user.isAdmin = !!isAdmin;
  DB.save();
  res.json({ success: true, user: DB.toPublicUser(user) });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const rawDb = DB.get();
  rawDb.users = rawDb.users.filter(u => u.id !== id);
  rawDb.posts = rawDb.posts.filter(p => p.userId !== id);
  rawDb.stories = rawDb.stories.filter(s => s.userId !== id);
  DB.save();
  res.json({ success: true });
});

app.patch('/api/admin/posts/:id/cover', requireAdmin, (req, res) => {
  const post=DB.get().posts.find(p=>p.id===req.params.id);
  if(!post)return res.status(404).json({error:'Publicação não encontrada.'});
  const media=post.media.find(m=>m.id===req.body?.mediaId);
  if(!media)return res.status(404).json({error:'Mídia não encontrada.'});
  if(media.type!=='video')return res.status(400).json({error:'Capa disponível apenas para vídeos.'});
  try{const cover=validateVideoCover(req.body);media.thumbnail=cover.thumbnail;media.coverTime=cover.coverTime;}
  catch(error:any){return res.status(400).json({error:error.message});}
  DB.save();res.json({post:DB.toPublicPost(post,(req as any).userId)});
});

app.patch('/api/admin/posts/:id/focus', requireAdmin, (req, res) => {
  const post = DB.get().posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada.' });
  const media = post.media.find(m => m.id === req.body.mediaId);
  if (!media) return res.status(404).json({ error: 'Mídia não encontrada.' });
  if (!['image','gif'].includes(media.type)) return res.status(400).json({ error: 'Destaque disponível apenas para fotos.' });
  try { media.focus = validatePhotoFocus(req.body.focus); }
  catch (error: any) { return res.status(400).json({ error: error.message }); }
  DB.save();
  res.json({ post: DB.toPublicPost(post, (req as any).userId) });
});

app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const rawDb = DB.get();
  rawDb.posts = rawDb.posts.filter(p => p.id !== id);
  DB.save();
  res.json({ success: true });
});

app.post('/api/admin/broadcast', requireAdmin, (req, res) => {
  const currentUserId = (req as any).userId;
  const { title, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Informe o texto do comunicado.' });
  }
  const rawDb = DB.get();
  rawDb.users.forEach(u => {
    if (u.id !== currentUserId) {
      const notif: DBNotification = {
        id: `notif_broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: u.id,
        actorId: currentUserId,
        type: 'mention',
        textSnippet: `${title || 'Aviso'}: ${text}`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      rawDb.notifications.unshift(notif);
      broadcastEvent(u.id, 'notification', notif);
    }
  });
  DB.save();
  res.json({ success: true, message: 'Broadcast enviado com sucesso!' });
});

app.post('/api/translate/batch', async (req, res) => {
  const { texts, targetLang, sourceLang } = req.body;
  if (!Array.isArray(texts) || texts.length > 20 || texts.some(t => typeof t !== 'string' || t.length > 4000) || !['pt','en','es','fr','de','it','ja','ko','zh','ru','ar'].includes(targetLang)) {
    return res.status(400).json({ error: 'texts must be an array' });
  }

  try {
    const results = await Promise.all(
      texts.map(t => translateSingleText(t, targetLang, sourceLang || 'auto').catch(() => null))
    );
    res.json({ translations: results, targetLang: targetLang || 'en' });
  } catch (err) {
    res.json({ translations: texts, targetLang: targetLang || 'en' });
  }
});

// ----------------------------------------------------
//  SYNCPAY PAYMENT & PREMIUM ENDPOINTS
// ----------------------------------------------------
app.get('/api/admin/syncpay', requireAdmin, (_req, res) => {
  const rawDb = DB.get();
  res.json({
    settings: rawDb.syncpaySettings || {
      clientId: '',
      clientSecret: '',
      webhookToken: '',
      pixKey: '',
      enabled: true,
      price: 9.99,
    },
  });
});

app.post('/api/admin/syncpay', requireAdmin, (req, res) => {
  const { clientId, clientSecret, webhookToken, webhookUrl, pixKey, enabled, price } = req.body;
  const rawDb = DB.get();
  rawDb.syncpaySettings = {
    clientId: (clientId || '').trim(),
    clientSecret: (clientSecret || '').trim(),
    webhookToken: (webhookToken || '').trim(),
    webhookUrl: String(webhookUrl || '').trim(),
    pixKey: (pixKey || '').trim(),
    enabled: enabled !== false,
    price: Number(price) > 0 ? Number(price) : 9.99,
  };
  DB.save();
  res.json({ success: true, settings: rawDb.syncpaySettings, message: 'Configurações da Syncpay salvas com sucesso! ' });
});

app.put('/api/admin/users/:id/premium', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { isPremium } = req.body;
  const rawDb = DB.get();
  const user = rawDb.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  user.isPremium = Boolean(isPremium);
  if (user.isPremium) {
    user.premiumExpiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
  } else {
    user.premiumExpiresAt = undefined;
  }
  DB.save();
  res.json({ success: true, user: DB.toPublicUser(user) });
});

installSyncpayPayments(app, DB, requireAuth, requireAdmin);

// ----------------------------------------------------
//  VITE MIDDLEWARE & STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.get(/^\/assets\/person-segmentation\/(?:vision_wasm_(?:nosimd_)?internal\.(?:wasm|js)|selfie_segmenter\.tflite)$/, async (req, res, next) => {
      if (!CLOUD) return next();
      const relative = req.path.slice(1);
      const local = path.join(distPath, relative);
      if (!local.startsWith(distPath + path.sep) || !fs.existsSync(local)) return next();
      try {
        const ext = path.extname(local).toLowerCase();
        const type = ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.wasm' ? 'application/wasm' : 'application/octet-stream';
        const url = await signedStaticMedia(relative, fs.readFileSync(local), type);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.redirect(307, url);
      } catch (error) {
        console.warn('[static-cdn] fallback local:', relative, error instanceof Error ? error.message : error);
        return next();
      }
    });
    app.use(express.static(distPath, { maxAge: '7d', immutable: false, setHeaders: (res, filename) => {
      if (filename.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=604800');
    } }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(` Mocinhas Kawaii Social Network rodando na porta ${PORT}! `);
    // Run initial cleanup on startup
    if (ephemeral1HourMode) {
      DB.cleanEphemeral1HourContent(3600000);
    }
  });
}

if (process.env.NODE_ENV === 'production') await recordLegalVersion(DB, archiveLegalVersionFile);
await flushCloud();
await startServer();
}
bootApplication().catch(error => { console.error(error.message); process.exitCode = 1; });


