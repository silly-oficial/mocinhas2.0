import type {PersonProfile} from './people';

// Only explicitly identified animal records participate in this migration.
// Persist the choice so restarting the service cannot reveal a hidden profile.
export function restoreAnimalVisibility(profiles:PersonProfile[]):PersonProfile[]{
 if(!profiles.some(p=>p.subjectType==='animal'&&p.hidden===undefined))return profiles;
 return profiles.map(p=>p.subjectType==='animal'&&p.hidden===undefined?{...p,hidden:false,published:true}:p);
}

export function publicationInput(input:any,existing?:PersonProfile){
 if(input.hidden!==undefined&&typeof input.hidden!=='boolean')throw Error('Visibilidade inválida.');
 const hidden=input.hidden??existing?.hidden??false;
 const animal=(existing?existing.subjectType:input.subjectType)==='animal';
 return {...input,hidden,published:hidden?false:animal?true:input.published};
}
