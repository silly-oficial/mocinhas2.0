import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LegacyProfileReview} from '../src/components/LegacyProfileReview';
import {installPeople,validatePerson} from '../server/people';

const legacy=validatePerson({name:'Perfil antigo',username:'antigo',avatar:'',cover:'',photos:[],videos:[],tags:[],socials:{tiktok:'antigo'},published:false,featured:false,order:0});
const markup=renderToStaticMarkup(React.createElement(LegacyProfileReview,{profile:legacy,onChange(){}}));
for(const field of ['Faixa etária','Origem da idade','Link da declaração de maioridade','type="checkbox"'])assert.ok(markup.includes(field),field+' must be available for old profiles');
assert.equal(renderToStaticMarkup(React.createElement(LegacyProfileReview,{profile:{subjectType:'animal'},onChange(){}})),'');
let state:any={peopleProfiles:[legacy],verificationRequests:[]};
let persisted=structuredClone(state);
const db={get:()=>state,save(){persisted=structuredClone(state);}} as any;
function start(){const app=express();app.use(express.json());installPeople(app,db,(_req,_res,next)=>next());return app.listen(0,'127.0.0.1');}
let server=start();await once(server,'listening');
const base=()=>`http://127.0.0.1:${(server.address() as any).port}`;
async function list(){return (await (await fetch(base()+'/api/people')).json()).profiles;}
async function save(profile:any){const response=await fetch(base()+'/api/admin/people/'+legacy.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)});const body=await response.json();assert.equal(response.status,200,body.error);return body.profile;}
try{
 assert.deepEqual(await list(),[]);
 const adultReview={evidenceUrl:'https://www.tiktok.com/@antigo',contentReviewed:true};
 let profile=await save({...legacy,hidden:false,published:true,ageBand:'adulto',ageSource:'declarado_pelo_perfil',adultReview});
 assert.deepEqual((await list()).map((p:any)=>p.id),[legacy.id],'reviewed legacy profile must become public after saving');
 assert.equal(profile.subjectType,undefined,'reactivation must preserve the legacy record type');
 profile=await save({...profile,hidden:true,published:false});assert.deepEqual(await list(),[]);
 profile=await save({...profile,hidden:false,published:true});assert.equal((await list()).length,1,'reactivate after explicit hiding');
 server.close();server.closeAllConnections();await once(server,'close');
 state=structuredClone(persisted);server=start();await once(server,'listening');
 assert.equal((await list())[0].id,legacy.id,'reactivation survives restart');
 const response=await fetch(base()+'/api/admin/people/'+legacy.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...profile,adultReview:{...adultReview,contentReviewed:false}})});
 assert.equal(response.status,400,'incomplete review cannot publish');
}finally{server.close();server.closeAllConnections();}
console.log('Legacy reactivation passed: review controls, publication, hide/reveal and persistence.');
