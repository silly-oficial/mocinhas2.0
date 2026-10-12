import { ui, useUi } from '../i18n/ui';
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '../services/api';
export function UsageSettings() {
  useUi();
  const [minutes, setMinutes] = useState(0), [network, setNetwork] = useState(false);
  const [message, setMessage] = useState(''), [ready, setReady] = useState(false), [saving, setSaving] = useState(false);
  useEffect(() => { api.getUsageSettings().then(s => { setMinutes(s.dailyMinutes); setNetwork(s.bindNetwork); setReady(true); }).catch(e => setMessage(e.message)); }, []);
  return <section className="p-5 rounded-2xl bg-[#13131D] border border-white/15 space-y-4">
    <h3 className="font-bold flex items-center gap-2"><Clock size={20} />{ui("Limite diário de uso")}</h3>
    <p className="text-sm text-zinc-400">{ui("Renova 24 horas após o início do período. Vale para todas as contas comuns; administradores são isentos. Zero desativa o limite.")}</p>
    <label className="flex gap-3 items-center">{ui("Minutos por dia")}<input aria-label={ui("Minutos por dia")} type="number" min="0" max="1440" step="1" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="w-24 bg-black/30 border border-white/20 rounded-xl p-2" /></label>
    <label className="flex gap-3 text-sm"><input type="checkbox" checked={network} onChange={e => setNetwork(e.target.checked)} />{ui("Reforçar limite por rede (IP)")}</label>
    <p className="text-xs text-zinc-400">{ui("Contas e abas no mesmo navegador compartilham o tempo. Por IP, contas na mesma rede também compartilham a cota, inclusive pessoas diferentes no mesmo Wi-Fi. Outro aparelho e outra rede ainda podem contornar a identificação.")}</p>
    <button disabled={!ready || saving} className="px-5 py-2 rounded-full bg-emerald-500 text-black font-bold disabled:opacity-40" onClick={async () => { setSaving(true); try { await api.setUsageSettings({ dailyMinutes: minutes, bindNetwork: network }); setMessage("Limite salvo. Aplicação em até 10 segundos nas sessões abertas."); } catch (e: any) { setMessage(e.message); } finally { setSaving(false); } }}>{ui("Salvar limite")}</button>
    {message && <p role="status" className="text-sm">{ui(message)}</p>}
  </section>;
}
