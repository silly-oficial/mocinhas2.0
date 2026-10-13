import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { pauseMedia } from './ManagedVideo';

/** Only the complete photo is visible; tap it/backdrop or press Escape to return. */
export function FullPhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    pauseMedia();
    dialog.showModal();
    return () => { dialog.close(); document.documentElement.style.overflow = previous; };
  }, []);
  return createPortal(<dialog ref={ref} className="orix-photo-viewer" aria-label={alt} onCancel={event => { event.preventDefault(); onClose(); }} onClick={onClose}>
    <img src={src} alt={alt} draggable={false}/>
  </dialog>, document.body);
}
