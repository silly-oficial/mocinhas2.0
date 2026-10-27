import React, {useEffect, useState} from 'react';
import {requestTypes, type DirectoryRequestType} from '../../shared/directory-requests';
import '../directory-safety.css';

function useContact() {
  const [email, setEmail] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/directory-contact', {signal: controller.signal}).then(r => r.ok ? r.json() : null).then(data => setEmail(data?.email || '')).catch(() => {});
    return () => controller.abort();
  }, []);
  return email;
}
export function DirectorySafetyFooter() {
  const email = useContact();
  return <footer className="directory-safety-footer">
    <p>As imagens e vídeos pertencem aos seus criadores. Se você é responsável e quer ajustar ou remover algo, <a href="/pais">clique aqui</a>.</p>
    <nav aria-label="Contato e privacidade"><a href="/pais">Para pais e responsáveis</a><a href="/privacidade">Privacidade dos pedidos</a>{email && <a href={'mailto:' + email}>{email}</a>}</nav>
  </footer>;
}
export function DirectorySafetyPage({privacy = false}: {privacy?: boolean}) {
  const email = useContact();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [receipt, setReceipt] = useState('');
  const [type, setType] = useState<DirectoryRequestType>('remover_conteudo');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget, data = new FormData(form);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/directory-requests', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
        responsibleName: data.get('responsibleName'), email: data.get('email'), handle: data.get('handle'), type,
        observations: data.get('observations') || '', documentUrl: data.get('documentUrl') || '',
      })});
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.id) throw Error(result?.error || 'Não foi possível registrar o pedido. Tente novamente.');
      setReceipt(result.id); form.reset();
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha de conexão. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <main className="directory-safety-page">
    <a href="/" className="directory-back">← Voltar ao aplicativo</a>
    {privacy ? <>
      <h1>Privacidade dos pedidos de responsáveis</h1>
      <p>Este aviso descreve o tratamento dos dados enviados pelo formulário de remoção, correção, reivindicação ou autorização de perfil.</p>
      <h2>Dados recebidos e finalidade</h2>
      <p>Recebemos nome do responsável, e-mail, @ do perfil, tipo de pedido, observações e, opcionalmente, link de um termo. Utilizamos esses dados para localizar o conteúdo indicado, analisar a solicitação, verificar a representação e responder pelo e-mail informado. Não envie documentos de identidade, endereço ou dados desnecessários nas observações.</p>
      <h2>Acesso e retenção</h2>
      <p>Os pedidos e os links de termos ficam disponíveis somente à administração. Eles não são publicados no perfil nem usados para anúncios. Pedidos encerrados são excluídos da base ativa após 90 dias do encerramento; pedidos ainda abertos, após 180 dias do envio. A rotina é executada diariamente. Cópias de segurança seguem o ciclo de retenção da infraestrutura.</p>
      <h2>Dados de crianças e adolescentes</h2>
      <p>As solicitações relativas a crianças e adolescentes devem considerar seu melhor interesse, conforme o art. 14 da LGPD. A existência de um perfil público, o crédito e o envio de um termo não substituem a análise da solicitação ou uma autorização válida. A remoção pode ser solicitada sem apresentar termo assinado.</p>
      <h2>Direitos e contato</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos dados da solicitação pelo <a href="/pais">formulário de responsáveis</a>, informando o protocolo. A administração pode verificar sua identidade de forma proporcional antes de fornecer dados.</p>
      {email && <p>Contato da administração: <a href={'mailto:' + email}>{email}</a>.</p>}
      <p>O formulário não requer login ou assinatura Premium e não instala cookies de publicidade. Um identificador temporário de rede, armazenado somente em memória por até uma hora, limita envios repetidos. Este aviso se refere ao formulário; as demais funcionalidades do aplicativo possuem tratamento próprio.</p>
    </> : <>
      <h1>Para pais e responsáveis</h1>
      <p>Os perfis são adicionados pela administração. Você pode pedir a remoção ou a correção de informações sem criar conta e sem pagar. Basta informar o @ do perfil; não é necessário apresentar termo para solicitar remoção.</p>
      <p>Responderemos pelo e-mail informado em até 5 dias úteis. Guarde o protocolo exibido após o envio. O registro do pedido não remove automaticamente o conteúdo: a administração fará a análise.</p>
      {email && <p>Contato: <a href={'mailto:' + email}>{email}</a>.</p>}
      {receipt ? <section className="directory-receipt" role="status" aria-live="polite"><h2>Pedido registrado</h2><p>Protocolo: <strong>{receipt}</strong></p><p>Acompanhe o e-mail informado. Este protocolo confirma o recebimento, não a conclusão da análise.</p><button onClick={() => {setReceipt(''); setType('remover_conteudo');}}>Enviar outro pedido</button></section> : <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <legend>Enviar uma solicitação</legend>
          <label>Nome do responsável<input name="responsibleName" autoComplete="name" required maxLength={120}/></label>
          <label>E-mail para resposta<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
          <label>@ do perfil<input name="handle" required maxLength={60} placeholder="@usuario" autoCapitalize="none" spellCheck={false}/></label>
          <label>Tipo de pedido<select value={type} onChange={event => setType(event.target.value as DirectoryRequestType)}>{Object.entries(requestTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Observações<textarea name="observations" rows={5} maxLength={3000} placeholder="Indique o conteúdo ou a informação a corrigir. Não inclua dados pessoais desnecessários."/></label>
          {(type === 'reivindicar_perfil' || type === 'autorizar_oficialmente') && <label>Link HTTPS do termo assinado (opcional)<input name="documentUrl" type="url" maxLength={2048} placeholder="https://…"/><small>O link é restrito à administração. Compartilhe apenas o termo necessário, com acesso controlado. O envio não gera selo nem autorização automática.</small></label>}
          <p>Ao enviar, seus dados serão usados para tratar esta solicitação. Consulte a <a href="/privacidade">privacidade dos pedidos</a>.</p>
          <button type="submit">{busy ? 'Registrando…' : 'Enviar solicitação'}</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>}
    </>}
  </main>;
}
