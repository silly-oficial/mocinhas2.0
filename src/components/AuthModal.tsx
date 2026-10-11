import React, { useState, useRef } from 'react';
import { X, Sparkles, Heart, Eye, EyeOff, User, Lock, Mail, Upload, Image as ImageIcon, ShieldCheck, FileText, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAvatarsByGender, DEFAULT_AVATAR_FEMALE, getMatchingCoverForAvatar } from '../utils/avatars';
import { useLanguage } from '../context/LanguageContext';
import { TermsModal } from './TermsModal';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  initialMode = 'login',
}) => {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'feminino' | 'masculino' | 'outro'>('feminino');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_FEMALE);
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentAvatars = getAvatarsByGender(gender);

  const handleGenderChange = (newGender: 'feminino' | 'masculino' | 'outro') => {
    setGender(newGender);
    if (!isCustomAvatar) {
      const list = getAvatarsByGender(newGender);
      setAvatarUrl(list[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('A imagem deve ter no máximo 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
        setIsCustomAvatar(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        await login(username || email, password);
        onClose();
      } else if (mode === 'register') {
        if (!username || !displayName || !email || !password) {
          throw new Error('Preencha todos os campos obrigatórios.');
        }
        if (!acceptedTerms) {
          throw new Error('Você precisa ler e aceitar os Termos de Uso e Responsabilidade para criar sua conta.');
        }
        const match = getMatchingCoverForAvatar(avatarUrl);
        await register(username.trim(), displayName.trim(), email.trim(), password, gender, avatarUrl, match.cover, acceptedTerms);
        onClose();
      } else if (mode === 'recovery') {
        if (!email) throw new Error('Digite seu e-mail');
        setSuccessMsg('Link de recuperação enviado para seu e-mail.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-[32px] niuniu-card text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* Header */}
        <div className="p-4.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black border border-white/15 flex items-center justify-center text-white shadow-xs">
              <span className="text-lg font-black leading-none text-white"></span>
            </div>
            <div>
              <h2 className="font-heading text-sm font-extrabold text-white">
                {mode === 'login'
                  ? 'Entrar na mocinhas'
                  : mode === 'register'
                  ? 'Criar Nova Conta'
                  : 'Recuperar Senha'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-white/5 text-zinc-200 text-xs font-bold border border-white/15">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-200 text-xs font-bold border border-emerald-500/30">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-zinc-200 block mb-1">
                    Nome Completo:
                  </label>
                  <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                    <Heart className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Clara Mendes"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-200 block mb-1">
                    Nome de Usuário (@):
                  </label>
                  <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                    <User className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="clara_m"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-200 block mb-1">
                    Sexo / Identidade:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleGenderChange('feminino')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        gender === 'feminino'
                          ? 'bg-white text-black shadow-xs'
                          : 'bg-[#171724] text-zinc-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                       Feminino
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenderChange('masculino')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        gender === 'masculino'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-xs'
                          : 'bg-[#171724] text-zinc-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                       Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenderChange('outro')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        gender === 'outro'
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-xs'
                          : 'bg-[#171724] text-zinc-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                       Outro
                    </button>
                  </div>
                </div>

                {/* Avatar Selection & Gallery Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-zinc-200">
                      Avatar ilustrado ({gender === 'feminino' ? 'Feminino' : gender === 'masculino' ? 'Masculino' : 'Unissex'}):
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer bg-[#1F1F2E] px-2 py-0.5 rounded-lg border border-white/15 hover:border-white/25 transition-all"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <span>{isCustomAvatar ? 'Foto Própria' : 'Foto da Galeria'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                    {isCustomAvatar && (
                      <div className="relative shrink-0">
                        <img
                          src={avatarUrl}
                          alt="Foto Galeria"
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white/80 p-0.5 bg-[#171724]"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-white text-black text-[8px] font-bold px-1 rounded-full">
                          Sua
                        </span>
                      </div>
                    )}

                    {currentAvatars.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(av);
                          setIsCustomAvatar(false);
                        }}
                        className={`relative shrink-0 rounded-full p-0.5 transition-all cursor-pointer ${
                          !isCustomAvatar && avatarUrl === av
                            ? 'ring-2 ring-white scale-105 shadow-sm'
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        <img
                          src={av}
                          alt={`Avatar ${idx + 1}`}
                          className="w-9 h-9 rounded-full object-cover bg-[#171724]"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Matching Cover Preview */}
                  {(() => {
                    const match = getMatchingCoverForAvatar(avatarUrl);
                    return (
                      <div className="mt-2.5 p-2.5 rounded-2xl bg-[#171724] border border-white/10 flex items-center gap-3">
                        <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 relative">
                          <img
                            src={match.cover}
                            alt={match.themeTitle}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-300 font-bold">
                            <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                            <span>{t('matching_cover')}</span>
                          </div>
                          <div className="text-xs font-bold text-white truncate mt-0.5">
                            {match.themeTitle}
                          </div>
                          <p className="text-[10px] text-zinc-400/80 leading-tight">
                            {t('matching_cover_applied')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'recovery') && (
              <div>
                <label className="text-[11px] font-bold text-zinc-200 block mb-1">
                  {mode === 'login' ? 'Usuário ou E-mail:' : 'E-mail:'}
                </label>
                <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <input
                    type={mode === 'login' ? 'text' : 'email'}
                    required
                    placeholder={mode === 'login' ? 'clara_m ou seu@email.com' : 'seu@email.com'}
                    value={mode === 'login' ? (username || email) : email}
                    onChange={e => {
                      if (mode === 'login') {
                        setUsername(e.target.value);
                        setEmail(e.target.value);
                      } else {
                        setEmail(e.target.value);
                      }
                    }}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode !== 'recovery' && (
              <div>
                <label className="text-[11px] font-bold text-zinc-200 block mb-1">
                  Senha:
                </label>
                <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                  <Lock className="w-4 h-4 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('recovery')}
                  className="text-[11px] font-semibold text-zinc-400 hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div className="p-3.5 rounded-2xl bg-[#171724] border border-white/10 space-y-2.5">
                <div className="flex items-start gap-2.5 select-none">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={acceptedTerms}
                    id="checkbox-terms"
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    className={`w-5 h-5 rounded-lg mt-0.5 flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                      acceptedTerms
                        ? 'bg-white text-black border-white shadow-xs'
                        : 'bg-[#0E0E15] border-white/30 hover:border-white/60'
                    }`}
                  >
                    {acceptedTerms && <Check className="w-3.5 h-3.5 stroke-[3] text-black" />}
                  </button>
                  <div className="text-[11px] text-zinc-200 leading-tight pt-0.5">
                    <span
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                      className="cursor-pointer hover:text-white"
                    >
                      Li e concordo com os{' '}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="font-bold text-zinc-300 hover:text-white underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer ml-0.5"
                    >
                      <span>Termos de Uso e Responsabilidade</span>
                      <ShieldCheck className="w-3.5 h-3.5 inline text-zinc-400" />
                    </button>
                    <span className="text-zinc-400 font-bold ml-1">*obrigatório</span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-relaxed border-t border-white/5 pt-2">
                   <strong>Aviso legal:</strong> Conteúdos efêmeros expiram em 1 hora sem análise manual prévia. O autor responde integralmente pelo material veiculado e colaboramos estritamente com as autoridades policiais e judiciais.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (mode === 'register' && !acceptedTerms)}
              className="w-full py-4 rounded-full bg-white text-black font-extrabold text-sm shadow-xl hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              <span>
                {isLoading
                  ? 'Aguarde...'
                  : mode === 'login'
                  ? 'Entrar'
                  : mode === 'register'
                  ? 'Criar Conta'
                  : 'Enviar Instruções'}
              </span>
            </button>
          </form>

          {/* Switch Mode Footer */}
          <div className="pt-2 text-center text-xs text-zinc-400">
            {mode === 'login' ? (
              <p>
                Não tem uma conta?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="font-bold text-white hover:underline cursor-pointer"
                >
                  Cadastre-se agora
                </button>
              </p>
            ) : (
              <p>
                Já tem uma conta?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-bold text-white hover:underline cursor-pointer"
                >
                  Entrar aqui
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {showTermsModal && (
        <TermsModal
          onClose={() => setShowTermsModal(false)}
          onAccept={() => setAcceptedTerms(true)}
          showAcceptButton={true}
        />
      )}
    </div>
  );
};
