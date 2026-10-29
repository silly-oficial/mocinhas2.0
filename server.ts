import {installRetiredPages} from './server/retired-pages';
import {installProfileUploads} from './server/profile-uploads';
import {installAccessLog} from './server/access-log';
import {sessionToken,setSession,protectCookieWrites} from './server/session-security';
import {authRateLimit,issueRecovery,consumeRecovery,deliverRecovery} from './server/auth-security';
import {tiktokPost} from './shared/people';
import {makeTikTokResolver} from './server/tiktok-oembed';
import {uploadedMediaOrigin} from './server/media-origin';
import { installPeople } from './server/people';
import { validateVideoCover } from './shared/video-cover';
import { validatePhotoFocus } from './shared/photo-focus';
import { installWelcome } from './server/welcome';
import { CLOUD, flushCloud, assertCloudHealthy, uploadCloud, signedMedia } from './server/cloud-store';
import { hydrateCloudDatabase } from './server/storage';
import 'dotenv/config';
import { UPLOADS_DIR, DB_FILE, storageDiagnostics } from './server/storage';
import { randomBytes } from 'node:crypto';
import { installConsumptionPolicy } from './server/consumption.ts';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';
import { DB, loadDB, DBPost, DBUser, DBStory, DBComment, DBMessage, DBConversation, DBNotification } from './server/db.ts';
import { checkSupabaseConnection, isSupabaseConfigured, updateSupabaseCredentials } from './server/supabase.ts';

async function bootApplication() {
if (CLOUD) { await hydrateCloudDatabase(); loadDB(); }
const app = express();
installRetiredPages(app);
if (!DB.get().engagementRestored) {
  DB.get().posts.forEach(p => { p.allowComments = true; });
  DB.get().engagementRestored = true; DB.save();
}
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || DB.get().authSecret || randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET && !DB.get().authSecret) { DB.get().authSecret = JWT_SECRET; DB.save(); }
if(process.env.TRUST_PROXY)app.set('trust proxy',/^\d+$/.test(process.env.TRUST_PROXY)?Number(process.env.TRUST_PROXY):process.env.TRUST_PROXY);else if(process.env.RENDER==='true')app.set('trust proxy',1);

// Profile uploads reuse the configured private media storage.
if(!fs.existsSync(UPLOADS_DIR))fs.mkdirSync(UPLOADS_DIR,{recursive:true});

// Middlewares
app.use(express.json({ limit: '50mb', verify: (req, _res, buf) => { if (req.url === '/api/syncpay/webhook') (req as any).rawBody = Buffer.from(buf); } }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(protectCookieWrites);
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
installAccessLog(app,DB);
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
  const token=sessionToken(req);if(!token)return null;
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
installConsumptionPolicy(app, DB, JWT_SECRET, getAuthUserId, requireAdmin);
installPeople(app, DB, requireAdmin);
installProfileUploads(app,requireAdmin);
app.post('/api/admin/people/prepare-video',requireAdmin,(_req,res)=>res.status(410).json({error:'Uploads desativados. Use links do TikTok.'}));
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


// ----------------------------------------------------
//  AUTHENTICATION ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { username, displayName, email, password, gender, avatar, banner, acceptedTerms } = req.body;
  if (!username || !displayName || !email || !password) {
    return res.status(400).json({ error: 'Por favor preencha todos os campos obrigatórios! ' });
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

  const passwordHash = bcrypt.hashSync(password, 12);
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
    banner: '',
    isPrivate: false,
    isVerified: isSuperAdmin,
    isAdmin: isSuperAdmin,
    animeTitle: isSuperAdmin ? 'Administrador Chefe ' : 'Criador Digital ',
    themeColor: '#FF69B4',
    website: '',
    createdAt: new Date().toISOString(),
    acceptedTerms: false,
  };

  DB.createUser(newUser);

  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });
  const publicUser = DB.toPublicUser(newUser, newUser.id);
  setSession(res,token);res.json({token,user:publicUser});
});

app.post('/api/auth/login', authRateLimit(5,60000,req=>(req.ip||'')+'|'+String(req.body?.identifier||'').trim().toLowerCase()), (req, res) => {
  const { identifier, password } = req.body;
  if (typeof identifier!=='string'||typeof password!=='string'||!identifier||!password||identifier.length>254||password.length>72) {
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
  setSession(res,token);res.json({token,user:publicUser});
});

app.post('/api/auth/logout',(_req,res)=>{res.clearCookie('mocinhas_session',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});res.set('Cache-Control','no-store').json({success:true});});
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

