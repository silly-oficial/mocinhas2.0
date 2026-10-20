import fs from 'node:fs';

const file = 'server.ts';
let source = fs.readFileSync(file, 'utf8');

// In Supabase mode, /uploads is already protected by the consumption/auth middleware.
// Do not proxy media bytes through the app host: issue a short-lived signed Supabase URL
// and redirect the client so Range/video traffic goes directly through Storage/CDN.
const proxyRoute = /app\.use\('\/uploads', async \(req, res, next\) => \{[\s\S]*?\n\}\);\nif \(!CLOUD\) app\.use\('\/uploads', express\.static\(UPLOADS_DIR, \{ maxAge: 0, setHeaders: res => res\.setHeader\('Cache-Control', 'private, no-store'\) \}\)\);/;
const replacement = `app.use('/uploads', async (req, res, next) => {
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
if (!CLOUD) app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1h', setHeaders: res => res.setHeader('Cache-Control', 'private, max-age=3600') }));`;
if (!proxyRoute.test(source)) throw new Error('MEDIA_ROUTE_PATCH_FAILED: rota /uploads mudou; build interrompido com segurança.');
source = source.replace(proxyRoute, replacement);
source = source.replace("import { Readable } from 'node:stream';\n", '');
source = source.replace("import { CLOUD, flushCloud, assertCloudHealthy, uploadCloud, signedMedia } from './server/cloud-store';", "import { CLOUD, flushCloud, assertCloudHealthy, uploadCloud, signedMedia, signedStaticMedia } from './server/cloud-store';");

// The two MediaPipe WASM files are ~25 MB together and Blue Lab contains dozens of
// images. On the first production request each object is copied once to the existing
// private Supabase bucket; afterwards this host only sends a redirect and Supabase/CDN
// serves the heavy bytes. If Storage is unavailable, fall back to local static serving.
const staticMarker = "    const distPath = path.join(process.cwd(), 'dist');\n    app.use(express.static(distPath));";
const staticReplacement = `    const distPath = path.join(process.cwd(), 'dist');
    app.get(/^\\/(blue-lab\\/[^/]+\\.webp|assets\\/person-segmentation\\/(?:vision_wasm_(?:nosimd_)?internal\\.(?:wasm|js)|selfie_segmenter\\.tflite))$/, async (req, res, next) => {
      if (!CLOUD) return next();
      const relative = req.path.slice(1);
      const local = path.join(distPath, relative);
      if (!local.startsWith(distPath + path.sep) || !fs.existsSync(local)) return next();
      try {
        const ext = path.extname(local).toLowerCase();
        const type = ext === '.webp' ? 'image/webp' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.wasm' ? 'application/wasm' : 'application/octet-stream';
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
    } }));`;
if (!source.includes(staticMarker)) throw new Error('STATIC_ROUTE_PATCH_FAILED: bloco estático mudou; build interrompido com segurança.');
source = source.replace(staticMarker, staticReplacement);

fs.writeFileSync(file, source);
console.log('Delivery optimized: user media and heavy static assets bypass the app host; static cache enabled.');
