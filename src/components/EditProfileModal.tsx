import { ui, useUi } from '../i18n/ui';
import React, { useState } from 'react';
import { X, Check, UserRound, LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function EditProfileModal({ onClose, onProfileUpdated }: { onClose: () => void; onProfileUpdated: () => void }) {
  useUi();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  return <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={ui("Editar perfil")}>
    <section className="niuniu-card w-full max-w-md overflow-hidden">
      <header className="p-5 flex items-center justify-between border-b border-white/10"><h2 className="font-bold">{ui("Editar perfil")}</h2><button className="icon-button" onClick={onClose} aria-label={ui("Fechar")}><X size={19} /></button></header>
      <form className="p-6 space-y-5" onSubmit={async e => { e.preventDefault(); if (!name.trim()) return; setSaving(true); setError(''); try { await updateUser({ displayName: name.trim() }); onProfileUpdated(); onClose(); } catch { setError("Não foi possível salvar. Tente novamente."); } finally { setSaving(false); } }}>
        <div className="account-monogram mx-auto"><UserRound size={30} /></div>
        <p className="text-sm text-zinc-400 text-center">{ui("Personalize como seu nome aparece nos comentários.")}</p>
        <label className="block text-sm space-y-2"><span>{ui("Nome de exibição")}</span><input required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl bg-black/20 border border-white/15 px-4 py-3" autoComplete="name" /></label>
        <p className="text-xs text-zinc-500">{ui("Seu nome de acesso e e-mail permanecem os mesmos.")}</p>
        {error && <p role="alert" className="text-sm text-red-300">{ui(error)}</p>}
        <button disabled={saving || !name.trim()} className="w-full rounded-xl bg-emerald-500 text-black font-bold py-3 flex justify-center items-center gap-2 disabled:opacity-40">{saving ? <LoaderCircle size={18} className="animate-spin" /> : <Check size={18} />}{ui("Salvar alterações")}</button>
      </form>
    </section>
  </div>;
}
