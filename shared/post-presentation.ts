import {tiktokPost} from './people';
export type PostPresentation={kind:'photo';indices:number[];zoom:number}|{kind:'video';start:number;end:number;zoom:number};
export function validatePostPresentation(value:any,url:string):PostPresentation|undefined{
 if(value==null)return undefined;
 const source=tiktokPost(url),zoom=value.zoom??1;
 if(!Number.isFinite(zoom)||zoom<.5||zoom>2)throw Error('Zoom deve ficar entre 0,5 e 2.');
 if(source.postType==='photo'&&value.kind==='photo'&&Array.isArray(value.indices)&&value.indices.length>0&&value.indices.length<=100&&value.indices.every((n:any)=>Number.isInteger(n)&&n>=0&&n<=999))return {kind:'photo',indices:[...new Set<number>(value.indices)],zoom};
 if(source.postType==='video'&&value.kind==='video'&&Number.isFinite(value.start)&&Number.isFinite(value.end)&&value.start>=0&&value.end>value.start&&value.end<=7200)return {kind:'video',start:value.start,end:value.end,zoom};
 throw Error('Selecione ao menos uma foto ou um trecho válido de vídeo.');
}
