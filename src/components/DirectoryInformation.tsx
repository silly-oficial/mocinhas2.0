import React,{useState} from 'react';
import {usePublicSettings,LegalNavigation} from './DirectorySafety';
export function DirectoryRating(){return null;}
export function DirectoryEntryNotice(){
 const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem('mocinhas-animal-notice-v1')==='1';}catch{return false;}});
 if(dismissed)return null;
 return <aside className="directory-entry-notice" aria-label="Sobre o conteúdo do diretório"><button type="button" onClick={()=>{setDismissed(true);try{localStorage.setItem('mocinhas-animal-notice-v1','1');}catch{}}} aria-label="Fechar aviso de entrada">Fechar ×</button><strong>Fotos e vídeos de animais</strong><p>Conteúdo de terceiros. O diretório exibe links do TikTok e arquivos enviados pela administração, com crédito ao criador.</p><a href="/como-funciona">Como funciona</a> · <a href="/pais">Remover, corrigir ou contestar</a></aside>;
}
export function HowItWorksPage(){
 const settings=usePublicSettings();
 return <main className="directory-safety-page"><a href="/">← Voltar ao aplicativo</a><LegalNavigation currentPath="/como-funciona"/><h1>Como funciona o Mocinhas</h1>
 <section><h2>1. O que é o diretório</h2><p>Um aplicativo para explorar perfis, fotos e vídeos de animais, organizado pela administração.</p></section>
 <section><h2>2. Como a ordem é montada</h2><p>Os perfis aparecem em ordem alfabética pelo nome.</p></section>
 <section><h2>3. De onde vem o conteúdo</h2><p>O painel aceita links públicos do TikTok pelo player oficial e uploads de fotos e vídeos que a administração tem direito de publicar. Os arquivos enviados ficam no armazenamento do aplicativo. Links do TikTok continuam na plataforma original, sem extração. Todas as mídias mantêm crédito e canal de remoção.</p></section>
 <section><h2>4. Conteúdo</h2><p>Perfis, fotos e vídeos de animais, com crédito à origem e canal para correções ou remoção.</p></section>
 <section><h2>5. Visibilidade</h2><p>Salvar um perfil de animal o torna visível. A administração pode ocultar ou reexibir o perfil e sua galeria sem apagar os arquivos.</p></section>
 <section><h2>6. Verificação e autorização</h2><p>“Perfil verificado” indica conferência do vínculo com o @. Link público, crédito e embed não concedem autorização geral de uso da imagem.</p></section>
 <section><h2>7. Direitos e atendimento</h2><p><a href="/pais">Remover conteúdo, corrigir informações ou contestar a classificação</a>. Não é necessário cadastro, justificativa para remoção ou documento obrigatório. O envio exige nome e e-mail para resposta. Contato: {settings.contactEmail?<a href={'mailto:'+settings.contactEmail}>{settings.contactEmail}</a>:<a href="/pais">formulário de atendimento</a>}.</p></section></main>;
}

