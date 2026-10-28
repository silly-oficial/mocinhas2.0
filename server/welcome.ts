import type express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { DB } from './db';
import { CLOUD, flushCloud, signedMedia } from './cloud-store';
import { UPLOADS_DIR } from './storage';
import type { WelcomeConfig } from '../shared/welcome';
import {tiktokPost} from '../shared/people';
import {makeTikTokResolver} from './tiktok-oembed';
const fallback: WelcomeConfig = {intervalSeconds:5,slides:[]};
export function validateWelcome(value:any, existing?:WelcomeConfig):WelcomeConfig {
  if(!value || !Number.isInteger(value.intervalSeconds) || value.intervalSeconds<2 || value.intervalSeconds>30 || !Array.isArray(value.slides) || value.slides.length>20)throw Error('Escolha de 2 a 30 segundos e até 20 mídias.');
  const seen=new Set<string>();
  const slides=value.slides.map((s:any)=>{
    if(s?.type==='tiktok') {
      const source=tiktokPost(s.url);
      if(source.platform!=='TikTok')throw Error('Use um link do TikTok.');
      const id=typeof s.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s.id)?s.id:randomUUID();
      if(seen.has(id))throw Error('Mídias com identificador repetido.');seen.add(id);
      return {id,type:'tiktok' as const,url:source.canonical,source_handle:new URL(source.canonical).pathname.split('/')[1]};
    }
    if(!s || !['image','video'].includes(s.type) || typeof s.url!=='string' || !/^\/uploads\/[a-zA-Z0-9_.%-]+$/.test(s.url))throw Error('Adicione novas mídias por links do TikTok.');
    if(!existing?.slides.some(old=>old.id===s.id&&old.type===s.type&&old.url===s.url))throw Error('Adicione novas mídias somente por links do TikTok.');
    const file=decodeURIComponent(s.url.slice(9));
    if(!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(file) || !/\.(jpe?g|png|webp|avif|gif|mp4|webm|mov|m4v)$/i.test(file))throw Error('Formato não suportado.');
    if((s.type==='video')!==/\.(mp4|webm|mov|m4v)$/i.test(file))throw Error('Tipo da mídia inválido.');
    let id=typeof s.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s.id)?s.id:randomUUID();
    if(seen.has(id))throw Error('Mídias com identificador repetido.');seen.add(id);
    if(s.frame && (!['cover','contain'].includes(s.frame.fit) || !Number.isFinite(s.frame.x) || s.frame.x<0 || s.frame.x>100 || !Number.isFinite(s.frame.y) || s.frame.y<0 || s.frame.y>100 || !Number.isFinite(s.frame.zoom) || s.frame.zoom<1 || s.frame.zoom>2.5))throw Error('Enquadramento inválido.');
    const frame=s.frame?{fit:s.frame.fit,x:s.frame.x,y:s.frame.y,zoom:s.frame.zoom}:undefined;
    return {id,type:s.type,url:s.url,frame,name:typeof s.name==='string'?s.name.slice(0,120):undefined};
  });
  return {intervalSeconds:value.intervalSeconds,slides};
}
export function installWelcome(app:express.Express,db:typeof DB,admin:express.RequestHandler){
  const resolveTikTok=makeTikTokResolver(db);
  const config=()=>db.get().welcomeCarousel||fallback;
  app.get('/api/welcome',(_req,res)=>{res.setHeader('Cache-Control','no-store');const c=config();res.json({intervalSeconds:c.intervalSeconds,slides:c.slides.map(s=>({id:s.id,type:s.type,frame:s.frame,url:s.type==='tiktok'?s.url:'/api/welcome/media/'+s.id,...(s.type==='tiktok'?{thumbnail:s.thumbnail,source_handle:s.source_handle}:{})}))});});
  app.get('/api/admin/welcome',admin,(_req,res)=>res.json(config()));
  app.put('/api/admin/welcome',admin,async(req,res)=>{try{const c=validateWelcome(req.body,config());await Promise.all(c.slides.map(async slide=>{if(slide.type==='tiktok'){try{const metadata=await resolveTikTok(slide.url,false);slide.thumbnail=metadata.thumbnail_url;}catch{/* The official player and source link remain available without oEmbed. */}}}));db.get().welcomeCarousel=c;db.save();res.json(c);}catch(e:any){res.status(400).json({error:e.message});}});
  // Only explicitly selected promotional slides are public, never the private uploads route.
  app.get('/api/welcome/media/:id',async(req,res)=>{
    const slide=config().slides.find(s=>s.id===req.params.id);if(!slide||slide.type==='tiktok')return res.status(404).end();
    const file=decodeURIComponent(slide.url.slice(9));
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.setHeader('Content-Disposition','inline');
    if(!CLOUD)return res.sendFile(file,{root:UPLOADS_DIR,dotfiles:'deny'},err=>{if(err&&!res.headersSent)res.status(404).end();});
    const controller=new AbortController();res.on('close',()=>controller.abort());
    try{await flushCloud();const url=await signedMedia(file);const r=await fetch(url,{headers:req.headers.range?{Range:req.headers.range}:{},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(120000)])});res.status(r.status);
      for(const h of ['content-type','content-length','content-range','accept-ranges']){const v=r.headers.get(h);if(v)res.setHeader(h,v);}
      if(!r.body)return res.end();const stream=Readable.fromWeb(r.body as any);stream.on('error',()=>res.destroy());stream.pipe(res);
    }catch{if(!res.headersSent&&!res.destroyed)res.status(503).end();}
  });
}

