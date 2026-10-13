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
    let nearest: HTMLElement | undefined, distance = Infinity;
    for (const card of cards) {
      // offsetWidth/offsetLeft are not changed by the visual scale.
      const cardCenter = frame.left + card.offsetLeft - el.scrollLeft + card.offsetWidth / 2;
      const next = Math.abs(cardCenter - center);
      if (next < distance) { nearest = card; distance = next; }
    }
    for (const card of cards) card.dataset.centered = String(card === nearest);
    const header = document.querySelector('.app-header');
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const headerHeight = header?.getBoundingClientRect().height || 0;
    const nav = document.querySelector('.app-bottom-nav');
    const navRect = nav?.getBoundingClientRect();
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
    const heading = document.querySelector('.orix-page-heading');
    const compact = Boolean(heading && heading.getBoundingClientRect().bottom <= headerBottom);
    el.dataset.compact = String(compact);
    const headingHeight = heading?.getBoundingClientRect().height || 1;
    const progress = Math.max(0, Math.min(1, (headerBottom + headingHeight - (heading?.getBoundingClientRect().bottom || 0)) / headingHeight));
    wrapper.style.setProperty('--orix-viewport-room', `${room}px`);
    wrapper.style.setProperty('--orix-header-edge', `${headerHeight + 12}px`);
    el.style.setProperty('--orix-available-height', `${available}px`);
    for (const card of cards) {
      const stage = card.querySelector<HTMLElement>('.sky-media-stage');
      if (!stage || !card.classList.contains('has-visual')) continue;
      const base = Math.min(card.offsetWidth * 5 / 3, Math.max(280, room - (card.classList.contains('orix-video') ? 198 : 230)));
      const target = Math.min(available, card.classList.contains('show-full-media') ? room : base + 180 * progress);
      stage.style.setProperty('--orix-stage-height', `${target}px`);
    }
  }, []);
  useLayoutEffect(() => { if (orix) measure(); }, [orix, children, measure]);
  useEffect(() => {
    const el = root.current;
    if (!orix || !el) return;
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    const resize = new ResizeObserver(update);
    const header=document.querySelector('.app-header'), nav=document.querySelector('.app-bottom-nav');
    if(header)resize.observe(header);if(nav)resize.observe(nav);
    const state = new MutationObserver(update); state.observe(el, { subtree:true, attributes:true, attributeFilter:['class'] }); update();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); state.disconnect(); el.removeEventListener('scroll', update); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [orix, measure]);
  const gallery = <div ref={root} className={`publication-list max-w-2xl mx-auto space-y-5 ${orix ? `orix-gallery ${videos ? 'orix-video-gallery' : ''}` : ''}`} tabIndex={orix ? 0 : undefined} role={orix ? 'region' : undefined} aria-label={orix ? ui('Publicações') : undefined}>{children}</div>;
  return orix ? <div className="orix-gallery-frame">{gallery}</div> : gallery;
}
