import React from 'react';
import {ageBands,ageValues,type AgeBand,type AgeSource} from '../../shared/profile-editorial';
import type {PersonProfile} from '../../shared/people';

// Legacy profiles retain their publication requirements and must be reviewable.
export function LegacyProfileReview({profile,onChange}:{profile:Partial<PersonProfile>;onChange:(values:Partial<PersonProfile>)=>void}){
 if(profile.subjectType==='animal')return null;
 const review=profile.adultReview??{evidenceUrl:'',contentReviewed:false};
 function revise(values:Partial<PersonProfile>){onChange({...values,adultReview:{...review,contentReviewed:false}});}
 return <section className="legacy-profile-review" aria-label="Revisão de publicação do perfil antigo">
  <h3>Revisão de publicação do perfil antigo</h3>
  <p>Para reativar este cadastro, informe a declaração de maioridade do perfil e revise todas as mídias. Depois, selecione “Deixar visível” se estiver oculto e salve.</p>
  <div className="people-form-grid">
   <label>Ano de nascimento (opcional)<input type="number" min={1900} max={new Date().getUTCFullYear()} value={profile.birthYear??''} onChange={e=>{const birthYear=e.target.value===''?null:Number(e.target.value);revise({birthYear,...ageValues(birthYear,profile.ageBand)});}}/></label>
   <label>Faixa etária<select value={profile.ageBand??'desconhecido'} disabled={profile.birthYear!=null} onChange={e=>revise({ageBand:e.target.value as AgeBand})}>{Object.entries(ageBands).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>Origem da idade<select value={profile.ageSource??'desconhecido'} onChange={e=>revise({ageSource:e.target.value as AgeSource})}><option value="desconhecido">Não informada</option><option value="declarado_pelo_perfil">Declarada pelo próprio perfil</option><option value="declarado_por_responsavel">Declarada pelo responsável</option><option value="estimado">Estimada</option></select></label>
   <label>Link da declaração de maioridade<input type="url" maxLength={2048} value={review.evidenceUrl} placeholder="https://…" onChange={e=>onChange({adultReview:{evidenceUrl:e.target.value,contentReviewed:false}})}/></label>
  </div>
  <label className="people-check"><input type="checkbox" checked={review.contentReviewed} onChange={e=>onChange({adultReview:{...review,contentReviewed:e.target.checked}})}/>Conferi a fonte e confirmei 18 anos ou mais em todas as mídias, inclusive na gravação.</label>
 </section>;
}
