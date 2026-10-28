import type { DirectoryRequest } from '../shared/directory-requests';
import type { LegalDocumentVersion } from '../shared/legal-documents';
import type {DirectorySettings} from '../shared/directory-settings';
import type {EmailJob} from './directory-email';
import type {VerificationRequest} from '../shared/verification';
import type {TikTokCache} from './tiktok-oembed';
import type { PersonProfile } from '../shared/people';
import type { WelcomeConfig } from '../shared/welcome';
import { CLOUD } from './cloud-store';

import { DB_FILE, readDatabase, writeDatabase } from './storage';
const displayText = (value: string = '') => value.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, '');

export interface DBUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  avatar: string;
  gender?: 'feminino' | 'masculino' | 'outro';
  bio: string;
  banner: string;
  isPrivate: boolean;
  isVerified: boolean;
  isAdmin?: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: string;
  animeTitle: string;
  themeColor: string;
  website: string;
  createdAt: string;
  recoveryToken?: string;
  recoveryExpiresAt?: number;
  recoveryAttempts?: number;
  acceptedTerms?: boolean;
  acceptedTermsAt?: string;
}

export interface DBPost {
  id: string;
  userId: string;
  media: ({
    id: string;
    url: string;
    type: 'image' | 'video';
    filter?: string;
    aspectRatio?: string;
    thumbnail?: string;
    coverTime?: number;
    focus?: { x: number; y: number; zoom?: number };
  } & Partial<import('../shared/people').MediaOrigin>)[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  location?: string;
  allowComments: boolean;
  isTemporary?: boolean;
  expiresAt?: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface DBLike {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface DBSave {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface DBComment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  parentId?: string | null;
  createdAt: string;
}

export interface DBCommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

export interface DBFollow {
  id: string;
  followerId: string;
  followingId: string;
  status: 'accepted' | 'pending';
  createdAt: string;
}

export interface DBStory {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  textOverlay?: string;
  stickers?: string[];
  location?: string;
  mentions?: string[];
  filter?: string;
  createdAt: string;
  expiresAt: string;
}

export interface DBStoryView {
  id: string;
  storyId: string;
  userId: string;
  reaction?: string;
  createdAt: string;
}

export interface DBConversation {
  id: string;
  participantIds: string[];
  isGroup?: boolean;
  name?: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  creatorId?: string;
  adminIds?: string[];
  rules?: string;
  inviteCode?: string;
  durationMode?: 'permanent' | 'temporary';
  messageDurationHours?: number;
  messagesClearedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  replyToId?: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface DBNotification {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accept' | 'mention' | 'story_reaction' | 'message';
  targetId?: string;
  targetType?: 'post' | 'comment' | 'story' | 'user' | 'message';
  targetThumbnail?: string;
  textSnippet?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DBReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'post' | 'user';
  reason: string;
  createdAt: string;
}

export interface DBBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface DBMute {
  id: string;
  muterId: string;
  mutedId: string;
  createdAt: string;
}

export interface DBSyncpaySettings {
  webhookUrl?: string;
  clientId: string;
  clientSecret: string;
  webhookToken: string;
  pixKey?: string;
  enabled: boolean;
  price: number;
}

export interface DBPaymentCharge {
  identifier: string; userId: string; amount: number; pixCode: string;
  status: string; createdAt: number; checkedAt?: number; grantedAt?: number;
}
export interface DatabaseSchema {
  sourceSnapshots?:{profileId:string;snapshot:import('../shared/profile-editorial').SourceSnapshot}[];
  accessLogs?:import('./access-log').AccessLog[];
  legalAudit?: import('./legal-audit').LegalAuditEntry[];
  directorySettings?: Partial<DirectorySettings>;
  directorySettingsAudit?: {by:string;at:string;settings:DirectorySettings}[];
  directoryEmailOutbox?: EmailJob[];
  verificationRequests?: VerificationRequest[];
  tiktokOembedCache?: Record<string,TikTokCache>;
  legalDocumentVersions?: LegalDocumentVersion[];
  directoryRequests?: DirectoryRequest[];
  blueLabLinks?: Record<string,string[]>;
  peopleProfiles?: PersonProfile[];
  engagementRestored?: boolean;
  welcomeCarousel?: WelcomeConfig;
  paymentCharges?: DBPaymentCharge[];
  usageSettings?: { dailyMinutes: number; bindNetwork: boolean };
  usageBuckets?: Record<string, { startedAt: number; usedMs: number; leaseUntil: number }>;
  authSecret?: string;
  users: DBUser[];
  posts: DBPost[];
  likes: DBLike[];
  saves: DBSave[];
  comments: DBComment[];
  commentLikes: DBCommentLike[];
  follows: DBFollow[];
  stories: DBStory[];
  storyViews: DBStoryView[];
  conversations: DBConversation[];
  messages: DBMessage[];
  notifications: DBNotification[];
  reports: DBReport[];
  blocks: DBBlock[];
  mutes: DBMute[];
  syncpaySettings?: DBSyncpaySettings;
}

let db: DatabaseSchema = {
  users: [],
  posts: [],
  likes: [],
  saves: [],
  comments: [],
  commentLikes: [],
  follows: [],
  stories: [],
  storyViews: [],
  conversations: [],
  messages: [],
  notifications: [],
  reports: [],
  blocks: [],
  mutes: [],
  syncpaySettings: {
    clientId: '',
    clientSecret: '',
    webhookToken: '',
    pixKey: '',
    enabled: true,
    price: 9.99,
  },
};

function saveDB() { writeDatabase(db); }

export function loadDB(): DatabaseSchema {
  db = readDatabase() as DatabaseSchema;
  // Add missing optional collections in memory only; never inject sample users/posts/groups.
  for (const key of ['likes','saves','comments','commentLikes','follows','stories','storyViews','conversations','messages','notifications','reports','blocks','mutes'] as const) {
    if (db[key] === undefined) (db as any)[key] = [];
  }
  console.info('[storage] Existing database loaded', { file: DB_FILE, users: db.users.length, posts: db.posts.length });
  return db;
}



// Queries & Mutators
export const DB = {
  get() {
    return db;
  },
  save() {
    saveDB();
  },
  // Users
  findUserById(id: string) {
    return db.users.find(u => u.id === id);
  },
  findUserByUsername(username: string) {
    if (!username) return undefined;
    const lower = username.toLowerCase();
    const found = db.users.find(u => u.username.toLowerCase() === lower);
    if (found) return found;
    // Fallback aliases
    if (lower === 'clara_m' || lower === 'clara') {
      return db.users.find(u => u.id === 'u_sakura') || db.users[0];
    }
    if (lower === 'mariana_v' || lower === 'mariana') {
      return db.users.find(u => u.id === 'u_miku') || db.users[1];
    }
    return undefined;
  },
  findUserByEmail(email: string) {
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  createUser(user: DBUser) {
    db.users.push(user);
    saveDB();
    return user;
  },
  updateUser(id: string, updates: Partial<DBUser>) {
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...updates };
      saveDB();
      return db.users[idx];
    }
    return null;
  },
  deleteUser(id: string) {
    db.users = db.users.filter(u => u.id !== id);
    db.posts = db.posts.filter(p => p.userId !== id);
    db.likes = db.likes.filter(l => l.userId !== id);
    db.saves = db.saves.filter(s => s.userId !== id);
    db.comments = db.comments.filter(c => c.userId !== id);
    db.follows = db.follows.filter(f => f.followerId !== id && f.followingId !== id);
    db.stories = db.stories.filter(s => s.userId !== id);
    db.notifications = db.notifications.filter(n => n.recipientId !== id && n.actorId !== id);
    db.messages = db.messages.filter(m => m.senderId !== id);
    saveDB();
  },

  // Hydrate user view
  toPublicUser(u: DBUser, currentUserId?: string) {
    const followersCount = db.follows.filter(f => f.followingId === u.id && f.status === 'accepted').length;
    const followingCount = db.follows.filter(f => f.followerId === u.id && f.status === 'accepted').length;
    const postsCount = db.posts.filter(p => p.userId === u.id).length;

    let isFollowing = false;
    let isRequested = false;
    let isBlocked = false;
    let isMuted = false;

    if (currentUserId && currentUserId !== u.id) {
      const followRel = db.follows.find(f => f.followerId === currentUserId && f.followingId === u.id);
      if (followRel) {
        if (followRel.status === 'accepted') isFollowing = true;
        if (followRel.status === 'pending') isRequested = true;
      }
      isBlocked = db.blocks.some(b => b.blockerId === currentUserId && b.blockedId === u.id);
      isMuted = db.mutes.some(m => m.muterId === currentUserId && m.mutedId === u.id);
    }

    const isSuperAdmin = u.isAdmin === true;

    return {
      id: u.id,
      username: u.username,
      displayName: displayText(u.displayName),

      avatar: u.avatar,
      gender: u.gender,
      bio: displayText(u.bio),
      banner: u.banner,
      isPrivate: u.isPrivate,
      isVerified: Boolean(u.isVerified || isSuperAdmin),
      isAdmin: isSuperAdmin,
      isPremium: Boolean(isSuperAdmin || (u.isPremium && (!u.premiumExpiresAt || Date.parse(u.premiumExpiresAt) > Date.now()))),
      premiumExpiresAt: u.premiumExpiresAt,
      animeTitle: displayText(u.animeTitle),
      themeColor: u.themeColor,
      website: u.website,
      createdAt: u.createdAt,
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
      isRequested,
      isBlocked,
      isMuted,
    };
  },

  // Permanent 1-Hour Cleanup for Ephemeral content
  cleanEphemeral1HourContent(maxAgeMs = 3600000) {
    // Intentionally disabled; retained for future feature reactivation.
    return { deletedPosts: 0, deletedMessages: 0, deletedStories: 0, deletedGroups: 0 };
  },

  // Posts
  toPublicPost(p: DBPost, currentUserId?: string) {
    const author = this.findUserById(p.userId);
    const authorPublic = author ? this.toPublicUser(author, currentUserId) : {
      id: p.userId,
      username: 'usuario_deletado',
      displayName: 'Usuário',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isPrivate: false,
      createdAt: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0
    };

    const likesCount = db.likes.filter(l => l.postId === p.id).length;
    const commentsCount = db.comments.filter(c => c.postId === p.id).length;
    const savesCount = db.saves.filter(s => s.postId === p.id).length;

    const isLiked = currentUserId ? db.likes.some(l => l.postId === p.id && l.userId === currentUserId) : false;
    const isSaved = currentUserId ? db.saves.some(s => s.postId === p.id && s.userId === currentUserId) : false;

    return {
      ...p,
      caption: displayText(p.caption).replace(/@[\w.]+/g, '').trim(),
      userId: '',
      user: { id: '', username: '', displayName: '', email: '', avatar: '', isPrivate: false, createdAt: '', followersCount: 0, followingCount: 0, postsCount: 0 },
      mentions: [],
      location: undefined,
      isTemporary: false,
      expiresAt: undefined,
      likesCount,
      commentsCount,
      savesCount,
      isLiked,
      isSaved,
    };
  },

  // Check if current user can view a target user's private content
  canViewUserContent(targetUserId: string, currentUserId?: string) {
    if (this.findUserById(targetUserId)?.isAdmin) return true;
    if (targetUserId === currentUserId) return true;
    const targetUser = this.findUserById(targetUserId);
    if (!targetUser) return false;
    if (!targetUser.isPrivate) return true;
    if (!currentUserId) return false;
    return db.follows.some(f => f.followerId === currentUserId && f.followingId === targetUserId && f.status === 'accepted');
  }
};

// Auto load DB on module import
if (!CLOUD) loadDB();


