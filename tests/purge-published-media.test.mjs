import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {scrubPublishedMedia,purgeLocal} from '../scripts/purge-published-media.mjs';
const data = {users:[{id:'admin',avatar:'old.jpg',banner:'old.jpg',isPremium:true,passwordHash:'preserve'}],posts:[{id:'photo',media:[{type:'image',url:'/uploads/a.jpg'}]},{id:'audio',media:[{type:'audio',url:'/uploads/a.mp3'}]}],peopleProfiles:[{id:'p',age:12,city:'cidade',tags:['Dança','Praia/biquíni'],photos:['old.jpg'],videos:[{url:'old.mp4'}]}],paymentCharges:[{id:'payment'}],syncpaySettings:{enabled:true,clientSecret:'preserve'},comments:[{id:'c',postId:'photo'}],commentLikes:[{commentId:'c'}],welcomeCarousel:{slides:[{url:'/uploads/a.jpg'}]}};
const cleaned = scrubPublishedMedia(data);
assert.equal(cleaned.posts.length,1);assert.equal(cleaned.posts[0].id,'audio');
assert.deepEqual(cleaned.peopleProfiles[0].photos,[]);assert.deepEqual(cleaned.peopleProfiles[0].videos,[]);
assert.equal(cleaned.peopleProfiles[0].age,undefined);assert.equal(cleaned.peopleProfiles[0].city,undefined);
assert.deepEqual(cleaned.peopleProfiles[0].tags,['Dança']);
assert.deepEqual(cleaned.paymentCharges,data.paymentCharges);assert.deepEqual(cleaned.syncpaySettings,data.syncpaySettings);
assert.equal(cleaned.users[0].isPremium,true);assert.equal(cleaned.users[0].passwordHash,'preserve');
assert.deepEqual(cleaned.commentLikes,[]);assert.equal(data.posts.length,2);
const directory = await fs.mkdtemp(path.join(os.tmpdir(),'mocinhas-purge-'));
try {
  await fs.mkdir(path.join(directory,'backups'));await fs.mkdir(path.join(directory,'uploads'));
  for (const filename of ['db.json','backups/old.json']) await fs.writeFile(path.join(directory,filename),JSON.stringify(data));
  for (const filename of ['a.jpg','b.mp4','audio.mp3']) await fs.writeFile(path.join(directory,'uploads',filename),'fixture');
  assert.equal((await purgeLocal(directory)).applied,false);
  assert.equal((await fs.readdir(path.join(directory,'uploads'))).length,3);
  const result = await purgeLocal(directory,true);assert.equal(result.mediaFiles,2);assert.equal(result.snapshots,2);
  assert.deepEqual(await fs.readdir(path.join(directory,'uploads')),['audio.mp3']);
  for (const filename of ['db.json','backups/old.json']) assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,filename),'utf8')),cleaned);
  assert.equal((await purgeLocal(directory,true)).mediaFiles,0);
  console.log('Purge: preview, disk deletion, backup sanitization, idempotency, sensitive filter removal and Premium/account preservation passed.');
} finally {await fs.rm(directory,{recursive:true,force:true});}
