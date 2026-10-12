import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, Lock, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('mocinhas_device_id');
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('mocinhas_device_id', id);
  }
  return id;
}

export const DailyLimitOverlay: React.FC = () => {
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitMinutes, setLimitMinutes] = useState(0);
  const [timeUsedSeconds, setTimeUsedSeconds] = useState(0);
  const [timeToMidnight, setTimeToMidnight] = useState('');

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();

    const doPing = async () => {
      try {
        const res = await api.pingUsage(deviceId);
        setLimitMinutes(res.dailyLimitMinutes);
        setTimeUsedSeconds(res.timeUsedSeconds);
        setIsLimitReached(Boolean(res.isLimitReached));
      } catch (e) {
        console.warn('Ping usage check error:', e);
      }
    };

    // Initial ping
    doPing();

    // Ping every 12 seconds
    const interval = setInterval(doPing, 12000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer to midnight
  useEffect(() => {
    if (!isLimitReached) return;

    const updateMidnightCountdown = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeToMidnight(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateMidnightCountdown();
    const timer = setInterval(updateMidnightCountdown, 1000);
    return () => clearInterval(timer);
  }, [isLimitReached]);

  if (!isLimitReached) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 text-white select-none animate-fadeIn">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#12121B] border border-white/10 shadow-2xl text-center space-y-5 relative overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center shadow-lg">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-xl font-black text-white flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-red-400" />
            <span>Limite Diário Atingido</span>
          </h2>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
            Você atingiu o tempo máximo de uso diário configurado para este site ({limitMinutes} minutos). O acesso a conteúdos e vídeos está suspenso para este dispositivo até a renovação.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171724] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tempo consumido hoje:</span>
            <span className="font-extrabold text-white">
              {Math.floor(timeUsedSeconds / 60)} min {timeUsedSeconds % 60}s
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-white/5 pt-2">
            <span>Renovação automática em:</span>
            <span className="font-mono text-sm font-black text-amber-400">
              {timeToMidnight || '00:00:00'}
            </span>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-zinc-500 leading-tight">
          <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
          <span>A contagem de tempo é monitorada no servidor por IP e dispositivo.</span>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Verificar Novamente</span>
        </button>
      </div>
    </div>
  );
};
