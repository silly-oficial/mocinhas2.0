import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import jwt from 'jsonwebtoken';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-people-')),secret='people-integration-secret',port=3063;
const users=['owner','viewer'].map(id=>({id,username:id,displayName:id,email:id+'@test.invalid',isAdmin:id==='owner',passwordHash:'',avatar:'',bio:'',banner:'',isPrivate:false,isVerified:false,animeTitle:'',themeColor:'',website:'',createdAt:new Date().toISOString()}));
fs.writeFileSync(path.join(root,'db.json'),JSON.stringify({users,posts:[]}));let server;
async function start(){server=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',DATA_DIR:root,PORT:String(port),JWT_SECRET:secret},stdio:'ignore'});for(let i=0;i<100;i++){try{await fetch(`http://127.0.0.1:${port}`);return;}catch{await new Promise(r=>setTimeout(r,50));}}throw Error('server failed');}
async function stop(){if(server){server.kill();await new Promise(r=>server.once('exit',r));server=null;}}
async function call(route,method='GET',body,who='owner'){const res=await fetch(`http://127.0.0.1:${port}${route}`,{method,headers:{'content-type':'application/json',...(who?{authorization:'Bearer '+jwt.sign({userId:who},secret)}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json()};}
const person={name:'Pessoa Teste',username:'pessoa.teste',bio:'Bio do perfil',avatar:'https://example.com/photo.jpg',cover:'',photos:['https://example.com/gallery.jpg'],videos:[{url:'https://www.tiktok.com/@pessoa/video/6718335390845095173',title:'Apresentação'},{url:'https://www.instagram.com/reel/TEST123/',title:'Reel'}],socials:{tiktok:'pessoa',instagram:'pessoa',pinterest:'pessoa'},tags:['Música'],published:false,featured:false,order:10};
try{
 await start();assert.equal((await call('/api/people','GET',undefined,'')).status,401);assert.equal((await call('/api/admin/people','GET',undefined,'viewer')).status,403);assert.equal((await call('/api/admin/people','POST',person,'viewer')).status,403);
 const created=await call('/api/admin/people','POST',person);assert.equal(created.status,201);const id=created.body.profile.id;
 assert.equal((await call('/api/people','GET',undefined,'viewer')).body.profiles.length,0,'draft must remain private');
 assert.equal((await call('/api/admin/people','POST',person)).status,409);assert.equal((await call('/api/admin/people/not-found','PUT',person)).status,404);
 const published=await call('/api/admin/people/'+id,'PUT',{...person,published:true});assert.equal(published.status,200);
 assert.equal((await call('/api/people','GET',undefined,'viewer')).body.profiles[0].username,'pessoa.teste');
 assert.equal((await call('/api/admin/people/'+id,'PUT',{...person,published:true,videos:[{url:'https://tiktok.com.evil.test/@x/video/6718335390845095173',title:''}]})).status,400);
 assert.equal((await call('/api/admin/people/'+id,'PUT',{...person,published:true,avatar:'javascript:alert(1)'})).status,400);
 assert.equal((await call('/api/admin/people/'+id,'PUT',{...person,published:true,socials:{...person.socials,instagram:'https://evil.test'}})).status,400);
 assert.equal((await call('/api/admin/people/'+id,'PUT',{...person,published:true,photos:Array(57).fill('https://example.com/a.jpg')})).status,200);
 const native=await call('/api/admin/people/'+id,'PUT',{...person,published:true,videos:[{url:'/uploads/test_video.mp4',title:'Enviado',kind:'upload'}],tags:['Música',' música ','Moda','  moda  ']});assert.equal(native.status,200);assert.equal(native.body.profile.videos[0].kind,'upload');assert.deepEqual(native.body.profile.tags,['Música','Moda']);
 assert.equal((await call('/api/admin/people/'+id,'PUT',{...person,published:true,videos:[{url:'javascript:alert(1)',title:'',kind:'upload'}]})).status,400);
 assert.equal((await call('/api/admin/people/'+id,'PUT',{...person,published:true,videos:[{url:'/uploads/file.html',title:'',kind:'upload'}]})).status,400);
 const second=await call('/api/admin/people','POST',{...person,name:'Destaque',username:'destaque',published:true,featured:true,order:999});assert.equal(second.status,201);
 assert.equal((await call('/api/people','GET',undefined,'viewer')).body.profiles[0].username,'destaque');
 await stop();await start();assert.equal((await call('/api/people','GET',undefined,'viewer')).body.profiles.length,2,'persist across restart');
 assert.equal((await call('/api/admin/people/'+id,'DELETE',undefined,'viewer')).status,403);assert.equal((await call('/api/admin/people/'+id,'DELETE')).status,200);
 assert.equal((await call('/api/people','GET',undefined,'viewer')).body.profiles.length,1);assert.equal((await call('/api/admin/people/'+id,'DELETE')).status,404);
 assert.equal((await call('/api/admin/usage-settings','PUT',{dailyMinutes:1,bindNetwork:false})).status,200);
 assert.equal((await call('/api/people','GET',undefined,'viewer')).status,429,'profiles must obey the app quota');
 assert.equal((await call('/api/usage/consume','POST',{},'viewer')).status,200);
 assert.equal((await call('/api/people','GET',undefined,'viewer')).status,200);
 const otherData=JSON.parse(fs.readFileSync(path.join(root,'db.json')));assert.equal(otherData.users.length,2);assert.deepEqual(otherData.posts,[]);
 console.log('People passed: admin CRUD, private drafts, publication, featured ordering, validated links/media, persistence and isolation from accounts/posts.');
}finally{await stop();fs.rmSync(root,{recursive:true,force:true});}

