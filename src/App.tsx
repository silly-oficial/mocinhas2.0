import { PublicationGallery } from './components/PublicationGallery';
import {mediaFeed} from './media/feed';
import {VideoQualitySettings} from './components/VideoQualitySettings';
import { WelcomeCarousel } from './components/WelcomeCarousel';
import { ModalFrame } from './components/ModalFrame';
import { ChevronLeft, ChevronRight, Maximize2, ArrowRight, SlidersHorizontal, Tag, Layers } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeModal } from './components/ThemeModal';
import { TranslationStatus } from './components/TranslationStatus';
import { ui, useUi } from './i18n/ui';
import { ManagedVideo, pauseMedia } from './components/ManagedVideo';
import { AutoTranslatedText } from './components/AutoTranslatedText';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Palette, Home, Orbit, Film, UserRound, Plus, ShieldCheck, LogIn, LogOut, Clock, X, Settings, Globe, Crown, LoaderCircle, Trash2, Heart, MessageCircle, Bookmark, Play, Pause, MoreHorizontal } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CommentsModal } from './components/CommentsModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { EditProfileModal } from './components/EditProfileModal';
import { LanguageModal } from './components/LanguageModal';
import { SyncpayModal } from './components/SyncpayModal';
import { UniverseFeed } from './components/UniverseFeed';
import { api } from './services/api';
import { Post } from './types';

