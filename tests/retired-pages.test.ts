import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {installRetiredPages} from '../server/retired-pages';
import {TikTokPostCard} from '../src/components/TikTokPostCard';
import {ProfileVideoGrid} from '../src/components/ProfileVideos';
const app=express();installRetiredPages(app);app.get('*',(_req,res)=>res.json({app:true}));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
try{
 const base='http://127.0.0.1:'+(server.address() as any).port;
 for(const route of ['/como-funciona','/contato','/creditos','/pais','/privacidade','/termos','/versoes']){
  const response=await fetch(base+route+'/?versao=old');assert.equal(response.status,404,route);assert.ok(!(await response.text()).includes('href='));
 }
 for(const route of ['/api/directory-contact','/api/directory-settings','/api/directory-requests','/api/directory-requests/old/access','/api/legal-history','/api/legal-history/old/file','/api/admin/directory-settings','/api/admin/directory-requests','/api/admin/verification-requests','/api/admin/legal-audit'])for(const method of ['GET','POST','PATCH','PUT']){
  const response=await fetch(base+route,{method});assert.equal(response.status,404,method+' '+route);assert.deepEqual(await response.json(),{error:'Recurso não encontrado.'});
 }
 assert.equal((await fetch(base+'/api/people')).status,200,'gallery routes are not intercepted');assert.equal((await fetch(base+'/')).status,200);
 const photo='https://www.tiktok.com/@creator/photo/7421111111111111111';
 const card=renderToStaticMarkup(React.createElement(TikTokPostCard,{media:{id:'photo',type:'image',url:photo}}));
 assert.match(card,/<iframe/,'photo opens directly in the player');
 assert.ok(!/role="dialog"|<dialog|Ver publicação|Ver no perfil|Ver no TikTok|Créditos|Conteúdo do criador/.test(card),'photo has no intermediate profile modal or credit panel');
 const person:any={id:'p',username:'creator',name:'Creator',avatar:'',photos:[],videos:[],socials:{tiktok:'creator'}};
 const grid=renderToStaticMarkup(React.createElement(ProfileVideoGrid,{items:[{person,index:0,video:{url:photo,title:'Foto',kind:'social'}}]}));
 assert.ok(!/href=|Ir para o perfil|Créditos|Conteúdo do criador/.test(grid));
 console.log('Removed pages and APIs return 404; photos render directly without credit/profile prompts; media controls and gallery routes remain.');
}finally{server.close();server.closeAllConnections();}
