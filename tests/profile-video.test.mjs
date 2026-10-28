import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawn} from 'node:child_process';import jwt from 'jsonwebtoken';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'profile-video-disabled-')),secret='profile-video-test',port=3067;
fs.writeFileSync(path.join(root,'db.json'),JSON.stringify({users:['owner','viewer'].map(id=>({id,username:id,displayName:id,email:id+'@test.invalid',isAdmin:id==='owner',passwordHash:'',avatar:'',createdAt:new Date().toISOString()})),posts:[]}));
const child=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',DATA_DIR:root,PORT:String(port),JWT_SECRET:secret},stdio:'ignore'});
try{
 for(let i=0;i<100;i++){try{await fetch(`http://127.0.0.1:${port}`);break;}catch{await new Promise(r=>setTimeout(r,50));}}
 for(const route of ['/api/upload','/api/admin/people/prepare-video']){
  for(const who of ['viewer','owner']){
   const body=new FormData();body.append('file',new Blob(['blocked-upload'],{type:'video/mp4'}),'video.mp4');
   const response=await fetch(`http://127.0.0.1:${port}${route}`,{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({userId:who},secret)},body});assert.equal(response.status,who==='owner'?410:403);
  }
  const response=await fetch(`http://127.0.0.1:${port}${route}`,{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({userId:'owner'},secret),'Content-Type':'application/json'},body:JSON.stringify({data:'data:image/png;base64,AA=='})});assert.equal(response.status,410);
 }
 assert.deepEqual(fs.readdirSync(path.join(root,'uploads')),[],'blocked multipart/base64 must not write files');
 console.log('Upload routes passed: multipart, base64 and video preparation disabled; admin checks preserved; no file writes.');
}finally{const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;fs.rmSync(root,{recursive:true,force:true});}
