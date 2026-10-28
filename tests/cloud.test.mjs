import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { spawn } from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-cloud-'));
let row=null, rejectWrites=false, hold=null, commitStarted=false, child, logs='';const media=new Map();
const fake=express();fake.use(express.json());
fake.get('/rest/v1/mocinhas_app_state',(_,res)=>res.json(row?[row]:[]));
fake.post('/rest/v1/mocinhas_app_state',(req,res)=>{if(row)return res.status(409).json({code:'23505'});row=req.body;res.status(201).end();});
fake.post('/rest/v1/rpc/mocinhas_commit_state',async(req,res)=>{
 commitStarted=true;if(hold)await hold;
 if(rejectWrites || req.body.expected_revision!==row.revision)return res.status(409).json({code:'40001',message:'Revision conflict'});
 row={...row,payload:req.body.next_payload,revision:row.revision+1};res.json(row.revision);
});
fake.post('/storage/v1/object/mocinhas-media/*',express.raw({type:()=>true,limit:'5mb'}),(req,res)=>{media.set(req.params[0],req.body);res.json({Key:'mocinhas-media/'+req.params[0]});});
fake.post('/storage/v1/object/sign/mocinhas-media/:name',(req,res)=>res.json({signedURL:'/object/sign/mocinhas-media/'+req.params.name+'?token=mock'}));
fake.get('/storage/v1/object/sign/mocinhas-media/:name',(req,res)=>{const bytes=media.get(req.params.name);if(!bytes)return res.sendStatus(404);res.setHeader('Content-Type','application/octet-stream');res.setHeader('Accept-Ranges','bytes');if(req.headers.range){res.status(206);res.setHeader('Content-Range',`bytes 0-2/${bytes.length}`);return res.send(bytes.subarray(0,3));}res.send(bytes);});
const provider=await new Promise(resolve=>{const s=fake.listen(0,'127.0.0.1',()=>resolve(s));});
const base='http://127.0.0.1:3149',remote='http://127.0.0.1:'+provider.address().port;
async function start(cache,bootstrap=true){logs='';child=spawn(process.execPath,['--import',path.resolve('tests/helpers/tiktok-fixture.mjs'),'dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',PORT:'3149',STORAGE_BACKEND:'supabase',SUPABASE_URL:remote,SUPABASE_SERVICE_ROLE_KEY:'server-only-test-secret',SUPABASE_ANON_KEY:'',LOCAL_CACHE_DIR:path.join(root,cache),INITIAL_ADMIN_EMAIL:bootstrap?'owner@example.test':'',INITIAL_ADMIN_PASSWORD:bootstrap?'safe-testing-password-123':'',JWT_SECRET:'cloud-test-jwt-secret'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(logs);try{await fetch(base);return;}catch{await new Promise(r=>setTimeout(r,50));}}throw Error('Startup timeout: '+logs);}
async function stop(){if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}}
let token='';async function call(url,body){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return{status:r.status,body:await r.json()};}
try {
 await start('cache-1');assert.equal(row.payload.users.length,1);assert.equal(row.payload.posts.length,0,'no demo posts');
 token=(await call('/api/auth/login',{identifier:'admin',password:'safe-testing-password-123'})).body.token;assert.ok(token,'admin login');
 const conf=await call('/api/supabase/public-config');assert.equal(conf.body.anonKey,'');assert.ok(!JSON.stringify(conf).includes('server-only-test-secret'));
 const form=new FormData();form.append('file',new Blob(['media-data'],{type:'image/png'}),'photo.png');
 const upload=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});const asset=await upload.json();assert.equal(upload.status,410);assert.equal([...media.keys()].filter(key=>!key.startsWith('legal-versions/')).length,0);asset.url='/uploads/legacy.png';media.set('legacy.png',Buffer.from('media-data'));
 let release;hold=new Promise(r=>release=r);commitStarted=false;let acknowledged=false;
 const postRequest=call('/api/posts',{caption:'Durable #teste',media:[{source_handle:'fixture.creator',type:'image',url:'https://www.tiktok.com/@fixture.creator/photo/7421111111111111111'}]}).then(r=>{acknowledged=true;return r;});
 for(let i=0;i<100&&!commitStarted;i++)await new Promise(r=>setTimeout(r,10));assert.equal(commitStarted,true);assert.equal(acknowledged,false,'no success before database commit');release();hold=null;
 assert.equal((await postRequest).status,200);assert.equal(row.payload.posts.length,1);
 const mediaResponse=await fetch(base+asset.url,{headers:{Authorization:'Bearer '+token,Range:'bytes=0-2'}});assert.equal(mediaResponse.status,206);assert.equal(await mediaResponse.text(),'med');
 const originalUser=row.payload.users[0].id;await stop();
 await start('completely-new-cache',false);assert.equal(row.payload.users[0].id,originalUser);assert.equal((await call('/api/posts')).body.posts.length,1);
 assert.equal(await (await fetch(base+asset.url,{headers:{Authorization:'Bearer '+token}})).text(),'media-data','media survives fresh cache');
 rejectWrites=true;const rejected=await call('/api/posts',{caption:'Must not acknowledge',media:[{source_handle:'fixture.creator',type:'image',url:'https://www.tiktok.com/@fixture.creator/photo/7421111111111111111'}]});assert.equal(rejected.status,503);assert.equal(row.payload.posts.length,1);assert.equal((await call('/api/posts')).status,503,'no uncommitted local fallback');
 await stop();rejectWrites=false;await start('cache-3',false);assert.equal((await call('/api/posts')).body.posts.length,1);
 console.log('Cloud passed: first admin without demos; commit-before-ack; restart with empty local cache; persisted media/ranges; no service key exposure; revision conflict fails closed; remote data retained. Mock Supabase only.');
}finally{await stop();await new Promise(r=>provider.close(r));fs.rmSync(root,{recursive:true,force:true});}


