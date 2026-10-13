import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
let segmenter: Promise<ImageSegmenter> | undefined;
self.onmessage = async (event: MessageEvent<{ id:number; image:ImageBitmap; base:string }>) => {
 const {id,image,base}=event.data;
 try {
  segmenter ||= FilesetResolver.forVisionTasks(base).then(files => ImageSegmenter.createFromOptions(files, {baseOptions:{modelAssetPath:base+'/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false}));
  const model=await segmenter;
  const result=model.segment(image);
  const masks=result.confidenceMasks;
  if(!masks?.length)throw new Error('mask');
  const mask=masks[masks.length===1?0:1],values=mask.getAsFloat32Array();
  const pixels=new Uint8ClampedArray(values.length*4);let foreground=0;
  for(let i=0;i<values.length;i++){const alpha=Math.max(0,Math.min(1,(values[i]-.15)/.75));foreground+=alpha;pixels[i*4]=255;pixels[i*4+1]=255;pixels[i*4+2]=255;pixels[i*4+3]=Math.round(alpha*255);}
  const fraction=foreground/values.length;
  const width=mask.width,height=mask.height;result.close();
  if(fraction<.02||fraction>.95)throw new Error('no useful person mask');
  const matte=new OffscreenCanvas(width,height);matte.getContext('2d')!.putImageData(new ImageData(pixels,width,height),0,0);
  const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d')!;
  ctx.drawImage(image,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(matte,0,0,image.width,image.height);
  const blob=await canvas.convertToBlob({type:'image/png'});
  self.postMessage({id,blob});
 }catch {self.postMessage({id,error:true});}
 finally {image.close();}
};
