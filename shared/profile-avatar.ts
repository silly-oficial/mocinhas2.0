import {tiktokPost} from './people';
type AvatarBase={zoom?:number;offsetX?:number;offsetY?:number;source?:'upload'};
export type ProfileAvatarSelection=AvatarBase & ({url:string;kind:'photo';imageIndex:number}|{url:string;kind:'video';start:number;end:number});
export function validateProfileAvatar(value:unknown):ProfileAvatarSelection|undefined{
 if(value==null)return undefined;
 if(typeof value!=='object')throw Error('Avatar inválido.');
 const v=value as any;
 if(v.source!==undefined&&v.source!=='upload')throw Error('Origem do avatar inválida.');
 for(const key of ['offsetX','offsetY'])if(v[key]!==undefined&&(!Number.isFinite(v[key])||Math.abs(v[key])>50))throw Error('Posição deve ficar entre -50 e 50.');
 if(v.zoom!==undefined&&(!Number.isFinite(v.zoom)||v.zoom<.5||v.zoom>2))throw Error('Zoom deve ficar entre 0,5 e 2.');
 const zoom={...(v.zoom!==undefined?{zoom:v.zoom}:{}),...(v.offsetX!==undefined?{offsetX:v.offsetX}:{}),...(v.offsetY!==undefined?{offsetY:v.offsetY}:{})};
 if(v.source==='upload'){
  const ext=v.kind==='photo'?'jpg|png|gif|webp|avif':'mp4|mov|webm';
  if(!['photo','video'].includes(v.kind)||typeof v.url!=='string'||!new RegExp('^/uploads/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.('+ext+')$','i').test(v.url))throw Error('Envie a foto ou o vídeo pelo painel.');
  if(v.kind==='photo')return {source:'upload',url:v.url,kind:'photo',imageIndex:0,...zoom};
  if(Number.isFinite(v.start)&&Number.isFinite(v.end)&&v.start>=0&&v.end>v.start&&v.end<=7200&&v.end-v.start<=15)return {source:'upload',url:v.url,kind:'video',start:v.start,end:v.end,...zoom};
  throw Error('Escolha um trecho de vídeo de até 15 segundos.');
 }
 const source=tiktokPost(v.url);
 if(source.postType==='photo'&&v.kind==='photo'&&Number.isInteger(v.imageIndex)&&v.imageIndex>=0&&v.imageIndex<=999)return {url:source.canonical,kind:'photo',imageIndex:v.imageIndex,...zoom};
 if(source.postType==='video'&&v.kind==='video'&&Number.isFinite(v.start)&&Number.isFinite(v.end)&&v.start>=0&&v.end>v.start&&v.end<=7200&&v.end-v.start<=15)return {url:source.canonical,kind:'video',start:v.start,end:v.end,...zoom};
 throw Error('Escolha uma foto válida ou um trecho de vídeo de até 15 segundos.');
}
