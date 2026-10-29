import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import type {DB,DatabaseSchema} from '../server/db';
import {validatePerson,installPeople,refreshProfileAges} from '../server/people';
import {installVerification} from '../server/verification';
import {installDirectoryRequests} from '../server/directory-requests';
import {ageValues,ageLabel,availabilityHistory} from '../shared/profile-editorial';
import {requestDeadline} from '../shared/request-deadline';
import {retainAccessLogs} from '../server/access-log';
import {setSession,sessionToken,protectCookieWrites} from '../server/session-security';
const person={name:'Criadora',username:'criadora',bio:'',avatar:'',cover:'',photos:[],videos:[],socials:{tiktok:'criadora',instagram:'',pinterest:''},tags:[],published:true,featured:false,order:0,birthYear:2010,ageSource:'declarado_pelo_perfil',rankingCriteria:'Arte e educação.',guardianName:'Privado',guardianRelation:'Responsável',guardianEmail:'private@example.invalid'};
for(const birthYear of [1899,3000,2010.5,'2010'])assert.throws(()=>validatePerson({...person,birthYear}));
assert.throws(()=>validatePerson({...person,birthYear:null,ageBand:'desconhecido'}));
const draft=validatePerson(person);assert.equal(draft.guardianStatus,'sem_contato');assert.equal(draft.guardianAuthorized,false);assert.equal(draft.ownershipVerified,false);
assert.equal(ageValues(2014,'desconhecido',new Date('2026-01-01')).ageBand,'adolescente');assert.equal(ageValues(2008,'desconhecido',new Date('2026-01-01')).ageBand,'adulto');assert.match(ageLabel({birthYear:null,ageBand:'adolescente'}),/12 a 17/);assert.match(ageLabel({birthYear:2010},new Date('2026-10-01')),/15 a 16/);
const state:DatabaseSchema={users:[],posts:[],likes:[],saves:[],comments:[],commentLikes:[],follows:[],stories:[],storyViews:[],conversations:[],messages:[],notifications:[],reports:[],blocks:[],mutes:[],peopleProfiles:[{...draft,birthYear:2008,ageBand:'adolescente',ageUpdatedAt:'2025-01-01T00:00:00Z'}]};
let fail=false;const db={get:()=>state,save:()=>{if(fail)throw Error('fixture');}} as unknown as typeof DB;
refreshProfileAges(db,new Date('2026-01-01'));assert.equal(state.peopleProfiles![0].ageBand,'adulto');assert.equal(state.legalAudit?.at(-1)?.field,'ageBand');
const app=express();app.use(express.json());app.use(protectCookieWrites);
const admin:express.RequestHandler=(req,res,next)=>{if(req.get('authorization')!=='Bearer admin'){res.status(403).json({error:'admin'});return;}(req as express.Request&{userId:string}).userId='reviewer';next();};
installPeople(app,db,admin);installVerification(app,db,admin);installDirectoryRequests(app,db,admin);
app.get('/cookie',(_req,res)=>{setSession(res,'fixture-token');res.json({ok:true});});app.post('/cookie',(req,res)=>res.json({token:sessionToken(req)}));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error();const base='http://127.0.0.1:'+address.port;
async function call(route:string,method='GET',body?:unknown,authorized=false){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer admin'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data:Record<string,unknown>=await response.json();return {response,data};}
try{
 const publicPeople=await call('/api/people');const text=JSON.stringify(publicPeople.data);assert.ok(!text.includes('private@example.invalid'));assert.ok(!text.includes('guardianName'));assert.ok(!text.includes('guardianRelation'));assert.ok(!text.includes('sourceSnapshot'));
 const profile=state.peopleProfiles![0];state.verificationRequests=[{id:'own',requestId:'request-own',profileId:profile.id,requesterName:'Test',requesterEmail:'test@example.invalid',handle:'criadora',purpose:'ownership',status:'em_analise',termDocUrl:'',notes:'',createdAt:new Date().toISOString()},{id:'guardian',requestId:'request-guardian',profileId:profile.id,requesterName:'Test',requesterEmail:'test@example.invalid',handle:'criadora',purpose:'guardian',status:'em_analise',termDocUrl:'',notes:'',createdAt:new Date().toISOString()}];
 assert.equal((await call('/api/admin/verification-requests/own','PATCH',{status:'aprovado',profileId:profile.id,representationConfirmed:true},true)).response.status,200);assert.equal(state.peopleProfiles![0].ownershipVerified,true);assert.notEqual(state.peopleProfiles![0].guardianAuthorized,true);
 assert.equal((await call('/api/admin/verification-requests/guardian','PATCH',{status:'aprovado',profileId:profile.id,representationConfirmed:true},true)).response.status,400);
 assert.equal((await call('/api/admin/verification-requests/guardian','PATCH',{status:'aprovado',profileId:profile.id,representationConfirmed:true,termDocUrl:'https://example.invalid/term'},true)).response.status,200);assert.equal(state.peopleProfiles![0].guardianAuthorized,true);
 assert.equal(validatePerson({...state.peopleProfiles![0],birthYear:2011},state.peopleProfiles![0]).guardianAuthorized,false);
 assert.equal(validatePerson({...state.peopleProfiles![0],socials:{...profile.socials,tiktok:'different.creator'}},state.peopleProfiles![0]).ownershipVerified,false);
 const snapshotInput={url:'https://www.tiktok.com/@criadora/photo/7421111111111111111',kind:'photo',imageIndex:0};
 const updated=validatePerson({...state.peopleProfiles![0],name:'Nome corrigido'},state.peopleProfiles![0]);assert.equal(updated.guardianAuthorized,false);assert.equal(updated.ownershipVerified,false);assert.equal(updated.identityRevision,1);
 const corrected=await call('/api/admin/people/'+profile.id,'PUT',{...state.peopleProfiles![0],name:'Nome corrigido',avatarSelection:snapshotInput},true);assert.equal(corrected.response.status,200);assert.equal(state.peopleProfiles![0].guardianAuthorized,false);assert.ok(state.legalAudit?.some(row=>row.field==='name'));assert.ok(state.verificationRequests?.every(row=>row.status==='revogado'),'identity changes also revoke old approval records so they cannot be reused');
 const originalSnapshot=JSON.stringify(state.peopleProfiles![0].sourceSnapshot);assert.ok(state.sourceSnapshots?.length);
 const preserved=await call('/api/admin/people/'+profile.id,'PUT',{...state.peopleProfiles![0],sourceSnapshot:{capturedAt:'fake',canonicalUrl:'fake'}},true);assert.equal(preserved.response.status,200);assert.equal(JSON.stringify(state.peopleProfiles![0].sourceSnapshot),originalSnapshot);
 const request={responsibleName:'Titular',email:'title@example.invalid',handle:'criadora',type:'contestar_classificacao',observations:'',documentUrl:''};
 const created=await call('/api/directory-requests','POST',request);assert.equal(created.response.status,201);const id=String(created.data.id),key=String(created.data.accessToken);
 assert.ok(!JSON.stringify(state.directoryRequests).includes(key));assert.equal((await call('/api/directory-requests/'+id+'/access','POST',{accessToken:'0'.repeat(48)})).response.status,404);
 assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'resolved',publicResult:'Classificação alterada.'},true)).response.status,400);
 assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'reviewing'},true)).response.status,200);
 const basis='Após analisar a publicação e a descrição, a curadoria corrigiu a classificação informada para adequar o aviso ao conteúdo.';
 assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'resolved',publicResult:'Classificação corrigida no aviso público.',fundamentacao:basis},true)).response.status,200);
 const access=await call('/api/directory-requests/'+id+'/access','POST',{accessToken:key});assert.equal(access.data.fundamentacao,basis);assert.ok(!JSON.stringify(access.data).includes(request.email));
 const reopened=await call('/api/directory-requests/'+id+'/reopen','POST',{accessToken:key,responsibleName:'Titular',email:request.email,observations:'Discordo e peço nova análise.'});assert.equal(reopened.response.status,200);assert.equal(state.directoryRequests?.find(row=>row.id===id)?.replies?.length,1);
 fail=true;assert.equal((await call('/api/admin/directory-requests/'+id+'/unpublish','POST',{profileId:profile.id},true)).response.status,503);fail=false;assert.equal(state.peopleProfiles![0].published,true);
 const cookie=await fetch(base+'/cookie');assert.match(cookie.headers.get('set-cookie')||'',/HttpOnly/);assert.match(cookie.headers.get('set-cookie')||'',/SameSite=Lax/);
 const denied=await fetch(base+'/cookie',{method:'POST',headers:{cookie:'mocinhas_session=fixture-token',Origin:'https://other.invalid'}});assert.equal(denied.status,403);
 const publicCriteria=await call('/api/directory-editorial');assert.equal(publicCriteria.response.status,200);assert.ok(!JSON.stringify(publicCriteria.data).includes('guardian'));
 const persisted:DatabaseSchema=JSON.parse(JSON.stringify(state));assert.equal(persisted.legalAudit?.length,state.legalAudit?.length);assert.equal(persisted.directoryRequests?.[0].replies?.length,1);
 assert.equal((await call('/api/admin/people/'+profile.id,'DELETE',undefined,true)).response.status,200);assert.equal(state.sourceSnapshots?.length,1,'deleting a profile preserves the first source record');
}finally{server.close();server.closeAllConnections();}
assert.equal(requestDeadline('remover_conteudo',new Date('2026-10-23T15:00:00Z')),'2026-10-27T15:00:00.000Z');
assert.equal(retainAccessLogs([{at:'2025-01-01',ip:'',userAgent:'',method:'GET',path:'/',status:200}],new Date('2026-10-01')).length,0);
console.log('Editorial completion passed: age validation and maintenance, private fields, independent badges and invalidation, contest/reopening with private key, atomic withdrawal, cookie protections and persisted records.');

