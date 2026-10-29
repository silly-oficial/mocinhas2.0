import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {installPeople,validatePerson} from '../server/people';
import {TikTokPostCard} from '../src/components/TikTokPostCard';
import type {DB} from '../server/db';
const photo='https://www.tiktok.com/@creator/photo/7421111111111111111';
const input={name:'Creator',username:'creator',bio:'',avatar:'',cover:'',photos:[],videos:[{url:photo,title:'Photos',thumbnail:'https://evil.invalid/spoof.jpg',source_handle:'@spoof'}],socials:{tiktok:'creator',instagram:'',pinterest:''},tags:[],birthYear:2000,published:true,featured:false,order:0};
for(const patch of [{avatar:'https://example.invalid/image.jpg'},{photos:['/uploads/photo.png']},{videos:[{url:'/uploads/video.mp4',title:'Upload',kind:'upload'}]},{videos:[{url:'https://www.instagram.com/reel/abcd/',title:'Instagram'}]}])assert.throws(()=>validatePerson({...input,...patch}));
const legacy:any={...input,id:'legacy',avatar:'/uploads/old.jpg',photos:Array(57).fill('/uploads/old.jpg'),videos:[{url:'/uploads/old.mp4',title:'Old',kind:'upload'}]};
assert.equal(validatePerson(legacy,legacy).photos.length,57,'legacy photos remain editable without truncation');
const state:any={peopleProfiles:[],directorySettings:{contactEmail:'contact@example.invalid'}};const db={get:()=>state,save:()=>{}} as unknown as typeof DB;
const realFetch=globalThis.fetch;
globalThis.fetch=((url:any,options:any)=>String(url).startsWith('https://www.tiktok.com/oembed?')?Promise.resolve(new Response(JSON.stringify({thumbnail_url:'https://cdn.example.invalid/photo.jpg',author_url:'https://www.tiktok.com/@creator',author_name:'Creator'}))):realFetch(url,options)) as typeof fetch;
const app=express();app.use(express.json());const admin:express.RequestHandler=(req,res,next)=>req.get('authorization')==='Bearer admin'?next():res.status(403).end();installPeople(app,db,admin);
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error();const base='http://127.0.0.1:'+address.port;
async function call(route:string,body:unknown,method='POST'){const r=await fetch(base+route,{method,headers:{Authorization:'Bearer admin','Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
try{
 const saved=await call('/api/admin/people',input);assert.equal(saved.status,201);const video=saved.body.profile.videos[0];assert.equal(video.source_handle,'@creator');assert.equal(video.thumbnail,'https://cdn.example.invalid/photo.jpg');assert.equal(video.display_mode,'embed');assert.equal(saved.body.profile.avatar,'/profile-placeholder.svg','an unselected avatar keeps its placeholder');
 const html=renderToStaticMarkup(React.createElement(TikTokPostCard,{media:{id:'photo',url:photo,type:'image',thumbnail:video.thumbnail}}));assert.ok(html.includes('<iframe'));assert.ok(!html.includes('<video'));assert.ok(!html.includes('Conteúdo do criador original'));assert.ok(!html.includes('Conteúdo do criador original'));
 console.log('TikTok profiles preserve canonical metadata and render photos directly without credit panels. External transport mocked.');
}finally{globalThis.fetch=realFetch;server.close();server.closeAllConnections();}
