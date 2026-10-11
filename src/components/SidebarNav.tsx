import React from 'react';
import { Home, Compass, Film, MessageCircle, Bell, User as UserIcon, Plus, Sparkles, LogIn, Globe, ShieldCheck, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface SidebarNavProps {
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenCreateModal: () => void;
  onOpenAuth: () => void;
  onOpenLanguage?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenSyncpay?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView,
  onNavigate,
  onOpenCreateModal,
  onOpenAuth,
  onOpenLanguage,
  onOpenAdminPanel,
  onOpenSyncpay,
}) => {
  const { user, unreadNotifsCount, unreadMessagesCount } = useAuth();
  const { t, currentLanguageInfo } = useLanguage();

  const navItems = [
    { id: 'feed', label: t('nav_feed'), icon: Home },
    { id: 'explore', label: t('nav_explore'), icon: Compass },
    { id: 'reels', label: t('nav_reels'), icon: Film },
    { id: 'messages', label: t('nav_messages'), icon: MessageCircle, badge: unreadMessagesCount },
    { id: 'notifications', label: t('nav_notifications'), icon: Bell, badge: unreadNotifsCount },
    { id: 'profile', label: t('nav_profile'), icon: UserIcon, isProfile: true },
  ];

  return (
    <aside className="w-64 xl:w-72 hidden lg:flex flex-col justify-between shrink-0 sticky top-4 h-[calc(100vh-2rem)] py-6 px-4 niuniu-card transition-all duration-300">
      <div className="flex flex-col gap-7">
        {/* Logo / Brand Header */}
        <button
          id="btn-sidebar-logo"
          onClick={() => onNavigate('feed')}
          className="flex items-center px-2 py-1 cursor-pointer select-none text-left group"
        >
          <div>
            <span className="font-heading text-2xl font-extrabold tracking-tight text-white block">
              mocinhas
            </span>
            <p className="text-[11px] text-zinc-400 font-medium tracking-wider uppercase">
              Social Jrny
            </p>
          </div>
        </button>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map(item => {
            const IconComponent = item.icon;
            const isActive =
              item.id === 'profile'
                ? activeView === 'profile'
                : activeView === item.id;

            return (
              <button
                key={item.id}
                id={`btn-sidebar-${item.id}`}
                onClick={() => {
                  if (item.id === 'profile') {
                    if (user) {
                      onNavigate('profile', user.username);
                    } else {
                      onNavigate('profile');
                    }
                  } else if ((item.id === 'messages' || item.id === 'notifications') && !user) {
                    onOpenAuth();
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-lg shadow-white/5 font-extrabold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {item.isProfile && user ? (
                    <div
                      className={`w-6 h-6 rounded-full overflow-hidden p-0.5 border ${
                        isActive ? 'border-black' : 'border-white/30'
                      }`}
                    >
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  ) : (
                    <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  )}
                  <span>{item.label}</span>
                </div>

                {/* Badge if any */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-[#FF2A6D] text-white shadow-xs'
                    }`}
                  >
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Action Area */}
      <div className="flex flex-col gap-3 pt-5 border-t border-white/10">
        {(user?.isAdmin || user?.email?.toLowerCase() === 'papaidasia@gmail.com' || user?.username?.toLowerCase() === 'papaidasia' || user?.email?.toLowerCase() === 'admin@mocinhas.com' || user?.username?.toLowerCase() === 'admin') ? (
          <button
            id="btn-sidebar-create-post"
            onClick={onOpenCreateModal}
            className="w-full py-3.5 px-4 bg-white text-black hover:bg-neutral-200 font-black rounded-full shadow-lg shadow-white/5 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>{t('create_post')}</span>
          </button>
        ) : !user ? (
          <button
            id="btn-sidebar-login-prompt"
            onClick={onOpenAuth}
            className="w-full py-3.5 px-4 bg-white text-black hover:bg-neutral-200 font-black rounded-full shadow-lg shadow-white/5 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <LogIn className="w-4.5 h-4.5" />
            <span>{t('login')} / {t('register')}</span>
          </button>
        ) : null}

        {/* Premium Pod Button inspired by the colorful pods in Image 1 & 3 */}
        {onOpenSyncpay && (
          <button
            type="button"
            onClick={onOpenSyncpay}
            className={`flex items-center justify-between w-full px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md ${
              user?.isPremium
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'pod-orange hover:opacity-95'
            }`}
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-white" />
              <span>{user?.isPremium ? 'Status VIP Premium 💎' : 'Assinar VIP Premium'}</span>
            </div>
            {!user?.isPremium && (
              <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-extrabold">R$ 9,99</span>
            )}
          </button>
        )}

        {/* Secondary Utility Controls */}
        <div className="flex items-center gap-2">
          {onOpenLanguage && (
            <button
              type="button"
              onClick={onOpenLanguage}
              className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span className="truncate">{currentLanguageInfo.name}</span>
              </div>
              <span className="text-xs">{currentLanguageInfo.flag}</span>
            </button>
          )}

          {/* Admin Panel Button */}
          {(user?.isAdmin || user?.email === 'admin@mocinhas.com' || user?.username === 'admin' || user?.email === 'papaidasia@gmail.com') && onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              title="Painel Administrativo"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>

        {/* Mini profile pill at bottom if logged in */}
        {user && (
          <div
            onClick={() => onNavigate('profile', user.username)}
            className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
          >
            <img
              src={user.avatar}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-white/20"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate">
                  {user.displayName}
                </span>
                {user.isVerified && (
                  <Sparkles className="w-3 h-3 text-[#FACC15] fill-[#FACC15] shrink-0" />
                )}
              </div>
              <span className="text-[11px] text-zinc-400 truncate block">
                @{user.username}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
