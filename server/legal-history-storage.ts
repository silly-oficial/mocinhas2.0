import fs from 'node:fs/promises';
import path from 'node:path';
import {CLOUD, cloudClient} from './cloud-store';
import {DATA_DIR} from './storage';
import type {LegalDocumentVersion} from '../shared/legal-documents';

export async function archiveLegalVersionFile(version: LegalDocumentVersion, content: string) {
  if (!/^[\w.-]{1,100}$/.test(version.id)) throw Error('Identificador de versão inválido.');
  if (CLOUD) {
    const {error} = await cloudClient().storage.from('mocinhas-media').upload(`legal-versions/documentos_${version.id}.json`, Buffer.from(content), {contentType:'application/json',upsert:false,cacheControl:'31536000'});
    if (error) throw Error('Não foi possível arquivar a versão dos documentos no Storage.');
    return;
  }
  const directory = path.join(DATA_DIR,'legal-versions');
  await fs.mkdir(directory,{recursive:true,mode:0o700});
  const filename = path.join(directory,`documentos_${version.id}.json`);
  const handle = await fs.open(filename,'wx',0o600);
  try {await handle.writeFile(content,'utf8'); await handle.sync();}
  catch (error) {await handle.close(); await fs.unlink(filename).catch(() => {}); throw error;}
  await handle.close();
}
