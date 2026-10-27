import React,{useEffect,useRef,useState} from 'react';
import type {PersonProfile} from '../../shared/people';
import {socialVideo} from '../../shared/people';
export function SocialVideoPlayer({video,name,profileId,index}:{video:PersonProfile['videos'][number];name:string;profileId:string;index:number}) {
  const iframe=useRef<HTMLIFrameElement>(null),[failed,setFailed]=useState(video.is_still_available===false),[ready,setReady]=useState(false);
  const source=socialVideo(video.url);
  useEffect(()=>{if(source.platform!=='TikTok')return;const controller=new AbortController();fetch('/api/people/'+encodeURIComponent(profileId)+'/video-status/'+index,{headers:{Authorization:'Bearer '+(localStorage.getItem('mocinhas_token')||localStorage.getItem('yume_token')||'')},signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data?.available===false)setFailed(true);}).catch(()=>{});return()=>controller.abort();},[video.url,profileId,index]);
  useEffect(()=>{
    const timer=setTimeout(()=>{if(source.platform==='TikTok')setFailed(true);},15000);
    const message=(event:MessageEvent)=>{
      if(event.origin!=='https://www.tiktok.com' || event.source!==iframe.current?.contentWindow || event.data?.['x-tiktok-player']!==true)return;
      if(event.data.type==='onPlayerReady'){clearTimeout(timer);setReady(true);}
      if(['onPlayerError','onError'].includes(event.data.type) && event.data.value?.errorCode!==3002){clearTimeout(timer);setFailed(true);}
    };
    window.addEventListener('message',message);return()=>{clearTimeout(timer);window.removeEventListener('message',message);};
  },[video.url]);
  return <div className="social-video-player">{failed?<><img src={video.thumbnail||'/profile-placeholder.svg'} alt={'Prévia de '+name}/><p>O vídeo não pôde ser carregado. Ele pode estar indisponível ou restrito.</p></>:<iframe ref={iframe} src={source.embed} title={video.title||name} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onLoad={()=>{if(source.platform!=='TikTok')setReady(true);}} onError={()=>setFailed(true)}/>}<a href={video.url} target="_blank" rel="noopener noreferrer">Abrir no {source.platform}</a>{!ready&&!failed&&<small>Carregando o player externo…</small>}</div>;
}
