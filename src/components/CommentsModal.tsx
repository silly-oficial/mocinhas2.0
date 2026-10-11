import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, Trash2, CornerDownRight, Sparkles } from 'lucide-react';
import { Post, Comment } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AutoTranslatedText } from './AutoTranslatedText';
import { sounds } from '../utils/sound';

interface CommentsModalProps {
  post: Post;
  onClose: () => void;
  onNavigateUser: (username: string) => void;
  onCommentCountChange?: (postId: string, newCount: number) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  post,
  onClose,
  onNavigateUser,
  onCommentCountChange,
}) => {
  const { user, darkMode } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getComments(post.id);
      setComments(res.comments);
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.addComment(post.id, inputText.trim(), replyingTo?.id);
      sounds.playMessagePop();
      setInputText('');
      setReplyingTo(null);

      // Calculate new total comments count
      const newCount = res.commentsCount !== undefined ? res.commentsCount : (post.commentsCount || 0) + 1;
      if (onCommentCountChange) {
        onCommentCountChange(post.id, newCount);
      }
      window.dispatchEvent(new CustomEvent('mocinhas:comment-count-updated', {
        detail: { postId: post.id, commentsCount: newCount }
      }));

      // Reload comments to maintain nested order
      await loadComments();
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (e) {
      alert('Erro ao publicar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLikeComment = async (commentId: string) => {
    sounds.playHeartPop();
    try {
      const res = await api.toggleLikeComment(commentId);
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return { ...c, isLiked: res.isLiked, likesCount: res.likesCount };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId
                  ? { ...r, isLiked: res.isLiked, likesCount: res.likesCount }
                  : r
              ),
            };
          }
          return c;
        })
      );
    } catch (e) {}
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Deseja apagar este comentário?')) return;
    try {
      const res = await api.deleteComment(commentId);
      if (res.commentsCount !== undefined) {
        if (onCommentCountChange) {
          onCommentCountChange(post.id, res.commentsCount);
        }
        window.dispatchEvent(new CustomEvent('mocinhas:comment-count-updated', {
          detail: { postId: post.id, commentsCount: res.commentsCount }
        }));
      }
      loadComments();
    } catch (e) {
      alert('Erro ao apagar comentário');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const quickEmojis = ['', '', '', '', '', '', '', ''];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[85vh] h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-[28px] bg-[#12121B] text-white border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-bento-fade">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#12121B]">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-bold text-white">
              Comentários
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 font-bold">
              {comments.length}
            </span>
          </div>
          <button
            id="btn-comments-close"
            onClick={onClose}
            aria-label="Fechar comentários"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-7 h-7 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">
                Carregando comentários...
              </span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6">
              <p className="font-heading text-sm font-bold text-white">
                Nenhum comentário por aqui ainda
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Deixe a primeira mensagem nesta publicação!
              </p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="space-y-3">
                {/* Main Comment */}
                <div className="flex items-start gap-2.5 group">
                  <button
                    onClick={() => {
                      onNavigateUser(c.user.username);
                      onClose();
                    }}
                    className="cursor-pointer shrink-0"
                  >
                    <img
                      src={c.user.avatar}
                      alt={c.user.displayName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-white/15 bg-white/5"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="p-3 rounded-2xl bg-[#181824] border border-white/10 shadow-2xs">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <button
                          onClick={() => {
                            onNavigateUser(c.user.username);
                            onClose();
                          }}
                          className="font-heading text-xs font-bold text-white hover:underline text-left truncate"
                        >
                          {c.user.displayName}
                        </button>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          @{c.user.username}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-200 break-words leading-relaxed">
                        <AutoTranslatedText text={c.text} inline />
                      </div>
                    </div>

                    {/* Actions below comment */}
                    <div className="flex items-center gap-3 mt-1 px-1 text-[11px] text-stone-500 dark:text-zinc-400">
                      <button
                        onClick={() =>
                          setReplyingTo({ id: c.id, username: c.user.username })
                        }
                        className="font-semibold hover:text-white cursor-pointer"
                      >
                        {t('reply')}
                      </button>

                      {(user?.id === c.userId || user?.id === post.userId) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-stone-400 hover:text-red-500 cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Like button for comment */}
                  <button
                    onClick={() => handleToggleLikeComment(c.id)}
                    className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-white cursor-pointer pt-2 shrink-0"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        c.isLiked ? 'text-white fill-red-500' : ''
                      }`}
                    />
                    {c.likesCount > 0 && (
                      <span className="text-[9px] font-bold">{c.likesCount}</span>
                    )}
                  </button>
                </div>

                {/* Nested Replies */}
                {c.replies && c.replies.length > 0 && (
                  <div className="pl-8 space-y-2 border-l-2 border-white/10 dark:border-white/10 ml-4">
                    {c.replies.map(r => (
                      <div key={r.id} className="flex items-start gap-2 group">
                        <button
                          onClick={() => {
                            onNavigateUser(r.user.username);
                            onClose();
                          }}
                          className="cursor-pointer shrink-0"
                        >
                          <img
                            src={r.user.avatar}
                            alt={r.user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover border border-white/15 bg-white/5"
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="p-2.5 rounded-2xl bg-[#181824] border border-white/10">
                            <span className="font-heading text-[11px] font-bold text-white mr-1.5">
                              {r.user.displayName}
                            </span>
                            <div className="text-xs text-zinc-200 break-words mt-0.5">
                              <AutoTranslatedText text={r.text} inline />
                            </div>
                          </div>
                          {(user?.id === r.userId || user?.id === post.userId) && (
                            <button
                              onClick={() => handleDeleteComment(r.id)}
                              className="text-[10px] text-stone-400 hover:text-red-500 mt-0.5 px-1 cursor-pointer"
                            >
                              {t('delete')}
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleLikeComment(r.id)}
                          className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-white cursor-pointer pt-1 shrink-0"
                        >
                          <Heart
                            className={`w-3 h-3 ${
                              r.isLiked ? 'text-white fill-red-500' : ''
                            }`}
                          />
                          {r.likesCount > 0 && (
                            <span className="text-[8px] font-bold">{r.likesCount}</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Replying banner indicator */}
        {replyingTo && (
          <div className="px-4 py-1.5 bg-white/5 flex items-center justify-between text-xs text-zinc-200 border-t border-white/10">
            <div className="flex items-center gap-1">
              <CornerDownRight className="w-3.5 h-3.5 text-white" />
              <span>
                {t('replying_to')} <strong>@{replyingTo.username}</strong>
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-white hover:text-white font-bold cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* Emoji bar */}
        <div className="px-4 py-1.5 border-t border-white/10 dark:border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {quickEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-base hover:scale-125 transition-transform cursor-pointer p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleAddComment}
          className="p-3 bg-[#12121B] border-t border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              replyingTo
                ? `${t('reply')} @${replyingTo.username}...`
                : t('type_comment')
            }
            className="flex-1 bg-[#181824] text-xs text-white placeholder-zinc-500 px-4 py-2.5 rounded-full border border-white/15 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={isSubmitting || !inputText.trim()}
            className="w-10 h-10 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
