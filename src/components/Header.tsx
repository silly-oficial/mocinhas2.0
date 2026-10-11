import React from 'react';
import { Bell, MessageCircle, Volume2, VolumeX, Search, LogIn, Globe, ShieldCheck, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenMessages: () => void;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
  onOpenLanguage?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenSyncpay?: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onOpenMessages,
  onOpenAuth,
  onNavigateHome,
  onOpenLanguage,
  onOpenAdminPanel,
  onOpenSyncpay,
  activeView,
}) => {
  const { user, soundEnabled, toggleSound, unreadNotifsCount, unreadMessagesCount } = useAuth();
  const { currentLanguageInfo, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 w-full transition-colors duration-300 px-2 sm:px-0 pt-1.5 sm:pt-0 pb-2">
      <div className="mx-auto px-3 sm:px-4 py-2.5 sm:py-3 w-full bg-[#12121B]/95 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] border border-white/10 shadow-lg shadow-black/40 flex items-center justify-between gap-2 sm:gap-3 box-border">
        {/* Brand Logo for Mobile (Desktop has SidebarNav) */}
        <button
          id="btn-header-logo"
          onClick={onNavigateHome}
          className="flex items-center group cursor-pointer text-left select-none lg:hidden shrink-0"
        >
          <span className="font-heading text-lg font-extrabold tracking-tight text-white block">
            mocinhas
          </span>
        </button>

        {/* Quick Search Bar (Only when logged in) */}
        {user && (
          <div className="flex-1 max-w-md hidden sm:block">
            <button
              id="btn-header-search-bar"
              onClick={onOpenSearch}
              className="w-full flex items-center gap-2.5 px-4 py-2 rounded-full text-xs transition-all duration-200 cursor-pointer bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Pesquisar criadoras, tags, reels...</span>
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Icon Button (Only when logged in) */}
          {user && (
            <button
              id="btn-header-search-mobile"
              onClick={onOpenSearch}
              aria-label="Pesquisar"
              className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Language Selector Button */}
          {onOpenLanguage && (
            <button
              id="btn-header-language"
              onClick={onOpenLanguage}
              aria-label={t('change_language')}
              title={`${t('change_language')} (${currentLanguageInfo.name})`}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-full flex items-center gap-1 text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer text-xs font-semibold border border-white/10 shrink-0"
            >
              <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold">{currentLanguageInfo.code}</span>
            </button>
          )}

          {/* Premium / VIP Button */}
          {user && onOpenSyncpay && (
            <button
              onClick={onOpenSyncpay}
              title={user.isPremium ? 'Você é um usuário VIP Premium!' : 'Assinar Premium (R$ 9,99)'}
              className={`h-8 sm:h-9 px-3 rounded-full font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 ${
                user.isPremium
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'pod-orange text-white hover:opacity-95'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">{user.isPremium ? 'VIP ' : 'VIP'}</span>
            </button>
          )}

          {(user?.isAdmin || user?.email?.toLowerCase() === 'papaidasmocinhas@gmail.com' || user?.email?.toLowerCase() === 'papaidasmocinhas@gmail*com' || user?.username?.toLowerCase() === 'papaidasmocinhas' || user?.email?.toLowerCase() === 'admin@mocinhas.com' || user?.username?.toLowerCase() === 'admin') && onOpenAdminPanel && (
            <button
              id="btn-header-admin-panel"
              onClick={onOpenAdminPanel}
              title="Painel Administrativo"
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Admin </span>
            </button>
          )}

          {/* Direct Messages (DM) Icon Button */}
          <button
            id="btn-header-messages"
            onClick={user ? onOpenMessages : onOpenAuth}
            aria-label="Mensagens Diretas"
            title="Mensagens & Grupos"
            className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              activeView === 'messages'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] px-1 rounded-full bg-[#10B981] text-white text-[9px] sm:text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Notifications Button */}
          {user ? (
            <button
              id="btn-header-notifications"
              onClick={onOpenNotifications}
              aria-label="Notificações"
              title="Notificações"
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                activeView === 'notifications'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] px-1 rounded-full bg-[#10B981] text-white text-[9px] sm:text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>
          ) : (
            /* Login CTA */
            <button
              id="btn-header-auth-cta"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-black shadow-md hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