const cleanText = (value: string) => value.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, '').replace(/@[\w.]+/g, '').trim();
function Publication({ post, admin, onDeleted, onUpdate, onComments, onNotice, disabled, mediaActive = true, sequenceIndex = 0 }: { post: Post; admin: boolean; onDeleted: () => void; onUpdate: (value: Partial<Post> & { id: string }) => void; onComments: (post: Post) => void; onNotice: (message: string) => void; disabled: boolean; mediaActive?: boolean; sequenceIndex?: number }) {
  useUi();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [mediaIndex, setMediaIndex] = useState(0), [fullImage, setFullImage] = useState(false), [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const orixVideo = useRef<HTMLVideoElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const publicationRef = useRef<HTMLElement | null>(null);
  const markPlaying = useCallback(() => setVideoPlaying(true), []);
  const markPaused = useCallback(() => setVideoPlaying(false), []);
  const bindVideo = useCallback((element: HTMLVideoElement | null) => {
    orixVideo.current?.removeEventListener('play', markPlaying);
    orixVideo.current?.removeEventListener('pause', markPaused);
    orixVideo.current = element;
    setVideoPlaying(Boolean(element && !element.paused));
    element?.addEventListener('play', markPlaying);
    element?.addEventListener('pause', markPaused);
  }, [markPlaying, markPaused]);
  useEffect(() => {
    bindVideo(theme === 'orix' ? publicationRef.current?.querySelector('video') || null : null);
    return () => bindVideo(null);
  }, [theme, mediaIndex, post.id, bindVideo]);
  useEffect(() => {
    if (theme === 'orix' && fullImage && post.media[mediaIndex]?.type === 'video') {
      publicationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [fullImage, theme, mediaIndex, post.id]);
  async function interact(action: 'like' | 'save') {
    if (busy || disabled) return;
    setBusy(action);
    try { if (action === 'like') { const result = await api.toggleLikePost(post.id); onUpdate({ id: post.id, isLiked: result.isLiked, likesCount: result.likesCount }); }
      else { const result = await api.toggleSavePost(post.id); onUpdate({ id: post.id, isSaved: result.isSaved }); onNotice(result.isSaved ? "Publicação salva" : "Removida dos salvos"); } }
    catch (e: any) { onNotice(e.message); } finally { setBusy(''); }
  }
  const originalCaption = cleanText(post.caption);
  const withoutTags = originalCaption.replace(/#[a-zA-Z0-9_À-ÿ]+/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  const displayCaption = theme === 'orix' && withoutTags ? withoutTags : originalCaption;
  const actions = <>
    <button disabled={disabled || !!busy} aria-label={post.isLiked ? ui("Descurtir publicação") : ui("Curtir publicação")} aria-pressed={!!post.isLiked} onClick={() => interact('like')}><Heart size={21} fill={post.isLiked ? 'currentColor' : 'none'} /><span>{post.likesCount || 0}</span></button>
    {post.allowComments !== false && <button disabled={disabled} aria-label={ui("Comentários")} onClick={() => onComments(post)}><MessageCircle size={21} /><span>{post.commentsCount || 0}</span></button>}
    <button disabled={disabled || !!busy} aria-label={post.isSaved ? ui("Remover dos salvos") : ui("Salvar publicação")} aria-pressed={!!post.isSaved} onClick={() => interact('save')}><Bookmark size={21} fill={post.isSaved ? 'currentColor' : 'none'} /></button>
  </>;
  if (theme === 'skyglass' || theme === 'orix') {
    const m = post.media[Math.min(mediaIndex, post.media.length - 1)];
    const visual = m && !['audio','pdf'].includes(m.type);
    return <article ref={publicationRef} onContextMenu={e=>e.preventDefault()} className={`publication sky-publication ${visual ? 'has-visual' : 'document-publication'} ${theme === 'orix' && visual ? m.type === 'video' ? 'orix-video' : 'orix-photo' : ''} ${fullImage ? 'show-full-media' : ''}`}>
      <div className="sky-media-stage">
        {m && <div className="publication-media" key={m.id}>
          {m.type === 'video' ? <ManagedVideo active={!disabled && mediaActive} src={m.url} poster={m.thumbnail !== m.url ? m.thumbnail : undefined} className="sky-media" showSeek={theme !== 'orix' || fullImage} onElement={theme === 'orix' ? bindVideo : undefined} /> : m.type === 'audio' ? <audio controls src={m.url} onPlay={e => { document.querySelectorAll<HTMLMediaElement>('video,audio').forEach(v => { if (v !== e.currentTarget) v.pause(); }); if (disabled || !mediaActive) e.currentTarget.pause(); }} /> : m.type === 'pdf' ? <a className="sky-document-link" href={m.url} target="_blank" rel="noreferrer">{ui("Abrir documento")}<ArrowRight size={20}/></a> : <img draggable={false} loading="lazy" src={m.url} alt={cleanText(post.caption) || ui('Publicação')} className="sky-media" style={m.focus && !fullImage ? { objectPosition: `${m.focus.x}% ${m.focus.y}%`, transform: `scale(${m.focus.zoom || 1})`, transformOrigin: `${m.focus.x}% ${m.focus.y}%` } : undefined}/>}
        </div>}
        <div className="sky-card-top">{theme === 'orix' ? <><span className="orix-category" title={sequenceIndex % 2 === 0 && post.hashtags?.[0] ? '#'+post.hashtags[0] : undefined}>{sequenceIndex % 2 === 0 && post.hashtags?.[0] ? '#'+post.hashtags[0] : ui('Fotos')}</span><span className="orix-album-count">{post.media.length > 1 ? `${mediaIndex + 1} / ${post.media.length}` : `${post.likesCount || 0} ${ui('Curtidas')}`}</span></> : <><time>{new Date(post.createdAt).toLocaleDateString(language)}</time>{post.media.length > 1 && <span>{mediaIndex + 1} / {post.media.length}</span>}</>}{admin && <button aria-label={ui('Excluir publicação')} onClick={async () => { if (confirm(ui('Excluir esta publicação permanentemente?'))) { try { await api.deletePost(post.id); onDeleted(); } catch(e:any) { onNotice(e.message); } } }}><Trash2 size={18}/></button>}</div>
        <div className="sky-action-rail">{actions}{visual && <button className={theme === 'orix' ? 'orix-expand' : undefined} aria-label={ui(fullImage ? 'Enquadrar mídia' : 'Ver mídia completa')} aria-pressed={fullImage} onClick={() => setFullImage(v => !v)}><Maximize2 size={20}/></button>}</div>
        {post.media.length > 1 && <div className="sky-media-pager"><button disabled={mediaIndex === 0} aria-label={ui('Mídia anterior')} onClick={() => { pauseMedia(); setMediaIndex(i => i - 1); }}><ChevronLeft size={20}/></button><button disabled={mediaIndex === post.media.length - 1} aria-label={ui('Próxima mídia')} onClick={() => { pauseMedia(); setMediaIndex(i => i + 1); }}><ChevronRight size={20}/></button></div>}
        {theme === 'orix' && m?.type === 'video' && <button className="orix-video-toggle" disabled={disabled || !mediaActive} aria-label={ui(videoPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo')} onClick={() => { const video = orixVideo.current; if (!video) return; if (video.paused) video.play().catch(() => onNotice(ui('Toque novamente para reproduzir.'))); else video.pause(); }}>{videoPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}</button>}
        {theme === 'orix' && m?.type === 'video' && !post.caption && <div className="orix-empty-footer" aria-hidden="true"/>}
        {theme === 'orix' && fullImage && visual && m.type !== 'video' && <button className="orix-full-return" aria-label={ui('Enquadrar mídia')} onClick={() => setFullImage(false)}><X size={20}/></button>}
        {displayCaption && !(fullImage && m?.type === 'video') && <div className={`sky-card-caption ${expanded ? 'expanded' : ''}`}><div><AutoTranslatedText text={displayCaption} renderTransformed={theme === 'orix' ? text => withoutTags ? text.replace(/#[a-zA-Z0-9_À-ÿ]+/g, '').replace(/[ \t]{2,}/g, ' ').trim() : text : undefined} contentClassName={theme === 'orix' && !expanded ? 'orix-caption-text' : undefined}/></div>{displayCaption.length > 95 && <button onClick={() => setExpanded(v => !v)}>{ui(expanded ? 'Ver menos' : 'Ver mais')}</button>}</div>}
      </div>
    </article>;
  }
  return <article onContextMenu={e=>e.preventDefault()} className="publication niuniu-card overflow-hidden">
    <div className="flex items-center justify-between p-4 text-xs text-zinc-400"><time>{new Date(post.createdAt).toLocaleDateString(language)}</time>
    {admin && <button aria-label={ui("Excluir publicação")} className="p-2 rounded-full hover:bg-white/10" onClick={async () => { if (confirm(ui("Excluir esta publicação permanentemente?"))) { try { await api.deletePost(post.id); onDeleted(); } catch (e: any) { onNotice(e.message); } } }}><Trash2 size={17} /></button>}</div>
    {post.media.map(media => <div key={media.id} className="publication-media bg-black/30">
      {media.type === 'video' ? <ManagedVideo active={!disabled && mediaActive} src={media.url} poster={media.thumbnail !== media.url ? media.thumbnail : undefined} /> : media.type === 'audio' ? <audio controls onPlay={e => { document.querySelectorAll<HTMLMediaElement>('video,audio').forEach(v => { if (v !== e.currentTarget) v.pause(); }); if (disabled || !mediaActive) e.currentTarget.pause(); }} src={media.url} className="w-full" /> : media.type === 'pdf' ? <a href={media.url} target="_blank" rel="noreferrer" className="block p-5 underline">{ui("Abrir documento")}</a> : <img draggable={false} loading="lazy" src={media.url} alt={cleanText(post.caption) || 'Publicação'} className="w-full max-h-[75vh] object-contain" />}
    </div>)}
    {post.caption && <div className="p-5 whitespace-pre-wrap break-words text-sm leading-relaxed"><AutoTranslatedText text={cleanText(post.caption)} /></div>}
    <div className="publication-actions px-5 pb-4 flex items-center gap-5 border-t border-white/5 pt-3">
      <button disabled={disabled || !!busy} aria-label={post.isLiked ? ui("Descurtir publicação") : ui("Curtir publicação")} aria-pressed={!!post.isLiked} onClick={() => interact('like')} className={`flex items-center gap-2 text-sm disabled:opacity-40 ${post.isLiked ? 'text-emerald-400' : 'text-zinc-400'}`}><Heart size={20} fill={post.isLiked ? 'currentColor' : 'none'} />{post.likesCount || 0}</button>
      {post.allowComments !== false && <button disabled={disabled} aria-label={ui("Comentários")} className="flex items-center gap-2 text-sm text-zinc-400 disabled:opacity-40" onClick={() => onComments(post)}><MessageCircle size={20} />{post.commentsCount || 0}</button>}
      <button disabled={disabled || !!busy} aria-label={post.isSaved ? ui("Remover dos salvos") : ui("Salvar publicação")} aria-pressed={!!post.isSaved} className={`ml-auto disabled:opacity-40 ${post.isSaved ? 'text-emerald-400' : 'text-zinc-400'}`} onClick={() => interact('save')}><Bookmark size={20} fill={post.isSaved ? 'currentColor' : 'none'} /></button>
    </div>
  </article>;

}
function MainApp() {
  useUi();
  const { language, currentLanguageInfo } = useLanguage();
  const { theme } = useTheme();
  const { user, isLoading, logout } = useAuth();
  const [view, setView] = useState('feed'), [posts, setPosts] = useState<Post[]>([]), [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(''), [selected, setSelected] = useState<Post | null>(null), [tags, setTags] = useState<string[]>([]);
  const [commentsPost, setCommentsPost] = useState<Post | null>(null), [notice, setNotice] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const loadedFor = useRef('');
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current; if (!header) return;
    const measure = () => document.documentElement.style.setProperty("--app-header-height", `${header.getBoundingClientRect().height}px`);
    measure(); const observer = new ResizeObserver(measure); observer.observe(header);
    return () => observer.disconnect();
  }, [isLoading]);
  const [quota, setQuota] = useState<any>(null), [validUntil, setValidUntil] = useState(0), [now, setNow] = useState(Date.now()), [error, setError] = useState('');
  const isAdmin = user?.isAdmin === true;
  useEffect(() => {
    setQuota(null); setValidUntil(0); setPosts([]); setHasAccess(false); loadedFor.current = "";
    if (!user) return;
    let disposed = false, busy = false;
    async function renew() {
      if (busy || document.hidden) return;
      busy = true;
      try { const q = await api.consumeUsage(); if (!disposed) { setQuota(q); setValidUntil(q.unlimited ? Infinity : Date.now() + q.allowedMs); if (!q.blocked && q.allowedMs > 0) setHasAccess(true); setError(''); } }
      catch (e: any) { if (!disposed) { setError("Reconectando…"); if (e.status === 401) { setHasAccess(false); setValidUntil(0); } } }
      finally { busy = false; }
    }
    renew(); const timer = setInterval(renew, 2000);
    document.addEventListener('visibilitychange', renew);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', renew); };
  }, [user?.id]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const allowed = Boolean(user && hasAccess && !quota?.blocked);
  const leaseValid = allowed && validUntil > now;
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(t); }, [notice]);
  const load = useCallback(async () => { setLoading(true); try { const result = await api.getFeed(); setPosts(result.posts); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { if (allowed && loadedFor.current !== user?.id) { loadedFor.current = user!.id; load(); } }, [user?.id, allowed, load]);
  useEffect(() => { if (modal || commentsPost || selected) pauseMedia(); }, [modal, commentsPost, selected?.id]);
  useEffect(() => { if (!leaseValid) { document.querySelectorAll('video,audio').forEach((m: any) => m.pause()); } }, [leaseValid]);
  const homePosts=useMemo(()=>mediaFeed(posts,'feed'),[posts]);
  const videos=useMemo(()=>mediaFeed(posts,'videos'),[posts]);
  const tagSource = view === 'videos' ? videos : view === 'feed' ? homePosts : posts;
  const allTags = useMemo(() => [...new Set(tagSource.flatMap(p => (p.hashtags || []).map(t => t.toLowerCase())))].sort(), [tagSource]);
  const source = view === 'videos' ? videos : view === 'saved' ? posts.filter(p => p.isSaved) : homePosts;
  const shown = source.filter(p => !tags.length || tags.some(t => (p.hashtags || []).map(h => h.toLowerCase()).includes(t)));
  const updatePost = (value: Partial<Post> & { id: string }) => {
    setPosts(prev => prev.map(p => p.id === value.id ? { ...p, ...value } : p));
    setSelected(prev => prev?.id === value.id ? { ...prev, ...value } : prev);
    setCommentsPost(prev => prev?.id === value.id ? { ...prev, ...value } : prev);
  };
  const engagement = { onUpdate: updatePost, onComments: setCommentsPost, onNotice: setNotice, disabled: !leaseValid };
  const nav = (theme === 'skyglass' || theme === 'orix')
    ? [{id:'feed',label:ui('Início'),icon:Home},{id:'videos',label:ui('Vídeos'),icon:Film},{id:'universe',label:ui('Universo'),icon:Orbit},{id:'saved',label:ui('Salvos'),icon:Heart},{id:'profile',label:ui('Conta'),icon:UserRound}]
    : [{ id: 'feed', label: ui("Início"), icon: Home }, { id: 'videos', label: ui("Vídeos"), icon: Film }, { id: isAdmin ? 'create' : 'universe', label: isAdmin ? ui("Publicar") : ui("Universo"), icon: isAdmin ? Plus : Orbit }, { id: 'profile', label: ui("Conta"), icon: UserRound }];
  function navigate(id: string) { pauseMedia(); if (id === 'create') setModal('admin'); else { setView(id); setTags([]); setSelected(null); window.scrollTo(0, 0); } }
  if (isLoading) return <div className="min-h-screen grid place-items-center"><LoaderCircle className="animate-spin" /></div>;
  return <div className="app-shell min-h-screen max-w-7xl mx-auto px-3 sm:px-6 pb-28">
    <header ref={headerRef} className="app-header sticky top-0 z-30 py-3 bg-[var(--canvas-bg)]"><div className="app-topbar">
      {theme === 'orix' && <div className="orix-top-controls"><button className="orix-appearance" aria-label={ui('Aparência')} onClick={() => setModal('theme')}><span><Palette size={22}/></span><strong>{ui('Aparência')}</strong></button><div className="orix-top-right"><details className="orix-head-menu" onKeyDown={event => { if(event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus(); } }}><summary aria-label={ui('Mais opções')}><MoreHorizontal size={20}/></summary><div><button onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setModal('language'); }}><Globe size={18}/>{ui('Idioma')}</button>{user && <button onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); navigate('saved'); }}><Bookmark size={18}/>{ui('Publicações salvas')}</button>}{user && <button onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setModal('premium'); }}><Crown size={18}/>{ui('Premium')}</button>}{isAdmin && <button aria-label={ui('Admin')} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setModal('admin'); }}><ShieldCheck size={18}/>{ui('Painel Administrativo')}</button>}</div></details><button className="orix-profile" aria-label={ui(user ? 'Minha conta' : 'Entrar')} onClick={() => user ? navigate('profile') : setModal('auth')}>{user ? <><span>{user.avatar?.includes('profile-placeholder') ? <UserRound size={25}/> : user.displayName.slice(0,2).toUpperCase()}</span>{user.avatar && !user.avatar.includes('profile-placeholder') && <img src={user.avatar} alt="" onError={event => { event.currentTarget.style.display='none'; }}/>}</> : <UserRound size={25}/>}</button></div></div>}
      <div className="brand-group">{theme === "skyglass" && <button className="sky-brand-avatar" aria-label={ui("Minha conta")} onClick={() => navigate(user ? "profile" : "feed")}>{user ? user.displayName.slice(0,2).toUpperCase() : <Orbit size={22}/>}</button>}<div className="brand-copy"><button className="brand-wordmark" onClick={() => navigate('feed')}>mocinhas</button>{user && quota && !quota.unlimited && <span className="quota-pill"><Clock size={15} />{Math.ceil((quota.remainingMs || 0) / 60000)} {ui("min")}</span>}</div></div>
      <div className="header-actions">
        <button aria-label={ui("Aparência")} className="icon-button header-appearance" onClick={() => setModal("theme")}><Palette size={19} /></button>

        <button aria-label={ui("Idioma")} className="icon-button header-language" title={currentLanguageInfo.nativeName} onClick={() => setModal('language')}><Globe size={18} /></button>
        {user && <button aria-label={ui("Publicações salvas")} className="icon-button header-saved" onClick={() => navigate('saved')}><Bookmark size={19} /></button>}
        {user && <button aria-label={ui("Premium")} className="icon-button premium-button" onClick={() => setModal('premium')}><Crown size={19} /></button>}
        {isAdmin && <button aria-label={ui("Admin")} className="header-admin icon-button items-center gap-2 p-2" onClick={() => setModal('admin')}><ShieldCheck size={19} /><span className="hidden sm:block">{ui("Admin")}</span></button>}
        {!user && <button className="flex items-center gap-2" onClick={() => setModal('auth')}><LogIn size={19} />{ui("Entrar")}</button>}
      </div></div><TranslationStatus /></header>
    <div className="app-layout flex gap-6"><aside className="app-sidebar hidden lg:block w-52 shrink-0"><nav className="niuniu-card p-3 sticky top-24 space-y-2">{nav.map(n => <button aria-label={n.label} key={n.id} data-destination={n.id} aria-current={view === n.id ? "page" : undefined} onClick={() => navigate(n.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${view === n.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400 hover:bg-white/5'}`}><span className="nav-icon"><n.icon size={20} /></span>{n.label}</button>)}{isAdmin && theme !== "skyglass" && theme !== "orix" && <button className="w-full flex gap-3 p-3 text-zinc-400" onClick={() => navigate('universe')}><Orbit size={20} />{ui("Universo")}</button>}</nav></aside>
    <main className="min-w-0 flex-1">
      {theme === 'orix' && user && view !== 'profile' && <div className="orix-page-heading"><div><span>mocinhas</span><h1>{ui(view === 'videos' ? 'Vídeos' : view === 'saved' ? 'Publicações salvas' : view === 'universe' ? 'Universo' : 'Seu universo de conteúdo')}</h1></div></div>}
      {!user ? <section className="welcome-card niuniu-card p-10 text-center space-y-4"><WelcomeCarousel inactive={!!modal}/><Orbit className="mx-auto text-emerald-400" size={40} /><h1 className="text-2xl font-bold">{ui("Seu universo de conteúdo")}</h1><p className="text-zinc-400">{ui("Entre para ver as publicações e os vídeos.")}</p><button aria-label={ui('Entrar ou criar conta')} className="rounded-full bg-emerald-500 text-black font-bold px-6 py-3" onClick={() => setModal('auth')}>{ui("Entrar ou criar conta")}</button></section> : view === 'profile' ? <section className="account-page max-w-2xl mx-auto space-y-5">
      <div className="niuniu-card overflow-hidden"><div className="account-cover"><span className="text-xs uppercase tracking-[.2em] text-emerald-200">{ui("Seu espaço")}</span><Orbit size={100} className="account-orbit" /></div>
      <div className="px-6 pb-6"><div className="account-monogram -mt-8 relative">{user.displayName.slice(0, 2).toUpperCase()}</div><div className="mt-4 flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-bold truncate">{user.displayName}</h1><p className="text-sm text-zinc-400 mt-1">{ui("Minha conta")}</p></div><span className="account-badge">{isAdmin ? ui("Administrador") : user.isPremium ? ui("Premium") : ui("Membro")}</span></div>
      <div className="grid grid-cols-2 gap-3 mt-6"><button onClick={() => navigate('saved')} className="account-stat"><Bookmark size={19} /><strong>{posts.filter(p => p.isSaved).length}</strong><span>{ui("Publicações salvas")}</span></button><div className="account-stat"><Clock size={19} /><strong>{quota?.unlimited ? ui("Sem limite") : `${Math.ceil((quota?.remainingMs || 0) / 60000)} min`}</strong><span>{ui("Tempo disponível")}</span></div></div></div></div>
      <div className="niuniu-card p-2">{isAdmin && <button className="account-row" onClick={() => setModal("admin")}><ShieldCheck size={20}/><span><strong>{ui("Painel Administrativo")}</strong><small>{ui("Publicações e configurações")}</small></span><span aria-hidden="true">›</span></button>}<button className="account-row" onClick={() => setModal("theme")}><Palette size={20} /><span><strong>{ui("Aparência")}</strong><small>{theme === "orix" ? "Orix Orange" : theme === "lilac" ? "Lilac Studio" : theme === "skyglass" ? "Skyglass" : theme === "orely" ? "Orelly Pop" : "Original"}</small></span><span aria-hidden="true">›</span></button><VideoQualitySettings/><button className="account-row" onClick={() => setModal('edit')}><Settings size={20} /><span><strong>{ui("Editar perfil")}</strong><small>{ui("Seu nome nos comentários")}</small></span><span aria-hidden="true">›</span></button><button className="account-row" onClick={() => setModal('language')}><Globe size={20} /><span><strong>{ui("Idioma do aplicativo")}</strong><small>{currentLanguageInfo.nativeName}</small></span><span aria-hidden="true">›</span></button><button className="account-row" onClick={() => setModal('premium')}><Crown size={20} /><span><strong>{ui("Mocinhas Premium")}</strong><small>{ui("Gerencie seu acesso Premium")}</small></span><span aria-hidden="true">›</span></button></div>
      <button className="account-row text-zinc-400 w-full rounded-2xl border border-white/10" onClick={() => { pauseMedia(); logout(); }}><LogOut size={19} /><span>{ui("Sair da conta")}</span></button>
      </section> : !allowed ? <section className="niuniu-card p-10 text-center space-y-4"><Clock className="mx-auto text-emerald-400" size={36} /><h1 className="text-xl font-bold">{quota?.blocked ? ui("Seu tempo de hoje terminou") : error ? ui("Não foi possível autorizar o acesso") : ui("Verificando seu acesso")}</h1><p className="text-zinc-400">{quota?.blocked ? `${ui('Disponível novamente em')} ${new Date(quota.resetAt).toLocaleString(language)}.` : ui(error || 'Aguarde um instante.')}</p></section> : <>
        {(view === 'videos' || view === 'feed' || view === 'saved') && <div className={`feed-toolbar relative z-10 bg-[var(--canvas-bg)] py-3 transition-[transform,opacity] duration-200 `}>{view !== 'feed' && <h1 className="font-bold text-xl mb-3">{view === 'videos' ? ui("Vídeos") : ui("Publicações salvas")}</h1>}<div className="tag-scroll flex gap-2 overflow-x-auto pb-2"><button aria-pressed={!tags.length} className={`tag-chip ${!tags.length ? 'selected' : ''}`} onClick={() => setTags([])}>{theme === "skyglass" && <span className="sky-filter-icon"><Layers size={18}/></span>}<span>{ui("Todos")}</span></button>{allTags.map((t,index) => <button aria-pressed={tags.includes(t)} title={"#"+t} key={t} className={`tag-chip ${tags.includes(t) ? 'selected' : ''}`} onClick={() => setTags(prev => prev.includes(t) ? prev.filter(v => v !== t) : [...prev, t])}>{theme === "skyglass" && <span className="sky-filter-icon" data-color={index % 5}><Tag size={18}/></span>}<span>#{t}</span></button>)}</div></div>}
        {view === 'universe' ? <UniverseFeed posts={posts} isLoading={loading} paused={!!selected || !!modal || !!commentsPost || !leaseValid} onSelectPost={setSelected} onSwitchToList={() => navigate('feed')} /> : <PublicationGallery key={view} orix={theme === 'orix'} videos={view === 'videos'}>{loading && !posts.length ? <LoaderCircle className="animate-spin mx-auto" /> : shown.map((p, index) => <Publication sequenceIndex={index} mediaActive={!modal && !selected && !commentsPost} key={p.id} post={p} admin={isAdmin} {...engagement} onDeleted={load} />)}{!loading && !shown.length && <p className="niuniu-card p-8 text-center text-zinc-400">{tags.length ? ui("Nenhuma publicação com as hashtags selecionadas.") : ui("Ainda não há publicações.")}</p>}</PublicationGallery>}
      </>}
    </main></div>
    <nav aria-label={ui("Navegação principal")} className="app-bottom-nav lg:hidden fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-40 niuniu-card flex justify-around p-2 pb-safe">{nav.filter(n => theme !== 'orix' || n.id !== 'saved').map(n => <button aria-label={n.label} key={n.id} data-destination={n.id} aria-current={view === n.id ? "page" : undefined} onClick={() => navigate(n.id)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${view === n.id ? 'text-emerald-300 bg-emerald-500/10' : 'text-zinc-400'}`}><span className="nav-icon"><n.icon size={21} /></span><span className="nav-label text-[10px]">{n.label}</span></button>)}</nav>
    {selected && allowed && <ModalFrame label={ui("Publicação")} onClose={() => setSelected(null)} className="publication-dialog grid place-items-center overflow-y-auto p-4"><div className="max-w-2xl mx-auto"><button className="p-3 bg-[var(--surface-card)] rounded-full mb-3" aria-label={ui("Fechar")} onClick={() => setSelected(null)}><X /></button><Publication mediaActive={!modal && !commentsPost} post={selected} admin={isAdmin} {...engagement} onDeleted={() => { setSelected(null); load(); }} /></div></ModalFrame>}
    {(notice || error || (hasAccess && !leaseValid && !quota?.blocked)) && <div role="status" aria-live="polite" className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] pointer-events-none rounded-full bg-[var(--surface-elevated)] border border-white/15 text-xs text-zinc-300 px-4 py-2 shadow-lg max-w-[90vw]">{ui(notice || error || 'Reconectando…')}</div>}
    {commentsPost && allowed && <CommentsModal post={commentsPost} onClose={() => setCommentsPost(null)} onNavigateUser={() => {}} onCommentCountChange={(id, count) => updatePost({ id, commentsCount: count })} />}
    {modal === 'theme' && <ThemeModal onClose={() => setModal('')} />}
    {modal === 'auth'  && <AuthModal onClose={() => setModal('')} />}
    {modal === 'admin' && isAdmin && <AdminPanel onClose={() => setModal('')} onPostCreated={load} />}
    {modal === 'edit' && user && <EditProfileModal onClose={() => setModal('')} onProfileUpdated={() => setModal('')} />}
    <LanguageModal isOpen={modal === 'language'} onClose={() => setModal('')} />
    {modal === 'premium' && user && <SyncpayModal onClose={() => setModal('')} />}
  </div>;
}
export default function App() { return <LanguageProvider><ThemeProvider><AuthProvider><MainApp /></AuthProvider></ThemeProvider></LanguageProvider>; }
