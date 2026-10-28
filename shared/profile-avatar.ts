import {tiktokPost} from './people';
type AvatarBase={zoom?:number};
export type ProfileAvatarSelection=AvatarBase & ({url:string;kind:'photo';imageIndex:number}|{url:string;kind:'video';start:number;end:number});
export function validateProfileAvatar(value:unknown):ProfileAvatarSelection|undefined{
 if(value==null)return undefined;
 if(typeof value!=='object')throw Error('Avatar inválido.');
 const v=value as any,source=tiktokPost(v.url);
 if(v.zoom!==undefined&&(!Number.isFinite(v.zoom)||v.zoom<.5||v.zoom>2))throw Error('Zoom deve ficar entre 0,5 e 2.');
 const zoom=v.zoom!==undefined?{zoom:v.zoom}:{};
 if(source.postType==='photo'&&v.kind==='photo'&&Number.isInteger(v.imageIndex)&&v.imageIndex>=0&&v.imageIndex<=999)return {url:source.canonical,kind:'photo',imageIndex:v.imageIndex,...zoom};
 if(source.postType==='video'&&v.kind==='video'&&Number.isFinite(v.start)&&Number.isFinite(v.end)&&v.start>=0&&v.end>v.start&&v.end<=7200&&v.end-v.start<=15)return {url:source.canonical,kind:'video',start:v.start,end:v.end,...zoom};
 throw Error('Escolha uma foto válida ou um trecho de vídeo de até 15 segundos.');
}
