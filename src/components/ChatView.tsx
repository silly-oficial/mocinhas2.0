import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageCircle,
  Send,
  Image as ImageIcon,
  Sparkles,
  Smile,
  ArrowLeft,
  Check,
  CheckCheck,
  Users,
  Plus,
  Globe,
  Lock,
  Search,
  MoreVertical,
  UserPlus,
  LogOut,
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  Info,
  X,
  Reply,
  ChevronDown,
  Copy,
  Check as CheckIcon,
  Upload,
  Clock,
  Infinity as InfinityIcon,
  Eraser,
} from 'lucide-react';
import { Conversation, Message, User } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AutoTranslatedText } from './AutoTranslatedText';
import { sounds } from '../utils/sound';

interface ChatViewProps {
  initialUserId?: string;
  onNavigateUser: (username: string) => void;
  onOpenAuth?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  initialUserId,
  onNavigateUser,
  onOpenAuth,
}) => {
  const { user: currentUser, setUnreadMessagesCount } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [publicGroups, setPublicGroups] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isLoadingPublicGroups, setIsLoadingPublicGroups] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [activeTab, setActiveTab] = useState<'dms' | 'my_groups' | 'explore_groups'>('dms');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Replying state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Modals & Panels
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Group Form state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=80');
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [groupRules, setGroupRules] = useState('');
  const [groupDurationMode, setGroupDurationMode] = useState<'permanent' | 'temporary'>('permanent');
  const [groupDurationHours, setGroupDurationHours] = useState<number>(24);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isClearingMessages, setIsClearingMessages] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const updateGroupAvatarInputRef = useRef<HTMLInputElement>(null);

  // Scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const emojiList = [
    '👍', '❤️', '🔥', '✨', '👏', '🎉', '😊', '🙌',
    '💬', '💡', '🌟', '🚀', '💯', '🙏', '✌️', '😎',
  ];

  const groupAvatarPresets = [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=80',
  ];

  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Real-time Event Listener & Fast Background Polling for instant DM and Group updates
  useEffect(() => {
    if (!currentUser) return;

    // 1. Custom Realtime Message Event Listener (from SSE & Supabase)
    const handleRealtimeMessage = (e: any) => {
      const msg = e.detail as Message & { conversationId?: string; sender_id?: string; conversation_id?: string };
      const targetConvId = msg.conversationId || msg.conversation_id;
      const senderId = msg.senderId || msg.sender_id;

      if (!targetConvId) return;

      // If this message belongs to the open conversation
      if (activeConvRef.current && activeConvRef.current.id === targetConvId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg as Message];
        });
        setTimeout(() => {
          scrollToBottom('smooth');
        }, 60);
      }

      // Update conversations list with last message and unread count
      setConversations(prev => {
        const exists = prev.find(c => c.id === targetConvId);
        if (!exists) {
          // If a new conversation was created for this user, reload
          loadConversations();
          return prev;
        }
        return prev.map(c => {
          if (c.id === targetConvId) {
            const isCurrentActive = activeConvRef.current?.id === targetConvId;
            return {
              ...c,
              lastMessage: msg as Message,
              updatedAt: msg.createdAt || new Date().toISOString(),
              unreadCount: isCurrentActive || senderId === currentUser.id ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    window.addEventListener('mocinhas:realtime-message', handleRealtimeMessage);

    // 2. Active Conversation Polling Interval (every 2.5s) for instant real-time sync
    const activeMsgPoll = setInterval(async () => {
      const currentActiveId = activeConvRef.current?.id;
      if (!currentActiveId) return;
      try {
        const res = await api.getMessages(currentActiveId);
        if (res?.messages) {
          setMessages(prev => {
            // Check if length or last message changed
            if (prev.length === res.messages.length && prev[prev.length - 1]?.id === res.messages[res.messages.length - 1]?.id) {
              return prev;
            }
            // Check if we got new messages from another user
            const hasNewFromOther = res.messages.some(
              m => m.senderId !== currentUser.id && !prev.some(p => p.id === m.id)
            );
            if (hasNewFromOther) {
              sounds.playMessagePop();
              setTimeout(() => scrollToBottom('smooth'), 60);
            }
            return res.messages;
          });
        }
      } catch (e) {}
    }, 2500);

    // 3. Conversations List Polling Interval (every 5s)
    const convsPoll = setInterval(async () => {
      try {
        const res = await api.getConversations();
        if (res?.conversations) {
          setConversations(res.conversations);
        }
      } catch (e) {}
    }, 5000);

    return () => {
      window.removeEventListener('mocinhas:realtime-message', handleRealtimeMessage);
      clearInterval(activeMsgPoll);
      clearInterval(convsPoll);
    };
  }, [currentUser]);

  // Load conversations when user is logged in
  useEffect(() => {
    if (currentUser) {
      loadConversations();
      loadPublicGroups();
      loadSuggestedUsers();
    } else {
      setIsLoadingConvs(false);
      setConversations([]);
      setActiveConv(null);
    }
  }, [currentUser]);

  const loadConversations = async () => {
    if (!currentUser) return;
    setIsLoadingConvs(true);
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);

      if (initialUserId) {
        const found = res.conversations.find(
          c => !c.isGroup && c.participants.some(p => p.id === initialUserId)
        );
        if (found) {
          openConversation(found);
        } else {
          startNewConversation(initialUserId);
        }
      }
    } catch (e) {
      // Handled silently
    } finally {
      setIsLoadingConvs(false);
    }
  };

  const loadPublicGroups = async () => {
    setIsLoadingPublicGroups(true);
    try {
      const res = await api.getPublicGroups();
      setPublicGroups(res.groups || []);
    } catch (e) {
      // Handled silently
    } finally {
      setIsLoadingPublicGroups(false);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      const res = await api.search('');
      setAvailableUsers((res.users || []).filter(u => u.id !== currentUser?.id));
    } catch (e) {}
  };

  const startNewConversation = async (userId: string) => {
    try {
      const res = await api.startConversation(userId);
      setConversations(prev => [res.conversation, ...prev.filter(c => c.id !== res.conversation.id)]);
      openConversation(res.conversation);
    } catch (e) {
      alert('Erro ao iniciar conversa');
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setIsLoadingMsgs(true);
    setReplyingTo(null);
    setShowGroupInfoModal(false);
    try {
      const res = await api.getMessages(conv.id);
      setMessages(res.messages || []);

      if (conv.unreadCount > 0) {
        setUnreadMessagesCount(prev => Math.max(0, prev - conv.unreadCount));
        setConversations(prev =>
          prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
        );
      }
      setTimeout(() => {
        scrollToBottom('auto');
      }, 50);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMsgs(false);
    }
  };

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isUp);
  };

  const handleSendMessage = async (e?: React.FormEvent, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !mediaUrl) || !activeConv || isSending) return;

    const textToSend = inputText.trim();
    const replyId = replyingTo?.id;

    setIsSending(true);
    setInputText('');
    setReplyingTo(null);
    setShowStickers(false);

    try {
      const res = await api.sendMessage(activeConv.id, {
        text: textToSend || undefined,
        mediaUrl,
        mediaType,
        replyToId: replyId,
      });

      sounds.playMessagePop();
      setMessages(prev => [...prev, res.message]);

      // Update conversation in list
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConv.id
            ? {
                ...c,
                lastMessage: res.message,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
    } catch (e) {
      alert('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (activeConv) {
      api.sendMessage(activeConv.id, { text: emoji }).then(res => {
        sounds.playMessagePop();
        setMessages(prev => [...prev, res.message]);
        setShowStickers(false);
        setTimeout(() => {
          scrollToBottom('smooth');
        }, 50);
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    try {
      const uploadRes = await api.uploadFile(file);
      const isVideo = file.type.startsWith('video');
      handleSendMessage(undefined, uploadRes.url, isVideo ? 'video' : 'image');
    } catch (err) {
      alert('Erro ao enviar mídia');
    }
  };

  // Group Handlers
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || isCreatingGroup) return;

    setIsCreatingGroup(true);
    try {
      const res = await api.createGroup({
        name: groupName.trim(),
        description: groupDesc.trim() || undefined,
        avatar: groupAvatar,
        isPublic: groupIsPublic,
        memberIds: selectedMemberIds,
        rules: groupRules.trim() || undefined,
        durationMode: groupDurationMode,
        messageDurationHours: groupDurationHours,
      });

      sounds.playSparkle();
      setConversations(prev => [res.group, ...prev]);
      setActiveConv(res.group);
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMemberIds([]);
      setGroupRules('');
      setGroupDurationMode('permanent');
      setGroupDurationHours(24);
      loadConversations();
      loadPublicGroups();
      openConversation(res.group);
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar grupo');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinGroup = async (group: Conversation) => {
    try {
      const res = await api.joinGroup(group.id);
      sounds.playSparkle();
      setConversations(prev => {
        const filtered = prev.filter(c => c.id !== res.group.id);
        return [res.group, ...filtered];
      });
      loadPublicGroups();
      openConversation(res.group);
    } catch (err: any) {
      alert(err?.message || 'Erro ao entrar no grupo');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Deseja realmente sair deste grupo?')) return;
    try {
      await api.leaveGroup(groupId);
      setConversations(prev => prev.filter(c => c.id !== groupId));
      if (activeConv?.id === groupId) {
        setActiveConv(null);
      }
      setShowGroupInfoModal(false);
      loadPublicGroups();
    } catch (err: any) {
      alert(err?.message || 'Erro ao sair do grupo');
    }
  };

  const handleAddMembers = async () => {
    if (!activeConv || selectedMemberIds.length === 0) return;
    try {
      const res = await api.addGroupMembers(activeConv.id, selectedMemberIds);
      setActiveConv(res.group);
      setConversations(prev => prev.map(c => (c.id === res.group.id ? res.group : c)));
      setShowAddMembersModal(false);
      setSelectedMemberIds([]);
      sounds.playSparkle();
    } catch (err: any) {
      alert(err?.message || 'Erro ao adicionar membros');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeConv || !confirm('Remover esta usuária do grupo?')) return;
    try {
      const res = await api.removeGroupMember(activeConv.id, userId);
      setActiveConv(res.group);
      setConversations(prev => prev.map(c => (c.id === res.group.id ? res.group : c)));
    } catch (err: any) {
      alert(err?.message || 'Erro ao remover membro');
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    if (!activeConv) return;
    try {
      const res = await api.toggleGroupAdmin(activeConv.id, userId);
      setActiveConv(res.group);
      setConversations(prev => prev.map(c => (c.id === res.group.id ? res.group : c)));
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar permissão');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Excluir este grupo permanentemente? Todas as mensagens serão perdidas.')) return;
    try {
      await api.deleteGroup(groupId);
      setConversations(prev => prev.filter(c => c.id !== groupId));
      if (activeConv?.id === groupId) {
        setActiveConv(null);
      }
      setShowGroupInfoModal(false);
      loadPublicGroups();
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir grupo');
    }
  };

  const handleGroupAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('A foto deve ter no máximo 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setGroupAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateGroupDuration = async (mode: 'permanent' | 'temporary', hours: number) => {
    if (!activeConv) return;
    setIsUpdatingGroup(true);
    try {
      const res = await api.updateGroup(activeConv.id, {
        durationMode: mode,
        messageDurationHours: hours,
      });
      setActiveConv(res.group);
      setConversations(prev => prev.map(c => (c.id === res.group.id ? res.group : c)));
      sounds.playSparkle();
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar duração do grupo');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleUpdateGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('A foto deve ter no máximo 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      try {
        const res = await api.updateGroup(activeConv.id, { avatar: result });
        setActiveConv(res.group);
        setConversations(prev => prev.map(c => (c.id === res.group.id ? res.group : c)));
        sounds.playSparkle();
      } catch (err: any) {
        alert(err?.message || 'Erro ao atualizar foto do grupo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearGroupMessages = async () => {
    if (!activeConv) return;
    if (
      !confirm(
        'Deseja limpar as mensagens deste grupo? As mensagens anteriores serão excluídas, mas o grupo e seus participantes continuarão ativos!'
      )
    ) {
      return;
    }
    setIsClearingMessages(true);
    try {
      await api.clearGroupMessages(activeConv.id);
      setMessages([]);
      loadConversations();
      sounds.playSparkle();
    } catch (err: any) {
      alert(err?.message || 'Erro ao limpar mensagens do grupo');
    } finally {
      setIsClearingMessages(false);
    }
  };

  const copyInviteLink = () => {
    if (!activeConv?.inviteCode) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/?joinGroup=${activeConv.id}&code=${activeConv.inviteCode}`
    );
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtered lists
  const dmsList = useMemo(() => {
    return conversations.filter(c => !c.isGroup && matchesSearch(c));
  }, [conversations, searchQuery]);

  const myGroupsList = useMemo(() => {
    return conversations.filter(c => c.isGroup && matchesSearch(c));
  }, [conversations, searchQuery]);

  const exploreGroupsList = useMemo(() => {
    return publicGroups.filter(g => {
      const isAlreadyMember = g.participantIds?.includes(currentUser?.id || '');
      const match = matchesSearch(g);
      return !isAlreadyMember && match;
    });
  }, [publicGroups, currentUser, searchQuery]);

  function matchesSearch(c: Conversation) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (c.isGroup) {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    const other = c.participants?.find(p => p.id !== currentUser?.id);
    return (
      other?.displayName.toLowerCase().includes(q) ||
      other?.username.toLowerCase().includes(q)
    );
  }

  // Grouping messages by sender and timestamp (within 5 min window)
  interface MessageGroup {
    senderId: string;
    sender?: User;
    messages: Message[];
    timestamp: string;
  }

  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    messages.forEach((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const sameSender = prevMsg && prevMsg.senderId === msg.senderId;
      const timeDiff = prevMsg
        ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
        : Infinity;
      const within5Min = timeDiff < 5 * 60 * 1000;

      if (sameSender && within5Min && groups.length > 0) {
        groups[groups.length - 1].messages.push(msg);
      } else {
        groups.push({
          senderId: msg.senderId,
          sender: msg.sender,
          messages: [msg],
          timestamp: msg.createdAt,
        });
      }
    });
    return groups;
  }, [messages]);

  if (!currentUser) {
    return (
      <div className="pb-20 max-w-xl mx-auto pt-6 text-center animate-fade-in">
        <div className="p-8 sm:p-10 rounded-[28px] bg-[#12121B]/90 border border-white/10 shadow-md shadow-black/30 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white text-black flex items-center justify-center text-white shadow-md shadow-white/5">
            <MessageCircle className="w-7 h-7" />
          </div>
          <h3 className="font-heading text-xl font-bold text-white">
            Mensagens Diretas & Grupos
          </h3>
          <p className="text-sm text-zinc-300/80 max-w-md mx-auto leading-relaxed">
            Conecte-se com outras mocinhas, crie e participe de grupos públicos ou privados, compartilhe fotos e converse em tempo real.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenAuth}
              className="px-6 py-2.5 rounded-2xl bg-white text-black hover:opacity-95 text-white font-bold text-xs shadow-md shadow-white/5 transition-all cursor-pointer"
            >
              Entrar na Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const otherParticipant = !activeConv?.isGroup
    ? activeConv?.participants?.find(p => p.id !== currentUser?.id)
    : null;

  const isGroupAdmin =
    activeConv?.isGroup &&
    (activeConv.creatorId === currentUser?.id ||
      activeConv.adminIds?.includes(currentUser?.id || ''));

  const isGroupCreator = activeConv?.isGroup && activeConv.creatorId === currentUser?.id;

  return (
    <div className="pb-20 max-w-5xl mx-auto animate-fade-in">
      <div className="w-full h-[82vh] sm:h-[680px] rounded-[28px] bg-[#12121B]/90 border border-white/10 shadow-xl shadow-black/40 flex overflow-hidden">
        
        {/* LEFT PANEL: CONVERSATIONS / GROUPS DIRECTORY */}
        <div
          className={`w-full sm:w-84 border-r border-white/10 flex flex-col bg-[#0E0E15]/95 shrink-0 ${
            activeConv ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Top Header & New Group Button */}
          <div className="p-3.5 px-4 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white text-black flex items-center justify-center text-white shadow-xs">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h2 className="font-heading text-sm font-bold text-white">
                Mensagens
              </h2>
            </div>

            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Criar Novo Grupo"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Criar Grupo</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-2.5 px-3 border-b border-white/5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar conversas..."
                className="w-full bg-[#171724] text-xs text-white placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Navigation Tabs (DMs | Meus Grupos | Descobrir) */}
          <div className="grid grid-cols-3 p-1.5 bg-[#171724] border-b border-white/10 text-xs font-bold text-zinc-300/70">
            <button
              onClick={() => setActiveTab('dms')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'dms'
                  ? 'bg-white text-black font-extrabold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>DMs</span>
            </button>
            <button
              onClick={() => setActiveTab('my_groups')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'my_groups'
                  ? 'bg-white text-black font-extrabold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Grupos</span>
            </button>
            <button
              onClick={() => setActiveTab('explore_groups')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'explore_groups'
                  ? 'bg-white text-black font-extrabold shadow-xs'
                  : 'hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Explorar</span>
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* DMs TAB */}
            {activeTab === 'dms' && (
              <>
                {isLoadingConvs ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-zinc-400">Carregando conversas...</span>
                  </div>
                ) : dmsList.length === 0 ? (
                  <div className="text-center py-12 px-4 text-xs text-zinc-400">
                    Nenhuma conversa direta ainda. Visite o perfil de uma mocinha e clique em "Mensagem"!
                  </div>
                ) : (
                  dmsList.map(c => {
                    const other = c.participants?.find(p => p.id !== currentUser?.id);
                    const isSelected = activeConv?.id === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => openConversation(c)}
                        className={`p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#242436] border border-white/15 shadow-xs'
                            : 'hover:bg-[#1C1C2A]'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={other?.avatar}
                            alt={other?.displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-white/15 bg-[#1C1C2A]"
                          />
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0E0E15]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-heading text-xs font-bold text-white truncate">
                              {other?.displayName || 'Mocinha'}
                            </span>
                            {c.unreadCount > 0 && (
                              <span className="w-5 h-5 rounded-full bg-white text-black font-extrabold text-[10px] font-bold flex items-center justify-center shadow-xs">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-300/70 truncate font-sans">
                            {c.lastMessage?.text ||
                              (c.lastMessage?.mediaUrl ? '📷 Mídia enviada' : 'Conversa iniciada')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* MY GROUPS TAB */}
            {activeTab === 'my_groups' && (
              <>
                {myGroupsList.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-3">
                    <p className="text-xs text-zinc-400">Você ainda não está em nenhum grupo.</p>
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="px-4 py-2 rounded-xl bg-white text-black font-extrabold text-xs shadow-xs hover:bg-neutral-200 cursor-pointer transition-colors"
                    >
                      + Criar Primeiro Grupo
                    </button>
                  </div>
                ) : (
                  myGroupsList.map(g => {
                    const isSelected = activeConv?.id === g.id;

                    return (
                      <div
                        key={g.id}
                        onClick={() => openConversation(g)}
                        className={`p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#242436] border border-white/15 shadow-xs'
                            : 'hover:bg-[#1C1C2A]'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={g.avatar}
                            alt={g.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-2xl object-cover border border-white/15 bg-[#1C1C2A]"
                          />
                          <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#12121B] text-zinc-300">
                            {g.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-heading text-xs font-bold text-white truncate">
                              {g.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {g.durationMode === 'temporary' && (
                                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[8px] font-bold">
                                  {g.messageDurationHours || 24}h
                                </span>
                              )}
                              {g.unreadCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-white text-black font-extrabold text-[10px] font-bold flex items-center justify-center shadow-xs">
                                  {g.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-300/70 truncate font-sans">
                            {g.lastMessage?.text || `${g.participantIds?.length || 0} mocinhas`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* EXPLORE PUBLIC GROUPS TAB */}
            {activeTab === 'explore_groups' && (
              <>
                {isLoadingPublicGroups ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-zinc-400">Descobrindo grupos...</span>
                  </div>
                ) : exploreGroupsList.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-zinc-400">
                    Você já participa de todos os grupos públicos disponíveis! Crie um novo grupo para a sua comunidade.
                  </div>
                ) : (
                  exploreGroupsList.map(g => (
                    <div
                      key={g.id}
                      className="p-3 rounded-2xl bg-[#171724] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={g.avatar}
                          alt={g.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-2xl object-cover border border-white/15"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading text-xs font-bold text-white truncate">
                            {g.name}
                          </h4>
                          <span className="text-[10px] text-zinc-300/70 block">
                            👥 {g.participantIds?.length || 0} participantes
                          </span>
                        </div>
                      </div>

                      {g.description && (
                        <p className="text-[11px] text-zinc-200/80 line-clamp-2 leading-relaxed font-sans">
                          {g.description}
                        </p>
                      )}

                      <button
                        onClick={() => handleJoinGroup(g)}
                        className="w-full py-1.5 rounded-xl bg-white text-black hover:opacity-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Entrar no Grupo
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: ACTIVE CHAT ROOM */}
        <div
          className={`flex-1 flex flex-col bg-[#09090E] relative ${
            !activeConv ? 'hidden sm:flex items-center justify-center' : 'flex'
          }`}
        >
          {!activeConv ? (
            <div className="text-center p-8 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#171724] border border-white/10 flex items-center justify-center text-zinc-400 mx-auto mb-3 shadow-md">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-base font-bold text-white">
                Selecione uma conversa ou grupo
              </h3>
              <p className="text-xs text-zinc-300/70 mt-1.5 leading-relaxed">
                Escolha uma conversa na lista ou descubra novos grupos públicos para interagir com a comunidade.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Top Bar */}
              <div className="p-3 px-4 bg-[#12121B]/95 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConv(null)}
                    className="sm:hidden text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Conversation Header Details */}
                  {activeConv.isGroup ? (
                    <div
                      onClick={() => setShowGroupInfoModal(true)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <img
                        src={activeConv.avatar}
                        alt={activeConv.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-2xl object-cover border border-white/15 group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-heading text-xs sm:text-sm font-bold text-white group-hover:text-zinc-400 transition-colors">
                            {activeConv.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-zinc-200 uppercase tracking-wider">
                            {activeConv.isPublic ? 'Público' : 'Privado'}
                          </span>
                          {activeConv.durationMode === 'temporary' ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[9px] font-bold text-amber-300 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {activeConv.messageDurationHours || 24}h
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-bold text-zinc-300 flex items-center gap-0.5">
                              <InfinityIcon className="w-2.5 h-2.5" />
                              Permanente
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-300/70 font-medium block">
                          👥 {activeConv.participantIds?.length || 0} mocinhas • Ver detalhes
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => otherParticipant && onNavigateUser(otherParticipant.username)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <img
                        src={otherParticipant?.avatar}
                        alt={otherParticipant?.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-white/15 group-hover:scale-105 transition-transform bg-[#1C1C2A]"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-heading text-xs sm:text-sm font-bold text-white group-hover:underline">
                            {otherParticipant?.displayName || 'Mocinha'}
                          </span>
                          {otherParticipant?.isVerified && (
                            <Sparkles className="w-3 h-3 text-zinc-400 fill-amber-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium block">
                          ● Online
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Top Actions */}
                <div className="flex items-center gap-1 text-zinc-300">
                  {activeConv.isGroup && (
                    <button
                      onClick={() => setShowGroupInfoModal(true)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                      title="Informações do Grupo"
                    >
                      <Info className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages List */}
              <div
                ref={chatScrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {isLoadingMsgs ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-zinc-400">Carregando mensagens...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-2">
                    <p className="text-xs text-zinc-400">Nenhuma mensagem ainda.</p>
                    <p className="text-[11px] text-zinc-400">Envie um "Olá!" para começar a conversa ✨</p>
                  </div>
                ) : (
                  groupedMessages.map((group, gIdx) => {
                    const isMe = group.senderId === currentUser?.id;
                    const sender = group.sender || activeConv.participants?.find(p => p.id === group.senderId);

                    return (
                      <div
                        key={`grp-${gIdx}-${group.timestamp}`}
                        className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Avatar on left for other senders */}
                        {!isMe && (
                          <div
                            onClick={() => sender && onNavigateUser(sender.username)}
                            className="cursor-pointer self-end mb-1 shrink-0"
                          >
                            <img
                              src={sender?.avatar || 'https://api.dicebear.com/7.x/lorelei/svg?seed=Mocinha'}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-white/15 bg-[#1C1C2A]"
                            />
                          </div>
                        )}

                        <div className={`max-w-[78%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {/* Sender name for group chats if not me */}
                          {!isMe && activeConv.isGroup && (
                            <span className="text-[10px] font-bold text-zinc-400 mb-1 px-1 flex items-center gap-1">
                              {sender?.displayName || 'Mocinha'}
                              {activeConv.creatorId === group.senderId && (
                                <span title="Criadora"><Crown className="w-3 h-3 text-amber-400" /></span>
                              )}
                              {activeConv.adminIds?.includes(group.senderId) &&
                                activeConv.creatorId !== group.senderId && (
                                  <span title="Admin"><ShieldCheck className="w-3 h-3 text-zinc-400" /></span>
                                )}
                            </span>
                          )}

                          {/* Message Cluster */}
                          <div className="space-y-1 w-full">
                            {group.messages.map((m, mIdx) => {
                              const isFirst = mIdx === 0;
                              const isLast = mIdx === group.messages.length - 1;

                              return (
                                <div
                                  key={m.id}
                                  className={`group/msg relative flex flex-col ${
                                    isMe ? 'items-end' : 'items-start'
                                  }`}
                                >
                                  {/* Bubble */}
                                  <div
                                    className={`p-3 text-xs leading-relaxed break-words font-sans transition-all ${
                                      isMe
                                        ? 'bg-white text-black font-medium shadow-xs'
                                        : 'bg-[#171724] text-white border border-white/10 shadow-xs'
                                    } ${
                                      isMe
                                        ? isFirst && isLast
                                          ? 'rounded-2xl rounded-br-xs'
                                          : isFirst
                                          ? 'rounded-2xl rounded-br-md'
                                          : isLast
                                          ? 'rounded-2xl rounded-tr-md rounded-br-xs'
                                          : 'rounded-2xl rounded-r-md'
                                        : isFirst && isLast
                                        ? 'rounded-2xl rounded-bl-xs'
                                        : isFirst
                                        ? 'rounded-2xl rounded-bl-md'
                                        : isLast
                                        ? 'rounded-2xl rounded-tl-md rounded-bl-xs'
                                        : 'rounded-2xl rounded-l-md'
                                    }`}
                                  >
                                    {/* Quoted reply if any */}
                                    {m.replyTo && (
                                      <div className="mb-2 p-2 rounded-xl bg-black/20 border-l-2 border-white/60 text-[11px] opacity-90">
                                        <span className="font-bold block text-[10px]">
                                          {m.replyTo.sender?.displayName || 'Mocinha'}
                                        </span>
                                        <div className="truncate line-clamp-1">
                                          <AutoTranslatedText text={m.replyTo.text || '[Mídia]'} inline />
                                        </div>
                                      </div>
                                    )}

                                    {/* Media attached */}
                                    {m.mediaUrl && (
                                      <div className="rounded-xl overflow-hidden mb-2 max-h-60 bg-black/20">
                                        {m.mediaType === 'video' ? (
                                          <video
                                            src={m.mediaUrl}
                                            controls
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <img
                                            src={m.mediaUrl}
                                            alt="Mídia"
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                      </div>
                                    )}

                                    {m.text && (
                                      <div className="leading-relaxed">
                                        <AutoTranslatedText text={m.text} inline />
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Reply Button on Hover */}
                                  <button
                                    onClick={() => setReplyingTo(m)}
                                    className="opacity-0 group-hover/msg:opacity-100 absolute top-1/2 -translate-y-1/2 -left-6 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                    title="Responder"
                                  >
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Read Receipts & Time on Last Message of Cluster */}
                                  {isLast && (
                                    <div className="flex items-center gap-1 mt-1 px-1 text-[9px] text-zinc-400">
                                      <span>
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {isMe && (
                                        <>
                                          {m.status === 'read' ? (
                                            <span title="Lida"><CheckCheck className="w-3.5 h-3.5 text-zinc-400" /></span>
                                          ) : m.status === 'delivered' ? (
                                            <span title="Entregue"><CheckCheck className="w-3.5 h-3.5 text-zinc-400/60" /></span>
                                          ) : (
                                            <span title="Enviada"><Check className="w-3.5 h-3.5 text-zinc-400/60" /></span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Floating Scroll to Bottom Button */}
              {showScrollBottomBtn && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-20 right-6 px-3 py-1.5 rounded-full bg-white text-black font-extrabold text-xs font-bold shadow-lg shadow-white/5 flex items-center gap-1 hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Mais recentes</span>
                </button>
              )}

              {/* Replying Banner */}
              {replyingTo && (
                <div className="p-2.5 px-4 bg-[#171724] border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Reply className="w-4 h-4 text-zinc-400" />
                    <div>
                      <span className="font-bold block text-[10px] text-zinc-400">
                        {t('replying_to')} {replyingTo.sender?.displayName || 'Mocinha'}
                      </span>
                      <div className="text-zinc-300/70 truncate max-w-xs block">
                        <AutoTranslatedText text={replyingTo.text || '[Mídia]'} inline />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Emoji Picker Drawer */}
              {showStickers && (
                <div className="p-3 bg-[#12121B] border-t border-white/10 animate-in slide-in-from-bottom duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-zinc-300">
                      Reações Rápidas
                    </span>
                    <button
                      onClick={() => setShowStickers(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {emojiList.map(stk => (
                      <button
                        key={stk}
                        onClick={() => handleEmojiClick(stk)}
                        className="text-xl hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                        {stk}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Controls */}
              <form
                onSubmit={e => handleSendMessage(e)}
                className="p-3 bg-[#12121B]/95 border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Enviar Imagem / Vídeo"
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer shrink-0 transition-colors"
                >
                  <ImageIcon className="w-4.5 h-4.5" />
                </button>

                {/* Sticker picker button */}
                <button
                  type="button"
                  onClick={() => setShowStickers(!showStickers)}
                  title="Reações Rápidas"
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer shrink-0 transition-colors"
                >
                  <Smile className="w-4.5 h-4.5" />
                </button>

                {/* Text input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={
                    activeConv.isGroup
                      ? `Conversar em ${activeConv.name}...`
                      : 'Escreva uma mensagem...'
                  }
                  className="flex-1 bg-[#171724] text-xs text-white placeholder-zinc-500 px-4 py-2.5 rounded-2xl border border-white/10 focus:outline-none focus:border-white/30"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="w-9 h-9 rounded-2xl bg-white text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#12121B] border border-white/15 rounded-[28px] p-6 shadow-2xl space-y-4 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-400" />
                <h3 className="font-heading text-base font-bold text-white">
                  Criar Novo Grupo
                </h3>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              {/* Group Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Ex: Mocinhas do Design, Clube do Livro..."
                  className="w-full bg-[#171724] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">
                  Descrição & Tema
                </label>
                <textarea
                  rows={2}
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  placeholder="Sobre o que é este grupo?"
                  className="w-full bg-[#171724] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Group Avatar Selection with Gallery Option */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1.5">
                  Foto do Grupo
                </label>
                <div className="p-3 bg-[#171724] rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative group shrink-0">
                      <img
                        src={groupAvatar}
                        alt="Avatar do grupo"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md shadow-white/5"
                      />
                      <button
                        type="button"
                        onClick={() => groupAvatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title="Escolher foto da galeria"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => groupAvatarInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                      >
                        <Upload className="w-4 h-4 text-zinc-400" />
                        <span>Escolher Foto da Galeria</span>
                      </button>
                      <input
                        ref={groupAvatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleGroupAvatarSelect}
                      />
                      <span className="text-[10px] text-zinc-300/60 block text-center">
                        Selecione qualquer foto do seu celular ou computador
                      </span>
                    </div>
                  </div>

                  {/* Preset quick picks */}
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-300/70 whitespace-nowrap">
                      Ou predefinidos:
                    </span>
                    {groupAvatarPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGroupAvatar(preset)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border transition-transform shrink-0 cursor-pointer ${
                          groupAvatar === preset
                            ? 'border-white ring-2 ring-white/30 scale-105'
                            : 'border-white/15 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Group Duration Selection (Permanente vs Temporário) */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1.5">
                  Duração do Grupo & Mensagens
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupDurationMode('permanent')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      groupDurationMode === 'permanent'
                        ? 'bg-white/10 border-white text-white ring-1 ring-white'
                        : 'bg-[#171724] border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <InfinityIcon className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-bold">Permanente</span>
                    </div>
                    <p className="text-[10px] text-zinc-300/70 leading-tight">
                      Mensagens salvas para sempre. O histórico nunca expira.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupDurationMode('temporary')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      groupDurationMode === 'temporary'
                        ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-[#171724] border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold">Temporário</span>
                    </div>
                    <p className="text-[10px] text-zinc-300/70 leading-tight">
                      Mensagens expiram automaticamente. O grupo é mantido!
                    </p>
                  </button>
                </div>

                {groupDurationMode === 'temporary' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Limpeza automática a cada:
                      </span>
                      <span className="text-amber-200 font-extrabold">
                        {groupDurationHours === 1
                          ? '1 Hora'
                          : groupDurationHours === 24
                          ? '24 Horas (1 dia)'
                          : groupDurationHours === 72
                          ? '3 Dias (72h)'
                          : '7 Dias (1 semana)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '1 hora', hours: 1 },
                        { label: '24 horas', hours: 24 },
                        { label: '3 dias', hours: 72 },
                        { label: '7 dias', hours: 168 },
                      ].map(item => (
                        <button
                          key={item.hours}
                          type="button"
                          onClick={() => setGroupDurationHours(item.hours)}
                          className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            groupDurationHours === item.hours
                              ? 'bg-amber-500 text-black shadow-xs font-black'
                              : 'bg-[#171724] text-zinc-300 hover:text-white border border-amber-500/30'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-300/90 leading-tight">
                      ✨ <strong>Como funciona:</strong> Ao expirar o tempo, apenas as mensagens antigas são apagadas. O grupo, as participantes e as regras continuam intactos!
                    </p>
                  </div>
                )}
              </div>

              {/* Public or Private Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171724] border border-white/10">
                <div className="flex items-center gap-2">
                  {groupIsPublic ? (
                    <Globe className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {groupIsPublic ? 'Grupo Público' : 'Grupo Privado'}
                    </span>
                    <span className="text-[10px] text-zinc-300/70 block">
                      {groupIsPublic
                        ? 'Qualquer mocinha pode encontrar e entrar'
                        : 'Apenas mocinhas convidadas podem entrar'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupIsPublic(!groupIsPublic)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    groupIsPublic ? 'bg-white text-black' : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      groupIsPublic ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Initial Members Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">
                  Convidar Mocinhas Iniciais (Opcional)
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-[#171724] rounded-xl border border-white/10">
                  {availableUsers.map(u => {
                    const isSelected = selectedMemberIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedMemberIds(prev =>
                            isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className={`p-1.5 px-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-white/15' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatar}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-xs text-white">{u.displayName}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isSelected
                              ? 'bg-white text-black border-white text-white'
                              : 'border-white/20'
                          }`}
                        >
                          {isSelected && <CheckIcon className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup || !groupName.trim()}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-extrabold text-xs shadow-md hover:bg-neutral-200 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isCreatingGroup ? 'Criando...' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GROUP INFO MODAL */}
      {showGroupInfoModal && activeConv && activeConv.isGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#12121B] border border-white/15 rounded-[28px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-base font-bold text-white">
                Informações do Grupo
              </h3>
              <button
                onClick={() => setShowGroupInfoModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Group Profile View */}
            <div className="text-center space-y-2">
              <div className="relative inline-block mx-auto group">
                <img
                  src={activeConv.avatar}
                  alt={activeConv.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-3xl object-cover border-2 border-white/20 mx-auto shadow-lg"
                />
                {isGroupAdmin && (
                  <button
                    type="button"
                    onClick={() => updateGroupAvatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                    title="Mudar foto do grupo"
                  >
                    <Upload className="w-5 h-5 mb-0.5 text-zinc-400" />
                    <span>Alterar</span>
                  </button>
                )}
              </div>

              {isGroupAdmin && (
                <div>
                  <button
                    type="button"
                    onClick={() => updateGroupAvatarInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-zinc-200 hover:text-white cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Alterar Foto da Galeria</span>
                  </button>
                  <input
                    ref={updateGroupAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpdateGroupAvatar}
                  />
                </div>
              )}

              <h2 className="font-heading text-lg font-bold text-white">
                {activeConv.name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-300/80">
                <span className="px-2 py-0.5 rounded-full bg-white/10 font-bold uppercase text-[9px]">
                  {activeConv.isPublic ? 'Público' : 'Privado'}
                </span>
                <span>•</span>
                <span>{activeConv.participantIds?.length || 0} membros</span>
              </div>
              {activeConv.description && (
                <p className="text-xs text-zinc-200/80 max-w-sm mx-auto leading-relaxed pt-1">
                  {activeConv.description}
                </p>
              )}
            </div>

            {/* Duration / Expiration Card */}
            <div className="p-3 bg-[#171724] rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeConv.durationMode === 'temporary'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/10 text-zinc-400'
                  }`}>
                    {activeConv.durationMode === 'temporary' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <InfinityIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {activeConv.durationMode === 'temporary'
                        ? `Grupo Temporário (${activeConv.messageDurationHours || 24}h)`
                        : 'Grupo Permanente'}
                    </span>
                    <span className="text-[10px] text-zinc-300/70 block">
                      {activeConv.durationMode === 'temporary'
                        ? 'Ao expirar, apenas as mensagens são apagadas; o grupo permanece ativo.'
                        : 'Todas as mensagens ficam salvas continuamente sem expirar.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin duration controls */}
              {isGroupAdmin && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">
                      Configuração de Duração:
                    </span>
                    <button
                      type="button"
                      disabled={isUpdatingGroup}
                      onClick={() =>
                        handleUpdateGroupDuration(
                          activeConv.durationMode === 'temporary' ? 'permanent' : 'temporary',
                          activeConv.messageDurationHours || 24
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-bold text-white cursor-pointer transition-all"
                    >
                      {activeConv.durationMode === 'temporary'
                        ? 'Tornar Permanente'
                        : 'Tornar Temporário'}
                    </button>
                  </div>

                  {activeConv.durationMode === 'temporary' && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-zinc-300/80 shrink-0">Expirar em:</span>
                      {[
                        { label: '1h', hours: 1 },
                        { label: '24h', hours: 24 },
                        { label: '3 dias', hours: 72 },
                        { label: '7 dias', hours: 168 },
                      ].map(item => (
                        <button
                          key={item.hours}
                          type="button"
                          disabled={isUpdatingGroup}
                          onClick={() => handleUpdateGroupDuration('temporary', item.hours)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            (activeConv.messageDurationHours || 24) === item.hours
                              ? 'bg-amber-500 text-black shadow-xs font-black'
                              : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clear Messages Action (Without deleting the group) */}
            {isGroupAdmin && (
              <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Eraser className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">
                      Limpar Mensagens
                    </span>
                    <span className="text-[10px] text-amber-300/70 block">
                      Apaga as mensagens do chat, mantendo o grupo e participantes ativos.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearGroupMessages}
                  disabled={isClearingMessages}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold whitespace-nowrap cursor-pointer transition-all"
                >
                  {isClearingMessages ? 'Limpando...' : 'Limpar Agora'}
                </button>
              </div>
            )}

            {/* Invite Link Action */}
            <div className="p-3 bg-[#171724] rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-zinc-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Link de Convite</span>
                  <span className="text-[10px] text-zinc-400">Código: {activeConv.inviteCode}</span>
                </div>
              </div>
              <button
                onClick={copyInviteLink}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedCode ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Members Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  Participantes ({activeConv.participantIds?.length || 0})
                </span>
                <button
                  onClick={() => setShowAddMembersModal(true)}
                  className="text-xs font-bold text-zinc-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Mocinhas</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {activeConv.participants?.map(member => {
                  const isCreator = activeConv.creatorId === member.id;
                  const isAdmin = activeConv.adminIds?.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className="p-2 rounded-xl bg-[#171724] border border-white/5 flex items-center justify-between"
                    >
                      <div
                        onClick={() => {
                          setShowGroupInfoModal(false);
                          onNavigateUser(member.username);
                        }}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <img
                          src={member.avatar}
                          alt={member.displayName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-white/15"
                        />
                        <div>
                          <span className="text-xs font-bold text-white group-hover:underline block">
                            {member.displayName}
                          </span>
                          <span className="text-[10px] text-zinc-400">@{member.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCreator ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            <span>Criadora</span>
                          </span>
                        ) : isAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                        ) : null}

                        {/* Admin controls */}
                        {isGroupAdmin && member.id !== currentUser?.id && !isCreator && (
                          <div className="flex items-center gap-1">
                            {isGroupCreator && (
                              <button
                                onClick={() => handleToggleAdmin(member.id)}
                                title={isAdmin ? 'Remover de Admin' : 'Promover a Admin'}
                                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              title="Remover do Grupo"
                              className="p-1 text-zinc-400 hover:text-zinc-300 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions (Leave / Delete) */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleLeaveGroup(activeConv.id)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair do Grupo</span>
              </button>

              {isGroupCreator && (
                <button
                  onClick={() => handleDeleteGroup(activeConv.id)}
                  className="px-4 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Grupo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBERS MODAL */}
      {showAddMembersModal && activeConv && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12121B] border border-white/15 rounded-[28px] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-heading text-sm font-bold text-white">
                Adicionar ao Grupo
              </h3>
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
              {availableUsers
                .filter(u => !activeConv.participantIds?.includes(u.id))
                .map(u => {
                  const isSelected = selectedMemberIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedMemberIds(prev =>
                          isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-white/15' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatar}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs text-white">{u.displayName}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-white text-black border-white text-white'
                            : 'border-white/20'
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedMemberIds.length === 0}
                className="px-4 py-2 rounded-full bg-white text-black font-extrabold text-xs disabled:opacity-40 hover:bg-neutral-200 cursor-pointer shadow-xs transition-colors"
              >
                Adicionar ({selectedMemberIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
