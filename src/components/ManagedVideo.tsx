import {useVideoClarity,useVideoIntensity} from '../media/videoQuality';
import {startVideoEnhancer} from '../media/videoEnhancer';
import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { useUi } from '../i18n/ui';

// A single owner across feed, modal and Universe. Capturing native play also
// covers audio controls and any legacy player that is still mounted.
const candidates = new Map<HTMLVideoElement, { ratio: number; active: boolean }>();
let installed = false;
let channel: BroadcastChannel | undefined;
export function pauseMedia() {
  document.querySelectorAll<HTMLMediaElement>('video,audio').forEach(media => media.pause());
}
function install() {
  if (installed) return;
  installed = true;
  try { channel = new BroadcastChannel('mocinhas-media'); channel.onmessage = pauseMedia; } catch {}
  document.addEventListener('play', event => {
    const current = event.target;
    if (!(current instanceof HTMLMediaElement)) return;
    if (document.hidden) { current.pause(); return; }
    document.querySelectorAll<HTMLMediaElement>('video,audio').forEach(media => { if (media !== current) media.pause(); });
    channel?.postMessage('pause');
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseMedia(); else choose(); });
  window.addEventListener('pagehide', pauseMedia);
}
function choose() {
  if (document.hidden) return;
  const ranked = [...candidates].filter(([v, c]) => c.active && c.ratio >= .55 && v.isConnected)
    .sort(([a], [b]) => Math.abs(a.getBoundingClientRect().top + a.clientHeight / 2 - innerHeight / 2) - Math.abs(b.getBoundingClientRect().top + b.clientHeight / 2 - innerHeight / 2));
  const winner = ranked[0]?.[0];
  for (const [video] of candidates) {
    if (video !== winner) video.pause();
    else if (video.paused) video.play().catch(() => { /* Visible play fallback for browser restrictions. */ });
  }
}
export function ManagedVideo({ src, poster, className, active = true, universe = false, soundOn = false, showSeek = true, onElement, showTime = false }: {
  src: string; poster?: string; className?: string; active?: boolean; universe?: boolean; soundOn?: boolean; showSeek?: boolean; showTime?: boolean; onElement?: (element: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const canvas=useRef<HTMLCanvasElement>(null),clarity=useVideoClarity(),intensity=useVideoIntensity();
  const intensityRef=useRef(intensity);intensityRef.current=intensity;
  const [enhanced,setEnhanced]=useState(false),[bypass,setBypass]=useState(false);
  const [muted, setMuted] = useState(true), [playing, setPlaying] = useState(false);
  const ui = useUi();
  const [duration,setDuration]=useState(0),[position,setPosition]=useState(0);
  const seeking=useRef(false);
  const format=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  useEffect(() => {
    install();
    const video = ref.current!;
    // Prime nearby videos without requiring a tap, but do not download the entire feed.
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const candidate = candidates.get(video);
        if (candidate) candidate.ratio = entry.intersectionRatio;
        if (entry.isIntersecting) video.preload = 'auto';
      }
      choose();
    }, { threshold: [0, .25, .55, .75, 1] });
    candidates.set(video, { ratio: universe ? 1 : 0, active });
    setDuration(0);setPosition(0);setBypass(false);setEnhanced(false);
    video.src = src;
    video.load();
    observer.observe(video);
    onElement?.(video);
    return () => {
      observer.disconnect(); candidates.delete(video); video.pause();
      video.removeAttribute('src'); video.load(); onElement?.(null);
    };
  }, [src]);
  useEffect(() => {
    const video = ref.current!;
    const candidate = candidates.get(video);
    if (candidate) candidate.active = active;
    if (!active) video.pause();
    choose();
  }, [active]);
  useEffect(()=>{setEnhanced(false);if(!clarity||bypass||!playing||!active)return;const v=ref.current,c=canvas.current;if(!v||!c)return;return startVideoEnhancer(v,c,()=>setEnhanced(true),()=>{setEnhanced(false);setBypass(true);},()=>intensityRef.current);},[src,clarity,bypass,playing,active]);
  return <div className={universe ? 'absolute inset-0' : 'relative video-shell'}>
    <video ref={ref} poster={poster} muted={universe ? !soundOn : muted} loop playsInline preload="metadata" controls={false} controlsList="nodownload noremoteplayback" disablePictureInPicture disableRemotePlayback onContextMenu={e=>e.preventDefault()}
      className={className || 'w-full max-h-[75vh] object-contain'}
      onDurationChange={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)}
      onTimeUpdate={e=>{if(!seeking.current)setPosition(e.currentTarget.currentTime);}}
      onLoadedMetadata={event => { const v = event.currentTarget; setDuration(Number.isFinite(v.duration)?v.duration:0); if (!poster && v.paused && v.duration > .1) v.currentTime = .05; }}
      onPlay={event => { if (!active) event.currentTarget.pause(); else setPlaying(true); }} onPause={() => setPlaying(false)}
      onVolumeChange={event => setMuted(event.currentTarget.muted)} />
    {clarity&&!bypass&&playing&&active&&<canvas key={src} ref={canvas} aria-hidden="true" className={`${className || 'w-full max-h-[75vh] object-contain'} media-enhanced`} style={{visibility:enhanced?'visible':'hidden'}}/>}
    {!universe && showSeek && <input className="media-seek" type="range" aria-label={ui('Posição do vídeo')} aria-valuetext={`${format(position)} / ${format(duration)}`} min="0" max={duration||1} step="0.1" value={Math.min(position,duration||1)} disabled={!active||duration<=0}
      style={{'--seek-progress':`${duration?position/duration*100:0}%`} as React.CSSProperties}
      onPointerDown={()=>{seeking.current=true;}} onPointerUp={()=>{seeking.current=false;}} onPointerCancel={()=>{seeking.current=false;}} onBlur={()=>{seeking.current=false;}}
      onChange={e=>{const next=Number(e.target.value);setPosition(next);const v=ref.current;if(v&&Number.isFinite(v.duration))v.currentTime=Math.min(next,Math.max(0,v.duration-.05));}}/>}
    {!universe && showTime && <output className="media-time" aria-label={ui('Posição do vídeo')}>{format(position)} / {format(duration)}</output>}
    {!universe && <button className="media-sound" aria-label={muted ? ui('Ativar som') : ui('Silenciar')} onClick={() => { const v = ref.current!; v.muted = !v.muted; setMuted(v.muted); v.play().catch(() => {}); }}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>}
    {!playing && active && <button className="media-play" aria-label={ui('Reproduzir vídeo')} onClick={() => ref.current?.play().catch(() => {})}><Play size={22} /></button>}
  </div>;
}
