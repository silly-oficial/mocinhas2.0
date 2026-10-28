import {RequestFollowUp} from './RequestFollowUp';
import {creditsSections} from '../../shared/credits';
import React, {useEffect, useState} from 'react';
import {requestTypes, type DirectoryRequestType} from '../../shared/directory-requests';
import {legalDocuments, legalNavigation, legalNotice, type LegalDocumentVersion, type LegalPageKey, type LegalVersionSummary} from '../../shared/legal-documents';

export function usePublicSettings() {
  const [settings,setSettings] = useState({contactEmail:'',dpoEmail:'',siteName:'Mocinhas',organizationName:'',websiteUrl:'',responseBusinessDays:5,ageRating:'L',ageRatingNote:'Conteúdo sem nudez. Podem aparecer traje de banho, roupa de praia e roupas justas.'});
  useEffect(() => {
    const controller = new AbortController();
    const load=()=>fetch('/api/directory-settings',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data)setSettings(data);}).catch(()=>{});
    void load();window.addEventListener('mocinhas:settings-updated',load);
    return ()=>{controller.abort();window.removeEventListener('mocinhas:settings-updated',load);};
  },[]);
  return settings;
}
export function LegalNavigation({currentPath,versionId = ''}: {currentPath?:string;versionId?:string}) {
  return <nav className="directory-legal-nav" aria-label="Documentos e atendimento">{legalNavigation.map(link => <a key={link.path} href={link.path + (versionId && link.path !== '/versoes' && link.path !== '/creditos' && link.path !== '/como-funciona' ? '?versao=' + encodeURIComponent(versionId) : '')} aria-current={currentPath === link.path ? 'page' : undefined}>{link.label}</a>)}</nav>;
}
export function DirectorySafetyFooter() {
  const config = usePublicSettings();const email=config.contactEmail;
  return <footer className="directory-safety-footer"><p>Todo o conteúdo do Mocinhas é de autoria dos criadores originais.<br/>Cada mídia mantém o crédito e o link do perfil de origem.<br/>Encontrou algo seu e quer ajustar ou remover? Fale com a gente: {email?<a href={'mailto:'+email}>{email}</a>:<a href="/pais">Pedir remoção / reclamar</a>}</p><p>© {new Date().getFullYear()} Mocinhas. As mídias pertencem aos seus criadores originais.</p><p>Classificação informada pela curadoria: <strong>{config.ageRating}</strong> · {config.ageRatingNote} <a href="/como-funciona">Como funciona</a></p><LegalNavigation/>{config.dpoEmail&&<p>Privacidade: <a href={'mailto:'+config.dpoEmail}>{config.dpoEmail}</a></p>}</footer>;
}
function LinkedText({text}: {text:string}) {
  return <>{text.split(/(\/(?:termos|privacidade|pais|versoes|creditos|como-funciona))\b/g).map((part,index) => /^\/(termos|privacidade|pais|versoes|creditos|como-funciona)$/.test(part) ? <a key={index} href={part}>{part}</a> : part)}</>;
}
function RecordedDate({version}: {version:LegalVersionSummary|null}) {
  return <p className="directory-version-date">{version ? <>Versão registrada em <time dateTime={version.recordedAt}>{new Date(version.recordedAt).toLocaleString('pt-BR',{timeZone:'America/Belem'})} (Belém)</time>.</> : 'Versão de desenvolvimento — ainda não arquivada em produção.'}</p>;
}
function ResponsibleRequestForm() {
  const params=new URLSearchParams(typeof window==='undefined'?'':window.location.search);
  const handle=params.get('handle')?.replace(/^@/,'').slice(0,60)||'';
  const content=params.get('conteudo')?.slice(0,2048)||'';
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [receipt,setReceipt] = useState(''),[accessToken,setAccessToken]=useState(''),[dueAt,setDueAt]=useState('');
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
      setReceipt(result.id);setAccessToken(result.accessToken||'');setDueAt(result.dueAt||'');form.reset();
    } catch(error) {setError(error instanceof Error ? error.message : 'Falha de conexão. Tente novamente.');}
    finally {setBusy(false);}
  }
  return receipt ? <section className="directory-receipt" role="status" aria-live="polite"><h2>Pedido registrado</h2><p>Protocolo: <strong>{receipt}</strong></p><p>Chave privada: <strong>{accessToken}</strong>. Guarde com o protocolo; ela permite consultar e reabrir o pedido.</p>{dueAt&&<p>Prazo: {new Date(dueAt).toLocaleString('pt-BR',{timeZone:'America/Belem'})} (Belém).</p>}<a href={'/pais?protocolo='+encodeURIComponent(receipt)+'#chave='+encodeURIComponent(accessToken)}>Consultar ou reabrir o mesmo protocolo</a><p>Acompanhe o e-mail informado. Este protocolo confirma o recebimento, não a conclusão da análise.</p><button onClick={() => {setReceipt('');setType('remover_conteudo');}}>Enviar outro pedido</button></section> : <form onSubmit={submit}>
    <fieldset disabled={busy}>
      <legend>Enviar uma solicitação</legend>
      <label>Seu nome (criador, titular ou responsável)<input name="responsibleName" autoComplete="name" required maxLength={120}/></label>
      <label>E-mail para resposta<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>@ do perfil<input name="handle" defaultValue={handle} required maxLength={60} placeholder="@usuario" autoCapitalize="none" spellCheck={false}/></label>
      <label>Tipo de pedido<select value={type} onChange={event => setType(event.target.value as DirectoryRequestType)}>{Object.entries(requestTypes).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Observações<textarea name="observations" defaultValue={content} rows={5} maxLength={3000} placeholder="Indique o conteúdo ou a informação a corrigir. Não inclua dados pessoais desnecessários."/></label>
      {(type === 'reivindicar_perfil' || type === 'autorizar_oficialmente') && <label>Link HTTPS do termo assinado (opcional)<input name="documentUrl" type="url" maxLength={2048} placeholder="https://…"/><small>O link é restrito à administração. Compartilhe apenas o termo necessário, com acesso controlado. O envio não gera selo nem autorização automática.</small></label>}
      <p>Ao enviar, seus dados serão usados para tratar esta solicitação. Consulte a <a href="/privacidade">política de privacidade</a> e os <a href="/termos">Termos de Uso do diretório</a>.</p>
      <button type="submit">{busy ? 'Registrando…' : 'Enviar solicitação'}</button>
    </fieldset>{error && <p role="alert">{error}</p>}
  </form>;
}
export function DirectorySafetyPage({page = 'parents'}: {page?:LegalPageKey}) {
  const config = usePublicSettings();const email=config.contactEmail;
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
      {page==='privacy'&&!versionId&&<p>Encarregado/contato de privacidade: {config.dpoEmail?<a href={'mailto:'+config.dpoEmail}>{config.dpoEmail}</a>:<>não informado pela administração. Use <a href="/pais">o canal de direitos</a>.</>}</p>}
      {page === 'parents' && !versionId && <><ResponsibleRequestForm/><RequestFollowUp/></>}
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
        <nav className="directory-legal-nav" aria-label={'Consultar versão ' + version.id}>{legalNavigation.filter(link => link.path !== '/versoes' && link.path !== '/creditos' && link.path !== '/como-funciona').map(link => <a key={link.path} href={link.path + '?versao=' + encodeURIComponent(version.id)}>{link.label}</a>)}<a href={'/api/legal-history/' + encodeURIComponent(version.id) + '/file'} download>Baixar arquivo JSON datado</a></nav>
      </article>)}
      {total > 20 && <nav className="directory-legal-nav" aria-label="Páginas do histórico"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page + 1}</span><button disabled={(page+1)*20 >= total} onClick={() => setPage(value => value + 1)}>Próxima</button></nav>}
    </>}
  </main>;
}


export function CreditsPage(){const config=usePublicSettings();return <main className="directory-safety-page"><a className="directory-back" href="/">← Voltar ao aplicativo</a><LegalNavigation currentPath="/creditos"/><h1>Créditos e Remoção</h1><p>As mídias pertencem aos criadores originais. <a href="/pais">Pedir remoção / reclamar</a></p>{config.contactEmail&&<p>Contato: <a href={'mailto:'+config.contactEmail}>{config.contactEmail}</a></p>}{creditsSections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((text,index)=><p key={index}><LinkedText text={text}/></p>)}</section>)}</main>;}
