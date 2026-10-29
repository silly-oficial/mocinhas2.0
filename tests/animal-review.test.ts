import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {validatePerson,installPeople} from '../server/people';
import {profilePublishable,adultEligible} from '../shared/profile-editorial';
const input={subjectType:'animal',name:'Gatinho',username:'gatinho',photos:[],videos:[],socials:{tiktok:'gatos'},tags:[],published:true,featured:false,order:0};
const animal=validatePerson(input);
assert.equal(animal.subjectType,'animal');assert.equal(animal.adultReview,undefined);assert.equal(adultEligible(animal),false);assert.equal(profilePublishable(animal),true);
assert.doesNotThrow(()=>validatePerson({...input,name:'Gatinho novo'},animal));
assert.throws(()=>validatePerson({...input,subjectType:undefined}));
const legacy=validatePerson({...input,subjectType:undefined,published:false});
assert.throws(()=>validatePerson({...input},legacy),'cannot relabel existing people as animals');
const state:any={peopleProfiles:[{...legacy,username:'antigo'}],verificationRequests:[]};
const app=express();app.use(express.json());installPeople(app,{get:()=>state,save(){}} as any,(_req,_res,next)=>next());
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
try{
 const base='http://127.0.0.1:'+(server.address() as any).port;
 const response=await fetch(base+'/api/admin/people',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(response.status,201);const saved=await response.json();assert.equal(saved.profile.published,true);assert.equal(saved.profile.subjectType,'animal');
 const list=await (await fetch(base+'/api/people')).json();assert.equal(list.profiles.length,1);assert.equal(list.profiles[0].subjectType,'animal');assert.equal(list.profiles[0].id,saved.profile.id);
 const update=await fetch(base+'/api/admin/people/'+saved.profile.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,name:'Gatinho atualizado'})});assert.equal(update.status,200);
}finally{server.close();server.closeAllConnections();}
console.log('Animal profiles publish and update without an 18+ review; legacy people cannot be silently converted.');
