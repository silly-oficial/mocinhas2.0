export type UploadResult={url:string;type:'image'|'video';bytes:number};
export function uploadProfileFile(file:File,onProgress:(loaded:number)=>void,signal:AbortSignal):Promise<UploadResult>{
 return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();
  const finish=()=>signal.removeEventListener('abort',abort);
  const abort=()=>xhr.abort();
  xhr.open('POST','/api/admin/people/upload');
  const token=localStorage.getItem('mocinhas_token')||localStorage.getItem('yume_token');
  if(token)xhr.setRequestHeader('Authorization','Bearer '+token);
  xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');
  xhr.timeout=300000;
  xhr.upload.onprogress=event=>onProgress(Math.min(file.size,event.loaded));
  xhr.onload=()=>{finish();let body:any;try{body=JSON.parse(xhr.responseText);}catch{reject(Error('Resposta inválida do servidor.'));return;}if(xhr.status<200||xhr.status>=300){reject(Error(body.error||'Falha no envio ('+xhr.status+').'));return;}resolve(body);};
  xhr.onerror=()=>{finish();reject(Error('Conexão interrompida. Tente enviar o arquivo novamente.'));};
  xhr.ontimeout=()=>{finish();reject(Error('O envio demorou demais. Tente novamente.'));};
  xhr.onabort=()=>{finish();reject(new DOMException('Envio cancelado.','AbortError'));};
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){finish();reject(new DOMException('Envio cancelado.','AbortError'));return;}
  xhr.send(file);
 });
}
