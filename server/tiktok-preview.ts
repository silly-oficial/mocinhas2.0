import {tiktokPost} from '../shared/people';
import type {TikTokCache} from './tiktok-oembed';
/** oEmbed availability describes metadata, not whether the official player can display a post. */
export async function optionalTikTokPreview(url:string,resolve:(url:string,required:boolean)=>Promise<TikTokCache>){
 const canonical=tiktokPost(url).canonical;
 try{const data=await resolve(canonical,false);return {...data,available:data.available?true:null};}
 catch{return {url:canonical,thumbnail_url:'',author_name:'',checkedAt:new Date().toISOString(),available:null};}
}
