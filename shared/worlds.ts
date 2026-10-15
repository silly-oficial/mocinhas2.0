/** Categories reuse existing persisted publication hashtags; no theme preference is changed. */
export const WORLDS = [
 {id:'silly',name:'Silly',tag:'mundo_silly',hint:'Uma dose de fofura e muita imaginação.',invite:'Vem brincar de descobrir!',art:'/worlds/silly.png',aliases:['silly','sillypop']},
 {id:'barbie',name:'Barbie',tag:'mundo_barbie',hint:'Um universo todinho cor-de-rosa.',invite:'Aqui, sonhar é sempre rosa.',art:'/worlds/barbie.jpg',aliases:['barbie','rosabarbie']},
 {id:'powerpuff',name:'Meninas Superpoderosas',tag:'mundo_powerpuff',hint:'Rosa, azul e verde. Juntas em cada aventura.',invite:'Um pouquinho de açúcar, cor e diversão!',art:'/worlds/powerpuff.jpeg',aliases:['powerpuff','meninas_superpoderosas','meninassuperpoderosas','superpoderosas']},
 {id:'cn',name:'Cartoon Network',tag:'mundo_cn',hint:'Cores, desenhos e boas surpresas.',invite:'A diversão mudou de canal.',art:'/worlds/cn.png',aliases:['cn','cartoonnetwork','cartoon_network']},
] as const;
export type WorldId = typeof WORLDS[number]['id'];
export type World = typeof WORLDS[number];
export const getWorld = (id: string | null | undefined) => WORLDS.find(world=>world.id===id);
const key=(tag:string)=>tag.replace(/^#/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s-]+/g,'');
export function belongsToWorld(tags: readonly string[] | undefined, world: World):boolean {
 const aliases=new Set<string>([world.tag,...world.aliases].map(key));
 return !!tags?.some(tag=>aliases.has(key(tag)));
}
export function captionForWorld(caption:string,id:string):string {
 const world=getWorld(id);if(!world)return caption;
 const tags=(caption.match(/#[a-zA-Z0-9_À-ÿ]+/g)||[]).map(t=>t.slice(1));
 return belongsToWorld(tags,world)?caption:`${caption.trim()} #${world.tag}`.trim();
}
