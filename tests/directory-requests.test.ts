import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import {installDirectoryRequests, validateDirectoryRequest, retainDirectoryRequests} from '../server/directory-requests';
import type {DB} from '../server/db';
import type {DirectoryRequest} from '../shared/directory-requests';

const input = {responsibleName: 'Responsável de teste', email: 'responsavel@example.invalid', handle: '@perfil.teste', type: 'remover_conteudo', observations: 'Remover o perfil.', documentUrl: ''};
const clean = validateDirectoryRequest(input);
assert.equal(clean.handle, 'perfil.teste');
assert.throws(() => validateDirectoryRequest({...input, email: 'inválido'}));
assert.throws(() => validateDirectoryRequest({...input, type: '__proto__'}));
assert.throws(() => validateDirectoryRequest({...input, handle: 'https://example.invalid'}));
assert.throws(() => validateDirectoryRequest({...input, responsibleName: 'x'.repeat(121)}));
assert.throws(() => validateDirectoryRequest({...input, type: 'reivindicar_perfil', documentUrl: 'javascript:alert(1)'}));
assert.equal(validateDirectoryRequest({...input,observations:'',documentUrl:'https://example.invalid/termo'}).observations,'');
assert.throws(() => validateDirectoryRequest({...input, type: 'autorizar_oficialmente', documentUrl: 'https://user:pass@example.invalid/termo'}));
assert.equal(validateDirectoryRequest({...input, type: 'autorizar_oficialmente', documentUrl: 'https://example.invalid/termo'}).documentUrl, 'https://example.invalid/termo');
const day = 86400000, now = Date.now();
const row = (id: string, status: DirectoryRequest['status'], age: number): DirectoryRequest => ({...clean, id, status, createdAt: new Date(now - age * day).toISOString(), updatedAt: new Date(now - age * day).toISOString(), adminNote: ''});
assert.deepEqual(retainDirectoryRequests([row('expired', 'resolved', 90), row('open-expired', 'pending', 180), row('recent','resolved',89), row('open','reviewing',179)], now).map(r => r.id), ['recent','open']);

const state: any = {users: [], posts: [], directoryRequests: [], peopleProfiles: [
  {id: 'target', username: 'local.name', socials: {tiktok: 'perfil.teste'}, published: true},
  {id: 'other', username: 'outro', socials: {tiktok: 'outro'}, published: true},
]};
let failing = false, writes = 0;
const db = {get: () => state, save: () => {if (failing) throw Error('storage unavailable'); writes++;}} as unknown as typeof DB;
const app = express();
app.use(express.json({limit: '16kb'}));
const admin: express.RequestHandler = (req, res, next) => {if (req.get('authorization') === 'Bearer admin-test') next(); else res.status(403).json({error: 'Admin only'});};
installDirectoryRequests(app, db, admin);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('No address');
const base = `http://127.0.0.1:${address.port}`;
async function call(path: string, method = 'GET', body?: unknown, authorized = false, extraHeaders: Record<string,string> = {}) {
  const response = await fetch(base + path, {method, headers: {'Content-Type':'application/json', ...(authorized ? {Authorization:'Bearer admin-test'} : {}), ...extraHeaders}, body: body === undefined ? undefined : JSON.stringify(body)});
  return {status: response.status, headers: response.headers, body: await response.json().catch(() => null)};
}
const previousEmail = process.env.CONTACT_EMAIL;
try {
  process.env.CONTACT_EMAIL = 'contato@example.invalid';
  assert.deepEqual((await call('/api/directory-contact')).body, {email:'contato@example.invalid'});
  assert.equal((await call('/api/directory-requests','POST',input,false,{Origin:'https://other.invalid'})).status,403);
  assert.equal((await call('/api/directory-requests','POST',input,false,{'Sec-Fetch-Site':'cross-site'})).status,403);
  const created = await call('/api/directory-requests', 'POST', input);
  assert.equal(created.status,201);
  assert.deepEqual(Object.keys(created.body), ['id','dueAt','accessToken'], 'receipt only returns protocol, deadline and private access key');
  assert.equal(created.headers.get('cache-control'), 'no-store');
  const id = created.body.id;
  assert.equal(state.directoryEmailOutbox.length,2);assert.deepEqual(state.directoryEmailOutbox.map(row=>row.template),['request_received','admin_new_request']);assert.ok(state.directoryRequests[0].dueAt);
  assert.equal(state.directoryRequests[0].status,'pending');
  assert.equal((await call('/api/admin/directory-requests')).status,403);
  assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'resolved'})).status,403);
  const list = await call('/api/admin/directory-requests','GET',undefined,true);
  assert.equal(list.body.total,1);
  assert.equal(list.body.requests[0].email,input.email);
  assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'resolved',unpublishProfileId:'other'},true)).status,400);
  assert.equal(state.peopleProfiles[1].published,true);
  assert.equal((await call('/api/admin/directory-requests/'+id+'/unpublish','POST',{profileId:'target'},true)).status,200);
  assert.equal(state.peopleProfiles[0].published,false);assert.equal(state.directoryRequests[0].status,'pending');assert.equal(state.legalAudit.at(-1).field,'published');state.peopleProfiles[0].published=true;
  failing = true;
  assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'resolved',unpublishProfileId:'target'},true)).status,503);
  assert.equal(state.directoryRequests[0].status,'pending');
  assert.equal(state.peopleProfiles[0].published,true,'failure must roll back publication');
  failing = false;
  assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'resolved',adminNote:'Analisado e respondido.',unpublishProfileId:'target'},true)).status,200);
  assert.equal(state.peopleProfiles[0].published,false);
  assert.equal(state.peopleProfiles[1].published,true);
  assert.equal(state.directoryRequests[0].status,'resolved');
  assert.ok(state.directoryRequests[0].closedAt);
  assert.equal(state.directoryEmailOutbox.filter(row=>row.template==='request_completed').length,1);
  assert.equal((await call('/api/admin/directory-requests/'+id,'PATCH',{status:'rejected',publicResult:'Pedido reavaliado; o perfil já está fora de publicação.'},true)).status,200);
  assert.equal(state.directoryEmailOutbox.filter(row=>row.template==='request_completed').length,2);
  assert.equal((await call('/api/admin/directory-requests?status=pending','GET',undefined,true)).body.total,0);
  assert.equal((await call('/api/directory-requests/'+id)).status,404,'no public request lookup');
  failing = true;
  assert.equal((await call('/api/directory-requests','POST',input)).status,503);
  assert.equal(state.directoryRequests.length,1,'failed create must not leave a request');
  failing = false;
  for (let i=0; i<3; i++) assert.equal((await call('/api/directory-requests','POST',input)).status,201);
  const limited = await call('/api/directory-requests','POST',input);
  assert.equal(limited.status,429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.ok(writes > 0);
  console.log('Directory requests: validation, private admin access, anonymous submission, origin checks, rate limits, retention and transactional unpublishing passed.');
} finally {
  if (previousEmail === undefined) delete process.env.CONTACT_EMAIL; else process.env.CONTACT_EMAIL = previousEmail;
  server.close(); server.closeAllConnections();
}

// Public route retirement is covered by retired-pages and gallery-production tests.
