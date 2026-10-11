import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SidebarNav } from './components/SidebarNav';
import { RightSidebar } from './components/RightSidebar';
import { FloatingParticles } from './components/FloatingParticles';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { PostCard } from './components/PostCard';
import { CommentsModal } from './components/CommentsModal';
import { CreatePostModal } from './components/CreatePostModal';
import { ReelsViewer } from './components/ReelsViewer';
import { UniverseFeed } from './components/UniverseFeed';
import { ExploreView } from './components/ExploreView';
import { SearchView } from './components/SearchView';
import { ProfileView } from './components/ProfileView';
import { EditProfileModal } from './components/EditProfileModal';
import { FollowListModal } from './components/FollowListModal';
import { ChatView } from './components/ChatView';
import { NotificationsView } from './components/NotificationsView';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ReportModal } from './components/ReportModal';
import { LanguageModal } from './components/LanguageModal';
import { AdminPanel } from './components/AdminPanel';
import { SyncpayModal } from './components/SyncpayModal';
import { Post, StoryGroup, User } from './types';
import { api } from './services/api';
import { Hash, ArrowLeft } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  // Navigation views: 'feed' | 'explore' | 'reels' | 'profile' | 'messages' | 'notifications' | 'search' | 'hashtag'
  const [activeView, setActiveView] = useState<string>('feed');
  const [viewParam, setViewParam] = useState<string>(''); // username or hashtag

  // Feed Data
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedTab, setFeedTab] = useState<'for_you' | 'following'>('for_you');
  // 'list' = feed clássico em lista (padrão) | 'universe' = feed cósmico em zoom
  const [feedMode, setFeedMode] = useState<'universe' | 'list'>(() => {
    try {
      return localStorage.getItem('mocinhas_feed_mode') === 'universe' ? 'universe' : 'list';
    } catch {
      return 'list';
    }
  });
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);

  // Modals state
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [selectedPostForModal, setSelectedPostForModal] = useState<Post | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createDefaultMode, setCreateDefaultMode] = useState<'post' | 'story' | 'video'>('post');
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [reportTarget, setReportTarget] = useState<{ postId?: string; userId?: string } | null>(null);
  const [followListModal, setFollowListModal] = useState<{ user: User; tab: 'followers' | 'following' } | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [isSyncpayModalOpen, setIsSyncpayModalOpen] = useState<boolean>(false);

  const changeFeedMode = (mode: 'universe' | 'list') => {
    setFeedMode(mode);
    try {
      localStorage.setItem('mocinhas_feed_mode', mode);
    } catch {}
    // o universo usa sempre o feed "Para você" (todos os vídeos publicados)
    if (mode === 'universe') setFeedTab('for_you');
    window.scrollTo({ top: 0 });
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Load Feed and Stories
  const loadFeedData = useCallback(async () => {
    setIsFeedLoading(true);
    try {
      const [feedRes, storiesRes] = await Promise.all([
        api.getFeed(feedTab),
        api.getStories(),
      ]);
      setFeedPosts(Array.isArray(feedRes?.posts) ? feedRes.posts : []);
      setStoryGroups(Array.isArray(storiesRes?.storyGroups) ? storiesRes.storyGroups : []);
    } catch (e) {
      console.error('Error loading feed:', e);
      setFeedPosts([]);
      setStoryGroups([]);
    } finally {
      setIsFeedLoading(false);
    }
  }, [feedTab]);

  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  const handleNavigate = (view: string, param: string = '') => {
    setActiveView(view);
    setViewParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCreateModal = (mode: 'post' | 'story' | 'video' = 'post') => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setCreateDefaultMode(mode);
    setIsCreateModalOpen(true);
  };

  const handlePostDeleted = (postId: string) => {
    setFeedPosts(prev => prev.filter(p => p.id !== postId));
    if (selectedPostForModal?.id === postId) setSelectedPostForModal(null);
    if (selectedPostForComments?.id === postId) setSelectedPostForComments(null);
  };

  const handlePostUpdated = (updated: Partial<Post> & { id: string }) => {
    setFeedPosts(prev =>
      prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    if (selectedPostForModal?.id === updated.id) {
      setSelectedPostForModal(prev => (prev ? { ...prev, ...updated } : null));
    }
    if (selectedPostForComments?.id === updated.id) {
      setSelectedPostForComments(prev => (prev ? { ...prev, ...updated } : null));
    }
  };

  const handleStoryDeleted = (storyId: string) => {
    setStoryGroups(prev =>
      prev
        .map(g => ({
          ...g,
          stories: g.stories.filter(s => s.id !== storyId),
        }))
        .filter(g => g.stories.length > 0)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090E] text-white flex flex-col items-center justify-center p-4 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-2xl bg-black border border-white/15 flex items-center justify-center text-white text-3xl shadow-2xl mb-4">
          <span className="animate-spin text-2xl font-black">✦</span>
        </div>
        <h1 className="font-heading text-xl font-extrabold text-white tracking-tight">mocinhas</h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090E] text-white transition-colors duration-300 font-sans relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      {!(activeView === 'feed' && feedMode === 'universe') && <FloatingParticles />}

      {/* Main Responsive Layout */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto min-h-screen flex flex-row justify-center gap-4 sm:gap-6 p-0 sm:p-3 lg:p-4">
        {/* Left Navigation Sidebar (Desktop lg+) */}
        <SidebarNav
          activeView={activeView}
          onNavigate={handleNavigate}
          onOpenCreateModal={() => handleOpenCreateModal('post')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLanguage={() => setIsLanguageModalOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          onOpenSyncpay={() => setIsSyncpayModalOpen(true)}
        />

        {/* Center Main Feed / View Column */}
        <div className="flex-1 min-w-0 max-w-2xl xl:max-w-3xl flex flex-col min-h-screen">
          {/* Top Header with DM Icon on top right */}
          <Header
            activeView={activeView}
            onNavigateHome={() => handleNavigate('feed')}
            onOpenSearch={() => handleNavigate('search')}
            onOpenNotifications={() => handleNavigate('notifications')}
            onOpenMessages={() => handleNavigate('messages')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenLanguage={() => setIsLanguageModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
            onOpenSyncpay={() => setIsSyncpayModalOpen(true)}
          />

          {/* Content View Container */}
          <main className="flex-1 px-3 sm:px-4 py-2 w-full">
            {/* VIEW: FEED */}
            {/* VIEW: FEED — UNIVERSO */}
            {activeView === 'feed' && feedMode === 'universe' && (
              <div className="pb-20 animate-bento-fade">
                <UniverseFeed
                  posts={feedPosts}
                  isLoading={isFeedLoading}
                  paused={selectedPostForModal !== null || selectedPostForComments !== null}
                  onSelectPost={post => setSelectedPostForModal(post)}
                  onNavigateUser={u => handleNavigate('profile', u)}
                  onSwitchToList={() => changeFeedMode('list')}
                />
              </div>
            )}

            {/* VIEW: FEED — LISTA (clássico) */}
            {activeView === 'feed' && feedMode === 'list' && (
              <div className="space-y-4 pb-20 animate-bento-fade">
                {/* Stories Bar */}
                <StoriesBar
                  storyGroups={storyGroups}
                  onOpenStory={index => setActiveStoryGroupIndex(index)}
                  onAddStory={() => handleOpenCreateModal('story')}
                />

                {/* Feed Tabs: Para Você vs Seguindo (Sleek Segmented Pill Control) */}
                <div className="flex items-center justify-center mb-4">
                  <div className="inline-flex p-1.5 rounded-full bg-[#13131D] border border-white/10 shadow-lg">
                    <button
                      id="tab-feed-for-you"
                      onClick={() => setFeedTab('for_you')}
                      className={`px-5 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                        feedTab === 'for_you'
                          ? 'bg-white text-black shadow-md shadow-white/5'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t('for_you')}
                    </button>
                    {user && (
                      <button
                        id="tab-feed-following"
                        onClick={() => setFeedTab('following')}
                        className={`px-5 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                          feedTab === 'following'
                            ? 'bg-white text-black shadow-md shadow-white/5'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {t('following')}
                      </button>
                    )}
                    <button
                      id="btn-feed-universe"
                      onClick={() => changeFeedMode('universe')}
                      className="px-5 py-2 rounded-full text-xs font-black transition-all cursor-pointer text-zinc-400 hover:text-white"
                    >
                      🪐 Universo
                    </button>
                  </div>
                </div>

                {/* Posts Stream */}
                {isFeedLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-zinc-400">
                      Carregando publicações...
                    </span>
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div
                    className="p-8 text-center niuniu-card space-y-3"
                  >
                    <h3 className="font-heading text-base font-extrabold text-white">
                      {feedTab === 'following'
                        ? 'Você ainda não segue ninguém com posts recentes'
                        : 'Nenhuma publicação encontrada'}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Explore novas criadoras ou crie a sua primeira publicação!
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                      <button
                        onClick={() => handleNavigate('explore')}
                        className="px-4 py-2 rounded-full bg-white/10 text-xs font-bold text-white cursor-pointer hover:bg-white/20 transition-colors"
                      >
                        Explorar Criadoras
                      </button>
                      {user && (
                        <button
                          onClick={() => handleOpenCreateModal('post')}
                          className="px-5 py-2 rounded-full bg-white text-black text-xs font-black shadow-md cursor-pointer hover:bg-neutral-200 transition-colors"
                        >
                          Publicar Agora
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  feedPosts.map((post, idx) => (
                    <div
                      key={post.id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="animate-bento-fade"
                    >
                      <PostCard
                        post={post}
                        onOpenComments={p => setSelectedPostForComments(p)}
                        onNavigateUser={u => handleNavigate('profile', u)}
                        onNavigateHashtag={tag => handleNavigate('hashtag', tag)}
                        onOpenReport={id => setReportTarget({ postId: id })}
                        onPostDeleted={handlePostDeleted}
                        onOpenDirectChat={userId => handleNavigate('messages', userId)}
                        onPostUpdated={handlePostUpdated}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VIEW: EXPLORE */}
            {activeView === 'explore' && (
              <ExploreView
                posts={feedPosts}
                onSelectPost={post => setSelectedPostForModal(post)}
                onNavigateHashtag={tag => handleNavigate('hashtag', tag)}
              />
            )}

            {/* VIEW: REELS */}
            {activeView === 'reels' && (
              <div className="pb-20">
                <ReelsViewer
                  reels={feedPosts.filter(p => p.media.some(m => m.type === 'video'))}
                  onOpenComments={p => setSelectedPostForComments(p)}
                  onNavigateUser={u => handleNavigate('profile', u)}
                  onPostDeleted={handlePostDeleted}
                />
              </div>
            )}

            {/* VIEW: PROFILE */}
            {activeView === 'profile' && (
              <ProfileView
                username={viewParam || user?.username || ''}
                onOpenEditProfile={() => setIsEditProfileOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenFollowers={u => setFollowListModal({ user: u, tab: 'followers' })}
                onOpenFollowing={u => setFollowListModal({ user: u, tab: 'following' })}
                onSelectPost={post => setSelectedPostForModal(post)}
                onStartChat={targetId => {
                  handleNavigate('messages', targetId);
                }}
                onOpenAuth={handleOpenAuth}
                onPostDeleted={handlePostDeleted}
                onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
              />
            )}

            {/* VIEW: MESSAGES / CHAT */}
            {activeView === 'messages' && (
              <ChatView
                initialUserId={viewParam || undefined}
                onNavigateUser={u => handleNavigate('profile', u)}
                onOpenAuth={() => handleOpenAuth('login')}
              />
            )}

            {/* VIEW: NOTIFICATIONS */}
            {activeView === 'notifications' && (
              <NotificationsView
                onNavigateUser={u => handleNavigate('profile', u)}
                onNavigatePost={postId => {
                  const target = feedPosts.find(p => p.id === postId);
                  if (target) setSelectedPostForModal(target);
                }}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {/* VIEW: SEARCH */}
            {activeView === 'search' && (
              <SearchView
                onNavigateUser={u => handleNavigate('profile', u)}
                onNavigateHashtag={tag => handleNavigate('hashtag', tag)}
                onSelectPost={post => setSelectedPostForModal(post)}
                onClose={() => handleNavigate('feed')}
              />
            )}

            {/* VIEW: HASHTAG FEED */}
            {activeView === 'hashtag' && (
              <div className="space-y-4 pb-20 animate-bento-fade">
                {/* Top hashtag header */}
                <div
                  className="p-4 niuniu-card flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleNavigate('explore')}
                      className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-2xl bg-black border border-white/15 text-white flex items-center justify-center shadow-xs">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-heading text-base font-extrabold text-white">
                        #{viewParam}
                      </h2>
                      <span className="text-xs text-zinc-400">Publicações com esta hashtag</span>
                    </div>
                  </div>
                </div>

                {/* Filtered posts */}
                {feedPosts.filter(p => p.hashtags.includes(viewParam)).length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 text-xs">
                    Nenhuma publicação encontrada para #{viewParam}. Seja a primeira pessoa a postar!
                  </div>
                ) : (
                  feedPosts
                    .filter(p => p.hashtags.includes(viewParam))
                    .map((post, idx) => (
                      <div
                        key={post.id}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        className="animate-bento-fade"
                      >
                        <PostCard
                          post={post}
                          onOpenComments={p => setSelectedPostForComments(p)}
                          onNavigateUser={u => handleNavigate('profile', u)}
                          onNavigateHashtag={tag => handleNavigate('hashtag', tag)}
                          onOpenReport={id => setReportTarget({ postId: id })}
                          onPostDeleted={handlePostDeleted}
                          onOpenDirectChat={userId => handleNavigate('messages', userId)}
                          onPostUpdated={handlePostUpdated}
                        />
                      </div>
                    ))
                )}
              </div>
            )}
          </main>
        </div>

        {/* Right Sidebar (Desktop xl+) */}
        <RightSidebar
          onNavigateUser={u => handleNavigate('profile', u)}
          onNavigateHashtag={tag => handleNavigate('hashtag', tag)}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Bottom Floating Navigation Dock for Mobile / Tablet */}
        <Navigation
          activeView={activeView}
          onNavigate={handleNavigate}
          onOpenCreateModal={() => handleOpenCreateModal('post')}
        />
      </div>

      {/* MODALS */}
      {/* 1. 24h Story Viewer */}
      {activeStoryGroupIndex !== null && (
        <StoryViewerModal
          storyGroups={storyGroups}
          initialGroupIndex={activeStoryGroupIndex}
          onClose={() => setActiveStoryGroupIndex(null)}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* 2. Comments Modal */}
      {selectedPostForComments && (
        <CommentsModal
          post={selectedPostForComments}
          onClose={() => setSelectedPostForComments(null)}
          onNavigateUser={u => {
            setSelectedPostForComments(null);
            handleNavigate('profile', u);
          }}
          onCommentCountChange={(id, count) => handlePostUpdated({ id, commentsCount: count })}
        />
      )}

      {/* 3. Create Publication Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          defaultMode={createDefaultMode}
          onClose={() => setIsCreateModalOpen(false)}
          onPostCreated={(newPost) => {
            if (newPost) {
              setFeedPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
            }
            setFeedTab('for_you');
            setFeedMode('list');
            setActiveView('feed');
            loadFeedData();
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch {}
          }}
        />
      )}

      {/* 4. Edit Profile Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          onClose={() => setIsEditProfileOpen(false)}
          onProfileUpdated={() => {
            loadFeedData();
          }}
        />
      )}

      {/* 5. Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onOpenEditProfile={() => {
            setIsSettingsOpen(false);
            setIsEditProfileOpen(true);
          }}
          onOpenLanguage={() => setIsLanguageModalOpen(true)}
        />
      )}

      {/* Language Modal */}
      {isLanguageModalOpen && (
        <LanguageModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} />
      )}

      {/* 6. Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            loadFeedData();
          }}
        />
      )}

      {/* 7. Follow List Modal */}
      {followListModal && (
        <FollowListModal
          user={followListModal.user}
          initialTab={followListModal.tab}
          onClose={() => setFollowListModal(null)}
          onNavigateUser={u => {
            setFollowListModal(null);
            handleNavigate('profile', u);
          }}
        />
      )}

      {/* 8. Report Content Modal */}
      {reportTarget && (
        <ReportModal
          postId={reportTarget.postId}
          userId={reportTarget.userId}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* 9. Single Post Modal Viewer */}
      {selectedPostForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl animate-scale-up">
            <PostCard
              post={selectedPostForModal}
              onOpenComments={p => setSelectedPostForComments(p)}
              onNavigateUser={u => {
                setSelectedPostForModal(null);
                handleNavigate('profile', u);
              }}
              onNavigateHashtag={tag => {
                setSelectedPostForModal(null);
                handleNavigate('hashtag', tag);
              }}
              onOpenReport={id => setReportTarget({ postId: id })}
              onPostDeleted={id => {
                handlePostDeleted(id);
                setSelectedPostForModal(null);
              }}
              onOpenDirectChat={userId => {
                setSelectedPostForModal(null);
                handleNavigate('messages', userId);
              }}
              onPostUpdated={handlePostUpdated}
            />
            <div className="text-center pb-2">
              <button
                onClick={() => setSelectedPostForModal(null)}
                className="px-5 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold hover:bg-white/30 cursor-pointer"
              >
                Fechar Visualização ✕
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Admin Panel Modal */}
      {isAdminPanelOpen && (
        <AdminPanel
          onClose={() => setIsAdminPanelOpen(false)}
          onPostCreated={loadFeedData}
        />
      )}

      {/* Syncpay Modal */}
      {isSyncpayModalOpen && (
        <SyncpayModal
          onClose={() => setIsSyncpayModalOpen(false)}
          onSuccess={() => {
            setIsSyncpayModalOpen(false);
            loadFeedData();
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </AuthProvider>
  );
}
