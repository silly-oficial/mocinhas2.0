import React,{useEffect,useRef,useState} from 'react';
import {Orbit,ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {useUi} from '../i18n/ui';
import {welcomeRequest} from '../services/welcome';
import type {WelcomeConfig} from '../../shared/welcome';
export function WelcomeCarousel({inactive=false}:{inactive?:boolean}){
 const ui=useUi(),[config,setConfig]=useState<WelcomeConfig>({intervalSeconds:5,slides:[]}),[index,setIndex]=useState(0),[paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[visible,setVisible]=useState(!document.hidden),[failed,setFailed]=useState(false);
 const root=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{let disposed=false;welcomeRequest().then(c=>{if(!disposed&&Array.isArray(c.slides)){setConfig(c);setIndex(0);}}).catch(()=>{});return()=>{disposed=true;};},[]);
 useEffect(()=>{let inView=true;const update=()=>setVisible(inView&&!document.hidden);const obs=new IntersectionObserver(es=>{inView=es[0].isIntersecting;update();});obs.observe(root.current!);document.addEventListener('visibilitychange',update);return()=>{obs.disconnect();document.removeEventListener('visibilitychange',update);};},[]);
 const slide=config.slides[index];
 useEffect(()=>{setFailed(false);},[slide?.id]);
 useEffect(()=>{if(paused||inactive||!visible||config.slides.length<2)return;const t=setTimeout(()=>setIndex(i=>(i+1)%config.slides.length),config.intervalSeconds*1000);return()=>clearTimeout(t);},[index,paused,inactive,visible,config]);
 useEffect(()=>{const el=video.current;if(!el)return;if(paused||inactive||!visible)el.pause();else el.play().catch(()=>{});return()=>el.pause();},[slide?.id,paused,inactive,visible]);
 function move(delta:number){setIndex(i=>(i+delta+config.slides.length)%config.slides.length);}
 return <div ref={root} className="sky-welcome-art welcome-carousel" onContextMenu={e=>e.preventDefault()}>
   {slide&&!failed?<div className="welcome-slide" key={slide.id}>{slide.type==='video'?<video ref={video} src={slide.url} muted playsInline autoPlay loop preload="metadata" controls={false} disablePictureInPicture controlsList="nodownload noremoteplayback" onError={()=>setFailed(true)}/>:<img src={slide.url} alt={ui('Apresentação do mocinhas')} draggable={false} onError={()=>setFailed(true)}/>}</div>:<Orbit aria-hidden="true"/>}
   <span className="welcome-wordmark" aria-hidden="true">mocinhas</span>
   {!!config.slides.length&&<div className="welcome-carousel-controls">{config.slides.length>1&&<><button aria-label={ui('Imagem anterior')} onClick={()=>move(-1)}><ChevronLeft size={18}/></button><span aria-live="off">{index+1} / {config.slides.length}</span><button aria-label={ui('Próxima imagem')} onClick={()=>move(1)}><ChevronRight size={18}/></button></>}<button aria-label={ui(paused?'Continuar apresentação':'Pausar apresentação')} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button></div>}
 </div>;
}
