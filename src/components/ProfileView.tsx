import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Grid,
  Film,
  Bookmark,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Lock,
  Globe,
  Edit3,
  Share2,
  Timer,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { User, Post } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { sounds } from '../utils/sound';
import { getMatchingCoverForAvatar } from '../utils/avatars';
import { SyncpayModal } from './SyncpayModal';

interface ProfileViewProps {
  username: string;
  onOpenEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenFollowers: (user: User) => void;
  onOpenFollowing: (user: User) => void;
  onSelectPost: (post: Post) => void;
  onStartChat: (userId: string) => void;
  onOpenAuth?: (initialMode?: 'login' | 'register') => void;
  onPostDeleted?: (postId: string) => void;
  onOpenAdminPanel?: () => void;
}

// ⏳ Live Countdown Badge for Ephemeral Content (1-Hour Lifetime)
const LiveCountdownBadge: React.FC<{ createdAt: string; onExpire?: () => void }> = ({ createdAt, onExpire }) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const expiredHandledRef = useRef<boolean>(false);

  useEffect(() => {
    const calc = () => {
      const createdTime = new Date(createdAt).getTime();
      const expiresTime = createdTime + 60 * 60 * 1000;
      const diffMs = expiresTime - Date.now();

      if (diffMs <= 0) {
        setTimeLeftStr('00:00');
        setIsExpired(true);
        setIsExpiringSoon(true);
        if (!expiredHandledRef.current) {
          expiredHandledRef.current = true;
          onExpire?.();
        }
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;

      setIsExpiringSoon(mins < 5);
      setIsExpired(false);

      if (mins > 0) {
        setTimeLeftStr(`${mins}m ${secs.toString().padStart(2, '0')}s`);
      } else {
        setTimeLeftStr(`${secs}s`);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  return (
    <div
      title={`Este conteúdo é efêmero e será excluído permanentemente em ${timeLeftStr}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-tight shadow-md backdrop-blur-md select-none border transition-all ${
        isExpired
          ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
          : isExpiringSoon
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
          : 'bg-black/80 text-zinc-300 border-white/10'
      }`}
    >
      <Timer className={`w-3 h-3 ${isExpiringSoon ? 'text-amber-400 animate-spin' : 'text-zinc-400'}`} />
      <span>{isExpired ? 'Expirando...' : timeLeftStr}</span>
    </div>
  );
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  onOpenEditProfile,
  onOpenSettings,
  onOpenFollowers,
  onOpenFollowing,
  onSelectPost,
  onStartChat,
  onOpenAuth,
  onPostDeleted,
  onOpenAdminPanel,
}) => {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isSyncpayOpen, setIsSyncpayOpen] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (!username || username.trim() === '') {
      setProfileUser(null);
      setIsLoading(false);
      return;
    }
    loadProfile();
  }, [username, currentUser?.id]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUserProfile(username);
      setProfileUser(res.user);
      setPosts(res.posts);
      setIsFollowing(res.user.isFollowing || false);
      setIsRequested(res.user.isRequested || false);
      setFollowersCount(res.user.followersCount);

      if (isOwnProfile) {
        try {
          const savedRes = await api.getSavedPosts();
          setSavedPosts(savedRes.posts);
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
      setProfileUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostExpired = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setSavedPosts(prev => prev.filter(p => p.id !== postId));
    if (onPostDeleted) onPostDeleted(postId);
  };

  const handleToggleFollow = async () => {
    if (!profileUser) return;
    if (!currentUser) {
      onOpenAuth?.('login');
      return;
    }

    const nextFollowState = !isFollowing;
    setIsFollowing(nextFollowState);
    setFollowersCount(prev => (nextFollowState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextFollowState) {
      sounds.playPop();
    }

    try {
      const res = await api.followUser(profileUser.id);
      setIsFollowing(res.status === 'accepted');
      setIsRequested(res.isRequested || false);
      if (res.user?.followersCount !== undefined) {
        setFollowersCount(res.user.followersCount);
      }
    } catch (e) {
      // Revert on error
      setIsFollowing(!nextFollowState);
      setFollowersCount(prev => (!nextFollowState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleShareProfile = () => {
    sounds.playSparkle();
    const shareUrl = `${window.location.origin}/#u-${profileUser?.username}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link do perfil copiado para a área de transferência!');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">
          Carregando perfil...
        </span>
      </div>
    );
  }

  if ((!currentUser && (!username || username.trim() === '')) || (!currentUser && !profileUser)) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 animate-bento-fade">
        <div className="niuniu-card p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-bold mb-5 shadow-xs">
            <span className="text-emerald-400">✦</span>
            <span>Rede Social Exclusiva</span>
          </div>

          {/* Avatar Circle */}
          <div className="relative mx-auto w-24 h-24 mb-5">
            <div className="relative w-full h-full rounded-2xl p-1 bg-black border border-white/15 flex items-center justify-center overflow-hidden shadow-xl">
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=kawaii-princess&backgroundColor=161622"
                alt="Criar Conta"
                className="w-full h-full rounded-xl object-cover"
              />
            </div>
          </div>

          {/* Heading and Lead */}
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-white mb-2.5">
            Crie o seu perfil no mocinhas
          </h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed mb-6">
            Tenha seu próprio espaço para compartilhar fotos, reels, interagir no feed e fazer amizades com outras criadoras incríveis.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                sounds.playSparkle();
                onOpenAuth?.('register');
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white text-black text-sm font-black shadow-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Criar Minha Conta Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                onOpenAuth?.('login');
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/15 text-sm font-bold transition-all cursor-pointer"
            >
              Já tenho conta • Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-16">
        <h2 className="font-heading text-base font-extrabold text-white">
          Perfil não encontrado
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Este usuário não está disponível.</p>
      </div>
    );
  }

  const reelsList = posts.filter(p => p.media.some(m => m.type === 'video'));

  return (
    <div className="space-y-4 pb-20 max-w-3xl mx-auto animate-bento-fade">
      {/* Bento Grid Profile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Banner & Bio Card (Spans 2 columns on desktop) */}
        <div className="md:col-span-2 niuniu-card overflow-hidden flex flex-col justify-between">
          {/* Banner Cover */}
          <div className="relative h-32 sm:h-36 w-full bg-[#181824] overflow-hidden">
            <img
              src={profileUser.banner || getMatchingCoverForAvatar(profileUser.avatar).cover}
              alt="Banner"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleShareProfile}
              title="Compartilhar Perfil"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 cursor-pointer shadow-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Info Section */}
          <div className="px-5 pb-5 pt-2 relative flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-3">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-1 bg-black border border-white/15 shadow-xl">
                  <img
                    src={profileUser.avatar}
                    alt={profileUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-xl object-cover bg-zinc-800"
                  />
                </div>

                {/* Actions Buttons */}
                <div className="flex items-center gap-2">
                  {isOwnProfile ? (
                    <>
                      {(currentUser?.isAdmin || currentUser?.email?.toLowerCase() === 'papaidasia@gmail.com' || currentUser?.username?.toLowerCase() === 'papaidasia' || currentUser?.email?.toLowerCase() === 'admin@mocinhas.com' || currentUser?.username?.toLowerCase() === 'admin') && onOpenAdminPanel && (
                        <button
                          id="btn-profile-admin-panel"
                          onClick={onOpenAdminPanel}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-extrabold cursor-pointer transition-all"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Admin 👑</span>
                        </button>
                      )}
                      <button
                        id="btn-profile-edit"
                        onClick={onOpenEditProfile}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer transition-all border border-white/10"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Editar</span>
                      </button>
                      <button
                        id="btn-profile-settings"
                        onClick={onOpenSettings}
                        aria-label="Configurações"
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer border border-white/10 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id="btn-profile-follow"
                        onClick={handleToggleFollow}
                        className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-black shadow-sm transition-all cursor-pointer ${
                          isFollowing
                            ? 'bg-white/10 text-white border border-white/15'
                            : isRequested
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white text-black hover:bg-neutral-200'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Seguindo</span>
                          </>
                        ) : isRequested ? (
                          <span>Solicitado</span>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Seguir</span>
                          </>
                        )}
                      </button>

                      <button
                        id="btn-profile-message"
                        onClick={() => onStartChat(profileUser.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer border border-white/10 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Mensagem</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Names */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-lg font-extrabold text-white">
                    {profileUser.displayName}
                  </h1>
                  {profileUser.isVerified && (
                    <span className="text-xs text-[#FACC15]">✦</span>
                  )}
                  {profileUser.isPremium && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30" title="Usuário VIP">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>VIP</span>
                    </span>
                  )}
                  {profileUser.isPrivate && (
                    <span className="p-1 rounded-full bg-white/10 text-zinc-400">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="text-xs text-zinc-400 font-medium">
                  @{profileUser.username}
                </div>

                {/* Bio */}
                {profileUser.bio && (
                  <p className="text-xs text-zinc-300 leading-relaxed pt-1.5 whitespace-pre-line font-sans">
                    {profileUser.bio}
                  </p>
                )}

                {/* Website Link */}
                {profileUser.website && (
                  <a
                    href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline pt-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{profileUser.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bento Stats Widget Card (1 column on desktop) */}
        <div className="niuniu-card p-5 flex flex-col justify-between">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3">
            Estatísticas
          </h3>

          <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5 text-center md:text-left">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="font-heading text-lg font-black text-white block">
                {profileUser.postsCount}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Publicações</span>
            </div>

            <button
              onClick={() => onOpenFollowers(profileUser)}
              className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center md:text-left cursor-pointer hover:bg-white/10 transition-colors"
            >
              <span className="font-heading text-lg font-black text-white block">
                {followersCount}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Seguidores</span>
            </button>

            <button
              onClick={() => onOpenFollowing(profileUser)}
              className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center md:text-left cursor-pointer hover:bg-white/10 transition-colors"
            >
              <span className="font-heading text-lg font-black text-white block">
                {profileUser.followingCount}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Seguindo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs (Segmented Pill Control) */}
      <div className="flex items-center justify-around bg-[#13131D] p-1.5 rounded-full border border-white/10">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-white text-black shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Publicações</span>
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'reels'
              ? 'bg-white text-black shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Vídeos ({reelsList.length})</span>
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Salvos</span>
          </button>
        )}
      </div>

      {/* Bento Media Grid */}
      {activeTab === 'posts' && (() => {
        const requiresPremium = !isOwnProfile && !currentUser?.isPremium && !currentUser?.isAdmin;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {posts.map((post, idx) => {
              const firstMedia = post.media[0];
              const isVideo = firstMedia?.type === 'video';
              const isLocked = requiresPremium && idx >= 5;

              return (
                <div
                  key={post.id}
                  onClick={() => {
                    if (isLocked) {
                      sounds.playSparkle();
                      setIsSyncpayOpen(true);
                    } else {
                      onSelectPost(post);
                    }
                  }}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="aspect-square rounded-[22px] overflow-hidden bg-black cursor-pointer hover:scale-[1.02] transition-all relative group shadow-md border border-white/10 animate-bento-fade"
                >
                  {isVideo ? (
                    <div className="w-full h-full relative">
                      <video
                        src={firstMedia?.url}
                        poster={firstMedia?.thumbnail}
                        muted
                        playsInline
                        preload="metadata"
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isLocked ? 'blur-md brightness-50 scale-105' : 'group-hover:scale-105'
                        }`}
                      />
                      <div className="absolute top-2 right-2 text-white p-1 rounded-lg bg-black/60 backdrop-blur-sm pointer-events-none shadow-xs">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={firstMedia?.thumbnail || firstMedia?.url}
                      alt={post.caption}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isLocked ? 'blur-md brightness-50 scale-105' : 'group-hover:scale-105'
                      }`}
                    />
                  )}

                  {/* 🔒 LOCKED PREMIUM OVERLAY */}
                  {isLocked ? (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center gap-1.5 z-20">
                      <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-black tracking-tight">
                        🔒 VIP Premium
                      </span>
                      <span className="text-[10px] text-zinc-300 font-medium">
                        Clique para desbloquear
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* ⏳ Ephemeral Live Countdown Badge */}
                      <div className="absolute bottom-2 left-2 z-10">
                        <LiveCountdownBadge createdAt={post.createdAt} onExpire={() => handlePostExpired(post.id)} />
                      </div>

                      {/* Hover Overlay with Stats */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 fill-white" />
                          <span>{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>{post.commentsCount}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* 🔒 Paywall Banner Card for Non-Premium Users */}
            {requiresPremium && posts.length > 5 && (
              <div className="col-span-2 sm:col-span-3 p-6 sm:p-8 rounded-[28px] pod-orange shadow-2xl text-center space-y-4 my-2 relative overflow-hidden animate-fadeIn">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
                  <Crown className="w-8 h-8 text-amber-400" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                    <span>Acesso Ilimitado a Todas as Publicações</span>
                    <Lock className="w-4 h-4 text-white" />
                  </h3>
                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                    Assine o VIP Premium para assistir e ver todas as publicações exclusivas e apoiar a plataforma.
                  </p>
                </div>

                <button
                  onClick={() => {
                    sounds.playSparkle();
                    setIsSyncpayOpen(true);
                  }}
                  className="px-7 py-3.5 rounded-full bg-white text-black text-xs font-black shadow-xl flex items-center justify-center gap-2 mx-auto cursor-pointer hover:bg-neutral-200 transition-transform hover:scale-105"
                >
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Assinar Premium R$ 9,99 (Syncpay)</span>
                </button>
              </div>
            )}

            {posts.length === 0 && (
              <div className="col-span-2 sm:col-span-3 text-center py-12 text-zinc-500 text-xs font-medium">
                Nenhuma publicação ainda.
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'reels' && (() => {
        const requiresPremium = !isOwnProfile && !currentUser?.isPremium && !currentUser?.isAdmin;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {reelsList.map((post, idx) => {
              const firstMedia = post.media[0];
              const isLocked = requiresPremium && idx >= 5;

              return (
                <div
                  key={post.id}
                  onClick={() => {
                    if (isLocked) {
                      sounds.playSparkle();
                      setIsSyncpayOpen(true);
                    } else {
                      onSelectPost(post);
                    }
                  }}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="aspect-[9/16] rounded-[22px] overflow-hidden bg-black cursor-pointer hover:scale-[1.02] transition-all relative group shadow-md border border-white/10 animate-bento-fade"
                >
                  <video
                    src={firstMedia?.url}
                    poster={firstMedia?.thumbnail}
                    muted
                    playsInline
                    preload="metadata"
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isLocked ? 'blur-md brightness-50 scale-105' : 'group-hover:scale-105'
                    }`}
                  />
                  <div className="absolute top-2 right-2 text-white p-1 rounded-lg bg-black/40 backdrop-blur-sm pointer-events-none">
                    <Film className="w-3.5 h-3.5" />
                  </div>

                  {isLocked ? (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center gap-1.5 z-20">
                      <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-black tracking-tight">
                        🔒 Vídeo VIP
                      </span>
                      <span className="text-[10px] text-zinc-300 font-medium">
                        Clique para assistir
                      </span>
                    </div>
                  ) : (
                    <div className="absolute bottom-2 left-2 z-10">
                      <LiveCountdownBadge createdAt={post.createdAt} onExpire={() => handlePostExpired(post.id)} />
                    </div>
                  )}
                </div>
              );
            })}
            {reelsList.length === 0 && (
              <div className="col-span-2 sm:col-span-3 text-center py-12 text-zinc-500 text-xs font-medium">
                Nenhum vídeo ainda.
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'saved' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {savedPosts.map((post, idx) => {
            const firstMedia = post.media[0];
            const isVideo = firstMedia?.type === 'video';
            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="aspect-square rounded-[22px] overflow-hidden bg-black cursor-pointer hover:scale-[1.02] transition-all relative group shadow-md border border-white/10 animate-bento-fade"
              >
                {isVideo ? (
                  <div className="w-full h-full relative">
                    <video
                      src={firstMedia?.url}
                      poster={firstMedia?.thumbnail}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 text-white p-1 rounded-lg bg-black/50 backdrop-blur-sm pointer-events-none shadow-xs">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={firstMedia?.thumbnail || firstMedia?.url}
                    alt={post.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute bottom-2 left-2 z-10">
                  <LiveCountdownBadge createdAt={post.createdAt} onExpire={() => handlePostExpired(post.id)} />
                </div>
              </div>
            );
          })}
          {savedPosts.length === 0 && (
            <div className="col-span-2 sm:col-span-3 text-center py-12 text-zinc-500 text-xs font-medium">
              Nenhum item salvo nos favoritos.
            </div>
          )}
        </div>
      )}

      {/* Syncpay Modal */}
      {isSyncpayOpen && (
        <SyncpayModal
          onClose={() => setIsSyncpayOpen(false)}
          onSuccess={() => {
            setIsSyncpayOpen(false);
            loadProfile();
          }}
        />
      )}
    </div>
  );
};
