import {randomUUID} from 'node:crypto';
import type {DB} from './db';
import {directorySettings} from './directory-settings';
import {emailPattern} from '../shared/directory-settings';
export type EmailTemplate = 'request_received'|'admin_new_request'|'request_completed'|'verification_approved'|'verification_revoked';
export interface EmailJob {id:string;key:string;to:string;template:EmailTemplate;data:{protocol:string;siteName:string};createdAt:string;sentAt?:string;providerId?:string;firstAttemptAt?:string;attempts:number;nextAttemptAt:number;error?:string;}
export async function sendEmail(job: Pick<EmailJob,'to'|'template'|'data'|'key'>, transport:typeof fetch=fetch) {
  if(!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw Error('Provedor de e-mail não configurado.');
  if(!emailPattern.test(job.to) || /[\[\]]/.test(job.to)) throw Error('Destinatário não configurado.');
  const messages:Record<EmailTemplate,string>={request_received:'Recebemos sua solicitação. Ela será analisada pela administração.',admin_new_request:'Há uma nova solicitação no painel administrativo.',request_completed:'A administração marcou a análise da sua solicitação como concluída. Esta mensagem não atesta exclusão de arquivos; consulte a resposta da administração.',verification_approved:'A solicitação de verificação foi aprovada pela administração.',verification_revoked:'A verificação foi revogada e o selo foi retirado.'};
  const response=await transport('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':job.key},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[job.to],subject:job.data.siteName+' — solicitação '+job.data.protocol,text:messages[job.template]+'\nProtocolo: '+job.data.protocol}),signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw Error('Provedor recusou o envio ('+response.status+').');
  const result=await response.json();if(!result?.id)throw Error('Provedor não confirmou o recebimento do e-mail.');
  return result.id as string;
}
export function enqueueEmail(db:typeof DB,key:string,to:string,template:EmailTemplate,protocol:string) {
  const rows=db.get().directoryEmailOutbox||[];if(rows.some(row=>row.key===key))return;
  db.get().directoryEmailOutbox=[...rows,{id:randomUUID(),key,to,template,data:{protocol,siteName:directorySettings(db).siteName},createdAt:new Date().toISOString(),attempts:0,nextAttemptAt:0}];
}
export function startDirectoryMailWorker(db:typeof DB,flush:()=>Promise<void>,sender=sendEmail) {
  let running=false;
  const run=async()=>{
    if(running)return;running=true;
    try {
      await flush();
      // No external sending without a configured provider; the queue remains durable.
      if(!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)return;
      for(const job of (db.get().directoryEmailOutbox||[]).filter(row=>!row.sentAt && row.nextAttemptAt<=Date.now()).slice(0,10)) {
        // Resolve a previously missing admin address after configuration is saved.
        if(!job.to && job.template==='admin_new_request')job.to=directorySettings(db).contactEmail;
        try {
          // Resend deduplication lasts 24h. Avoid an ambiguous automatic resend beyond it.
          if(job.attempts && Date.now()-Date.parse(job.firstAttemptAt||job.createdAt)>23*3600000) {job.error='Revisão manual necessária: janela de idempotência expirada.';job.nextAttemptAt=Number.MAX_SAFE_INTEGER;}
          else {job.attempts++;job.firstAttemptAt ||= new Date().toISOString();db.save();await flush();job.providerId=await sender(job);job.sentAt=new Date().toISOString();job.error=undefined;}
        } catch(error) {job.error=error instanceof Error?error.message:'Falha no envio.';job.nextAttemptAt=Date.now()+Math.min(3600000,60000*2**Math.min(job.attempts,6));}
        db.save();await flush();
      }
    } finally {running=false;}
  };
  const timer=setInterval(()=>{void run().catch(()=>console.warn('[directory-mail] Fila aguardando reconexão.'));},30000);timer.unref();
  return {run,stop:()=>clearInterval(timer)};
}
