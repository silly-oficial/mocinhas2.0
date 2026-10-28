/** Supported official embed options only; the iframe does not expose TikTok's Clear display action. */
export function cleanTikTokPlayerSource(embed:string){
 const source=new URL(embed);
 for(const name of ['controls','progress_bar','play_button','volume_control','fullscreen_button','timestamp','description','music_info','closed_caption','native_context_menu'])source.searchParams.set(name,'0');
 return source.href;
}
