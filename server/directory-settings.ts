import type express from 'express';
import type {DB} from './db';
import {emailPattern, type DirectorySettings} from '../shared/directory-settings';
export function directorySettings(db: typeof DB): DirectorySettings {
  const stored = db.get().directorySettings || {};
  const email = (value:string|undefined) => value && emailPattern.test(value) && !/[\[\]]/.test(value) ? value : '';
  return {siteName:stored.siteName||'Mocinhas',organizationName:stored.organizationName||'',websiteUrl:stored.websiteUrl||'',responseBusinessDays:stored.responseBusinessDays||5,ageRating:stored.ageRating||'L',ageRatingNote:stored.ageRatingNote??'Conteúdo sem nudez. Podem aparecer traje de banho, roupa de praia e roupas justas.',contactEmail:email(stored.contactEmail??process.env.CONTACT_EMAIL),dpoEmail:email(stored.dpoEmail??process.env.DPO_EMAIL)};
}
export function installDirectorySettings(app:express.Express,db:typeof DB,admin:express.RequestHandler,onChanged?:()=>Promise<void>) {
  app.get('/api/directory-settings',(_req,res)=>res.set('Cache-Control','no-store').json(directorySettings(db)));
  app.get('/api/admin/directory-settings',admin,(_req,res)=>res.set('Cache-Control','no-store').json({settings:directorySettings(db),emailConfigured:!!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),mailQueue:{pending:(db.get().directoryEmailOutbox||[]).filter(row=>!row.sentAt).length,sent:(db.get().directoryEmailOutbox||[]).filter(row=>row.sentAt).length,errors:(db.get().directoryEmailOutbox||[]).filter(row=>row.error).slice(-10).map(row=>({id:row.id,error:row.error,attempts:row.attempts}))}}));
  app.put('/api/admin/directory-settings',admin,async(req,res)=>{
    try {
      const settings = {} as DirectorySettings;
      for(const key of ['siteName','organizationName','contactEmail','dpoEmail','websiteUrl'] as const) {
        const value = req.body?.[key];
        if(typeof value !== 'string' || value.length > (key==='websiteUrl'?2048:254)) throw Error('Confira os campos de configuração.');
        settings[key] = value.trim();
      }
      if(!settings.siteName) throw Error('Informe o nome do site.');
      for(const key of ['contactEmail','dpoEmail'] as const) if(settings[key] && (!emailPattern.test(settings[key]) || /[\[\]]/.test(settings[key]))) throw Error('Informe e-mails reais ou deixe os campos vazios.');
      if(settings.websiteUrl) {const url=new URL(settings.websiteUrl);if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash) throw Error('Use uma URL HTTPS pública sem credenciais, query ou fragmento.');settings.websiteUrl=url.origin;}
      const days = req.body.responseBusinessDays;
      if(!Number.isInteger(days) || days<1 || days>5) throw Error('Use um prazo de 1 a 5 dias úteis.');
      settings.responseBusinessDays=days;
      const previous=directorySettings(db),rating=req.body.ageRating??previous.ageRating,note=req.body.ageRatingNote??previous.ageRatingNote;
      if(typeof rating!=='string'||!['L','10','12','14','16','18'].includes(rating)||typeof note!=='string'||note.length>1000)throw Error('Confira a classificação e a descrição.');
      settings.ageRating=rating;settings.ageRatingNote=note.trim();
      const before=db.get().directorySettings, audit=db.get().directorySettingsAudit, versions=db.get().legalDocumentVersions;
      db.get().directorySettings=settings;
      db.get().directorySettingsAudit=[...(audit||[]),{by:(req as any).userId,at:new Date().toISOString(),settings}].slice(-100);
      try{await onChanged?.();db.save();}catch(error){db.get().directorySettings=before;db.get().directorySettingsAudit=audit;db.get().legalDocumentVersions=versions;throw error;}
      res.json({settings});
    } catch(error) {res.status(400).json({error:error instanceof Error?error.message:'Falha ao salvar.'});}
  });
}

