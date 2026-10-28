import type express from 'express';
import {createHash, randomUUID} from 'node:crypto';
import type {DB} from './db';
import {requestTypes, type DirectoryRequest} from '../shared/directory-requests';
import {directorySettings} from './directory-settings';
import {enqueueEmail} from './directory-email';
import {addVerificationRequest} from './verification';

const DAY = 86_400_000;
function field(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw Error('Confira os campos obrigatórios e os limites de tamanho.');
  return value.trim();
}
export function validateDirectoryRequest(input: unknown): Omit<DirectoryRequest, 'id'|'status'|'createdAt'|'updatedAt'|'adminNote'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Pedido inválido.');
  const body = input as Record<string, unknown>;
  const responsibleName = field(body.responsibleName, 120, true);
  const email = field(body.email, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Informe um e-mail válido.');
  const handle = field(body.handle, 60, true).replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{1,60}$/.test(handle)) throw Error('Informe somente o @ do perfil, sem link.');
  const type = field(body.type, 40, true);
  if (!Object.hasOwn(requestTypes, type)) throw Error('Selecione um tipo de pedido.');
  const observations = field(body.observations ?? '', 3000);
  let documentUrl = field(body.documentUrl ?? '', 2048);
  if (documentUrl) {
    if (type !== 'reivindicar_perfil' && type !== 'autorizar_oficialmente') throw Error('Termos são recebidos somente em pedidos de reivindicação ou autorização.');
    let url: URL;
    try { url = new URL(documentUrl); } catch { throw Error('Use um link HTTPS válido para o termo.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use um link HTTPS válido para o termo.');
    // Never fetch submitted URLs on the server or include them in public profile data.
    documentUrl = url.href;
  }
  return {responsibleName, email, handle, type: type as DirectoryRequest['type'], observations, documentUrl};
}
export function retainDirectoryRequests(rows: DirectoryRequest[], now = Date.now()) {
  return rows.filter(row => {
    const closed = row.status === 'resolved' || row.status === 'rejected';
    const since = Date.parse(closed ? row.closedAt || row.updatedAt : row.createdAt);
    return Number.isFinite(since) && now - since < (closed ? 90 : 180) * DAY;
  });
}
export function installDirectoryRequests(app: express.Express, db: typeof DB, admin: express.RequestHandler) {
  const rows = () => db.get().directoryRequests || [];
  function prune() {
    const retained = retainDirectoryRequests(rows());
    const before = db.get().directoryRequests, beforeMail=db.get().directoryEmailOutbox, beforeVerification=db.get().verificationRequests;
    const verification=(beforeVerification||[]).filter(row=>row.status==='aprovado'||Date.now()-Date.parse(row.reviewedAt||row.createdAt)<(['revogado','recusado'].includes(row.status)?90:180)*DAY);
    const live=new Set([...retained.map(row=>row.id),...verification.map(row=>row.requestId)]);
    const mail=(beforeMail||[]).filter(row=>live.has(row.data.protocol)&&Date.now()-Date.parse(row.createdAt)<90*DAY);
    if(retained.length===rows().length && mail.length===(beforeMail||[]).length && verification.length===(beforeVerification||[]).length)return;
    db.get().directoryRequests=retained;db.get().directoryEmailOutbox=mail;db.get().verificationRequests=verification;
    try { db.save(); } catch (error) { db.get().directoryRequests=before;db.get().directoryEmailOutbox=beforeMail;db.get().verificationRequests=beforeVerification;throw error; }

  }
  prune();
  const timer = setInterval(() => { try { prune(); } catch { console.warn('[directory-requests] Falha ao aplicar retenção.'); } }, DAY);
  timer.unref();
  const buckets = new Map<string, {count: number; until: number}>();
  function contactEmail() {
    const value = directorySettings(db).contactEmail;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
  }
  app.get('/api/directory-contact', (_req, res) => res.set('Cache-Control', 'no-store').json({email: contactEmail()}));
  app.post('/api/directory-requests', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${req.protocol}://${req.get('host')}`)) return res.status(403).json({error: 'Envie o formulário pelo próprio site.'});
    if (!req.is('application/json')) return res.status(415).json({error: 'Formato de envio inválido.'});
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
    const key = createHash('sha256').update(req.ip || req.socket.remoteAddress || 'unknown').digest('hex');
    const bucket = buckets.get(key) || {count: 0, until: now + 60 * 60 * 1000};
    if (bucket.count >= 5 || (!buckets.has(key) && buckets.size >= 5000)) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.until - now) / 1000))));
      return res.status(429).json({error: 'Muitos envios. Aguarde uma hora ou use o contato informado na página.'});
    }
    bucket.count++; buckets.set(key, bucket);
    try {
      const input = validateDirectoryRequest(req.body);
      prune();
      if (rows().length >= 10000) return res.status(503).json({error: 'Fila temporariamente cheia. Utilize o contato informado na página.'});
      const date = new Date(now).toISOString();
      const due = new Date(now);let days=directorySettings(db).responseBusinessDays;
      while(days){due.setUTCDate(due.getUTCDate()+1);if(![0,6].includes(due.getUTCDay()))days--;}
      const request: DirectoryRequest = {...input, id: randomUUID(), status: 'pending', createdAt: date, updatedAt: date, dueAt:due.toISOString(), adminNote: ''};
      const before = db.get().directoryRequests;
      const beforeMail=db.get().directoryEmailOutbox,beforeVerification=db.get().verificationRequests;
      db.get().directoryRequests = [...rows(), request];
      addVerificationRequest(db,request);
      enqueueEmail(db,'received-'+request.id,request.email,'request_received',request.id);
      enqueueEmail(db,'admin-'+request.id,directorySettings(db).contactEmail,'admin_new_request',request.id);
      try { db.save(); } catch (error) { db.get().directoryRequests = before;db.get().directoryEmailOutbox=beforeMail;db.get().verificationRequests=beforeVerification;throw error; }
      return res.status(201).json({id: request.id});
    } catch (error) {
      if (error instanceof Error && /Pedido inválido|Confira os campos|Informe|Selecione|Use um link|Termos são/.test(error.message)) return res.status(400).json({error: error.message});
      return res.status(503).json({error: 'Não foi possível registrar o pedido. Tente novamente.'});
    }
  });
  app.get('/api/admin/directory-requests', admin, (req, res) => {
    prune();
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    if (!['pending','reviewing','resolved','rejected','all'].includes(status)) return res.status(400).json({error: 'Status inválido.'});
    const page = Math.max(0, Math.min(10000, Number(req.query.page) || 0) | 0);
    const selected = rows().filter(row => status === 'all' || row.status === status).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
    res.set('Cache-Control', 'no-store').json({requests: selected.slice(page * 50, (page + 1) * 50), total: selected.length});
  });
  app.patch('/api/admin/directory-requests/:id', admin, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const current = rows().find(row => row.id === req.params.id);
    if (!current) return res.status(404).json({error: 'Pedido não encontrado.'});
    const {status, unpublishProfileId} = req.body || {};
    if (!['reviewing','resolved','rejected'].includes(status)) return res.status(400).json({error: 'Status inválido.'});
    if(current.type==='revogar_autorizacao' && status==='resolved' && (db.get().verificationRequests||[]).some(row=>row.handle===current.handle&&row.status==='aprovado'))return res.status(400).json({error:'Revogue o termo e o selo na aba Verificações antes de concluir este pedido.'});
    let adminNote: string;
    try { adminNote = field(req.body.adminNote ?? '', 3000); } catch { return res.status(400).json({error: 'Observação administrativa muito longa.'}); }
    const profiles = db.get().peopleProfiles || [];
    if (unpublishProfileId !== undefined) {
      if (current.type !== 'remover_conteudo' || status !== 'resolved' || !profiles.some(profile => profile.id === unpublishProfileId && [profile.username, profile.socials.tiktok].some(handle => handle?.replace(/^@/, '').toLowerCase() === current.handle))) return res.status(400).json({error: 'Selecione um perfil correspondente ao @ do pedido de remoção.'});
    }
    const now = new Date().toISOString();
    const updated: DirectoryRequest = {...current, status, adminNote, updatedAt: now, ...(status === 'resolved' || status === 'rejected' ? {closedAt: now} : {closedAt: undefined})};
    const beforeRequests = db.get().directoryRequests, beforeProfiles = db.get().peopleProfiles;
    const beforeMail=db.get().directoryEmailOutbox;
    db.get().directoryRequests = rows().map(row => row.id === current.id ? updated : row);
    if (unpublishProfileId !== undefined) db.get().peopleProfiles = profiles.map(profile => profile.id === unpublishProfileId ? {...profile, published: false, updatedAt: now} : profile);
    if(['resolved','rejected'].includes(status) && current.status!==status)enqueueEmail(db,'completed-'+current.id+'-'+status,current.email,'request_completed',current.id);
    try { db.save(); } catch {
      db.get().directoryEmailOutbox=beforeMail;
      db.get().directoryRequests = beforeRequests; db.get().peopleProfiles = beforeProfiles;
      return res.status(503).json({error: 'Não foi possível salvar a análise.'});
    }
    return res.json({request: updated});
  });
}
