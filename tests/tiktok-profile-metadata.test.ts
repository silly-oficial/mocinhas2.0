import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import {installPeople} from '../server/people';
import type {DB} from '../server/db';
const url='https://www.tiktok.com/@rlk_levada/photo/7698298117665328405';
const state:any={peopleProfiles:[]},db={get:()=>state,save:()=>{}} as unknown as typeof DB;
const realFetch=globalThis.fetch;
globalThis.fetch=((input:any,options:any)=>String(input).startsWith('https://www.tiktok.com/oembed?')?Promise.resolve(new Response(JSON.stringify({message:'Something went wrong',code:400}),{status:400})):realFetch(input,options)) as typeof fetch;
const app=express();app.use(express.json());installPeople(app,db,(req,res,next)=>req.get('authorization')==='Bearer admin'?next():res.status(403).end());
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const addr=server.address();if(!addr||typeof addr==='string')throw Error();const base='http://127.0.0.1:'+addr.port;
async function post(route:string,body:any,method='POST'){const r=await fetch(base+route,{method,headers:{Authorization:'Bearer admin','Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
try{
 const preview=await post('/api/admin/tiktok-oembed',{url});assert.equal(preview.status,200);assert.equal(preview.body.available,null);assert.equal(preview.body.thumbnail_url,'');
 const input={name:'Creator',username:'creator',bio:'',avatar:'',cover:'',photos:[],videos:[{url,title:''}],socials:{tiktok:'rlk_levada',instagram:'',pinterest:''},tags:[],published:true,featured:false,order:0};
 const created=await post('/api/admin/people',input);assert.equal(created.status,201);assert.equal(created.body.profile.videos[0].is_still_available,null);assert.equal(created.body.profile.videos[0].source_handle,'@rlk_levada');assert.equal(created.body.profile.videos[0].display_mode,'embed');
 assert.equal((await post('/api/admin/people/'+created.body.profile.id,input,'PUT')).status,200,'saving must also accept absent metadata');
 const status=await (await fetch(base+'/api/people/'+created.body.profile.id+'/video-status/0')).json();assert.equal(status.available,null);
 assert.equal((await post('/api/admin/tiktok-oembed',{url:'https://evil.test/video/123'})).status,400);
 console.log('Observed oEmbed 400: add, save, edit and status retain canonical embed with unknown availability; invalid hosts still rejected.');
}finally{globalThis.fetch=realFetch;server.close();server.closeAllConnections();}
