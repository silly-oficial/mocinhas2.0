export interface PersonProfile {
 verified?: boolean;
 mediaSources?: MediaOrigin[];
 id: string; name: string; username: string; bio: string; avatar: string; cover: string;
 photos: string[]; videos: ({url: string; title: string; kind?: 'upload'|'social'; thumbnail?:string; duration?:number} & Partial<MediaOrigin>)[];
 socials: {tiktok: string; instagram: string; pinterest: string};
 tags: string[]; published: boolean; featured: boolean; order: number; createdAt: string; updatedAt: string;
}
export interface MediaOrigin {
 url:string;source_platform:string;source_url:string;source_handle:string;captured_at:string;
 display_mode:'embed'|'reupload';last_check_at:string|null;is_still_available:boolean|null;
}
export function socialVideo(url: string): {platform: 'TikTok'|'Instagram'; canonical: string; embed: string; postType?: 'video'|'photo'} {
 let u: URL;try{u=new URL(url);}catch{throw Error('Cole o link completo do post do TikTok ou Instagram.');}if(u.protocol !== 'https:' || u.username || u.password)throw Error('Use links https do TikTok ou Instagram.');
 const host=u.hostname.toLowerCase().replace(/^www\./,'');
 const tk=u.pathname.match(/^\/@[\w.]+\/(video|photo)\/(\d{10,25})\/?$/);
 if(host==='tiktok.com'&&tk)return {platform:'TikTok',canonical:`https://www.tiktok.com${u.pathname.replace(/\/$/,'')}`,postType:tk[1] as 'video'|'photo',embed:`https://www.tiktok.com/player/v1/${tk[2]}?autoplay=0&rel=0&description=1&music_info=1`};
 const ig=u.pathname.match(/^\/(reel|p|tv)\/([\w-]{3,80})\/?$/);
 if(host==='instagram.com'&&ig)return {platform:'Instagram',canonical:`https://www.instagram.com/${ig[1]}/${ig[2]}/`,embed:`https://www.instagram.com/${ig[1]}/${ig[2]}/embed/`};
 throw Error('Use o link completo da publicação: tiktok.com/@usuario/video/… ou /photo/… ou instagram.com/reel/… (não o link encurtado).');
}
export const categoryKey = (value:string) => value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
export function socialUrl(platform: keyof PersonProfile['socials'], handle: string) {
 const username=handle.trim().replace(/^@/,'');
 return platform==='tiktok'?`https://www.tiktok.com/@${encodeURIComponent(username)}`:platform==='instagram'?`https://www.instagram.com/${encodeURIComponent(username)}/`:`https://www.pinterest.com/${encodeURIComponent(username)}/`;
}



export function tiktokPost(url:string) {
 const source=socialVideo(url);
 if(source.platform!=='TikTok')throw Error('Use somente links de publicações do TikTok (/video/ ou /photo/).');
 return source;
}
