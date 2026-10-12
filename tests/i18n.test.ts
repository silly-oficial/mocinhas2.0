import assert from 'node:assert/strict';
import { ui, setUILanguage, translationStatus, retryTranslations } from '../src/i18n/ui';
import { POPULAR_LANGUAGES } from '../src/i18n/languages';
import { UI_TRANSLATIONS } from '../src/i18n/ui-catalog';
let requests: any[] = [], fail = false;
globalThis.fetch = (async (_url, options) => {
 const body = JSON.parse(options!.body as string); requests.push(body);
 return { ok: !fail, json: async () => ({ translations: body.texts.map((text: string) => `${body.targetLang}:${text}`) }) } as Response;
}) as typeof fetch;
for (const lang of POPULAR_LANGUAGES.filter(l => l.code !== 'pt')) {
 setUILanguage(lang.code);
 for (const text of ['Início', 'Vídeos', 'Conta', 'Publicações salvas', 'Nome de exibição', 'Salvar alterações']) {
  assert.equal(ui(text), UI_TRANSLATIONS[lang.code][text]);
 }
 assert.equal(ui('/api/syncpay/webhook.'), '/api/syncpay/webhook.');
 assert.equal(ui('Mocinhas Premium'), 'Mocinhas Premium');
}
setUILanguage('pt'); assert.equal(ui('Minha conta'), 'Minha conta');
setUILanguage('en'); assert.equal(ui('Minha conta'), 'My account'); assert.equal(ui('Nome de exibição'), 'Display name');
ui('Texto novo para tradução');
await new Promise(resolve => setTimeout(resolve, 160));
assert.equal(ui('Texto novo para tradução'), 'en:Texto novo para tradução');
assert.equal(requests[0].sourceLang, 'pt');
setUILanguage('es'); ui('Texto novo para tradução');
await new Promise(resolve => setTimeout(resolve, 160));
assert.equal(ui('Texto novo para tradução'), 'es:Texto novo para tradução');
fail = true; ui('Falha temporária de serviço');
await new Promise(resolve => setTimeout(resolve, 160));
assert.equal(translationStatus().failed, 1);
fail = false; retryTranslations();
await new Promise(resolve => setTimeout(resolve, 160));
assert.equal(ui('Falha temporária de serviço'), 'es:Falha temporária de serviço');
assert.equal(translationStatus().failed, 0);
assert.ok(requests.every(r => r.texts.length <= 15));
console.log('Localization passed: all 11 languages, core catalogs, unchanged brand/routes, batch isolation, caching and outage retry.');
