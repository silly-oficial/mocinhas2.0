export interface PersonProfile {
 id: string; name: string; username: string; bio: string; avatar: string; cover: string;
 photos: string[]; videos: {url: string; title: string}[];
 socials: {tiktok: string; instagram: string; pinterest: string};
 tags: string[]; published: boolean; featured: boolean; order: number; createdAt: string; updatedAt: string;
}
export function socialVideo(url: string): {platform: 'TikTok'|'Instagram'; canonical: string; embed: string} {
 let u: URL;try{u=new URL(url);}catch{throw Error('Cole o link completo do vídeo do TikTok ou Instagram.');}if(u.protocol !== 'https:' || u.username || u.password)throw Error('Use links https do TikTok ou Instagram.');
 const host=u.hostname.toLowerCase().replace(/^www\./,'');
 const tk=u.pathname.match(/^\/@[\w.]+\/video\/(\d{10,25})\/?$/);
 if(host==='tiktok.com'&&tk)return {platform:'TikTok',canonical:`https://www.tiktok.com${u.pathname.replace(/\/$/,'')}`,embed:`https://www.tiktok.com/player/v1/${tk[1]}?autoplay=0&rel=0`};
 const ig=u.pathname.match(/^\/(reel|p|tv)\/([\w-]{3,80})\/?$/);
 if(host==='instagram.com'&&ig)return {platform:'Instagram',canonical:`https://www.instagram.com/${ig[1]}/${ig[2]}/`,embed:`https://www.instagram.com/${ig[1]}/${ig[2]}/embed/`};
 throw Error('Use o link completo do vídeo: tiktok.com/@usuario/video/… ou instagram.com/reel/… (não o link encurtado).');
}
export function socialUrl(platform: keyof PersonProfile['socials'], handle: string) {
 return platform==='tiktok'?`https://www.tiktok.com/@${encodeURIComponent(handle)}`:platform==='instagram'?`https://www.instagram.com/${encodeURIComponent(handle)}/`:`https://www.pinterest.com/${encodeURIComponent(handle)}/`;
}
