import {directorySettings} from './directory-settings';
import type express from 'express';
import {createHash, randomUUID} from 'node:crypto';
import type {DB} from './db';
import {legalDocuments, legalNotice, type LegalDocumentVersion} from '../shared/legal-documents';

export const serializeLegalVersion = (version: LegalDocumentVersion) => JSON.stringify(version, null, 2) + '\n';
export function publicContactEmail() {
  const value = process.env.CONTACT_EMAIL?.trim() || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
}
type ArchiveWriter = (version: LegalDocumentVersion, content: string) => Promise<void>;
export async function recordLegalVersion(db: typeof DB, archive: ArchiveWriter, options: {now?: Date; documents?: LegalDocumentVersion['documents']; contactEmail?: string; commit?: string} = {}) {
  const documents = options.documents || legalDocuments;
  const contactEmail = options.contactEmail ?? db.get().directorySettings?.contactEmail ?? publicContactEmail();
  const publicSettings=directorySettings(db);
  const digest = createHash('sha256').update(JSON.stringify({documents,notice:legalNotice,contactEmail,publicSettings})).digest('hex');
  const rows = db.get().legalDocumentVersions || [];
  const latest = rows.at(-1);
  // Restarts and redeploys with identical documents are not new document versions.
  if (latest?.digest === digest) return latest;
  const recordedAt = (options.now || new Date()).toISOString();
  const revision = options.commit ?? process.env.RENDER_GIT_COMMIT ?? '';
  const version: LegalDocumentVersion = {
    id: `${recordedAt.replace(/[:.]/g, '-')}_${digest.slice(0,12)}_${randomUUID().slice(0,8)}`,
    recordedAt,digest,publicSettings, ...(/^[a-f0-9]{40}$/i.test(revision) ? {commit:revision} : {}),
    contactEmail, notice: legalNotice, documents: JSON.parse(JSON.stringify(documents)),
  };
  // The dated file must be durable before adding its record to the database.
  await archive(version, serializeLegalVersion(version));
  const before = db.get().legalDocumentVersions;
  db.get().legalDocumentVersions = [...rows, version];
  try {db.save();} catch (error) {db.get().legalDocumentVersions = before; throw error;}
  return version;
}
export function installLegalHistory(app: express.Express, db: typeof DB) {
  const rows = () => db.get().legalDocumentVersions || [];
  const summary = ({id, recordedAt, digest, commit}: LegalDocumentVersion) => ({id, recordedAt, digest, ...(commit ? {commit} : {})});
  app.get('/api/legal-history', (req, res) => {
    const page = Math.max(0, Math.min(100000, Number(req.query.page) || 0) | 0);
    const all = rows();
    res.set('Cache-Control','no-store').json({current: all.length ? summary(all.at(-1)!) : null, versions: [...all].reverse().slice(page*20,(page+1)*20).map(summary), total:all.length});
  });
  app.get('/api/legal-history/:id/file', (req, res) => {
    const version = rows().find(row => row.id === req.params.id);
    if (!version) return res.status(404).json({error:'Versão não encontrada.'});
    res.set('Cache-Control','public, max-age=31536000, immutable').attachment(`documentos_${version.id}.json`).type('application/json').send(serializeLegalVersion(version));
  });
  app.get('/api/legal-history/:id', (req, res) => {
    const version = rows().find(row => row.id === req.params.id);
    if (!version) return res.status(404).json({error:'Versão não encontrada.'});
    res.set('Cache-Control','public, max-age=31536000, immutable').json({version});
  });
}

