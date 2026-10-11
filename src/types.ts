export type UserGender = 'feminino' | 'masculino' | 'outro';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  gender?: UserGender;
  bio?: string;
  banner?: string;
  isPrivate: boolean;
  isVerified?: boolean;
  isAdmin?: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: string;
  animeTitle?: string;
  themeColor?: string;
  website?: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isRequested?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
  acceptedTerms?: boolean;
  acceptedTermsAt?: string;
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'gif';
  filter?: string;
  aspectRatio?: string;
  thumbnail?: string;
  fileName?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  media: PostMedia[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  location?: string;
  allowComments: boolean;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isTemporary?: boolean;
  expiresAt?: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  textOverlay?: string;
  stickers?: string[];
  location?: string;
  mentions?: string[];
  filter?: string;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  isViewed?: boolean;
  reactionsCount?: number;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnseen: boolean;
  latestCreatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: User;
  text: string;
  parentId?: string | null;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  replies?: Comment[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  replyToId?: string;
  replyTo?: Message;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: User[];
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
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  createdAt?: string;
}

export type NotificationType =
  | 'like'
  | 'like_post'
  | 'like_comment'
  | 'comment'
  | 'follow'
  | 'follow_request'
  | 'follow_accept'
  | 'mention'
  | 'story_reaction'
  | 'message'
  | 'group_invite'
  | 'group_join';

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  actor: User;
  type: NotificationType;
  targetId?: string;
  targetType?: 'post' | 'comment' | 'story' | 'user' | 'message' | 'group';
  targetThumbnail?: string;
  textSnippet?: string;
  text?: string;
  data?: { requestId?: string; groupId?: string; [key: string]: any };
  isRead: boolean;
  createdAt: string;
}

export interface FollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  requester: User;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchResult {
  users: User[];
  posts: Post[];
  hashtags: { tag: string; count: number }[];
  groups?: Conversation[];
}
