import type express from 'express';
import jwt from 'jsonwebtoken';
import { createHmac, randomUUID } from 'node:crypto';
import type { DB as Database } from './db';

const DAY = 24 * 60 * 60 * 1000;
const SLICE = 10_000;
type Bucket = { startedAt: number; usedMs: number; leaseUntil: number };
export function reserveUsage(buckets: Bucket[], limit: number, now: number, consume: boolean) {
  const live = buckets.filter(b => now < b.startedAt + DAY);
  const merged: Bucket = live.length ? {
    startedAt: Math.min(...live.map(b => b.startedAt)),
    usedMs: Math.max(...live.map(b => b.usedMs)),
    leaseUntil: Math.max(...live.map(b => b.leaseUntil)),
  } : { startedAt: now, usedMs: 0, leaseUntil: 0 };
  // Reserve time before serving content. Multiple tabs reuse the same paid lease.
  if (consume && merged.leaseUntil <= now && merged.usedMs < limit) {
    const grant = Math.min(SLICE, limit - merged.usedMs, merged.startedAt + DAY - now);
    merged.usedMs += grant;
    merged.leaseUntil = now + grant;
  }
  return merged;
}

export function installConsumptionPolicy(app: express.Express, db: typeof Database, secret: string,
  auth: (req: express.Request) => string | null, admin: express.RequestHandler) {
  const cookies = (req: express.Request) => Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split(/=(.*)/s).slice(0, 2)));
  const digest = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  const settings = () => db.get().usageSettings || { dailyMinutes: 0, bindNetwork: false };
  const cookieOptions = (req: express.Request) => ({ httpOnly: true, sameSite: 'lax' as const, secure: req.secure, maxAge: 365 * DAY, path: '/' });
  function identity(req: express.Request, res: express.Response) {
    let device: string;
    try { device = (jwt.verify(cookies(req).mocinhas_device, secret) as any).device; if (!device) throw Error(); }
    catch { device = randomUUID(); res.cookie('mocinhas_device', jwt.sign({ device }, secret), cookieOptions(req)); }
    return device;
  }
  function state(req: express.Request, res: express.Response, consume = false) {
    const userId = auth(req);
    if (!userId || !db.findUserById(userId)) return null;
    if (db.findUserById(userId)?.isAdmin) return { unlimited: true, remainingMs: null, allowedMs: DAY, resetAt: null, blocked: false };
    const config = settings();
    if (!config.dailyMinutes) return { unlimited: true, remainingMs: null, allowedMs: DAY, resetAt: null, blocked: false };
    const device = identity(req, res);
    const keys = [digest('user:' + userId), digest('device:' + device)];
    if (config.bindNetwork) keys.push(digest('network:' + req.ip));
    const all = db.get().usageBuckets ||= {};
    const now = Date.now(), limit = config.dailyMinutes * 60_000;
    const merged = reserveUsage(keys.map(k => all[k]).filter(Boolean), limit, now, consume);
    // A reduced admin limit invalidates outstanding leases too.
    if (merged.usedMs > limit) merged.leaseUntil = 0;
    const changed = keys.some(k => JSON.stringify(all[k]) !== JSON.stringify(merged));
    keys.forEach(k => { all[k] = { ...merged }; });
    for (const [key, value] of Object.entries(all)) if (now >= value.startedAt + DAY) delete all[key];
    if (changed) db.save();
    return { unlimited: false, remainingMs: Math.max(0, limit - merged.usedMs) + Math.max(0, merged.leaseUntil - now),
      allowedMs: Math.max(0, merged.leaseUntil - now), resetAt: merged.startedAt + DAY,
      blocked: merged.usedMs >= limit && merged.leaseUntil <= now };
  }
  app.get('/api/admin/usage-settings', admin, (_req, res) => res.json(settings()));
  app.put('/api/admin/usage-settings', admin, (req, res) => {
    const { dailyMinutes, bindNetwork } = req.body;
    if (!Number.isInteger(dailyMinutes) || dailyMinutes < 0 || dailyMinutes > 1440 || typeof bindNetwork !== 'boolean') {
      return res.status(400).json({ error: 'Informe minutos inteiros entre 0 e 1440.' });
    }
    db.get().usageSettings = { dailyMinutes, bindNetwork }; db.save(); res.json(settings());
  });
  app.post('/api/usage/consume', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = state(req, res, true);
    if (!result) return res.status(401).json({ error: 'Entre na sua conta para acessar.' });
    // Native media elements cannot send the Authorization header.
    res.cookie('mocinhas_media', jwt.sign({ userId: auth(req), media: true }, secret, { expiresIn: '1h' }), { ...cookieOptions(req), maxAge: 3600000 });
    res.json(result);
  });
  app.use((req, res, next) => {
    const route = req.path;
    // Legacy recovery returned the reset code to unauthenticated callers.
    if (route === '/api/auth/recover' || route === '/api/auth/reset-password') return res.status(503).json({ error: 'Recuperação de senha indisponível até configurar verificação de identidade. Contate a administração.' });
    if (/^\/api\/(stories|conversations|messages|groups|rooms|comments|notifications|events|search)(\/|$)/.test(route) ||
      /^\/api\/users\/.+\/(follow|unfollow|followers|following)(\/|$)/.test(route) ||
      /^\/api\/users\/follow-requests/.test(route) || route === '/api/posts/explore/feed' ||
      /^\/api\/posts\/[^/]+\/(like|save|comments)$/.test(route)) {
      return res.status(403).json({ error: 'Função desativada nesta versão.' });
    }
    if (route.startsWith('/api/ephemeral') || route === '/api/admin/emergency-cleanup') {
      if (req.method === 'GET') return res.json({ ephemeral1HourMode: false, expiresAfterMinutes: null });
      return res.status(403).json({ error: 'Exclusão automática desativada.' });
    }
    if (route.startsWith('/api/posts') || route.startsWith('/uploads/')) {
      res.setHeader('Cache-Control', 'private, no-store');
      if (route.startsWith('/uploads/') && !auth(req)) {
        try { const token = cookies(req).mocinhas_media; const payload = jwt.verify(token, secret) as any;
          if (payload.media) req.headers.authorization = `Bearer ${token}`;
        } catch {}
      }
      const status = state(req, res);
      if (!status) return res.status(401).json({ error: 'Entre na sua conta para acessar.' });
      if (status.blocked || (!status.unlimited && status.allowedMs <= 0)) return res.status(429).json({ error: 'Renove a autorização de uso ou aguarde a próxima cota.', ...status });
      // Hide historical non-admin content without deleting it.
      const original = res.json.bind(res);
      res.json = ((body: any) => {
        const visible = (p: any) => db.findUserById(db.get().posts.find(row => row.id === p.id)?.userId || '')?.isAdmin === true;
        if (Array.isArray(body.posts)) body.posts = body.posts.filter(visible);
        if (Array.isArray(body.reels)) body.reels = body.reels.filter(visible);
        if (body.post && !visible(body.post)) return original({ error: 'Publicação indisponível.' });
        return original(body);
      }) as any;
    }
    next();
  });
}
