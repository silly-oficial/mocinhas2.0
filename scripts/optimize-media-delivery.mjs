import fs from 'node:fs';

const file = 'server.ts';
let source = fs.readFileSync(file, 'utf8');

// In Supabase mode, /uploads is already protected by the consumption/auth middleware.
// Do not proxy media bytes through Render: issue a short-lived signed Supabase URL and
// redirect the client so Range/video traffic goes directly through Supabase Storage/CDN.
const proxyRoute = /app\.use\('\/uploads', async \(req, res, next\) => \{[\s\S]*?\n\}\);\nif \(!CLOUD\) app\.use\('\/uploads', express\.static\(UPLOADS_DIR, \{ maxAge: 0, setHeaders: res => res\.setHeader\('Cache-Control', 'private, no-store'\) \}\)\);/;

const replacement = `app.use('/uploads', async (req, res, next) => {
  if (!CLOUD) return next();
  try {
    await flushCloud();
    const url = await signedMedia(req.path.slice(1));
    // The signed URL expires quickly. Render sends only this tiny redirect; the actual
    // image/video bytes and Range requests are served directly by Supabase Storage.
    res.setHeader('Cache-Control', 'private, no-store');
    return res.redirect(307, url);
  } catch {
    if (!res.headersSent && !res.destroyed) res.status(503).json({error:'Mídia temporariamente indisponível.'});
  }
});
if (!CLOUD) app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1h', setHeaders: res => res.setHeader('Cache-Control', 'private, max-age=3600') }));`;

if (!proxyRoute.test(source)) {
  throw new Error('MEDIA_ROUTE_PATCH_FAILED: a rota /uploads mudou; atualização interrompida para não alterar o servidor incorretamente.');
}

source = source.replace(proxyRoute, replacement);
// Remove the now-unused Node stream import after eliminating the proxy.
source = source.replace("import { Readable } from 'node:stream';\n", '');
fs.writeFileSync(file, source);
console.log('Media delivery optimized: Supabase media bypasses Render proxy.');
