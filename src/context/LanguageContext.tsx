import { setUILanguage } from '../i18n/ui';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { POPULAR_LANGUAGES, DEFAULT_LANGUAGE, LanguageInfo } from '../i18n/languages';
import { TRANSLATIONS, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  currentLanguageInfo: LanguageInfo;
  languages: LanguageInfo[];
  t: (key: TranslationKey, fallback?: string) => string;
  autoTranslateEnabled: boolean;
  setAutoTranslateEnabled: (enabled: boolean) => void;
  translateDynamic: (text: string, targetLang?: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Local memory cache for dynamic translations
const clientTranslationCache = new Map<string, string>();

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mocinhas_language');
      if (saved && POPULAR_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
      // Detect browser language if matches one of our popular languages
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
      if (browserLang && POPULAR_LANGUAGES.some(l => l.code === browserLang)) {
        return browserLang;
      }
    } catch {
      // LocalStorage fallback
    }
    return DEFAULT_LANGUAGE;
  });

  const [autoTranslateEnabled, setAutoTranslateEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mocinhas_auto_translate');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const setLanguage = useCallback((lang: string) => {
    if (!POPULAR_LANGUAGES.some(l => l.code === lang)) return;
    setUILanguage(lang);
    setLanguageState(lang);
    try {
      localStorage.setItem('mocinhas_language', lang);
    } catch {}
  }, []);

  const setAutoTranslateEnabled = useCallback((val: boolean) => {
    setAutoTranslateEnabledState(val);
    try {
      localStorage.setItem('mocinhas_auto_translate', String(val));
    } catch {}
  }, []);

  const currentLanguageInfo = useMemo(() => {
    return POPULAR_LANGUAGES.find(l => l.code === language) || POPULAR_LANGUAGES[0];
  }, [language]);

  // Translation lookup with fallback to Portuguese and then default key
  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const langDict = TRANSLATIONS[language];
      if (langDict && langDict[key]) {
        return langDict[key];
      }
      // Fallback to Portuguese
      if (TRANSLATIONS.pt && TRANSLATIONS.pt[key]) {
        return TRANSLATIONS.pt[key];
      }
      return fallback || key;
    },
    [language]
  );

  // Dynamic content translation service
  const translateDynamic = useCallback(
    async (text: string, targetLang?: string): Promise<string> => {
      const target = targetLang || language;
      const clean = text?.trim();
      if (!clean) return '';

      const cacheKey = `${target}:${clean}`;
      if (clientTranslationCache.has(cacheKey)) {
        return clientTranslationCache.get(cacheKey)!;
      }

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, targetLang: target, sourceLang: 'auto' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.translatedText) {
            clientTranslationCache.set(cacheKey, data.translatedText);
            return data.translatedText;
          }
        }
      } catch (err) {
        console.warn('Translation error:', err);
      }

      return clean;
    },
    [language]
  );

  useEffect(() => { setUILanguage(language); document.documentElement.lang = language; }, [language]);

  // Set html dir attribute for RTL languages like Arabic
  useEffect(() => {
    if (currentLanguageInfo.dir === 'rtl') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
    }
  }, [currentLanguageInfo]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currentLanguageInfo,
        languages: POPULAR_LANGUAGES,
        t,
        autoTranslateEnabled,
        setAutoTranslateEnabled,
        translateDynamic,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
