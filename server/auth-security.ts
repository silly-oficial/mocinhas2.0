import {randomInt} from 'node:crypto';
import bcrypt from 'bcryptjs';
import type {RequestHandler} from 'express';
export interface RecoveryState {recoveryToken?:string;recoveryExpiresAt?:number;recoveryAttempts?:number}
export function issueRecovery(now=Date.now()){
 const code=String(randomInt(100000,1000000));
 return {code,state:{recoveryToken:bcrypt.hashSync(code,12),recoveryExpiresAt:now+15*60*1000,recoveryAttempts:0}};
}
export function consumeRecovery(state:RecoveryState,code:unknown,now=Date.now()){
 const valid=typeof code==='string'&&/^\d{6}$/.test(code)&&!!state.recoveryToken?.startsWith('$2')&&(state.recoveryExpiresAt??0)>now&&(state.recoveryAttempts??0)<5;
 state.recoveryAttempts=(state.recoveryAttempts??0)+1;
 const accepted=valid&&bcrypt.compareSync(code as string,state.recoveryToken!);
 if(accepted||state.recoveryAttempts>=5||(state.recoveryExpiresAt??0)<=now){state.recoveryToken=undefined;state.recoveryExpiresAt=undefined;}
 return accepted;
}
export function authRateLimit(limit:number,windowMs:number,key:(req:Parameters<RequestHandler>[0])=>string):RequestHandler{
 const buckets=new Map<string,{count:number;until:number}>();
 return (req,res,next)=>{
  const now=Date.now();for(const [id,b] of buckets)if(b.until<=now)buckets.delete(id);
  const id=key(req),bucket=buckets.get(id)||{count:0,until:now+windowMs};
  if(bucket.count>=limit||(!buckets.has(id)&&buckets.size>=10000)){res.set('Retry-After',String(Math.max(1,Math.ceil((bucket.until-now)/1000))));res.status(429).json({error:'Muitas tentativas. Aguarde antes de tentar novamente.'});return;}
  bucket.count++;buckets.set(id,bucket);next();
 };
}
export async function deliverRecovery(email:string,code:string){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw Error('Envio de recuperação não configurado.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject:'Recuperação de acesso ao Mocinhas',text:'Seu código é '+code+'. Ele expira em 15 minutos. Se você não pediu a recuperação, ignore esta mensagem.'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Não foi possível enviar a recuperação.');
}
