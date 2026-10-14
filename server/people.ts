import type express from 'express';
import {randomUUID} from 'node:crypto';
import type {DB} from './db';
import {categoryKey,socialVideo, type PersonProfile} from '../shared/people';
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
 const avatar=image(input.avatar);if(!avatar)throw Error('Adicione a foto do perfil.');
 if(!Array.isArray(input.photos)||input.photos.length>40||!Array.isArray(input.videos)||input.videos.length>30||!Array.isArray(input.tags)||input.tags.length>8)throw Error('Limite: 40 fotos, 30 vídeos e 8 categorias.');
 if(typeof input.published!=='boolean'||typeof input.featured!=='boolean'||!Number.isInteger(input.order)||input.order<0||input.order>9999)throw Error('Configuração de publicação ou ordem inválida.');
 const socials={} as PersonProfile['socials'];for(const platform of ['tiktok','instagram','pinterest'] as const){const handle=text(input.socials?.[platform]??'',60).replace(/^@/,'');if(handle&&!/^[a-zA-Z0-9_.]{1,60}$/.test(handle))throw Error(`Informe somente o @ de ${platform}, sem o link.`);socials[platform]=handle;}
 const cleanTags = new Map<string,string>();for(const raw of input.tags){const label=text(raw,30).replace(/\s+/g,' ');if(label&&!cleanTags.has(categoryKey(label)))cleanTags.set(categoryKey(label),label);}
 const now=new Date().toISOString();return {id:existing?.id||randomUUID(),name,username,avatar,cover:image(input.cover??''),bio:text(input.bio??'',1500),photos:input.photos.map(image).filter(Boolean),videos:input.videos.map((v:any)=>{const url=text(v?.url,2048),title=text(v?.title??'',100);if(/^\/uploads\/[a-zA-Z0-9_.%-]+\.(mp4|webm|mov|m4v)$/i.test(url))return {url,title,kind:'upload' as const};if(v?.kind==='upload')throw Error('Envie o arquivo de vídeo pelo painel.');return {url:socialVideo(url).canonical,title,kind:'social' as const};}),tags:[...cleanTags.values()],socials,published:input.published,featured:input.featured,order:input.order,createdAt:existing?.createdAt||now,updatedAt:now};
}
export function installPeople(app:express.Express,db:typeof DB,admin:express.RequestHandler){
 const all=()=>db.get().peopleProfiles||[];
 const sorted=(rows:PersonProfile[])=>[...rows].sort((a,b)=>Number(b.featured)-Number(a.featured)||a.order-b.order||a.name.localeCompare(b.name));
 app.get('/api/people',(_req,res)=>res.json({profiles:sorted(all().filter(p=>p.published))}));
 app.get('/api/admin/people',admin,(_req,res)=>res.json({profiles:sorted(all())}));
 const write=(req:express.Request,res:express.Response,update:boolean)=>{
  try {const existing=update?all().find(p=>p.id===req.params.id):undefined;if(update&&!existing)return res.status(404).json({error:'Perfil não encontrado.'});
   const profile=validatePerson(req.body,existing);if(all().some(p=>p.username===profile.username&&p.id!==profile.id))return res.status(409).json({error:'Esse @usuário já está cadastrado.'});
   const before=db.get().peopleProfiles;db.get().peopleProfiles=existing?all().map(p=>p.id===profile.id?profile:p):[...all(),profile];try{db.save();}catch(e){db.get().peopleProfiles=before;throw e;}
   res.status(existing?200:201).json({profile});
  }catch(e:any){res.status(400).json({error:e.message||'Não foi possível salvar o perfil.'});}
 };
 app.post('/api/admin/people',admin,(req,res)=>write(req,res,false));
 app.put('/api/admin/people/:id',admin,(req,res)=>write(req,res,true));
 app.delete('/api/admin/people/:id',admin,(req,res)=>{if(!all().some(p=>p.id===req.params.id))return res.status(404).json({error:'Perfil não encontrado.'});const before=db.get().peopleProfiles;db.get().peopleProfiles=all().filter(p=>p.id!==req.params.id);try{db.save();res.json({ok:true});}catch{db.get().peopleProfiles=before;res.status(503).json({error:'Não foi possível apagar o perfil.'});}});
}
