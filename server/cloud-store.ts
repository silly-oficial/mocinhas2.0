import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { validateDatabase } from '../scripts/database-utils.mjs';
import { cloudReadFailure } from './cloud-diagnostics';
export const CLOUD = process.env.STORAGE_BACKEND === 'supabase';
const bucket = 'mocinhas-media';
let revision = -1;
let pending: string | null = null;
let running: Promise<void> | null = null;
let failed: Error | null = null;
let client: SupabaseClient<any> | null = null;
export function cloudClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw Error('SUPABASE_CONFIG_REQUIRED: configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente no servidor.');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) } });
  return client;
}
async function getRow() {
 const { data, error, status } = await cloudClient().from('mocinhas_app_state').select('payload,revision').eq('id','main').maybeSingle();
 if (error) throw Error(cloudReadFailure(status, error));
 return data;
}
export async function initializeCloud() {
 let row = await getRow();
 if (!row) {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12) throw Error('INITIAL_ADMIN_REQUIRED: banco novo. Configure INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD (mínimo 12 caracteres) para criar o primeiro administrador. Nenhuma conta de exemplo será criada.');
  const payload: any = Object.fromEntries(['users','posts','likes','saves','comments','commentLikes','follows','stories','storyViews','conversations','messages','notifications','reports','blocks','mutes','paymentCharges'].map(k=>[k,[]]));
  payload.authSecret=randomBytes(48).toString('hex'); payload.engagementRestored=true;
  payload.users=[{id:'u_'+randomUUID(),username:'admin',email,displayName:'Administrador',passwordHash:bcrypt.hashSync(password,12),isAdmin:true,isPrivate:false,isVerified:true,avatar:'/profile-placeholder.svg',createdAt:new Date().toISOString()}];
  const { error } = await cloudClient().from('mocinhas_app_state').insert({id:'main',revision:0,payload});
  if (error && error.code !== '23505') throw Error('SUPABASE_INITIALIZATION_FAILED: não foi possível criar o banco. Não há fallback local.');
  // Re-read the winning insert if two deployments initialize concurrently.
  row=await getRow();
 }
 if (!row) throw Error('SUPABASE_DATABASE_MISSING');
 validateDatabase(row.payload); revision=Number(row.revision);
 if (!Number.isSafeInteger(revision) || revision<0) throw Error('Invalid database revision');
 return row.payload;
}
async function commit(serialized: string) {
 const { data, error } = await cloudClient().rpc('mocinhas_commit_state',{expected_revision:revision,next_payload:JSON.parse(serialized)});
 if (error || !Number.isSafeInteger(Number(data)) || Number(data)!==revision+1) throw Error('SUPABASE_COMMIT_FAILED: gravação não confirmada ou outra instância alterou o banco. Reinicie esta instância para recarregar a versão remota.');
 revision=Number(data);
}
export function queueCloud(data: unknown) {
 if (!CLOUD) return;
 if (failed) throw failed;
 pending=JSON.stringify(validateDatabase(data));
 if (!running) {
  running=(async()=>{while(pending!==null){const value=pending;pending=null;await commit(value);}})().catch(error=>{failed=error instanceof Error?error:Error('Persistence failed');pending=null;}).finally(()=>{running=null;});
 }
}
export async function flushCloud() {
 if (!CLOUD) return;
 while (running) await running;
 if (failed) throw failed;
}
export function assertCloudHealthy() { if (failed) throw failed; }
export const cloudRevision = () => revision;
export async function uploadCloud(name: string, bytes: Buffer, contentType: string) {
 const {error}=await cloudClient().storage.from(bucket).upload(name,bytes,{contentType,upsert:false,cacheControl:'0'});
 if(error)throw Error('Não foi possível salvar a mídia no Supabase. Confira o bucket privado mocinhas-media e o limite de tamanho.');
 return `/uploads/${encodeURIComponent(name)}`;
}
export async function signedMedia(name: string) {
 if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('Invalid media name');
 const {data,error}=await cloudClient().storage.from(bucket).createSignedUrl(name,20);
 if(error||!data?.signedUrl)throw Error('Media unavailable');
 return data.signedUrl;
}