app.post('/api/auth/recover', authRateLimit(3,3600000,req=>String(req.body?.email||'').trim().toLowerCase()), async(req,res)=>{
 const email=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():'';
 const message='Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação.';
 const user=DB.findUserByEmail(email);
 if(!user)return res.json({success:true,message});
 const {code,state}=issueRecovery();
 try{
  if(process.env.NODE_ENV==='production')await deliverRecovery(email,code);
  DB.updateUser(user.id,state);
  return res.json({success:true,message,...(process.env.NODE_ENV!=='production'?{demoCode:code}:{})});
 }catch{return res.status(503).json({error:'Recuperação indisponível. Use o contato público do site.'});}
});
app.post('/api/auth/reset-password',(req,res)=>{
 const {email,code,newPassword}=req.body;
 if(typeof newPassword!=='string'||newPassword.length<8||newPassword.length>72)return res.status(400).json({error:'Use uma senha de 8 a 72 caracteres.'});
 const user=typeof email==='string'?DB.findUserByEmail(email.trim().toLowerCase()):undefined;
 if(!user)return res.status(400).json({error:'Código de recuperação inválido ou expirado.'});
 const state={recoveryToken:user.recoveryToken,recoveryExpiresAt:user.recoveryExpiresAt,recoveryAttempts:user.recoveryAttempts};
 const accepted=consumeRecovery(state,code);DB.updateUser(user.id,state);
 if(!accepted)return res.status(400).json({error:'Código de recuperação inválido ou expirado.'});
 DB.updateUser(user.id,{passwordHash:bcrypt.hashSync(newPassword,12)});
 return res.json({success:true,message:'Senha atualizada com sucesso!'});
});

app.post('/api/auth/update-password', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body;
  const user = DB.findUserById(userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 12);
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

  const currentProfile=DB.findUserById(userId);
  if((avatar&&avatar!==currentProfile?.avatar)||(banner&&banner!==currentProfile?.banner))return res.status(400).json({error:'Envio de fotos desativado.'});
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



const resolvePostTikTok=makeTikTokResolver(DB);
app.post('/api/posts', requireAdmin, async (req, res) => {
  const currentUserId = (req as any).userId;
  const { media, caption, location, allowComments, isTemporary, durationHours } = req.body;

  if (!media || !Array.isArray(media) || media.length === 0) {
    return res.status(400).json({ error: 'Adicione pelo menos um link do TikTok.' });
  }

  if(caption!==undefined&&(typeof caption!=='string'||caption.length>10000))return res.status(400).json({error:'Legenda inválida (máximo 10000 caracteres).'});
  if(media.length>30)return res.status(400).json({error:'Use até 30 publicações do TikTok por vez.'});
  let linkedMedia:any[];
  try {linkedMedia=await Promise.all(media.map(async(m:any)=>{const source=tiktokPost(m?.url);const metadata=await resolvePostTikTok(source.canonical);const now=new Date().toISOString();return {url:source.canonical,type:source.postType==='photo'?'image':'video',thumbnail:metadata.thumbnail_url,source_platform:'tiktok',source_url:source.canonical,source_handle:new URL(source.canonical).pathname.split('/')[1],captured_at:now,display_mode:'embed',last_check_at:metadata.checkedAt,is_still_available:metadata.available};}));}
  catch(error){return res.status(400).json({error:error instanceof Error?error.message:'Informe links válidos do TikTok.'});}
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
    media: linkedMedia.map((m,idx)=>({...m,id:`m_${Date.now()}_${idx}`})),
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










// ----------------------------------------------------
//  DIRECT MESSAGES & GROUP CHATS
// ----------------------------------------------------




// Group Endpoints


















// Clear group messages without deleting the group










// ----------------------------------------------------
//  NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------






// ----------------------------------------------------
//  SEARCH ENDPOINT
// ----------------------------------------------------


// ----------------------------------------------------
//  MEDIA UPLOAD (FILE + BASE64 SUPPORT)
// ----------------------------------------------------
app.post('/api/upload', requireAdmin, (_req,res)=>res.status(410).json({error:'Uploads desativados. Use links do TikTok.'}));

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

app.patch('/api/admin/posts/:id/cover',requireAdmin,(_req,res)=>res.status(410).json({error:'Capas de novas mídias vêm do TikTok.'}));

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

app.use('/api/syncpay',(req,res)=>res.status(req.path==='/create-charge'?503:req.path==='/confirm-charge'?404:410).json({error:'Pagamentos desativados neste diretório.'}));

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

await flushCloud();
await startServer();
}
bootApplication().catch(error => { console.error(error.message); process.exitCode = 1; });



