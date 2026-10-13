import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-policy-'));
const secret='isolated-integration-test-secret';
const token=id=>jwt.sign({userId:id},secret);
const user=(id,isAdmin=false)=>({id,username:id,email:id+'@example.test',displayName:id,passwordHash:bcrypt.hashSync('test-password-123',4),isAdmin,isPrivate:false,createdAt:new Date().toISOString(),avatar:'',bio:'',banner:'',isVerified:false,animeTitle:'',themeColor:'',website:''});
const base={ users:[user('owner',true),user('viewer'),user('viewer2')], posts:[], likes:[],saves:[],comments:[],commentLikes:[],follows:[],stories:[],storyViews:[],conversations:[{id:'disabled',isGroup:true}],messages:[],notifications:[],reports:[],blocks:[],mutes:[],usageSettings:{dailyMinutes:1,bindNetwork:false}};
fs.writeFileSync(path.join(root,'db.json'),JSON.stringify(base));
let child;
async function start(){ child=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,STORAGE_BACKEND:'local',NODE_ENV:'production',DATA_DIR:root,JWT_SECRET:secret},stdio:'ignore'}); for(let i=0;i<100;i++){try { await fetch('http://localhost:3000'); return;}catch{await new Promise(r=>setTimeout(r,100));}} throw Error('server failed'); }
async function stop(){child.kill();await new Promise(r=>child.once('exit',r));}
async function call(url,id='viewer',method='GET',body,cookie=''){const res=await fetch('http://localhost:3000'+url,{method,headers:{authorization:'Bearer '+token(id),'content-type':'application/json',cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json(),cookies:res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
try {
 await start();
 assert.equal((await fetch('http://localhost:3000/api/welcome')).status,200);
 assert.deepEqual((await call('/api/welcome')).body,{intervalSeconds:5,slides:[]});
 assert.equal((await call('/api/admin/welcome','viewer')).status,403);
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4xsAAAAASUVORK5CYII=','base64');
 fs.writeFileSync(path.join(root,'uploads','entry.png'),image);
 fs.writeFileSync(path.join(root,'uploads','private.png'),image);
 const config={intervalSeconds:3,slides:[{id:'slide-test',type:'image',url:'/uploads/entry.png',name:'entry.png'}]};
 assert.equal((await call('/api/admin/welcome','viewer','PUT',config)).status,403);
 assert.equal((await call('/api/admin/welcome','owner','PUT',{...config,intervalSeconds:0})).status,400);
 assert.equal((await call('/api/admin/welcome','owner','PUT',{...config,slides:[{...config.slides[0],url:'/uploads/../db.json'}]})).status,400);
 assert.equal((await call('/api/admin/welcome','owner','PUT',{...config,slides:[{...config.slides[0],url:'https://example.test/private.jpg'}]})).status,400);
 assert.equal((await call('/api/admin/welcome','owner','PUT',config)).status,200);
 const publicConfig=(await call('/api/welcome')).body;assert.equal(publicConfig.slides[0].url,'/api/welcome/media/slide-test');assert.equal(publicConfig.slides[0].name,undefined);
 const media=await fetch('http://localhost:3000/api/welcome/media/slide-test');assert.equal(media.status,200);assert.deepEqual(Buffer.from(await media.arrayBuffer()),image);
 const range=await fetch('http://localhost:3000/api/welcome/media/slide-test',{headers:{range:'bytes=0-9'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,10);
 assert.equal((await fetch('http://localhost:3000/uploads/private.png')).status,401);
 assert.equal((await fetch('http://localhost:3000/api/welcome/media/private.png')).status,404);
 assert.equal((await fetch('http://localhost:3000/api/posts')).status,401);
 await stop();await start();assert.equal((await call('/api/admin/welcome','owner')).body.slides[0].url,'/uploads/entry.png');
 assert.equal((await call('/api/admin/welcome','owner','PUT',{intervalSeconds:5,slides:[]})).status,200);
 assert.equal((await fetch('http://localhost:3000/api/welcome/media/slide-test')).status,404);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'db.json'))).users.length,3);
 console.log('Welcome passed: admin authorization, safe validation, public whitelist, no upload exposure, byte ranges, restart persistence, removed slide access revoked; existing users retained.');
} finally {if(child && child.exitCode===null)await stop();fs.rmSync(root,{recursive:true,force:true});}
