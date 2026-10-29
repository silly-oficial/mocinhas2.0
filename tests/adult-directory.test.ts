import assert from 'node:assert/strict';
import {validatePerson} from '../server/people';
import {profilePublishable} from '../shared/profile-editorial';
const base={name:'Perfil',username:'perfil',photos:[],videos:[],socials:{tiktok:''},tags:[],published:true,featured:false,order:0};
for(const subjectType of [undefined,'animal']){
 const profile=validatePerson({...base,subjectType});assert.equal(profile.published,true);assert.equal(profilePublishable(profile),true);assert.equal(profile.adultReview,undefined);
 assert.doesNotThrow(()=>validatePerson({...profile,name:'Atualizado'},profile));
}
assert.equal(validatePerson({...base,hidden:true}).published,false);
console.log('Gallery publication is independent of legacy demographic metadata.');
