import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import {installPeople,validatePerson} from '../server/people';
const input={name:'Perfil antigo',username:'antigo',avatar:'',cover:'',photos:[],videos:[],tags:[],socials:{tiktok:'antigo'},published:false,featured:false,order:0};
const legacy={...validatePerson(input),hidden:true,published:false,photos:['/uploads/old.jpg'],adultReview:undefined,guardianName:'PRIVATE',guardianEmail:'private@example.invalid'};
let state:any={peopleProfiles:[legacy],verificationRequests:[]};let persisted=structuredClone(state);
const db={get:()=>state,save(){persisted=structuredClone(state);}} as any;
function start(){const app=express();app.use(express.json());installPeople(app,db,(_req,_res,next)=>next());return app.listen(0,'127.0.0.1');}
let server=start();await once(server,'listening');
const base=()=>`http://127.0.0.1:${(server.address() as any).port}`;
async function list(){return (await (await fetch(base()+'/api/people')).json()).profiles;}
async function save(profile:any){const response=await fetch(base()+'/api/admin/people/'+legacy.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)});const body=await response.json();assert.equal(response.status,200,body.error);return body.profile;}
try{
 assert.equal(state.publicGalleryRestoredV1,true);
 assert.equal((await list())[0].id,legacy.id,'existing profiles are restored automatically');
 assert.deepEqual((await list())[0].photos,legacy.photos,'old media paths do not suppress the gallery');
 const publicRecord=(await list())[0];for(const field of ['guardianEmail','guardianName','guardianAuthorized','birthYear','ageBand','ageSource','adultReview'])assert.equal(field in publicRecord,false,'internal field: '+field);
 let profile=await save({...state.peopleProfiles[0],name:'Nome atualizado'});assert.equal((await list()).length,1,'editing publishes without an additional review');
 assert.equal(profile.subjectType,undefined,'restoration preserves record type');
 profile=await save({...profile,hidden:true});assert.deepEqual(await list(),[]);
 server.close();server.closeAllConnections();await once(server,'close');
 state=structuredClone(persisted);server=start();await once(server,'listening');
 assert.deepEqual(await list(),[],'one-time restoration never overrides later hiding on restart');
 profile=await save({...profile,hidden:false});assert.equal((await list()).length,1);
 server.close();server.closeAllConnections();await once(server,'close');
 state=structuredClone(persisted);server=start();await once(server,'listening');assert.equal((await list())[0].id,legacy.id,'reactivation survives restart');
}finally{server.close();server.closeAllConnections();}
const before={peopleProfiles:[legacy]};const app=express();assert.throws(()=>installPeople(app,{get:()=>before,save(){throw Error('storage failed');}} as any,(_req,_res,next)=>next()));assert.strictEqual(before.peopleProfiles[0],legacy);assert.equal((before as any).publicGalleryRestoredV1,undefined,'failed migration must roll back its marker');
console.log('Legacy gallery: automatic restoration, media preservation, private metadata, hide/reveal, restart and rollback passed.');
