import {tiktokPost} from './people';
import {cleanTikTokPlayerSource} from './tiktok-player-options';
import type {ProfileAvatarSelection} from './profile-avatar';
/** Zoom changes only the containing viewport, never the iframe URL or playback policy. */
export function avatarEmbedSource(selection:ProfileAvatarSelection,{preview=false}:{interactive?:boolean;preview?:boolean}={}){
 const source=new URL(tiktokPost(selection.url).embed);
 const video=selection.kind==='video';
 for(const [key,value] of Object.entries({controls:'0',progress_bar:'0',play_button:'0',volume_control:'0',fullscreen_button:'0',timestamp:'0',muted:'1',autoplay:video?'1':'0',loop:video&&!preview?'1':'0',description:'0',music_info:'0'}))source.searchParams.set(key,value);
 return cleanTikTokPlayerSource(source.href);
}
