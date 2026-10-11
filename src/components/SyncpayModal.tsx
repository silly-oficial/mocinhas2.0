import React, { useState } from 'react';
import { Sparkles, Crown, CheckCircle2, Copy, Check, X, Shield, Server, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';

interface SyncpayModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const SyncpayModal: React.FC<SyncpayModalProps> = ({ onClose, onSuccess }) => {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<'offer' | 'pix' | 'success'>('offer');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<{
    txId: string;
    amount: number;
    pixCopyAndPaste: string;
    qrCodeUrl: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGeneratePix = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch('/api/syncpay/create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar Pix');

      setPixData(data);
      setStep('pix');
      sounds.playSparkle();
    } catch (e: any) {
      setStatusMessage(e.message || 'Erro de conexão ao gerar o Pix com a Syncpay.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData?.pixCopyAndPaste) return;
    navigator.clipboard.writeText(pixData.pixCopyAndPaste);
    setCopied(true);
    sounds.playPop();
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirmPayment = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem('mocinhas_token') || localStorage.getItem('yume_token');
      const res = await fetch('/api/syncpay/confirm-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar pagamento');

      sounds.playSparkle();
      await refreshUser();
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setStatusMessage(e.message || 'Erro ao confirmar assinatura.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-md bg-[#1A0A17] border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-white">
        
        {/* Close Button */}
        <button
          onClick={() => { sounds.playPop(); onClose(); }}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-zinc-200 flex items-center justify-center transition-colors cursor-pointer border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative Top Banner */}
        <div className="p-6 pod-orange text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mb-3 shadow-lg">
            <Crown className="w-9 h-9 text-yellow-300 drop-shadow-md animate-bounce" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            Mocinhas Premium 
          </h2>
          <p className="text-xs text-white/90 font-medium mt-1">
            Sua assinatura VIP para acesso irrestrito
          </p>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-5">
          
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs font-bold text-center animate-fadeIn">
              {statusMessage}
            </div>
          )}

          {/* STEP 1: OFFER & VALUE PROP */}
          {step === 'offer' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Mandatory Notice Box as requested */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2D0F28] to-[#200A1C] border border-white/15 text-white text-xs leading-relaxed space-y-2 shadow-inner">
                <div className="flex items-start gap-2 text-zinc-300 font-bold">
                  <Heart className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5 fill-amber-400/30" />
                  <span>Aviso Importante:</span>
                </div>
                <p className="text-white font-medium leading-relaxed">
                  "assine o premium para assistir vê todas as publicações e ajudar o app a continuar funcionando, precisamos desse valor para manter nosssos servidores"
                </p>
              </div>

              {/* Price Tag */}
              <div className="p-4 rounded-2xl bg-[#250E22] border border-white/15 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-300 uppercase font-extrabold tracking-wider block">Valor do Premium</span>
                  <span className="text-xs text-zinc-200">Acesso Ilimitado • Pagamento via Syncpay</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">R$ 9,99</span>
                  <span className="text-[10px] text-zinc-400 block">/mês ou licença</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Veja todas as publicações de qualquer perfil sem restrição</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Selo VIP Premium exclusivo de criador no seu perfil</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <span>Ajude a manter a infraestrutura e os servidores funcionando</span>
                </div>
              </div>

              <button
                onClick={handleGeneratePix}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl pod-orange text-white hover:opacity-95 text-white font-black text-sm shadow-xl shadow-white/5 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'Gerando Pix Syncpay...' : 'Assinar Premium — R$ 9,99'}</span>
              </button>

              <p className="text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Pagamento instantâneo e seguro via Syncpay Pix</span>
              </p>
            </div>
          )}

          {/* STEP 2: PIX QR CODE & COPY CODE */}
          {step === 'pix' && pixData && (
            <div className="space-y-4 animate-fadeIn text-center">
              <div className="p-4 rounded-2xl bg-[#250E22] border border-white/15 space-y-3">
                <span className="text-xs font-bold text-zinc-200 block">
                  Escaneie o QR Code ou Copie o Código Pix Syncpay
                </span>

                {/* QR Code Image */}
                <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-md border-2 border-white/20 flex items-center justify-center">
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code Pix Syncpay"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="text-xs text-emerald-300 font-extrabold">
                  Valor: R$ {pixData.amount.toFixed(2)} (Syncpay)
                </div>

                {/* Copia e Cola Button */}
                <button
                  onClick={handleCopyPix}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1A0A17] border border-white/20 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Código Pix Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-zinc-400" />
                      <span>Copiar Código Pix (Copia e Cola)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Confirm / Activate Button */}
              <button
                onClick={handleConfirmPayment}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Confirmando Pagamento...' : 'Já Paguei! Ativar Meu Premium Agora '}</span>
              </button>

              <p className="text-[10px] text-zinc-300/80">
                Após efetuar o Pix no app do seu banco, clique em "Já Paguei" para liberar seu acesso imediatamente!
              </p>
            </div>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === 'success' && (
            <div className="space-y-4 animate-fadeIn text-center py-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 flex items-center justify-center shadow-lg animate-bounce">
                <Crown className="w-10 h-10 text-yellow-300" />
              </div>

              <h3 className="text-lg font-black text-emerald-300">
                Parabéns! Você é Premium! 
              </h3>

              <p className="text-xs text-white leading-relaxed max-w-xs mx-auto">
                Sua assinatura foi ativada com sucesso. Agora você pode visualizar todas as publicações de qualquer perfil e apoiar os servidores do app! 
              </p>

              <button
                onClick={() => {
                  sounds.playSparkle();
                  onClose();
                }}
                className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-xs shadow-lg shadow-white/5 cursor-pointer hover:bg-zinc-200 transition-colors"
              >
                Explorar Todos os Perfis Agora 
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
