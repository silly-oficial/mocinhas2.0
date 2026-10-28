import type express from 'express';
import type {DB} from './db';
export interface AccessLog {at:string;ip:string;userAgent:string;method:string;path:string;status:number}
export function retainAccessLogs(logs:AccessLog[],now=new Date()){
 const cutoff=new Date(now),day=cutoff.getUTCDate();cutoff.setUTCDate(1);cutoff.setUTCMonth(cutoff.getUTCMonth()-6);const lastDay=new Date(Date.UTC(cutoff.getUTCFullYear(),cutoff.getUTCMonth()+1,0)).getUTCDate();cutoff.setUTCDate(Math.min(day,lastDay));
 return logs.filter(log=>Number.isFinite(Date.parse(log.at))&&Date.parse(log.at)>=cutoff.getTime());
}
export function installAccessLog(app:express.Express,db:typeof DB){
 // No query strings, bodies, passwords, bearer tokens or protocol keys are recorded.
 app.use((req,res,next)=>{if(/^\/api\/(auth|admin|directory-requests)(\/|$)/.test(req.path))res.once('finish',()=>{
  const before=db.get().accessLogs;db.get().accessLogs=[...(before||[]),{at:new Date().toISOString(),ip:req.ip||req.socket.remoteAddress||'',userAgent:(req.get('user-agent')||'').slice(0,512),method:req.method,path:req.path.replace(/\/[a-f0-9-]{20,}/gi,'/:id').slice(0,256),status:res.statusCode}];
  try{db.save();}catch{db.get().accessLogs=before;console.warn('[acesso] Não foi possível persistir o registro técnico.');}
 });next();});
 const prune=()=>{const before=db.get().accessLogs||[],next=retainAccessLogs(before);if(next.length!==before.length){db.get().accessLogs=next;try{db.save();}catch{db.get().accessLogs=before;}}};
 prune();const timer=setInterval(prune,86400000);timer.unref();
}
