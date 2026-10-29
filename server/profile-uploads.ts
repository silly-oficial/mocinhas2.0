import express from 'express';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {CLOUD,uploadCloud,signedMedia} from './cloud-store';
import {UPLOADS_DIR} from './storage';

export const MAX_PROFILE_UPLOAD = 50 * 1024 * 1024;
export const profileUpload = (url:unknown,kind:'image'|'video') => typeof url==='string' && new RegExp('^/uploads/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.'+(kind==='image'?'(jpg|png|gif|webp|avif)':'(mp4|mov|webm)')+'$','i').test(url);
export function detectProfileMedia(bytes:Buffer,mime:string){
 const ascii=(a:number,b:number)=>bytes.toString('ascii',a,b);
 if(mime==='image/jpeg'&&bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {ext:'jpg',type:'image' as const};
 if(mime==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {ext:'png',type:'image' as const};
 if(mime==='image/gif'&&/^GIF8[79]a$/.test(ascii(0,6)))return {ext:'gif',type:'image' as const};
 if(mime==='image/webp'&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return {ext:'webp',type:'image' as const};
 if(bytes.length>=16&&ascii(4,8)==='ftyp'){
  const brand=ascii(8,12);
  if(mime==='image/avif'&&['avif','avis'].includes(brand))return {ext:'avif',type:'image' as const};
  if(mime==='video/quicktime'&&brand==='qt  ')return {ext:'mov',type:'video' as const};
  if(mime==='video/mp4'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)$/.test(brand))return {ext:'mp4',type:'video' as const};
 }
 if(mime==='video/webm'&&bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])))return {ext:'webm',type:'video' as const};
 throw Error('Formato não reconhecido. Use JPG, PNG, GIF, WebP, AVIF, MP4, MOV ou WebM.');
}
export async function ensureProfileUpload(url:string){
 const name=path.basename(url);
 if(CLOUD)await signedMedia(name);else await fs.access(path.join(UPLOADS_DIR,name));
}
export function installProfileUploads(app:express.Express,admin:express.RequestHandler){
 let active=0;
 app.post('/api/admin/people/upload',admin,(req,res,next)=>{
  if(active>=2)return res.status(429).json({error:'Há envios em andamento. Aguarde e tente novamente.'});
  if(!/^(image\/(jpeg|png|gif|webp|avif)|video\/(mp4|quicktime|webm))$/.test(req.get('content-type')||''))return res.status(415).json({error:'Use uma foto ou vídeo em formato compatível.'});
  active++;let released=false;const release=()=>{if(!released){active--;released=true;}};res.once('finish',release);res.once('close',release);req.setTimeout(300000);next();
 },express.raw({type:()=>true,limit:MAX_PROFILE_UPLOAD}),(req,res)=>{
  void (async()=>{
   try{
    const bytes=req.body;if(!Buffer.isBuffer(bytes)||!bytes.length)return res.status(400).json({error:'Arquivo vazio.'});
    const mime=req.get('content-type')!;const media=detectProfileMedia(bytes,mime);
    if(media.type==='image'&&bytes.length>20*1024*1024)return res.status(413).json({error:'A foto excede 20 MB.'});
    const name=randomUUID()+'.'+media.ext;
    let url:string;
    if(CLOUD)url=await uploadCloud(name,bytes,mime);else{await fs.mkdir(UPLOADS_DIR,{recursive:true});await fs.writeFile(path.join(UPLOADS_DIR,name),bytes,{flag:'wx',mode:0o600});url='/uploads/'+name;}
    res.status(201).json({url,type:media.type,bytes:bytes.length});
   }catch(error){res.status(400).json({error:error instanceof Error?error.message:'Não foi possível salvar o arquivo.'});}
  })();
 },(error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error?.type==='entity.too.large'?413:400).json({error:error?.type==='entity.too.large'?'O arquivo excede 50 MB.':'Não foi possível receber o arquivo.'}));
}
