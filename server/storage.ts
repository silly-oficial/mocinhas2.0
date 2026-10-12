import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateDatabase, inspectDatabase } from '../scripts/database-utils.mjs';
const production = process.env.NODE_ENV === 'production';
const configured = process.env.DATA_DIR?.trim();
if (production && (!configured || !path.isAbsolute(configured))) throw Error('STORAGE_CONFIG_REQUIRED: configure DATA_DIR absoluto em disco persistente e restaure o banco antes de iniciar. O banco do repositório não será usado em produção.');
export const DATA_DIR = path.resolve(configured || path.join(process.cwd(), 'data'));
const relative = path.relative(process.cwd(), DATA_DIR);
if (production && (!relative || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)))) throw Error('STORAGE_UNSAFE_PATH: DATA_DIR deve ficar fora do diretório do código para não ser substituído em deploys.');
export const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
let lastBackup = 0;
export function snapshotDatabase() {
  if (!fs.existsSync(DB_FILE)) return;
  validateDatabase(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  fs.mkdirSync(BACKUPS_DIR, { recursive: true, mode: 0o700 });
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`;
  fs.copyFileSync(DB_FILE, path.join(BACKUPS_DIR, name), fs.constants.COPYFILE_EXCL);
  fs.chmodSync(path.join(BACKUPS_DIR, name), 0o600);
  lastBackup = Date.now();
  // Retain snapshots from at least the last 7 days. Only our timestamped snapshots are eligible.
  const cutoff = Date.now() - 7 * 86400000;
  for (const item of fs.readdirSync(BACKUPS_DIR).filter(n => /^\d{4}-\d{2}-\d{2}T.*\.json$/.test(n))) {
    const file = path.join(BACKUPS_DIR, item);
    if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
  }
}
export function writeDatabase(data: unknown) {
  validateDatabase(data);
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  if (Date.now() - lastBackup >= 5 * 60000) snapshotDatabase();
  const temp = `${DB_FILE}.${process.pid}.${randomUUID()}.tmp`;
  let fd: number | undefined;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, JSON.stringify(data, null, 2), 'utf8');
    fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, DB_FILE);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
export function readDatabase() {
  if (!fs.existsSync(DB_FILE)) throw Error(`STORAGE_DATABASE_MISSING: ${DB_FILE}. Inicialização interrompida para não criar um banco vazio. Use scripts/recover-data.mjs com um backup conferido.`);
  try { const data = validateDatabase(JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); snapshotDatabase(); return data; }
  catch (error) { throw Error(`STORAGE_DATABASE_UNREADABLE: ${DB_FILE}. Original preservado; restauração automática desativada. ${String(error)}`); }
}
export function storageDiagnostics() {
  const current = inspectDatabase(DB_FILE);
  const backups = fs.existsSync(BACKUPS_DIR) ? fs.readdirSync(BACKUPS_DIR).filter(n => n.endsWith('.json')).sort() : [];
  return { ...current, backend: 'local-json', dataDirectory: DATA_DIR, uploadsDirectory: UPLOADS_DIR, configuredDirectory: !!configured, backups: backups.length, latestBackup: backups.at(-1) || null, persistenceNote: 'DATA_DIR precisa estar em um disco persistente real da hospedagem. Definir a variável não cria esse disco.' };
}