assert.equal(availabilityHistory(Array.from({length:100},(_,n)=>({checkedAt:new Date(2026,0,n+1).toISOString(),available:true}))).length,50);
assert.equal(availabilityHistory([{checkedAt:'2026-01-01T00:00:00Z',available:true},{checkedAt:'2026-02-01T00:00:00Z',available:false}])[0].available,false);
assert.equal(requestDeadline('remover_conteudo',new Date('2026-10-24T16:30:00Z')),'2026-10-28T03:00:00.000Z','weekend submissions begin the business clock at Monday midnight in Belém');

const {validateDatabase}=await import('../scripts/database-utils.mjs');
assert.doesNotThrow(()=>validateDatabase(JSON.parse(JSON.stringify(state))));
assert.throws(()=>validateDatabase({...state,peopleProfiles:[{...draft,birthYear:'2010'}]}));
const fs=await import('node:fs');
const sql=fs.readFileSync('supabase_schema.sql','utf8');
assert.match(sql,/REVOKE ALL ON public\.%I FROM anon, authenticated/);assert.match(sql,/GRANT SELECT ON public\.categories, public\.app_settings TO anon, authenticated/);assert.ok(!sql.includes('CREATE POLICY "Permitir_'),'permissive legacy policy generator must not return');
const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
const {HowItWorksPage}=await import('../src/components/DirectoryInformation');
const how=renderToStaticMarkup(React.createElement(HowItWorksPage));assert.equal((how.match(/<h2>/g)||[]).length,8);for(const text of ['subjetiv','votação','player oficial','classificação','idade','selos','/pais'])assert.ok(how.includes(text));
const {CreatorCredit}=await import('../src/components/CreatorCredit');
const ownershipMarkup=renderToStaticMarkup(React.createElement(CreatorCredit,{person:{...draft,ownershipVerified:true,guardianAuthorized:false}}));assert.match(ownershipMarkup,/Titularidade do TikTok verificada/);assert.ok(!ownershipMarkup.includes('Autorizado pelo responsável'));
const guardianMarkup=renderToStaticMarkup(React.createElement(CreatorCredit,{person:{...draft,ownershipVerified:false,guardianAuthorized:true}}));assert.match(guardianMarkup,/Autorização documentada do responsável/);assert.ok(!guardianMarkup.includes('Titularidade do TikTok verificada'));
const {legalDocuments}=await import('../shared/legal-documents');const privacy=JSON.stringify(legalDocuments.privacy);for(const text of ['Supabase','Render','Resend','art. 33','art. 18','encarregado','seis meses','90 dias','180 dias','perfilamento','7º, IX'])assert.ok(privacy.includes(text),text);
assert.match(JSON.stringify(legalDocuments.terms),/foro competente/);assert.match(JSON.stringify(legalDocuments.parents),/48 horas úteis/);
console.log('Public information structure and SQL policy source checks passed. No live SQL execution or visual/device verification claimed.');

