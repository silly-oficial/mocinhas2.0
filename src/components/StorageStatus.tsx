import React, { useEffect, useState } from 'react';
import { Database, Download, RefreshCw } from 'lucide-react';
import { ui, useUi } from '../i18n/ui';
export function StorageStatus() {
 useUi(); const [status,setStatus] = useState<any>(null), [error,setError]=useState('');
 const headers = () => ({ Authorization: 'Bearer '+(localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token') || '') });
 async function load() { try { const r=await fetch('/api/admin/storage',{headers:headers()});if(!r.ok)throw Error();setStatus(await r.json());setError(''); } catch {setError('Não foi possível consultar o armazenamento.');} }
 useEffect(()=>{load();},[]);
 return <section className="p-5 rounded-2xl bg-[#13131D] border border-emerald-500/20 space-y-3">
 <h3 className="font-bold flex gap-2 items-center"><Database size={20}/>{ui('Banco de dados e recuperação')}</h3>
 <p className="text-xs text-zinc-400">{ui('O banco ativo é um arquivo local. A configuração do Supabase não transfere esses dados automaticamente.')}</p>
 {status && <><p className="text-sm">{ui('Publicações no banco')}: <strong>{status.posts}</strong> · {ui('Publicações de administradores')}: <strong>{status.adminPosts}</strong> · {ui('Contas')}: <strong>{status.users}</strong></p>
 <p className="text-xs break-all text-zinc-400">{status.file}</p>
 {(status.orphanPosts>0 || status.hiddenNonAdminPosts>0) && <p className="text-xs text-amber-200">{ui('Publicações ocultas por autoria')}: {status.hiddenNonAdminPosts} · {ui('Sem autor localizado')}: {status.orphanPosts}. {ui('Os registros continuam no banco. Não há exclusão automática.')}</p>}
 <p className="text-xs text-zinc-400">{ui(status.persistenceNote)} {ui('Backups locais')}: {status.backups}.</p></>}
 {error && <p role="status" className="text-xs text-red-300">{ui(error)}</p>}
 <div className="flex flex-wrap gap-3"><button onClick={load} className="flex gap-2 items-center text-sm px-3 py-2 rounded-xl border border-white/15"><RefreshCw size={16}/>{ui('Atualizar diagnóstico')}</button>
 <button className="flex gap-2 items-center text-sm px-3 py-2 rounded-xl bg-emerald-500 text-black" onClick={async()=>{try{const r=await fetch('/api/admin/storage/export',{headers:headers()});if(!r.ok)throw Error();const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='mocinhas-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Não foi possível baixar o backup.');}}}><Download size={16}/>{ui('Baixar backup do banco')}</button></div>
 <p className="text-xs text-zinc-500">{ui('O backup contém dados privados e configurações. Guarde em local seguro. Fotos e vídeos da pasta uploads precisam de uma cópia separada.')}</p>
 </section>;
}
