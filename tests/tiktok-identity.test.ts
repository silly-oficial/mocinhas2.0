import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {resolveTikTokIdentity} from '../server/tiktok-identity';
import {installPeople} from '../server/people';
const full='https://www.tiktok.com/@creator/video/7421111111111111111';
const noNetwork=(async()=>{throw Error('Unexpected network');}) as typeof fetch;
assert.deepEqual(await resolveTikTokIdentity(full,async()=>({author_name:'Nome público'}),noNetwork),{url:full,handle:'creator',name:'Nome público',profileUrl:'https://www.tiktok.com/@creator'});
assert.equal((await resolveTikTokIdentity(full.replace('/video/','/photo/'),async()=>({author_name:'Carrossel'}),noNetwork)).name,'Carrossel');
const doc=(uniqueId='creator',nickname='Nome do perfil')=>'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.user-detail':{userInfo:{user:{uniqueId,nickname}}}}})+'</script>';
let requests=0;
const profileFetch=(async(input:any,options:any)=>{requests++;assert.equal(String(input),'https://www.tiktok.com/@creator');assert.equal(options.redirect,'error');return new Response(doc());}) as typeof fetch;
assert.equal((await resolveTikTokIdentity('https://www.tiktok.com/@creator?lang=pt',async()=>{throw Error();},profileFetch)).name,'Nome do perfil');
assert.equal(requests,1);
for(const host of ['vt','vm']){
 const transport=(async(input:any)=>String(input).includes(host+'.tiktok.com')?new Response(null,{status:302,headers:{location:full}}):new Response(doc())) as typeof fetch;
 assert.equal((await resolveTikTokIdentity('https://'+host+'.tiktok.com/abc/',async()=>({author_name:'Curto'}),transport)).handle,'creator');
}
assert.equal((await resolveTikTokIdentity('https://www.tiktok.com/@creator',async()=>({}),noNetwork)).name,null);
assert.equal((await resolveTikTokIdentity('https://www.tiktok.com/@creator',async()=>({}),(async()=>new Response(doc('wrong','Outro nome'))) as typeof fetch)).name,null);
assert.equal((await resolveTikTokIdentity('https://www.tiktok.com/@creator',async()=>({}),(async()=>new Response('<script id="SIGI_STATE">'+JSON.stringify({UserModule:{users:{creator:{uniqueId:'creator',nickname:'Antigo formato'}}}})+'</script>')) as typeof fetch)).name,'Antigo formato');
assert.equal((await resolveTikTokIdentity('https://www.tiktok.com/@creator',async()=>({}),(async()=>new Response('x'.repeat(2*1024*1024+1))) as typeof fetch)).name,null);
for(const url of ['https://evil.test/@creator','http://www.tiktok.com/@creator','https://www.tiktok.com@evil.test/@creator','https://www.tiktok.com/@creator/invalid'])await assert.rejects(()=>resolveTikTokIdentity(url,async()=>({}),noNetwork));
await assert.rejects(()=>resolveTikTokIdentity('https://vt.tiktok.com/abc/',async()=>({}),(async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/'}})) as typeof fetch));
const original=globalThis.fetch;
globalThis.fetch=(async(input:any,options:any)=>String(input).startsWith('https://www.tiktok.com/@')?profileFetch(input,options):original(input,options)) as typeof fetch;
const app=express();app.use(express.json());installPeople(app,{get:()=>({peopleProfiles:[]}),save(){}} as any,(req,res,next)=>req.get('Authorization')==='Bearer admin'?next():res.status(403).end());
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
try{
 const base='http://127.0.0.1:'+(server.address() as any).port;
 assert.equal((await fetch(base+'/api/admin/tiktok-identity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:full})})).status,403);
 const response=await fetch(base+'/api/admin/tiktok-identity',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer admin'},body:JSON.stringify({url:'https://www.tiktok.com/@creator'})});
 assert.equal(response.status,200);assert.equal((await response.json()).name,'Nome do perfil');
}finally{globalThis.fetch=original;server.close();server.closeAllConnections();}
console.log('TikTok identity passed: posts, photos, profiles, short links, missing/blocked metadata, matching identity, size limit, SSRF rejection and admin authentication. Network mocked.');
