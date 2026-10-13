import React, { useEffect, useRef, useState } from 'react';
import { useUi } from '../i18n/ui';
import { type PhotoFocus } from '../../shared/photo-focus';

export function PhotoFocusEditor({ url, focus, onChange, onSave, disabled = false }: { url: string; focus?: PhotoFocus; onChange?: (focus: PhotoFocus) => void; onSave?: (focus: PhotoFocus) => Promise<void>; disabled?: boolean }) {
  const ui = useUi();
  const [value, setValue] = useState<PhotoFocus>(focus || { x: 50, y: 50 });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => { setValue(focus || { x: 50, y: 50 }); }, [url, focus?.x, focus?.y]);
  useEffect(() => { setMessage(''); }, [url]);
  function change(next: PhotoFocus) { setValue(next); onChange?.(next); setMessage(''); }
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const img = image.current, box = event.currentTarget.getBoundingClientRect();
    if (!img?.naturalWidth || !img.naturalHeight) return;
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
    const x = (event.clientX - box.left - (box.width - width) / 2) / width * 100;
    const y = (event.clientY - box.top - (box.height - height) / 2) / height * 100;
    change({ x: Math.round(Math.max(0, Math.min(100, x))), y: Math.round(Math.max(0, Math.min(100, y))) });
  }
  async function save() {
    if (!onSave || busy) return;
    setBusy(true); setMessage('');
    try { await onSave(value); setMessage(ui('Destaque salvo.')); }
    catch (e: any) { setMessage(e.message || ui('Não foi possível salvar o destaque.')); }
    finally { setBusy(false); }
  }
  return <section className="photo-focus-editor" aria-label={ui('Destaque da foto')}>
    <h4>{ui('Destaque da foto')}</h4><p>{ui('Toque na região desejada ou ajuste os controles. A prévia mostra o enquadramento do cartão.')}</p>
    <div className="photo-focus-previews"><div className="photo-focus-source" onPointerDown={e => { if (busy || disabled) return; e.currentTarget.setPointerCapture(e.pointerId); point(e); }} onPointerMove={e => { if (!busy && !disabled && e.currentTarget.hasPointerCapture(e.pointerId)) point(e); }}><img ref={image} src={url} alt={ui('Foto original')}/></div><div className="photo-focus-cover"><img src={url} alt={ui('Prévia do destaque')} style={{ objectPosition: `${value.x}% ${value.y}%` }}/></div></div>
    <fieldset disabled={busy || disabled}><legend className="sr-only">{ui('Posição do destaque')}</legend><label>{ui('Horizontal')} <output>{value.x}%</output><input type="range" aria-label={ui('Destaque horizontal')} min="0" max="100" value={value.x} onChange={e => change({ ...value, x: Number(e.target.value) })}/></label><label>{ui('Vertical')} <output>{value.y}%</output><input type="range" aria-label={ui('Destaque vertical')} min="0" max="100" value={value.y} onChange={e => change({ ...value, y: Number(e.target.value) })}/></label><button type="button" className="admin-secondary" onClick={() => change({ x: 50, y: 50 })}>{ui('Centralizar')}</button>{onSave && <button type="button" className="admin-primary" onClick={save}>{ui(busy ? 'Salvando…' : 'Salvar destaque')}</button>}</fieldset>
    {message && <p role="status">{message}</p>}
  </section>;
}
