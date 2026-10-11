import React, { useState, useEffect } from 'react';
import {
  X,
  Moon,
  Volume2,
  VolumeX,
  Key,
  LogOut,
  Trash2,
  Shield,
  RefreshCw,
  Timer,
  ShieldCheck,
  FileText,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { sounds } from '../utils/sound';
import { TermsModal } from './TermsModal';

interface SettingsModalProps {
  onClose: () => void;
  onOpenEditProfile: () => void;
  onOpenLanguage?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onOpenLanguage,
}) => {
  const { logout, soundEnabled, toggleSound } = useAuth();
  const { t, currentLanguageInfo, autoTranslateEnabled } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // 1-Hour Ephemeral Mode
  const [ephemeralActive, setEphemeralActive] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState('');

  const loadEphemeralSettings = async () => {
    try {
      const res = await fetch('/api/ephemeral/settings');
      if (res.ok) {
        const data = await res.json();
        setEphemeralActive(data.ephemeral1HourActive ?? true);
      }
    } catch (e) {}
  };

  const handleToggleEphemeral = async () => {
    const nextVal = !ephemeralActive;
    setEphemeralActive(nextVal);
    sounds.playSparkle();
    try {
      await fetch('/api/ephemeral/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextVal }),
      });
    } catch (e) {}
  };

  const handleManualClean = async () => {
    setIsCleaning(true);
    setCleanMsg('');
    try {
      const res = await fetch('/api/ephemeral/cleanup', { method: 'POST' });
      const data = await res.json();
      sounds.playSparkle();
      setCleanMsg(data.message || 'Limpeza realizada!');
      setTimeout(() => setCleanMsg(''), 4000);
    } catch (e) {
      setCleanMsg('Erro na limpeza');
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    loadEphemeralSettings();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsChangingPass(true);
    setPassMsg(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      sounds.playSparkle();
      setPassMsg({ text: 'Senha alterada com sucesso!', success: true });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassMsg({ text: err.message || 'Erro ao alterar senha', success: false });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'Tem certeza que deseja excluir sua conta? Esta ação é permanente e todos os seus dados serão apagados.'
      )
    ) {
      return;
    }
    try {
      await api.deleteAccount();
      alert('Conta excluída com sucesso.');
      logout();
      onClose();
    } catch (e) {
      alert('Erro ao excluir conta');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="w-full max-w-md max-h-[85vh] h-[85vh] sm:h-auto rounded-t-3xl sm:rounded-[28px] bg-[#12121B] text-white border border-white/20/25 shadow-2xl flex flex-col overflow-hidden animate-scale-up"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-zinc-400" />
            <h2 className="font-heading text-base font-bold text-white">
              Configurações
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Preferences */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Aparência & Preferências
            </h3>

            {/* Dark mode notice */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171724] border border-white/10">
              <div className="flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-zinc-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Tema Escuro Exclusivo
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Otimizado com paleta noturna elegante
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/50/20 text-zinc-300 text-[10px] font-bold">
                Ativo
              </span>
            </div>

            {/* Sound effects switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171724] border border-white/10">
              <div className="flex items-center gap-2.5">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-zinc-400" /> : <VolumeX className="w-4 h-4 text-zinc-400/50" />}
                <div>
                  <span className="text-xs font-bold text-white block">
                    Efeitos Sonoros
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Sons sutis de interação e curtida
                  </span>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-zinc-200 hover:bg-white/20 cursor-pointer transition-colors"
              >
                {soundEnabled ? 'Ativado' : 'Desativado'}
              </button>
            </div>

            {/* Language Selection */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171724] border border-white/10">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-zinc-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {t('language')}: {currentLanguageInfo.name} {currentLanguageInfo.flag}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {autoTranslateEnabled ? t('auto_translate_active') : t('auto_translate_inactive')}
                  </span>
                </div>
              </div>
              {onOpenLanguage && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    onOpenLanguage();
                  }}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-zinc-200 hover:bg-white/20 cursor-pointer transition-colors"
                >
                  {t('change_language')}
                </button>
              )}
            </div>

            {/* 1-Hour Ephemeral Expiration Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#171724] to-[#12121A] border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-white/50/20 flex items-center justify-center text-zinc-400">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Modo Efêmero (Duração de 1h)</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-white/50 text-white text-[9px] font-bold">1h</span>
                    </span>
                    <span className="text-[10px] text-zinc-300/80 block">
                      Publicações, vídeos, DMs, grupos e stories duram até 1 hora
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEphemeral}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    ephemeralActive
                      ? 'bg-white text-black text-white shadow-xs'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {ephemeralActive ? 'Ativo' : 'Desativado'}
                </button>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] border-t border-white/5">
                <span className="text-zinc-400/90 text-[10px]">
                  {cleanMsg || 'Auto-limpeza ativa a cada 60s'}
                </span>
                <button
                  type="button"
                  onClick={handleManualClean}
                  disabled={isCleaning}
                  className="px-2.5 py-1 rounded-xl bg-white/50/20 hover:bg-white/50/30 text-zinc-200 text-[10px] font-bold border border-white/15 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isCleaning ? 'animate-spin' : ''}`} />
                  <span>{isCleaning ? 'Limpando...' : 'Limpar Agora'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Account & Security */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Segurança da Conta
            </h3>

            {/* Change password form */}
            <form onSubmit={handleChangePassword} className="p-3 rounded-2xl bg-[#171724] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-white">
                  Alterar Senha
                </span>
              </div>
              <input
                type="password"
                placeholder="Senha atual"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-[#12121B] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-white/15 focus:outline-none focus:border-white/25"
              />
              <input
                type="password"
                placeholder="Nova senha (mín. 6 dígitos)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-[#12121B] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-white/15 focus:outline-none focus:border-white/25"
              />
              {passMsg && (
                <div
                  className={`text-[11px] font-bold p-2 rounded-xl ${
                    passMsg.success ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-zinc-300 border border-white/15'
                  }`}
                >
                  {passMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={isChangingPass || !currentPassword || !newPassword}
                className="w-full py-2.5 rounded-xl bg-white text-black text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isChangingPass ? 'Salvando...' : 'Atualizar Senha'}
              </button>
            </form>
          </div>

          {/* Legal & Terms of Use */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="w-full p-3 rounded-2xl bg-[#171724] hover:bg-[#20202E] border border-white/10 text-left flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-white/50/20 text-zinc-300 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block group-hover:text-zinc-300 transition-colors">
                    Termos de Uso e Responsabilidade
                  </span>
                  <span className="text-[10px] text-zinc-400/80 block">
                    Moderação efêmera, responsabilidade legal e cooperação judicial
                  </span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 font-bold px-2.5 py-1 rounded-xl bg-white/50/15 border border-white/15">
                Ler
              </span>
            </button>
          </div>

          {/* App Info */}
          <div className="p-3 rounded-2xl bg-[#171724] border border-white/10 text-center space-y-0.5">
            <span className="font-heading text-xs font-bold text-zinc-200 block">
              mocinhas • Versão 2.0.0
            </span>
            <p className="text-[11px] text-zinc-400/80">
              Rede Social moderna, elegante e acolhedora para iOS & Android.
            </p>
          </div>

          {/* Logout & Delete Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-[#171724] text-zinc-200 hover:bg-[#20202E] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>

            <button
              onClick={handleDeleteAccount}
              className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/5 border border-white/15 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Conta Permanentemente</span>
            </button>
          </div>
        </div>
      </div>

      {showTermsModal && (
        <TermsModal
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </div>
  );
};