assert.ok(sql.includes("VALUES ('mocinhas-media', 'mocinhas-media', false)"));assert.ok(sql.includes('DROP POLICY IF EXISTS "Public Access Mocinhas"'));

const {ProfileVideoGrid}=await import('../src/components/ProfileVideos');
const unavailable=renderToStaticMarkup(React.createElement(ProfileVideoGrid,{items:[{person:draft,index:0,video:{url:'https://www.tiktok.com/@criadora/video/7421111111111111111',title:'',kind:'social',is_still_available:false}}],onProfile:()=>{}}));assert.match(unavailable,/Indisponível na origem/);

const unrelated=renderToStaticMarkup(React.createElement(CreatorCredit,{person:{...draft,ownershipVerified:true,guardianAuthorized:true},handle:'other.creator'}));assert.ok(!unrelated.includes('Autorizado pelo responsável'));assert.ok(!unrelated.includes('Titularidade do TikTok verificada'));

// Origins must remain visible even without a birth year; none implies verified age.
for(const [ageSource,expected] of [['estimado','Estimativa editorial'],['declarado_por_responsavel','Informada pelo responsável'],['declarado_pelo_perfil','Informada pelo perfil'],['desconhecido','Origem da idade desconhecida']] as const){
 for(const birthYear of [2010,null]){
  const label=ageLabel({birthYear,ageBand:'adolescente',ageSource},new Date('2026-10-01'));
  assert.ok(label.startsWith(expected));assert.match(label,/sem (comprovação|verificação)/);
  assert.match(label,birthYear===null?/12 a 17/:/15 a 16/);
 }
}
const {DirectoryRating,DirectoryEntryNotice}=await import('../src/components/DirectoryInformation');
for(const Component of [DirectoryRating,DirectoryEntryNotice]){
 const markup=renderToStaticMarkup(React.createElement(Component));
 assert.match(markup,/não é certificação oficial do Ministério da Justiça/);
 assert.match(markup,/trajes de banho/);assert.match(markup,/decotes/);
}
assert.match(fs.readFileSync('src/components/DirectoryInformation.tsx','utf8'),/mocinhas-editorial-notice-v2/);
assert.match(privacy,/§3º/);assert.match(privacy,/§4º/);
for(const fragment of ['mocinhas_app_state','mocinhas_app_backups','has_table_privilege','has_function_privilege','pg_policies','browser_can_execute'])assert.ok(sql.includes(fragment),fragment);
const {directorySettings}=await import('../server/directory-settings');
const custom='Descrição configurada pela administração.';
assert.equal(directorySettings({get:()=>({directorySettings:{ageRatingNote:custom}})} as unknown as typeof DB).ageRatingNote,custom);
console.log('Age origin notices, classification disclaimers, preserved custom settings and SQL verification source passed.');
