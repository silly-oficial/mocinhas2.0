import React,{useEffect,useRef,useState} from 'react';
import type {PersonProfile} from '../../shared/people';
import {socialVideo} from '../../shared/people';
import {cleanTikTokPlayerSource} from '../../shared/tiktok-player-options';
import {Play,Pause,ChevronLeft,ChevronRight} from 'lucide-react';
export function SocialVideoPlayer({video,name,profileId,index}:{video:PersonProfile['videos'][number];name:string;profileId?:string;index?:number}) {
  const iframe=useRef<HTMLIFrameElement>(null),[failed,setFailed]=useState(video.is_still_available===false),[ready,setReady]=useState(false),[imageIndex,setImageIndex]=useState(0);
  const source=socialVideo(video.url);
  const isTikTok=source.platform==='TikTok';
  const photo=source.postType==='photo';
  const embed=new URL(source.embed);
  if(isTikTok){embed.searchParams.set('muted','1');embed.searchParams.set('autoplay',photo?'0':'1');embed.searchParams.set('loop',photo?'0':'1');}
  const playerSource=isTikTok?cleanTikTokPlayerSource(embed.href):source.embed;
  function command(type:string,value?:number){if(isTikTok)iframe.current?.contentWindow?.postMessage({type,value,'x-tiktok-player':true},'https://www.tiktok.com');}

  useEffect(()=>{if(source.platform!=='TikTok'||!profileId||index===undefined)return;const controller=new AbortController();fetch('/api/people/'+encodeURIComponent(profileId)+'/video-status/'+index,{headers:{Authorization:'Bearer '+(localStorage.getItem('mocinhas_token')||localStorage.getItem('yume_token')||'')},signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data?.available===false)setFailed(true);}).catch(()=>{});return()=>controller.abort();},[video.url,profileId,index]);
  useEffect(()=>{
    setFailed(video.is_still_available===false);setReady(false);setImageIndex(0);
    const timer=setTimeout(()=>{if(source.platform==='TikTok')setFailed(true);},15000);
    const message=(event:MessageEvent)=>{
      if(event.origin!=='https://www.tiktok.com' || event.source!==iframe.current?.contentWindow || event.data?.['x-tiktok-player']!==true)return;
      if(event.data.type==='onImageChange'&&Number.isInteger(event.data.value))setImageIndex(event.data.value);
      if(['onPlayerReady','onImageChange','onCurrentTime'].includes(event.data.type)){clearTimeout(timer);setReady(true);}
      if(['onPlayerError','onError'].includes(event.data.type) && (event.data.value?.errorCode??event.data.value)!==3002){clearTimeout(timer);setFailed(true);}
    };
    window.addEventListener('message',message);return()=>{clearTimeout(timer);window.removeEventListener('message',message);};
  },[video.url]);
  return <div className="social-video-player"><iframe ref={iframe} src={playerSource} title={video.title||name} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onLoad={()=>{if(source.platform!=='TikTok')setReady(true);}} onError={()=>setFailed(true)}/>{isTikTok&&<div className="external-player-controls" aria-label="Controles da publicação">{photo?<><button type="button" className="people-secondary" disabled={imageIndex===0} onClick={()=>command('navigateTo',imageIndex-1)} aria-label="Foto anterior"><ChevronLeft size={18}/></button><span>Foto {imageIndex+1}</span><button type="button" className="people-secondary" onClick={()=>command('navigateTo',imageIndex+1)} aria-label="Próxima foto"><ChevronRight size={18}/></button></>:<><button type="button" className="people-secondary" onClick={()=>{command('mute');command('play');}}><Play size={18}/>Reproduzir</button><button type="button" className="people-secondary" onClick={()=>command('pause')}><Pause size={18}/>Pausar</button></>}</div>}{failed&&<p role="status">O TikTok não confirmou a reprodução. Use os controles abaixo da mídia ou abra a publicação na plataforma original.</p>}<a href={video.url} target="_blank" rel="noopener noreferrer">Abrir no {source.platform}</a>{!ready&&!failed&&<small>Carregando o player externo…</small>}</div>;
}
