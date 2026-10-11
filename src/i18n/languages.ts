export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const POPULAR_LANGUAGES: LanguageInfo[] = [
  { code: 'pt', name: 'Português', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', nativeName: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', nativeName: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'zh', name: '中文', nativeName: '中文 (Simplified)', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', nativeName: 'العربية (Arabic)', flag: '🇸🇦', dir: 'rtl' },
];

export const DEFAULT_LANGUAGE = 'pt';
