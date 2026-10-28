import React,{useEffect,useRef,useState} from 'react';
import {tiktokPost} from '../../shared/people';
import type {ProfileAvatarSelection} from '../../shared/profile-avatar';
/** Only the official iframe is loaded. No media bytes, screenshots or exports. */
export function ProfileAvatar({selection,fallback='/profile-placeholder.svg',className='',alt='',preview=false,onPosition}:{selection?:ProfileAvatarSelection;fallback?:string;className?:string;alt?:string;preview?:boolean;onPosition?:(value:number)=>void}){
 const root=useRef<HTMLSpanElement>(null),frame=useRef<HTMLIFrameElement>(null);
 const [foreground,setForeground]=useState(typeof document==='undefined'||!document.hidden);
 useEffect(()=>{const update=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const [visible,setVisible]=useState(false),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{const node=root.current;if(!node)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting));observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{setFailed(false);setReady(false);},[selection?.url,visible,foreground]);
 useEffect(()=>{
  if(!selection||!visible||!foreground||failed)return;
  let timer:ReturnType<typeof setTimeout>;
  const send=(type:string,value?:number)=>frame.current?.contentWindow?.postMessage({type,value,'x-tiktok-player':true},'https://www.tiktok.com');
  const apply=()=>{send('mute');if(selection.kind==='photo'){send('pause');send('navigateTo',selection.imageIndex);}else{send('seekTo',selection.start);send('play');}};
  const message=(event:MessageEvent)=>{
   if(event.origin!=='https://www.tiktok.com'||event.source!==frame.current?.contentWindow||event.data?.['x-tiktok-player']!==true)return;
   const {type,value}=event.data;
   if(type==='onPlayerReady'){clearTimeout(timer);setReady(true);apply();}
   if(type==='onImageChange'&&typeof value==='number'){onPosition?.(value);}
   if(type==='onCurrentTime'&&selection.kind==='video'){
    const time=value?.currentTime;
    if(typeof time==='number'){onPosition?.(time);if(time>=selection.end||time<selection.start-.5){send('seekTo',selection.start);send('play');}}
    if(typeof value?.duration==='number'&&value.duration>0&&selection.end>value.duration+.1)setFailed(true);
   }
   if(type==='onStateChange'&&value===0&&selection.kind==='video')apply();
   if(['onPlayerError','onError'].includes(type)&&(value?.errorCode??value)!==3002){clearTimeout(timer);setFailed(true);}
  };
  window.addEventListener('message',message);
  timer=setTimeout(()=>setFailed(true),15000);
  if(ready){clearTimeout(timer);apply();}
  return()=>{clearTimeout(timer);send('pause');window.removeEventListener('message',message);};
 },[selection?.url,selection?.kind,selection?.kind==='photo'?selection.imageIndex:selection?.start,selection?.kind==='video'?selection.end:0,visible,foreground,failed,ready]);
 const source=selection?new URL(tiktokPost(selection.url).embed):null;
 if(source&&selection){for(const [key,value] of Object.entries({controls:String(Number(preview)),muted:'1',autoplay:String(Number(selection.kind==='video')),description:'0',music_info:'0'}))source.searchParams.set(key,value);}
 return <span ref={root} className={'profile-link-avatar '+className} aria-label={alt}>
  {!selection||failed||!visible||!foreground?<img src={selection?'/profile-placeholder.svg':fallback} alt={alt} onError={e=>{e.currentTarget.src='/profile-placeholder.svg';}}/>:<iframe ref={frame} src={source!.href} title={'Avatar TikTok: '+alt} allow="autoplay; encrypted-media" tabIndex={preview?0:-1} style={{pointerEvents:preview?'auto':'none'}} onError={()=>setFailed(true)}/>}
  {failed&&preview&&<small>Player indisponível. Confira o link e a seleção no TikTok.</small>}
 </span>;
}
