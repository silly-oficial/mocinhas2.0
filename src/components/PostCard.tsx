import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Sparkles,
  MapPin,
  Trash2,
  Flag,
  Copy,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Send,
  Timer,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { Post } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AutoTranslatedText } from './AutoTranslatedText';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  onOpenComments: (post: Post) => void;
  onNavigateUser: (username: string) => void;
  onNavigateHashtag: (tag: string) => void;
  onOpenReport: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onOpenDirectChat?: (userId: string) => void;
  onPostUpdated?: (updated: Partial<Post> & { id: string }) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenComments,
  onNavigateUser,
  onNavigateHashtag,
  onOpenReport,
  onPostDeleted,
  onOpenDirectChat,
  onPostUpdated,
}) => {
  const { user, darkMode } = useAuth();
  const { t } = useLanguage();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [showMenu, setShowMenu] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [quickComment, setQuickComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    setMediaLoaded(false);
    setMediaError(false);
  }, [currentMediaIndex, post.id]);

  // Sync state whenever props change
  useEffect(() => {
    setIsLiked(post.isLiked || false);
    setLikesCount(post.likesCount || 0);
    setIsSaved(post.isSaved || false);
    setCommentsCount(post.commentsCount || 0);
  }, [post.isLiked, post.likesCount, post.isSaved, post.commentsCount]);

  // Global listener for comments count changes across modals
  useEffect(() => {
    const handleCommentUpdate = (e: any) => {
      if (e.detail?.postId === post.id && typeof e.detail?.commentsCount === 'number') {
        setCommentsCount(e.detail.commentsCount);
      }
    };
    window.addEventListener('mocinhas:comment-count-updated', handleCommentUpdate);
    return () => window.removeEventListener('mocinhas:comment-count-updated', handleCommentUpdate);
  }, [post.id]);

  // ⏳ Ephemeral Countdown Timer (1-Hour default or custom duration)
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const hasExpiredTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(post.createdAt).getTime();
      const expiresTime = post.expiresAt
        ? new Date(post.expiresAt).getTime()
        : createdTime + 60 * 60 * 1000;
      const now = Date.now();
      const diffMs = expiresTime - now;

      if (diffMs <= 0) {
        setTimeLeftStr('00:00');
        setIsExpired(true);
        setIsExpiringSoon(true);

        // Permanently delete post when countdown finishes!
        if (!hasExpiredTriggeredRef.current) {
          hasExpiredTriggeredRef.current = true;
          api.deletePost(post.id).catch(() => {});
          if (onPostDeleted) {
            setTimeout(() => {
              onPostDeleted(post.id);
            }, 800);
          }
        }
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      setIsExpiringSoon(hours === 0 && mins < 15); // Amber badge for < 15 mins remaining

      if (hours > 0) {
        setTimeLeftStr(`${hours}h ${mins.toString().padStart(2, '0')}m`);
      } else if (mins > 0) {
        setTimeLeftStr(`${mins}m ${secs.toString().padStart(2, '0')}s`);
      } else {
        setTimeLeftStr(`${secs}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [post.createdAt, post.expiresAt, post.id, onPostDeleted]);

  const lastTapRef = useRef<number>(0);

  // Double Tap to Like
  const handleMediaDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!isLiked) {
        handleToggleLike();
      }
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleToggleLike = async () => {
    const newLiked = !isLiked;
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(newLiked);
    setLikesCount(newCount);

    if (newLiked) {
      sounds.playHeartPop();
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 800);
    }

    if (onPostUpdated) {
      onPostUpdated({ id: post.id, isLiked: newLiked, likesCount: newCount });
    }

    try {
      const res = await api.toggleLikePost(post.id);
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
      if (onPostUpdated) {
        onPostUpdated({ id: post.id, isLiked: res.isLiked, likesCount: res.likesCount });
      }
    } catch (err) {
      // Revert on error
      setIsLiked(!newLiked);
      const revertedCount = !newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
      setLikesCount(revertedCount);
      if (onPostUpdated) {
        onPostUpdated({ id: post.id, isLiked: !newLiked, likesCount: revertedCount });
      }
    }
  };

  const handleToggleSave = async () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    if (newSaved) {
      sounds.playSparkle();
      confetti({
        particleCount: 20,
        spread: 45,
        origin: { y: 0.8 },
        colors: ['#FFFFFF', '#38BDF8', '#818CF8'],
      });
    }

    if (onPostUpdated) {
      onPostUpdated({ id: post.id, isSaved: newSaved });
    }

    try {
      const res = await api.toggleSavePost(post.id);
      setIsSaved(res.isSaved);
      if (onPostUpdated) {
        onPostUpdated({ id: post.id, isSaved: res.isSaved });
      }
    } catch (e) {
      setIsSaved(!newSaved);
      if (onPostUpdated) {
        onPostUpdated({ id: post.id, isSaved: !newSaved });
      }
    }
  };

  const handleShare = () => {
    sounds.playSparkle();
    const shareUrl = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link da publicação copiado para a área de transferência!');
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente apagar esta publicação?')) return;
    try {
      await api.deletePost(post.id);
      sounds.playSparkle();
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (e: any) {
      alert(e.message || 'Erro ao apagar publicação');
    }
  };

  const handleQuickCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    const commentText = quickComment.trim();
    try {
      const res = await api.addComment(post.id, commentText);
      sounds.playMessagePop();
      setQuickComment('');
      const newCount = res.commentsCount !== undefined ? res.commentsCount : commentsCount + 1;
      setCommentsCount(newCount);
      if (onPostUpdated) {
        onPostUpdated({ id: post.id, commentsCount: newCount });
      }
      window.dispatchEvent(new CustomEvent('mocinhas:comment-count-updated', {
        detail: { postId: post.id, commentsCount: newCount }
      }));
    } catch (e) {
      alert('Erro ao enviar comentário');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Render clickable caption with hashtags and mentions
  const renderCaption = (text: string) => {
    const parts = text.split(/(\s+|#[a-zA-Z0-9_À-ÿ]+|@[a-zA-Z0-9_.]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.replace('#', '');
        return (
          <button
            key={index}
            onClick={() => onNavigateHashtag(tag)}
            className="text-white font-extrabold hover:underline cursor-pointer inline"
          >
            {part}
          </button>
        );
      }
      if (part.startsWith('@')) {
        const username = part.replace('@', '');
        return (
          <button
            key={index}
            onClick={() => onNavigateUser(username)}
            className="text-zinc-300 font-bold hover:underline cursor-pointer inline"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const currentMedia = (post.media && post.media.length > 0) ? (post.media[currentMediaIndex] || post.media[0]) : null;
  const isAuthor = Boolean(
    user &&
    (user.id === post.userId ||
     user.id === post.user?.id ||
     user.username?.toLowerCase() === post.user?.username?.toLowerCase() ||
     user.username?.toLowerCase() === 'clara_m')
  );

  return (
    <article
      id={`post-${post.id}`}
      className="w-full niuniu-card p-4 sm:p-5 mb-5 transition-all duration-300"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between mb-3.5 px-0.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateUser(post.user.username)}
            className="relative cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl p-0.5 bg-black border border-white/15 group-hover:border-white/30 transition-all shadow-md">
              <img
                src={post.user.avatar}
                alt={post.user.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-[14px] object-cover bg-zinc-800"
              />
            </div>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigateUser(post.user.username)}
                className="font-heading text-sm font-extrabold text-white hover:underline cursor-pointer text-left truncate"
              >
                {post.user.displayName}
              </button>
              {post.user.isVerified && (
                <span className="text-xs text-[#FACC15] shrink-0">✦</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>@{post.user.username}</span>
              {post.user.animeTitle && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-bold">
                  {post.user.animeTitle}
                </span>
              )}
            </div>
            {post.location && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
                <MapPin className="w-2.5 h-2.5" />
                <span>{post.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Options Menu & Actions & Live Countdown Timer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ⏳ Countdown Badge (Ephemeral Post) */}
          <div
            title={`Esta publicação é efêmera e será excluída em ${timeLeftStr}`}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-tight select-none border ${
              isExpired
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : isExpiringSoon
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-white/5 text-zinc-300 border-white/10'
            }`}
          >
            <Timer className={`w-3 h-3 ${isExpiringSoon ? 'text-amber-400 animate-spin' : 'text-zinc-400'}`} />
            <span>{isExpired ? 'Expirando...' : timeLeftStr}</span>
          </div>

          {!isAuthor && onOpenDirectChat && user && (
            <button
              onClick={() => onOpenDirectChat(post.userId)}
              title={`Enviar mensagem direta para @${post.user.username}`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          )}

          <div className="relative">
            <button
              id={`btn-post-menu-${post.id}`}
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Opções da publicação"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-9 z-20 w-44 py-1.5 rounded-2xl bg-[#171724] border border-white/15 shadow-2xl text-xs font-medium"
              >
                <button
                  onClick={() => {
                    handleShare();
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 flex items-center gap-2 text-zinc-200 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copiar Link</span>
                </button>

                {isAuthor ? (
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 text-red-400 hover:bg-red-500/10 text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Publicação</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onOpenReport(post.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 text-zinc-300 hover:bg-white/10 text-left cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Denunciar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Carousel / Single Image/Video */}
      <div
        className="relative w-full aspect-square sm:aspect-[4/3] rounded-[22px] bg-[#0E0E15] overflow-hidden select-none cursor-pointer flex items-center justify-center mb-3.5 border border-white/10"
        onClick={handleMediaDoubleTap}
      >
        {!currentMedia ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 bg-[#0E0E15]">
            <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-xs font-medium">Publicação em formato de texto</p>
          </div>
        ) : mediaError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 bg-[#0E0E15]">
            <ImageIcon className="w-10 h-10 mb-2 opacity-40 text-zinc-400" />
            <p className="text-xs font-medium">Não foi possível carregar a mídia</p>
          </div>
        ) : currentMedia.type === 'video' ? (
          <div className="relative w-full h-full">
            {!mediaLoaded && (
              <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center z-10">
                <Sparkles className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            )}
            <video
              src={currentMedia.url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onLoadedData={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                mediaLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 cursor-pointer z-10"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        ) : currentMedia.type === 'audio' ? (
          <div className="w-full h-full p-6 bg-white/5 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/5 animate-pulse">
              <Volume2 className="w-8 h-8" />
            </div>
            <div>
              <p className="font-heading text-sm font-extrabold text-white">
                {currentMedia.fileName || 'Mensagem de Áudio / Voz 🎙️'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Reproduzir mensagem de voz</p>
            </div>
            <audio
              controls
              src={currentMedia.url}
              className="w-full max-w-xs mt-2"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ) : currentMedia.type === 'pdf' ? (
          <div className="w-full h-full p-6 bg-white/5 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/5">
              <span className="font-heading text-sm font-black uppercase tracking-wider">PDF</span>
            </div>
            <div>
              <p className="font-heading text-sm font-extrabold text-white truncate max-w-xs">
                {currentMedia.fileName || 'Documento PDF Anexado'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Arquivo do Dispositivo</p>
            </div>
            <a
              href={currentMedia.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-black shadow-md hover:bg-neutral-200 transition-all"
            >
              Abrir / Baixar Documento
            </a>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {!mediaLoaded && (
              <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center z-10">
                <Sparkles className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            )}
            <img
              src={currentMedia.url}
              alt={post.caption || 'Publicação'}
              referrerPolicy="no-referrer"
              onLoad={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 hover:scale-[1.01] ${
                mediaLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        )}

        {/* Big Heart Burst on Double Tap */}
        {heartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <Heart className="w-24 h-24 text-red-500 fill-red-500 filter drop-shadow-2xl animate-heart-burst" />
          </div>
        )}

        {/* Carousel Navigation Arrows */}
        {post.media.length > 1 && (
          <>
            {currentMediaIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentMediaIndex(prev => prev - 1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center shadow-md hover:scale-110 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {currentMediaIndex < post.media.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentMediaIndex(prev => prev + 1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center shadow-md hover:scale-110 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Dots indicator */}
            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
              {post.media.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentMediaIndex
                      ? 'w-4 bg-white'
                      : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons Bar */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Like */}
            <button
              id={`btn-post-like-${post.id}`}
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-black transition-all cursor-pointer ${
                isLiked
                  ? 'bg-[#FF2A6D] text-white border-[#FF2A6D] shadow-md shadow-[#FF2A6D]/20 scale-105'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  isLiked ? 'fill-white text-white' : ''
                }`}
              />
              <span>{likesCount}</span>
            </button>

            {/* Comment */}
            <button
              id={`btn-post-comment-${post.id}`}
              onClick={() => onOpenComments(post)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-black transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentsCount}</span>
            </button>

            {/* Direct Message (DM Share) */}
            {user && onOpenDirectChat && (
              <button
                onClick={() => onOpenDirectChat(post.userId)}
                title="Conversar no Direct"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Share link */}
            <button
              id={`btn-post-share-${post.id}`}
              onClick={handleShare}
              title="Compartilhar link"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bookmark / Save */}
          <button
            id={`btn-post-save-${post.id}`}
            onClick={handleToggleSave}
            title={isSaved ? 'Salvo nos favoritos' : 'Salvar publicação'}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              isSaved
                ? 'bg-white text-black border-white'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                isSaved ? 'fill-black text-black' : ''
              }`}
            />
          </button>
        </div>

        {/* Caption with Automatic Translation */}
        {post.caption && (
          <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans mb-2">
            <span
              onClick={() => onNavigateUser(post.user.username)}
              className="font-heading font-extrabold text-white hover:underline cursor-pointer mr-1.5"
            >
              {post.user.username}
            </span>
            <AutoTranslatedText
              text={post.caption}
              inline
              renderTransformed={renderCaption}
            />
          </div>
        )}

        {/* Comments CTA */}
        {commentsCount > 0 ? (
          <button
            onClick={() => onOpenComments(post)}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer block mb-2"
          >
            {t('view_all_comments').replace('{count}', commentsCount.toString())}
          </button>
        ) : (
          <p className="text-[11px] text-zinc-500 mb-2">
            {t('first_comment_cta')}
          </p>
        )}

        {/* Inline Quick Comment Input */}
        {post.allowComments && user && (
          <form onSubmit={handleQuickCommentSubmit} className="flex items-center gap-2 pt-2.5 border-t border-white/10">
            <input
              type="text"
              value={quickComment}
              onChange={e => setQuickComment(e.target.value)}
              placeholder="Adicionar um comentário..."
              className="flex-1 bg-white/5 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 border border-white/10"
            />
            {quickComment.trim() && (
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-extrabold hover:bg-neutral-200 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSubmittingComment ? '...' : 'Publicar'}
              </button>
            )}
          </form>
        )}
      </div>
    </article>
  );
};
