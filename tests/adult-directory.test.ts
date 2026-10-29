import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {adultEligible} from '../shared/profile-editorial';
import {validatePerson,installPeople} from '../server/people';
const base={name:'Criadora',username:'criadora',bio:'',avatar:'',cover:'',photos:[],videos:[],socials:{tiktok:'criadora',instagram:'',pinterest:''},tags:['Minha categoria'],published:true,featured:false,order:0,ageBand:'adulto',ageSource:'declarado_pelo_perfil',adultReview:{evidenceUrl:'https://www.tiktok.com/@criadora',contentReviewed:true}};
const adult=validatePerson(base);
assert.ok(adultEligible(adult));assert.deepEqual(adult.tags,['Minha categoria']);
for(const ageBand of ['crianca','adolescente','desconhecido'])assert.throws(()=>validatePerson({...base,ageBand}));
for(const ageSource of ['estimado','desconhecido','declarado_por_responsavel'])assert.throws(()=>validatePerson({...base,ageSource}));
assert.throws(()=>validatePerson({...base,adultReview:undefined}));
assert.throws(()=>validatePerson({...base,adultReview:{...base.adultReview,contentReviewed:false}}));
assert.throws(()=>validatePerson({...base,birthYear:new Date().getUTCFullYear()-17}));
assert.throws(()=>validatePerson({...base,adultReview:{...base.adultReview,evidenceUrl:'javascript:alert(1)'}}));
assert.doesNotThrow(()=>validatePerson({...base,published:false,ageBand:'desconhecido',adultReview:undefined}));
assert.throws(()=>validatePerson({...base,name:'Outra',adultReview:undefined},adult));
const state={peopleProfiles:[adult,{...adult,id:'old',adultReview:undefined},{...adult,id:'minor',ageBand:'adolescente'},{...adult,id:'legacy',photos:['/uploads/old.jpg']}],verificationRequests:[]};
const db={get:()=>state,save(){}} as any;
const app=express();app.use(express.json());installPeople(app,db,(_req,_res,next)=>next());
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
try{const address=server.address() as {port:number};const url='http://127.0.0.1:'+address.port;
 for(const route of ['/api/people','/api/directory-editorial']){const data=await (await fetch(url+route)).json();assert.deepEqual(data.profiles.map((p:any)=>p.id),[adult.id]);assert.ok(!JSON.stringify(data).includes('evidenceUrl'));}
 assert.equal((await fetch(url+'/api/people/minor/video-status/0')).status,404);
}finally{server.close();server.closeAllConnections();}
console.log('18+ publication validation, private evidence, legacy suppression and public endpoints passed.');
