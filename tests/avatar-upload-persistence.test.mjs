import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import jwt from 'jsonwebtoken';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-avatar-')),port=3098,secret='avatar-test-only';
fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({users:[{id:'admin',username:'admin',isAdmin:true}],posts:[]}));let server;
async function start(){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',DATA_DIR:dir,PORT:String(port),JWT_SECRET:secret},stdio:'ignore'});for(let i=0;i<100;i++){try{await fetch(`http://127.0.0.1:${port}`);return;}catch{await new Promise(r=>setTimeout(r,50));}}throw Error('server failed');}
async function stop(){if(server){server.kill();await new Promise(r=>server.once('exit',r));server=null;}}
const auth={Authorization:'Bearer '+jwt.sign({userId:'admin'},secret)};
async function upload(bytes,type){const response=await fetch(`http://127.0.0.1:${port}/api/admin/people/upload`,{method:'POST',headers:{...auth,'Content-Type':type},body:bytes});assert.equal(response.status,201);return (await response.json()).url;}
async function save(body,id){const response=await fetch(`http://127.0.0.1:${port}/api/admin/people`+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
async function list(){return (await (await fetch(`http://127.0.0.1:${port}/api/people`,{headers:auth})).json()).profiles;}
const base={name:'Avatar',username:'avatar',avatar:'',cover:'',photos:[],videos:[],socials:{tiktok:''},tags:[],featured:false,order:0,hidden:false};
try{
 await start();const photo=await upload(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tu4AAAAASUVORK5CYII=','base64'),'image/png');
 const selection={source:'upload',url:photo,kind:'photo',imageIndex:0,zoom:1.5,offsetX:-10,offsetY:15};
 const created=await save({...base,avatarSelection:selection});assert.equal(created.status,201,JSON.stringify(created.body));const id=created.body.profile.id;assert.deepEqual((await list())[0].avatarSelection,selection);assert.equal((await list())[0].socials.tiktok,'');
 await stop();await start();assert.deepEqual((await list())[0].avatarSelection,selection,'photo crop survives process restart');
 const video=await upload(Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(12)]),'video/mp4');
 const clip={source:'upload',url:video,kind:'video',start:1,end:4,zoom:1.75,offsetX:20,offsetY:-25};
 const updated=await save({...base,avatarSelection:clip},id);assert.equal(updated.status,200,JSON.stringify(updated.body));assert.deepEqual((await list())[0].avatarSelection,clip);assert.equal((await list())[0].videos.length,0,'dedicated avatars need not become gallery posts');
 const missing=await save({...base,avatarSelection:{...clip,url:'/uploads/00000000-0000-4000-8000-000000000000.mp4'}},id);assert.equal(missing.status,400,'missing avatar file cannot be saved');assert.deepEqual((await list())[0].avatarSelection,clip,'failed saves preserve the previous avatar');
 await stop();await start();assert.deepEqual((await list())[0].avatarSelection,clip,'video crop and segment survive process restart');
 const removed=await save({...base,avatarSelection:null},id);assert.equal(removed.status,200);assert.equal((await list())[0].avatarSelection,undefined);
 console.log('Uploaded avatar HTTP persistence: photo/video upload, framing, clip selection, missing-file rollback, restart, public rendering data and removal passed. Video container fixture validates storage, not device playback.');
}finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}
