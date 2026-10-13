import React, { useEffect, useRef } from 'react';

export function containDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  event.stopPropagation();
  const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
    .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  const first = elements[0], last = elements[elements.length - 1];
  if (!first) { event.preventDefault(); event.currentTarget.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

/** Shared native modal: focus containment, Escape, scroll lock and focus return. */
export function ModalFrame({ children, onClose, label, className = '' }: { children: React.ReactNode; onClose: () => void; label: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const el = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    el.showModal(); document.body.style.overflow = 'hidden';
    return () => { el.close(); document.body.style.overflow = previous; if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal-frame ${className}`} aria-label={label}
    onKeyDown={containDialogFocus}
    onCancel={e => { e.preventDefault(); e.stopPropagation(); close.current(); }}
    onClick={e => { if(e.target === e.currentTarget) close.current(); }}>
    {children}
  </dialog>;
}
