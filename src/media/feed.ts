import type {Post} from '../types';
// Keep mixed albums accessible in both relevant tabs without moving or deleting data.
export function mediaFeed(posts:Post[],kind:'feed'|'videos'){
 return posts.map(p=>({...p,media:p.media.filter(m=>kind==='videos'?m.type==='video':m.type!=='video')})).filter(p=>p.media.length>0);
}
