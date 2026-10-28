import type {ProfileAvatarSelection} from './profile-avatar';
import {avatarPlayerError} from './avatar-player';
export function createAvatarSession(initial:ProfileAvatarSelection,options:{preview:boolean;send:(type:string,value?:number)=>void;position?:(n:number)=>void;duration?:(n:number)=>void;ready?:()=>void;error?:(s:string)=>void;now?:()=>number}){
 let selection=initial,ready=false,active=true,hasImage=false,lastCorrection=-Infinity;
 const clock=options.now||Date.now;
 function correct(fn:()=>void){if(clock()-lastCorrection<500)return;lastCorrection=clock();fn();}
 function apply(){if(!ready)return;options.send('mute');if(selection.kind==='photo'){options.send('pause');options.send('navigateTo',selection.imageIndex);}else{options.send('seekTo',selection.start);if(active)options.send('play');}}
 function confirm(){if(ready)return;ready=true;options.ready?.();apply();}
 return {
  select(next:ProfileAvatarSelection){const changed=next.kind!==selection.kind||(next.kind==='photo'&&selection.kind==='photo'?next.imageIndex!==selection.imageIndex:next.kind==='video'&&selection.kind==='video'&&(next.start!==selection.start||next.end!==selection.end));selection=next;if(changed){lastCorrection=-Infinity;apply();}},
  active(value:boolean){if(value===active)return;active=value;if(!ready)return;if(!active)options.send('pause');else if(selection.kind==='video')options.send('play');},
  seek(time:number){if(ready&&Number.isFinite(time)){options.send('pause');options.send('seekTo',time);}},
  play(){active=true;options.send('mute');options.send('play');},pause(){options.send('pause');},
  receive(type:string,value:any){
   if(type==='onPlayerReady')confirm();
   if(type==='onImageChange'&&selection.kind==='photo'&&Number.isInteger(value)){
    hasImage=true;confirm();
    if(!options.preview&&value!==selection.imageIndex){correct(()=>options.send('navigateTo',(selection as any).imageIndex));return;}
    options.position?.(value);
   }
   if(type==='onCurrentTime'&&selection.kind==='video'&&Number.isFinite(value?.currentTime)){
    confirm();options.position?.(value.currentTime);
    if(Number.isFinite(value.duration)&&value.duration>0){options.duration?.(value.duration);if(!options.preview&&selection.end>value.duration+.1)options.error?.('O trecho ultrapassa a duração do vídeo.');}
    if(!options.preview&&active&&(value.currentTime>=selection.end||value.currentTime<selection.start-.5))correct(()=>{options.send('seekTo',(selection as any).start);options.send('play');});
   }
   if(type==='onStateChange'&&value===0&&selection.kind==='video'&&!options.preview&&active)correct(apply);
   const error=avatarPlayerError(type,value,selection.kind,hasImage);if(error)options.error?.(error);
  }
 };
}
