import { ModalFrame } from './ModalFrame';
import { ui, useUi } from '../i18n/ui';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, Copy, Check, X, ShieldCheck, LoaderCircle, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
interface SyncpayModalProps { onClose: () => void; onSuccess?: () => void }
export function SyncpayModal({ onClose, onSuccess }: SyncpayModalProps) {
  useUi();
  const { language } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [config, setConfig] = useState<any>(null), [step, setStep] = useState('offer'), [charge, setCharge] = useState<any>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [copied, setCopied] = useState(false);
  const [name, setName] = useState(user?.displayName || ''), [cpf, setCpf] = useState(''), [phone, setPhone] = useState('');
  const mounted = useRef(true), checking = useRef(false), reported = useRef(false);
  const money = (value: number) => value.toLocaleString(language, { style: 'currency', currency: 'BRL' });
  async function call(path: string, body?: any) {
    const r = await fetch('/api/syncpay/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token')) }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json(); if (!r.ok) throw Error(data.error || 'Não foi possível verificar o pagamento.'); return data;
  }
  useEffect(() => { mounted.current = true; call('config').then(setConfig).catch(e => setMessage(e.message)); return () => { mounted.current = false; }; }, []);
  const verify = useCallback(async (manual = false) => {
    if (!charge || checking.current || reported.current || document.hidden) return;
    checking.current = true; if (manual) setBusy(true);
    try { const result = await call('confirm-charge', { txId: charge.txId });
      if (!mounted.current) return;
      if (result.paid) { reported.current = true; await refreshUser(); setStep('success'); setMessage(''); onSuccess?.(); }
      else { if (manual) setMessage(result.message); if (['expired','cancelled','canceled','failed','refunded'].includes(result.status)) setMessage("Esta cobrança foi encerrada. Consulte a administração antes de gerar outro pagamento."); }
    } catch (e: any) { if (mounted.current && manual) setMessage(e.message); }
    finally { checking.current = false; if (mounted.current && manual) setBusy(false); }
  }, [charge, refreshUser, onSuccess]);
  useEffect(() => { if (step !== 'pix') return; const timer = setInterval(() => verify(), 15000); return () => clearInterval(timer); }, [step, verify]);
  async function create(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try { const result = await call('create-charge', { name, cpf, phone }); if (mounted.current) { setCharge(result); setCpf(''); setPhone(''); setStep('pix'); } }
    catch (e: any) { if (mounted.current) setMessage(e.message); } finally { if (mounted.current) setBusy(false); }
  }
  const available = config?.enabled && config?.hasCredentials;
  return <ModalFrame onClose={onClose} label={ui("Mocinhas Premium")} className="    flex items-center justify-center p-3">
    <section className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[var(--surface-card)] border border-emerald-500/20 rounded-3xl shadow-2xl text-white">
      <header className="relative p-6 bg-gradient-to-br from-emerald-950 via-emerald-900/50 to-[var(--surface-card)] text-center">
        <button aria-label={ui("Fechar Premium")} onClick={onClose} className="absolute top-3 right-3 rounded-full p-2 bg-black/20 hover:bg-white/10"><X size={20} /></button>
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center"><Crown className="text-emerald-300" size={30} /></div>
        <h2 className="font-extrabold text-xl">{ui("Mocinhas Premium")}</h2><p className="text-xs text-zinc-400 mt-2">{ui("Apoie o app por 30 dias")}</p>
      </header>
      <div className="p-5 space-y-4">
        {message && <p role="status" className="text-xs bg-white/5 rounded-xl border border-white/10 px-3 py-2">{ui(message)}</p>}
        {step === 'offer' && <form onSubmit={create} className="space-y-4">
          <p className="text-sm text-zinc-300 flex gap-2"><HeartHandshake className="shrink-0 text-emerald-400" size={20} />{ui("Sua contribuição ajuda a manter os servidores e o conteúdo do app.")}</p>
          <div className="rounded-2xl border border-white/10 p-4 flex justify-between items-center"><span className="text-xs text-zinc-400">{ui("Premium · 30 dias")}<br />{ui("Pix, sem renovação automática")}</span><strong className="text-2xl text-emerald-300">{config ? money(config.price) : '…'}</strong></div>
          <p className="text-xs text-zinc-400">{ui("O limite diário definido pela administração também vale para contas Premium.")}</p>
          {available ? <>
            <label className="block text-xs text-zinc-400">{ui("Nome do pagador")}<input required value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="mt-1 w-full bg-black/20 border border-white/15 rounded-xl p-3 text-white" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs text-zinc-400">{ui("CPF")}<input required inputMode="numeric" value={cpf} onChange={e => setCpf(e.target.value)} maxLength={14} placeholder={ui("11 dígitos")} className="mt-1 w-full min-w-0 bg-black/20 border border-white/15 rounded-xl p-3 text-white" /></label><label className="text-xs text-zinc-400">{ui("Telefone com DDD")}<input required inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder={ui("DDD + número")} className="mt-1 w-full min-w-0 bg-black/20 border border-white/15 rounded-xl p-3 text-white" /></label></div>
            <p className="text-[11px] text-zinc-500">{ui("Dados necessários para a cobrança Pix, enviados à SyncPay.")}</p>
          </> : <p className="text-sm text-zinc-400">{config ? ui("Pagamentos indisponíveis. A administração precisa configurar a SyncPay.") : ui("Carregando disponibilidade…")}</p>}
          <button disabled={busy || !available} className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-black font-bold py-3 disabled:opacity-40">{busy && <LoaderCircle size={16} className="animate-spin" />}{ui("Gerar Pix")}</button>
        </form>}
        {step === 'pix' && charge && <div className="space-y-4 text-center">
          <p className="text-sm">{ui("Pague")} {money(charge.amount)} {ui("pelo aplicativo do seu banco.")}</p>
          <img src={charge.qrCodeUrl} alt="QR Code do pagamento Pix" className="w-52 h-52 p-2 rounded-2xl bg-white mx-auto" />
          <button className="w-full rounded-xl border border-white/15 p-3 flex justify-center items-center gap-2 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(charge.pixCopyAndPaste); setCopied(true); } catch { setMessage("Selecione e copie o código abaixo."); } }}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? ui("Copiado") : ui("Copiar Pix")}</button>
          <textarea aria-label={ui("Código Pix copia e cola")} readOnly value={charge.pixCopyAndPaste} className="w-full text-[10px] bg-black/20 border border-white/10 p-2 rounded-xl resize-none" rows={2} />
          <button disabled={busy} onClick={() => verify(true)} className="w-full rounded-full py-3 bg-emerald-500 text-black font-bold disabled:opacity-40">{busy ? ui("Verificando…") : ui("Verificar pagamento")}</button>
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1"><ShieldCheck size={15} />{ui("Ativação somente após confirmação da SyncPay.")}</p>
        </div>}
        {step === 'success' && <div className="text-center space-y-4"><Check className="mx-auto text-emerald-400" size={40} /><h3 className="font-bold">{ui("Pagamento confirmado")}</h3><p className="text-sm text-zinc-400">{ui("Seu Premium está ativo por 30 dias.")}</p><button onClick={onClose} className="w-full rounded-full bg-emerald-500 text-black py-3 font-bold">{ui("Continuar")}</button></div>}
      </div>
    </section>
  </ModalFrame>;
}
