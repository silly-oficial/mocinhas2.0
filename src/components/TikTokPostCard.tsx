import React from 'react';
import {SocialVideoPlayer} from './SocialVideoPlayer';
import {tiktokPost} from '../../shared/people';
import type {PostMedia} from '../types';
export function TikTokPostCard({media,active=true}:{media:PostMedia;active?:boolean}){
 const source=tiktokPost(media.url),handle=new URL(source.canonical).pathname.split('/')[1];
 return <section className="tiktok-post-card">{active?<SocialVideoPlayer video={{...media,title:handle,kind:'social'}} name={handle}/>:media.thumbnail?<img src={media.thumbnail} loading="lazy" alt="Publicação"/>:null}</section>;
}
