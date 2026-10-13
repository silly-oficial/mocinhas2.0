import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mocinhas-policy-'));
const secret='isolated-integration-test-secret';
const token=id=>jwt.sign({userId:id},secret);
const user=(id,isAdmin=false)=>({id,username:id,email:id+'@example.test',displayName:id,passwordHash:bcrypt.hashSync('test-password-123',4),isAdmin,isPrivate:false,createdAt:new Date().toISOString(),avatar:'',bio:'',banner:'',isVerified:false,animeTitle:'',themeColor:'',website:''});
const base={ users:[user('owner',true),user('viewer'),user('viewer2')], posts:[], likes:[],saves:[],comments:[],commentLikes:[],follows:[],stories:[],storyViews:[],conversations:[{id:'disabled',isGroup:true}],messages:[],notifications:[],reports:[],blocks:[],mutes:[],usageSettings:{dailyMinutes:1,bindNetwork:false}};
fs.writeFileSync(path.join(root,'db.json'),JSON.stringify(base));
let child;
async function start(){ child=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,STORAGE_BACKEND:'local',NODE_ENV:'production',DATA_DIR:root,JWT_SECRET:secret},stdio:'ignore'}); for(let i=0;i<100;i++){try { await fetch('http://localhost:3000'); return;}catch{await new Promise(r=>setTimeout(r,100));}} throw Error('server failed'); }
async function stop(){child.kill();await new Promise(r=>child.once('exit',r));}
async function call(url,id='viewer',method='GET',body,cookie=''){const res=await fetch('http://localhost:3000'+url,{method,headers:{authorization:'Bearer '+token(id),'content-type':'application/json',cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json(),cookies:res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
try {
 await start();
 assert.equal((await call('/api/posts')).status,429);
 const q=await call('/api/usage/consume','viewer','POST',{}); assert.equal(q.status,200);const cookie=q.cookies;
 const q2=await call('/api/usage/consume','viewer2','POST',{},cookie);assert.ok(q2.body.remainingMs<=q.body.remainingMs,'new account does not reset device');
 const diagnostics=await call('/api/admin/storage','owner');assert.equal(diagnostics.status,200);assert.equal(diagnostics.body.backend,'local-json');
 assert.equal((await call('/api/admin/storage','viewer')).status,403);
 assert.equal((await call('/api/admin/storage/export','viewer')).status,403);
 assert.equal((await call('/api/admin/storage/export','owner')).body.users.length,3);
 assert.equal((await call('/api/posts','viewer','POST',{media:[{url:'/test.jpg',type:'image'}]},cookie)).status,403);
 const posted=await call('/api/posts','owner','POST',{caption:'Teste #arte',media:[{url:'/test.jpg',type:'image',focus:{x:25,y:75}}],isTemporary:true});assert.equal(posted.status,200);assert.equal(posted.body.post.isTemporary,false);assert.equal(posted.body.post.user.username,'');
 assert.equal((await call('/api/posts','owner','POST',{media:[{url:'/test.mp4',type:'video',focus:{x:50,y:50}}]})).status,400);
 const id=posted.body.post.id;
 const mediaId=posted.body.post.media[0].id;
 assert.deepEqual(posted.body.post.media[0].focus,{x:25,y:75});
 assert.equal((await call('/api/admin/posts/'+id+'/focus','viewer','PATCH',{mediaId,focus:{x:80,y:20}},cookie)).status,403);
 assert.equal((await call('/api/admin/posts/'+id+'/focus','owner','PATCH',{mediaId,focus:{x:101,y:20}})).status,400);
 assert.equal((await call('/api/admin/posts/'+id+'/focus','owner','PATCH',{mediaId,focus:{x:'20',y:20}})).status,400);
 const focused=await call('/api/admin/posts/'+id+'/focus','owner','PATCH',{mediaId,focus:{x:80,y:20,zoom:2,editedBy:'admin'}});
 assert.equal(focused.status,200);assert.deepEqual(focused.body.post.media[0].focus,{x:80,y:20,zoom:2});assert.equal(focused.body.post.media[0].url,'/test.jpg');
 assert.equal(focused.body.post.userId,'');assert.ok(!JSON.stringify(focused.body.post).includes('editedBy'));
 assert.deepEqual((await call('/api/posts/'+id,'viewer','GET',undefined,cookie)).body.post.media[0].focus,{x:80,y:20,zoom:2});
 assert.equal((await call('/api/posts/'+id+'/like','viewer','POST',{},cookie)).body.isLiked,true);
 assert.equal((await call('/api/posts/'+id+'/save','viewer','POST',{},cookie)).body.isSaved,true);
 assert.equal((await call('/api/posts/saved/all','viewer','GET',undefined,cookie)).body.posts[0].id,id);
 const comment=await call('/api/posts/'+id+'/comments','viewer','POST',{text:'Comentário de teste'},cookie);assert.equal(comment.status,200);
 assert.equal((await call('/api/posts/'+id+'/comments','viewer','GET',undefined,cookie)).body.comments.length,1);
 assert.equal((await call('/api/comments/'+comment.body.comment.id+'/like','viewer','POST',{},cookie)).body.isLiked,true);
 assert.equal((await call('/api/comments/'+comment.body.comment.id,'viewer','DELETE',undefined,cookie)).status,200);
 assert.equal((await call('/api/syncpay/confirm-charge','viewer','POST',{})).status,404);
 assert.equal((await call('/api/syncpay/create-charge','viewer','POST',{})).status,503);

 assert.equal((await call('/api/posts','viewer','GET',undefined,cookie)).body.posts.length,1);
 for(const route of ['/api/groups/public','/api/stories','/api/conversations','/api/users/owner/follow','/api/posts/explore/feed','/api/ephemeral/cleanup','/api/admin/emergency-cleanup'])assert.equal((await call(route,'owner',route.includes('cleanup')||route.endsWith('follow')?'POST':'GET',undefined,cookie)).status,403,route);
 assert.equal((await call('/api/posts/'+id,'viewer','DELETE',undefined,cookie)).status,403);
 assert.equal((await call('/api/admin/usage-settings','viewer','PUT',{dailyMinutes:0,bindNetwork:false})).status,403);
 assert.equal((await call('/api/admin/usage-settings','owner','PUT',{dailyMinutes:-1,bindNetwork:false})).status,400);
 const movie=await call('/api/posts','owner','POST',{media:[{url:'/test.mp4',type:'video',thumbnail:'/uploads/frame_initial.jpg',coverTime:0.4}]});assert.equal(movie.status,200);
 const movieId=movie.body.post.id,movieMedia=movie.body.post.media[0].id;
 assert.equal((await call('/api/admin/posts/'+movieId+'/cover','viewer','PATCH',{mediaId:movieMedia,thumbnail:'/uploads/frame_selected.jpg',coverTime:1},cookie)).status,403);
 assert.equal((await call('/api/admin/posts/'+movieId+'/cover','owner','PATCH',{mediaId:movieMedia,thumbnail:'javascript:alert(1)',coverTime:1})).status,400);
 assert.equal((await call('/api/admin/posts/'+movieId+'/cover','owner','PATCH',{mediaId:movieMedia,thumbnail:'/uploads/frame_selected.jpg',coverTime:-1})).status,400);
 assert.equal((await call('/api/admin/posts/'+id+'/cover','owner','PATCH',{mediaId,thumbnail:'/uploads/frame_selected.jpg',coverTime:1})).status,400);
 assert.equal((await call('/api/admin/posts/'+id+'/focus','owner','PATCH',{mediaId,focus:{x:50,y:50,zoom:4}})).status,400);
 const cover=await call('/api/admin/posts/'+movieId+'/cover','owner','PATCH',{mediaId:movieMedia,thumbnail:'/uploads/frame_selected.jpg',coverTime:1.2});assert.equal(cover.status,200);assert.equal(cover.body.post.media[0].url,'/test.mp4');assert.equal(cover.body.post.media[0].thumbnail,'/uploads/frame_selected.jpg');assert.equal(cover.body.post.media[0].coverTime,1.2);assert.equal(cover.body.post.userId,'');
 const signup=await call('/api/auth/register','viewer','POST',{username:'admin',displayName:'test',email:'fresh@example.test',password:'test-password-123',acceptedTerms:true});assert.equal(signup.body.user.isAdmin,false,'admin name grants no privileges');
 await stop();
 const persisted=JSON.parse(fs.readFileSync(path.join(root,'db.json')));assert.deepEqual(persisted.posts.find(p=>p.id===id).media[0].focus,{x:80,y:20,zoom:2});for(const b of Object.values(persisted.usageBuckets)){b.usedMs=60000;b.leaseUntil=0;}
 fs.writeFileSync(path.join(root,'db.json'),JSON.stringify(persisted));await start();
 const exhausted=await call('/api/usage/consume','viewer2','POST',{},cookie);assert.equal(exhausted.body.blocked,true,'quota survives restart');
 assert.equal((await call('/api/posts','viewer2','GET',undefined,cookie)).status,429);
 assert.equal((await call('/api/usage/consume','owner','POST',{})).body.unlimited,true);
 assert.equal((await call('/api/posts/'+movieId,'owner')).body.post.media[0].coverTime,1.2,'cover survives restart');
 assert.deepEqual((await call('/api/posts/'+id,'owner')).body.post.media[0].focus,{x:80,y:20,zoom:2},'photo focus survives restart');
 assert.equal((await call('/api/posts/'+id,'owner','DELETE')).status,200);
 console.log('Integration passed: authorization, admin-only publication, hidden identity, disabled routes, permanent posts, quotas, multiple accounts and restart persistence.');
} finally {if(child && child.exitCode===null)await stop();fs.rmSync(root,{recursive:true,force:true});}
