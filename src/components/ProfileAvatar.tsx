import React,{useEffect,useRef,useState} from 'react';
import {tiktokPost} from '../../shared/people';
import {createAvatarSession} from '../../shared/avatar-session';
import type {ProfileAvatarSelection} from '../../shared/profile-avatar';
/** Stable official iframe: lazy mount once; visibility pauses playback without replacing it. */
export function ProfileAvatar({selection,fallback='/profile-placeholder.svg',className='',alt='',preview=false,interactive=false,onPosition,onDuration,seekTo,seekToken,playToken}:{selection?:ProfileAvatarSelection;fallback?:string;className?:string;alt?:string;preview?:boolean;interactive?:boolean;onPosition?:(n:number)=>void;onDuration?:(n:number)=>void;seekTo?:number;seekToken?:number;playToken?:number}){
 const root=useRef<HTMLSpanElement>(null),frame=useRef<HTMLIFrameElement>(null),session=useRef<ReturnType<typeof createAvatarSession>|null>(null);
 const latest=useRef({selection,onPosition,onDuration,preview});latest.current={selection,onPosition,onDuration,preview};
 const [entered,setEntered]=useState(false),[visible,setVisible]=useState(false),[foreground,setForeground]=useState(typeof document==='undefined'||!document.hidden),[retry,setRetry]=useState(0),[reason,setReason]=useState(''),[loading,setLoading]=useState(true),[size,setSize]=useState({width:325,height:578});
 useEffect(()=>{const el=root.current;if(!el)return;
  const measure=()=>{const box=el.getBoundingClientRect();if(box.width>0&&box.height>0)setSize(old=>old.width===box.width&&old.height===box.height?old:{width:box.width,height:box.height});};measure();
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;resize?.observe(el);
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{const value=entries[0].isIntersecting;setVisible(value);if(value)setEntered(true);}):null;
  observer?.observe(el);if(!observer){setEntered(true);setVisible(true);}const foreground=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',foreground);
  return()=>{observer?.disconnect();resize?.disconnect();document.removeEventListener('visibilitychange',foreground);};
 },[]);
 const url=selection?.url;
 useEffect(()=>{
  if(!entered||!latest.current.selection)return;
  setReason('');setLoading(true);
  let timer:ReturnType<typeof setTimeout>;
  const send=(type:string,value?:number)=>frame.current?.contentWindow?.postMessage({type,value,'x-tiktok-player':true},'https://www.tiktok.com');
  const controller=createAvatarSession(latest.current.selection,{preview:latest.current.preview,send,position:n=>latest.current.onPosition?.(n),duration:n=>latest.current.onDuration?.(n),ready:()=>{clearTimeout(timer);setLoading(false);setReason('');},error:message=>{setLoading(false);setReason(message);}});
  session.current=controller;
  const message=(event:MessageEvent)=>{if(event.origin==='https://www.tiktok.com'&&event.source===frame.current?.contentWindow&&event.data?.['x-tiktok-player']===true)controller.receive(event.data.type,event.data.value);};
  window.addEventListener('message',message);timer=setTimeout(()=>{setLoading(false);setReason('O TikTok demorou para responder. Você pode tentar novamente ou abrir a origem.');},20000);
  return()=>{clearTimeout(timer);controller.pause();session.current=null;window.removeEventListener('message',message);};
 },[url,entered,retry]);
 useEffect(()=>{if(selection)session.current?.select(selection);},[selection?.kind,selection?.kind==='photo'?selection.imageIndex:selection?.start,selection?.kind==='video'?selection.end:0,url,entered,retry]);
 useEffect(()=>session.current?.active(visible&&foreground),[visible,foreground,entered,retry]);
 useEffect(()=>{if(typeof seekTo==='number')session.current?.seek(seekTo);},[seekTo,seekToken]);
 useEffect(()=>{if(playToken)session.current?.play();},[playToken]);
 const source=selection?new URL(tiktokPost(selection.url).embed):null;
 if(source){for(const [key,value] of Object.entries({controls:interactive?'1':'0',progress_bar:'0',play_button:interactive?'1':'0',volume_control:'0',fullscreen_button:'0',timestamp:'0',muted:'1',autoplay:'0',description:'0',music_info:'0'}))source.searchParams.set(key,value);}
 const scale=Math.max(size.width/325,size.height/578)*(selection?.zoom??1);
 return <><span ref={root} className={'profile-link-avatar '+className} aria-label={alt} aria-busy={selection?loading:undefined}>
 {selection&&entered?<iframe key={url+':'+retry} ref={frame} src={source!.href} title={'TikTok: '+alt} allow="autoplay; encrypted-media" tabIndex={preview||interactive?0:-1} style={{position:'absolute',width:325,height:578,maxWidth:'none',left:'50%',top:'50%',pointerEvents:preview||interactive?'auto':'none',transform:`translate(-50%,-50%) scale(${scale})`,transformOrigin:'center'}} onError={()=>{setLoading(false);setReason('Não foi possível carregar o player.');}}/>:!selection?<img src={fallback} alt={alt} onError={e=>{e.currentTarget.src='/profile-placeholder.svg';}}/>:<span className="profile-avatar-pending" aria-hidden="true"/>}
 </span>{preview&&selection?.kind==='video'&&<div className="media-stepper"><button type="button" className="people-secondary" onClick={()=>session.current?.play()}>Reproduzir trecho</button><button type="button" className="people-secondary" onClick={()=>session.current?.pause()}>Pausar</button></div>}{reason&&preview&&<small className="avatar-player-status" role="status">{reason}<button type="button" onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button><a href={url} target="_blank" rel="noopener noreferrer">Abrir no TikTok</a></small>}</>;
}
