import {useSyncExternalStore} from 'react';
const key='mocinhas_video_clarity';
let fallbackEnabled=true;
const listeners=new Set<()=>void>();
function read(){try{const value=localStorage.getItem(key);return value===null?fallbackEnabled:value!=='off';}catch{return fallbackEnabled;}}
function subscribe(fn:()=>void){listeners.add(fn);const storage=(e:StorageEvent)=>{if(e.key===key||e.key===null)fn();};window.addEventListener('storage',storage);return()=>{listeners.delete(fn);window.removeEventListener('storage',storage);};}
export function useVideoClarity(){return useSyncExternalStore(subscribe,read,()=>true);}
export function setVideoClarity(enabled:boolean){fallbackEnabled=enabled;try{localStorage.setItem(key,enabled?'on':'off');}catch{}listeners.forEach(fn=>fn());}
