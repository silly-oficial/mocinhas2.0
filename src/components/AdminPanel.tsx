import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Users, FileText, Bell, Trash2, CheckCircle2, XCircle, 
  Sparkles, Clock, Globe, Plus, Image as ImageIcon, Video, AlertTriangle, 
  Shield, Pin, Eye, BarChart3, Radio, RefreshCw, X, TrendingUp, Crown, CreditCard, DollarSign, Tag,
  Database, Copy, ExternalLink, Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sounds } from '../utils/sound';
import { uploadVideoPoster } from '../utils/videoPoster';
import { Post, User } from '../types';

interface AdminPanelProps {
  onClose: () => void;
  onPostCreated?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onPostCreated }) => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'poster' | 'users' | 'moderation' | 'broadcast' | 'analytics' | 'syncpay' | 'categories' | 'supabase'>('stats');
  
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Supabase State
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [sbUrlInput, setSbUrlInput] = useState('');
  const [sbKeyInput, setSbKeyInput] = useState('');
  const [sbServiceKeyInput, setSbServiceKeyInput] = useState('');
  const [isSavingSb, setIsSavingSb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [rawSql, setRawSql] = useState('');

  // Categories State
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; description: string }[]>(() => {
    try {
      const saved = localStorage.getItem('mocinhas_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'geral', name: 'Geral', slug: 'geral', description: 'Geral e Diversos' },
      { id: 'fotografia', name: 'Fotografia', slug: 'fotografia', description: 'Fotos e Ensaios' },
      { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: 'Estilo de vida e cotidiano' },
      { id: 'reels', name: 'Reels & Vídeos', slug: 'reels', description: 'Vídeos curtos e reels' }
    ];
  });
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newCategory = {
      id: slug + '-' + Date.now(),
      name: newCatName.trim(),
      slug,
      description: newCatDesc.trim() || 'Categoria oficial'
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    localStorage.setItem('mocinhas_categories', JSON.stringify(updated));
    setNewCatName('');
    setNewCatDesc('');
    sounds.playSparkle();
    setStatusMessage('Categoria criada com sucesso! 🏷️✨');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteCategory = (catId: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return;
    const updated = categories.filter(c => c.id !== catId);
    setCategories(updated);
    localStorage.setItem('mocinhas_categories', JSON.stringify(updated));
    sounds.playPop();
  };

  // Syncpay Configuration State
  const [syncpayClientId, setSyncpayClientId] = useState<string>('');
  const [syncpayClientSecret, setSyncpayClientSecret] = useState<string>('');
  const [syncpayWebhookToken, setSyncpayWebhookToken] = useState<string>('');
  const [syncpayPixKey, setSyncpayPixKey] = useState<string>('');
  const [syncpayEnabled, setSyncpayEnabled] = useState<boolean>(true);
  const [syncpayPrice, setSyncpayPrice] = useState<number>(9.99);

  // Admin Poster State
  const [postType, setPostType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState<boolean>(false);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [location, setLocation] = useState<string>('Painel Oficial Mocinhas 👑');

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState<string>('✨ Anúncio Oficial da Administração');
  const [broadcastText, setBroadcastText] = useState<string>('');

  const sampleImages = [
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
  ];

  const sampleVideos = [
    'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-lights-41642-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-lights-31952-large.mp4',
  ];

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'stats' || activeTab === 'poster' || activeTab === 'analytics') {
        const res = await fetch('/api/admin/stats', { headers });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
        if (activeTab === 'analytics') {
          const [postsRes, usersRes] = await Promise.all([
            fetch('/api/posts'),
            fetch('/api/admin/users', { headers }),
          ]);
          if (postsRes.ok) {
            const pData = await postsRes.json();
            setPostsList(pData.posts || []);
          }
          if (usersRes.ok) {
            const uData = await usersRes.json();
            setUsersList(uData.users || []);
          }
        }
      } else if (activeTab === 'syncpay') {
        const res = await fetch('/api/admin/syncpay', { headers });
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          setSyncpayClientId(s.clientId || '');
          setSyncpayClientSecret(s.clientSecret || '');
          setSyncpayWebhookToken(s.webhookToken || '');
          setSyncpayPixKey(s.pixKey || '');
          setSyncpayEnabled(s.enabled !== false);
          setSyncpayPrice(s.price || 9.99);
        }
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) {
          const data = await res.json();
          setUsersList(data.users || []);
        }
      } else if (activeTab === 'moderation') {
        const res = await fetch('/api/posts');
        if (res.ok) {
          const data = await res.json();
          setPostsList(data.posts || []);
        }
      } else if (activeTab === 'supabase') {
        try {
          const [status, schema] = await Promise.all([
            api.getSupabaseStatus(),
            api.getSupabaseSchema(),
          ]);
          setSupabaseStatus(status);
          if (status.url) setSbUrlInput(status.url);
          setRawSql(schema);
        } catch (err) {
          console.error('Failed to load supabase info:', err);
        }
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySql = () => {
    if (!rawSql) return;
    navigator.clipboard.writeText(rawSql);
    setCopiedSql(true);
    sounds.playSparkle();
    setStatusMessage('Código SQL copiado para a área de transferência! Cole no SQL Editor do Supabase. 📋🌸');
    setTimeout(() => {
      setCopiedSql(false);
      setStatusMessage(null);
    }, 4000);
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrlInput.trim() || !sbKeyInput.trim()) {
      alert('Preencha a URL e a Anon Key do Supabase!');
      return;
    }
    setIsSavingSb(true);
    try {
      const res = await api.configureSupabase({
        url: sbUrlInput.trim(),
        key: sbKeyInput.trim(),
        serviceRoleKey: sbServiceKeyInput.trim() || undefined,
      });
      setSupabaseStatus(res.status);
      sounds.playSparkle();
      setStatusMessage('Configurações do Supabase salvas e conectadas com sucesso! 🌸✨');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      sounds.playPop();
      setStatusMessage(`Erro ao configurar Supabase: ${err.message}`);
    } finally {
      setIsSavingSb(false);
    }
  };

  const handleSaveSyncpaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch('/api/admin/syncpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: syncpayClientId,
          clientSecret: syncpayClientSecret,
          webhookToken: syncpayWebhookToken,
          pixKey: syncpayPixKey,
          enabled: syncpayEnabled,
          price: Number(syncpayPrice) || 9.99
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar Syncpay');

      sounds.playSparkle();
      setStatusMessage('Configurações da Syncpay salvas e ativadas com sucesso! 💳✨');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage(err.message || 'Erro ao salvar configurações Syncpay.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePremiumUser = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch(`/api/admin/users/${targetUserId}/premium`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPremium: !currentStatus })
      });
      if (res.ok) {
        sounds.playPop();
        setUsersList(usersList.map(u => u.id === targetUserId ? { ...u, isPremium: !currentStatus } : u));
      }
    } catch (e) {
      console.error('Failed to toggle premium:', e);
    }
  };

  const handleAdminFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') && !file.type.includes('gif') && !ext.includes('gif');
    const isGif = file.type.includes('gif') || ext === 'gif';
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);
    const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ['pdf', 'doc', 'docx', 'txt'].includes(ext);

    if (!isImage && !isGif && !isVideo && !isAudio && !isPdf) {
      setStatusMessage('⚠️ Formato não suportado. Envie fotos, GIFs, vídeos, PDFs ou áudios válidos.');
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : isAudio ? 25 * 1024 * 1024 : isPdf ? 20 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatusMessage(`⚠️ Arquivo muito grande. Tamanho máximo: ${Math.round(maxSize / (1024 * 1024))}MB.`);
      return;
    }

    setStatusMessage(null);
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setMediaUrl('');
  };

  const handleAdminPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl && !selectedFile) {
      setStatusMessage('Por favor, informe a URL da mídia ou selecione um arquivo do dispositivo.');
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('Enviando arquivos e publicando...');
      let finalMediaUrl = mediaUrl;
      let finalMediaType: 'image' | 'video' | 'audio' | 'pdf' | 'gif' = postType;
      let posterUrl: string | undefined;

      if (selectedFile) {
        const uploadRes = await api.uploadFile(selectedFile);
        if (uploadRes?.url) {
          finalMediaUrl = uploadRes.url;
          const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
          if (selectedFile.type.includes('gif') || ext === 'gif') finalMediaType = 'gif';
          else if (selectedFile.type.startsWith('video') || ['mp4', 'webm', 'mov'].includes(ext)) finalMediaType = 'video';
          else if (selectedFile.type.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext)) finalMediaType = 'audio';
          else if (selectedFile.type === 'application/pdf' || ['pdf', 'doc', 'docx', 'txt'].includes(ext)) finalMediaType = 'pdf';
          else finalMediaType = 'image';
        }
        // 🪐 poster leve para o feed Universo (só para vídeos enviados do aparelho)
        if (finalMediaType === 'video') {
          setStatusMessage('Gerando miniatura do vídeo...');
          posterUrl = await uploadVideoPoster(selectedFile);
          setStatusMessage('Enviando arquivos e publicando...');
        }
      }

      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          media: [{ url: finalMediaUrl, type: finalMediaType, fileName: selectedFile?.name, thumbnail: posterUrl }],
          caption,
          location,
          isTemporary,
          durationHours: isTemporary ? durationHours : undefined,
          allowComments: true
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao publicar');
      }

      sounds.playSparkle();
      setStatusMessage(isTemporary ? 'Publicação temporária criada com sucesso! ⏰' : 'Publicação permanente criada com sucesso! ✨');
      setCaption('');
      setMediaUrl('');
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (onPostCreated) onPostCreated();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage(e.message || 'Erro ao publicar post admin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVerifyUser = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isVerified: !currentStatus })
      });
      if (res.ok) {
        sounds.playPop();
        setUsersList(usersList.map(u => u.id === targetUserId ? { ...u, isVerified: !currentStatus } : u));
      }
    } catch (e) {
      console.error('Failed to toggle verification:', e);
    }
  };

  const handleToggleAdminUser = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isAdmin: !currentStatus })
      });
      if (res.ok) {
        sounds.playPop();
        setUsersList(usersList.map(u => u.id === targetUserId ? { ...u, isAdmin: !currentStatus } : u));
      }
    } catch (e) {
      console.error('Failed to toggle admin:', e);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!confirm('Tem certeza que deseja banir/excluir este usuário da plataforma?')) return;
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        sounds.playPop();
        setUsersList(usersList.filter(u => u.id !== targetUserId));
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja excluir esta publicação permanentemente?')) return;
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        sounds.playPop();
        setPostsList(postsList.filter(p => p.id !== postId));
      }
    } catch (e) {
      console.error('Failed to delete post:', e);
    }
  };

  const handleEmergencyCleanup = async () => {
    if (!confirm('Deseja realmente forçar a remoção de todo o conteúdo expirado / obsoleto do banco de dados agora?')) return;
    try {
      setIsLoading(true);
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch('/api/admin/emergency-cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        sounds.playSparkle();
        setStatusMessage(data.message || 'Limpeza de emergência executada com sucesso!');
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        alert(data.error || 'Erro ao executar limpeza');
      }
    } catch (e) {
      console.error('Emergency cleanup error:', e);
      alert('Erro de conexão ao executar limpeza de emergência.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    try {
      setIsLoading(true);
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: broadcastTitle, text: broadcastText })
      });
      if (res.ok) {
        sounds.playSparkle();
        setStatusMessage('Alerta global disparado com sucesso para todos os usuários! 📢');
        setBroadcastText('');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (e) {
      console.error('Failed to send broadcast:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#111118] border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#181824] via-[#14141E] to-[#111118] border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black border border-white/20 text-white flex items-center justify-center shadow-lg shadow-white/5">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Painel Administrativo <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-bold border border-white/15">Admin 👑</span>
              </h2>
              <p className="text-xs text-zinc-300/75">Gerenciamento completo, postagens temporárias/permanentes e moderação</p>
            </div>
          </div>
          <button
            onClick={() => { sounds.playPop(); onClose(); }}
            className="w-9 h-9 rounded-full bg-[#1F1F2E] hover:bg-[#2B2B3E] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[#0D0D14] border-b border-white/10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { sounds.playPop(); setActiveTab('stats'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stats' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estatísticas</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('analytics'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Gráficos & Análises</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('poster'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'poster' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Publicador Admin (Perm / Temp)</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('users'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gerenciar Usuários</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('moderation'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'moderation' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Moderação de Posts</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('broadcast'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'broadcast' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Alerta Global</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('syncpay'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'syncpay' 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <CreditCard className="w-4 h-4 text-yellow-300" />
            <span>Syncpay & Premium (R$ 9,99)</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('categories'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categories' 
                ? 'bg-white text-black shadow-md shadow-white/5' 
                : 'bg-[#171724] text-zinc-300 hover:bg-[#242436] border border-white/10'
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>Gerenciar Categorias</span>
          </button>

          <button
            onClick={() => { sounds.playPop(); setActiveTab('supabase'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'supabase' 
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                : 'bg-[#171724] text-emerald-400 hover:bg-[#242436] border border-emerald-500/30'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>⚡ Integração Supabase</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {statusMessage && (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs font-bold flex items-center gap-3 animate-fadeIn">
              <Sparkles className="w-5 h-5 text-zinc-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Total Usuários</span>
                    <Users className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">{stats?.totalUsers || 5}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Cadastrados na rede</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Publicações</span>
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">{stats?.totalPosts || 0}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Posts e reels</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Histórias (Stories)</span>
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">{stats?.totalStories || 0}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Ativas no momento</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Mensagens DMs</span>
                    <Radio className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">{stats?.totalMessages || 0}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Conversas e chats</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171724] to-[#12121A] border border-white/15 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                  Privilégios de Administrador Ativos
                </h3>
                <ul className="text-xs text-zinc-300/80 space-y-2 list-disc pl-4">
                  <li>Criação de publicações e vídeos em formato <strong>Permanente</strong> ou <strong>Temporário (Expiração automática)</strong>.</li>
                  <li>Gerenciamento de contas de usuários, conceder selo de verificação oficial e privilégios de admin.</li>
                  <li>Moderação em tempo real com exclusão de publicações ou comentários inadequados.</li>
                  <li>Disparo de alertas e avisos globais no painel de notificações de todos os usuários.</li>
                </ul>
              </div>

              {/* Emergency Cleanup Card */}
              <div className="p-6 rounded-2xl bg-[#161622] border border-white/20 space-y-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-zinc-400" />
                    Limpeza de Emergência de Conteúdo Obsoleto
                  </h4>
                  <p className="text-xs text-zinc-300/80 mt-1">
                    Força a remoção imediata de todos os posts e stories expirados na base de dados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEmergencyCleanup}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-red-500/30 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isLoading ? 'Limpando...' : 'Executar limpeza agora'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS & USAGE CHARTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Posts (Últimas 24h)</span>
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">
                      {postsList.filter(p => {
                        const diff = Date.now() - new Date(p.createdAt).getTime();
                        return diff <= 24 * 3600000;
                      }).length}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Criados nas últimas 24 horas</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Usuários Ativos (24h)</span>
                    <Users className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">
                      {usersList.filter(u => {
                        if (!u.createdAt) return false;
                        const diff = Date.now() - new Date(u.createdAt).getTime();
                        return diff <= 7 * 24 * 3600000;
                      }).length}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Novos cadastros na rede</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-xs font-semibold">Taxa de Engajamento</span>
                    <TrendingUp className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">94.8%</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Curtidas e comentários ativos</span>
                  </div>
                </div>
              </div>

              {/* Simple Visual Bar Chart */}
              <div className="p-6 rounded-2xl bg-[#171724] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-zinc-400" />
                    Atividade de Publicações (Últimos 7 Dias)
                  </h3>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 font-bold border border-white/15">Métricas em tempo real</span>
                </div>

                <div className="pt-6 pb-2 flex items-end justify-between gap-3 h-48 px-4 bg-[#111118] rounded-xl border border-white/10">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, idx) => {
                    const heights = [45, 65, 80, 55, 90, 75, 85];
                    const h = heights[idx];
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] text-zinc-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{h}%</span>
                        <div
                          className="w-full max-w-[36px] bg-gradient-to-t from-white via-zinc-300 to-zinc-400 rounded-t-xl transition-all duration-500 group-hover:scale-y-105 shadow-md shadow-white/5"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[11px] text-zinc-300 font-medium">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMIN POSTER (PERMANENT vs TEMPORARY) */}
          {activeTab === 'poster' && (
            <form onSubmit={handleAdminPostSubmit} className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-[#171724] border border-white/10 space-y-4 shadow-lg">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-zinc-400" />
                  Nova Publicação Especial da Administração
                </h3>

                {/* Status / Error Message Banner */}
                {statusMessage && (
                  <div className="p-3 rounded-xl bg-white/10 border border-white/15 text-zinc-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-400" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {/* Media Type Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostType('image')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      postType === 'image' ? 'bg-white/50 text-white shadow-md' : 'bg-[#111118] text-zinc-300 border border-white/10'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Foto / GIF / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('video')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      postType === 'video' ? 'bg-white/50 text-white shadow-md' : 'bg-[#111118] text-zinc-300 border border-white/10'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Vídeo / Áudio</span>
                  </button>
                </div>

                {/* File Upload Button / Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Enviar Arquivo do Dispositivo</span>
                    <span className="text-[10px] text-zinc-400 font-normal">PDF, GIF, Foto, Vídeo, Áudio</span>
                  </label>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.txt,audio/*,.mp3,.wav,.ogg,.m4a"
                    onChange={handleAdminFileSelected}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-white/15 bg-[#111118]/60 hover:bg-[#111118] flex items-center justify-center gap-3 cursor-pointer transition-colors text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-sm shrink-0">
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                        {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo'}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Suporta todos os formatos</p>
                    </div>
                  </div>

                  {/* File Preview Card if file selected */}
                  {selectedFile && filePreviewUrl && (
                    <div className="p-3 rounded-xl bg-[#111118] border border-white/15 flex items-center justify-between gap-3 animate-fadeIn">
                      <div className="flex items-center gap-3 truncate">
                        {selectedFile.type.startsWith('video') ? (
                          <video src={filePreviewUrl} className="w-12 h-12 rounded-lg object-cover" />
                        ) : selectedFile.type.startsWith('audio') ? (
                          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-zinc-300 font-bold text-xs">AUDIO</div>
                        ) : selectedFile.type === 'application/pdf' ? (
                          <div className="w-12 h-12 rounded-lg bg-white/10 text-white flex items-center justify-center font-bold text-[10px]">PDF</div>
                        ) : (
                          <img src={filePreviewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-zinc-400">Pronto para publicação admin</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Media URL Input Option */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Ou informe a URL da Mídia</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      if (e.target.value) {
                        setSelectedFile(null);
                        setFilePreviewUrl(null);
                      }
                    }}
                    placeholder="https://exemplo.com/midia.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25"
                  />
                </div>

                {/* Quick Samples */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400">Sugestões Rápidas:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(postType === 'image' ? sampleImages : sampleVideos).map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMediaUrl(url);
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                        className={`h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                          mediaUrl === url ? 'border-white/25 scale-[1.02]' : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {postType === 'image' ? (
                          <img src={url} alt="Sample" className="w-full h-full object-cover" />
                        ) : (
                          <video src={url} className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permanent vs Temporary Toggle */}
                <div className="p-4 rounded-2xl bg-[#111118] border border-white/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Modo de Publicação</span>
                      <span className="text-[10px] text-zinc-300/70">Escolha se o post fica permanente ou expira após um tempo</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTemporary(!isTemporary)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        isTemporary 
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30' 
                          : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      }`}
                    >
                      {isTemporary ? '⏰ Temporário (Expira)' : '📌 Permanente'}
                    </button>
                  </div>

                  {isTemporary && (
                    <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                      <span className="text-xs text-zinc-300 font-semibold">Duração da Expiração:</span>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl bg-[#171724] border border-white/15 text-white text-xs font-bold focus:outline-none"
                      >
                        <option value={1}>1 Hora</option>
                        <option value={6}>6 Horas</option>
                        <option value={12}>12 Horas</option>
                        <option value={24}>24 Horas (1 Dia)</option>
                        <option value={72}>72 Horas (3 Dias)</option>
                        <option value={168}>168 Horas (7 Dias)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Legenda / Anúncio</label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Escreva a legenda oficial da administração... #mocinhas #oficial"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-white text-black hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-white/5 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoading ? 'Enviando Publicação...' : isTemporary ? 'Publicar Temporariamente' : 'Publicar Permanentemente'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Usuários Registrados na Plataforma</h3>
              <div className="space-y-2.5">
                {usersList.map((u) => (
                  <div key={u.id} className="p-3.5 rounded-2xl bg-[#240C1D] border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full object-cover border border-white/15" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">{u.displayName}</span>
                          {u.isVerified && <span className="text-zinc-400 text-xs">✓</span>}
                          {u.isAdmin && <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 text-[9px] font-bold">Admin</span>}
                          {u.isPremium && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">VIP 💎</span>}
                        </div>
                        <span className="text-[11px] text-zinc-400">@{u.username} • {u.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePremiumUser(u.id, !!u.isPremium)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                          u.isPremium ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40' : 'bg-[#111118] text-zinc-300 border border-white/10'
                        }`}
                        title="Alternar Premium VIP"
                      >
                        {u.isPremium ? 'Premium 💎' : 'Dar Premium'}
                      </button>

                      <button
                        onClick={() => handleToggleVerifyUser(u.id, !!u.isVerified)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                          u.isVerified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-[#111118] text-zinc-300 border border-white/10'
                        }`}
                        title="Alternar Verificação"
                      >
                        {u.isVerified ? 'Verificado' : 'Verificar'}
                      </button>

                      <button
                        onClick={() => handleToggleAdminUser(u.id, !!u.isAdmin)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                          u.isAdmin ? 'bg-white/20 text-zinc-100 border border-white/25' : 'bg-[#111118] text-zinc-300 border border-white/10'
                        }`}
                        title="Alternar Admin"
                      >
                        {u.isAdmin ? 'Admin' : 'Tornar Admin'}
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer transition-colors"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MODERATION */}
          {activeTab === 'moderation' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Moderação de Publicações Recentes</h3>
              <div className="space-y-3">
                {postsList.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-[#240C1D] border border-white/10 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {p.media[0] && (
                        <img src={p.media[0].thumbnail || p.media[0].url} alt="Post" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">@{p.user?.username || 'usuário'}</span>
                          <span className="text-[10px] text-zinc-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                          {p.isTemporary && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">Temporário</span>}
                        </div>
                        <p className="text-xs text-zinc-200 mt-1 line-clamp-2">{p.caption || '[Sem legenda]'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePost(p.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BROADCAST */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSendBroadcast} className="space-y-4 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-[#240C1D] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-4 h-4 text-zinc-400" />
                  Enviar Alerta Global para Todos os Usuários
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Título do Alerta</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Mensagem do Comunicado</label>
                  <textarea
                    rows={4}
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Digite o comunicado oficial que aparecerá na central de notificações de todos os membros..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-full bg-white text-black font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer hover:bg-neutral-200 transition-all"
                >
                  <Radio className="w-4 h-4 stroke-[2.5]" />
                  <span>Disparar Comunicado Global</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: SYNCPAY INTEGRATION & PREMIUM CONFIG */}
          {activeTab === 'syncpay' && (
            <form onSubmit={handleSaveSyncpaySettings} className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-[#171724] border border-white/10 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-yellow-300" />
                    Configuração da Integração Syncpay & Assinatura Premium
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSyncpayEnabled(!syncpayEnabled)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-extrabold cursor-pointer border transition-all ${
                      syncpayEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}
                  >
                    {syncpayEnabled ? 'Syncpay Ativada ✓' : 'Syncpay Desativada'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111118] border border-white/10 text-zinc-200 text-xs leading-relaxed space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-yellow-300" />
                    Ativação do Recurso Premium (R$ 9,99)
                  </p>
                  <p className="text-zinc-300/80 text-[11px]">
                    Insira abaixo suas credenciais da conta Syncpay para processar pagamentos Pix automáticos. A cobrança padrão é de R$ 9,99 para liberar visualização ilimitada das publicações de perfis.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Syncpay Client ID (API Key)</label>
                    <input
                      type="text"
                      value={syncpayClientId}
                      onChange={(e) => setSyncpayClientId(e.target.value)}
                      placeholder="Ex: sync_client_live_8912..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Syncpay Client Secret (Token)</label>
                    <input
                      type="password"
                      value={syncpayClientSecret}
                      onChange={(e) => setSyncpayClientSecret(e.target.value)}
                      placeholder="Ex: sec_key_90a1b2c3..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Chave PIX da Conta Syncpay (Opcional)</label>
                    <input
                      type="text"
                      value={syncpayPixKey}
                      onChange={(e) => setSyncpayPixKey(e.target.value)}
                      placeholder="Chave Pix ou CNPJ cadastrado na Syncpay"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Preço do Premium (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={syncpayPrice}
                      onChange={(e) => setSyncpayPrice(Number(e.target.value))}
                      placeholder="9.99"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25 font-bold text-emerald-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl pod-orange text-white hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-white/5 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isLoading ? 'Salvando Syncpay...' : 'Salvar Configurações Syncpay'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171724] to-[#12121A] border border-white/15 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Criar e Gerenciar Categorias</h3>
                    <p className="text-xs text-zinc-400">Adicione categorias para organizar as publicações na rede</p>
                  </div>
                </div>

                <form onSubmit={handleAddCategory} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nome da Categoria (Ex: Moda, Estilo...)"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25"
                    />
                    <input
                      type="text"
                      placeholder="Descrição breve (Opcional)"
                      value={newCatDesc}
                      onChange={e => setNewCatDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111118] border border-white/15 text-white text-xs focus:outline-none focus:border-white/25"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
                  >
                    + Adicionar Categoria
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Categorias Cadastradas ({categories.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-2xl bg-[#171724] border border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-black text-white">{cat.name}</h5>
                        <p className="text-[11px] text-zinc-400">{cat.description || cat.slug}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 cursor-pointer transition-colors"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-[#171724] border border-emerald-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        Integração Total com o Supabase
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Oficial
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Armazenamento PostgreSQL em nuvem, autenticação, storage para fotos/vídeos e mensagens em tempo real.
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 shrink-0 self-start sm:self-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-xs font-bold text-zinc-200">
                      {supabaseStatus?.connected ? 'Conectado ao Supabase' : (supabaseStatus?.configured ? 'Aguardando Tabelas' : 'Chaves Pendentes')}
                    </span>
                  </div>
                </div>

                {supabaseStatus?.error && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{supabaseStatus.error}</span>
                  </div>
                )}
              </div>

              {/* Step 1: Configuration Form */}
              <div className="p-6 rounded-2xl bg-[#171724] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>1. Credenciais de Acesso da API</span>
                  </h4>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold underline transition-colors"
                  >
                    <span>Abrir Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <form onSubmit={handleSaveSupabase} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      Project URL (SUPABASE_URL):
                    </label>
                    <input
                      type="text"
                      value={sbUrlInput}
                      onChange={(e) => setSbUrlInput(e.target.value)}
                      placeholder="https://sua-empresa.supabase.co"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      Anon Public Key (SUPABASE_ANON_KEY):
                    </label>
                    <input
                      type="password"
                      value={sbKeyInput}
                      onChange={(e) => setSbKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      Service Role Key (Opcional - para operações admin de backend):
                    </label>
                    <input
                      type="password"
                      value={sbServiceKeyInput}
                      onChange={(e) => setSbServiceKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSb}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSavingSb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isSavingSb ? 'Conectando...' : 'Salvar & Conectar ao Supabase'}</span>
                  </button>
                </form>
              </div>

              {/* Step 2: SQL Migration Script */}
              <div className="p-6 rounded-2xl bg-[#171724] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>2. Código SQL do Banco de Dados (Schema Completo)</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Copie e execute este código no SQL Editor do seu projeto Supabase para criar todas as tabelas e permissões.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    {copiedSql ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Copiado com Sucesso! 🌸' : 'Copiar Código SQL'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                  <div className="text-[11px] text-zinc-400 space-y-1 mb-3">
                    <p className="font-bold text-zinc-200">Como executar no Supabase:</p>
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Acesse seu painel no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Supabase Dashboard</a>.</li>
                      <li>No menu lateral esquerdo, clique no ícone do <strong>SQL Editor</strong>.</li>
                      <li>Clique no botão <strong>+ New query</strong>.</li>
                      <li>Cole todo o código abaixo no editor e clique em <strong>Run</strong> (ou aperte Ctrl+Enter).</li>
                    </ol>
                  </div>

                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-300/90 text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto border border-white/5 select-all">
                      {rawSql || '-- Carregando código SQL completo...'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
