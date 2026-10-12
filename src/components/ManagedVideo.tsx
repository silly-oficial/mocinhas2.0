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
export function ManagedVideo({ src, poster, className, active = true, universe = false, soundOn = false, onElement }: {
  src: string; poster?: string; className?: string; active?: boolean; universe?: boolean; soundOn?: boolean; onElement?: (element: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true), [playing, setPlaying] = useState(false);
  const ui = useUi();
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
  return <div className={universe ? 'absolute inset-0' : 'relative video-shell'}>
    <video ref={ref} poster={poster} muted={universe ? !soundOn : muted} loop playsInline preload="metadata" controls={!universe} disablePictureInPicture
      className={className || 'w-full max-h-[75vh] object-contain'}
      onLoadedMetadata={event => { const v = event.currentTarget; if (!poster && v.paused && v.duration > .1) v.currentTime = .05; }}
      onPlay={event => { if (!active) event.currentTarget.pause(); else setPlaying(true); }} onPause={() => setPlaying(false)}
      onVolumeChange={event => setMuted(event.currentTarget.muted)} />
    {!universe && <button className="media-sound" aria-label={muted ? ui('Ativar som') : ui('Silenciar')} onClick={() => { const v = ref.current!; v.muted = !v.muted; setMuted(v.muted); v.play().catch(() => {}); }}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>}
    {!playing && active && <button className="media-play" aria-label={ui('Reproduzir vídeo')} onClick={() => ref.current?.play().catch(() => {})}><Play size={22} /></button>}
  </div>;
}
