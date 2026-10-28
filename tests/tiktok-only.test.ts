import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {installPeople,validatePerson} from '../server/people';
import {installDirectoryRequests} from '../server/directory-requests';
import {sendEmail} from '../server/directory-email';
import {CreditsPage,DirectorySafetyFooter} from '../src/components/DirectorySafety';
import {TikTokPostCard} from '../src/components/TikTokPostCard';
import {creditsSections} from '../shared/credits';
import type {DB} from '../server/db';
const photo='https://www.tiktok.com/@creator/photo/7421111111111111111';
const input={name:'Creator',username:'creator',bio:'',avatar:'',cover:'',photos:[],videos:[{url:photo,title:'Photos',thumbnail:'https://evil.invalid/spoof.jpg',source_handle:'@spoof'}],socials:{tiktok:'creator',instagram:'',pinterest:''},tags:[],published:true,featured:false,order:0};
for(const patch of [{avatar:'https://example.invalid/image.jpg'},{photos:['/uploads/photo.png']},{videos:[{url:'/uploads/video.mp4',title:'Upload',kind:'upload'}]},{videos:[{url:'https://www.instagram.com/reel/abcd/',title:'Instagram'}]}])assert.throws(()=>validatePerson({...input,...patch}));
const legacy:any={...input,id:'legacy',avatar:'/uploads/old.jpg',photos:Array(57).fill('/uploads/old.jpg'),videos:[{url:'/uploads/old.mp4',title:'Old',kind:'upload'}]};
assert.equal(validatePerson(legacy,legacy).photos.length,57,'legacy photos remain editable without truncation');
const state:any={peopleProfiles:[],directorySettings:{contactEmail:'contact@example.invalid'}};const db={get:()=>state,save:()=>{}} as unknown as typeof DB;
const realFetch=globalThis.fetch;
globalThis.fetch=((url:any,options:any)=>String(url).startsWith('https://www.tiktok.com/oembed?')?Promise.resolve(new Response(JSON.stringify({thumbnail_url:'https://cdn.example.invalid/photo.jpg',author_url:'https://www.tiktok.com/@creator',author_name:'Creator'}))):realFetch(url,options)) as typeof fetch;
const app=express();app.use(express.json());const admin:express.RequestHandler=(req,res,next)=>req.get('authorization')==='Bearer admin'?next():res.status(403).end();installPeople(app,db,admin);installDirectoryRequests(app,db,admin);
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error();const base='http://127.0.0.1:'+address.port;
async function call(route:string,body:unknown,method='POST'){const r=await fetch(base+route,{method,headers:{Authorization:'Bearer admin','Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
try{
 const saved=await call('/api/admin/people',input);assert.equal(saved.status,201);const video=saved.body.profile.videos[0];assert.equal(video.source_handle,'@creator');assert.equal(video.thumbnail,'https://cdn.example.invalid/photo.jpg');assert.equal(video.display_mode,'embed');assert.equal(saved.body.profile.avatar,video.thumbnail);
 const created=await call('/api/directory-requests',{responsibleName:'Creator',email:'creator@example.invalid',handle:'creator',type:'remover_conteudo',observations:photo,documentUrl:''});assert.equal(created.status,201);
 const route='/api/admin/directory-requests/'+created.body.id;
 assert.equal((await call(route,{status:'resolved',adminNote:'Private internal note'},'PATCH')).status,400,'no claim of removal without the actual action');
 assert.equal((await call(route,{status:'resolved',adminNote:'Private internal note',publicResult:'Crédito corrigido.'},'PATCH')).status,200);
 const job=state.directoryEmailOutbox.find((j:any)=>j.template==='request_completed');
 const oldKey=process.env.RESEND_API_KEY,oldFrom=process.env.EMAIL_FROM;process.env.RESEND_API_KEY='fake';process.env.EMAIL_FROM='sender@example.invalid';
 try{await sendEmail(job,(async(_url:any,options:any)=>{const email=JSON.parse(options.body);assert.equal(email.subject,'Sobre o seu pedido no Mocinhas');assert.match(email.text,/Já tomamos a providência: Crédito corrigido/);assert.ok(!email.text.includes('Private internal note'));assert.equal(email.reply_to,'contact@example.invalid');return new Response(JSON.stringify({id:'fixture'}));}) as typeof fetch);}finally{if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey;if(oldFrom===undefined)delete process.env.EMAIL_FROM;else process.env.EMAIL_FROM=oldFrom;}
 const html=renderToStaticMarkup(React.createElement(TikTokPostCard,{media:{id:'photo',url:photo,type:'image',thumbnail:video.thumbnail}}));assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('<video'));assert.match(html,/Conteúdo do criador original/);assert.match(html,/Conteúdo do criador original/);
 const page=renderToStaticMarkup(React.createElement(CreditsPage));for(const section of creditsSections)assert.ok(page.includes(section.title));assert.match(page,/Créditos e Remoção/);
 const footer=renderToStaticMarkup(React.createElement(DirectorySafetyFooter));assert.match(footer,/Todo o conteúdo do Mocinhas é de autoria dos criadores originais/);assert.match(footer,/href="\/creditos"/);assert.ok(!footer.includes('MEU-EMAIL@EXEMPLO.COM'));
 console.log('TikTok-only profiles, legacy preservation, canonical attribution, lazy media card, credits/footer and result email passed. External transports mocked; no email sent.');
}finally{globalThis.fetch=realFetch;server.close();server.closeAllConnections();}
