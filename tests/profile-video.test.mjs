import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';import jwt from 'jsonwebtoken';import ffmpeg from '@ffmpeg-installer/ffmpeg';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'profile-video-test-')),secret='profile-video-test',port=3067;
fs.writeFileSync(path.join(root,'db.json'),JSON.stringify({users:['owner','viewer'].map(id=>({id,username:id,displayName:id,email:id+'@test.invalid',isAdmin:id==='owner',passwordHash:'',avatar:'',createdAt:new Date().toISOString()})),posts:[]}));
const source=path.join(root,'source.mp4');
assert.equal(spawnSync(ffmpeg.path,['-v','error','-f','lavfi','-i','testsrc2=size=240x426:rate=24','-f','lavfi','-i','sine=frequency=440','-t','4','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-c:a','aac',source]).status,0);
let server;
async function start(){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',DATA_DIR:root,PORT:String(port),JWT_SECRET:secret},stdio:'ignore'});for(let i=0;i<100;i++){try{await fetch(`http://127.0.0.1:${port}`);return;}catch{await new Promise(resolve=>setTimeout(resolve,50));}}throw Error('Server failed');}
async function stop(){if(server){const child=server;server=undefined;const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;}}
function form(start=1,end=3,coverTime=1.5){const body=new FormData();body.append('file',new Blob([fs.readFileSync(source)],{type:'video/mp4'}),'source.mp4');for(const [key,value] of Object.entries({start,end,coverTime}))body.append(key,String(value));return body;}
async function call(route,body,who='owner',method='POST'){const response=await fetch(`http://127.0.0.1:${port}${route}`,{method,headers:{Authorization:'Bearer '+jwt.sign({userId:who},secret),...(body instanceof FormData||!body?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
try{
 await start();
 assert.equal((await call('/api/admin/people/prepare-video',form(),'viewer')).status,403);
 for(const value of [form(3,1,2),form(0,8,1),form(1,3,0)])assert.equal((await call('/api/admin/people/prepare-video',value)).status,400);
 const result=await call('/api/admin/people/prepare-video',form());assert.equal(result.status,200,JSON.stringify(result.data));
 const clip=result.data,local=path.join(root,'uploads',path.basename(clip.url));
 const info=spawnSync(ffmpeg.path,['-i',local],{encoding:'utf8'}).stderr;
 assert.match(info,/Duration: 00:00:02\.0/);assert.match(info,/Video: h264/);assert.match(info,/Audio: aac/);
 assert.deepEqual([...fs.readFileSync(path.join(root,'uploads',path.basename(clip.thumbnail))).subarray(0,2)],[255,216]);
 const profile={name:'Teste',username:'teste',bio:'',avatar:clip.thumbnail,cover:clip.thumbnail,photos:[],videos:[{...clip,title:'Treino'}],socials:{tiktok:'fixture.creator',instagram:'',pinterest:''},tags:[],published:true,featured:false,order:0};
 assert.equal((await call('/api/admin/people',profile)).status,201);
 await stop();await start();
 const saved=(await call('/api/people',undefined,'viewer','GET')).data.profiles[0];
 assert.equal(saved.videos[0].duration,2);assert.equal(saved.videos[0].thumbnail,clip.thumbnail);assert.equal(saved.cover,clip.thumbnail);
 console.log('Profile video passed: real 4s→2s cut, H264/AAC, generated JPEG, invalid bounds/access rejection, covers and clip metadata survive restart.');
}finally{await stop();fs.rmSync(root,{recursive:true,force:true});}

