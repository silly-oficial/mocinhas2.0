import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useUi } from '../i18n/ui';

/** Native scrolling with a larger card at the visual center. */
export function PublicationGallery({ orix, children }: { orix: boolean; children: React.ReactNode }) {
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
  }, []);
  useLayoutEffect(() => { if (orix) measure(); }, [orix, children, measure]);
  useEffect(() => {
    const el = root.current;
    if (!orix || !el) return;
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    el.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update); resize.observe(el); update();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); el.removeEventListener('scroll', update); };
  }, [orix, measure]);
  return <div ref={root} className={`publication-list max-w-2xl mx-auto space-y-5 ${orix ? 'orix-gallery' : ''}`} tabIndex={orix ? 0 : undefined} role={orix ? 'region' : undefined} aria-label={orix ? ui('Publicações') : undefined}>{children}</div>;
}
