import React from 'react';
import { Home, Compass, Plus, Film, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface NavigationProps {
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenCreateModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onNavigate,
  onOpenCreateModal,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const isAdmin = Boolean(
    user?.isAdmin ||
    user?.email?.toLowerCase() === 'papaidasia@gmail.com' ||
    user?.username?.toLowerCase() === 'papaidasia' ||
    user?.email?.toLowerCase() === 'admin@mocinhas.com' ||
    user?.username?.toLowerCase() === 'admin'
  );

  const navItems = [
    { id: 'feed', label: t('nav_feed'), icon: Home },
    { id: 'explore', label: t('nav_explore'), icon: Compass },
    ...(isAdmin ? [{ id: 'create', label: t('create_post'), isCreate: true }] : []),
    { id: 'reels', label: t('nav_reels'), icon: Film },
    { id: 'profile', label: t('nav_profile'), icon: UserIcon, isProfile: true },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 sm:bottom-4 max-w-lg mx-auto pointer-events-none px-3 pb-2 sm:pb-0">
      <div
        className="pointer-events-auto w-full px-3 py-2 rounded-full bg-[#12121B]/95 border border-white/15 backdrop-blur-2xl shadow-2xl shadow-black/80 flex items-center justify-around"
      >
        {navItems.map(item => {
          if (item.isCreate) {
            return (
              <button
                key="create-btn"
                id="btn-nav-create"
                onClick={onOpenCreateModal}
                className="relative -top-4 flex flex-col items-center group cursor-pointer"
                title="Criar Publicação"
              >
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/10 group-hover:scale-110 group-active:scale-95 transition-all duration-200 border-2 border-black">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
              </button>
            );
          }

          const IconComponent = item.icon!;
          const isActive =
            item.id === 'profile'
              ? activeView === 'profile'
              : activeView === item.id;

          return (
            <button
              key={item.id}
              id={`btn-nav-${item.id}`}
              onClick={() => {
                if (item.id === 'profile' && user) {
                  onNavigate('profile', user.username);
                } else {
                  onNavigate(item.id);
                }
              }}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {item.isProfile && user ? (
                <div
                  className={`w-6 h-6 rounded-full overflow-hidden p-0.5 border-2 transition-all ${
                    isActive ? 'border-white' : 'border-zinc-700'
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
                <div className="relative">
                  <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
              )}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
