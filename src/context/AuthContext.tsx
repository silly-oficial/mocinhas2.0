import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Notification, Message, UserGender } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/sound';
import { supabase, isSupabaseClientConfigured } from '../services/supabase';

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
  const darkMode = true; // Exclusively Dark Mode
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('mocinhas_sound') !== 'false');
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  // Enforce dark mode permanently
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('mocinhas_theme', 'dark');
  }, []);

  // Sync sound setting
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
    localStorage.setItem('mocinhas_sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  const toggleDarkMode = () => {
    document.documentElement.classList.add('dark');
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const decrementNotifs = () => {
    setUnreadNotifsCount(prev => Math.max(0, prev - 1));
  };

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.user);
      // Fetch initial notifications & messages count
      try {
        const notifs = await api.getNotifications();
        setUnreadNotifsCount(notifs.unreadCount);
        const convs = await api.getConversations();
        const totalUnread = convs.conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadMessagesCount(totalUnread);
      } catch (e) {}
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

  // Real-time Supabase Auth state listener
  useEffect(() => {
    if (!supabase || !isSupabaseClientConfigured) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        localStorage.setItem('mocinhas_token', session.access_token);
        localStorage.setItem('yume_token', session.access_token);
        setToken(session.access_token);
        refreshUser();
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('mocinhas_token');
        localStorage.removeItem('yume_token');
        setToken(null);
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refreshUser]);

  // Real-time Supabase Channels + SSE Connection for notifications & messages
  useEffect(() => {
    if (!user) return;

    // 1. Supabase Real-time Channel (if configured)
    let supabaseChannel: any = null;
    if (supabase && isSupabaseClientConfigured) {
      try {
        supabaseChannel = supabase
          .channel(`user-notifications-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${user.id}`,
            },
            (payload: any) => {
              setUnreadNotifsCount(prev => prev + 1);
              sounds.playSparkle();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            (payload: any) => {
              if (payload.new && payload.new.sender_id !== user.id) {
                setUnreadMessagesCount(prev => prev + 1);
                sounds.playMessagePop();
                window.dispatchEvent(new CustomEvent('mocinhas:realtime-message', { detail: payload.new }));
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase channel subscription notice:', e);
      }
    }

    // 2. Server-Sent Events (SSE) Real-time listener
    const currentToken = token || localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
    let eventSource: EventSource | null = null;
    if (currentToken) {
      try {
        eventSource = new EventSource(`/api/events?token=${currentToken}`);

        eventSource.addEventListener('notification', (e) => {
          try {
            const notif = JSON.parse(e.data) as Notification;
            setUnreadNotifsCount(prev => prev + 1);
            sounds.playSparkle();
          } catch (err) {}
        });

        eventSource.addEventListener('message', (e) => {
          try {
            const msg = JSON.parse(e.data) as Message;
            setUnreadMessagesCount(prev => prev + 1);
            sounds.playMessagePop();
            window.dispatchEvent(new CustomEvent('mocinhas:realtime-message', { detail: msg }));
          } catch (err) {}
        });

        eventSource.onerror = () => {};
      } catch (e) {}
    }

    return () => {
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [token, user]);

  const login = async (ident: string, pass: string) => {
    // 1. Try Supabase Auth if configured and input is email
    if (supabase && isSupabaseClientConfigured && ident.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: ident.trim(),
          password: pass,
        });
        if (data?.session?.access_token) {
          localStorage.setItem('mocinhas_token', data.session.access_token);
          localStorage.setItem('yume_token', data.session.access_token);
          setToken(data.session.access_token);
        }
      } catch (sbErr) {
        console.warn('Supabase signIn fallback to server API:', sbErr);
      }
    }

    // 2. Primary / Full Server Login
    const res = await api.login({ identifier: ident, password: pass });
    localStorage.setItem('mocinhas_token', res.token);
    localStorage.setItem('yume_token', res.token);
    setToken(res.token);
    setUser(res.user);
    sounds.playSparkle();
  };

  const register = async (u: string, d: string, e: string, p: string, gender?: UserGender, avatar?: string, banner?: string, acceptedTerms?: boolean) => {
    // 1. Try Supabase Auth SignUp if configured
    if (supabase && isSupabaseClientConfigured) {
      try {
        await supabase.auth.signUp({
          email: e.trim(),
          password: p,
          options: {
            data: {
              username: u.trim(),
              displayName: d.trim(),
              gender: gender || 'feminino',
            },
          },
        });
      } catch (sbErr) {
        console.warn('Supabase signUp notice:', sbErr);
      }
    }

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

    localStorage.setItem('mocinhas_token', res.token);
    localStorage.setItem('yume_token', res.token);
    setToken(res.token);
    setUser(res.user);
    sounds.playSparkle();
  };

  const logout = async () => {
    if (supabase && isSupabaseClientConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
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
