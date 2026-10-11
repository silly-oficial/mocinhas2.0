import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Check, Lock, Globe, Sparkles, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';
import { UserGender } from '../types';
import { getAvatarsByGender, DEFAULT_AVATAR_FEMALE, getMatchingCoverForAvatar } from '../utils/avatars';
import { useLanguage } from '../context/LanguageContext';

interface EditProfileModalProps {
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  onClose,
  onProfileUpdated,
}) => {
  const { user, updateUser, darkMode } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [animeTitle, setAnimeTitle] = useState(user?.animeTitle || 'Criador Digital');
  const [website, setWebsite] = useState(user?.website || '');
  const [gender, setGender] = useState<UserGender>(user?.gender || 'feminino');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [avatar, setAvatar] = useState(user?.avatar || DEFAULT_AVATAR_FEMALE);
  const [banner, setBanner] = useState(user?.banner || '');
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const currentPresets = getAvatarsByGender(gender);

  const { t } = useLanguage();

  const handleGenderChange = (newGender: UserGender) => {
    setGender(newGender);
    sounds.playHeartPop();
    // Auto suggest default avatar for the newly selected gender and matching cover
    const presets = getAvatarsByGender(newGender);
    const chosen = presets[0];
    setAvatar(chosen);
    setBanner(getMatchingCoverForAvatar(chosen).cover);
  };

  const handleSuggestAvatar = () => {
    const presets = getAvatarsByGender(gender);
    const nextAvatar = presets[Math.floor(Math.random() * presets.length)];
    setAvatar(nextAvatar);
    setBanner(getMatchingCoverForAvatar(nextAvatar).cover);
    sounds.playSparkle();
  };

  const profileTitles = [
    'Criador Digital',
    'Fotógrafo(a)',
    'Designer Visual',
    'Arquiteto(a)',
    'Estilo de Vida',
    'Desenvolvedor(a)',
    'Artista',
  ];

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadFile(file);
      setAvatar(res.url);
      sounds.playCameraShutter();
    } catch (err) {
      alert('Erro ao enviar foto de perfil');
    }
  };

  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadFile(file);
      setBanner(res.url);
      sounds.playCameraShutter();
    } catch (err) {
      alert('Erro ao enviar capa');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser({
        displayName: displayName.trim(),
        bio: bio.trim(),
        animeTitle: animeTitle.trim(),
        website: website.trim(),
        gender,
        isPrivate,
        avatar,
        banner,
      });
      sounds.playSparkle();
      onProfileUpdated();
      onClose();
    } catch (err) {
      alert('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg max-h-[90vh] h-[90vh] sm:h-[680px] rounded-t-[28px] sm:rounded-[28px] ${
          darkMode ? 'bg-[#12121A] text-white border-white/10' : 'bg-white text-stone-900 border-zinc-200'
        } border shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-white" />
            <span>Editar Perfil</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-white/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Banner & Avatar Pickers */}
          <div className="relative mb-8">
            {/* Banner preview */}
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="w-full h-28 rounded-2xl bg-white/10 dark:bg-[#161622] overflow-hidden cursor-pointer relative group flex items-center justify-center border border-white/15/60 dark:border-white/10"
            >
              {banner ? (
                <img
                  src={banner}
                  alt="Banner"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-stone-400 font-medium">Toque para adicionar foto de capa</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBanner(getMatchingCoverForAvatar(avatar).cover);
                  sounds.playSparkle();
                }}
                className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-zinc-200 hover:text-white flex items-center gap-1 font-medium transition-all z-10 hover:bg-black/80 cursor-pointer shadow-xs"
                title="Aplicar capa combinando com avatar"
              >
                <Sparkles className="w-3 h-3 text-zinc-400" />
                <span>Capa combinando</span>
              </button>
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                <Camera className="w-4 h-4" />
                <span>Trocar Capa</span>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFile}
                className="hidden"
              />
            </div>

            {/* Avatar Preview */}
            <div className="absolute -bottom-7 left-4 flex items-end gap-3">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-20 h-20 rounded-full p-0.5 bg-white dark:bg-[#12121A] shadow-md cursor-pointer relative group"
              >
                <img
                  src={avatar}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover border-2 border-white/25 bg-white/5"
                />
                <div className="absolute inset-0.5 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="w-4 h-4" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 block">
                    Avatares ({gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Outro'}):
                  </span>
                  <button
                    type="button"
                    onClick={handleSuggestAvatar}
                    className="text-[10px] text-white hover:text-white flex items-center gap-0.5 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Sugerir
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {currentPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatar(p);
                        setBanner(getMatchingCoverForAvatar(p).cover);
                        sounds.playHeartPop();
                      }}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 ${
                        avatar === p ? 'border-white/30 scale-110 shadow-xs' : 'border-white/10 hover:scale-105'
                      } transition-all cursor-pointer`}
                    >
                      <img
                        src={p}
                        alt="Preset"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            {/* Gender Selection */}
            <div>
              <label className="text-xs font-bold text-stone-800 dark:text-zinc-200 block mb-1.5">
                Sexo / Identidade:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleGenderChange('feminino')}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    gender === 'feminino'
                      ? 'bg-white text-black shadow-xs'
                      : 'bg-stone-100 dark:bg-[#161622] text-stone-700 dark:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span>✦</span>
                  <span>Feminino</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenderChange('masculino')}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    gender === 'masculino'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-[#161622] text-stone-700 dark:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span>⚡</span>
                  <span>Masculino</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenderChange('outro')}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    gender === 'outro'
                      ? 'bg-white text-black font-extrabold shadow-xs'
                      : 'bg-stone-100 dark:bg-[#161622] text-stone-700 dark:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span>✨</span>
                  <span>Outro</span>
                </button>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1">
                Ao alterar o sexo, novos avatares recomendados são sugeridos automaticamente.
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-bold text-stone-800 dark:text-zinc-200 block mb-1">
                Nome de Exibição:
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="w-full bg-stone-50 dark:bg-[#161622] text-xs text-stone-900 dark:text-white p-2.5 rounded-2xl border border-white/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 font-heading"
              />
            </div>

            {/* Title / Bio tag */}
            <div>
              <label className="text-xs font-bold text-stone-800 dark:text-zinc-200 block mb-1">
                Ocupação / Categoria:
              </label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {profileTitles.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAnimeTitle(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      animeTitle === t
                        ? 'bg-white/50 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-[#161622] text-stone-700 dark:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={animeTitle}
                onChange={e => setAnimeTitle(e.target.value)}
                placeholder="Ou digite sua profissão ou área..."
                className="w-full bg-stone-50 dark:bg-[#161622] text-xs text-stone-900 dark:text-white p-2 rounded-2xl border border-white/10 dark:border-white/10 focus:outline-none"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-bold text-stone-800 dark:text-zinc-200 block mb-1">
                Biografia:
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Fale um pouco sobre você e seus interesses..."
                className="w-full bg-stone-50 dark:bg-[#161622] text-xs text-stone-900 dark:text-white p-2.5 rounded-2xl border border-white/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none font-sans"
              />
            </div>

            {/* Website Link */}
            <div>
              <label className="text-xs font-bold text-stone-800 dark:text-zinc-200 block mb-1">
                Website / Link:
              </label>
              <div className="flex items-center gap-2 bg-stone-50 dark:bg-[#161622] px-3 py-2 rounded-2xl border border-white/10 dark:border-white/10">
                <Globe className="w-4 h-4 text-white" />
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://seusite.com"
                  className="flex-1 bg-transparent text-xs text-stone-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Private Account Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-[#161622] border border-white/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-white" />
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Conta Privada
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400">
                    Apenas seguidores aprovados verão suas fotos
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-white cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-2xl bg-white text-black text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
