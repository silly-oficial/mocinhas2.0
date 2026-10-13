import React from 'react';
import {Film} from 'lucide-react';
import {useUi} from '../i18n/ui';
import {useVideoClarity,useVideoIntensity,setVideoClarity,setVideoIntensity} from '../media/videoQuality';
export function VideoQualitySettings(){
 const ui=useUi(),enabled=useVideoClarity(),intensity=useVideoIntensity();
 return <section className="video-quality-settings">
  <button className="account-row" role="switch" aria-checked={enabled} onClick={()=>setVideoClarity(!enabled)}><Film size={20}/><span><strong>{ui('Nitidez dos vídeos')}</strong><small>{ui(enabled?'Melhoria automática ativada':'Imagem original')}</small></span><span aria-hidden="true">{ui(enabled?'Ativada':'Desativada')}</span></button>
  <div className="video-quality-control"><label htmlFor="video-clarity-intensity"><span>{ui('Intensidade da nitidez')}</span><output>{intensity}%</output></label><input id="video-clarity-intensity" type="range" min="0" max="100" step="1" value={intensity} disabled={!enabled} onChange={e=>setVideoIntensity(Number(e.target.value))} aria-valuetext={`${intensity}%`}/><div className="video-quality-scale"><span>{ui('Original')}</span><span>{ui('Máxima')}</span></div><p>{ui('Intensidade alta pode destacar ruído e contornos. Ajuste conforme o vídeo.')}</p></div>
 </section>;
}
