import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Video,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  RotateCw,
  Crop,
  MapPin,
  AtSign,
  Hash,
  MessageSquare,
  Wand2,
  Check,
  Upload,
  Music,
  FileText,
  Timer,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
  defaultMode?: 'post' | 'story' | 'video';
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  onClose,
  onPostCreated,
  defaultMode = 'post',
}) => {
  const { user, darkMode } = useAuth();

  // Mode: post, story, video
  const [contentType, setContentType] = useState<'post' | 'story' | 'video'>(defaultMode);
  const [step, setStep] = useState<'media' | 'edit' | 'publish'>('media');

  // Media state
  const [mediaFiles, setMediaFiles] = useState<{
    url: string;
    type: 'image' | 'video' | 'audio' | 'pdf' | 'gif';
    file?: File;
    fileName?: string;
    thumbnail?: string;
    filter?: string;
    rotation?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
  }[]>([]);
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);

  // Edit tools
  const [activeFilter, setActiveFilter] = useState('none');
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [stickers, setStickers] = useState<string[]>([]);
  const [textOverlay, setTextOverlay] = useState('');

  // Publication metadata
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; slug: string; description: string }[]>(() => {
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
  const [selectedCategory, setSelectedCategory] = useState<string>('Geral');
  const [allowComments, setAllowComments] = useState(true);
  const [isTemporary, setIsTemporary] = useState(false);
  const [durationHours, setDurationHours] = useState(24);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample presets for quick testing
  const samplePresets = [
    {
      name: 'Arquitetura Urbana',
      url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1000&auto=format&fit=crop&q=80',
      type: 'image' as const,
      thumbnail: undefined,
    },
    {
      name: 'Café & Estilo de Vida',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
      type: 'image' as const,
      thumbnail: undefined,
    },
    {
      name: 'Retrato em Estúdio',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80',
      type: 'image' as const,
      thumbnail: undefined,
    },
    {
      name: 'Vídeo / Reel',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-walking-in-a-pink-and-purple-neon-lighted-room-42588-large.mp4',
      type: 'video' as const,
      thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const filters = [
    { id: 'none', label: 'Original', css: '' },
    { id: 'cinematic', label: 'Cinemático', css: 'brightness(102%) contrast(105%) saturate(110%)' },
    { id: 'warm', label: 'Tom Quente', css: 'brightness(106%) contrast(92%) saturate(120%) sepia(10%)' },
    { id: 'vivid', label: 'Cores Vivas', css: 'brightness(108%) contrast(105%) saturate(125%)' },
    { id: 'vintage', label: 'Vintage', css: 'brightness(98%) contrast(105%) saturate(105%) sepia(20%)' },
    { id: 'bw_soft', label: 'Monocromático', css: 'grayscale(100%) brightness(102%) contrast(95%)' },
  ];

  const suggestedHashtags = ['#fotografia', '#design', '#lifestyle', '#arte', '#viagem', '#criativo'];

  const generateVideoThumbnail = (videoFile: File): Promise<string> => {
    return new Promise(resolve => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 0.5;

        video.onloadeddata = () => {
          video.currentTime = 0.5;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 480;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve(dataUrl);
            } else {
              resolve('');
            }
          } catch {
            resolve('');
          }
        };

        video.onerror = () => resolve('');
      } catch {
        resolve('');
      }
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    sounds.playCameraShutter();
    const newMediaList: typeof mediaFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = file.type.startsWith('image/') && !file.type.includes('gif') && !ext.includes('gif');
      const isGif = file.type.includes('gif') || ext === 'gif';
      const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);
      const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext);
      const isPdf = file.type === 'application/pdf' || ['pdf', 'doc', 'docx', 'txt'].includes(ext);

      if (!isImage && !isGif && !isVideo && !isAudio && !isPdf) {
        alert(`Formato de arquivo não suportado (${ext || file.type}). Permitidos: Fotos, GIFs, Vídeos, PDFs e Áudios.`);
        continue;
      }

      const maxSize = isVideo ? 50 * 1024 * 1024 : isAudio ? 25 * 1024 * 1024 : isPdf ? 20 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`O arquivo ${file.name} excede o tamanho máximo permitido de ${Math.round(maxSize / (1024 * 1024))}MB.`);
        continue;
      }

      const localUrl = URL.createObjectURL(file);
      let thumbUrl: string | undefined = undefined;

      if (isVideo) {
        thumbUrl = await generateVideoThumbnail(file);
      }

      let mediaType: 'image' | 'video' | 'audio' | 'pdf' | 'gif' = 'image';
      if (isVideo) mediaType = 'video';
      else if (isAudio) mediaType = 'audio';
      else if (isPdf) mediaType = 'pdf';
      else if (isGif) mediaType = 'gif';

      newMediaList.push({
        url: localUrl,
        type: mediaType,
        file,
        fileName: file.name,
        thumbnail: thumbUrl || undefined,
        filter: 'none',
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
      });
    }

    if (newMediaList.length > 0) {
      setMediaFiles(prev => [...prev, ...newMediaList]);
      setStep('edit');
    }
  };

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    sounds.playCameraShutter();
    setMediaFiles([
      {
        url: preset.url,
        type: preset.type,
        thumbnail: preset.thumbnail,
        filter: 'none',
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
      },
    ]);
    setStep('edit');
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleAddSticker = (sticker: string) => {
    sounds.playSparkle();
    setStickers(prev => [...prev, sticker]);
  };

  const handleAiCaption = async () => {
    setIsAiGenerating(true);
    sounds.playSparkle();
    try {
      const res = await api.getKawaiiCaption('novo momento e estilo de vida', 'elegante e inspirador');
      setCaption(res.caption);
    } catch (e) {
      setCaption('Compartilhando novos momentos e inspirações. #fotografia #lifestyle #design');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddHashtag = (tag: string) => {
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    setCaption(prev => {
      if (prev.includes(formatted)) return prev;
      return prev ? `${prev} ${formatted}` : formatted;
    });
  };

  const handlePublish = async () => {
    if (mediaFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Upload media files to backend with fallback
      const uploadedMediaItems: {
        url: string;
        type: 'image' | 'video' | 'audio' | 'pdf' | 'gif';
        filter?: string;
        fileName?: string;
        thumbnail?: string;
      }[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const item = mediaFiles[i];
        let finalUrl = item.url;

        if (item.file) {
          try {
            const uploadRes = await api.uploadFile(item.file);
            if (uploadRes?.url) {
              finalUrl = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn('Direct file upload fallback:', uploadErr);
          }
        }
        uploadedMediaItems.push({
          url: finalUrl,
          type: item.type,
          filter: (item.type === 'image' || item.type === 'gif') && activeFilter !== 'none' ? activeFilter : undefined,
          fileName: item.fileName,
          thumbnail: item.thumbnail,
        });
        setUploadProgress(40 + Math.round(((i + 1) / mediaFiles.length) * 40));
      }

      setUploadProgress(85);

      if (contentType === 'story') {
        await api.createStory({
          mediaUrl: uploadedMediaItems[0].url,
          mediaType: uploadedMediaItems[0].type === 'video' ? 'video' : 'image',
          textOverlay: textOverlay || undefined,
          stickers: stickers.length > 0 ? stickers : undefined,
          location: location || undefined,
          filter: activeFilter,
        });
      } else {
        await api.createPost({
          media: uploadedMediaItems,
          caption: caption.trim(),
          location: location.trim() || undefined,
          allowComments,
          isTemporary,
          durationHours,
          category: selectedCategory,
        });
      }

      setUploadProgress(100);
      sounds.playSparkle();

      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#38BDF8', '#818CF8', '#A78BFA'],
      });

      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error('Publish error:', err);
      alert(`Não foi possível publicar: ${err.message || 'Erro de conexão'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const activeMedia = mediaFiles[selectedMediaIdx] || mediaFiles[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg max-h-[90vh] h-[90vh] sm:h-[650px] rounded-t-[28px] sm:rounded-[28px] ${
          darkMode ? 'bg-[#12121A] text-white border-white/10' : 'bg-white text-stone-900 border-white/10'
        } border shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200`}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-bold text-stone-900 dark:text-white">
              {contentType === 'story'
                ? 'Criar Story'
                : contentType === 'video'
                ? 'Criar Vídeo / Reel'
                : 'Nova Publicação'}
            </h2>
          </div>
          <button
            id="btn-create-modal-close"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-white/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector Tabs */}
        {step === 'media' && (
          <div className="p-2.5 bg-stone-50 dark:bg-[#0E0E14] border-b border-white/10 dark:border-white/10 flex items-center justify-center gap-2">
            {[
              { id: 'post', label: 'Foto / Galeria' },
              { id: 'video', label: 'Reel / Vídeo' },
              { id: 'story', label: 'Story (24h)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setContentType(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  contentType === tab.id
                    ? 'bg-white/50 text-white shadow-xs'
                    : 'text-stone-600 dark:text-zinc-300 hover:bg-white/10/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* STEP 1: SELECT MEDIA */}
          {step === 'media' && (
            <div className="space-y-5">
              {/* File Upload Drop Area */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.txt,audio/*,.mp3,.wav,.ogg,.m4a"
                multiple={contentType === 'post'}
                onChange={handleFilesSelected}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-52 rounded-2xl border-2 border-dashed border-white/15 dark:border-white/15 bg-white/5/40 dark:bg-[#181824]/40 flex flex-col items-center justify-center gap-2.5 p-6 text-center hover:bg-white/5 dark:hover:bg-[#181824]/60 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-black text-white flex items-center justify-center shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-stone-800 dark:text-white">
                    Selecione arquivos do celular
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
                    Fotos, GIFs, vídeos, PDFs e áudios / voz
                  </p>
                </div>
              </div>

              {/* Sample Presets */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-xs font-bold text-stone-700 dark:text-zinc-200">
                    Ou experimente com fotos de exemplo:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {samplePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2 rounded-2xl ${
                        darkMode ? 'bg-[#181824]' : 'bg-white'
                      } border border-white/10 dark:border-white/10 text-left hover:scale-[1.01] transition-transform cursor-pointer shadow-2xs flex items-center gap-2.5`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover"
                      />
                      <span className="text-xs font-medium text-stone-800 dark:text-white truncate">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EDIT MEDIA & FILTERS */}
          {step === 'edit' && activeMedia && (
            <div className="space-y-4">
              {/* Preview Window */}
              <div className="relative w-full aspect-square max-h-60 rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
                {activeMedia.type === 'video' ? (
                  <video
                    src={activeMedia.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      filter: `${filters.find(f => f.id === activeFilter)?.css || ''} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                    }}
                  />
                ) : activeMedia.type === 'audio' ? (
                  <div className="w-full h-full p-5 bg-[#161622] flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black text-white flex items-center justify-center shadow-lg shadow-white/5 animate-pulse">
                      <Music className="w-7 h-7" />
                    </div>
                    <div className="max-w-[85%]">
                      <p className="font-heading text-xs font-bold text-white truncate">
                        {activeMedia.fileName || 'Arquivo de Áudio Selecionado'}
                      </p>
                      <span className="text-[10px] text-zinc-300">Áudio pronto para reprodução</span>
                    </div>
                    <audio controls src={activeMedia.url} className="w-full max-w-xs mt-1" />
                  </div>
                ) : activeMedia.type === 'pdf' ? (
                  <div className="w-full h-full p-5 bg-[#161622] flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/50 text-white flex items-center justify-center shadow-lg shadow-white/5">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="max-w-[85%]">
                      <p className="font-heading text-xs font-bold text-white truncate">
                        {activeMedia.fileName || 'Documento PDF'}
                      </p>
                      <span className="text-[10px] text-zinc-300">Documento anexado para download</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={activeMedia.url}
                    alt="Edit"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      filter: `${filters.find(f => f.id === activeFilter)?.css || ''} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                    }}
                  />
                )}

                {/* Stickers on preview */}
                {stickers.map((stk, i) => (
                  <span
                    key={i}
                    className="absolute text-3xl select-none"
                    style={{
                      left: `${20 + (i * 25) % 60}%`,
                      top: `${20 + (i * 30) % 60}%`,
                    }}
                  >
                    {stk}
                  </span>
                ))}

                {textOverlay && (
                  <div className="absolute inset-x-4 bottom-4 bg-black/60 backdrop-blur-sm text-white text-xs font-heading p-2 rounded-xl text-center border border-white/20">
                    {textOverlay}
                  </div>
                )}
              </div>

              {/* Quick Rotation Tool & Filters (Only for visual media) */}
              {(activeMedia.type === 'image' || activeMedia.type === 'gif' || activeMedia.type === 'video') ? (
                <>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-stone-700 dark:text-zinc-300">
                      Filtros & Ajustes
                    </span>
                    <button
                      onClick={handleRotate}
                      className="flex items-center gap-1 text-xs font-bold text-white hover:underline cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Girar 90°</span>
                    </button>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {filters.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          activeFilter === f.id
                            ? 'bg-white/50 text-white shadow-xs'
                            : 'bg-stone-100 dark:bg-[#161622] text-stone-700 dark:text-zinc-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#181824] border border-white/10 dark:border-white/10 text-center text-xs text-stone-600 dark:text-zinc-300">
                  Arquivo pronto para ser publicado! Você pode adicionar uma legenda no próximo passo.
                </div>
              )}

              {/* Story Overlay Text */}
              {contentType === 'story' && (
                <div>
                  <span className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 block mb-1">
                    Texto no Story:
                  </span>
                  <input
                    type="text"
                    value={textOverlay}
                    onChange={e => setTextOverlay(e.target.value)}
                    placeholder="Adicione uma frase ao seu Story..."
                    className="w-full bg-stone-50 dark:bg-[#161622] text-xs text-stone-900 dark:text-white px-3.5 py-2 rounded-xl border border-white/10 dark:border-white/10 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PUBLISH METADATA & AI ASSISTANT */}
          {step === 'publish' && (
            <div className="space-y-4">
              {/* Caption & AI Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-800 dark:text-zinc-200">
                    Legenda da Publicação:
                  </label>
                  <button
                    type="button"
                    onClick={handleAiCaption}
                    disabled={isAiGenerating}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-black text-white text-[11px] font-bold shadow-xs hover:scale-102 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Wand2 className={`w-3 h-3 ${isAiGenerating ? 'animate-spin' : ''}`} />
                    <span>{isAiGenerating ? 'Gerando...' : 'Sugerir com IA'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Escreva sua legenda com @menções e #hashtags..."
                  className="w-full bg-stone-50 dark:bg-[#161622] text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500 p-3 rounded-2xl border border-white/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 leading-relaxed resize-none"
                />
              </div>

              {/* Hashtag Suggestion Chips */}
              <div>
                <span className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 block mb-1">
                  Hashtags Sugeridas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedHashtags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-[#161622] text-[11px] font-medium text-stone-700 dark:text-zinc-200 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 block mb-1">
                  Categoria da Publicação:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCategories.map(cat => (
                    <button
                      key={cat.id || cat.slug}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat.name
                          ? 'bg-white text-black shadow-md'
                          : 'bg-stone-100 dark:bg-[#161622] text-stone-700 dark:text-zinc-300 border border-white/10 dark:border-white/10 hover:border-white/20'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Field */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 block mb-1">
                  Localização:
                </label>
                <div className="flex items-center gap-2 bg-stone-50 dark:bg-[#161622] px-3 py-2 rounded-xl border border-white/10 dark:border-white/10">
                  <MapPin className="w-4 h-4 text-white" />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ex: São Paulo, Brasil / Studio Photo"
                    className="flex-1 bg-transparent text-xs text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Comments Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-[#161622] border border-white/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-white" />
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-white block">
                      Permitir Comentários
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                      Outros usuários poderão comentar no post
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={e => setAllowComments(e.target.checked)}
                  className="w-4 h-4 accent-white cursor-pointer"
                />
              </div>

              {/* Temporary / Expiration Countdown Option (Ephemeral Posts) */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#161622] border border-white/10 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-white" />
                    <div>
                      <span className="text-xs font-bold text-stone-900 dark:text-white block">
                        Publicação Temporária (Contagem Regressiva)
                      </span>
                      <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                        Ativa um contador regressivo em tempo real e auto-exclusão
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isTemporary}
                    onChange={e => setIsTemporary(e.target.checked)}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                </div>

                {isTemporary && (
                  <div className="pt-2.5 border-t border-white/10 dark:border-white/10 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-zinc-300">
                        Tempo de duração antes de expirar:
                      </span>
                      <span className="text-[11px] font-extrabold text-white dark:text-zinc-400">
                        {durationHours} {durationHours === 1 ? 'hora' : 'horas'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { hours: 1, label: '1 Hora (Efêmero)' },
                        { hours: 6, label: '6 Horas' },
                        { hours: 12, label: '12 Horas' },
                        { hours: 24, label: '24 Horas (1 dia)' },
                        { hours: 48, label: '48 Horas (2 dias)' },
                        { hours: 168, label: '7 Dias' },
                      ].map(option => (
                        <button
                          key={option.hours}
                          type="button"
                          onClick={() => setDurationHours(option.hours)}
                          className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer text-center ${
                            durationHours === option.hours
                              ? 'bg-white/50 text-white shadow-xs'
                              : 'bg-white dark:bg-[#171724] text-stone-700 dark:text-zinc-200 border border-white/15 dark:border-white/10 hover:border-white/20'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Processing Status / Upload Progress Component */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-white/50/10 dark:bg-white/5 border border-white/15 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/50 animate-ping"></span>
                      Status de Processamento & Upload
                    </span>
                    <span className="text-white dark:text-zinc-400 font-extrabold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-white/5 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-white text-black transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-zinc-300">
                    Processando e enviando arquivos (vídeos e PDFs pesados podem levar alguns instantes)...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-white/10 dark:border-white/10 flex items-center justify-between gap-3">
          {step === 'media' && (
            <div className="text-xs text-stone-400">
              Escolha uma imagem ou vídeo para continuar
            </div>
          )}

          {step === 'edit' && (
            <>
              <button
                onClick={() => setStep('media')}
                className="px-4 py-2 rounded-full text-xs font-bold text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (contentType === 'story') {
                    handlePublish();
                  } else {
                    setStep('publish');
                  }
                }}
                className="px-6 py-2.5 rounded-2xl bg-white text-black text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                {contentType === 'story' ? 'Publicar Story' : 'Avançar →'}
              </button>
            </>
          )}

          {step === 'publish' && (
            <>
              <button
                onClick={() => setStep('edit')}
                disabled={isUploading}
                className="px-4 py-2 rounded-full text-xs font-bold text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handlePublish}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-white text-black text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isUploading ? 'Salvando...' : 'Publicar Agora'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
