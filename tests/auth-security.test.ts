import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {issueRecovery,consumeRecovery,authRateLimit} from '../server/auth-security';
const {code,state}=issueRecovery(1000);assert.match(code,/^\d{6}$/);assert.notEqual(state.recoveryToken,code);
assert.equal(consumeRecovery(state,code,2000),true);assert.equal(consumeRecovery(state,code,2001),false,'single use');
const expired=issueRecovery(0);assert.equal(consumeRecovery(expired.state,expired.code,900001),false);
const attempts=issueRecovery(1000);for(let i=0;i<5;i++)assert.equal(consumeRecovery(attempts.state,'wrong',2000),false);assert.equal(consumeRecovery(attempts.state,attempts.code,2000),false);
const app=express();app.use(express.json());app.post('/',authRateLimit(3,60000,req=>String(req.body.email)),(_req,res)=>res.json({ok:true}));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error();
try{for(let n=0;n<4;n++){const response=await fetch('http://127.0.0.1:'+address.port,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid'})});assert.equal(response.status,n<3?200:429);}}finally{server.close();server.closeAllConnections();}
console.log('Recovery hash, expiry, single-use, attempt limit and HTTP rate limit passed.');
