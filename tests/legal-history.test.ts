import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DirectorySafetyFooter, DirectorySafetyPage, LegalVersionHistory} from '../src/components/DirectorySafety';
import {legalDocuments, legalNavigation, type LegalDocumentVersion} from '../shared/legal-documents';
import {recordLegalVersion, installLegalHistory, serializeLegalVersion} from '../server/legal-history';
import type {DB} from '../server/db';

for (const page of ['terms','privacy','parents'] as const) {
  const html = renderToStaticMarkup(React.createElement(DirectorySafetyPage,{page}));
  for (const link of legalNavigation) assert.ok(html.includes('href="' + link.path + '"'), page + ' must link to ' + link.path);
  assert.ok(html.includes(legalDocuments[page].title));
  if (page === 'parents') assert.ok(html.includes('name="responsibleName"'), 'parents page must keep working form');
  else assert.ok(!html.includes('<form'), 'text pages must not show the request form');
  assert.ok(!html.includes('<iframe'));
  assert.ok(!/\[(SITE|E-MAIL|DATA|NOME)/.test(html), 'do not publish unresolved template placeholders');
}
const footer = renderToStaticMarkup(React.createElement(DirectorySafetyFooter));
for (const link of legalNavigation) assert.ok(footer.includes('href="' + link.path + '"'));
assert.ok(footer.includes('Mocinhas'));assert.ok(!/LGPD|Lei |menores|Termos de Uso/.test(footer));
assert.match(footer, /href="\/pais">Contato/);
assert.ok(renderToStaticMarkup(React.createElement(LegalVersionHistory)).includes('Histórico de versões'));

const state: any = {users:[],posts:[],directoryRequests:[{email:'must-remain-private@example.invalid',documentUrl:'https://example.invalid/private-document'}]};
let failSave = false, writes = 0;
const db = {get: () => state, save: () => {if (failSave) throw Error('save failed');writes++;}} as unknown as typeof DB;
const files = new Map<string,string>();
const archive = async (version: LegalDocumentVersion, content: string) => {assert.equal(state.legalDocumentVersions?.some((row:any) => row.id === version.id) || false,false, 'archive before database registration');files.set(version.id,content);};
const options = {now:new Date('2026-10-27T20:00:00Z'),contactEmail:'contact@example.invalid',commit:'a'.repeat(40)};
const first = await recordLegalVersion(db,archive,options);
assert.equal(state.legalDocumentVersions.length,1);
assert.ok(first.id.startsWith('2026-10-27T20-00-00-000Z_'));
assert.equal(first.commit,'a'.repeat(40));
assert.equal(files.get(first.id),serializeLegalVersion(first));
assert.equal((await recordLegalVersion(db,archive,{...options,now:new Date('2026-10-28T00:00:00Z')})).id,first.id,'restart must not duplicate identical documents');
assert.equal(files.size,1);assert.equal(writes,1);
const changed = structuredClone(legalDocuments);
changed.terms.sections[0].paragraphs.push('Texto de teste de uma nova versão.');
const second = await recordLegalVersion(db,archive,{...options,documents:changed,now:new Date('2026-10-28T12:00:00Z')});
assert.notEqual(first.id,second.id);assert.equal(state.legalDocumentVersions.length,2);
assert.ok(!serializeLegalVersion(first).includes('Texto de teste de uma nova versão.'),'previous snapshot must stay unchanged');
const third = await recordLegalVersion(db,archive,{...options,now:new Date('2026-10-29T12:00:00Z')});
assert.notEqual(third.id,first.id,'restoring an earlier document is a new dated version');
assert.equal(third.digest,first.digest);
await assert.rejects(() => recordLegalVersion(db,async () => {throw Error('archive failed');},{...options,contactEmail:'new@example.invalid'}));
assert.equal(state.legalDocumentVersions.length,3,'do not register a version when file archiving fails');
failSave = true;
await assert.rejects(() => recordLegalVersion(db,archive,{...options,contactEmail:'new@example.invalid'}));
assert.equal(state.legalDocumentVersions.length,3,'roll back when database saving fails');
failSave = false;

const app = express();installLegalHistory(app,db);
const server = app.listen(0,'127.0.0.1');await once(server,'listening');
const address = server.address();if (!address || typeof address === 'string') throw Error('No address');
const base = 'http://127.0.0.1:' + address.port;
try {
  const response = await fetch(base + '/api/legal-history');
  const list = await response.json();
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(list.total,3);assert.equal(list.current.id,third.id);assert.equal(list.versions[0].id,third.id);
  assert.ok(!JSON.stringify(list).includes('must-remain-private'));
  assert.ok(!Object.hasOwn(list.versions[0],'documents'),'list is a lightweight summary');
  const detail = await (await fetch(base + '/api/legal-history/' + first.id)).json();
  assert.deepEqual(detail.version,first);
  assert.ok(!JSON.stringify(detail).includes('private-document'));
  const download = await fetch(base + '/api/legal-history/' + first.id + '/file');
  assert.match(download.headers.get('content-disposition') || '',/attachment; filename="documentos_2026-10-27/);
  assert.match(download.headers.get('content-type') || '',/application\/json/);
  assert.equal(await download.text(),files.get(first.id));
  assert.equal((await fetch(base + '/api/legal-history/missing')).status,404);
  assert.equal((await fetch(base + '/api/legal-history/missing/file')).status,404);
  assert.equal((await (await fetch(base + '/api/legal-history?page=100')).json()).versions.length,0);
  console.log('Legal pages: reciprocal links, global removal notice, public form, dated immutable archives, restart deduplication, failure rollback, private-data isolation and JSON downloads passed.');
} finally {server.close();server.closeAllConnections();}

