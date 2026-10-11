import React, { useState } from 'react';
import { X, Flag, Check, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';

interface ReportModalProps {
  postId?: string;
  userId?: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  postId,
  userId,
  onClose,
}) => {
  const { darkMode } = useAuth();
  const [reason, setReason] = useState('Conteúdo inapropriado ou ofensivo');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const reasons = [
    'Conteúdo inapropriado ou ofensivo',
    'Spam ou publicidade não solicitada',
    'Desrespeito ou comportamento nocivo',
    'Violação de direitos autorais ou plágio',
    'Conta falsa ou personificação',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.reportContent({
        targetType: postId ? 'post' : 'user',
        targetId: postId || userId || 'unknown',
        reason,
        description: description.trim() || undefined,
      });
      sounds.playSparkle();
      setIsDone(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      alert('Erro ao enviar denúncia');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md rounded-3xl ${
          'niuniu-card text-white border-white/15'
        } border shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-white">
            <Flag className="w-5 h-5" />
            <h2 className="font-kawaii text-sm font-bold text-white dark:text-white">
              Denunciar Conteúdo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isDone ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white dark:text-white">
              Denúncia enviada com sucesso!
            </p>
            <p className="text-xs text-zinc-400">
              Obrigado por ajudar a manter a plataforma segura e confiável. ✦
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div>
              <label className="text-xs font-bold text-zinc-200 dark:text-zinc-200 block mb-1">
                Motivo da denúncia:
              </label>
              <div className="space-y-1.5">
                {reasons.map(r => (
                  <label
                    key={r}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/5 dark:bg-[#161622] text-xs text-white dark:text-white cursor-pointer hover:bg-white/10"
                  >
                    <input
                      type="radio"
                      name="reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-white"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-200 dark:text-zinc-200 block mb-1">
                Detalhes adicionais (opcional):
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explique brevemente o problema..."
                className="w-full bg-white/5 dark:bg-[#161622] text-xs text-white dark:text-white p-2.5 rounded-xl border border-white/10 dark:border-white/15 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-2xl bg-white text-black font-extrabold hover:bg-neutral-200 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando denúncia...' : 'Enviar Denúncia'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
