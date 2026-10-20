import fs from 'node:fs';

// Remove o antigo recurso Azul Infinito antes do build. Os arquivos-fonte principais
// da feature foram removidos do repositório; estes ajustes limpam as referências que
// ainda vivem em arquivos grandes/legados sem deixar código morto no bundle final.
const appFile = 'src/App.tsx';
let appSource = fs.readFileSync(appFile, 'utf8');
appSource = appSource.replace("import {BlueLab} from './components/BlueLab';\n", '');
appSource = appSource.replace(/<button className="account-row" onClick=\{\(\)=>navigate\('blue-lab'\)\}><Palette size=\{20\}\/\><span><strong>Azul infinito<\/strong><small>Tema experimental em uma aba separada<\/small><\/span><span aria-hidden="true">›<\/span><\/button>/g, '');
appSource = appSource.replace(/\{view === 'feed' && !personOpen && <button className="blue-lab-entry"[\s\S]*?<\/button>\}\n?/g, '');
appSource = appSource.replace("{view === 'blue-lab' ? <BlueLab admin={isAdmin} onBack={()=>navigate('feed')}/> : view === 'people' ?", "{view === 'people' ?");
appSource = appSource.replace("view !== 'blue-lab' && ", '');
if (/Azul infinito|blue-lab|<BlueLab\b/.test(appSource)) throw new Error('BLUE_LAB_APP_CLEANUP_FAILED: referência do Azul Infinito permaneceu em App.tsx.');
fs.writeFileSync(appFile, appSource);

const apiFile = 'src/services/api.ts';
let apiSource = fs.readFileSync(apiFile, 'utf8');
apiSource = apiSource.replace(/^\s*getBlueLab:.*\n/m, '');
apiSource = apiSource.replace(/^\s*saveBlueLab:.*\n/m, '');
fs.writeFileSync(apiFile, apiSource);

// Garante que as imagens antigas do Azul Infinito não sejam copiadas para dist.
fs.rmSync('public/blue-lab', { recursive: true, force: true });

const file = 'server.ts';
let source = fs.readFileSync(file, 'utf8');
source = source.replace("import { installBlueLab } from './server/blue-lab';\n", '');
source = source.replace("installBlueLab(app, DB, requireAdmin);\n", '');

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

// Os MediaPipe WASM continuam sendo entregues pelo Storage/CDN. O Azul Infinito foi
// removido, então somente os assets de segmentação permanecem nesta rota pesada.
const staticMarker = "    const distPath = path.join(process.cwd(), 'dist');\n    app.use(express.static(distPath));";
const staticReplacement = `    const distPath = path.join(process.cwd(), 'dist');
    app.get(/^\\/assets\\/person-segmentation\\/(?:vision_wasm_(?:nosimd_)?internal\\.(?:wasm|js)|selfie_segmenter\\.tflite)$/, async (req, res, next) => {
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
    } }));`;
if (!source.includes(staticMarker)) throw new Error('STATIC_ROUTE_PATCH_FAILED: bloco estático mudou; build interrompido com segurança.');
source = source.replace(staticMarker, staticReplacement);

if (/installBlueLab|server\/blue-lab/.test(source)) throw new Error('BLUE_LAB_SERVER_CLEANUP_FAILED: referência do Azul Infinito permaneceu em server.ts.');
fs.writeFileSync(file, source);
console.log('Delivery optimized; Azul Infinito removed from production build.');
