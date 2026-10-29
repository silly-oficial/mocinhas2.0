import type {PersonProfile} from './people';
import {socialVideo} from './people';

export function restoreGalleryVisibility(profiles:PersonProfile[]):PersonProfile[]{
 return profiles.map(profile=>({...profile,hidden:false,published:true,videos:profile.videos.map(video=>{
  if(video.kind==='upload'||video.url.startsWith('/uploads/'))return {...video,kind:'upload' as const};
  try{const source=socialVideo(video.url);return {...video,url:source.canonical,kind:'social' as const,source_platform:source.platform.toLowerCase(),source_url:source.canonical,display_mode:'embed' as const};}catch{return video;}
 })}));
}

export function publicationInput(input:any,existing?:PersonProfile){
 if(input.hidden!==undefined&&typeof input.hidden!=='boolean')throw Error('Visibilidade inválida.');
 const hidden=input.hidden??existing?.hidden??false;
 return {...input,hidden,published:!hidden};
}
