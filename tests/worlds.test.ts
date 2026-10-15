import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, type ChildProcess} from 'node:child_process';
import jwt from 'jsonwebtoken';
import {WORLDS,belongsToWorld,captionForWorld} from '../shared/worlds';

// Category boundaries, legacy tags and persistence use the actual publication API.
for(const world of WORLDS){
 assert.equal(belongsToWorld([world.tag.toUpperCase()],world),true);
 assert.equal(belongsToWorld([world.tag+'_extra'],world),false);
 for(const other of WORLDS.filter(value=>value.id!==world.id))assert.equal(belongsToWorld([world.tag],other),false);
}
assert.equal(belongsToWorld(['Meninas Superpoderosas'],WORLDS[2]),true);
assert.equal(belongsToWorld(['cartoon-network'],WORLDS[3]),true);
assert.equal(captionForWorld('Minha foto #Barbie','barbie'),'Minha foto #Barbie');
assert.equal(captionForWorld('Sem categoria','invalid'),'Sem categoria');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-worlds-'));
const secret='worlds-test-secret',port=3065;
fs.writeFileSync(path.join(folder,'db.json'),JSON.stringify({users:['owner','viewer'].map(id=>({id,username:id,displayName:id,email:id+'@test.invalid',isAdmin:id==='owner',passwordHash:'',avatar:'',createdAt:new Date().toISOString()})),posts:[]}));
let server:ChildProcess|undefined;
async function start(){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',DATA_DIR:folder,PORT:String(port),JWT_SECRET:secret},stdio:'ignore'});for(let i=0;i<100;i++){try{await fetch(`http://127.0.0.1:${port}`);return;}catch{await new Promise(resolve=>setTimeout(resolve,50));}}throw Error('Server unavailable');}
async function stop(){if(server){const child=server;const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;server=undefined;}}
async function call(method:string,body?:unknown,user='owner'){const response=await fetch(`http://127.0.0.1:${port}/api/posts`,{method,headers:{'content-type':'application/json',authorization:'Bearer '+jwt.sign({userId:user},secret)},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
try{
 await start();
 const media=[{url:'https://example.com/photo.jpg',type:'image'}];
 assert.equal((await call('POST',{media,caption:captionForWorld('Foto','barbie')},'viewer')).status,403);
 for(const world of WORLDS){const result=await call('POST',{media,caption:captionForWorld('Nova foto',world.id),allowComments:true,isTemporary:false});assert.equal(result.status,200);assert.equal(belongsToWorld(result.data.post.hashtags,world),true);}
 await stop();await start();
 const result=await call('GET');assert.equal(result.status,200);
 for(const world of WORLDS)assert.equal(result.data.posts.filter((post:any)=>belongsToWorld(post.hashtags,world)).length,1);
 console.log('Worlds passed: category isolation, legacy names, no substring leaks, admin publication, category persistence after restart.');
}finally{await stop();fs.rmSync(folder,{recursive:true,force:true});}
