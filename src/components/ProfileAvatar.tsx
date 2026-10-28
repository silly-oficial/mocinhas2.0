import {avatarPlayerError} from '../../shared/avatar-player';
import React,{useEffect,useRef,useState} from 'react';
import {tiktokPost} from '../../shared/people';
import type {ProfileAvatarSelection} from '../../shared/profile-avatar';
/** Only the official iframe is loaded. No media bytes, screenshots or exports. */
export function ProfileAvatar({selection,fallback='/profile-placeholder.svg',className='',alt='',preview=false,onPosition,onDuration,seekTo,seekToken,playToken}:{selection?:ProfileAvatarSelection;fallback?:string;className?:string;alt?:string;preview?:boolean;onPosition?:(value:number)=>void;onDuration?:(value:number)=>void;seekTo?:number;seekToken?:number;playToken?:number}){
 const root=useRef<HTMLSpanElement>(null),frame=useRef<HTMLIFrameElement>(null),hasImage=useRef(false);
 const [foreground,setForeground]=useState(typeof document==='undefined'||!document.hidden);
 useEffect(()=>{const update=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const [confirmed,setConfirmed]=useState(false),[visible,setVisible]=useState(false),[failed,setFailed]=useState(false),[ready,setReady]=useState(false),[retry,setRetry]=useState(0),[reason,setReason]=useState('');
 useEffect(()=>{const node=root.current;if(!node)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting));observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>setConfirmed(false),[selection?.url,selection?.kind==='photo'?selection.imageIndex:selection?.start,selection?.kind==='video'?selection.end:0,visible,foreground,retry]);
 useEffect(()=>{setFailed(false);setReason('');setReady(false);hasImage.current=false;},[selection?.url,visible,foreground,retry]);
 useEffect(()=>{
  if(!selection||!visible||!foreground)return;
  let timer:ReturnType<typeof setTimeout>;
  const send=(type:string,value?:number)=>frame.current?.contentWindow?.postMessage({type,value,'x-tiktok-player':true},'https://www.tiktok.com');
  const apply=()=>{send('mute');if(selection.kind==='photo'){send('pause');send('navigateTo',selection.imageIndex);}else{send('seekTo',selection.start);send('play');}};
  const message=(event:MessageEvent)=>{
   if(event.origin!=='https://www.tiktok.com'||event.source!==frame.current?.contentWindow||event.data?.['x-tiktok-player']!==true)return;
   const {type,value}=event.data;
   if(type==='onPlayerReady'){clearTimeout(timer);setReady(true);apply();}
   if(type==='onImageChange'&&typeof value==='number'){if(!preview&&selection.kind==='photo'&&value!==selection.imageIndex){send('navigateTo',selection.imageIndex);return;}hasImage.current=true;setConfirmed(true);clearTimeout(timer);setReady(true);setFailed(false);onPosition?.(value);}
   if(type==='onCurrentTime'&&selection.kind==='video'){
    const time=value?.currentTime;
    if(typeof time==='number'){clearTimeout(timer);setReady(true);setFailed(false);}
    if(typeof time==='number'){if(time>=selection.start-.1&&time<=selection.end)setConfirmed(true);onPosition?.(time);if(!preview&&(time>=selection.end||time<selection.start-.5)){send('seekTo',selection.start);send('play');}}
    if(typeof value?.duration==='number'&&value.duration>0)onDuration?.(value.duration);
    if(!preview&&typeof value?.duration==='number'&&value.duration>0&&selection.end>value.duration+.1){setFailed(true);setReason('O trecho escolhido ultrapassa a duração do vídeo.');}
   }
   if(type==='onStateChange'&&value===0&&!preview&&selection.kind==='video')apply();
   const problem=avatarPlayerError(type,value,selection.kind,hasImage.current);if(problem){clearTimeout(timer);setFailed(true);setReason(problem);}
  };
  window.addEventListener('message',message);
  timer=setTimeout(()=>{setFailed(true);setReason('O TikTok demorou para responder. O player foi mantido para você tentar reproduzir.');},15000);
  if(ready){clearTimeout(timer);apply();}
  return()=>{clearTimeout(timer);send('pause');window.removeEventListener('message',message);};
 },[selection?.url,selection?.kind,selection?.kind==='photo'?selection.imageIndex:selection?.start,selection?.kind==='video'?selection.end:0,visible,foreground,ready,retry]);
 useEffect(()=>{if(ready&&typeof seekTo==='number'&&Number.isFinite(seekTo)){frame.current?.contentWindow?.postMessage({type:'pause','x-tiktok-player':true},'https://www.tiktok.com');frame.current?.contentWindow?.postMessage({type:'seekTo',value:seekTo,'x-tiktok-player':true},'https://www.tiktok.com');}},[seekTo,seekToken,ready]);
 useEffect(()=>{if(ready&&playToken)frame.current?.contentWindow?.postMessage({type:'play','x-tiktok-player':true},'https://www.tiktok.com');},[playToken,ready]);
 const source=selection?new URL(tiktokPost(selection.url).embed):null;
 if(source&&selection){for(const [key,value] of Object.entries({controls:'0',progress_bar:'0',play_button:'0',volume_control:'0',fullscreen_button:'0',timestamp:'0',muted:'1',autoplay:String(Number(selection.kind==='video')),description:'0',music_info:'0'}))source.searchParams.set(key,value);}
 return <><span ref={root} className={'profile-link-avatar '+className} aria-label={alt}>
  {!selection||!visible||!foreground?<img src={selection?'/profile-placeholder.svg':fallback} alt={alt} onError={e=>{e.currentTarget.src='/profile-placeholder.svg';}}/>:<iframe key={retry} ref={frame} src={source!.href} title={'Avatar TikTok: '+alt} allow="autoplay; encrypted-media" tabIndex={preview?0:-1} style={{pointerEvents:preview?'auto':'none',visibility:!preview&&!confirmed?'hidden':'visible',transform:`scale(${selection.zoom??1})`,transformOrigin:'center'}} onError={()=>{setFailed(true);setReason('Não foi possível carregar o player. Tente novamente.');}}/>}
 </span>{preview&&selection?.kind==='video'&&<button type="button" className="people-secondary" onClick={()=>{frame.current?.contentWindow?.postMessage({type:'play','x-tiktok-player':true},'https://www.tiktok.com');setFailed(false);}}>Reproduzir trecho</button>}{preview&&selection?.kind==='video'&&<button type="button" className="people-secondary" onClick={()=>frame.current?.contentWindow?.postMessage({type:'pause','x-tiktok-player':true},'https://www.tiktok.com')}>Pausar no momento exibido</button>}{failed&&preview&&<small className="avatar-player-status" role="status">{reason||'Não foi possível confirmar a exibição.'}{preview&&<><button type="button" onClick={e=>{e.stopPropagation();setRetry(n=>n+1);}}>Tentar novamente</button><a href={selection?.url} target="_blank" rel="noopener noreferrer">Abrir no TikTok</a></>}</small>}
 </>;
}
