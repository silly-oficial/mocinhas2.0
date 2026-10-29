import type {PersonProfile} from './people';
export const ageBands={crianca:'Até 11 anos',adolescente:'12 a 17 anos',adulto:'18 anos ou mais',desconhecido:'Faixa etária não informada'} as const;
export type AgeBand=keyof typeof ageBands;
export type AgeSource='declarado_por_responsavel'|'declarado_pelo_perfil'|'estimado'|'desconhecido';
export type GuardianStatus='sem_contato'|'ciencia_declarada'|'termo_recebido'|'recusado'|'revogado';
export const editorialTraits=['arte','esporte','musica','educacao','humor','viagem'] as const;
export interface SourceSnapshot {capturedAt:string;canonicalUrl:string;handle:string;oembedOkAt:string|null;publiclyAccessible:true|null}
// Never infer adulthood from appearance, an embed or a year-only calculation.
export function adultEligible(p:Pick<PersonProfile,'ageBand'|'ageSource'|'adultReview'|'birthYear'>,now=new Date()){
 return p.ageBand==='adulto'&&p.ageSource==='declarado_pelo_perfil'&&!!p.adultReview?.evidenceUrl&&p.adultReview.contentReviewed===true&&(p.birthYear==null||now.getUTCFullYear()-p.birthYear>=18);
}
export function ageValues(birthYear:number|null,band:AgeBand='desconhecido',now=new Date()){
 const age=birthYear===null?null:now.getUTCFullYear()-birthYear;
 return {ageAtCapture:age,ageUpdatedAt:now.toISOString(),ageBand:age===null?band:age<12?'crianca' as const:age<18?'adolescente' as const:'adulto' as const};
}
export function ageLabel(p:Pick<PersonProfile,'birthYear'|'ageBand'|'ageUpdatedAt'|'ageSource'>,now=new Date()){
 let origin:string;
 if(p.ageSource==='estimado')origin='Idade estimada pela curadoria, pode estar errada; sem comprovação';
 else if(p.ageSource==='declarado_por_responsavel')origin='Informada pelo responsável, sem verificação documental';
 else if(p.ageSource==='declarado_pelo_perfil')origin='Informada pelo perfil, sem verificação documental';
 else if(p.ageSource==='desconhecido')origin='Origem da idade desconhecida, sem verificação';
 else origin='Origem da idade desconhecida, sem verificação';
 if(p.birthYear==null)return `${origin} · ${ageBands[p.ageBand||'desconhecido']}`;
 const upper=now.getUTCFullYear()-p.birthYear;
 return `${origin} · Idade aproximada: ${Math.max(0,upper-1)} a ${upper} anos · em ${now.toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric',timeZone:'UTC'})}`;
}
export function editorialFields(input:Record<string,unknown>,existing:PersonProfile|undefined,now=new Date()){
 const birthYear=input.birthYear===undefined?existing?.birthYear??null:input.birthYear;
 if(birthYear!==null&&(!Number.isInteger(birthYear)||typeof birthYear!=='number'||birthYear<1900||birthYear>now.getUTCFullYear()))throw Error('Informe somente o ano de nascimento, entre 1900 e o ano atual.');
 const band=input.ageBand??existing?.ageBand??'desconhecido';
 if(typeof band!=='string'||!Object.hasOwn(ageBands,band))throw Error('Faixa etária inválida.');
 const source=input.ageSource??existing?.ageSource??'desconhecido';
 if(!['declarado_por_responsavel','declarado_pelo_perfil','estimado','desconhecido'].includes(String(source)))throw Error('Origem da idade inválida.');
 const status=input.guardianStatus??existing?.guardianStatus??'sem_contato';
 if(!['sem_contato','ciencia_declarada','termo_recebido','recusado','revogado'].includes(String(status)))throw Error('Situação do responsável inválida.');
 function field(key:string,max:number){const value=input[key]??(existing as unknown as Record<string,unknown>|undefined)?.[key]??'';if(typeof value!=='string'||value.length>max)throw Error('Confira os campos editoriais.');return value.trim();}
 const guardianEmail=field('guardianEmail',254);if(guardianEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail))throw Error('E-mail do responsável inválido.');
 const traits=input.traits??existing?.traits??[];
 if(!Array.isArray(traits)||traits.some(t=>typeof t!=='string'||!editorialTraits.includes(t as typeof editorialTraits[number])))throw Error('Use somente os temas editoriais disponíveis.');
 const rankingCriteria=field('rankingCriteria',1000);
 const values=ageValues(birthYear as number|null,band as AgeBand,now);
 const rawReview=input.adultReview;
 let adultReview=existing?.adultReview;
 if(rawReview!==undefined){
  if(!rawReview||typeof rawReview!=='object')throw Error('Revisão de maioridade inválida.');
  const review=rawReview as Record<string,unknown>;
  if(typeof review.evidenceUrl!=='string'||review.evidenceUrl.length>2048||typeof review.contentReviewed!=='boolean')throw Error('Informe a fonte da maioridade e revise as mídias.');
  if(review.evidenceUrl){const url=new URL(review.evidenceUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use uma fonte pública https para a maioridade.');}
  adultReview={evidenceUrl:review.evidenceUrl.trim(),contentReviewed:review.contentReviewed};
 }
 if(input.published===true&&!adultEligible({...values,birthYear:birthYear as number|null,ageSource:source as AgeSource,adultReview},now))throw Error('Publicação restrita a adultos: registre a fonte de declaração de maioridade do perfil e confirme 18+ em todas as mídias, inclusive na gravação.');
 return {adultReview,birthYear:birthYear as number|null,...values,ageSource:source as AgeSource,guardianStatus:status as GuardianStatus,guardianName:field('guardianName',120),guardianRelation:field('guardianRelation',80),guardianEmail,ownershipVerified:existing?.ownershipVerified??false,guardianAuthorized:status==='termo_recebido',rankingCriteria,rankingUpdatedAt:rankingCriteria!==existing?.rankingCriteria?now.toISOString():existing?.rankingUpdatedAt??null,sourceSnapshot:existing?.sourceSnapshot??null,availabilityHistory:existing?.availabilityHistory?.slice(0,50)??[],traits:[...new Set(traits)] as string[],identityRevision:existing?.identityRevision??0};
}
export function availabilityHistory(rows:{checkedAt:string;available:boolean|null}[]){
 const unique=new Map<string,{checkedAt:string;available:boolean|null}>();
 for(const row of rows)if(Number.isFinite(Date.parse(row.checkedAt)))unique.set(row.checkedAt+'|'+String(row.available),row);
 return [...unique.values()].sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt)).slice(0,50);
}
