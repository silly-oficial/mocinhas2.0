import {tiktokPost} from '../shared/people';
/** Follow only TikTok share redirects; never request a media file or another host. */
export async function resolveTikTokLink(raw:string,transport:typeof fetch=fetch):Promise<string>{
 if(typeof raw!=='string'||raw.length>2048)throw Error('Cole um link válido do TikTok.');
 let url:URL;try{url=new URL(raw.trim());}catch{throw Error('Cole o link completo do TikTok.');}
 const signal=AbortSignal.timeout(8000);
 for(let count=0;count<6;count++){
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['vt.tiktok.com','vm.tiktok.com','www.tiktok.com','tiktok.com'].includes(url.hostname))throw Error('Use somente links HTTPS do TikTok.');
  try{return tiktokPost(url.href).canonical;}catch{}
  const short=['vt.tiktok.com','vm.tiktok.com'].includes(url.hostname)?/^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname):/^\/t\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
  if(!short)throw Error('O TikTok não retornou uma publicação. Abra o link no TikTok e copie o endereço da publicação.');
  let response:Response;try{response=await transport(url.href,{redirect:'manual',signal});}catch{throw Error('Não foi possível abrir o link curto do TikTok. Tente novamente.');}
  const location=response.headers.get('location');await response.body?.cancel();
  if(![301,302,303,307,308].includes(response.status)||!location)throw Error('O TikTok não resolveu o link curto. Abra-o no TikTok e copie o endereço da publicação.');
  url=new URL(location,url);
 }
 throw Error('O link do TikTok redirecionou muitas vezes. Copie o endereço completo da publicação.');
}
