import type express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import {CLOUD,uploadCloud} from './cloud-store';
import {UPLOADS_DIR} from './storage';

const LIMIT=50*1024*1024;
function run(args:string[],probe=false):Promise<string>{return new Promise((resolve,reject)=>{
 const child=spawn(process.env.FFMPEG_PATH||ffmpeg.path,['-hide_banner','-nostdin','-protocol_whitelist','file,pipe',...args],{stdio:['ignore','ignore','pipe']});let diagnostic='';
 const timer=setTimeout(()=>child.kill('SIGKILL'),120000);
 child.stderr.on('data',chunk=>{diagnostic=(diagnostic+chunk.toString()).slice(-32768);});
 child.on('error',()=>{clearTimeout(timer);reject(Error('O processador de vídeo não está disponível.'));});
 child.on('close',code=>{clearTimeout(timer);if(code===0||probe)resolve(diagnostic);else reject(Error('Não foi possível processar este vídeo. Verifique o formato e tente novamente.'));});
});}
// Serialize CPU work, but accept independent uploads immediately into their own folders.
// Disk-backed input keeps multiple 50 MB submissions out of the Node heap.
let queue:Promise<void>=Promise.resolve();
async function acquire(){let release!:()=>void;const previous=queue;queue=new Promise<void>(resolve=>{release=resolve;});await previous;return release;}
export function installProfileVideo(app:express.Express,admin:express.RequestHandler){
 const upload=multer({storage:multer.diskStorage({destination:os.tmpdir(),filename:(_req,_file,done)=>done(null,`profile-input-${randomUUID()}`)}),limits:{fileSize:LIMIT,files:1}}).single('file');
 app.post('/api/admin/people/prepare-video',admin,(req,res,next)=>{upload(req,res,error=>{if(error)return res.status(400).json({error:'Envie um único vídeo de até 50 MB.'});next();});},async(req,res)=>{
  let folder='';let release:(()=>void)|undefined;
  try{
   if(!req.file||! /\.(mp4|webm|mov|m4v)$/i.test(req.file.originalname))throw Error('Escolha um vídeo MP4, WebM, MOV ou M4V.');
   const start=Number(req.body.start),end=Number(req.body.end),cover=Number(req.body.coverTime);
   if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(cover)||start<0||end-start<.1||end>7200||cover<start||cover>=end)throw Error('Escolha um trecho válido e uma capa dentro dele.');
   release=await acquire();
   folder=await fs.mkdtemp(path.join(os.tmpdir(),'profile-video-'));
   const ext=path.extname(req.file.originalname).toLowerCase(),input=path.join(folder,'input'+ext),output=path.join(folder,'clip.mp4'),poster=path.join(folder,'cover.jpg');
   await fs.rename(req.file.path,input);
   const info=await run(['-i',input],true),match=info.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
   const duration=match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):0;
   if(!duration||! /Video:/.test(info)||end>duration+.15)throw Error('O trecho escolhido ultrapassa a duração do vídeo ou o arquivo não contém imagem.');

   // Profile clips favor fast publishing over archival compression. The old single-thread
   // 1080p encode was the main bottleneck on small Render instances.
   await run(['-y','-ss',String(start),'-i',input,'-t',String(end-start),'-map','0:v:0','-map','0:a:0?','-vf',"scale='trunc(iw*min(1,min(1280/iw,720/ih))/2)*2':'trunc(ih*min(1,min(1280/iw,720/ih))/2)*2',setsar=1",'-c:v','libx264','-preset','ultrafast','-crf','25','-pix_fmt','yuv420p','-threads','0','-c:a','aac','-b:a','96k','-movflags','+faststart','-fs',String(LIMIT),output]);
   const stat=await fs.stat(output);if(stat.size>=LIMIT||!stat.size)throw Error('O vídeo resultante excedeu o limite. Escolha um trecho menor.');

   // Extract the cover from the already decoded-friendly final clip. Read both files only
   // when needed for cloud upload, avoiding an unnecessary full video copy on local storage.
   await run(['-y','-ss',String(Math.max(0,cover-start)),'-i',output,'-frames:v','1','-vf',"scale='min(720,iw)':-2",'-q:v','4',poster]);
   const id=randomUUID(),videoName=`profile_${id}.mp4`,coverName=`profile_${id}.jpg`;
   if(CLOUD){
    const [bytes,thumbnail]=await Promise.all([fs.readFile(output),fs.readFile(poster)]);
    await Promise.all([uploadCloud(videoName,bytes,'video/mp4'),uploadCloud(coverName,thumbnail,'image/jpeg')]);
   } else {
    const finalVideo=path.join(UPLOADS_DIR,videoName),finalCover=path.join(UPLOADS_DIR,coverName);
    await fs.rename(output,finalVideo).catch(async()=>{await fs.copyFile(output,finalVideo);});
    try{await fs.rename(poster,finalCover).catch(async()=>{await fs.copyFile(poster,finalCover);});}catch(error){await fs.rm(finalVideo,{force:true});throw error;}
   }
   res.json({url:`/uploads/${videoName}`,thumbnail:`/uploads/${coverName}`,duration:Math.min(end,duration)-start,kind:'upload'});
  }catch(error:any){res.status(400).json({error:error.message||'Não foi possível preparar o vídeo.'});}
  finally{if(req.file?.path)await fs.rm(req.file.path,{force:true}).catch(()=>{});release?.();if(folder)await fs.rm(folder,{recursive:true,force:true}).catch(()=>{});}
 });
}

