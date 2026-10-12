import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-storage-'));
const module=path.resolve('server/db.ts'), recovery=path.resolve('scripts/recover-data.mjs');
const base={users:[{id:'owner',isAdmin:true,displayName:'Owner'}],posts:[{id:'post-existing',userId:'owner',media:[],caption:'Existing post'}]};
function run(dir,extra={},code=`await import(${JSON.stringify(module)})`) {
 return spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{env:{...process.env,STORAGE_BACKEND:'local',NODE_ENV:'production',DATA_DIR:dir,...extra},encoding:'utf8'});
}
try {
 const missing=path.join(root,'missing');assert.notEqual(run(missing).status,0);assert.equal(fs.existsSync(path.join(missing,'db.json')),false);
 assert.notEqual(run('').status,0,'production requires explicit data path');
 assert.notEqual(run(path.resolve('data')).status,0,'repository database not allowed in production');
 const bad=path.join(root,'bad');fs.mkdirSync(bad);fs.writeFileSync(path.join(bad,'db.json'),'{broken');
 assert.notEqual(run(bad).status,0);assert.equal(fs.readFileSync(path.join(bad,'db.json'),'utf8'),'{broken','corrupt original is never seeded over');
 const valid=path.join(root,'valid');fs.mkdirSync(valid);const original=JSON.stringify(base);fs.writeFileSync(path.join(valid,'db.json'),original);
 assert.equal(run(valid).status,0);assert.equal(fs.readFileSync(path.join(valid,'db.json'),'utf8'),original,'loading does not mutate or inject examples');
 const snapshots=fs.readdirSync(path.join(valid,'backups'));assert.equal(snapshots.length,1);assert.equal(fs.readFileSync(path.join(valid,'backups',snapshots[0]),'utf8'),original);
 const changed=run(valid,{},`const {DB}=await import(${JSON.stringify(module)});DB.get().posts.push({id:'new-post',userId:'owner',media:[],caption:'New'});DB.save();`);
 assert.equal(changed.status,0,changed.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(valid,'db.json'))).posts.length,2);
 assert.equal(run(valid).status,0);assert.equal(JSON.parse(fs.readFileSync(path.join(valid,'db.json'))).posts.length,2);
 const restored=path.join(root,'restored'), source=path.join(valid,'backups',snapshots[0]);
 const restore=()=>spawnSync(process.execPath,[recovery,'restore',source,restored],{encoding:'utf8'});
 assert.equal(restore().status,0);const restoredBytes=fs.readFileSync(path.join(restored,'db.json'),'utf8');assert.equal(restoredBytes,original);
 assert.notEqual(restore().status,0);assert.equal(fs.readFileSync(path.join(restored,'db.json'),'utf8'),original,'existing recovery target is protected');
 console.log('Storage passed: fail closed on missing/corrupt/repo database; original preserved; startup backup; persistence across restart; restore without overwrite.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
