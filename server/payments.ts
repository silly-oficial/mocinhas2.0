import type express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import type { DB as Database, DBPaymentCharge } from './db';

const BASE = 'https://api.syncpayments.com.br/api/partner/v1';
const equal = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export function validateSyncpaySignature(header: string, raw: Buffer, secret: string, now = Date.now()) {
  if (!secret || !header || !raw) return false;
  const fields = Object.fromEntries(header.split(',').map(s => s.trim().split('=')));
  const t = Number(fields.t);
  if (!Number.isInteger(t) || Math.abs(now / 1000 - t) > 300 || !/^[a-f0-9]{64}$/i.test(fields.v1 || '')) return false;
  return equal(createHmac('sha256', secret).update(fields.t + '.').update(raw).digest('hex'), fields.v1.toLowerCase());
}

export function installSyncpayPayments(app: express.Express, db: typeof Database, auth: express.RequestHandler,
  admin: express.RequestHandler, send: typeof fetch = fetch) {
  let cached = { key: '', token: '', until: 0 };
  const creating = new Set<string>(), checking = new Map<string, Promise<void>>();
  const config = () => {
    const s = db.get().syncpaySettings;
    return { clientId: process.env.SYNCPAY_CLIENT_ID || s?.clientId || '', clientSecret: process.env.SYNCPAY_CLIENT_SECRET || s?.clientSecret || '',
      webhookToken: process.env.SYNCPAY_WEBHOOK_SECRET || s?.webhookToken || '', webhookUrl: process.env.SYNCPAY_WEBHOOK_URL || s?.webhookUrl || (process.env.APP_URL?.startsWith('https://') ? process.env.APP_URL.replace(/\/$/, '') + '/api/syncpay/webhook' : ''), enabled: s?.enabled !== false, price: s?.price || 9.99 };
  };
  const charges = () => db.get().paymentCharges ||= [];
  async function raw(path: string, options: RequestInit) {
    let response: Response;
    try { response = await send(BASE + path, { ...options, signal: AbortSignal.timeout(12000), redirect: 'error' }); }
    catch { throw Error('Não foi possível conectar à SyncPay. Não tente pagar um código gerado anteriormente sem conferir a cobrança.'); }
    let value: any; try { value = await response.json(); } catch { throw Error('Resposta inválida da SyncPay.'); }
    if (!response.ok) throw Object.assign(Error(response.status === 401 ? 'SyncPay recusou as credenciais ou o IP do servidor.' : response.status === 422 ? 'SyncPay recusou os dados ou a conta não está aprovada.' : 'SyncPay indisponível. Tente verificar novamente mais tarde.'), { providerStatus: response.status });
    return value;
  }
  async function token() {
    const s = config();
    if (!s.clientId || !s.clientSecret) throw Error('SyncPay não configurada. A administração precisa informar as credenciais.');
    const key = createHmac('sha256', s.clientSecret).update(s.clientId).digest('hex');
    if (cached.key === key && cached.until > Date.now()) return cached.token;
    const result = await raw('/auth-token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: s.clientId, client_secret: s.clientSecret }) });
    if (typeof result.access_token !== 'string' || !result.access_token) throw Error('SyncPay não retornou autorização válida.');
    cached = { key, token: result.access_token, until: Date.now() + Math.max(0, Math.min(Number(result.expires_in) || 3600, 3600) - 60) * 1000 };
    return cached.token;
  }
  async function provider(path: string, options: RequestInit = {}) {
    try { return await raw(path, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() } }); }
    catch (e: any) { if (e.providerStatus === 401) cached.until = 0; throw e; }
  }
  function apply(charge: DBPaymentCharge, transaction: any) {
    const identifier = transaction?.identifier || transaction?.reference_id || transaction?.id;
    if (identifier !== charge.identifier || transaction.currency !== 'BRL' || (transaction.payment_method && transaction.payment_method !== 'pix') ||
      !Number.isFinite(Number(transaction.amount)) || Math.round(Number(transaction.amount) * 100) !== Math.round(charge.amount * 100)) throw Error('Os dados do pagamento não correspondem à cobrança.');
    const status = String(transaction.status || '').toLowerCase();
    if (status !== 'completed') { if (!charge.grantedAt) charge.status = status || 'pending'; db.save(); return; }
    if (!charge.grantedAt) {
      const user = db.findUserById(charge.userId);
      if (!user) throw Error('Conta da cobrança não encontrada.');
      const paidAt = Date.parse(transaction.paid_at || transaction.updated_at || transaction.transaction_date || '') || Date.now();
      const oldUntil = Date.parse(user.premiumExpiresAt || '') || 0;
      // One settled charge grants exactly one 30-day period. Replay never extends it.
      const until = Math.max(paidAt, oldUntil) + 30 * 86400000;
      user.isPremium = until > Date.now(); user.premiumExpiresAt = new Date(until).toISOString();
      charge.grantedAt = Date.now(); charge.status = 'completed'; db.save();
    }
  }
  async function reconcile(charge: DBPaymentCharge) {
    if (charge.grantedAt || (charge.checkedAt && Date.now() - charge.checkedAt < 15000)) return;
    const inflight = checking.get(charge.identifier); if (inflight) return inflight;
    const task = (async () => {
      const result = await provider('/transaction/' + encodeURIComponent(charge.identifier));
      apply(charge, result.data || result.transaction || result);
      charge.checkedAt = Date.now(); db.save();
    })(); checking.set(charge.identifier, task);
    try { await task; } finally { checking.delete(charge.identifier); }
  }
  async function publicCharge(c: DBPaymentCharge) {
    return { txId: c.identifier, amount: c.amount, pixCopyAndPaste: c.pixCode, qrCodeUrl: await QRCode.toDataURL(c.pixCode, { width: 256, margin: 2 }), status: c.status };
  }
  app.get('/api/syncpay/config', (_req, res) => {
    const s = config(); res.setHeader('Cache-Control', 'no-store');
    res.json({ enabled: s.enabled, price: s.price, hasCredentials: !!(s.clientId && s.clientSecret), durationDays: 30 });
  });
  app.get('/api/admin/syncpay/diagnostics', admin, async (_req, res) => {
    const s = config();
    if (!s.clientId || !s.clientSecret) return res.json({ configured: false, authenticated: false, message: 'Credenciais não configuradas. Nenhuma cobrança real pode ser gerada.' });
    try { await token(); res.json({ configured: true, authenticated: true, webhookConfigured: !!s.webhookToken, message: 'Autenticação aprovada pela SyncPay. Recebimento real ainda exige uma transação paga e conciliada.' }); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.get('/api/admin/syncpay/payments', admin, (_req, res) => res.json({ charges: charges().map(({ pixCode, ...c }) => c).slice(-100).reverse() }));
  app.post('/api/syncpay/create-charge', auth, async (req, res) => {
    const userId = (req as any).userId, user = db.findUserById(userId), s = config();
    res.setHeader('Cache-Control', 'no-store');
    if (!user) return res.status(401).json({ error: 'Conta não encontrada.' });
    if (!s.enabled || !s.clientId || !s.clientSecret) return res.status(503).json({ error: 'Pagamento indisponível: SyncPay não está configurada ou está desativada.' });
    if (creating.has(userId)) return res.status(409).json({ error: 'Uma cobrança já está sendo gerada. Aguarde.' });
    const existing = charges().find(c => c.userId === userId && c.status === 'pending');
    if (existing) return res.json(await publicCharge(existing));
    if (!s.webhookUrl.startsWith('https://')) return res.status(503).json({ error: 'A administração precisa configurar a URL HTTPS do webhook SyncPay.' });
    const cpf = String(req.body.cpf || '').replace(/\D/g, ''), phone = String(req.body.phone || '').replace(/\D/g, '');
    const name = String(req.body.name || user.displayName || '').trim();
    if (!/^\d{11}$/.test(cpf) || !/^\d{10,13}$/.test(phone) || name.length < 3) return res.status(400).json({ error: 'Informe nome, CPF (11 dígitos) e telefone com DDD para gerar o Pix.' });
    if (!Number.isFinite(s.price) || s.price < 1) return res.status(400).json({ error: 'O valor do Premium deve ser de pelo menos R$ 1,00.' });
    creating.add(userId);
    try {
      const result = await provider('/cash-in', { method: 'POST', body: JSON.stringify({ amount: Math.round(s.price * 100) / 100,
        description: 'Mocinhas Premium — 30 dias', webhook_url: s.webhookUrl, client: { name, email: user.email, cpf, phone } }) });
      if (typeof result.identifier !== 'string' || typeof result.pix_code !== 'string' || !result.pix_code.startsWith('000201')) throw Error('SyncPay não retornou uma cobrança Pix válida.');
      const c: DBPaymentCharge = { identifier: result.identifier, userId, amount: Math.round(s.price * 100) / 100, pixCode: result.pix_code, status: 'pending', createdAt: Date.now() };
      charges().push(c); db.save(); res.json(await publicCharge(c));
    } catch (e: any) { res.status(502).json({ error: e.message }); }
    finally { creating.delete(userId); }
  });
  app.post('/api/syncpay/confirm-charge', auth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const c = charges().find(c => c.identifier === req.body.txId && c.userId === (req as any).userId);
    if (!c) return res.status(404).json({ error: 'Cobrança não encontrada para sua conta.' });
    try { await reconcile(c); res.json({ paid: !!c.grantedAt, status: c.status, message: c.grantedAt ? 'Pagamento confirmado. Premium ativo por 30 dias.' : 'Pagamento ainda não confirmado pela SyncPay.' }); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.post('/api/syncpay/webhook', async (req, res) => {
    const s = config(), signature = req.get('X-SyncPay-Signature') || '';
    const signed = validateSyncpaySignature(signature, (req as any).rawBody, s.webhookToken);
    const legacy = !signature && !!s.webhookToken && equal(req.get('Authorization') || '', 'Bearer ' + s.webhookToken);
    if (!signed && !legacy) return res.status(401).json({ error: 'Webhook não autenticado.' });
    const event = req.body || {}, transaction = event.transaction || event.data || event;
    const id = transaction.reference_id || transaction.identifier || transaction.id;
    const c = charges().find(c => c.identifier === id);
    if (!c) return res.status(404).json({ error: 'Cobrança desconhecida.' });
    try {
      // Always reconcile through the seller API: a forged body cannot grant Premium.
      await reconcile(c);
      res.json({ received: true });
    } catch { res.status(503).json({ error: 'Conciliação indisponível. Reenvie o evento.' }); }
  });
}
