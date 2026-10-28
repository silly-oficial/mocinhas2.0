import React,{useEffect,useState} from 'react';
import {tiktokPost} from '../../shared/people';
import {SocialVideoPlayer} from './SocialVideoPlayer';
import {ModalFrame} from './ModalFrame';
import {MediaCredit} from './CreatorCredit';
import type {PostMedia} from '../types';
export function TikTokPostCard({media,active=true}:{media:PostMedia;active?:boolean}){
 const [opened,setOpened]=useState(false),[imageFailed,setImageFailed]=useState(false);
 const source=tiktokPost(media.url),handle=new URL(source.canonical).pathname.split('/')[1];
 useEffect(()=>{if(!active)setOpened(false);},[active]);
 return <section className="tiktok-post-card"><button type="button" className="tiktok-post-preview" disabled={!active} onClick={()=>setOpened(true)} aria-label={'Ver publicação de '+handle}>{media.thumbnail&&media.thumbnail!==media.url&&!imageFailed?<img src={media.thumbnail} loading="lazy" alt="Prévia da publicação do criador" onError={()=>setImageFailed(true)}/>:<span>{source.postType==='photo'?'Carrossel de fotos':'Publicação do TikTok'}</span>}<strong>Ver publicação</strong></button><MediaCredit handle={handle} sourceUrl={source.canonical}/>{opened&&active&&<ModalFrame label={'Publicação de '+handle} onClose={()=>setOpened(false)}><section className="welcome-tiktok-dialog"><button type="button" className="people-secondary" onClick={()=>setOpened(false)}>Fechar</button><SocialVideoPlayer video={{...media,title:handle,kind:'social'}} name={handle}/><MediaCredit handle={handle} sourceUrl={source.canonical}/></section></ModalFrame>}</section>;
}
