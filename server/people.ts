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
 const legacyImage=(value:unknown,previous?:string)=>{const url=text(value??'',2048);if(!url||url==='/profile-placeholder.svg')return url;if(url===previous)return url;throw Error('Novas imagens devem vir de publicações do TikTok.');};
 const avatar=legacyImage(input.avatar,existing?.avatar)||'/profile-placeholder.svg';
 if(!Array.isArray(input.photos)||!Array.isArray(input.videos)||input.videos.length>30||!Array.isArray(input.tags)||input.tags.length>8)throw Error('Limite: 30 vídeos e 8 categorias.');
 if(typeof input.published!=='boolean'||typeof input.featured!=='boolean'||!Number.isInteger(input.order)||input.order<0||input.order>9999)throw Error('Configuração de publicação ou ordem inválida.');
 const socials={} as PersonProfile['socials'];for(const platform of ['tiktok','instagram','pinterest'] as const){const handle=text(input.socials?.[platform]??'',60).replace(/^@/,'');if(handle&&!/^[a-zA-Z0-9_.]{1,60}$/.test(handle))throw Error(`Informe somente o @ de ${platform}, sem o link.`);socials[platform]=handle;}
 const cleanTags = new Map<string,string>();for(const raw of input.tags){const label=text(raw,30).replace(/\s+/g,' ');if(label&&!cleanTags.has(categoryKey(label)))cleanTags.set(categoryKey(label),label);}
 const now=new Date().toISOString();return {id:existing?.id||randomUUID(),name,username,avatar,cover:legacyImage(input.cover,existing?.cover),bio:text(input.bio??'',1500),photos:input.photos.map((url:unknown)=>{if(typeof url!=='string'||!existing?.photos.includes(url))throw Error('Adicione fotos por links de carrosséis do TikTok.');return url;}),videos:input.videos.map((v:any)=>{const url=text(v?.url,2048),title=text(v?.title??'',100);const previous=existing?.videos.find(old=>old.url===url);if(previous)return {...previous,title};const source=tiktokPost(url);return {url:source.canonical,title,kind:'social' as const};}),tags:[...cleanTags.values()],socials,published:input.published,featured:input.featured,order:input.order,createdAt:existing?.createdAt||now,updatedAt:now};
}
export function installPeople(app:express.Express,db:typeof DB,admin:express.RequestHandler){
 const all=()=>db.get().peopleProfiles||[];
 const resolveTikTok=makeTikTokResolver(db);
 const publicProfile=(p:PersonProfile)=>({...p,verified:isProfileVerified(db,p)});
 app.post('/api/admin/tiktok-oembed',admin,async(req,res)=>{try{if(typeof req.body?.url!=='string')throw Error('Informe o link.');res.json(await resolveTikTok(req.body.url));}catch(error){res.status(400).json({error:error instanceof Error?error.message:'Falha no TikTok.'});}});
 const sorted=(rows:PersonProfile[])=>[...rows].sort((a,b)=>Number(b.featured)-Number(a.featured)||a.order-b.order||a.name.localeCompare(b.name));
 app.get('/api/people',(_req,res)=>res.json({profiles:sorted(all().filter(p=>p.published)).map(publicProfile)}));
 app.get('/api/people/:id/video-status/:index',async(req,res)=>{
  const profile=all().find(p=>p.id===req.params.id&&p.published),index=Number(req.params.index);
  if(!profile||!Number.isInteger(index)||!profile.videos[index])return res.status(404).json({error:'Vídeo não encontrado.'});
  const video=profile.videos[index];
  try{
   const metadata=await resolveTikTok(video.url,false);
   const latest=all().find(p=>p.id===profile.id);
   if(latest?.videos[index]?.url===video.url){latest.videos[index]={...latest.videos[index],last_check_at:metadata.checkedAt,is_still_available:metadata.available};db.save();}
   res.json({available:metadata.available});
  }catch{res.status(503).json({error:'Não foi possível consultar a disponibilidade.'});}
 });
 app.get('/api/admin/people',admin,(_req,res)=>res.json({profiles:sorted(all()).map(p=>({...p,verified:isProfileVerified(db,p)}))}));
 const write=async(req:express.Request,res:express.Response,update:boolean)=>{
  try {const existing=update?all().find(p=>p.id===req.params.id):undefined;if(update&&!existing)return res.status(404).json({error:'Perfil não encontrado.'});
   const profile=validatePerson(req.body,existing);
   if(profile.published&&!profile.socials.tiktok)throw Error('Informe o @ original do TikTok antes de publicar o perfil.');
   const now=new Date().toISOString();
   const origin=(url:string,embed=false)=>existing?.mediaSources?.find(m=>m.url===url)||(profile.socials.tiktok?{...uploadedMediaOrigin(url,profile.socials.tiktok,now),...(embed?{source_url:url,display_mode:'embed' as const}:{})}:({url,source_platform:'unknown',source_url:'',source_handle:'',captured_at:now,display_mode:embed?'embed' as const:'reupload' as const,last_check_at:null,is_still_available:null}));
   const sourceRows=profile.photos.map(url=>origin(url));
   for(const key of ['avatar','cover'] as const)if(profile[key])sourceRows.push(origin(profile[key]));
   for(const video of profile.videos){
     const social=video.kind==='social'?socialVideo(video.url):null;
     if(social?.platform==='TikTok'){
       const metadata=await resolveTikTok(video.url,!existing?.videos.some(old=>old.url===video.url));
       Object.assign(video,origin(video.url,true),{source_platform:'tiktok',source_url:video.url,source_handle:new URL(video.url).pathname.split('/')[1],thumbnail:metadata.thumbnail_url,last_check_at:metadata.checkedAt,is_still_available:metadata.available,display_mode:'embed'});
     }else Object.assign(video,origin(video.url),{source_platform:social?.platform.toLowerCase()||'provided',source_url:social?.canonical||'',display_mode:social?'embed':'reupload'});
     sourceRows.push({...video,url:video.url,source_platform:video.source_platform!,source_url:video.source_url!,source_handle:video.source_handle!,captured_at:video.captured_at!,display_mode:video.display_mode!,last_check_at:video.last_check_at??null,is_still_available:video.is_still_available??null});
   }
   if(profile.avatar==='/profile-placeholder.svg'){const first=profile.videos.find(v=>v.source_platform==='tiktok'&&v.thumbnail&&v.source_handle?.replace(/^@/,'').toLowerCase()===profile.socials.tiktok.toLowerCase());if(first){profile.avatar=first.thumbnail!;sourceRows.push({...first,url:profile.avatar} as any);}}
   profile.mediaSources=sourceRows;
if(all().some(p=>p.username===profile.username&&p.id!==profile.id))return res.status(409).json({error:'Esse @usuário já está cadastrado.'});
   if(existing){const current=all().find(p=>p.id===existing.id);if(!current)return res.status(404).json({error:'Perfil removido durante a consulta.'});if(current.updatedAt!==existing.updatedAt)return res.status(409).json({error:'O perfil mudou durante a consulta. Reabra-o antes de salvar.'});}
   const before=db.get().peopleProfiles;db.get().peopleProfiles=existing?all().map(p=>p.id===profile.id?profile:p):[...all(),profile];try{db.save();}catch(e){db.get().peopleProfiles=before;throw e;}
   res.status(existing?200:201).json({profile});
  }catch(e:any){res.status(400).json({error:e.message||'Não foi possível salvar o perfil.'});}
 };
 app.post('/api/admin/people',admin,(req,res)=>write(req,res,false));
 app.put('/api/admin/people/:id',admin,(req,res)=>write(req,res,true));
 app.delete('/api/admin/people/:id',admin,(req,res)=>{if(!all().some(p=>p.id===req.params.id))return res.status(404).json({error:'Perfil não encontrado.'});const before=db.get().peopleProfiles;db.get().peopleProfiles=all().filter(p=>p.id!==req.params.id);try{db.save();res.json({ok:true});}catch{db.get().peopleProfiles=before;res.status(503).json({error:'Não foi possível apagar o perfil.'});}});
}


