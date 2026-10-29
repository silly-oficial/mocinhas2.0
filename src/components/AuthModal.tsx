import {api} from '../services/api';
import { ModalFrame } from './ModalFrame';
import { ui, useUi } from '../i18n/ui';
import React, { useState, useRef } from 'react';
import { X, Sparkles, Heart, Eye, EyeOff, User, Lock, Mail, Upload, Image as ImageIcon, ShieldCheck, FileText, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  initialMode = 'login',
}) => {
  useUi();
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recoverySent,setRecoverySent]=useState(false),[recoveryCode,setRecoveryCode]=useState(''),[newPassword,setNewPassword]=useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
          throw new Error(ui("Preencha todos os campos obrigatórios."));
        }
        await register(username.trim(), displayName.trim(), email.trim(), password, undefined, undefined, undefined, false);
        onClose();
      } else if (mode === 'recovery') {
        if (!email) throw new Error(ui("Digite seu e-mail"));
        if(!recoverySent){const result=await api.recoverPassword(email.trim());setSuccessMsg(result.message);setRecoverySent(true);}
        else {const result=await api.resetPassword({email:email.trim(),code:recoveryCode,newPassword});setSuccessMsg(result.message+' Entre com a nova senha.');setRecoverySent(false);setRecoveryCode('');setNewPassword('');setPassword('');setMode('login');}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalFrame onClose={onClose} label={ui("Autenticação")} className="legacy-modal      flex items-center justify-center p-4">
      <div
        className="auth-surface w-full max-w-md rounded-[32px] niuniu-card text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* Header */}
        <div className="p-4.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black border border-white/15 flex items-center justify-center text-white shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-extrabold text-white">
                {mode === 'login'
                  ? ui("Entrar na mocinhas")
                  : mode === 'register'
                  ? ui("Criar Nova Conta")
                  : ui("Recuperar Senha")}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={ui("Fechar autenticação")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
          {errorMsg && (
            <div role="alert" className="auth-error p-2.5 rounded-xl bg-white/5 text-zinc-200 text-xs font-bold border border-white/15">
              {ui(errorMsg)}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-200 text-xs font-bold border border-emerald-500/30">
              {ui(successMsg)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="text-[11px] font-bold text-zinc-200 block mb-1">
                    {ui("Nome Completo:")}</label>
                  <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                    <Heart className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder={ui("Ex: Clara Mendes")}
                      id="auth-name" value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-username" className="text-[11px] font-bold text-zinc-200 block mb-1">
                    {ui("Nome de Usuário (@):")}</label>
                  <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                    <User className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="clara_m"
                      id="auth-username" value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

              </>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'recovery') && (
              <div>
                <label htmlFor="auth-email" className="text-[11px] font-bold text-zinc-200 block mb-1">
                  {mode === 'login' ? ui("Usuário ou E-mail:") : 'E-mail:'}
                </label>
                <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <input
                    type={mode === 'login' ? 'text' : 'email'}
                    required
                    placeholder={mode === 'login' ? 'clara_m ou seu@email.com' : 'seu@email.com'}
                    id="auth-email" value={mode === 'login' ? (username || email) : email}
                    onChange={e => {
                      if (mode === 'login') {
                        setUsername(e.target.value);
                        setEmail(e.target.value);
                      } else {
                        if(mode==='recovery')setRecoverySent(false);
                        setEmail(e.target.value);
                      }
                    }}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode==='recovery'&&recoverySent&&<div className="auth-recovery-fields"><p>Digite o código recebido por e-mail. Ele vale por 15 minutos e permite até cinco tentativas.</p><label>Código de seis dígitos<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={recoveryCode} onChange={e=>setRecoveryCode(e.target.value.replace(/[^0-9]/g,''))}/></label><label>Nova senha<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><button type="button" disabled={isLoading} onClick={()=>{setRecoverySent(false);setRecoveryCode('');setErrorMsg('');setSuccessMsg('');}}>Solicitar outro código</button></div>}
            {mode !== 'recovery' && (
              <div>
                <label htmlFor="auth-password" className="text-[11px] font-bold text-zinc-200 block mb-1">
                  {ui("Senha:")}</label>
                <div className="flex items-center gap-2 bg-[#171724] px-3 py-2 rounded-xl border border-white/10">
                  <Lock className="w-4 h-4 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    id="auth-password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={ui(showPassword ? "Ocultar senha" : "Mostrar senha")} onClick={() => setShowPassword(!showPassword)}
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
                  {ui("Esqueceu a senha?")}</button>
              </div>
            )}


            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-emerald-500 text-black font-extrabold text-sm shadow-xl hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              <span>
                {isLoading
                  ? ui("Aguarde...")
                  : mode === 'login'
                  ? ui("Entrar")
                  : mode === 'register'
                  ? ui("Criar Conta")
                  : recoverySent?"Redefinir senha":"Enviar código por e-mail"}
              </span>
            </button>
          </form>

          {/* Switch Mode Footer */}
          <div className="pt-2 text-center text-xs text-zinc-400">
            {mode === 'login' ? (
              <p>
                {ui("Não tem uma conta?")}{' '}
                <button
                  onClick={() => setMode('register')}
                  className="font-bold text-white hover:underline cursor-pointer"
                >
                  {ui("Cadastre-se agora")}</button>
              </p>
            ) : (
              <p>
                {ui("Já tem uma conta?")}{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-bold text-white hover:underline cursor-pointer"
                >
                  {ui("Entrar aqui")}</button>
              </p>
            )}
          </div>
        </div>
      </div>


    </ModalFrame>
  );
};

