import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import jwt from 'jsonwebtoken';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-gallery-')),port=3097,secret='gallery-production-fixture';
const admin={id:'owner',username:'owner',displayName:'Owner',email:'owner@example.invalid',isAdmin:true,passwordHash:'',avatar:'',bio:'',banner:'',isPrivate:false,isVerified:false,animeTitle:'',themeColor:'',website:'',createdAt:new Date().toISOString()};
const old={id:'old',name:'Antigo',username:'antigo',bio:'',avatar:'https://example.invalid/avatar.jpg',cover:'',photos:['https://example.invalid/photo.jpg'],videos:[{url:'https://www.tiktok.com/@antigo/photo/7421111111111111111',title:''}],socials:{tiktok:'antigo',instagram:'',pinterest:''},tags:[],hidden:true,published:false,featured:false,order:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),guardianEmail:'private@example.invalid'};
fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({users:[admin],posts:[],peopleProfiles:[old]}));let server;
async function start(){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',DATA_DIR:dir,PORT:String(port),JWT_SECRET:secret},stdio:'ignore'});for(let n=0;n<100;n++){try{await fetch(`http://127.0.0.1:${port}`);return;}catch{await new Promise(r=>setTimeout(r,50));}}throw Error('server failed');}
async function stop(){if(server){server.kill();await new Promise(r=>server.once('exit',r));server=null;}}
async function call(route,method='GET',body,token=jwt.sign({userId:'owner'},secret)){const response=await fetch(`http://127.0.0.1:${port}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
try{
 await start();let listed=await call('/api/people');assert.equal(listed.status,200);assert.equal(listed.body.profiles.length,1);const profile=listed.body.profiles[0];assert.deepEqual(profile.photos,old.photos);assert.equal(profile.videos[0].display_mode,'embed');assert.equal(profile.guardianEmail,undefined);
 const signup=await call('/api/auth/register','POST',{username:'newuser',displayName:'New user',email:'new@example.invalid',password:'fixture-password-123'},'');assert.equal(signup.status,200,JSON.stringify(signup.body));
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'db.json')));const account=saved.users.find(u=>u.username==='newuser');assert.equal(account.acceptedTerms,false);assert.equal(account.acceptedTermsAt,undefined);assert.equal(saved.publicGalleryRestoredV1,true);
 assert.equal((await call('/api/admin/people/old','PUT',{...old,name:'Unauthorized'},signup.body.token)).status,403,'visitors cannot change publication');
 const hidden=await call('/api/admin/people/old','PUT',{...old,videos:[],photos:[],avatar:'',hidden:true});assert.equal(hidden.status,200,JSON.stringify(hidden.body));assert.equal((await call('/api/people')).body.profiles.length,0);
 await stop();await start();assert.equal((await call('/api/people')).body.profiles.length,0,'migration marker persists through real storage');
 const visible=await call('/api/admin/people/old','PUT',{...hidden.body.profile,hidden:false});assert.equal(visible.status,200);assert.equal((await call('/api/people')).body.profiles.length,1);
 console.log('Production gallery passed: real storage migration, legacy media, signup without false acceptance, admin permissions and restart persistence.');
}finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}
