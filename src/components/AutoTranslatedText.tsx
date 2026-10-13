import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages, RotateCcw } from 'lucide-react';

interface AutoTranslatedTextProps {
  text: string;
  className?: string;
  contentClassName?: string;
  showBadge?: boolean;
  inline?: boolean;
  renderTransformed?: (text: string) => React.ReactNode;
}

export const AutoTranslatedText: React.FC<AutoTranslatedTextProps> = ({
  text,
  className = '',
  contentClassName = '',
  showBadge = true,
  inline = false,
  renderTransformed,
}) => {
  const { language, autoTranslateEnabled, translateDynamic, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string>(text);
  const [isTranslated, setIsTranslated] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!text) {
      setTranslatedText('');
      setIsTranslated(false);
      return;
    }

    // If autoTranslate is disabled, show original
    if (!autoTranslateEnabled) {
      setTranslatedText(text);
      setIsTranslated(false);
      setShowOriginal(false);
      return;
    }

    setShowOriginal(false);
    setTranslatedText(text);
    setIsTranslated(false);
    setIsLoading(true);
    translateDynamic(text, language)
      .then(result => {
        if (!isMounted) return;
        const cleanOriginal = text.trim();
        const cleanTranslated = (result || '').trim();
        if (cleanTranslated && cleanTranslated.toLowerCase() !== cleanOriginal.toLowerCase()) {
          setTranslatedText(cleanTranslated);
          setIsTranslated(true);
        } else {
          setTranslatedText(text);
          setIsTranslated(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTranslatedText(text);
        setIsTranslated(false);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [text, language, autoTranslateEnabled, translateDynamic]);

  const displayedContent = showOriginal || !isTranslated ? text : translatedText;

  const contentToRender = renderTransformed ? renderTransformed(displayedContent) : displayedContent;

  if (inline) {
    return (
      <span className={className}>
        {contentToRender}
        {isTranslated && showBadge && (
          <button
            type="button"
            data-translation-toggle="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowOriginal(!showOriginal);
            }}
            className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] text-zinc-400 hover:text-zinc-300 dark:text-zinc-400 cursor-pointer font-medium"
            title={showOriginal ? t('translated_auto') : t('show_original')}
          >
            <Languages className="w-2.5 h-2.5 inline" />
            <span>{showOriginal ? t('translated_auto') : t('show_original')}</span>
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="relative group/translate">
      <div className={`${className} ${contentClassName}`}>{contentToRender}</div>
      {isTranslated && showBadge && (
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            data-translation-toggle="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowOriginal(!showOriginal);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-300 dark:text-zinc-300 dark:hover:text-zinc-200 cursor-pointer bg-white/5 dark:bg-white/5 px-2 py-0.5 rounded-full transition-colors border border-white/10"
          >
            {showOriginal ? (
              <>
                <RotateCcw className="w-2.5 h-2.5" />
                <span>{t('translated_auto')}</span>
              </>
            ) : (
              <>
                <Languages className="w-2.5 h-2.5" />
                <span>{t('show_original')}</span>
              </>
            )}
          </button>
          {isLoading && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
};
