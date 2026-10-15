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
  getBlueLab: (admin=false) => request<{links:Record<string,string[]>}>(admin?'/admin/blue-lab':'/blue-lab'),
  saveBlueLab: (links:Record<string,string[]>) => request<{links:Record<string,string[]>}>('/admin/blue-lab',{method:'PUT',body:JSON.stringify({links})}),
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

  async updatePassword(body: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request('/auth/update-password', { method: 'POST', body: JSON.stringify(body) });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/auth/update-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return request('/auth/delete-account', { method: 'DELETE' });
  },

  // Users & Profiles
  async getUserProfile(username: string): Promise<{ user: User; posts: Post[]; canViewContent: boolean }> {
    const profileRes = await request<{ user: User; canViewContent: boolean }>(`/users/${encodeURIComponent(username)}`);
    let posts: Post[] = [];
    if (profileRes.canViewContent) {
      try {
        const postsRes = await request<{ posts: Post[] }>(`/posts/user/${encodeURIComponent(username)}`);
        posts = postsRes.posts || [];
      } catch (e) {}
    }
    return { ...profileRes, posts };
  },

  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return request('/users/me/profile', { method: 'PUT', body: JSON.stringify(updates) });
  },

  async followUser(userId: string): Promise<{ status: 'accepted' | 'pending'; isRequested?: boolean; user: User }> {
    const res = await request<{ status: 'accepted' | 'pending'; user: User }>(`/users/${userId}/follow`, { method: 'POST' });
    return { ...res, isRequested: res.status === 'pending' };
  },

  async unfollowUser(userId: string): Promise<{ success: boolean; user: User | null }> {
    return request(`/users/${userId}/unfollow`, { method: 'POST' });
  },

  async getPendingFollowRequests(): Promise<{ requests: FollowRequest[] }> {
    return request('/users/follow-requests/pending');
  },

  async acceptFollowRequest(requestId: string): Promise<{ success: boolean }> {
    return request(`/users/follow-requests/${requestId}/accept`, { method: 'POST' });
  },

  async rejectFollowRequest(requestId: string): Promise<{ success: boolean }> {
    return request(`/users/follow-requests/${requestId}/reject`, { method: 'POST' });
  },

  async getFollowers(userId: string): Promise<{ followers: User[] }> {
    return request(`/users/${userId}/followers`);
  },

  async getFollowing(userId: string): Promise<{ following: User[] }> {
    return request(`/users/${userId}/following`);
  },

  async blockUser(userId: string): Promise<{ success: boolean }> {
    return request(`/users/${userId}/block`, { method: 'POST' });
  },

  async unblockUser(userId: string): Promise<{ success: boolean }> {
    return request(`/users/${userId}/unblock`, { method: 'POST' });
  },

  async getBlockedUsers(): Promise<{ blockedUsers: User[] }> {
    return request('/users/me/blocked');
  },

  async report(targetId: string, targetType: 'post' | 'user', reason: string): Promise<{ success: boolean; message: string }> {
    return request('/reports', { method: 'POST', body: JSON.stringify({ targetId, targetType, reason }) });
  },

  async reportContent(body: { targetType: 'post' | 'user'; targetId: string; reason: string; description?: string }): Promise<{ success: boolean; message: string }> {
    return request('/reports', { method: 'POST', body: JSON.stringify(body) });
  },

  // Posts
  async getFeed(feedType?: 'for_you' | 'following'): Promise<{ posts: Post[] }> {
    const query = feedType === 'following' ? '?feed=following' : '';
    return request(`/posts${query}`);
  },

  async getExplorePosts(): Promise<{ posts: Post[] }> {
    return request('/posts/explore/feed');
  },

  async getReels(): Promise<{ reels: Post[] }> {
    return request('/posts/reels/feed');
  },

  async getSavedPosts(): Promise<{ posts: Post[] }> {
    return request('/posts/saved/all');
  },

  async getHashtagPosts(tag: string): Promise<{ tag: string; count: number; posts: Post[] }> {
    return request(`/posts/hashtag/${encodeURIComponent(tag)}`);
  },

  async getUserPosts(username: string): Promise<{ posts: Post[]; isPrivateLocked: boolean }> {
    return request(`/posts/user/${encodeURIComponent(username)}`);
  },

  async createPost(data: {
    media: { url: string; type: 'image' | 'video' | 'audio' | 'pdf' | 'gif'; filter?: string; fileName?: string; aspectRatio?: string; thumbnail?: string; coverTime?: number; focus?: { x: number; y: number; zoom?: number } }[];
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

  // Stories
  async getStories(): Promise<{ storyGroups: StoryGroup[] }> {
    return request('/stories');
  },

  async createStory(data: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    textOverlay?: string;
    stickers?: string[];
    location?: string;
    mentions?: string[];
    filter?: string;
  }): Promise<{ story: any }> {
    return request('/stories', { method: 'POST', body: JSON.stringify(data) });
  },

  async viewStory(storyId: string): Promise<{ success: boolean }> {
    return request(`/stories/${storyId}/view`, { method: 'POST' });
  },

  async reactToStory(storyId: string, reaction: string): Promise<{ success: boolean }> {
    return request(`/stories/${storyId}/react`, { method: 'POST', body: JSON.stringify({ reaction }) });
  },

  async deleteStory(storyId: string): Promise<{ success: boolean }> {
    return request(`/stories/${storyId}`, { method: 'DELETE' });
  },

  // Conversations & Messages
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return request('/conversations');
  },

  async startConversation(recipientId: string): Promise<{ conversation: Conversation }> {
    return request('/conversations', { method: 'POST', body: JSON.stringify({ recipientId }) });
  },

  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    return request(`/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: string, data: { text?: string; mediaUrl?: string; mediaType?: 'image' | 'video'; replyToId?: string }): Promise<{ message: Message }> {
    return request(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return request(`/messages/${messageId}`, { method: 'DELETE' });
  },

  // Groups
  async getPublicGroups(): Promise<{ groups: Conversation[] }> {
    return request('/groups/public');
  },

  async createGroup(data: {
    name: string;
    description?: string;
    avatar?: string;
    isPublic?: boolean;
    memberIds?: string[];
    rules?: string;
    durationMode?: 'permanent' | 'temporary';
    messageDurationHours?: number;
  }): Promise<{ group: Conversation }> {
    return request('/groups', { method: 'POST', body: JSON.stringify(data) });
  },

  async getGroup(groupId: string): Promise<{ group: Conversation }> {
    return request(`/groups/${groupId}`);
  },

  async joinGroup(groupId: string, inviteCode?: string): Promise<{ group: Conversation }> {
    return request(`/groups/${groupId}/join`, { method: 'POST', body: JSON.stringify({ inviteCode }) });
  },

  async leaveGroup(groupId: string): Promise<{ success: boolean }> {
    return request(`/groups/${groupId}/leave`, { method: 'POST' });
  },

  async addGroupMembers(groupId: string, userIds: string[]): Promise<{ group: Conversation }> {
    return request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userIds }) });
  },

  async removeGroupMember(groupId: string, userId: string): Promise<{ group: Conversation }> {
    return request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  async toggleGroupAdmin(groupId: string, userId: string): Promise<{ group: Conversation }> {
    return request(`/groups/${groupId}/admins/${userId}`, { method: 'POST' });
  },

  async updateGroup(groupId: string, updates: Partial<Conversation>): Promise<{ group: Conversation }> {
    return request(`/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(updates) });
  },

  async clearGroupMessages(groupId: string): Promise<{ success: boolean; message: string }> {
    return request(`/groups/${groupId}/clear-messages`, { method: 'POST' });
  },

  async deleteGroup(groupId: string): Promise<{ success: boolean }> {
    return request(`/groups/${groupId}`, { method: 'DELETE' });
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    return request('/notifications');
  },

  async markNotificationRead(notifId: string): Promise<{ success: boolean }> {
    return request(`/notifications/${notifId}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request('/notifications/read-all', { method: 'POST' });
  },

  // Search
  async search(query: string): Promise<SearchResult> {
    return request(`/search?q=${encodeURIComponent(query)}`);
  },

  // Media Upload
  async uploadFile(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload', { method: 'POST', body: formData });
  },

  async uploadBase64(base64Data: string, filename?: string): Promise<{ url: string; type: 'image' | 'video' }> {
    return request('/upload', {
      method: 'POST',
      body: JSON.stringify({ data: base64Data, filename }),
    });
  },

  // Gemini AI Assistant
  async getKawaiiCaption(theme: string, style?: string): Promise<{ caption: string }> {
    return request('/ai/kawaii-caption', {
      method: 'POST',
      body: JSON.stringify({ theme, style }),
    });
  },

  // Ephemeral 1-Hour Auto-Cleanup
  async cleanExpiredContent(): Promise<{ success: boolean; deletedCount: { posts: number; messages: number; stories: number; groups: number }; message: string }> {
    return request('/ephemeral/cleanup', { method: 'POST' });
  },

  async getEphemeralSettings(): Promise<{ ephemeral1HourMode: boolean; expiresAfterMinutes: number }> {
    return request('/ephemeral/settings');
  },

  async setEphemeralSettings(enabled: boolean): Promise<{ success: boolean; ephemeral1HourMode: boolean }> {
    return request('/ephemeral/settings', { method: 'POST', body: JSON.stringify({ enabled }) });
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

  // Compatibility for the alternate overlay: server quota and signed device cookie remain authoritative.
  async pingUsage(_deviceId: string) {
    const value = await request<any>('/usage/consume', { method: 'POST', body: '{}' });
    const limit = value.dailyLimitMinutes || 0;
    return { timeUsedSeconds: value.timeUsedSeconds || 0, dailyLimitMinutes: limit,
      isLimitReached: value.blocked, isUnlimited: value.unlimited, isAdmin: value.isAdmin || false,
      secondsRemaining: Math.ceil((value.remainingMs || 0) / 1000), resetAt: value.resetAt };
  },
  async getAdminUsageLimit() {
    const value = await request<any>('/admin/usage-settings');
    return { dailyTimeLimitMinutes: value.dailyMinutes };
  },
  async setAdminUsageLimit(limitMinutes: number) {
    const current = await request<any>('/admin/usage-settings');
    const value = await request<any>('/admin/usage-settings', { method: 'PUT', body: JSON.stringify({ dailyMinutes: limitMinutes, bindNetwork: current.bindNetwork }) });
    return { success: true, dailyTimeLimitMinutes: value.dailyMinutes, message: 'Limite atualizado.' };
  },

  async getSupabaseSchema(): Promise<string> {
    const res = await fetch('/api/supabase/schema');
    return res.text();
  },
};
