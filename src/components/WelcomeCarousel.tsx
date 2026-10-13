import React, {useEffect, useRef, useState} from 'react';
import {Orbit, ChevronLeft, ChevronRight} from 'lucide-react';
import {useUi} from '../i18n/ui';
import {welcomeRequest} from '../services/welcome';
import {welcomeFrameStyle, type WelcomeConfig} from '../../shared/welcome';
export function WelcomeCarousel({inactive=false}:{inactive?:boolean}) {
 const ui=useUi();
 const [config,setConfig]=useState<WelcomeConfig>({intervalSeconds:5,slides:[]});
 const [index,setIndex]=useState(-1),[target,setTarget]=useState(0),[previous,setPrevious]=useState<number|null>(null);
 const [ready,setReady]=useState<Set<number>>(()=>new Set()),[failed,setFailed]=useState<Set<number>>(()=>new Set());
 const [visible,setVisible]=useState(!document.hidden),[focused,setFocused]=useState(false);
 const root=useRef<HTMLDivElement>(null),videos=useRef(new Map<number,HTMLVideoElement>());
 const videoRefs=useRef(new Map<number,(v:HTMLVideoElement|null)=>void>());
 function videoRef(i:number){if(!videoRefs.current.has(i))videoRefs.current.set(i,v=>{if(v)videos.current.set(i,v);else{videos.current.get(i)?.pause();videos.current.delete(i);}});return videoRefs.current.get(i)!;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 useEffect(()=>{let stopped=false;welcomeRequest().then(c=>{if(!stopped&&Array.isArray(c.slides))setConfig(c);}).catch(()=>{});return()=>{stopped=true;};},[]);
 useEffect(()=>{let inView=true;const update=()=>setVisible(inView&&!document.hidden);const observer=new IntersectionObserver(es=>{inView=es[0].isIntersecting;update();});observer.observe(root.current!);document.addEventListener('visibilitychange',update);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};},[]);
 function loaded(i:number){setReady(old=>old.has(i)?old:new Set([...old,i]));}
 function broken(i:number){setFailed(old=>new Set([...old,i]));}
 // Every slide remains mounted and is prepared once. Keep the current frame
 // visible until the requested image has decoded or the video has a first frame.
 useEffect(()=>{if(ready.has(target)&&target!==index){setPrevious(index<0?null:index);setIndex(target);}else if(failed.has(target)&&config.slides.length){const next=config.slides.findIndex((_,i)=>!failed.has(i));if(next>=0)setTarget(next);}},[target,ready,failed,index,config.slides]);
 useEffect(()=>{if(previous===null)return;const t=setTimeout(()=>setPrevious(null),450);return()=>clearTimeout(t);},[previous,index]);
 function move(delta:number){if(!config.slides.length)return;for(let n=1;n<=config.slides.length;n++){const next=((index<0?0:index)+delta*n+config.slides.length*2)%config.slides.length;if(!failed.has(next)){setTarget(next);break;}}}
 useEffect(()=>{if(inactive||!visible||focused||reduced||index<0||config.slides.length<2)return;const t=setTimeout(()=>move(1),config.intervalSeconds*1000);return()=>clearTimeout(t);},[index,inactive,visible,focused,reduced,config,failed]);
 useEffect(()=>{for(const [i,v] of videos.current){if(i===index&&!inactive&&visible){v.play().catch(()=>{});}else v.pause();}return()=>{for(const v of videos.current.values())v.pause();};},[index,inactive,visible]);
 return <div ref={root} className={`sky-welcome-art welcome-carousel ${config.slides.length?'has-slides':''}`} onContextMenu={e=>e.preventDefault()} onFocusCapture={e=>setFocused((e.target as HTMLElement).matches(':focus-visible'))} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false);}}>
  {config.slides.map((s,i)=><div className={`welcome-slide ${i===index?'is-current':i===previous?'is-previous':''}`} key={s.id} aria-hidden={i!==index}>
   {s.type==='video'?<video ref={videoRef(i)} src={s.url} style={welcomeFrameStyle(s.frame)} muted playsInline loop preload="auto" controls={false} disablePictureInPicture disableRemotePlayback controlsList="nodownload noremoteplayback" onLoadedData={()=>loaded(i)} onError={()=>broken(i)}/>:<img src={s.url} style={welcomeFrameStyle(s.frame)} alt={ui('Apresentação do mocinhas')} loading="eager" decoding="async" draggable={false} onLoad={e=>{const img=e.currentTarget;img.decode().then(()=>loaded(i)).catch(()=>{if(img.naturalWidth)loaded(i);else broken(i);});}} onError={()=>broken(i)}/>}
  </div>)}
  {!config.slides.length&&<><Orbit aria-hidden="true"/><span className="welcome-wordmark" aria-hidden="true">mocinhas</span></>}
  {config.slides.length>1&&<><button className="welcome-edge welcome-edge-left" aria-label={ui('Imagem anterior')} onClick={()=>move(-1)}><ChevronLeft size={22}/></button><button className="welcome-edge welcome-edge-right" aria-label={ui('Próxima imagem')} onClick={()=>move(1)}><ChevronRight size={22}/></button></>}
 </div>;
}
