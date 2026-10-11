import React, { useState } from 'react';
import { Heart, UserPlus, Check, TrendingUp, Edit3, LogIn, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sounds } from '../utils/sound';

interface RightSidebarProps {
  onNavigateUser: (username: string) => void;
  onNavigateHashtag: (tag: string) => void;
  onOpenEditProfile: () => void;
  onOpenAuth: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  onNavigateUser,
  onNavigateHashtag,
  onOpenEditProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  // Curated Suggested Creators
  const [suggestions, setSuggestions] = useState([
    {
      id: 'u_sakura',
      username: 'sakura_chan',
      displayName: 'Sakura Haruka',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sakura&backgroundColor=ffd5dc,ffdfba,fce4ec&mouth=variant01,variant02,variant03',
      reason: 'Criadora em #design',
      isFollowing: false,
      followersCount: 1420,
    },
    {
      id: 'u_luna',
      username: 'luna_neko',
      displayName: 'Luna Mendes',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc,d1d4f9,fce4ec&mouth=variant02,variant04',
      reason: 'Fotografia & Estilo',
      isFollowing: false,
      followersCount: 980,
    },
    {
      id: 'u_miku',
      username: 'miku_melody',
      displayName: 'Miku Melody',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Miku&backgroundColor=d1d4f9,c0aede,ffd5dc&mouth=variant01,variant03',
      reason: 'Música & Lo-Fi',
      isFollowing: false,
      followersCount: 3100,
    },
  ]);

  const handleToggleFollow = async (creator: typeof suggestions[0]) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const newFollowingState = !creator.isFollowing;
    setSuggestions(prev =>
      prev.map(s =>
        s.id === creator.id ? { ...s, isFollowing: newFollowingState } : s
      )
    );

    if (newFollowingState) {
      sounds.playPop();
    }

    try {
      await api.followUser(creator.id);
    } catch (e) {
      setSuggestions(prev =>
        prev.map(s =>
          s.id === creator.id ? { ...s, isFollowing: !newFollowingState } : s
        )
      );
    }
  };

  // Trending categories styled like the vibrant category pods from Image 3
  const categoryPods = [
    { tag: 'design', label: 'Design & Criatividade', count: '14.2k', podClass: 'pod-emerald', emoji: '🎨' },
    { tag: 'estilo', label: 'Estilo & Tendências', count: '8.9k', podClass: 'pod-orange', emoji: '✨' },
    { tag: 'fotografia', label: 'Fotografia & Momentos', count: '6.4k', podClass: 'pod-purple', emoji: '📸' },
    { tag: 'musica', label: 'Música & Vibes', count: '5.1k', podClass: 'pod-cyan', emoji: '🎧' },
  ];

  return (
    <aside className="w-80 xl:w-88 hidden xl:flex flex-col gap-4 shrink-0 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar py-2">
      {/* Profile Card */}
      {user ? (
        <div className="niuniu-card p-5">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-white/20 bg-zinc-800"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#12121B] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-heading text-sm font-extrabold text-white truncate">
                  {user.displayName}
                </h4>
                {user.isVerified && (
                  <span className="text-xs text-[#FACC15]">✦</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">@{user.username}</p>
              <button
                id="btn-right-sidebar-edit-profile"
                onClick={onOpenEditProfile}
                className="mt-1 text-[11px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar Perfil</span>
              </button>
            </div>
          </div>

          {/* 3-Col Stats */}
          <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
            <div>
              <div className="text-sm font-black text-white font-heading">
                {user.postsCount || 0}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">Posts</div>
            </div>
            <div className="border-x border-white/10">
              <div className="text-sm font-black text-white font-heading">
                {user.followersCount || 0}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">Seguidoras</div>
            </div>
            <div>
              <div className="text-sm font-black text-white font-heading">
                {user.followingCount || 0}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">Seguindo</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="niuniu-card p-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white text-black flex items-center justify-center mb-3 shadow-lg">
            <Heart className="w-6 h-6 fill-black" />
          </div>
          <h4 className="font-heading text-sm font-extrabold text-white mb-1">
            Faça parte da mocinhas
          </h4>
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            Conecte-se com criadoras, converse via DMs e descubra conteúdos exclusivos!
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-3 px-4 bg-white text-black text-xs font-black rounded-full shadow-lg hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Criar Conta Gratuita</span>
          </button>
        </div>
      )}

      {/* Categorias & Tendências Pods (Inspired by Image 1 & Image 3) */}
      <div className="niuniu-card p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="font-heading text-xs font-black uppercase tracking-wider text-white">
              Categorias em Alta
            </h4>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {categoryPods.map(cat => (
            <button
              key={cat.tag}
              onClick={() => onNavigateHashtag(cat.tag)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer text-left shadow-sm ${cat.podClass}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{cat.emoji}</span>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-white truncate block">
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-white/80 font-medium block">
                    #{cat.tag} · {cat.count} posts
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Sugestões para Você */}
      <div className="niuniu-card p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h4 className="font-heading text-xs font-black uppercase tracking-wider text-white">
            Sugestões para Você
          </h4>
        </div>

        <div className="flex flex-col gap-2.5">
          {suggestions.map(creator => (
            <div
              key={creator.id}
              className="flex items-center justify-between gap-2 p-1.5 rounded-2xl hover:bg-white/5 transition-colors"
            >
              <div
                onClick={() => onNavigateUser(creator.username)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
              >
                <img
                  src={creator.avatar}
                  alt={creator.displayName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0 bg-zinc-800"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white truncate block">
                    {creator.displayName}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate block">
                    {creator.reason}
                  </span>
                </div>
              </div>

              <button
                id={`btn-follow-sug-${creator.id}`}
                onClick={() => handleToggleFollow(creator)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shrink-0 ${
                  creator.isFollowing
                    ? 'bg-white/10 text-zinc-300 hover:bg-white/20'
                    : 'bg-white text-black hover:bg-neutral-200 active:scale-95 shadow-xs'
                }`}
              >
                {creator.isFollowing ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" /> Seguindo
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> Seguir
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 text-[10px] text-zinc-500 flex flex-wrap gap-x-2 gap-y-1">
        <span>mocinhas © 2026</span>
        <span>•</span>
        <span>Privacidade</span>
        <span>•</span>
        <span>Termos</span>
        <span>•</span>
        <span>Social Jrny</span>
      </div>
    </aside>
  );
};
