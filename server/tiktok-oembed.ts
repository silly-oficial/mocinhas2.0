import {resolveTikTokLink} from './tiktok-link';
import type {DB} from './db';
import {socialVideo} from '../shared/people';
export interface TikTokCache {url:string;thumbnail_url:string;author_name:string;checkedAt:string;available:boolean;}
export function makeTikTokResolver(db:typeof DB, transport:typeof fetch=fetch) {
  const pending=new Map<string,Promise<TikTokCache>>();
  return async function resolve(raw:string,requireAvailable=true):Promise<TikTokCache> {
    const source=socialVideo(await resolveTikTokLink(raw,transport));if(source.platform!=='TikTok')throw Error('Informe um post público do TikTok.');
    const url=source.canonical;
    const cached=db.get().tiktokOembedCache?.[url];
    const age=cached?Date.now()-Date.parse(cached.checkedAt):Infinity;
    if(cached && age<(cached.available?86400000:300000)) {if(requireAvailable&&!cached.available)throw Error('O TikTok não disponibilizou esse post público.');return cached;}
    if(!pending.has(url)) pending.set(url,(async()=>{
      // Fixed host, no redirects and no user supplied endpoint prevent SSRF.
      const response=await transport('https://www.tiktok.com/oembed?url='+encodeURIComponent(url),{redirect:'error',signal:AbortSignal.timeout(8000)});
      if(!response.ok && ![400,401,403,404].includes(response.status))throw Error('TikTok temporariamente indisponível. Tente novamente.');
      let thumbnail=cached?.thumbnail_url||'',author='';
      if(response.ok) {
        const data=await response.json();
        if(typeof data.thumbnail_url!=='string' || typeof data.author_url!=='string')throw Error('Resposta incompleta do TikTok.');
        const image=new URL(data.thumbnail_url),owner=new URL(data.author_url);
        const expected=new URL(url).pathname.split('/')[1];
        if(image.protocol!=='https:' || image.username || image.password || image.href.length>4096 || owner.hostname.replace(/^www\./,'')!=='tiktok.com' || owner.pathname.replace(/\/$/,'').toLowerCase()!=='/'+expected.toLowerCase())throw Error('A origem retornada pelo TikTok não corresponde ao post.');
        thumbnail=image.href;author=typeof data.author_name==='string'?data.author_name.slice(0,120):'';
      }
      const value:TikTokCache={url,thumbnail_url:thumbnail,author_name:author,checkedAt:new Date().toISOString(),available:response.ok};
      const before=db.get().tiktokOembedCache;
      const entries=Object.entries(before||{}).filter(([key])=>key!==url).slice(-1999);
      db.get().tiktokOembedCache={...Object.fromEntries(entries),[url]:value};
      try{db.save();}catch(error){db.get().tiktokOembedCache=before;throw error;}
      return value;
    })().finally(()=>pending.delete(url)));
    const result=await pending.get(url)!;
    if(requireAvailable&&!result.available)throw Error('O TikTok não disponibilizou esse post público. Ele pode estar privado, removido ou restrito.');
    return result;
  };
}

