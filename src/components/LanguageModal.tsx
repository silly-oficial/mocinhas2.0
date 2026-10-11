import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Check, Sparkles, X, Languages } from 'lucide-react';

interface LanguageModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen = true, onClose }) => {
  const {
    language,
    setLanguage,
    languages,
    autoTranslateEnabled,
    setAutoTranslateEnabled,
    t,
  } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#12121B] rounded-3xl w-full max-w-md shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center text-white shadow-md shadow-white/5">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-1.5">
                {t('change_language')}
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              </h3>
              <p className="text-xs text-zinc-300/70">
                {t('tagline')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-translate feature toggle */}
        <div className="p-4 bg-[#171724] border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <label
                  htmlFor="auto-translate-toggle"
                  className="font-heading text-xs font-bold text-white cursor-pointer block"
                >
                  {t('auto_translate')}
                </label>
                <p className="text-[11px] text-zinc-300/70 leading-tight mt-0.5">
                  {t('auto_translate_desc')}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                id="auto-translate-toggle"
                type="checkbox"
                checked={autoTranslateEnabled}
                onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-stone-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white/50" />
            </label>
          </div>
        </div>

        {/* Language List */}
        <div className="p-3 overflow-y-auto divide-y divide-white/10 space-y-1">
          {languages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/50/25 text-white font-bold border border-white/20 shadow-xs'
                    : 'hover:bg-white/5 text-zinc-200/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl" role="img" aria-label={lang.name}>
                    {lang.flag}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{lang.name}</div>
                    <div className="text-xs text-zinc-300/60 font-normal">
                      {lang.nativeName}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-white/50 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0E0E15] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:opacity-95 active:scale-95 text-white shadow-md shadow-white/5 transition-all cursor-pointer"
          >
            {t('btn_understand')}
          </button>
        </div>
      </div>
    </div>
  );
};
