import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useUi } from '../i18n/ui';

/** Native scrolling with a larger card at the visual center. */
export function PublicationGallery({ orix, videos = false, children }: { orix: boolean; videos?: boolean; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const ui = useUi();
  const measure = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const cards = [...el.querySelectorAll<HTMLElement>(':scope > article')];
    const frame = el.getBoundingClientRect();
    const center = frame.left + frame.width / 2;
    const headerRect = document.querySelector('.app-header')?.getBoundingClientRect();
    const headerBottom = headerRect?.bottom || 0;
    const navRect = document.querySelector('.app-bottom-nav')?.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const shell = el.closest('.app-shell');
    const footerSpace = shell ? parseFloat(getComputedStyle(shell).paddingBottom) || 0 : 0;
    const scrollBottom = viewportBottom - footerSpace - 8;
    const bottom = navRect && navRect.height > 0 ? Math.min(navRect.top, scrollBottom) : scrollBottom;
    const room = Math.max(0, bottom - headerBottom - 32);
    const wrapper = el.parentElement!;
    const stableTop = Math.max(headerBottom + 12, wrapper.getBoundingClientRect().top);
    const available = Math.max(0, bottom - stableTop - 24);
    const headingRect = document.querySelector('.orix-page-heading')?.getBoundingClientRect();
    const headingHeight = headingRect?.height || 1;
    const progress = Math.max(0, Math.min(1, (headerBottom + headingHeight - (headingRect?.bottom || 0)) / headingHeight));
    // Finish every geometry read before changing styles: no layout flush per card.
    const measurements = cards.map(card => {
      const width = card.offsetWidth;
      const distance = Math.abs(frame.left + card.offsetLeft - el.scrollLeft + width / 2 - center);
      const stage = card.querySelector<HTMLElement>('.sky-media-stage');
      const video = card.querySelector('video');
      const isVideo = card.classList.contains('orix-video');
      const full = card.classList.contains('show-full-media');
      const base = Math.min(width * 5 / 3, Math.max(280, room - (isVideo ? 198 : 230)));
      const ratio = video?.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 9 / 16;
      const videoHeight = Math.max(0, Math.min(width / ratio, available - 120));
      const height = Math.max(0, Math.min(available, full ? isVideo ? videoHeight + 120 : room : base + 180 * progress));
      return { card, stage, height, scale: 1 - .14 * Math.min(1, distance / Math.max(1, width)), videoHeight, videoWidth: videoHeight * ratio };
    });
    const nearest = measurements.reduce<typeof measurements[number] | undefined>((best, item) => !best || item.scale > best.scale ? item : best, undefined);
    const set = (node: HTMLElement, key: string, value: string) => {
      if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
    };
    const flag = (node: HTMLElement, key: string, value: boolean) => {
      if (node.dataset[key] !== String(value)) node.dataset[key] = String(value);
    };
    flag(el, 'compact', Boolean(headingRect && headingRect.bottom <= headerBottom));
    set(wrapper, '--orix-viewport-room', `${room.toFixed(1)}px`);
    set(wrapper, '--orix-header-edge', `${(headerRect?.height || 0) + 12}px`);
    set(el, '--orix-available-height', `${available.toFixed(1)}px`);
    for (const {card, stage, height, scale, videoHeight, videoWidth} of measurements) {
      flag(card, 'centered', card === nearest?.card);
      flag(card, 'short', height < 380);
      set(card, '--orix-card-scale', scale.toFixed(4));
      if (!stage || !card.classList.contains('has-visual')) continue;
      set(stage, '--orix-stage-height', `${height.toFixed(1)}px`);
      set(stage, '--orix-full-video-height', `${videoHeight.toFixed(1)}px`);
      set(stage, '--orix-full-video-width', `${videoWidth.toFixed(1)}px`);
    }
  }, []);
  useLayoutEffect(() => { if (orix) measure(); }, [orix, children, measure]);
  useEffect(() => {
    const el = root.current;
    if (!orix || !el) return;
    let frame = 0;
    const update = () => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; measure(); }); };
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    el.addEventListener('loadedmetadata', update, true);
    const resize = new ResizeObserver(update);
    const header=document.querySelector('.app-header'), nav=document.querySelector('.app-bottom-nav');
    if(header)resize.observe(header);if(nav)resize.observe(nav);
    const state = new MutationObserver(update); state.observe(el, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] }); update();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); state.disconnect(); el.removeEventListener('loadedmetadata', update, true); el.removeEventListener('scroll', update); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [orix, measure]);
  const gallery = <div ref={root} className={`publication-list max-w-2xl mx-auto space-y-5 ${orix ? `orix-gallery ${videos ? 'orix-video-gallery' : ''}` : ''}`} tabIndex={orix ? 0 : undefined} role={orix ? 'region' : undefined} aria-label={orix ? ui('Publicações') : undefined}>{children}</div>;
  return orix ? <div className="orix-gallery-frame">{gallery}</div> : gallery;
}
