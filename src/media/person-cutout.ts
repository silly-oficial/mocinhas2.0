let worker:Worker|undefined,id=0;
const pending=new Map<number,{resolve:(blob:Blob)=>void;reject:()=>void}>();
const cache=new Map<string,Promise<Blob>>();
let queue=Promise.resolve();
function processImage(image:ImageBitmap):Promise<Blob>{
 worker ||= new Worker(new URL('./person-cutout.worker.ts',import.meta.url));
 worker.onmessage=event=>{const job=pending.get(event.data.id);if(!job)return;pending.delete(event.data.id);event.data.blob?job.resolve(event.data.blob):job.reject();};
 worker.onerror=()=>{pending.forEach(job=>job.reject());pending.clear();worker?.terminate();worker=undefined;};
 return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject:()=>reject(new Error('cutout unavailable'))});worker!.postMessage({id:key,image,base:new URL('/assets/person-segmentation',location.origin).href},[image]);});
}
export function personCutout(url:string):Promise<Blob>{
 const existing=cache.get(url);if(existing)return existing;
 const task=queue.then(async()=>{
  const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw new Error('photo unavailable');
  const blob=await response.blob(),original=await createImageBitmap(blob);
  const scale=Math.min(1,960/Math.max(original.width,original.height));
  const image=scale<1?await createImageBitmap(original,{resizeWidth:Math.round(original.width*scale),resizeHeight:Math.round(original.height*scale),resizeQuality:'high'}):original;
  if(image!==original)original.close();return processImage(image);
 });
 queue=task.then(()=>{},()=>{});cache.set(url,task);
 if(cache.size>8)cache.delete(cache.keys().next().value!);
 return task;
}
