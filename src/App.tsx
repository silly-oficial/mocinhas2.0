import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Home, Orbit, Film, UserRound, Plus, ShieldCheck, LogIn, LogOut, Clock, X, Settings, Globe, Crown, LoaderCircle, Trash2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { EditProfileModal } from './components/EditProfileModal';
import { LanguageModal } from './components/LanguageModal';
import { SyncpayModal } from './components/SyncpayModal';
import { UniverseFeed } from './components/UniverseFeed';
import { api } from './services/api';
import { Post } from './types';

const cleanText = (value: string) => value.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, '').replace(/@[\w.]+/g, '').trim();
function Publication({ post, admin, onDeleted }: { post: Post; admin: boolean; onDeleted: () => void }) {
  return <article className="niuniu-card overflow-hidden">
    <div className="flex items-center justify-between p-4 text-xs text-zinc-400"><time>{new Date(post.createdAt).toLocaleDateString('pt-BR')}</time>
    {admin && <button aria-label="Excluir publicação" className="p-2 rounded-full hover:bg-white/10" onClick={async () => { if (confirm('Excluir esta publicação permanentemente?')) { try { await api.deletePost(post.id); onDeleted(); } catch (e: any) { alert(e.message); } } }}><Trash2 size={17} /></button>}</div>
    {post.media.map(media => <div key={media.id} className="bg-black/30">
      {media.type === 'video' ? <video controls playsInline preload="metadata" poster={media.thumbnail !== media.url ? media.thumbnail : undefined} src={media.url} className="w-full max-h-[75vh] object-contain" onPlay={e => { document.querySelectorAll('video').forEach(v => { if (v !== e.currentTarget) v.pause(); }); }} /> : media.type === 'audio' ? <audio controls src={media.url} className="w-full" /> : media.type === 'pdf' ? <a href={media.url} target="_blank" rel="noreferrer" className="block p-5 underline">Abrir documento</a> : <img loading="lazy" src={media.url} alt={cleanText(post.caption) || 'Publicação'} className="w-full max-h-[75vh] object-contain" />}
    </div>)}
    {post.caption && <p className="p-5 whitespace-pre-wrap break-words text-sm leading-relaxed">{cleanText(post.caption)}</p>}
  </article>;
}
function MainApp() {
  const { user, isLoading, logout } = useAuth();
  const [view, setView] = useState('feed'), [posts, setPosts] = useState<Post[]>([]), [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(''), [selected, setSelected] = useState<Post | null>(null), [tags, setTags] = useState<string[]>([]);
  const [quota, setQuota] = useState<any>(null), [validUntil, setValidUntil] = useState(0), [now, setNow] = useState(Date.now()), [error, setError] = useState('');
  const isAdmin = user?.isAdmin === true;
  useEffect(() => {
    setQuota(null); setValidUntil(0); setPosts([]);
    if (!user) return;
    let disposed = false, busy = false;
    async function renew() {
      if (busy || document.hidden) return;
      busy = true;
      try { const q = await api.consumeUsage(); if (!disposed) { setQuota(q); setValidUntil(Date.now() + Math.min(q.allowedMs, 10_000)); setError(''); } }
      catch (e: any) { if (!disposed) { setValidUntil(0); setError(e.message); } }
      finally { busy = false; }
    }
    renew(); const timer = setInterval(renew, 1000);
    document.addEventListener('visibilitychange', renew);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', renew); };
  }, [user?.id]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  const allowed = Boolean(user && validUntil > now && !quota?.blocked);
  const load = useCallback(async () => { setLoading(true); try { const result = await api.getFeed(); setPosts(result.posts); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { if (allowed) load(); }, [user?.id, allowed, load]);
  useEffect(() => { if (!allowed) { setSelected(null); document.querySelectorAll('video,audio').forEach((m: any) => m.pause()); } }, [allowed]);
  const videos = useMemo(() => posts.filter(p => p.media.some(m => m.type === 'video')), [posts]);
  const allTags = useMemo(() => [...new Set(videos.flatMap(p => p.hashtags.map(t => t.toLowerCase())))].sort(), [videos]);
  const shown = view === 'videos' ? videos.filter(p => !tags.length || tags.some(t => p.hashtags.map(h => h.toLowerCase()).includes(t))) : posts;
  const nav = [{ id: 'feed', label: 'Início', icon: Home }, { id: 'videos', label: 'Vídeos', icon: Film }, { id: isAdmin ? 'create' : 'universe', label: isAdmin ? 'Publicar' : 'Universo', icon: isAdmin ? Plus : Orbit }, { id: 'profile', label: 'Conta', icon: UserRound }];
  function navigate(id: string) { if (id === 'create') setModal('admin'); else { setView(id); setSelected(null); window.scrollTo(0, 0); } }
  if (isLoading) return <div className="min-h-screen grid place-items-center"><LoaderCircle className="animate-spin" /></div>;
  return <div className="min-h-screen max-w-7xl mx-auto px-3 sm:px-6 pb-28">
    <header className="sticky top-0 z-30 py-3 bg-[var(--canvas-bg)]"><div className="niuniu-card px-5 py-3 flex items-center justify-between gap-2">
      <button className="font-extrabold text-xl" onClick={() => navigate('feed')}>mocinhas</button>
      <div className="flex items-center gap-2">
        {user && quota && !quota.unlimited && <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock size={15} />{Math.ceil((quota.remainingMs || 0) / 60000)} min</span>}
        <button aria-label="Idioma" className="p-2" onClick={() => setModal('language')}><Globe size={19} /></button>
        {user && <button aria-label="Premium" className="p-2 text-yellow-400" onClick={() => setModal('premium')}><Crown size={19} /></button>}
        {isAdmin && <button className="flex items-center gap-2 p-2" onClick={() => setModal('admin')}><ShieldCheck size={19} /><span className="hidden sm:block">Admin</span></button>}
        {!user && <button className="flex items-center gap-2" onClick={() => setModal('auth')}><LogIn size={19} />Entrar</button>}
      </div></div></header>
    <div className="flex gap-6"><aside className="hidden lg:block w-52 shrink-0"><nav className="niuniu-card p-3 sticky top-24 space-y-2">{nav.map(n => <button key={n.id} onClick={() => navigate(n.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${view === n.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400 hover:bg-white/5'}`}><n.icon size={20} />{n.label}</button>)}{isAdmin && <button className="w-full flex gap-3 p-3 text-zinc-400" onClick={() => navigate('universe')}><Orbit size={20} />Universo</button>}</nav></aside>
    <main className="min-w-0 flex-1">
      {!user ? <section className="niuniu-card p-10 text-center space-y-4"><Orbit className="mx-auto text-emerald-400" size={40} /><h1 className="text-2xl font-bold">Seu universo de conteúdo</h1><p className="text-zinc-400">Entre para ver as publicações e os vídeos.</p><button className="rounded-full bg-emerald-500 text-black font-bold px-6 py-3" onClick={() => setModal('auth')}>Entrar ou criar conta</button></section> : view === 'profile' ? <section className="niuniu-card p-6 space-y-5"><h1 className="text-xl font-bold">Minha conta</h1><p>{user.displayName}</p><button className="flex gap-2" onClick={() => setModal('edit')}><Settings size={18} />Editar perfil</button><button className="flex gap-2" onClick={logout}><LogOut size={18} />Sair</button></section> : !allowed ? <section className="niuniu-card p-10 text-center space-y-4"><Clock className="mx-auto text-emerald-400" size={36} /><h1 className="text-xl font-bold">{quota?.blocked ? 'Seu tempo de hoje terminou' : error ? 'Não foi possível autorizar o acesso' : 'Verificando seu acesso'}</h1><p className="text-zinc-400">{quota?.blocked ? `Disponível novamente em ${new Date(quota.resetAt).toLocaleString('pt-BR')}.` : error || 'Aguarde um instante.'}</p></section> : <>
        {view === 'videos' && <div className="sticky top-[85px] z-20 bg-[var(--canvas-bg)] py-3"><h1 className="font-bold text-xl mb-3">Vídeos</h1><div className="flex gap-2 overflow-x-auto pb-2"><button className={`tag-chip ${!tags.length ? 'selected' : ''}`} onClick={() => setTags([])}>Todos</button>{allTags.map(t => <button aria-pressed={tags.includes(t)} key={t} className={`tag-chip ${tags.includes(t) ? 'selected' : ''}`} onClick={() => setTags(prev => prev.includes(t) ? prev.filter(v => v !== t) : [...prev, t])}>#{t}</button>)}</div></div>}
        {view === 'universe' ? <UniverseFeed posts={posts} isLoading={loading} paused={!!selected || !!modal} onSelectPost={setSelected} onSwitchToList={() => navigate('feed')} /> : <div className="max-w-2xl mx-auto space-y-5">{loading && !posts.length ? <LoaderCircle className="animate-spin mx-auto" /> : shown.map(p => <Publication key={p.id} post={p} admin={isAdmin} onDeleted={load} />)}{!loading && !shown.length && <p className="niuniu-card p-8 text-center text-zinc-400">{tags.length ? 'Nenhum vídeo com as hashtags selecionadas.' : 'Ainda não há publicações.'}</p>}</div>}
      </>}
    </main></div>
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-40 niuniu-card flex justify-around p-2 pb-safe">{nav.map(n => <button key={n.id} onClick={() => navigate(n.id)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${view === n.id ? 'text-emerald-300 bg-emerald-500/10' : 'text-zinc-400'}`}><n.icon size={21} /><span className="text-[10px]">{n.label}</span></button>)}</nav>
    {selected && allowed && <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Publicação"><div className="max-w-2xl mx-auto"><button className="p-3 bg-[var(--surface-card)] rounded-full mb-3" aria-label="Fechar" onClick={() => setSelected(null)}><X /></button><Publication post={selected} admin={isAdmin} onDeleted={() => { setSelected(null); load(); }} /></div></div>}
    {modal === 'auth' && <AuthModal onClose={() => setModal('')} />}
    {modal === 'admin' && isAdmin && <AdminPanel onClose={() => setModal('')} onPostCreated={load} />}
    {modal === 'edit' && user && <EditProfileModal onClose={() => setModal('')} onProfileUpdated={() => setModal('')} />}
    <LanguageModal isOpen={modal === 'language'} onClose={() => setModal('')} />
    {modal === 'premium' && user && <SyncpayModal onClose={() => setModal('')} />}
  </div>;
}
export default function App() { return <LanguageProvider><AuthProvider><MainApp /></AuthProvider></LanguageProvider>; }
