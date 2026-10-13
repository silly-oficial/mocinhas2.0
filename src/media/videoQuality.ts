import {useSyncExternalStore} from 'react';
export const clarityKey='mocinhas_video_clarity',intensityKey='mocinhas_video_clarity_intensity';
let fallbackEnabled=true,fallbackIntensity=70;
const listeners=new Set<()=>void>();
export function normalizeIntensity(value:number){return Number.isFinite(value)?Math.round(Math.min(100,Math.max(0,value))):70;}
function read(){try{const value=localStorage.getItem(clarityKey);return value===null?fallbackEnabled:value!=='off';}catch{return fallbackEnabled;}}
function readIntensity(){try{const value=localStorage.getItem(intensityKey);return value===null||value.trim()===''?fallbackIntensity:normalizeIntensity(Number(value));}catch{return fallbackIntensity;}}
function subscribe(fn:()=>void){listeners.add(fn);const storage=(e:StorageEvent)=>{if(e.key===clarityKey||e.key===intensityKey||e.key===null)fn();};window.addEventListener('storage',storage);return()=>{listeners.delete(fn);window.removeEventListener('storage',storage);};}
export function useVideoClarity(){return useSyncExternalStore(subscribe,read,()=>true);}
export function useVideoIntensity(){return useSyncExternalStore(subscribe,readIntensity,()=>70);}
export function setVideoClarity(enabled:boolean){fallbackEnabled=enabled;try{localStorage.setItem(clarityKey,enabled?'on':'off');}catch{}listeners.forEach(fn=>fn());}
export function setVideoIntensity(value:number){fallbackIntensity=normalizeIntensity(value);try{localStorage.setItem(intensityKey,String(fallbackIntensity));}catch{}listeners.forEach(fn=>fn());}
