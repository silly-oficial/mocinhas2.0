import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';

const visualFile = /\.(?:jpe?g|png|webp|avif|gif|heic|heif|bmp|svg|tiff?|mp4|webm|mov|m4v|avi|mkv)(?:[?#].*)?$/i;
const visual = media => ['image','video','gif'].includes(media?.type) || visualFile.test(media?.url || '');
const removedFields = new Set(['age','ageMin','ageMax','birthDate','birthdate','dateOfBirth','idade','city','cidade','state','estado','location','localizacao','localização']);
const blockedStyle = value => /biqu[ií]ni|bikini|praia/i.test(value);
export function scrubPublishedMedia(input) {
  const data = structuredClone(input);
  const deletedPosts = new Set();
  data.posts = (data.posts || []).flatMap(post => {
    const media = (post.media || []).filter(item => !visual(item));
    if (!media.length) {deletedPosts.add(post.id);return [];}
    return [{...post,media:media.map(item => {const clean = {...item};delete clean.thumbnail;return clean;})}];
  });
  data.peopleProfiles = (data.peopleProfiles || []).map(profile => {
    const clean = {...profile,avatar:'/profile-placeholder.svg',cover:'',photos:[],videos:[]};
    for (const key of removedFields) delete clean[key];
    for (const key of ['tags','styles','styleTags']) if (Array.isArray(clean[key])) clean[key] = clean[key].filter(value => typeof value === 'string' && !blockedStyle(value));
    return clean;
  });
  data.users = (data.users || []).map(user => ({...user,avatar:'/profile-placeholder.svg',banner:''}));
  if (Array.isArray(data.stories)) data.stories = [];
  if (Array.isArray(data.storyViews)) data.storyViews = [];
  const deletedComments = new Set((data.comments || []).filter(row => deletedPosts.has(row.postId)).map(row => row.id));
  for (const key of ['likes','saves','comments']) if (Array.isArray(data[key])) data[key] = data[key].filter(row => !deletedPosts.has(row.postId));
  if (Array.isArray(data.commentLikes)) data.commentLikes = data.commentLikes.filter(row => !deletedComments.has(row.commentId));
  if (data.welcomeCarousel) data.welcomeCarousel = {...data.welcomeCarousel,slides:[]};
  if (data.blueLabLinks) data.blueLabLinks = {};
  if (Array.isArray(data.messages)) data.messages = data.messages.map(row => ['image','video','gif'].includes(row.mediaType) || visualFile.test(row.mediaUrl || '') ? {...row,mediaUrl:'',mediaType:undefined,text:row.text || '[Mídia removida]'} : row);
  if (Array.isArray(data.notifications)) data.notifications = data.notifications.map(row => ({...row,targetThumbnail:''}));
  if (Array.isArray(data.conversations)) data.conversations = data.conversations.map(row => ({...row,avatar:''}));
  // Public legal history, authorization documents, accounts and payment records are preserved.
  return data;
}
async function listFiles(directory) {
  const entries = await fs.readdir(directory,{withFileTypes:true}).catch(error => {if (error.code === 'ENOENT') return [];throw error;});
  const paths = [];
  for (const entry of entries) {
    const filename = path.join(directory,entry.name);
    if (entry.isSymbolicLink()) throw Error('Link simbólico no diretório de uploads; operação interrompida.');
    if (entry.isDirectory()) paths.push(...await listFiles(filename));
    else if (entry.isFile()) paths.push(filename);
  }
  return paths;
}
async function rewrite(filename,data) {
  const temporary = filename + '.purge.tmp';
  const handle = await fs.open(temporary,'w',0o600);
  try {await handle.writeFile(JSON.stringify(data,null,2));await handle.sync();} finally {await handle.close();}
  await fs.rename(temporary,filename);
}
export async function purgeLocal(directory,apply = false) {
  if (!path.isAbsolute(directory)) throw Error('DATA_DIR precisa ser absoluto.');
  const current = path.join(directory,'db.json');
  const snapshots = [current,...(await listFiles(path.join(directory,'backups'))).filter(filename => filename.endsWith('.json'))];
  const updates = [];
  for (const filename of snapshots) {
    const data = JSON.parse(await fs.readFile(filename,'utf8'));
    if (!Array.isArray(data.users) || !Array.isArray(data.posts)) throw Error('Snapshot inválido; nenhuma remoção foi iniciada.');
    updates.push([filename,scrubPublishedMedia(data)]);
  }
  const files = (await listFiles(path.join(directory,'uploads'))).filter(filename => visualFile.test(filename));
  if (apply) {
    for (const [filename,data] of updates) await rewrite(filename,data);
    for (const filename of files) await fs.unlink(filename);
  }
  return {applied:apply,snapshots:snapshots.length,mediaFiles:files.length};
}
async function checked(result,operation) {const value = await result;if (value.error) throw Error(operation + ': ' + value.error.message);return value.data;}
export async function purgeSupabase(client,apply = false) {
  const row = await checked(client.from('mocinhas_app_state').select('id,revision,payload').eq('id','main').single(),'Ler estado');
  const backups = [];
  for (let offset=0;;offset+=100) {
    const page = await checked(client.from('mocinhas_app_backups').select('id,payload').order('id').range(offset,offset+99),'Ler backups');
    backups.push(...page);if (page.length<100) break;
  }
  const bucket = client.storage.from('mocinhas-media');
  const files = [];
  async function scan(prefix = '') {
    if (['static','legal-versions'].includes(prefix.split('/')[0])) return;
    for (let offset=0;;offset+=100) {
      const page = await checked(bucket.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}}),'Listar storage');
      for (const item of page) {
        const key = prefix ? prefix+'/'+item.name : item.name;
        if (!item.id) await scan(key);else if (visualFile.test(key) || /^(image|video)\//.test(item.metadata?.mimetype || '')) files.push(key);
      }
      if (page.length<100) break;
    }
  }
  await scan();
  const current = scrubPublishedMedia(row.payload);
  const mediaFiles = files.length;
  if (apply) {
    // Direct CAS avoids the normal commit RPC creating another copy of the removed media.
    const written = await checked(client.from('mocinhas_app_state').update({payload:current,revision:row.revision+1,updated_at:new Date().toISOString()}).eq('id','main').eq('revision',row.revision).select('id'),'Limpar estado');
    if (written.length !== 1) throw Error('Conflito de revisão: mantenha o app parado e tente novamente.');
    for (const backup of backups) {
      const written = await checked(client.from('mocinhas_app_backups').update({payload:scrubPublishedMedia(backup.payload)}).eq('id',backup.id).select('id,payload'),'Limpar backup');
      if (written.length !== 1) throw Error('Backup não foi atualizado.');
      if (JSON.stringify(scrubPublishedMedia(written[0].payload)) !== JSON.stringify(written[0].payload)) throw Error('Backup ainda contém referências de mídia.');
    }
    for (let index=0;index<files.length;index+=100) await checked(bucket.remove(files.slice(index,index+100)),'Apagar arquivos');
    const verified = await checked(client.from('mocinhas_app_state').select('payload').eq('id','main').single(),'Conferir estado');
    if (JSON.stringify(scrubPublishedMedia(verified.payload)) !== JSON.stringify(verified.payload)) throw Error('A conferência encontrou referências pendentes.');
    files.length = 0;await scan();
    if (files.length) throw Error('Ainda existem arquivos de mídia no storage.');
  }
  return {applied:apply,snapshots:backups.length+1,mediaFiles};
}
async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.PURGE_SITE_STOPPED !== '1') throw Error('Pare a instância do Mocinhas antes de apagar. Depois defina PURGE_SITE_STOPPED=1.');
  if (process.env.PURGE_TARGET !== 'silly-oficial/mocinhas2.0') throw Error('Defina PURGE_TARGET=silly-oficial/mocinhas2.0 para identificar o projeto.');
  let result;
  if (process.env.STORAGE_BACKEND === 'supabase') {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Configure as credenciais somente no ambiente seguro do servidor.');
    result = await purgeSupabase(createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),apply);
  } else result = await purgeLocal(process.env.DATA_DIR || '',apply);
  console.log(JSON.stringify(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => {console.error(error.message);process.exitCode=1;});
