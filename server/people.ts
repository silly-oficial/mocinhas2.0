import {profileUpload,ensureProfileUpload} from './profile-uploads';
import {editorialFields,ageValues,availabilityHistory,profilePublishable} from '../shared/profile-editorial';
import {appendLegalAudit} from './legal-audit';
import {validatePostPresentation} from '../shared/post-presentation';
import {optionalTikTokPreview} from './tiktok-preview';
import {resolveTikTokLink} from './tiktok-link';
import {resolveTikTokIdentity} from './tiktok-identity';
import {validateProfileAvatar} from '../shared/profile-avatar';
import type express from 'express';
import {randomUUID} from 'node:crypto';
import {makeTikTokResolver} from './tiktok-oembed';
import {uploadedMediaOrigin} from './media-origin';
import {isProfileVerified} from './verification';
import type {DB} from './db';
import {categoryKey,socialVideo,tiktokPost, type PersonProfile} from '../shared/people';
function text(value:unknown,max:number) { if(typeof value!=='string'||value.length>max)throw Error(`Texto inválido (máximo ${max} caracteres).`);return value.trim(); }
function image(value:unknown) {
 const s=text(value,2048);if(!s)return '';
 if(/^\/uploads\/[a-zA-Z0-9_.%-]+\.(jpe?g|png|gif|webp|avif)$/i.test(s))return s;
 try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}
 throw Error('Use uma foto enviada pelo painel ou um link https.');
}
export function validatePerson(input:any, existing?:PersonProfile):PersonProfile {
 if(!input||typeof input!=='object')throw Error('Perfil inválido.');
 const name=text(input.name,80),username=text(input.username,40).replace(/^@/,'').toLowerCase();
 if(!name||! /^[a-z0-9_][a-z0-9_.-]{1,39}$/.test(username))throw Error('Informe um nome e um @usuário de 2 a 40 caracteres, sem espaços.');
 const legacyImage=(value:unknown,previous?:string)=>{const url=text(value??'',2048);if(!url||url==='/profile-placeholder.svg')return url;if(url===previous||profileUpload(url,'image'))return url;throw Error('Envie a imagem pelo painel ou use uma publicação do TikTok.');};
 const avatar=legacyImage(input.avatar,existing?.avatar)||'/profile-placeholder.svg';
 if(!Array.isArray(input.photos)||!Array.isArray(input.videos)||input.videos.length>30||!Array.isArray(input.tags)||input.tags.length>8)throw Error('Limite: 30 vídeos e 8 categorias.');
 if(typeof input.published!=='boolean'||typeof input.featured!=='boolean'||!Number.isInteger(input.order)||input.order<0||input.order>9999)throw Error('Configuração de publicação ou ordem inválida.');
 const socials={} as PersonProfile['socials'];for(const platform of ['tiktok','instagram','pinterest'] as const){const handle=text(input.socials?.[platform]??'',60).replace(/^@/,'');if(handle&&!/^[a-zA-Z0-9_.]{1,60}$/.test(handle))throw Error(`Informe somente o @ de ${platform}, sem o link.`);socials[platform]=handle;}
 const linkedSource=input.avatarSelection?.url||input.videos.find((v:any)=>v?.kind!=='upload'&&typeof v?.url==='string')?.url;
 if(linkedSource){try{socials.tiktok=new URL(tiktokPost(linkedSource).canonical).pathname.split('/')[1].slice(1);}catch{/* Legacy entries preserve their known handle. */}}
 for(const url of [input.avatarSelection?.url,...input.videos.filter((v:any)=>v.kind!=='upload').map((v:any)=>v.url)].filter(Boolean)){
  const handle=new URL(tiktokPost(url).canonical).pathname.split('/')[1].slice(1);
  if(handle.toLowerCase()!==socials.tiktok.toLowerCase())throw Error('Todas as publicações e o avatar devem pertencer ao mesmo criador.');
 }
 const cleanTags = new Map<string,string>();for(const raw of input.tags){const label=text(raw,30).replace(/\s+/g,' ');if(label&&!cleanTags.has(categoryKey(label)))cleanTags.set(categoryKey(label),label);}
 const now=new Date().toISOString();const editorial=editorialFields(input,existing);
 const reviewChanged=!!existing&&(existing.name!==name||existing.socials.tiktok!==socials.tiktok||JSON.stringify(existing.videos.map(v=>v.url))!==JSON.stringify(input.videos.map((v:any)=>v.url))||existing.avatarSelection?.url!==input.avatarSelection?.url||existing.avatar!==input.avatar||existing.cover!==input.cover||JSON.stringify(existing.photos)!==JSON.stringify(input.photos));
 if(editorial.subjectType!=='animal'&&reviewChanged&&input.adultReview?.contentReviewed!==true){editorial.adultReview={evidenceUrl:editorial.adultReview?.evidenceUrl||'',contentReviewed:false};if(input.published)throw Error('Revise a maioridade após alterar a identidade ou as mídias.');}
 const identityChanged=!!existing&&(existing.birthYear!==editorial.birthYear&&!(existing.birthYear===undefined&&editorial.birthYear===null)||existing.name!==name||existing.socials.tiktok.toLowerCase()!==socials.tiktok.toLowerCase());
 if(identityChanged){editorial.identityRevision++;editorial.ownershipVerified=false;editorial.guardianAuthorized=false;editorial.guardianStatus='sem_contato';}
 return {...editorial,id:existing?.id||randomUUID(),name,username,avatarSelection:validateProfileAvatar(input.avatarSelection),avatar,cover:legacyImage(input.cover,existing?.cover),bio:text(input.bio??'',1500),photos:input.photos.map((url:unknown)=>{if(typeof url!=='string'||(!existing?.photos.includes(url)&&!profileUpload(url,'image')))throw Error('Envie a foto pelo painel.');return url;}),videos:input.videos.map((v:any)=>{const url=text(v?.url,2048),title=text(v?.title??'',100);const previous=existing?.videos.find(old=>old.url===url);if(previous)return {...previous,title,presentation:validatePostPresentation(v.presentation,url)};if(v.kind==='upload'&&profileUpload(url,'video'))return {url,title,kind:'upload' as const};const source=tiktokPost(url);return {url:source.canonical,title,kind:'social' as const,presentation:validatePostPresentation(v.presentation,source.canonical)};}),tags:[...cleanTags.values()],socials,published:input.published,featured:input.featured,order:input.order,createdAt:existing?.createdAt||now,updatedAt:now};
}
export function installPeople(app:express.Express,db:typeof DB,admin:express.RequestHandler){
 const all=()=>db.get().peopleProfiles||[];
 const visible=(p:PersonProfile)=>p.published&&profilePublishable(p)&&p.photos.every(url=>profileUpload(url,'image'))&&(!p.cover||profileUpload(p.cover,'image'))&&(!!p.avatarSelection||!p.avatar||p.avatar==='/profile-placeholder.svg'||profileUpload(p.avatar,'image'))&&p.videos.every(v=>v.kind==='upload'?profileUpload(v.url,'video'):v.kind==='social'&&v.display_mode==='embed'&&v.source_platform==='tiktok');
 const resolveTikTok=makeTikTokResolver(db);
 app.post('/api/admin/tiktok-identity',admin,async(req,res)=>{try{res.set('Cache-Control','no-store').json(await resolveTikTokIdentity(req.body?.url,url=>optionalTikTokPreview(url,resolveTikTok)));}catch(error){res.status(400).json({error:error instanceof Error?error.message:'Não foi possível identificar o perfil.'});}});
 const publicProfile=(p:PersonProfile)=>({id:p.id,subjectType:p.subjectType,name:p.name,username:p.username,bio:p.bio,avatar:p.avatar,avatarSelection:p.avatarSelection,cover:p.cover,photos:p.photos,videos:p.videos,socials:p.socials,tags:p.tags,published:p.published,featured:p.featured,order:p.order,createdAt:p.createdAt,updatedAt:p.updatedAt,mediaSources:p.mediaSources,verified:isProfileVerified(db,p),ownershipVerified:isProfileVerified(db,p),guardianAuthorized:p.guardianStatus==='termo_recebido',birthYear:p.birthYear??null,...ageValues(p.birthYear??null,p.ageBand),ageSource:p.ageSource??'desconhecido',rankingCriteria:p.rankingCriteria??'',rankingUpdatedAt:p.rankingUpdatedAt??null,traits:p.traits??[]});
 app.post('/api/admin/tiktok-link',admin,async(req,res)=>{try{res.json({url:await resolveTikTokLink(req.body?.url)});}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Não foi possível resolver o link.'});}});
 app.post('/api/admin/tiktok-oembed',admin,async(req,res)=>{try{if(typeof req.body?.url!=='string')throw Error('Informe o link.');const url=await resolveTikTokLink(req.body.url);res.json(await optionalTikTokPreview(url,resolveTikTok));}catch(error){res.status(400).json({error:error instanceof Error?error.message:'Falha no TikTok.'});}});
 const sorted=(rows:PersonProfile[])=>[...rows].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 app.get('/api/directory-editorial',(_req,res)=>res.set('Cache-Control','no-store').json({profiles:sorted(all().filter(visible)).map(p=>({id:p.id,name:p.name,rankingCriteria:p.rankingCriteria??'',rankingUpdatedAt:p.rankingUpdatedAt??null}))}));
 app.get('/api/people',(_req,res)=>res.set('Cache-Control','no-store').json({profiles:sorted(all().filter(visible)).map(publicProfile)}));
 app.get('/api/people/:id/video-status/:index',async(req,res)=>{
  const profile=all().find(p=>p.id===req.params.id&&visible(p)),index=Number(req.params.index);
  if(!profile||!Number.isInteger(index)||!profile.videos[index])return res.status(404).json({error:'Vídeo não encontrado.'});
  const video=profile.videos[index];
  if(video.kind==='upload')return res.json({available:true});
  try{
   const metadata=await optionalTikTokPreview(video.url,resolveTikTok);
   const latest=all().find(p=>p.id===profile.id);
   if(latest?.videos[index]?.url===video.url){latest.videos[index]={...latest.videos[index],last_check_at:metadata.checkedAt,is_still_available:metadata.available};latest.availabilityHistory=availabilityHistory([{checkedAt:metadata.checkedAt,available:metadata.available},...(latest.availabilityHistory||[])]);db.save();}
   res.json({available:metadata.available});
  }catch{res.status(503).json({error:'Não foi possível consultar a disponibilidade.'});}
 });
 app.get('/api/admin/source-snapshots',admin,(req,res)=>{const page=Math.max(0,Number(req.query.page)||0)|0,rows=db.get().sourceSnapshots||[];res.set('Cache-Control','no-store').json({snapshots:[...rows].reverse().slice(page*50,(page+1)*50),total:rows.length});});
 app.get('/api/admin/people',admin,(_req,res)=>res.json({profiles:sorted(all()).map(p=>({...p,verified:isProfileVerified(db,p)}))}));
 const write=async(req:express.Request,res:express.Response,update:boolean)=>{
  try {const existing=update?all().find(p=>p.id===req.params.id):undefined;if(update&&!existing)return res.status(404).json({error:'Perfil não encontrado.'});
   const profile=validatePerson(req.body,existing);
   const files=[...profile.photos,profile.cover,profile.avatar,...profile.videos.filter(v=>v.kind==='upload').map(v=>v.url)].filter(url=>url&&url!=='/profile-placeholder.svg');
   if(profile.published&&files.some(url=>!profileUpload(url,'image')&&!profileUpload(url,'video')))throw Error('Reenvie as mídias antigas pelo painel antes de publicar.');
   for(const url of new Set(files)){if(profileUpload(url,'image')||profileUpload(url,'video'))await ensureProfileUpload(url);}
   if(profile.published&&!profile.socials.tiktok)throw Error('Informe o @ original do TikTok antes de publicar o perfil.');
   const now=new Date().toISOString();
   const origin=(url:string,embed=false)=>existing?.mediaSources?.find(m=>m.url===url)||(profile.socials.tiktok?{...uploadedMediaOrigin(url,profile.socials.tiktok,now),...(embed?{source_url:url,display_mode:'embed' as const}:{source_platform:'provided'})}:({url,source_platform:'unknown',source_url:'',source_handle:'',captured_at:now,display_mode:embed?'embed' as const:'reupload' as const,last_check_at:null,is_still_available:null}));
   const sourceRows=profile.photos.map(url=>origin(url));
   for(const key of ['avatar','cover'] as const)if(profile[key])sourceRows.push(origin(profile[key]));
   for(const video of profile.videos){
     const social=video.kind==='social'?socialVideo(video.url):null;
     if(social?.platform==='TikTok'){
       const metadata=await optionalTikTokPreview(video.url,resolveTikTok);
       Object.assign(video,origin(video.url,true),{source_platform:'tiktok',source_url:video.url,source_handle:new URL(video.url).pathname.split('/')[1],thumbnail:metadata.thumbnail_url,last_check_at:metadata.checkedAt,is_still_available:metadata.available,display_mode:'embed'});
     }else Object.assign(video,origin(video.url),{source_platform:social?.platform.toLowerCase()||'provided',source_url:social?.canonical||video.source_url||'',display_mode:social?'embed':'reupload'});
     sourceRows.push({...video,url:video.url,source_platform:video.source_platform!,source_url:video.source_url!,source_handle:video.source_handle!,captured_at:video.captured_at!,display_mode:video.display_mode!,last_check_at:video.last_check_at??null,is_still_available:video.is_still_available??null});
   }
   // Uploaded files and official embeds retain attribution separately.
   profile.mediaSources=sourceRows;
   if(profile.guardianStatus==='termo_recebido'&&!(db.get().verificationRequests||[]).some(row=>row.profileId===profile.id&&row.purpose==='guardian'&&row.status==='aprovado'&&row.termDocUrl&&row.boundIdentityRevision===(profile.identityRevision??0)))throw Error('A autorização exige termo aprovado na seção Verificações.');
   if(!profile.sourceSnapshot){const media=profile.videos.find(v=>v.kind==='social'&&v.source_platform==='tiktok');const url=profile.avatarSelection?.url||media?.url;if(url){profile.sourceSnapshot={capturedAt:now,canonicalUrl:url,handle:new URL(url).pathname.split('/')[1],oembedOkAt:media?.url===url&&media?.is_still_available===true?media.last_check_at??null:null,publiclyAccessible:media?.url===url&&media?.is_still_available===true?true:null};}}
   profile.availabilityHistory=availabilityHistory([...profile.videos.filter(v=>v.last_check_at).map(v=>({checkedAt:v.last_check_at!,available:v.is_still_available??null})),...(all().find(row=>row.id===profile.id)?.availabilityHistory||profile.availabilityHistory||[])]);

if(all().some(p=>p.username===profile.username&&p.id!==profile.id))return res.status(409).json({error:'Esse @usuário já está cadastrado.'});
   if(existing){const current=all().find(p=>p.id===existing.id);if(!current)return res.status(404).json({error:'Perfil removido durante a consulta.'});if(current.updatedAt!==existing.updatedAt)return res.status(409).json({error:'O perfil mudou durante a consulta. Reabra-o antes de salvar.'});}
   const before=db.get().peopleProfiles,beforeAudit=db.get().legalAudit,beforeSnapshots=db.get().sourceSnapshots,beforeVerification=db.get().verificationRequests;
   for(const key of ['birthYear','name','guardianStatus','ownershipVerified','guardianAuthorized'] as const)if(existing&&existing[key]!==profile[key])appendLegalAudit(db,{actor:(req as express.Request&{userId?:string}).userId||'admin',entity:profile.id,field:key,before:existing[key]??null,after:profile[key]??null,reason:'Edição administrativa; mudanças de identidade invalidam os selos.'});
   if(existing&&existing.socials.tiktok!==profile.socials.tiktok)appendLegalAudit(db,{actor:(req as express.Request&{userId?:string}).userId||'admin',entity:profile.id,field:'socials.tiktok',before:existing.socials.tiktok,after:profile.socials.tiktok,reason:'Alteração do vínculo de origem; selos invalidados.'});
   const identityChanged=!!existing&&(profile.identityRevision??0)!==(existing.identityRevision??0);
   const guardianRevoked=existing?.guardianStatus!==profile.guardianStatus&&['recusado','revogado'].includes(profile.guardianStatus||'');
   if(identityChanged||guardianRevoked)db.get().verificationRequests=(beforeVerification||[]).map(row=>{
     if(row.profileId!==profile.id||row.status!=='aprovado'||(!identityChanged&&row.purpose!=='guardian'))return row;
     const actor=(req as express.Request&{userId?:string}).userId||'admin';
     appendLegalAudit(db,{actor,entity:profile.id,field:'verification:'+row.id,before:'aprovado',after:'revogado',reason:identityChanged?'Vínculo de identidade alterado.':'Situação do responsável alterada para '+profile.guardianStatus});
     return {...row,status:'revogado' as const,revokedBy:actor,revokedAt:now,reviewedBy:actor,reviewedAt:now};
   });
   if(profile.sourceSnapshot&&!(db.get().sourceSnapshots||[]).some(row=>row.profileId===profile.id))db.get().sourceSnapshots=[...(db.get().sourceSnapshots||[]),{profileId:profile.id,snapshot:profile.sourceSnapshot}];
   db.get().peopleProfiles=existing?all().map(p=>p.id===profile.id?profile:p):[...all(),profile];try{db.save();}catch(e){db.get().peopleProfiles=before;db.get().legalAudit=beforeAudit;db.get().sourceSnapshots=beforeSnapshots;db.get().verificationRequests=beforeVerification;throw e;}
   res.status(existing?200:201).json({profile});
  }catch(e:any){res.status(400).json({error:e.message||'Não foi possível salvar o perfil.'});}
 };
 app.post('/api/admin/people',admin,(req,res)=>write(req,res,false));
 app.put('/api/admin/people/:id',admin,(req,res)=>write(req,res,true));
 app.delete('/api/admin/people/:id',admin,(req,res)=>{if(!all().some(p=>p.id===req.params.id))return res.status(404).json({error:'Perfil não encontrado.'});const before=db.get().peopleProfiles,beforeSnapshots=db.get().sourceSnapshots;const deleting=all().find(p=>p.id===req.params.id);if(deleting?.sourceSnapshot&&!(beforeSnapshots||[]).some(row=>row.profileId===deleting.id))db.get().sourceSnapshots=[...(beforeSnapshots||[]),{profileId:deleting.id,snapshot:deleting.sourceSnapshot}];db.get().peopleProfiles=all().filter(p=>p.id!==req.params.id);try{db.save();res.json({ok:true});}catch{db.get().peopleProfiles=before;db.get().sourceSnapshots=beforeSnapshots;res.status(503).json({error:'Não foi possível apagar o perfil.'});}});
}



export function refreshProfileAges(db:typeof DB,now=new Date()){
 const before=db.get().peopleProfiles,beforeAudit=db.get().legalAudit;let changed=false;
 db.get().peopleProfiles=(before||[]).map(profile=>{
  if(profile.birthYear==null||profile.ageUpdatedAt?.slice(0,10)===now.toISOString().slice(0,10))return profile;
  changed=true;const age=ageValues(profile.birthYear,profile.ageBand,now);
  if(profile.ageBand!==age.ageBand)appendLegalAudit(db,{actor:'sistema',entity:profile.id,field:'ageBand',before:profile.ageBand??'desconhecido',after:age.ageBand,reason:'Recálculo aproximado pelo ano; aniversário desconhecido.'});
  return {...profile,...age};
 });
 if(changed){try{db.save();}catch(error){db.get().peopleProfiles=before;db.get().legalAudit=beforeAudit;throw error;}}
}
