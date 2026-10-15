import assert from 'node:assert/strict';
import express from 'express';
import {installBlueLab} from '../server/blue-lab';
import {blueAssets} from '../shared/blue-lab';
const data:any={peopleProfiles:[{id:'visible',published:true},{id:'draft',published:false}],blueLabLinks:{}};let fail=false;
const db:any={get:()=>data,save:()=>{if(fail)throw Error('write failed');}};
const app=express();app.use(express.json());installBlueLab(app,db,(req,res,next)=>req.headers.authorization==='admin'?next():res.status(403).json({error:'Forbidden'}));
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address() as any;
const call=async(path:string,body?:unknown,admin=true)=>{const r=await fetch(`http://127.0.0.1:${address.port}/api${path}`,{method:body?'PUT':'GET',headers:{'content-type':'application/json',authorization:admin?'admin':'viewer'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
try{
 const key=blueAssets[0].id;
 assert.equal((await call('/admin/blue-lab',{links:{[key]:['visible']}},false)).status,403);
 assert.equal((await call('/admin/blue-lab',{links:{[key]:['visible','draft','visible']}})).status,200);
 assert.deepEqual((await call('/blue-lab')).body.links[key],['visible']);
 assert.deepEqual((await call('/admin/blue-lab')).body.links[key],['visible','draft']);
 assert.equal((await call('/admin/blue-lab',{links:{bogus:['visible']}})).status,400);
 assert.equal((await call('/admin/blue-lab',{links:{[key]:['unknown']}})).status,400);
 fail=true;assert.equal((await call('/admin/blue-lab',{links:{}})).status,503);assert.deepEqual(data.blueLabLinks[key],['visible','draft']);
 console.log('PASS blue lab: admin permissions, group links, draft filtering, validation, rollback');
}finally{server.close();}
