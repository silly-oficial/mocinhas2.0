import { useSyncExternalStore } from 'react';
import { TRANSLATIONS } from './translations';
import { UI_TRANSLATIONS } from './ui-catalog';
let locale = 'pt', revision = 0;
const listeners = new Set<() => void>();
const cache = new Map<string, string>();
const pending = new Map<string, Set<string>>();
const attempted = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let loading = false, loadingLanguage = '';
const failed = new Map<string, Set<string>>();
export function translationStatus() { return { pending: (pending.get(locale)?.size || 0) + (loading && loadingLanguage === locale ? 1 : 0), failed: failed.get(locale)?.size || 0 }; }
export function retryTranslations() { const texts = failed.get(locale); if (!texts?.size) return; if (!pending.has(locale)) pending.set(locale, new Set()); texts.forEach(t => pending.get(locale)!.add(t)); texts.clear(); notify(); if (!timer) timer = setTimeout(flush, 30); }
function markFailed(language: string, text: string) { if (!failed.has(language)) failed.set(language, new Set()); failed.get(language)!.add(text); }
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const notify = () => { revision++; listeners.forEach(fn => fn()); };
export function setUILanguage(language: string) { if (locale !== language) { locale = language; notify(); } }
export function useUi() { useSyncExternalStore(subscribe, () => revision); return ui; }
const reverse = new Map(Object.entries(TRANSLATIONS.pt).map(([key, value]) => [value.trim().toLowerCase(), key]));
async function flush() {
  timer = undefined;
  if (loading) return;
  const entry = [...pending].find(([, values]) => values.size);
  if (!entry) return;
  const [language, values] = entry, texts = [...values].slice(0, 15);
  texts.forEach(text => values.delete(text));
  loading = true; loadingLanguage = language; notify();
  try {
    const response = await fetch('/api/translate/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts, targetLang: language, sourceLang: 'pt' }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('translation');
    const data = await response.json();
    if (!Array.isArray(data.translations) || data.translations.length !== texts.length) throw new Error('translation');
    texts.forEach((text, index) => { const translated = data.translations[index]; if (typeof translated === 'string' && translated.trim()) { cache.set(`${language}:${text}`, translated); failed.get(language)?.delete(text); } else markFailed(language, text); });
    try { localStorage.setItem('mocinhas_ui_translations_v2', JSON.stringify([...cache].slice(-2500))); } catch {}
  } catch { texts.forEach(text => markFailed(language, text)); }
  finally { loading = false; notify(); timer = setTimeout(flush, 80); }
}
try { const saved = JSON.parse(localStorage.getItem('mocinhas_ui_translations_v2') || '[]'); for (const [key, value] of saved) if (typeof key === 'string' && typeof value === 'string') cache.set(key, value); } catch {}
export function ui(text: string): string {
  if (!text || /^(https?:|\/api\/)/.test(text) || locale === 'pt' || ['mocinhas','Mocinhas Premium','Premium','Pix','SyncPay','CPF','PDF','min','Admin'].includes(text)) return text;
  const clean = text.trim(), key = `${locale}:${clean}`;
  const builtIn = UI_TRANSLATIONS[locale]?.[clean];
  if (builtIn) return builtIn;
  const oldKey = reverse.get(clean.toLowerCase());
  if (oldKey && TRANSLATIONS[locale]?.[oldKey]) return TRANSLATIONS[locale][oldKey];
  if (cache.has(key)) return cache.get(key)!;
  if (!attempted.has(key) && clean.length < 4000) {
    attempted.add(key);
    if (!pending.has(locale)) pending.set(locale, new Set());
    pending.get(locale)!.add(clean);
    if (!timer) timer = setTimeout(flush, 30);
  }
  return text;
}
