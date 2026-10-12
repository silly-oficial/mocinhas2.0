import React from 'react';
import { Languages, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useUi, translationStatus, retryTranslations } from '../i18n/ui';
const labels: Record<string, [string,string]> = {
pt:['Traduzindo a interface…','Alguns textos não foram traduzidos. Tentar novamente'],
en:['Translating the interface…','Some text could not be translated. Retry'],
es:['Traduciendo la interfaz…','No se pudieron traducir algunos textos. Reintentar'],
fr:['Traduction de l’interface…','Certains textes n’ont pas été traduits. Réessayer'],
de:['Oberfläche wird übersetzt…','Einige Texte wurden nicht übersetzt. Erneut versuchen'],
it:['Traduzione dell’interfaccia…','Alcuni testi non sono stati tradotti. Riprova'],
ja:['画面を翻訳中…','一部を翻訳できませんでした。再試行'],
ko:['화면 번역 중…','일부 텍스트를 번역하지 못했습니다. 다시 시도'],
zh:['正在翻译界面…','部分文字未能翻译。重试'],
ru:['Перевод интерфейса…','Часть текста не переведена. Повторить'],
ar:['جارٍ ترجمة الواجهة…','تعذرت ترجمة بعض النصوص. أعد المحاولة'],
};
export function TranslationStatus() {
 useUi(); const {language} = useLanguage(); const status = translationStatus();
 if (language === 'pt' || (!status.failed && !status.pending)) return null;
 const text = labels[language] || labels.en;
 return <div role="status" aria-live="polite" className="flex justify-center py-1 text-[11px] text-zinc-400">
 {status.failed && !status.pending ? <button onClick={retryTranslations} className="flex gap-2 items-center"><RotateCcw size={13}/>{text[1]}</button> : <span className="flex items-center gap-2"><Languages size={13}/>{text[0]}</span>}
 </div>;
}
