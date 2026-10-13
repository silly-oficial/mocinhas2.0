import React from 'react';
import { useUi } from '../i18n/ui';

/** Native carousel: stable card geometry and a real gap between every card. */
export function PublicationGallery({ orix, videos = false, children }: { orix: boolean; videos?: boolean; children: React.ReactNode }) {
  const ui = useUi();
  const gallery = <div className={orix ? `publication-list orix-gallery ${videos ? 'orix-video-gallery' : ''}` : 'publication-list max-w-2xl mx-auto space-y-5'} tabIndex={orix ? 0 : undefined} role={orix ? 'region' : undefined} aria-label={orix ? ui('Publicações') : undefined}>{children}</div>;
  return orix ? <div className="orix-gallery-frame">{gallery}</div> : gallery;
}
