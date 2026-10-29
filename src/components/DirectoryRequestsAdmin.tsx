import React, {useEffect, useState} from 'react';
import {requestTypes, type DirectoryRequest, type DirectoryRequestStatus} from '../../shared/directory-requests';
import type {PersonProfile} from '../../shared/people';
import '../directory-safety.css';

async function adminRequest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch('/api/admin/' + path, {method, headers: {
    Authorization: 'Bearer ' + (localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token') || ''),
    'Content-Type': 'application/json',
  }, body: body === undefined ? undefined : JSON.stringify(body)});
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw Error(data?.error || 'Não foi possível carregar os pedidos.');
  return data;
}
const statusLabels = {pending: 'Pendente', reviewing: 'Em análise', resolved: 'Concluído', rejected: 'Indeferido'} as const;
function RequestRow({request, profiles, onUpdated}: {request: DirectoryRequest; profiles: PersonProfile[]; onUpdated: () => void}) {
  const [note, setNote] = useState(request.adminNote), [status, setStatus] = useState<DirectoryRequestStatus>(request.status === 'pending' ? 'reviewing' : request.status);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [fundamentacao,setFundamentacao]=useState(request.fundamentacao||'');
  const [publicResult,setPublicResult]=useState(request.publicResult||'');
  const [profileId, setProfileId] = useState('');
  const matching = profiles.filter(profile => [profile.username, profile.socials.tiktok].some(handle => handle?.replace(/^@/, '').toLowerCase() === request.handle));
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      await adminRequest('directory-requests/' + request.id, 'PATCH', {status,adminNote:note,publicResult,fundamentacao, ...(profileId && status === 'resolved' ? {unpublishProfileId: profileId} : {})});
      window.dispatchEvent(new Event('mocinhas:people-updated'));
      onUpdated();
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  }
  return <article className="directory-request-row">
    <h4>{requestTypes[request.type]} · @{request.handle}</h4>
    <p>{request.dueAt&&<>Prazo: {new Date(request.dueAt).toLocaleString('pt-BR')} · </>}<strong>{request.decision?(request.decision==='procedente'?'Procedente':'Improcedente'):statusLabels[request.status]}</strong> · {new Date(request.createdAt).toLocaleString('pt-BR')} · protocolo {request.id}</p>
    <p>Solicitante: {request.responsibleName}<br/>Contato: <a href={'mailto:' + request.email}>{request.email}</a></p>
    <p className="directory-observations">{request.observations || 'Sem observações.'}</p>
    {request.documentUrl && <p><a href={request.documentUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir termo enviado (link externo)</a></p>}
    {matching.some(profile=>profile.published)&&<button type="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await adminRequest('directory-requests/'+request.id+'/unpublish','POST',{profileId:matching.find(profile=>profile.published)!.id});window.dispatchEvent(new Event('mocinhas:people-updated'));onUpdated();}catch(error){setError(error instanceof Error?error.message:'Falha na retirada.');}finally{setBusy(false);}}}>Retirar de publicação imediatamente</button>}
    {!!request.decisions?.length&&<details><summary>Decisões anteriores do protocolo</summary>{request.decisions.map((decision,index)=><article key={decision.at+index}><p>{decision.at}: {decision.result}</p><p>{decision.fundamentacao}</p></article>)}</details>}
    <form onSubmit={save}><fieldset disabled={busy}>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value as DirectoryRequestStatus)}>{(['reviewing','resolved','rejected'] as const).map(value => <option key={value} value={value}>{request.type==='contestar_classificacao'&&value==='resolved'?'Procedente':request.type==='contestar_classificacao'&&value==='rejected'?'Improcedente':statusLabels[value]}</option>)}</select></label>
      {request.type === 'remover_conteudo' && status === 'resolved' && <label>Retirar perfil de publicação<select value={profileId} onChange={event => setProfileId(event.target.value)}><option value="">Sem alteração automática — conteúdo tratado manualmente</option>{matching.map(profile => <option key={profile.id} value={profile.id}>{profile.name} (@{profile.username})</option>)}</select><small>Esta ação oculta o perfil no diretório. Arquivos, posts e outras referências precisam de remoção manual quando aplicável.</small></label>}
      {['resolved','rejected'].includes(status)&&<label>Resposta ao solicitante (incluída no e-mail)<textarea value={publicResult} onChange={e=>setPublicResult(e.target.value)} maxLength={1500} rows={3} required={!profileId} placeholder="Descreva a providência realmente executada: remoção feita, crédito corrigido ou informação ajustada."/><small>Use este campo para a resposta pública. O registro interno abaixo não é enviado.</small></label>}
      {request.type==='contestar_classificacao'&&['resolved','rejected'].includes(status)&&<label>Fundamentação da decisão (mínimo 80 caracteres)<textarea minLength={80} maxLength={3000} required value={fundamentacao} onChange={e=>setFundamentacao(e.target.value)}/></label>}
      {request.replies?.map(reply=><p key={reply.at}>Resposta do solicitante em {new Date(reply.at).toLocaleString('pt-BR')}: {reply.message}</p>)}
      <label>Registro interno da análise<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={3000} rows={3}/></label>
      <p>Verifique a representação quando necessário e responda ao e-mail do solicitante antes de concluir. O sistema registra os avisos em fila de e-mail; o envio depende do provedor configurado. Reivindicações e termos não concedem selo ou autorização automática.</p>
      <button type="submit">{busy ? 'Salvando…' : 'Salvar análise'}</button>
    </fieldset>{error && <p role="alert">{error}</p>}</form>
  </article>;
}
export function DirectoryRequestsAdmin() {
  const [rows, setRows] = useState<DirectoryRequest[]>([]), [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [filter, setFilter] = useState('pending'), [page, setPage] = useState(0), [total, setTotal] = useState(0), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    let disposed = false; setLoading(true); setError('');
    Promise.all([adminRequest(`directory-requests?status=${filter}&page=${page}`), adminRequest('people')]).then(([data, people]) => {
      if (!disposed) {setRows(data.requests); setTotal(data.total); setProfiles(people.profiles);}
    }).catch(error => {if (!disposed) setError(error.message);}).finally(() => {if (!disposed) setLoading(false);});
    return () => {disposed = true;};
  }, [filter, page, revision]);
  return <section className="directory-requests-admin">
    <h3>Pedidos de atendimento</h3><p>Remoção: 48 horas úteis; demais pedidos: 5 dias úteis. A contagem pausa aos fins de semana. Dados pessoais e documentos são restritos à administração.</p>
    <label>Mostrar<select value={filter} onChange={event => {setFilter(event.target.value); setPage(0);}}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="all">Todos</option></select></label>
    <button disabled={loading} onClick={() => setRevision(value => value + 1)}>Atualizar fila</button>
    {loading ? <p role="status">Carregando pedidos…</p> : error ? <p role="alert">{error}</p> : <>
      <p>{total} pedido(s)</p>{!rows.length && <p>Nenhum pedido nesta página.</p>}
      {rows.map(row => <RequestRow key={row.id + row.updatedAt} request={row} profiles={profiles} onUpdated={() => setRevision(value => value + 1)}/>)}
      <nav aria-label="Páginas de pedidos"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page + 1}</span><button disabled={(page + 1) * 50 >= total} onClick={() => setPage(value => value + 1)}>Próxima</button></nav>
    </>}
  </section>;
}


