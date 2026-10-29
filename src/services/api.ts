import type { PersonProfile } from '../../shared/people';
import { User, Post, StoryGroup, Comment, Message, Conversation, Notification, FollowRequest, AuthResponse, SearchResult } from '../types';

const API_BASE = '/api';

function getHeaders(isFormData = false): Record<string, string> {
  const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...getHeaders(isFormData),
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Erro do servidor (${res.status})`);
      }
    }

    if (!res.ok) {
      throw Object.assign(new Error(data?.error || `Erro na requisição (${res.status})`), { status: res.status, data });
    }
    return data as T;
  } catch (err: any) {
    throw err;
  }
}

export const api = {

  resolveTikTokLink:(url:string)=>request<{url:string}>('/admin/tiktok-link',{method:'POST',body:JSON.stringify({url})}),

  resolveTikTok:(url:string)=>request<{thumbnail_url:string;author_name?:string;available:boolean|null}>('/admin/tiktok-oembed',{method:'POST',body:JSON.stringify({url})}),

  getPeople: (admin = false) => request<{profiles: PersonProfile[]}>(admin ? '/admin/people' : '/people'),

  savePerson: (profile: Partial<PersonProfile>) => request<{profile:PersonProfile}>(`/admin/people${profile.id ? '/'+profile.id : ''}`, {method:profile.id ? 'PUT':'POST',body:JSON.stringify(profile)}),

  deletePerson: (id:string) => request('/admin/people/'+id,{method:'DELETE'}),

  consumeUsage: () => request<any>('/usage/consume', { method: 'POST' }),

  getUsageSettings: () => request<{ dailyMinutes: number; bindNetwork: boolean }>('/admin/usage-settings'),

  setUsageSettings: (value: { dailyMinutes: number; bindNetwork: boolean }) => request('/admin/usage-settings', { method: 'PUT', body: JSON.stringify(value) }),

  // Auth
  async register(body: { username: string; displayName: string; email: string; password: string; gender?: string; avatar?: string; banner?: string; acceptedTerms?: boolean }): Promise<AuthResponse> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  },


  async login(body: { identifier: string; password: string }): Promise<AuthResponse> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  },


  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },


  async recoverPassword(email: string): Promise<{ success: boolean; message: string; demoCode?: string }> {
    return request('/auth/recover', { method: 'POST', body: JSON.stringify({ email }) });
  },


  async resetPassword(body: { email: string; code: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) });
  },


  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return request('/users/me/profile', { method: 'PUT', body: JSON.stringify(updates) });
  },


  // Posts
  async getFeed(feedType?: 'for_you' | 'following'): Promise<{ posts: Post[] }> {
    const query = feedType === 'following' ? '?feed=following' : '';
    return request(`/posts${query}`);
  },


  async createPost(data: {
    media: { source_handle?:string;url: string; type: 'image' | 'video' | 'audio' | 'pdf' | 'gif'; filter?: string; fileName?: string; aspectRatio?: string; thumbnail?: string; coverTime?: number; focus?: { x: number; y: number; zoom?: number } }[];
    caption: string;
    location?: string;
    allowComments?: boolean;
    isTemporary?: boolean;
    durationHours?: number;
    expiresAt?: string;
    category?: string;
  }): Promise<{ post: Post }> {
    return request('/posts', { method: 'POST', body: JSON.stringify(data) });
  },


  async deletePost(postId: string): Promise<{ success: boolean; message: string }> {
    return request(`/posts/${postId}`, { method: 'DELETE' });
  },


  async toggleLikePost(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    return request(`/posts/${postId}/like`, { method: 'POST' });
  },


  async toggleSavePost(postId: string): Promise<{ isSaved: boolean }> {
    return request(`/posts/${postId}/save`, { method: 'POST' });
  },


  async getComments(postId: string): Promise<{ comments: Comment[] }> {
    return request(`/posts/${postId}/comments`);
  },


  async addComment(postId: string, text: string, parentId?: string): Promise<{ comment: Comment; commentsCount?: number }> {
    return request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ text, parentId }) });
  },


  async toggleLikeComment(commentId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    return request(`/comments/${commentId}/like`, { method: 'POST' });
  },


  async deleteComment(commentId: string): Promise<{ success: boolean; commentsCount?: number; postId?: string }> {
    return request(`/comments/${commentId}`, { method: 'DELETE' });
  },


  // Supabase Status & Config
  async getSupabaseStatus(): Promise<{
    status: 'connected' | 'misconfigured' | 'not_configured';
    configured: boolean;
    connected: boolean;
    url: string | null;
    tablesFound?: string[];
    tablesMissing?: string[];
    message: string;
    error?: string;
  }> {
    return request('/supabase/status');
  },


  async configureSupabase(data: { url: string; key: string; serviceRoleKey?: string }): Promise<{
    success: boolean;
    message: string;
    status: any;
  }> {
    return request('/supabase/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },


  async getSupabaseSchema(): Promise<string> {
    const res = await fetch('/api/supabase/schema');
    return res.text();
  }
};


