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
let busy=false;
export function installProfileVideo(app:express.Express,admin:express.RequestHandler){
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:LIMIT,files:1}}).single('file');
 app.post('/api/admin/people/prepare-video',admin,(req,res,next)=>{if(busy)return res.status(429).json({error:'Outro vídeo está sendo preparado. Tente novamente em instantes.'});busy=true;upload(req,res,error=>{if(error){busy=false;return res.status(400).json({error:'Envie um único vídeo de até 50 MB.'});}next();});},async(req,res)=>{
  let folder='';
  try{
   if(!req.file||! /\.(mp4|webm|mov|m4v)$/i.test(req.file.originalname))throw Error('Escolha um vídeo MP4, WebM, MOV ou M4V.');
   const start=Number(req.body.start),end=Number(req.body.end),cover=Number(req.body.coverTime);
   if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(cover)||start<0||end-start<.1||end>7200||cover<start||cover>=end)throw Error('Escolha um trecho válido e uma capa dentro dele.');
   folder=await fs.mkdtemp(path.join(os.tmpdir(),'profile-video-'));
   const input=path.join(folder,'input'+path.extname(req.file.originalname).toLowerCase()),output=path.join(folder,'clip.mp4'),poster=path.join(folder,'cover.jpg');
   await fs.writeFile(input,req.file.buffer);
   const info=await run(['-i',input],true),match=info.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
   const duration=match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):0;
   if(!duration||! /Video:/.test(info)||end>duration+.15)throw Error('O trecho escolhido ultrapassa a duração do vídeo ou o arquivo não contém imagem.');
   await run(['-y','-ss',String(start),'-i',input,'-t',String(end-start),'-map','0:v:0','-map','0:a:0?','-vf',"scale='trunc(min(1080,iw)/2)*2':-2,setsar=1",'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-threads','1','-c:a','aac','-b:a','128k','-movflags','+faststart','-fs',String(LIMIT),output]);
   const bytes=await fs.readFile(output);if(bytes.length>=LIMIT||!bytes.length)throw Error('O vídeo resultante excedeu o limite. Escolha um trecho menor.');
   await run(['-y','-ss',String(Math.max(0,cover-start)),'-i',output,'-frames:v','1','-vf',"scale='min(720,iw)':-2",'-q:v','3',poster]);
   const thumbnail=await fs.readFile(poster),id=randomUUID(),videoName=`profile_${id}.mp4`,coverName=`profile_${id}.jpg`;
   if(CLOUD){await uploadCloud(videoName,bytes,'video/mp4');await uploadCloud(coverName,thumbnail,'image/jpeg');}
   else{await fs.writeFile(path.join(UPLOADS_DIR,videoName),bytes);try{await fs.writeFile(path.join(UPLOADS_DIR,coverName),thumbnail);}catch(error){await fs.rm(path.join(UPLOADS_DIR,videoName),{force:true});throw error;}}
   res.json({url:`/uploads/${videoName}`,thumbnail:`/uploads/${coverName}`,duration:Math.min(end,duration)-start,kind:'upload'});
  }catch(error:any){res.status(400).json({error:error.message||'Não foi possível preparar o vídeo.'});}
  finally{busy=false;if(folder)await fs.rm(folder,{recursive:true,force:true}).catch(()=>{});}
 });
}
