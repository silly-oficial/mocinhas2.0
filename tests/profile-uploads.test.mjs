import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import jwt from 'jsonwebtoken';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-upload-'));
const port=3089,secret='isolated-profile-upload-test';
const users=['admin','member'].map(id=>({id,username:id,email:id+'@example.invalid',displayName:id,isAdmin:id==='admin',passwordHash:'',createdAt:new Date().toISOString()}));
fs.writeFileSync(path.join(root,'db.json'),JSON.stringify({users,posts:[]}));
let server;
async function start(){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,STORAGE_BACKEND:'local',DATA_DIR:root,NODE_ENV:'production',PORT:String(port),JWT_SECRET:secret},stdio:'pipe'});let logs='';server.stderr.on('data',data=>logs+=data);for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Test server failed: '+logs);}
async function stop(){if(server&&server.exitCode===null){const exit=once(server,'exit');server.kill();await exit;}}
const base='http://127.0.0.1:'+port;
const headers=(who='admin')=>who?{authorization:'Bearer '+jwt.sign({userId:who},secret)}:{};
async function upload(bytes,type,who='admin'){const response=await fetch(base+'/api/admin/people/upload',{method:'POST',headers:{...headers(who),'content-type':type},body:bytes});return {status:response.status,body:await response.json()};}
async function save(profile,id){const response=await fetch(base+'/api/admin/people'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify(profile)});return {status:response.status,body:await response.json()};}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tu4AAAAASUVORK5CYII=','base64');
const mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(12)]);
try{
 await start();
 assert.equal((await upload(png,'image/png','')).status,401);
 assert.equal((await upload(png,'image/png','member')).status,403);
 assert.equal((await upload(Buffer.from('<script>bad</script>'),'image/png')).status,400);
 assert.equal((await upload(png,'image/svg+xml')).status,415);
 assert.equal((await upload(Buffer.alloc(0),'image/png')).status,400);
 assert.equal((await upload(Buffer.alloc(50*1024*1024+1),'video/mp4')).status,413);
 const photo=await upload(png,'image/png');assert.equal(photo.status,201);assert.match(photo.body.url,/^\/uploads\/[\w-]+\.png$/);
 const v1=await upload(mp4,'video/mp4'),v2=await upload(mp4,'video/mp4');assert.equal(v1.status,201);assert.equal(v2.status,201);assert.notEqual(v1.body.url,v2.body.url);
 const profile={name:'Criadora',username:'criadora',bio:'',avatar:photo.body.url,cover:'',photos:Array(45).fill(photo.body.url),videos:[v1,v2].map((v,i)=>({url:v.body.url,title:'Vídeo '+i,kind:'upload'})),socials:{tiktok:'criadora',instagram:'',pinterest:''},tags:['Arte'],published:false,featured:false,order:0,ageBand:'adulto',ageSource:'declarado_pelo_perfil',adultReview:{evidenceUrl:'https://www.tiktok.com/@criadora',contentReviewed:true}};
 const draft=await save(profile);assert.equal(draft.status,201,JSON.stringify(draft.body));const id=draft.body.profile.id;
 assert.equal((await (await fetch(base+'/api/people',{headers:headers()})).json()).profiles.length,0);
 assert.equal((await save({...profile,published:true,ageBand:'adolescente'},id)).status,400);
 assert.equal((await save({...profile,published:true,adultReview:{...profile.adultReview,contentReviewed:false}},id)).status,400);
 assert.equal((await save({...profile,published:true,photos:['/uploads/not-an-upload.jpg']},id)).status,400);
 const saved=await save({...profile,published:true},id);assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.profile.photos.length,45);assert.equal(saved.body.profile.videos.length,2);assert.equal(saved.body.profile.videos[0].display_mode,'reupload');assert.equal(saved.body.profile.videos[0].source_handle,'@criadora');
 const listed=await (await fetch(base+'/api/people',{headers:headers()})).json();assert.equal(listed.profiles.length,1);assert.ok(!JSON.stringify(listed).includes('evidenceUrl'));
 const quota=await fetch(base+'/api/usage/consume',{method:'POST',headers:headers()});const cookie=quota.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const served=await fetch(base+photo.body.url,{headers:{cookie}});assert.equal(served.status,200);assert.deepEqual(Buffer.from(await served.arrayBuffer()),png);
 const range=await fetch(base+v1.body.url,{headers:{cookie,range:'bytes=0-11'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,12);
 await stop();await start();assert.equal((await (await fetch(base+'/api/people',{headers:headers()})).json()).profiles[0].videos.length,2);
 console.log('Profile uploads passed: admin-only, file validation/size, multiple files, 45 photos, adult review, publication, private evidence, attribution, cookie media access, video Range and restart persistence.');
}finally{await stop();fs.rmSync(root,{recursive:true,force:true});}
