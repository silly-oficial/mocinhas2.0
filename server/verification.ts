import type express from 'express';
import {randomUUID} from 'node:crypto';
import type {DB} from './db';
import type {DirectoryRequest} from '../shared/directory-requests';
import type {PersonProfile} from '../shared/people';
import {enqueueEmail} from './directory-email';
export function isProfileVerified(db:typeof DB,profile:PersonProfile) {
  return (db.get().verificationRequests||[]).some(row=>row.profileId===profile.id && row.status==='aprovado' && row.boundTikTok===profile.socials.tiktok.toLowerCase() && [profile.username,profile.socials.tiktok].some(handle=>handle.replace(/^@/,'').toLowerCase()===row.handle));
}
export function addVerificationRequest(db:typeof DB,request:DirectoryRequest) {
  if(!['reivindicar_perfil','autorizar_oficialmente'].includes(request.type))return;
  const profile=(db.get().peopleProfiles||[]).find(profile=>[profile.username,profile.socials.tiktok].some(handle=>handle.replace(/^@/,'').toLowerCase()===request.handle));
  db.get().verificationRequests=[...(db.get().verificationRequests||[]),{id:randomUUID(),requestId:request.id,profileId:profile?.id||'',requesterName:request.responsibleName,requesterEmail:request.email,handle:request.handle,status:'recebido',termDocUrl:request.documentUrl,notes:'',createdAt:request.createdAt}];
}
export function installVerification(app:express.Express,db:typeof DB,admin:express.RequestHandler) {
  app.get('/api/admin/verification-requests',admin,(_req,res)=>res.set('Cache-Control','no-store').json({requests:[...(db.get().verificationRequests||[])].reverse()}));
  app.patch('/api/admin/verification-requests/:id',admin,(req,res)=>{
    const rows=db.get().verificationRequests||[],current=rows.find(row=>row.id===req.params.id);
    if(!current)return res.status(404).json({error:'Pedido não encontrado.'});
    const status=req.body?.status;
    const transitions={recebido:['em_analise','recusado'],em_analise:['aprovado','recusado'],aprovado:['revogado'],recusado:[],revogado:[]};
    if(!transitions[current.status].includes(status))return res.status(400).json({error:'Transição inválida. Inicie uma nova solicitação para reabrir uma verificação encerrada.'});
    const profileId=status==='revogado'?current.profileId:typeof req.body.profileId==='string'?req.body.profileId:current.profileId;
    const profile=(db.get().peopleProfiles||[]).find(profile=>profile.id===profileId);
    const termDocUrl=status==='revogado'?current.termDocUrl:typeof req.body.termDocUrl==='string'?req.body.termDocUrl.trim():current.termDocUrl;
    const notes=typeof req.body.notes==='string'?req.body.notes.trim():'';
    if(notes.length>3000 || termDocUrl.length>2048)return res.status(400).json({error:'Texto muito longo.'});
    if(termDocUrl){try{const url=new URL(termDocUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{return res.status(400).json({error:'Use link HTTPS para o termo.'});}}
    if(status==='aprovado' && (!profile || !termDocUrl || req.body.representationConfirmed!==true || ![profile.username,profile.socials.tiktok].some(handle=>handle.replace(/^@/,'').toLowerCase()===current.handle)))return res.status(400).json({error:'Confira o perfil correspondente, o termo assinado e a representação antes de aprovar.'});
    const beforeMail=db.get().directoryEmailOutbox;
    const updated={...current,status,profileId,termDocUrl,notes,...(status==='aprovado'?{boundTikTok:profile!.socials.tiktok.toLowerCase()}:{}),reviewedBy:(req as any).userId,reviewedAt:new Date().toISOString()};
    if(status==='aprovado'){updated.approvedBy=updated.reviewedBy;updated.approvedAt=updated.reviewedAt;}
    if(status==='revogado'){updated.revokedBy=updated.reviewedBy;updated.revokedAt=updated.reviewedAt;}
    db.get().verificationRequests=rows.map(row=>row.id===current.id?updated:status==='revogado' && row.profileId===current.profileId && row.status==='aprovado'?{...row,status:'revogado',reviewedBy:updated.reviewedBy,reviewedAt:updated.reviewedAt}:row);
    if(['aprovado','revogado'].includes(status))enqueueEmail(db,'verification-'+current.id+'-'+status,current.requesterEmail,status==='aprovado'?'verification_approved':'verification_revoked',current.requestId);
    try{db.save();}catch{db.get().verificationRequests=rows;db.get().directoryEmailOutbox=beforeMail;return res.status(503).json({error:'Não foi possível salvar a análise.'});}
    res.json({request:updated});
  });
}
