import React, { useEffect, useState } from 'react';
import { Database, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ui, useUi } from '../i18n/ui';
export function StorageStatus() {
  useUi(); const [status,setStatus]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const headers=()=>({Authorization:'Bearer '+(localStorage.getItem('mocinhas_token')||localStorage.getItem('yume_token')||'')});
  async function load(){setBusy(true);try{const r=await fetch('/api/admin/storage',{headers:headers()});if(!r.ok)throw Error();setStatus(await r.json());setError('');}catch{setError('Não foi possível consultar o armazenamento.');}finally{setBusy(false);}}
  useEffect(()=>{load();},[]);
  async function backup(){setBusy(true);try{const r=await fetch('/api/admin/storage/export',{headers:headers()});if(!r.ok)throw Error();const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='mocinhas-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Não foi possível baixar o backup.');}finally{setBusy(false);}}
  return <section className="storage-section admin-section space-y-4">
    <h3 className="font-bold flex gap-2 items-center"><Database size={20}/>{ui('Banco de dados e recuperação')}</h3>
    {status?<><p className="storage-connection"><CheckCircle2 size={18}/>{ui(status.backend==='supabase'?'Banco e mídias salvos no Supabase. Atualizar o código não substitui esses dados.':'Banco local: mantenha DATA_DIR em disco persistente.')}</p>
      <div className="admin-metrics"><div><strong>{status.posts}</strong><span>{ui('Publicações')}</span></div><div><strong>{status.adminPosts}</strong><span>{ui('Publicações de administradores')}</span></div><div><strong>{status.users}</strong><span>{ui('Contas')}</span></div></div>
      {(status.orphanPosts>0||status.hiddenNonAdminPosts>0)&&<p className="text-xs text-amber-200">{ui('Publicações ocultas por autoria')}: {status.hiddenNonAdminPosts} · {ui('Sem autor localizado')}: {status.orphanPosts}. {ui('Os registros continuam no banco. Não há exclusão automática.')}</p>}
      <details className="storage-details"><summary>{ui('Detalhes do armazenamento')}</summary><p>{status.file}</p><p>{ui(status.persistenceNote||'')} {status.backend==='supabase'?ui('Backups remotos na tabela mocinhas_app_backups.'):`${ui('Backups locais')}: ${status.backups}.`}</p></details>
    </>:<p className="admin-muted">{ui('Consultando armazenamento…')}</p>}
    {error&&<p role="status" className="admin-message">{ui(error)}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={load} className="storage-refresh"><RefreshCw size={16}/>{ui('Atualizar diagnóstico')}</button><button disabled={busy} onClick={backup} className="admin-primary"><Download size={16}/>{ui('Baixar backup do banco')}</button></div>
    <p className="admin-muted">{ui('O backup contém dados privados e configurações. Guarde em local seguro.')}</p><p className="admin-muted">{ui('O arquivo JSON não inclui os arquivos de fotos e vídeos. Preserve também o armazenamento das mídias.')}</p>
  </section>;
}
