import React,{useEffect,useRef,useState} from 'react';
import {personCutout} from '../media/person-cutout';
export function SkyglassPhoto({src,alt,style,enabled,onReady}:{src:string;alt:string;style?:React.CSSProperties;enabled:boolean;onReady:(ready:boolean)=>void}){
 const root=useRef<HTMLImageElement>(null),[cutout,setCutout]=useState('');
 useEffect(()=>{
  let disposed=false,objectUrl='';onReady(false);setCutout('');
  if(!enabled)return;
  const element=root.current;if(!element)return;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();
   personCutout(src).then(blob=>{if(disposed)return;objectUrl=URL.createObjectURL(blob);setCutout(objectUrl);onReady(true);}).catch(()=>{});
  },{rootMargin:'100px'});observer.observe(element);
  return()=>{disposed=true;observer.disconnect();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[src,enabled,onReady]);
 return <><img ref={root} draggable={false} loading="lazy" src={src} alt={alt} className="sky-media" style={style}/>{enabled&&cutout&&<img className="sky-media sky-person-cutout" src={cutout} alt="" aria-hidden="true" draggable={false} style={style}/>}</>;
}
