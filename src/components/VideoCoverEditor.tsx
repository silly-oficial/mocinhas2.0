import React, { useEffect, useRef, useState } from 'react';
import { useUi } from '../i18n/ui';
import { api } from '../services/api';
import { type VideoCover } from '../../shared/video-cover';

const clock = (seconds: number) => `${Math.floor(seconds/60)}:${(seconds%60).toFixed(2).padStart(5,'0')}`;
export function VideoCoverEditor({ url, thumbnail, coverTime, disabled = false, onChange, onSave }: { url: string; thumbnail?: string; coverTime?: number; disabled?: boolean; onChange?: (cover: VideoCover) => void; onSave?: (cover: VideoCover) => Promise<void> }) {
  const ui=useUi(),video=useRef<HTMLVideoElement>(null);
  const [duration,setDuration]=useState(0),[time,setTime]=useState(coverTime||0),[ready,setReady]=useState(false),[seeking,setSeeking]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[localUrl,setLocalUrl]=useState('');
  const source=localUrl||url;
  useEffect(()=>{setDuration(0);setReady(false);setMessage('');setTime(coverTime||0);},[source]);
  useEffect(()=>()=>{if(localUrl)URL.revokeObjectURL(localUrl);},[localUrl]);
  function seek(value:number){const el=video.current;if(!el||!duration)return;const next=Math.max(0,Math.min(value,Math.max(0,duration-.01)));setTime(next);el.currentTime=next;}
  async function select(){
    const el=video.current;if(!el||!ready||el.seeking||busy||disabled)return;
    setBusy(true);setMessage('');
    try{
      el.pause();
      const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(el.videoWidth,el.videoHeight));
      canvas.width=Math.max(1,Math.round(el.videoWidth*scale));canvas.height=Math.max(1,Math.round(el.videoHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error(ui('Não foi possível preparar a capa.'));
      ctx.drawImage(el,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob>((resolve,reject)=>{try{canvas.toBlob(b=>b?resolve(b):reject(Error('frame')),'image/jpeg',.85);}catch(e){reject(e);}});
      const result=await api.uploadFile(new File([blob],`frame_${Date.now()}.jpg`,{type:'image/jpeg'}));
      if(!result.url)throw Error(ui('Não foi possível enviar a capa.'));
      const cover={thumbnail:result.url,coverTime:el.currentTime};
      if(onSave)await onSave(cover);else onChange?.(cover);
      setMessage(ui(onSave?'Capa salva.':'Capa selecionada.'));
    }catch(error:any){setMessage(error?.name==='SecurityError'||error?.message==='frame'?ui('Este link bloqueia a captura. Use o arquivo original do vídeo.'):error.message||ui('Não foi possível salvar a capa.'));}
    finally{setBusy(false);}
  }
  return <section className="video-cover-editor" aria-label={ui('Capa do vídeo')}><h4>{ui('Capa do vídeo')}</h4><p>{ui('Arraste o indicador até o frame desejado. A capa muda sem alterar o vídeo.')}</p>
    <video key={source} ref={video} src={source} crossOrigin="anonymous" muted playsInline preload="metadata" controls={false} onLoadedMetadata={e=>{const el=e.currentTarget;setDuration(Number.isFinite(el.duration)?el.duration:0);el.currentTime=Math.min(coverTime||0,Math.max(0,el.duration-.01));}} onLoadedData={()=>setReady(true)} onSeeking={()=>setSeeking(true)} onSeeked={e=>{setSeeking(false);setReady(true);setTime(e.currentTarget.currentTime);}} onError={()=>{setReady(false);setMessage(ui('Não foi possível abrir este vídeo. Tente usar o arquivo original.'));}}/>
    <fieldset disabled={disabled||busy||!duration}><legend className="sr-only">{ui('Selecionar frame')}</legend><label>{ui('Posição da capa')} <output>{clock(time)} / {clock(duration)}</output><input type="range" aria-label={ui('Frame da capa')} min="0" max={Math.max(0,duration-.01)} step="0.01" value={Math.min(time,Math.max(0,duration-.01))} onChange={e=>seek(Number(e.target.value))}/></label><div className="video-cover-actions"><button type="button" onClick={()=>seek(time-.1)}>− 0,1 s</button><button type="button" onClick={()=>seek(time+.1)}>+ 0,1 s</button><button type="button" className="admin-primary" disabled={seeking||!ready} onClick={select}>{ui(busy?'Salvando…':onSave?'Salvar capa':'Usar este frame')}</button></div></fieldset>
    {thumbnail&&thumbnail!==url&&<img className="video-cover-current" src={thumbnail} alt={ui('Capa atual')}/>}
    <label className="video-cover-local">{ui('Usar arquivo original')}<input type="file" accept="video/*" disabled={disabled||busy} onChange={e=>{const file=e.target.files?.[0];if(file)setLocalUrl(URL.createObjectURL(file));e.target.value='';}}/></label>
    {message&&<p role="status">{message}</p>}
  </section>;
}
