import type express from 'express';
import {randomUUID} from 'node:crypto';
import type {DB} from './db';
import type {DirectoryRequest} from '../shared/directory-requests';
import type {PersonProfile} from '../shared/people';
import type {VerificationStatus} from '../shared/verification';
import {enqueueEmail} from './directory-email';
import {appendLegalAudit} from './legal-audit';
export function isProfileVerified(db:typeof DB,profile:PersonProfile){
 return (db.get().verificationRequests||[]).some(row=>(row.purpose??'ownership')==='ownership'&&row.profileId===profile.id&&row.status==='aprovado'&&row.boundTikTok===profile.socials.tiktok.toLowerCase()&&(row.boundIdentityRevision??0)===(profile.identityRevision??0));
}
export function addVerificationRequest(db:typeof DB,request:DirectoryRequest){
 if(!['reivindicar_perfil','autorizar_oficialmente'].includes(request.type))return;
 const profile=db.get().peopleProfiles?.find(profile=>[profile.username,profile.socials.tiktok].some(handle=>handle.replace(/^@/,'').toLowerCase()===request.handle));
 db.get().verificationRequests=[...(db.get().verificationRequests||[]),{id:randomUUID(),requestId:request.id,profileId:profile?.id||'',requesterName:request.responsibleName,requesterEmail:request.email,handle:request.handle,purpose:request.type==='reivindicar_perfil'?'ownership':'guardian',status:'recebido',termDocUrl:request.documentUrl,notes:'',createdAt:request.createdAt}];
}
export function installVerification(app:express.Express,db:typeof DB,admin:express.RequestHandler){
 app.get('/api/admin/verification-requests',admin,(_req,res)=>res.set('Cache-Control','no-store').json({requests:[...(db.get().verificationRequests||[])].reverse()}));
 app.patch('/api/admin/verification-requests/:id',admin,(req,res)=>{
  res.set('Cache-Control','no-store');const rows=db.get().verificationRequests||[],current=rows.find(row=>row.id===req.params.id);
  if(!current)return res.status(404).json({error:'Pedido não encontrado.'});
  const transitions:Record<VerificationStatus,readonly string[]>={recebido:['em_analise','recusado'],em_analise:['aprovado','recusado'],aprovado:['revogado'],recusado:[],revogado:[]};
  const requested:unknown=req.body?.status;if(typeof requested!=='string'||!transitions[current.status].includes(requested))return res.status(400).json({error:'Transição inválida. Inicie nova solicitação para análise encerrada.'});
  const status=requested as VerificationStatus,purpose=current.purpose??'ownership';
  const profileId=status==='revogado'?current.profileId:typeof req.body.profileId==='string'?req.body.profileId:current.profileId;
  const profile=db.get().peopleProfiles?.find(row=>row.id===profileId);
  const termDocUrl=status==='revogado'?current.termDocUrl:typeof req.body.termDocUrl==='string'?req.body.termDocUrl.trim():current.termDocUrl;
  const notes=typeof req.body.notes==='string'?req.body.notes.trim():'';
  if(notes.length>3000||termDocUrl.length>2048)return res.status(400).json({error:'Texto muito longo.'});
  if(termDocUrl){try{const url=new URL(termDocUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{return res.status(400).json({error:'Use link HTTPS para o termo.'});}}
  if(status==='aprovado'&&(!profile||req.body.representationConfirmed!==true||(purpose==='guardian'&&!termDocUrl)||![profile.username,profile.socials.tiktok].some(handle=>handle.replace(/^@/,'').toLowerCase()===current.handle)))return res.status(400).json({error:purpose==='guardian'?'Confira o perfil, a representação e o termo assinado.':'Confira a titularidade do perfil antes de aprovar.'});
  const beforeMail=db.get().directoryEmailOutbox,beforeProfiles=db.get().peopleProfiles,beforeAudit=db.get().legalAudit;
  const actor=(req as express.Request&{userId?:string}).userId||'admin',at=new Date().toISOString();
  const updated={...current,status,purpose,profileId,termDocUrl,notes,reviewedBy:actor,reviewedAt:at,...(status==='aprovado'?{boundTikTok:profile!.socials.tiktok.toLowerCase(),boundIdentityRevision:profile!.identityRevision??0,approvedBy:actor,approvedAt:at}:{}),...(status==='revogado'?{revokedBy:actor,revokedAt:at}:{})};
  db.get().verificationRequests=rows.map(row=>row.id===current.id?updated:status==='revogado'&&row.profileId===current.profileId&&(row.purpose??'ownership')===purpose&&row.status==='aprovado'?{...row,status:'revogado',revokedBy:actor,revokedAt:at}:row);
  if(profile&&['aprovado','revogado'].includes(status)){
   const fields=purpose==='guardian'?{guardianStatus:status==='aprovado'?'termo_recebido' as const:'revogado' as const,guardianAuthorized:status==='aprovado'}:{ownershipVerified:status==='aprovado'};
   db.get().peopleProfiles=beforeProfiles?.map(row=>row.id===profile.id?{...row,...fields,updatedAt:at}:row);
   appendLegalAudit(db,{actor,entity:profile.id,field:purpose==='guardian'?'guardianStatus':'ownershipVerified',before:purpose==='guardian'?profile.guardianStatus??'sem_contato':profile.ownershipVerified??false,after:purpose==='guardian'?fields.guardianStatus:fields.ownershipVerified,reason:'Análise '+current.id+': '+status});
   enqueueEmail(db,'verification-'+current.id+'-'+status,current.requesterEmail,status==='aprovado'?'verification_approved':'verification_revoked',current.requestId);
  }
  try{db.save();}catch{db.get().verificationRequests=rows;db.get().directoryEmailOutbox=beforeMail;db.get().peopleProfiles=beforeProfiles;db.get().legalAudit=beforeAudit;return res.status(503).json({error:'Não foi possível salvar a análise.'});}
  return res.json({request:updated});
 });
}
