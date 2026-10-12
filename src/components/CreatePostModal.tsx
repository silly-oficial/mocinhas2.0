import { ui, useUi } from '../i18n/ui';
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
import { uploadVideoPoster } from '../utils/videoPoster';
import confetti from 'canvas-confetti';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: (post?: any) => void;
  defaultMode?: 'post' | 'story' | 'video';
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  onClose,
  onPostCreated,
  defaultMode = 'post',
}) => {
  useUi();
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
      { id: 'geral', name: 'Geral', slug: 'geral', description: ui("Geral e Diversos") },
      { id: 'fotografia', name: 'Fotografia', slug: 'fotografia', description: ui("Fotos e Ensaios") },
      { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: ui("Estilo de vida e cotidiano") },
      { id: 'reels', name: 'Reels & Vídeos', slug: 'reels', description: ui("Vídeos curtos e reels") }
    ];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(ui("Geral"));
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
    { id: 'none', label: ui("Original"), css: '' },
    { id: 'cinematic', label: ui("Cinemático"), css: 'brightness(102%) contrast(105%) saturate(110%)' },
    { id: 'warm', label: ui("Tom Quente"), css: 'brightness(106%) contrast(92%) saturate(120%) sepia(10%)' },
    { id: 'vivid', label: ui("Cores Vivas"), css: 'brightness(108%) contrast(105%) saturate(125%)' },
    { id: 'vintage', label: ui("Vintage"), css: 'brightness(98%) contrast(105%) saturate(105%) sepia(20%)' },
    { id: 'bw_soft', label: ui("Monocromático"), css: 'grayscale(100%) brightness(102%) contrast(95%)' },
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
      setCaption(ui("Compartilhando novos momentos e inspirações. #fotografia #lifestyle #design"));
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePublish = async () => {
    if (mediaFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Upload media files to backend with reliable fallback
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
        let posterUrl: string | undefined;

        if (item.file) {
          try {
            const uploadRes = await api.uploadFile(item.file);
            if (uploadRes?.url) {
              finalUrl = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn(ui("FormData upload error, trying base64 fallback:"), uploadErr);
            try {
              const b64 = await fileToBase64(item.file);
              const b64Res = await api.uploadBase64(b64, item.file.name);
              if (b64Res?.url) {
                finalUrl = b64Res.url;
              }
            } catch (b64Err) {
              console.error('Base64 upload error:', b64Err);
            }
          }

          // Poster leve para feed e miniaturas se for vídeo
          if (item.type === 'video') {
            try {
              posterUrl = await uploadVideoPoster(item.file);
            } catch (pErr) {
              console.warn(ui("Poster error:"), pErr);
            }
          }
        }

        // Se a URL ainda for temporária blob:..., converte para base64 e envia para o servidor
        if (finalUrl.startsWith('blob:')) {
          try {
            const response = await fetch(finalUrl);
            const blob = await response.blob();
            const b64 = await new Promise<string>((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result as string);
              r.onerror = rej;
              r.readAsDataURL(blob);
            });
            const b64Res = await api.uploadBase64(b64, item.fileName || 'upload.jpg');
            if (b64Res?.url) {
              finalUrl = b64Res.url;
            }
          } catch (blobErr) {
            console.warn(ui("Blob persistence fallback error:"), blobErr);
          }
        }

        uploadedMediaItems.push({
          url: finalUrl,
          type: item.type,
          filter: (item.type === 'image' || item.type === 'gif') && activeFilter !== 'none' ? activeFilter : undefined,
          fileName: item.fileName,
          thumbnail: posterUrl || item.thumbnail || finalUrl,
        });
        setUploadProgress(40 + Math.round(((i + 1) / mediaFiles.length) * 40));
      }

      setUploadProgress(85);

      let createdPostResult: any = null;

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
        const res = await api.createPost({
          media: uploadedMediaItems,
          caption: caption.trim(),
          location: location.trim() || undefined,
          allowComments,
          isTemporary,
          durationHours,
          category: selectedCategory,
        });
        createdPostResult = res?.post;
      }

      setUploadProgress(100);
      sounds.playSparkle();

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#38BDF8', '#818CF8', '#A78BFA'],
      });

      onPostCreated(createdPostResult);
      onClose();
    } catch (err: any) {
      console.error(ui("Publish error:"), err);
      alert(`Não foi possível publicar: ${err.message || 'Erro de conexão'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const activeMedia = mediaFiles[selectedMediaIdx] || mediaFiles[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] h-[90vh] sm:h-[650px] rounded-t-[32px] sm:rounded-[32px] bg-[#12121B] text-white border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-4.5 border-b border-white/10 flex items-center justify-between bg-[#12121B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#171724] border border-white/10 flex items-center justify-center text-white shadow-xs">
              {contentType === 'story' ? (
                <Sparkles className="w-4 h-4 text-amber-300" />
              ) : contentType === 'video' ? (
                <Video className="w-4 h-4 text-sky-400" />
              ) : (
                <ImageIcon className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="font-heading text-sm font-extrabold text-white">
                {contentType === 'story'
                  ? ui("Criar Story")
                  : contentType === 'video'
                  ? ui("Criar Vídeo / Reel")
                  : ui("Nova Publicação")}
              </h2>
            </div>
          </div>
          <button
            id="btn-create-modal-close"
            onClick={onClose}
            aria-label={ui("Fechar")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector Tabs */}
        {step === 'media' && (
          <div className="p-2 bg-[#0E0E15] border-b border-white/10 flex items-center justify-center gap-1.5">
            {[
              { id: 'post', label: ui("Foto / Galeria") },
              { id: 'video', label: ui("Reel / Vídeo") },
              { id: 'story', label: ui("Story (24h)") },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setContentType(tab.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  contentType === tab.id
                    ? 'bg-white text-black shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#12121B]">
          {/* STEP 1: SELECT MEDIA */}
          {step === 'media' && (
            <div className="space-y-4">
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
                className="w-full h-48 rounded-2xl border-2 border-dashed border-white/15 bg-[#171724]/60 hover:bg-[#171724] hover:border-white/30 flex flex-col items-center justify-center gap-2.5 p-6 text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
                  <Upload className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-white">
                    {ui("Selecione fotos ou vídeos do celular")}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {ui("Fotos, GIFs, vídeos curtos, PDFs e áudios")}</p>
                </div>
              </div>

              {/* Sample Presets */}
              <div className="pt-1">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-bold text-zinc-300">
                    {ui("Ou selecione um exemplo para testar:")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {samplePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPreset(preset)}
                      className="p-2.5 rounded-2xl bg-[#171724] border border-white/10 text-left hover:border-white/25 hover:bg-[#1C1C2C] transition-all cursor-pointer shadow-xs flex items-center gap-2.5"
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover bg-black/40"
                      />
                      <span className="text-xs font-bold text-white truncate">
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
              <div className="relative w-full aspect-square max-h-60 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-inner">
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
                  <div className="w-full h-full p-5 bg-[#171724] flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg animate-pulse">
                      <Music className="w-7 h-7" />
                    </div>
                    <div className="max-w-[85%]">
                      <p className="font-heading text-xs font-bold text-white truncate">
                        {activeMedia.fileName || 'Arquivo de Áudio'}
                      </p>
                      <span className="text-[10px] text-zinc-400">{ui("Pronto para reprodução")}</span>
                    </div>
                    <audio controls src={activeMedia.url} className="w-full max-w-xs mt-1" />
                  </div>
                ) : activeMedia.type === 'pdf' ? (
                  <div className="w-full h-full p-5 bg-[#171724] flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="max-w-[85%]">
                      <p className="font-heading text-xs font-bold text-white truncate">
                        {activeMedia.fileName || 'Documento PDF'}
                      </p>
                      <span className="text-[10px] text-zinc-400">{ui("Documento anexado")}</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={activeMedia.url}
                    alt={ui("Edit")}
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
                  <div className="absolute inset-x-4 bottom-4 bg-black/70 backdrop-blur-sm text-white text-xs font-heading p-2 rounded-xl text-center border border-white/20">
                    {textOverlay}
                  </div>
                )}
              </div>

              {/* Quick Rotation Tool & Filters (Only for visual media) */}
              {(activeMedia.type === 'image' || activeMedia.type === 'gif' || activeMedia.type === 'video') ? (
                <>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-300">
                      {ui("Filtros & Ajustes")}</span>
                    <button
                      onClick={handleRotate}
                      className="flex items-center gap-1 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{ui("Girar 90°")}</span>
                    </button>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {filters.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activeFilter === f.id
                            ? 'bg-white text-black shadow-xs font-extrabold'
                            : 'bg-[#171724] hover:bg-[#1E1E2E] text-zinc-300 border border-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-[#171724] border border-white/10 text-center text-xs text-zinc-300">
                  {ui("Arquivo pronto para ser publicado! Você pode adicionar uma legenda no próximo passo.")}</div>
              )}

              {/* Story Overlay Text */}
              {contentType === 'story' && (
                <div>
                  <span className="text-[11px] font-bold text-zinc-300 block mb-1">
                    {ui("Texto no Story:")}</span>
                  <input
                    type="text"
                    value={textOverlay}
                    onChange={e => setTextOverlay(e.target.value)}
                    placeholder={ui("Adicione uma frase ao seu Story...")}
                    className="w-full bg-[#171724] text-xs text-white placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/30"
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
                  <label className="text-xs font-bold text-zinc-200">
                    {ui("Legenda da Publicação:")}</label>
                  <button
                    type="button"
                    onClick={handleAiCaption}
                    disabled={isAiGenerating}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-black text-[11px] font-extrabold shadow-xs hover:bg-neutral-200 active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    <Wand2 className={`w-3 h-3 ${isAiGenerating ? 'animate-spin' : ''}`} />
                    <span>{isAiGenerating ? ui("Gerando...") : ui("Sugerir com IA")}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder={ui("Escreva sua legenda com @menções e #hashtags...")}
                  className="w-full bg-[#171724] text-xs text-white placeholder-zinc-500 p-3 rounded-2xl border border-white/10 focus:outline-none focus:border-white/30 leading-relaxed resize-none"
                />
              </div>

              {/* Hashtag Suggestion Chips */}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                  {ui("Hashtags Sugeridas:")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedHashtags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className="px-2.5 py-1 rounded-full bg-[#171724] hover:bg-[#1E1E2E] text-[11px] font-medium text-zinc-300 border border-white/10 hover:border-white/20 cursor-pointer transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                  {ui("Categoria da Publicação:")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCategories.map(cat => (
                    <button
                      key={cat.id || cat.slug}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat.name
                          ? 'bg-white text-black font-extrabold shadow-md'
                          : 'bg-[#171724] hover:bg-[#1E1E2E] text-zinc-300 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Field */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                  {ui("Localização:")}</label>
                <div className="flex items-center gap-2 bg-[#171724] px-3.5 py-2.5 rounded-xl border border-white/10 focus-within:border-white/25">
                  <MapPin className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder={ui("Ex: São Paulo, Brasil / Studio Photo")}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Comments Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#171724] border border-white/10">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-zinc-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {ui("Permitir Comentários")}</span>
                    <span className="text-[10px] text-zinc-400">
                      {ui("Outros usuários poderão comentar no post")}</span>
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
              <div className="p-3.5 rounded-2xl bg-[#171724] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Timer className="w-4 h-4 text-zinc-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {ui("Publicação Temporária (Contagem Regressiva)")}</span>
                      <span className="text-[10px] text-zinc-400">
                        {ui("Ativa um contador regressivo em tempo real e auto-exclusão")}</span>
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
                  <div className="pt-2.5 border-t border-white/10 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-300">
                        {ui("Tempo de duração antes de expirar:")}</span>
                      <span className="text-[11px] font-extrabold text-white">
                        {durationHours} {durationHours === 1 ? 'hora' : 'horas'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { hours: 1, label: ui("1 Hora (Efêmero)") },
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
                              ? 'bg-white text-black font-extrabold shadow-xs'
                              : 'bg-[#12121B] hover:bg-[#1A1A28] text-zinc-300 border border-white/10 hover:border-white/20'
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
                <div className="p-4 rounded-2xl bg-[#171724] border border-white/15 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                      {ui("Status de Processamento & Upload")}</span>
                    <span className="text-white font-extrabold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-white transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {ui("Processando e salvando arquivos com segurança...")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-[#12121B]">
          {step === 'media' && (
            <div className="text-xs text-zinc-400">
              {ui("Escolha uma imagem ou vídeo para continuar")}</div>
          )}

          {step === 'edit' && (
            <>
              <button
                onClick={() => setStep('media')}
                className="px-4 py-2 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                {ui("Voltar")}</button>
              <button
                onClick={() => {
                  if (contentType === 'story') {
                    handlePublish();
                  } else {
                    setStep('publish');
                  }
                }}
                className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-extrabold shadow-lg hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer"
              >
                {contentType === 'story' ? ui("Publicar Story") : ui("Avançar →")}
              </button>
            </>
          )}

          {step === 'publish' && (
            <>
              <button
                onClick={() => setStep('edit')}
                disabled={isUploading}
                className="px-4 py-2 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                {ui("Voltar")}</button>
              <button
                onClick={handlePublish}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-white text-black text-xs font-extrabold shadow-lg hover:bg-neutral-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isUploading ? ui("Publicando...") : ui("Publicar Agora")}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
