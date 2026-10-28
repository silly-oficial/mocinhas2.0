import {LegalAuditAdmin} from './LegalAuditAdmin';
import {DirectoryConfiguration} from './DirectoryConfiguration';
import {VerificationAdmin} from './VerificationAdmin';
import { DirectoryRequestsAdmin } from './DirectoryRequestsAdmin';
import { WelcomeSettings } from './WelcomeSettings';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Settings as SettingsIcon, BarChart3, Plus, Users, FileText, Clock, CreditCard, Database, X, Trash2, Image as ImageIcon, Video, Tag, Shield, Crown, RefreshCw, CheckCircle2, AlertTriangle, Key, ExternalLink, Copy, LoaderCircle } from 'lucide-react';
import { ui, useUi } from '../i18n/ui';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import {tiktokPost} from '../../shared/people';
import { Post, User } from '../types';
import { StorageStatus } from './StorageStatus';
import { UsageSettings } from './UsageSettings';
import { ModalFrame } from './ModalFrame';

type Tab = 'audit' | 'welcome' | 'stats' | 'poster' | 'moderation' | 'users' | 'usage' | 'syncpay' | 'supabase' | 'requests' | 'configuration' | 'verification';
type Media = Parameters<typeof api.createPost>[0]['media'][number];
const tabs: { id: Tab; label: string; icon: typeof Plus }[] = [
  {id:'configuration',label:'Configurações públicas',icon:SettingsIcon},{id:'verification',label:'Verificações',icon:Shield},
  {id:'requests',label:'Responsáveis',icon:Shield},{id:'audit',label:'Auditoria',icon:FileText},
  {id:'stats',label:'Visão geral',icon:BarChart3},{id:'poster',label:'Publicar',icon:Plus},
  {id:'moderation',label:'Publicações',icon:FileText},{id:'users',label:'Contas',icon:Users},
  {id:'welcome',label:'Tela de entrada',icon:ImageIcon},{id:'usage',label:'Limite diário',icon:Clock},{id:'syncpay',label:'Pagamentos',icon:CreditCard},{id:'supabase',label:'Armazenamento',icon:Database}
];
export const AdminPanel: React.FC<{onClose:()=>void;onPostCreated?:()=>void}> = ({onClose,onPostCreated}) => {
  useUi(); const {user:currentUser}=useAuth(); const {language}=useLanguage();
  const [activeTab,setActiveTab]=useState<Tab>('stats');
  const [stats,setStats]=useState<any>(null),[usersList,setUsersList]=useState<User[]>([]),[postsList,setPostsList]=useState<Post[]>([]);
  const [isLoading,setIsLoading]=useState(false),[publishing,setPublishing]=useState(false),[statusMessage,setStatusMessage]=useState<string|null>(null),[loadError,setLoadError]=useState('');
  const [mediaUrl,setMediaUrl]=useState(''),[caption,setCaption]=useState(''),[separate,setSeparate]=useState(false);
  const bodyRef=useRef<HTMLDivElement>(null),mounted=useRef(true),submitLock=useRef(false);
  const [search,setSearch]=useState('');
  const [supabaseStatus,setSupabaseStatus]=useState<any>(null),[sbUrlInput,setSbUrlInput]=useState(''),[sbKeyInput,setSbKeyInput]=useState(''),[sbServiceKeyInput,setSbServiceKeyInput]=useState(''),[isSavingSb,setIsSavingSb]=useState(false),[rawSql,setRawSql]=useState(''),[copiedSql,setCopiedSql]=useState(false);
  const headers=()=>({Authorization:'Bearer '+(localStorage.getItem('mocinhas_token')||localStorage.getItem('yume_token')||'')});
  async function adminRequest(path:string,method='GET',body?:any){const r=await fetch('/api/admin/'+path,{method,headers:{...headers(),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||ui('Não foi possível concluir a operação.'));return data;}
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{bodyRef.current?.scrollTo(0,0);setSearch('');setStatusMessage(null);let disposed=false;
    async function load(){setIsLoading(true);setLoadError('');try {
      if(['stats','poster','moderation','users'].includes(activeTab)){
        const [p,u,s]=await Promise.all([api.getFeed(),adminRequest('users'),adminRequest('stats')]);
        if(!disposed){setPostsList(p.posts);setUsersList(u.users);setStats(s);}
      }
      else if(activeTab==='supabase'){const [s,sql]=await Promise.all([api.getSupabaseStatus(),api.getSupabaseSchema()]);if(!disposed){setSupabaseStatus(s);setSbUrlInput(s.url||'');setRawSql(sql);}}
    }catch(e:any){if(!disposed)setLoadError(e.message);}finally{if(!disposed)setIsLoading(false);}}
    load();return()=>{disposed=true;};
  },[activeTab]);
  const hashtagData=useMemo(()=>{const count=new Map<string,number>(),recent:string[]=[];
    [...postsList].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).forEach(p=>{const found=new Set((p.hashtags||[]).map(t=>t.replace(/^#/,'').toLowerCase()));found.forEach(t=>{if(/^mundo_(silly|barbie|powerpuff|cn)$/.test(t))return;count.set(t,(count.get(t)||0)+1);if(!recent.includes(t))recent.push(t);});});
    return {popular:[...count].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12),recent:recent.slice(0,12)};
  },[postsList]);
  const selectedTags=new Set((caption.match(/#[a-zA-Z0-9_À-ÿ]+/g)||[]).map(t=>t.slice(1).toLowerCase()));
  function addTag(t:string){if(!selectedTags.has(t))setCaption(c=>(c.trimEnd()?c.trimEnd()+' ':'')+'#'+t);}
  async function handleAdminPostSubmit(e:React.FormEvent){e.preventDefault();if(submitLock.current)return;const urls=mediaUrl.split('\n').map(u=>u.trim()).filter(Boolean);if(!urls.length)return;
    submitLock.current=true;setPublishing(true);let completed=0;
    try{const media:Media[]=urls.map(url=>{const source=tiktokPost(url);return {url:source.canonical,type:source.postType==='photo'?'image':'video'};});const groups=separate?media.map(m=>[m]):[media];
      for(const group of groups){const result=await api.createPost({media:group,caption,allowComments:true,isTemporary:false});completed++;setPostsList(old=>[result.post,...old]);if(separate)setMediaUrl(urls.slice(completed).join('\n'));}
      setMediaUrl('');setCaption('');setStatusMessage(`${completed} publicações concluídas.`);onPostCreated?.();
    }catch(e:any){setStatusMessage(`${completed?completed+' publicações concluídas. ':''}${e.message}`);if(completed)onPostCreated?.();}finally{submitLock.current=false;if(mounted.current)setPublishing(false);}
  }
  async function mutateUser(u:User,field:'isAdmin'|'isPremium'|'isVerified'){
    if(field==='isAdmin'&&!confirm(ui('Alterar a permissão de administrador desta conta?')))return;
    setIsLoading(true);try{await adminRequest('users/'+u.id+(field==='isPremium'?'/premium':''),'PUT',{[field]:!u[field]});setUsersList(old=>old.map(v=>v.id===u.id?{...v,[field]:!u[field]}:v));}catch(e:any){setStatusMessage(e.message);}finally{setIsLoading(false);}
  }
  async function removeUser(u:User){if(!confirm(ui('Excluir esta conta e as publicações vinculadas a ela?')))return;setIsLoading(true);try{await adminRequest('users/'+u.id,'DELETE');setUsersList(old=>old.filter(v=>v.id!==u.id));onPostCreated?.();}catch(e:any){setStatusMessage(e.message);}finally{setIsLoading(false);}}
  async function removePost(p:Post){if(!confirm(ui('Deseja excluir esta publicação permanentemente?')))return;setIsLoading(true);try{await adminRequest('posts/'+p.id,'DELETE');setPostsList(old=>old.filter(v=>v.id!==p.id));onPostCreated?.();}catch(e:any){setStatusMessage(e.message);}finally{setIsLoading(false);}}
  async function handleSaveSupabase(e:React.FormEvent){e.preventDefault();setIsSavingSb(true);try{const r=await api.configureSupabase({url:sbUrlInput.trim(),key:sbKeyInput.trim(),serviceRoleKey:sbServiceKeyInput.trim()||undefined});setSupabaseStatus(r.status);setSbKeyInput('');setSbServiceKeyInput('');setStatusMessage(ui('Configurações do Supabase salvas e conectadas com sucesso!'));}catch(e:any){setStatusMessage(e.message);}finally{setIsSavingSb(false);}}
  async function handleCopySql(){try{await navigator.clipboard.writeText(rawSql);setCopiedSql(true);setStatusMessage(ui('Código SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.'));}catch{setStatusMessage(ui('Selecione e copie o código abaixo.'));}}
  const closing=()=>{if(publishing)return;onClose();};
  return <ModalFrame label={ui('Painel Administrativo')} onClose={closing} className="admin-overlay flex items-center justify-center p-3 sm:p-6">
    <section className="admin-panel" aria-busy={isLoading||publishing}>
      <header className="admin-header"><span className="admin-header-icon"><Shield size={22}/></span><div><h2>{ui('Painel Administrativo')}</h2><p>{ui('Conteúdo e configurações do app')}</p></div><button autoFocus className="icon-button" aria-label={ui('Fechar painel administrativo')} disabled={publishing} onClick={closing}><X size={20}/></button></header>
      <nav className="admin-tabs" aria-label={ui('Seções administrativas')}>{tabs.map(t=><button key={t.id} disabled={publishing} aria-current={activeTab===t.id?'page':undefined} onClick={()=>setActiveTab(t.id)}><t.icon size={18}/><span>{ui(t.label)}</span></button>)}</nav>
      <div ref={bodyRef} className="admin-body">
        {activeTab === 'requests' && <DirectoryRequestsAdmin/>}{activeTab === 'configuration' && <DirectoryConfiguration/>}{activeTab === 'verification' && <VerificationAdmin/>}
        {loadError&&<p className="admin-message" role="alert">{loadError}</p>}
        {isLoading&&<div className="admin-loading" role="status"><LoaderCircle size={18} className="animate-spin"/>{ui('Carregando…')}</div>}
        {activeTab==='stats'&&<div className="admin-overview"><div className="admin-intro"><span className="admin-eyebrow">mocinhas</span><h3>{ui('O diretório, em um só lugar.')}</h3><p>{ui('Publique, acompanhe as contas e ajuste o acesso diário.')}</p><button className="admin-primary" onClick={()=>setActiveTab('poster')}><Plus size={19}/>{ui('Nova publicação')}</button></div>
          <div className="admin-metrics"><div><FileText size={20}/><strong>{stats?.totalPosts??'—'}</strong><span>{ui('Publicações')}</span></div><div><Users size={20}/><strong>{stats?.totalUsers??'—'}</strong><span>{ui('Contas')}</span></div><div><HeartCount posts={postsList}/></div></div>
          <section className="admin-section"><h3>{ui('Publicações nos últimos 7 dias')}</h3><div className="admin-chart">{Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const key=d.toDateString(),count=postsList.filter(p=>new Date(p.createdAt).toDateString()===key).length;const max=Math.max(1,...Array.from({length:7},(_,j)=>{const x=new Date();x.setDate(x.getDate()-j);return postsList.filter(p=>new Date(p.createdAt).toDateString()===x.toDateString()).length;}));return <div key={key}><strong>{count}</strong><span className="admin-chart-track"><i style={{transform:`scaleY(${count/max})`}}/></span><small>{d.toLocaleDateString(language,{weekday:'short'})}</small></div>;})}</div></section>
          <p className="admin-muted">{ui('Exclusão automática desativada. Posts só são removidos manualmente pela administração.')}</p></div>}
        {activeTab==='poster'&&<form className="admin-publisher" onSubmit={handleAdminPostSubmit}>
          <div className="admin-section-heading"><h3>{ui('Nova publicação')}</h3><p>{ui('Publique links do TikTok com crédito ao criador original.')}</p></div>
          <fieldset disabled={publishing} className="admin-fields"><legend className="sr-only">{ui('Mídias e legenda')}</legend>
            <label>Links de publicações do TikTok — um por linha<textarea value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} rows={3} placeholder="https://www.tiktok.com/@usuario/photo/…"/></label><p className="admin-muted">Vídeos e carrosséis de fotos são incorporados da plataforma original. O crédito vem do próprio link.</p>
            <label className="admin-switch-row"><input type="checkbox" checked={separate} onChange={e=>setSeparate(e.target.checked)}/><span><strong>{ui('Publicar cada mídia separadamente')}</strong><small>{ui('Ativado: cada link vira uma publicação. Desativado: todos ficam na mesma galeria.')}</small></span></label>
            <label>{ui('Legenda e hashtags')}<textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={4} placeholder={ui('Escreva uma legenda e adicione #hashtags')}/></label>
            <section className="admin-tag-suggestions"><h4><Tag size={17}/>{ui('Hashtags mais usadas')}</h4><div>{hashtagData.popular.map(([t,n])=><button type="button" key={t} aria-pressed={selectedTags.has(t)} onClick={()=>addTag(t)}>#{t}<small>{n}</small></button>)}</div><h4>{ui('Recentes')}</h4><div>{hashtagData.recent.map(t=><button type="button" key={t} aria-pressed={selectedTags.has(t)} onClick={()=>addTag(t)}>#{t}</button>)}</div>{!hashtagData.recent.length&&<p className="admin-muted">{ui('As hashtags das publicações aparecerão aqui.')}</p>}</section>
          </fieldset>
          <button className="admin-primary" disabled={publishing||!mediaUrl.trim()} type="submit">{publishing?<LoaderCircle size={18} className="animate-spin"/>:<Plus size={18}/>} {ui(publishing?'Publicando…':'Publicar')}</button>
        </form>}
        {activeTab==='moderation'&&<section className="admin-section"><h3>{ui('Publicações')}</h3><label>{ui('Buscar publicações')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="admin-content-list">{postsList.filter(p=>(p.caption||'').toLowerCase().includes(search.toLowerCase())).map(p=><article key={p.id}>{p.media[0]&&<div className="admin-content-thumb">{p.media[0].type==='video'&&(!p.media[0].thumbnail||p.media[0].thumbnail===p.media[0].url)?<Video size={26}/>:<img src={p.media[0].thumbnail||p.media[0].url} alt=""/>}</div>}<div><time>{new Date(p.createdAt).toLocaleDateString(language)}</time><p>{p.caption||ui('Sem legenda')}</p><small>{p.media.length} {ui('mídias')}</small></div><button disabled={isLoading} className="admin-danger" aria-label={ui('Excluir publicação')} onClick={()=>removePost(p)}><Trash2 size={18}/></button></article>)}</div>{!postsList.length&&!isLoading&&<p>{ui('Ainda não há publicações.')}</p>}</section>}
        {activeTab==='users'&&<section className="admin-section"><h3>{ui('Contas')}</h3><label>{ui('Buscar contas')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="admin-users-list">{usersList.filter(u=>[u.displayName,u.username,u.email].join(' ').toLowerCase().includes(search.toLowerCase())).map(u=><article key={u.id}><div className="admin-user-summary"><span className="admin-monogram">{u.displayName?.slice(0,2).toUpperCase()}</span><div><strong>{u.displayName}</strong><small>{u.email}</small><small>{u.username}</small></div></div><div className="admin-user-actions"><button disabled={isLoading} aria-pressed={!!u.isPremium} onClick={()=>mutateUser(u,'isPremium')}><Crown size={16}/>{ui(u.isPremium?'Remover Premium':'Dar Premium')}</button><button disabled={isLoading||u.id===currentUser?.id} aria-pressed={!!u.isAdmin} onClick={()=>mutateUser(u,'isAdmin')}><Shield size={16}/>{ui(u.isAdmin?'Remover Admin':'Tornar Admin')}</button><details><summary>{ui('Mais opções')}</summary><button disabled={isLoading} onClick={()=>mutateUser(u,'isVerified')}>{ui(u.isVerified?'Remover verificação':'Verificar')}</button>{u.id!==currentUser?.id&&<button className="admin-danger" disabled={isLoading} onClick={()=>removeUser(u)}><Trash2 size={16}/>{ui('Excluir conta')}</button>}</details></div></article>)}</div></section>}
        {activeTab==='welcome'&&<WelcomeSettings/>}
        {activeTab==='audit'&&<LegalAuditAdmin/>}
        {activeTab==='usage'&&<UsageSettings/>}
        {activeTab==='syncpay'&&<section className="admin-section"><h3>Pagamentos desativados</h3><p>Não há novas cobranças nesta versão. Configurações e registros antigos foram preservados no banco, sem serem usados para iniciar pagamentos.</p></section>}
          {/* TAB: CATEGORIES */}
          {activeTab === 'supabase' && (
            <div className="space-y-6 animate-fadeIn"><StorageStatus/><details className="admin-advanced"><summary>{ui("Configuração avançada do Supabase")}</summary>
              {/* Header Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-[#171724] border border-emerald-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        {ui("Integração Total com o Supabase")}<span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {ui("Oficial")}</span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {ui("Persistência dos dados e arquivos do app em nuvem.")}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 shrink-0 self-start sm:self-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-xs font-bold text-zinc-200">
                      {supabaseStatus?.connected ? ui("Conectado ao Supabase") : (supabaseStatus?.configured ? ui("Aguardando Tabelas") : ui("Chaves Pendentes"))}
                    </span>
                  </div>
                </div>

                {supabaseStatus?.error && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{supabaseStatus.error}</span>
                  </div>
                )}
              </div>

              {/* Step 1: Configuration Form */}
              <div className="p-6 rounded-2xl bg-[#171724] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>{ui("1. Credenciais de Acesso da API")}</span>
                  </h4>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold underline transition-colors"
                  >
                    <span>{ui("Abrir Supabase Dashboard")}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {supabaseStatus?.tablesFound?.includes('mocinhas_app_state') ? <div className="admin-cloud-config"><p className="admin-muted">{ui('A persistência ativa é configurada pelas variáveis do Render. O painel não troca o projeto em uso.')}</p><label>{ui('Projeto conectado')}<input value={supabaseStatus.url || ''} readOnly/></label></div> : (
                <form onSubmit={handleSaveSupabase} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      {ui("Project URL (SUPABASE_URL):")}
                    <input
                      type="text"
                      value={sbUrlInput}
                      onChange={(e) => setSbUrlInput(e.target.value)}
                      placeholder="https://sua-empresa.supabase.co"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    /></label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      {ui("Anon Public Key (SUPABASE_ANON_KEY):")}
                    <input
                      type="password"
                      value={sbKeyInput}
                      onChange={(e) => setSbKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    /></label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      {ui("Service Role Key (Opcional - para operações admin de backend):")}
                    <input
                      type="password"
                      value={sbServiceKeyInput}
                      onChange={(e) => setSbServiceKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    /></label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSb}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSavingSb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isSavingSb ? ui("Conectando...") : ui("Salvar & Conectar ao Supabase")}</span>
                  </button>
                </form>)}

              </div>

              {/* Step 2: SQL Migration Script */}
              <div className="p-6 rounded-2xl bg-[#171724] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>{ui("2. Código SQL do Banco de Dados (Schema Completo)")}</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {ui("Copie e execute este código no SQL Editor do seu projeto Supabase para criar todas as tabelas e permissões.")}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    {copiedSql ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? ui("Copiado com Sucesso! ") : ui("Copiar Código SQL")}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                  <div className="text-[11px] text-zinc-400 space-y-1 mb-3">
                    <p className="font-bold text-zinc-200">{ui("Como executar no Supabase:")}</p>
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>{ui("Acesse seu painel no")}<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline">{ui("Supabase Dashboard")}</a>.</li>
                      <li>{ui("No menu lateral esquerdo, clique no ícone do")} <strong>{ui("SQL Editor")}</strong>.</li>
                      <li>{ui("Clique no botão")} <strong>{ui("+ New query")}</strong>.</li>
                      <li>{ui("Cole todo o código abaixo no editor e clique em")} <strong>{ui("Run")}</strong> {ui("(ou aperte Ctrl+Enter).")}</li>
                    </ol>
                  </div>

                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-300/90 text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto border border-white/5 select-all">
                      {rawSql || '-- Carregando código SQL completo...'}
                    </pre>
                  </div>
                </div>
              </div>
            </details></div>
          )}

      </div>
      {statusMessage&&<div className="admin-status" role="status" aria-live="polite">{statusMessage}</div>}
    </section>
  </ModalFrame>;
};
function HeartCount({posts}:{posts:Post[]}){return <><CheckCircle2 size={20}/><strong>{posts.reduce((n,p)=>n+(p.likesCount||0)+(p.commentsCount||0),0)}</strong><span>{ui('Curtidas e comentários')}</span></>;}


