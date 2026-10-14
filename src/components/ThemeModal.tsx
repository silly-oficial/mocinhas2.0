import React, { useEffect, useRef } from 'react';
import { containDialogFocus } from './ModalFrame';
import { Check, CloudSun, Moon, Palette, X, Sparkles, Box } from 'lucide-react';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { useUi } from '../i18n/ui';

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme, persisted } = useTheme();
  const ui = useUi();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = dialog.current!;
    el.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { el.close(); document.body.style.overflow = oldOverflow; opener?.focus(); };
  }, []);
  const options: { id: AppTheme; label: string; description: string; icon: typeof Moon }[] = [
    { id: 'gymnastics', label: 'Movimento', description: 'Ginástica, novas inspirações e perfis para seguir.', icon: Sparkles },
    { id: 'orix', label: 'Orix Orange', description: 'Branco, laranja e cartões de mídia arredondados.', icon: Box },
    { id: 'original', label: 'Original', description: 'Escuro com detalhes verdes.', icon: Moon },
    { id: 'skyglass', label: 'Skyglass', description: 'Céu azul, vidro e superfícies claras.', icon: CloudSun },
    { id: 'lilac', label: 'Lilac Studio', description: 'Lavanda, cartões coloridos e navegação escura.', icon: Sparkles },
    { id: 'orely', label: 'Orelly Pop', description: 'Tema anterior preservado.', icon: Sparkles },
  ];
  return <dialog ref={dialog} className="theme-dialog" aria-labelledby="theme-title" aria-describedby="theme-description"
    onKeyDown={containDialogFocus}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <header className="theme-dialog-header"><span className="theme-heading-icon"><Palette size={22} /></span><h2 id="theme-title">{ui('Aparência')}</h2><button autoFocus className="icon-button" aria-label={ui('Fechar')} onClick={onClose}><X size={20} /></button></header>
    <div className="theme-dialog-body">
      <p id="theme-description">{ui('Escolha o visual do aplicativo.')}</p>
      <fieldset className="theme-options"><legend className="sr-only">{ui('Tema do aplicativo')}</legend>
        {options.map(option => <label key={option.id} className="theme-option" data-selected={theme === option.id}>
          <input type="radio" name="visual-theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} />
          <span className={`theme-preview theme-preview-${option.id}`} aria-hidden="true"><span className="theme-preview-bar" /><span className="theme-preview-scene"><option.icon size={32} /></span><span className="theme-preview-nav"><i /><i /><i /></span></span>
          <span className="theme-option-copy"><strong>{option.label}</strong><span>{ui(option.description)}</span></span>
          <span className="theme-check" aria-hidden="true">{theme === option.id && <Check size={15} />}</span>
        </label>)}
      </fieldset>
      <p className="theme-save-note" role="status">{ui(persisted ? 'Aplicado na hora e salvo neste navegador.' : 'Tema aplicado. O navegador não permitiu salvar a preferência.')}</p>
      <button className="theme-done" onClick={onClose}>{ui('Concluir')}</button>
    </div>
  </dialog>;
}
