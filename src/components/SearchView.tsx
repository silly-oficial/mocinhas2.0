import React, { useState, useEffect, useRef } from 'react';
import { Search, X, History, Sparkles, User, Hash, FileText, ArrowRight } from 'lucide-react';
import { User as UserType, Post } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SearchViewProps {
  onNavigateUser: (username: string) => void;
  onNavigateHashtag: (tag: string) => void;
  onSelectPost: (post: Post) => void;
  onClose?: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onNavigateUser,
  onNavigateHashtag,
  onSelectPost,
  onClose,
}) => {
  const { darkMode } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'hashtags'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    users: UserType[];
    posts: Post[];
    hashtags: { tag: string; count: number }[];
  }>({ users: [], posts: [], hashtags: [] });

  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('yume_search_history') || '["kawaii", "animeart", "sakura_chan"]');
    } catch {
      return ['kawaii', 'animeart'];
    }
  });

  const debounceTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], posts: [], hashtags: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = window.setTimeout(async () => {
      try {
        const res = await api.search(query.trim());
        setResults(res);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query]);

  const handleSaveToHistory = (term: string) => {
    if (!term) return;
    const updated = [term, ...history.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('yume_search_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('yume_search_history');
  };

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative">
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl ${
            darkMode ? 'bg-[#181824] border-white/10' : 'bg-white border-zinc-200'
          } border shadow-md`}
        >
          <Search className="w-5 h-5 text-white" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar usuários, @arrobas, #hashtags ou posts..."
            className="flex-1 bg-transparent text-sm text-white dark:text-white placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-bold text-zinc-300 hover:text-white ml-2 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {query && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: '✦ Tudo' },
            { id: 'users', label: '👥 Perfis' },
            { id: 'posts', label: '📸 Publicações' },
            { id: 'hashtags', label: '🏷️ Hashtags' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-xs'
                  : 'bg-white/10 dark:bg-white/10 text-zinc-300 dark:text-zinc-200 hover:bg-white/15'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* SEARCH RESULTS OR HISTORY */}
      {!query ? (
        /* Recent Search History */
        <div
          className={`p-4 rounded-3xl ${
            darkMode ? 'glass-card-dark' : 'glass-card'
          } shadow-sm border border-white/10 dark:border-white/10`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 dark:text-zinc-200">
              <History className="w-4 h-4 text-zinc-400" />
              <span>Pesquisas Recentes</span>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 underline cursor-pointer"
              >
                Limpar histórico
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">
              Nenhuma busca recente. Digite algo acima para buscar!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {history.map(item => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 dark:bg-white/10 text-xs font-medium text-zinc-200 dark:text-zinc-200 hover:bg-white/15 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{item}</span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-3 border-white/20 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-bold">
            Pesquisando... ✦
          </span>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-4">
          {/* Users Results */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div
              className={`p-4 rounded-3xl ${
                darkMode ? 'glass-card-dark' : 'glass-card'
              } shadow-sm border border-white/10 dark:border-white/10`}
            >
              <h3 className="text-xs font-bold text-zinc-200 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                <User className="w-4 h-4 text-zinc-400" />
                <span>Perfis Encontrados ({results.users.length})</span>
              </h3>
              <div className="space-y-2.5">
                {results.users.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      handleSaveToHistory(u.username);
                      onNavigateUser(u.username);
                    }}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-kawaii text-xs font-bold text-white dark:text-white">
                            {u.displayName}
                          </span>
                          {u.isVerified && (
                            <Sparkles className="w-3 h-3 text-zinc-400 fill-amber-400" />
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400/80">@{u.username}</span>
                      </div>
                    </div>
                    {u.animeTitle && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 dark:bg-white/10 text-zinc-300 dark:text-zinc-300 font-semibold">
                        {u.animeTitle}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags Results */}
          {(activeTab === 'all' || activeTab === 'hashtags') && results.hashtags.length > 0 && (
            <div
              className={`p-4 rounded-3xl ${
                darkMode ? 'glass-card-dark' : 'glass-card'
              } shadow-sm border border-white/10 dark:border-white/10`}
            >
              <h3 className="text-xs font-bold text-zinc-200 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-zinc-400" />
                <span>Hashtags ({results.hashtags.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {results.hashtags.map(item => (
                  <button
                    key={item.tag}
                    onClick={() => {
                      handleSaveToHistory(`#${item.tag}`);
                      onNavigateHashtag(item.tag);
                    }}
                    className="p-2.5 rounded-2xl bg-white/5 dark:bg-[#181824] hover:bg-white/10 dark:hover:bg-[#20202E] text-left transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-xs font-bold text-white">
                      #{item.tag}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      {item.count} posts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts Results */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div
              className={`p-4 rounded-3xl ${
                darkMode ? 'glass-card-dark' : 'glass-card'
              } shadow-sm border border-white/10 dark:border-white/10`}
            >
              <h3 className="text-xs font-bold text-zinc-200 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span>Publicações ({results.posts.length})</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {results.posts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost(post)}
                    className="aspect-square rounded-2xl overflow-hidden bg-white/10 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <img
                      src={post.media[0]?.thumbnail || post.media[0]?.url}
                      alt={post.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.users.length === 0 && results.hashtags.length === 0 && results.posts.length === 0 && (
            <div className="text-center py-12">
              <span className="text-3xl mb-2 block">🔍</span>
              <p className="text-sm font-bold text-zinc-200 dark:text-zinc-200">
                Nenhum resultado encontrado
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Tente buscar por outro termo ou nome de usuário.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
