import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {ModalFrame} from './ModalFrame';
import {pauseMedia} from './ManagedVideo';
import {ui,useUi} from '../i18n/ui';
export function FullVideoViewer({src,title,onClose,startTime=0}:{src:string;title:string;onClose:()=>void;startTime?:number}){
 const video=useRef<HTMLVideoElement>(null);useUi();useEffect(()=>{pauseMedia();video.current?.play().catch(()=>{});},[]);
 return <ModalFrame label={title} onClose={onClose} className="profile-video-full"><div className="media-full-content"><button className="media-full-close" aria-label={ui('Fechar tela cheia')} onClick={onClose}><X size={21}/></button><video ref={video} src={src} onLoadedMetadata={e=>{if(Number.isFinite(startTime))e.currentTarget.currentTime=Math.min(startTime,e.currentTarget.duration||0);}} title={title} controls playsInline preload="metadata"/></div></ModalFrame>;
}
