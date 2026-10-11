import React, { useState, useEffect } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Sparkles,
  Check,
  X,
  CheckCheck,
} from 'lucide-react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';

interface NotificationsViewProps {
  onNavigateUser: (username: string) => void;
  onNavigatePost: (postId: string) => void;
  onOpenAuth?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onNavigateUser,
  onNavigatePost,
  onOpenAuth,
}) => {
  const { user, darkMode, setUnreadNotifsCount } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'like' | 'comment' | 'follow' | 'follow_request'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setIsLoading(false);
      setNotifications([]);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      // Handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifsCount(0);
      sounds.playSparkle();
    } catch (e) {}
  };

  const handleAcceptFollowRequest = async (requestId: string, notificationId: string) => {
    try {
      await api.acceptFollowRequest(requestId);
      sounds.playSparkle();
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true, type: 'follow' as const } : n
        )
      );
    } catch (e) {
      alert('Erro ao aceitar solicitação');
    }
  };

  const handleRejectFollowRequest = async (requestId: string, notificationId: string) => {
    try {
      await api.rejectFollowRequest(requestId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (e) {
      alert('Erro ao recusar solicitação');
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'like') return n.type === 'like_post' || n.type === 'like_comment';
    if (activeFilter === 'comment') return n.type === 'comment' || n.type === 'mention';
    if (activeFilter === 'follow') return n.type === 'follow';
    if (activeFilter === 'follow_request') return n.type === 'follow_request';
    return true;
  });

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return <Heart className="w-4 h-4 text-white fill-red-500" />;
      case 'comment':
      case 'mention':
        return <MessageCircle className="w-4 h-4 text-zinc-400 fill-white" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-white" />;
      case 'follow_request':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-white" />;
    }
  };

  if (!user) {
    return (
      <div className="pb-20 max-w-xl mx-auto pt-6 text-center animate-bento-fade">
        <div className="p-8 sm:p-12 rounded-[28px] bg-[#12121B] text-white border border-white/10 shadow-xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
            <Bell className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h3 className="font-heading text-lg font-bold text-white">
            Notificações
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Faça login para receber alertas de curtidas, comentários, novos seguidores e interações.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 rounded-full bg-white text-black hover:bg-zinc-200 font-extrabold text-xs shadow-md hover:scale-102 active:scale-95 transition-all cursor-pointer"
            >
              Entrar ou Criar Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto animate-bento-fade">
      {/* Header card */}
      <div className="p-4 rounded-2xl bg-[#12121B] border border-white/10 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-white" />
          <h1 className="font-heading text-base font-bold text-white">
            Central de Notificações
          </h1>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white hover:underline cursor-pointer transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Marcar todas como lidas</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'like', label: 'Curtidas' },
          { id: 'comment', label: 'Comentários' },
          { id: 'follow', label: 'Seguidores' },
          { id: 'follow_request', label: 'Solicitações' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-white text-black font-extrabold shadow-xs'
                : 'bg-[#171724] hover:bg-[#1E1E2E] text-zinc-300 border border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="rounded-[24px] bg-[#12121B] border border-white/10 p-2 sm:p-4 shadow-xs space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <div className="w-7 h-7 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Carregando notificações...</span>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="font-heading text-sm font-bold text-white">
              Nenhuma notificação por enquanto
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Quando houver novas interações, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          filteredNotifs.map(n => (
            <div
              key={n.id}
              className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                n.isRead
                  ? 'hover:bg-white/5'
                  : 'bg-[#171724] border border-white/10 shadow-2xs'
              }`}
            >
              {/* Actor Avatar & Text */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <button
                    onClick={() => onNavigateUser(n.actor.username)}
                    className="cursor-pointer"
                  >
                    <img
                      src={n.actor.avatar}
                      alt={n.actor.displayName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-white/15 bg-white/5"
                    />
                  </button>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#12121A] border border-white/15 flex items-center justify-center shadow-xs">
                    {getNotifIcon(n.type)}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-white leading-snug">
                    <strong
                      onClick={() => onNavigateUser(n.actor.username)}
                      className="font-heading font-bold text-white hover:underline cursor-pointer mr-1"
                    >
                      {n.actor.displayName}
                    </strong>
                    {n.text}
                  </p>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Actions / Thumbnail */}
              <div className="shrink-0">
                {n.type === 'follow_request' && n.data?.requestId ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAcceptFollowRequest(n.data!.requestId!, n.id)}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-xs hover:scale-105 cursor-pointer font-bold"
                      title="Aceitar Solicitação"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectFollowRequest(n.data!.requestId!, n.id)}
                      className="w-8 h-8 rounded-full bg-[#171724] text-zinc-300 border border-white/10 flex items-center justify-center hover:bg-white/10 cursor-pointer"
                      title="Recusar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : n.targetId && (n.type === 'like_post' || n.type === 'comment') ? (
                  <button
                    onClick={() => onNavigatePost(n.targetId!)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#171724] border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <span className="text-[11px] text-zinc-200 font-semibold">
                      Ver Post
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
