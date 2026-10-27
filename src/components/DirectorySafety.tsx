import React, {useEffect, useState} from 'react';
import {requestTypes, type DirectoryRequestType} from '../../shared/directory-requests';
import {legalDocuments, legalNavigation, legalNotice, type LegalDocumentVersion, type LegalPageKey, type LegalVersionSummary} from '../../shared/legal-documents';

function useContact() {
  const [email,setEmail] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/directory-contact',{signal:controller.signal}).then(r => r.ok ? r.json() : null).then(data => setEmail(data?.email || '')).catch(() => {});
    return () => controller.abort();
  },[]);
  return email;
}
export function LegalNavigation({currentPath,versionId = ''}: {currentPath?:string;versionId?:string}) {
  return <nav className="directory-legal-nav" aria-label="Documentos e atendimento">{legalNavigation.map(link => <a key={link.path} href={link.path + (versionId && link.path !== '/versoes' ? '?versao=' + encodeURIComponent(versionId) : '')} aria-current={currentPath === link.path ? 'page' : undefined}>{link.label}</a>)}</nav>;
}
export function DirectorySafetyFooter() {
  const email = useContact();
  return <footer className="directory-safety-footer"><p>{legalNotice} <a href="/pais">clique aqui</a>.</p><LegalNavigation/>{email && <p>Contato: <a href={'mailto:' + email}>{email}</a></p>}</footer>;
}
function LinkedText({text}: {text:string}) {
  return <>{text.split(/(\/(?:termos|privacidade|pais|versoes))\b/g).map((part,index) => /^\/(termos|privacidade|pais|versoes)$/.test(part) ? <a key={index} href={part}>{part}</a> : part)}</>;
}
function RecordedDate({version}: {version:LegalVersionSummary|null}) {
  return <p className="directory-version-date">{version ? <>Versão registrada em <time dateTime={version.recordedAt}>{new Date(version.recordedAt).toLocaleString('pt-BR',{timeZone:'America/Belem'})} (Belém)</time>.</> : 'Versão de desenvolvimento — ainda não arquivada em produção.'}</p>;
}
function ResponsibleRequestForm() {
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [receipt,setReceipt] = useState('');
  const [type,setType] = useState<DirectoryRequestType>('remover_conteudo');
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy) return;
    const form = event.currentTarget, data = new FormData(form);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/directory-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        responsibleName:data.get('responsibleName'),email:data.get('email'),handle:data.get('handle'),type,
        observations:data.get('observations') || '',documentUrl:data.get('documentUrl') || '',
      })});
      const result = await response.json().catch(() => null);
      if(!response.ok || !result?.id) throw Error(result?.error || 'Não foi possível registrar o pedido. Tente novamente.');
      setReceipt(result.id); form.reset();
    } catch(error) {setError(error instanceof Error ? error.message : 'Falha de conexão. Tente novamente.');}
    finally {setBusy(false);}
  }
  return receipt ? <section className="directory-receipt" role="status" aria-live="polite"><h2>Pedido registrado</h2><p>Protocolo: <strong>{receipt}</strong></p><p>Acompanhe o e-mail informado. Este protocolo confirma o recebimento, não a conclusão da análise.</p><button onClick={() => {setReceipt('');setType('remover_conteudo');}}>Enviar outro pedido</button></section> : <form onSubmit={submit}>
    <fieldset disabled={busy}>
      <legend>Enviar uma solicitação</legend>
      <label>Nome do responsável<input name="responsibleName" autoComplete="name" required maxLength={120}/></label>
      <label>E-mail para resposta<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>@ do perfil<input name="handle" required maxLength={60} placeholder="@usuario" autoCapitalize="none" spellCheck={false}/></label>
      <label>Tipo de pedido<select value={type} onChange={event => setType(event.target.value as DirectoryRequestType)}>{Object.entries(requestTypes).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Observações<textarea name="observations" rows={5} maxLength={3000} placeholder="Indique o conteúdo ou a informação a corrigir. Não inclua dados pessoais desnecessários."/></label>
      {(type === 'reivindicar_perfil' || type === 'autorizar_oficialmente') && <label>Link HTTPS do termo assinado (opcional)<input name="documentUrl" type="url" maxLength={2048} placeholder="https://…"/><small>O link é restrito à administração. Compartilhe apenas o termo necessário, com acesso controlado. O envio não gera selo nem autorização automática.</small></label>}
      <p>Ao enviar, seus dados serão usados para tratar esta solicitação. Consulte a <a href="/privacidade">privacidade dos pedidos</a> e os <a href="/termos">Termos de Uso do canal</a>.</p>
      <button type="submit">{busy ? 'Registrando…' : 'Enviar solicitação'}</button>
    </fieldset>{error && <p role="alert">{error}</p>}
  </form>;
}
export function DirectorySafetyPage({page = 'parents'}: {page?:LegalPageKey}) {
  const email = useContact();
  const versionId = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('versao') || '';
  const [version,setVersion] = useState<LegalDocumentVersion|null>(null), [current,setCurrent] = useState<LegalVersionSummary|null>(null);
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);setError('');
    fetch(versionId ? '/api/legal-history/' + encodeURIComponent(versionId) : '/api/legal-history',{signal:controller.signal}).then(async response => {
      const data = await response.json().catch(() => null);
      if(!response.ok || !data) throw Error(data?.error || 'Não foi possível carregar a versão dos documentos.');
      if(versionId) {setVersion(data.version);setCurrent(data.version);} else {setVersion(null);setCurrent(data.current);}
    }).catch(error => {if(!controller.signal.aborted) setError(error.message);}).finally(() => {if(!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  },[versionId,retry]);
  const document = version?.documents[page] || legalDocuments[page];
  const visibleEmail = version ? version.contactEmail : email;
  return <main className="directory-safety-page">
    <a href="/" className="directory-back">← Voltar ao aplicativo</a><LegalNavigation currentPath={document.path} versionId={versionId}/><h1>{document.title}</h1>
    {loading ? <p role="status">Carregando registro da versão…</p> : error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></p> : <RecordedDate version={current}/>}
    {versionId && <p className="directory-history-notice">Você está consultando uma versão arquivada. <a href={document.path}>Ver a versão atual</a>.</p>}
    {(!versionId || (!loading && !error)) && <>
      {document.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph,index) => <p key={index}><LinkedText text={paragraph}/></p>)}</section>)}
      {visibleEmail && <p>Contato da administração: <a href={'mailto:' + visibleEmail}>{visibleEmail}</a>.</p>}
      {page === 'parents' && !versionId && <ResponsibleRequestForm/>}
    </>}
  </main>;
}
export function LegalVersionHistory() {
  const [versions,setVersions] = useState<LegalVersionSummary[]>([]), [total,setTotal] = useState(0), [page,setPage] = useState(0);
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setError('');
    fetch('/api/legal-history?page=' + page,{signal:controller.signal}).then(async response => {
      const data = await response.json().catch(() => null);
      if(!response.ok || !data) throw Error(data?.error || 'Não foi possível carregar o histórico.');
      setVersions(data.versions);setTotal(data.total);
    }).catch(error => {if(!controller.signal.aborted) setError(error.message);}).finally(() => {if(!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  },[page,retry]);
  return <main className="directory-safety-page">
    <a href="/" className="directory-back">← Voltar ao aplicativo</a><LegalNavigation currentPath="/versoes"/><h1>Histórico de versões</h1>
    <p>Consulte os textos dos Termos, da Privacidade e da página de responsáveis registrados em produção. Cada alteração desses documentos ou do contato público gera um arquivo datado. Reiniciar o serviço com os mesmos textos não cria uma cópia duplicada.</p>
    <p>Este é o histórico dos documentos, não de todas as alterações do aplicativo. Os pedidos e os documentos enviados por responsáveis não aparecem aqui.</p>
    {loading ? <p role="status">Carregando histórico…</p> : error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></p> : <>
      {!versions.length && <p>Nenhuma versão registrada em produção ainda.</p>}
      {versions.map((version,index) => <article className="directory-request-row" key={version.id}>
        <h2>Versão {total - page*20 - index}</h2><RecordedDate version={version}/><p className="directory-version-id">Identificador: {version.id}</p>
        <nav className="directory-legal-nav" aria-label={'Consultar versão ' + version.id}>{legalNavigation.filter(link => link.path !== '/versoes').map(link => <a key={link.path} href={link.path + '?versao=' + encodeURIComponent(version.id)}>{link.label}</a>)}<a href={'/api/legal-history/' + encodeURIComponent(version.id) + '/file'} download>Baixar arquivo JSON datado</a></nav>
      </article>)}
      {total > 20 && <nav className="directory-legal-nav" aria-label="Páginas do histórico"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page + 1}</span><button disabled={(page+1)*20 >= total} onClick={() => setPage(value => value + 1)}>Próxima</button></nav>}
    </>}
  </main>;
}
