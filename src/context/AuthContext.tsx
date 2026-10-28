import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserGender } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/sound';
import { useTheme } from './ThemeContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  login: (ident: string, pass: string) => Promise<void>;
  register: (u: string, d: string, e: string, p: string, gender?: UserGender, avatar?: string, banner?: string, acceptedTerms?: boolean) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<User>;
  refreshUser: () => Promise<void>;
  toggleDarkMode: () => void;
  toggleSound: () => void;
  decrementNotifs: () => void;
  setUnreadNotifsCount: React.Dispatch<React.SetStateAction<number>>;
  setUnreadMessagesCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { theme, setTheme } = useTheme();
  const darkMode = theme === 'original';
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('mocinhas_sound') !== 'false');
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  // Sync sound setting
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
    localStorage.setItem('mocinhas_sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  const toggleDarkMode = () => {
    setTheme(darkMode ? 'skyglass' : 'original');
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const decrementNotifs = () => {
    setUnreadNotifsCount(prev => Math.max(0, prev - 1));
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);setToken('session');

    } catch (e) {
      console.error('Failed to load user profile:', e);
      localStorage.removeItem('mocinhas_token');
      localStorage.removeItem('yume_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (ident: string, pass: string) => {
    // 2. Primary / Full Server Login
    const res = await api.login({ identifier: ident, password: pass });
    localStorage.removeItem('mocinhas_token');localStorage.removeItem('yume_token');
    setToken('session');
    setUser(res.user);
    sounds.playSparkle();
  };

  const register = async (u: string, d: string, e: string, p: string, gender?: UserGender, avatar?: string, banner?: string, acceptedTerms?: boolean) => {
    // 2. Primary / Full Server Registration
    const res = await api.register({
      username: u,
      displayName: d,
      email: e,
      password: p,
      gender: gender || 'feminino',
      avatar,
      banner,
      acceptedTerms,
    });

    localStorage.removeItem('mocinhas_token');localStorage.removeItem('yume_token');
    setToken('session');
    setUser(res.user);
    sounds.playSparkle();
  };

  const logout = async () => {
    try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)return;}catch{return;}
    localStorage.removeItem('mocinhas_token');
    localStorage.removeItem('yume_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        darkMode,
        soundEnabled,
        unreadNotifsCount,
        unreadMessagesCount,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        toggleDarkMode,
        toggleSound,
        decrementNotifs,
        setUnreadNotifsCount,
        setUnreadMessagesCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

