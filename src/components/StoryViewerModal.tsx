import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, Trash2, MapPin, Eye } from 'lucide-react';
import { StoryGroup, Story } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';

interface StoryViewerModalProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryDeleted: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  storyGroups,
  initialGroupIndex,
  onClose,
  onStoryDeleted,
}) => {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);

  const currentGroup = storyGroups[groupIndex];
  const currentStory: Story | undefined = currentGroup?.stories[storyIndex];
  const isMyStory = user && currentGroup && user.id === currentGroup.user.id;

  const timerRef = useRef<number | null>(null);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && user) {
      api.viewStory(currentStory.id).catch(() => {});
    }
    setProgress(0);
  }, [currentStory?.id, user]);

  // Story progress timer (5 seconds)
  useEffect(() => {
    if (isPaused || !currentStory) return;

    const interval = 50; // update every 50ms
    const step = (interval / 5000) * 100;

    timerRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [groupIndex, storyIndex, isPaused, currentStory]);

  const handleNextStory = () => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex(prev => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!currentStory) return;
    sounds.playHeartPop();
    setReactionBurst(emoji);
    setTimeout(() => setReactionBurst(null), 1000);

    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.85 },
      colors: ['#FFFFFF', '#38BDF8', '#818CF8', '#34D399'],
    });

    try {
      await api.reactToStory(currentStory.id, emoji);
    } catch (e) {}
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory || !user) return;
    setIsSendingReply(true);
    try {
      // Start or get conversation and send message
      const convRes = await api.startConversation(currentStory.userId);
      await api.sendMessage(convRes.conversation.id, {
        text: `Respondeu ao seu Story: "${replyText.trim()}"`,
        mediaUrl: currentStory.mediaUrl,
        mediaType: currentStory.mediaType,
      });
      sounds.playMessagePop();
      setReplyText('');
      alert('Resposta enviada com sucesso no chat!');
    } catch (e) {
      alert('Erro ao enviar resposta');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteCurrentStory = async () => {
    if (!currentStory || !confirm('Deseja realmente apagar este Story?')) return;
    try {
      await api.deleteStory(currentStory.id);
      onStoryDeleted(currentStory.id);
      handleNextStory();
    } catch (e) {
      alert('Erro ao apagar story');
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full h-full max-w-md bg-[#0B0B12] sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
        {/* Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {currentGroup.stories.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-white to-zinc-200 rounded-full transition-all duration-75"
                style={{
                  width:
                    idx < storyIndex
                      ? '100%'
                      : idx === storyIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <img
              src={currentGroup.user.avatar}
              alt={currentGroup.user.displayName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-white/20"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white text-xs font-bold font-kawaii">
                  {currentGroup.user.displayName}
                </span>
                <span className="text-zinc-300/80 text-[10px]">
                  @{currentGroup.user.username}
                </span>
              </div>
              {currentStory.location && (
                <div className="flex items-center gap-0.5 text-[9px] text-zinc-200/90">
                  <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{currentStory.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMyStory && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-zinc-200 text-xs border border-white/10">
                <Eye className="w-3.5 h-3.5" />
                <span>{currentStory.viewsCount || 0}</span>
                <button
                  id="btn-story-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCurrentStory();
                  }}
                  className="ml-1 text-red-300 hover:text-red-400"
                  title="Apagar Story"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              id="btn-story-close"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {currentStory.mediaType === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          )}

          {/* Text Overlay & Stickers */}
          {currentStory.textOverlay && (
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white text-center font-kawaii shadow-lg">
              <p className="text-sm font-medium leading-relaxed">{currentStory.textOverlay}</p>
            </div>
          )}

          {currentStory.stickers && currentStory.stickers.length > 0 && (
            <div className="absolute bottom-28 left-6 right-6 flex justify-center gap-3">
              {currentStory.stickers.map((stk, i) => (
                <span key={i} className="text-3xl filter drop-shadow-md animate-bounce">
                  {stk}
                </span>
              ))}
            </div>
          )}

          {/* Reaction Burst Effect */}
          {reactionBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <span className="text-7xl animate-heart-burst drop-shadow-2xl">
                {reactionBurst}
              </span>
            </div>
          )}

          {/* Left / Right Tap Zones */}
          <div
            className="absolute top-20 bottom-24 left-0 w-1/3 z-20 cursor-pointer"
            onClick={handlePrevStory}
          />
          <div
            className="absolute top-20 bottom-24 right-0 w-2/3 z-20 cursor-pointer"
            onClick={handleNextStory}
          />
        </div>

        {/* Bottom Reactions & Reply Bar */}
        <div
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          className="absolute bottom-3 left-3 right-3 z-30 flex flex-col gap-2"
        >
          {/* Reaction Buttons */}
          <div className="flex items-center justify-center gap-3 bg-black/40 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/10">
            {['❤️', '🔥', '👏', '😍', '✨', '🙌'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReact(emoji);
                }}
                className="text-xl hover:scale-125 active:scale-95 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply DM Input */}
          {!isMyStory && user && (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Responder a @${currentGroup.user.username}...`}
                className="flex-1 bg-white/10 backdrop-blur-md text-white placeholder-zinc-400 text-xs px-4 py-2.5 rounded-full border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
