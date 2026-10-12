// Offline recovery: never merges databases, promotes users or replaces an existing target.
import fs from 'node:fs';
import path from 'node:path';
import { validateDatabase, inspectDatabase } from './database-utils.mjs';
const [command, sourceArg, destArg, uploadsArg] = process.argv.slice(2);
try {
 if (!['inspect','restore'].includes(command) || !sourceArg) throw Error('Uso: node scripts/recover-data.mjs inspect CAMINHO/db.json\nou: node scripts/recover-data.mjs restore BACKUP/db.json DIRETORIO_NOVO [UPLOADS_ANTIGOS]');
 const source = path.resolve(sourceArg);
 const report = inspectDatabase(source);
 if (command === 'inspect') { console.log(JSON.stringify(report, null, 2)); }
 else {
  if (!destArg) throw Error('Informe um diretório novo para restauração.');
  const destination = path.resolve(destArg), file = path.join(destination, 'db.json');
  if (fs.existsSync(destination) && fs.readdirSync(destination).length) throw Error('Destino não está vazio. Nenhum banco existente será substituído. Use um diretório novo.');
  const bytes = fs.readFileSync(source); validateDatabase(JSON.parse(bytes.toString('utf8')));
  if (uploadsArg && !fs.statSync(path.resolve(uploadsArg)).isDirectory()) throw Error('Pasta de uploads inválida.');
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  // Media is copied before publishing db.json, so partial restores cannot start the server.
  if (uploadsArg) fs.cpSync(path.resolve(uploadsArg), path.join(destination, 'uploads'), { recursive: true, errorOnExist: true, force: false, dereference: false });
  fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ ...report, restoredTo: file, uploadsCopied: !!uploadsArg, next: 'Configure DATA_DIR para este diretório em disco persistente. Preserve o backup original e as variáveis JWT_SECRET/SyncPay.' }, null, 2));
 }
} catch (e) { console.error(e.message); process.exitCode = 1; }
