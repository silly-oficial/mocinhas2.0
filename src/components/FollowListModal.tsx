import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, UserPlus, UserCheck } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';

interface FollowListModalProps {
  user: User;
  initialTab?: 'followers' | 'following';
  onClose: () => void;
  onNavigateUser: (username: string) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  user,
  initialTab = 'followers',
  onClose,
  onNavigateUser,
}) => {
  const { user: currentUser, darkMode } = useAuth();
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [list, setList] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [followsState, setFollowsState] = useState<{ [userId: string]: boolean }>({});

  useEffect(() => {
    loadList();
  }, [tab, user.id]);

  const loadList = async () => {
    setIsLoading(true);
    try {
      if (tab === 'followers') {
        const res = await api.getFollowers(user.id);
        setList(res.followers);
        const map: typeof followsState = {};
        res.followers.forEach(u => (map[u.id] = u.isFollowing || false));
        setFollowsState(map);
      } else {
        const res = await api.getFollowing(user.id);
        setList(res.following);
        const map: typeof followsState = {};
        res.following.forEach(u => (map[u.id] = u.isFollowing || true));
        setFollowsState(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollow = async (targetId: string) => {
    const isFollowing = followsState[targetId] || false;
    setFollowsState(prev => ({ ...prev, [targetId]: !isFollowing }));
    sounds.playSparkle();

    try {
      if (isFollowing) {
        await api.unfollowUser(targetId);
      } else {
        await api.followUser(targetId);
      }
    } catch (e) {
      setFollowsState(prev => ({ ...prev, [targetId]: isFollowing }));
    }
  };

  const filteredList = list.filter(
    u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-md max-h-[80vh] h-[80vh] sm:h-[550px] rounded-t-3xl sm:rounded-3xl ${
          'niuniu-card text-white border-white/15'
        } border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('followers')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                tab === 'followers'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-300 dark:text-zinc-300 hover:bg-white/10'
              }`}
            >
              Seguidores ({user.followersCount})
            </button>
            <button
              onClick={() => setTab('following')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                tab === 'following'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-300 dark:text-zinc-300 hover:bg-white/10'
              }`}
            >
              Seguindo ({user.followingCount})
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search inside list */}
        <div className="p-3 border-b border-white/10 dark:border-white/10">
          <div className="flex items-center gap-2 bg-white/5 dark:bg-[#161622] px-3 py-1.5 rounded-2xl border border-white/10 dark:border-white/15">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="flex-1 bg-transparent text-xs text-white dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <div className="w-8 h-8 border-3 border-white/20 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">Carregando conexões... ✦</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">
              Nenhum usuário encontrado nesta lista.
            </div>
          ) : (
            filteredList.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
              >
                <div
                  onClick={() => {
                    onNavigateUser(u.username);
                    onClose();
                  }}
                  className="flex items-center gap-2.5 cursor-pointer min-w-0"
                >
                  <img
                    src={u.avatar}
                    alt={u.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white dark:text-white truncate">
                        {u.displayName}
                      </span>
                      {u.isVerified && (
                        <Sparkles className="w-3 h-3 text-zinc-400 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400/80 block truncate">
                      @{u.username}
                    </span>
                  </div>
                </div>

                {currentUser?.id !== u.id && (
                  <button
                    onClick={() => handleToggleFollow(u.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      followsState[u.id]
                        ? 'bg-white/10 dark:bg-white/10 text-zinc-300 dark:text-zinc-200'
                        : 'bg-white text-black shadow-xs hover:bg-zinc-200'
                    }`}
                  >
                    {followsState[u.id] ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
