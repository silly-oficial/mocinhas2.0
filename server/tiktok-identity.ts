import {resolveTikTokLink} from './tiktok-link';

/** Read public identity only; never infer age, authorization or download media. */
export async function resolveTikTokIdentity(raw:string,preview:(url:string)=>Promise<{author_name?:string}>,transport:typeof fetch=fetch){
 const url=await resolveTikTokLink(raw,transport,true);
 const handle=new URL(url).pathname.split('/')[1].slice(1);
 let name='';
 if(/\/(video|photo)\//.test(url)){
  try{name=(await preview(url)).author_name?.trim().slice(0,80)||'';}catch{}
 }
 if(!name){
  try{
   const response=await transport('https://www.tiktok.com/@'+handle,{redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error();
   // Bound the document size even if the origin omits Content-Length.
   const reader=response.body?.getReader();if(!reader)throw Error();
   let html='',bytes=0;const decoder=new TextDecoder();
   try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>2*1024*1024)throw Error();html+=decoder.decode(chunk.value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel();}
   for(const match of html.matchAll(/<script\b[^>]*\bid=["'](__UNIVERSAL_DATA_FOR_REHYDRATION__|SIGI_STATE)["'][^>]*>([\s\S]*?)<\/script>/g)){
    try{
     const data=JSON.parse(match[2]);
     const users=match[1]==='SIGI_STATE'?Object.values(data.UserModule?.users||{}):[data.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user];
     const user=users.find((value:any)=>typeof value?.uniqueId==='string'&&value.uniqueId.toLowerCase()===handle.toLowerCase()) as any;
     if(typeof user?.nickname==='string')name=user.nickname.trim().slice(0,80);
     if(name)break;
    }catch{}
   }
  }catch{/* TikTok may block public metadata; preserve the valid handle. */}
 }
 return {url,handle,name:name||null,profileUrl:'https://www.tiktok.com/@'+handle};
}
