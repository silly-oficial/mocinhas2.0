import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Sparkles,
  Music,
  UserPlus,
  UserCheck,
  ChevronUp,
  ChevronDown,
  Timer,
} from 'lucide-react';
import { Post } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';

interface ReelsViewerProps {
  reels: Post[];
  onOpenComments: (post: Post) => void;
  onNavigateUser: (username: string) => void;
  onPostDeleted?: (postId: string) => void;
}

export const ReelsViewer: React.FC<ReelsViewerProps> = ({
  reels,
  onOpenComments,
  onNavigateUser,
  onPostDeleted,
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likesState, setLikesState] = useState<{ [id: string]: { isLiked: boolean; count: number } }>({});
  const [savesState, setSavesState] = useState<{ [id: string]: boolean }>({});
  const [followsState, setFollowsState] = useState<{ [userId: string]: boolean }>({});
  const [heartBurst, setHeartBurst] = useState(false);

  //  1-Hour Ephemeral Countdown for Reels/Videos
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const hasExpiredTriggeredRef = useRef<{ [id: string]: boolean }>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [index: number]: HTMLVideoElement | null }>({});

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (!currentReel) return;

    const calculateTimeLeft = () => {
      const createdTime = new Date(currentReel.createdAt).getTime();
      const expiresTime = createdTime + 60 * 60 * 1000; // 1 Hour lifetime
      const now = Date.now();
      const diffMs = expiresTime - now;

      if (diffMs <= 0) {
        setTimeLeftStr('00:00');
        setIsExpired(true);
        setIsExpiringSoon(true);

        // Permanently delete video when countdown reaches 00:00!
        if (!hasExpiredTriggeredRef.current[currentReel.id]) {
          hasExpiredTriggeredRef.current[currentReel.id] = true;
          api.deletePost(currentReel.id).catch(() => {});
          if (onPostDeleted) {
            setTimeout(() => {
              onPostDeleted(currentReel.id);
            }, 800);
          }
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

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [currentReel?.id, currentReel?.createdAt, onPostDeleted]);

  useEffect(() => {
    // Initialize likes/saves state
    const initialLikes: typeof likesState = {};
    const initialSaves: typeof savesState = {};
    const initialFollows: typeof followsState = {};
    reels.forEach(r => {
      initialLikes[r.id] = { isLiked: r.isLiked || false, count: r.likesCount || 0 };
      initialSaves[r.id] = r.isSaved || false;
      if (r.user.isFollowing) initialFollows[r.user.id] = true;
    });
    setLikesState(initialLikes);
    setSavesState(initialSaves);
    setFollowsState(initialFollows);
  }, [reels]);

  // Pause non-active videos and play current
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(key => {
      const idx = Number(key);
      const vid = videoRefs.current[idx];
      if (vid) {
        if (idx === currentIndex) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') handleNext();
      if (e.key === 'ArrowUp') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length]);

  const handleToggleLike = async (reel: Post) => {
    const current = likesState[reel.id] || { isLiked: false, count: reel.likesCount };
    const newLiked = !current.isLiked;
    const newCount = newLiked ? current.count + 1 : Math.max(0, current.count - 1);

    setLikesState(prev => ({ ...prev, [reel.id]: { isLiked: newLiked, count: newCount } }));
    if (newLiked) {
      sounds.playHeartPop();
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    }

    try {
      const res = await api.toggleLikePost(reel.id);
      setLikesState(prev => ({ ...prev, [reel.id]: { isLiked: res.isLiked, count: res.likesCount } }));
    } catch (e) {
      setLikesState(prev => ({ ...prev, [reel.id]: current }));
    }
  };

  const handleToggleSave = async (reel: Post) => {
    const isSaved = savesState[reel.id] || false;
    const newSaved = !isSaved;
    setSavesState(prev => ({ ...prev, [reel.id]: newSaved }));
    if (newSaved) sounds.playSparkle();

    try {
      const res = await api.toggleSavePost(reel.id);
      setSavesState(prev => ({ ...prev, [reel.id]: res.isSaved }));
    } catch (e) {
      setSavesState(prev => ({ ...prev, [reel.id]: isSaved }));
    }
  };

  const handleToggleFollow = async (userId: string) => {
    const isFollowing = followsState[userId] || false;
    setFollowsState(prev => ({ ...prev, [userId]: !isFollowing }));
    sounds.playSparkle();

    try {
      if (isFollowing) {
        await api.unfollowUser(userId);
      } else {
        await api.followUser(userId);
      }
    } catch (e) {
      setFollowsState(prev => ({ ...prev, [userId]: isFollowing }));
    }
  };

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <span className="text-5xl mb-3 animate-bounce"></span>
        <h2 className="text-lg font-bold text-white dark:text-white">
          Nenhum vídeo no momento
        </h2>
        <p className="text-xs text-zinc-300 dark:text-zinc-300 mt-1 max-w-xs">
          Seja a primeira pessoa a postar um clipe ou Reel! 
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md mx-auto h-[82vh] sm:h-[720px] rounded-3xl overflow-hidden bg-black shadow-2xl flex items-center justify-center select-none"
    >
      {/* Video Playback */}
      {reels.map((reel, idx) => {
        const isCurrent = idx === currentIndex;
        const isNext = idx === currentIndex + 1; // smart preload
        const videoMedia = reel.media.find(m => m.type === 'video') || reel.media[0];

        return (
          <div
            key={reel.id}
            className={`absolute inset-0 transition-opacity duration-300 ${
              isCurrent ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {(isCurrent || isNext) && (
              <video
                ref={el => {
                  videoRefs.current[idx] = el;
                }}
                src={videoMedia?.url}
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
                onClick={() => handleToggleLike(reel)}
              />
            )}
          </div>
        );
      })}

      {/* Double Tap Heart Burst */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-28 h-28 text-white fill-red-500 filter drop-shadow-2xl animate-heart-burst" />
        </div>
      )}

      {/* Top Floating Controls & Live Countdown Timer */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Up/Down Navigation Floating Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 cursor-pointer shadow-sm transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === reels.length - 1}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 cursor-pointer shadow-sm transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/*  Countdown Badge (Identical to Publications) */}
        {currentReel && (
          <div
            title={`Este vídeo é efêmero e será excluído permanentemente em ${timeLeftStr}`}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-tight shadow-md backdrop-blur-md select-none border transition-all ${
              isExpired
                ? 'bg-red-950/80 text-red-300 border-red-500/40 animate-pulse'
                : isExpiringSoon
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-black/50 text-zinc-200 border-white/15'
            }`}
          >
            <Timer className={`w-3.5 h-3.5 ${isExpiringSoon ? 'text-amber-400 animate-spin' : 'text-zinc-400'}`} />
            <span>{isExpired ? 'Expirando...' : timeLeftStr}</span>
          </div>
        )}

        {/* Audio Mute Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 cursor-pointer shadow-sm transition-colors"
        >
          {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Reel Bottom Meta Overlay */}
      {currentReel && (
        <div className="absolute bottom-4 left-4 right-16 z-20 text-white drop-shadow-md">
          {/* Author info */}
          <div className="flex items-center gap-2.5 mb-2">
            <button
              onClick={() => onNavigateUser(currentReel.user.username)}
              className="cursor-pointer"
            >
              <img
                src={currentReel.user.avatar}
                alt={currentReel.user.displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
              />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onNavigateUser(currentReel.user.username)}
                  className="font-kawaii text-sm font-bold hover:underline truncate"
                >
                  {currentReel.user.displayName}
                </button>
                {currentReel.user.isVerified && (
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400 fill-[#FACC15] shrink-0" />
                )}
              </div>
              <span className="text-[11px] text-zinc-200 block truncate">
                @{currentReel.user.username}
              </span>
            </div>

            {/* Follow button */}
            {user?.id !== currentReel.user.id && (
              <button
                onClick={() => handleToggleFollow(currentReel.user.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  followsState[currentReel.user.id]
                    ? 'bg-white/30 text-white'
                    : 'bg-white text-black font-extrabold shadow-md hover:scale-105'
                }`}
              >
                {followsState[currentReel.user.id] ? 'Seguindo' : 'Seguir'}
              </button>
            )}
          </div>

          {/* Caption */}
          <p className="text-xs text-white/95 leading-relaxed font-sans line-clamp-2 mb-2">
            {currentReel.caption}
          </p>

          {/* Music Ticker */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-200 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full w-fit">
            <Music className="w-3 h-3 animate-spin" />
            <span className="truncate">Áudio Original • Acústico & Chill</span>
          </div>
        </div>
      )}

      {/* Right Side Floating Actions Bar */}
      {currentReel && (
        <div className="absolute right-3 bottom-6 z-20 flex flex-col items-center gap-4 text-white">
          {/* Like */}
          <button
            onClick={() => handleToggleLike(currentReel)}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform">
              <Heart
                className={`w-6 h-6 ${
                  likesState[currentReel.id]?.isLiked
                    ? 'text-white fill-red-500'
                    : 'text-white'
                }`}
              />
            </div>
            <span className="text-[11px] font-bold">
              {likesState[currentReel.id]?.count ?? currentReel.likesCount}
            </span>
          </button>

          {/* Comments */}
          <button
            onClick={() => onOpenComments(currentReel)}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-bold">{currentReel.commentsCount}</span>
          </button>

          {/* Save */}
          <button
            onClick={() => handleToggleSave(currentReel)}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform">
              <Bookmark
                className={`w-5 h-5 ${
                  savesState[currentReel.id] ? 'text-white fill-red-500' : 'text-white'
                }`}
              />
            </div>
          </button>

          {/* Share */}
          <button
            onClick={() => {
              sounds.playSparkle();
              navigator.clipboard.writeText(`${window.location.origin}/#reel-${currentReel.id}`);
              alert('Link do Reel copiado para a área de transferência!');
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform">
              <Share2 className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
