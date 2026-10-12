import express from 'express';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { installSyncpayPayments, validateSyncpaySignature } from '../server/payments';
const data: any = { users: [{ id: 'viewer', displayName: 'Test Viewer', email: 'viewer@example.test', isPremium: false }], paymentCharges: [],
 syncpaySettings: { enabled: true, price: 9.99, clientId: 'test-client', clientSecret: 'test-secret', webhookToken: 'test-hook', webhookUrl: 'https://example.test/api/syncpay/webhook' } };
const db: any = { get: () => data, findUserById: (id: string) => data.users.find(u => u.id === id), save: () => {} };
let status = 'pending', amount = 9.99, tokenCalls = 0, cashinCalls = 0, queryCalls = 0;
const provider: typeof fetch = async (url: any, options: any) => {
 assert.ok(String(url).startsWith('https://api.syncpayments.com.br/api/partner/v1/'));
 if (String(url).endsWith('/auth-token')) { tokenCalls++; return Response.json({ access_token: 'provider-token', expires_in: 3600 }); }
 assert.equal(options.headers.Authorization,'Bearer provider-token');
 if (String(url).endsWith('/cash-in')) { cashinCalls++; const payload = JSON.parse(options.body); assert.equal(payload.amount,9.99); assert.equal(payload.client.cpf,'12345678909');assert.equal(payload.webhook_url,'https://example.test/api/syncpay/webhook'); return Response.json({ identifier:'id-1',pix_code:'000201-provider-test-pix' }); }
 queryCalls++; return Response.json({ data: { reference_id: 'id-1', currency:'BRL',amount, status, transaction_date:new Date().toISOString() } });
};
const app=express();app.use(express.json({verify:(req:any,_res,b)=>{req.rawBody=Buffer.from(b)}}));
const auth:any=(req,res,next)=>{req.userId=req.get('x-user') || 'viewer';next()};
installSyncpayPayments(app,db,auth,auth,provider);
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base='http://127.0.0.1:'+((server.address() as any).port);
async function call(path:string,body?:any,headers:any={}) { const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined}); return {status:r.status,data:await r.json()}; }
try {
 const charge=await call('/api/syncpay/create-charge',{name:'Test Viewer',cpf:'12345678909',phone:'11987654321'});assert.equal(charge.status,200);assert.ok(charge.data.qrCodeUrl.startsWith('data:image/png;'));
 await call('/api/syncpay/create-charge',{name:'Test Viewer',cpf:'12345678909',phone:'11987654321'});assert.equal(cashinCalls,1,'reuse existing pending charge');
 assert.equal((await call('/api/syncpay/confirm-charge',{txId:'id-1'})).data.paid,false);assert.equal(data.users[0].isPremium,false);
 assert.equal((await call('/api/syncpay/confirm-charge',{txId:'id-1'},{'x-user':'other'})).status,404,'ownership required');
 assert.equal((await call('/api/syncpay/confirm-charge',{})).status,404,'button without charge cannot grant');
 assert.equal((await call('/api/syncpay/webhook',{status:'PAID',userId:'viewer'})).status,401,'unsigned webhook rejected');
 status='completed';amount=1;data.paymentCharges[0].checkedAt=0;
 assert.equal((await call('/api/syncpay/confirm-charge',{txId:'id-1'})).status,502,'wrong amount cannot grant');assert.equal(data.users[0].isPremium,false);
 amount=9.99;data.paymentCharges[0].checkedAt=0;
 const event={event:'transaction.updated',transaction:{reference_id:'id-1'}};
 const t=Math.floor(Date.now()/1000),raw=Buffer.from(JSON.stringify(event));const sig='t='+t+',v1='+createHmac('sha256','test-hook').update(t+'.').update(raw).digest('hex');
 assert.equal(validateSyncpaySignature(sig,raw,'test-hook'),true);assert.equal(validateSyncpaySignature(sig,raw,'wrong'),false);assert.equal(validateSyncpaySignature(sig,raw,'test-hook',Date.now()+301000),false);
 assert.equal((await call('/api/syncpay/webhook',event,{'X-SyncPay-Signature':sig})).status,200);assert.equal(data.users[0].isPremium,true);
 const expiration=data.users[0].premiumExpiresAt; await call('/api/syncpay/webhook',event,{'X-SyncPay-Signature':sig});await call('/api/syncpay/confirm-charge',{txId:'id-1'});assert.equal(data.users[0].premiumExpiresAt,expiration,'replay cannot extend benefit');
 assert.equal(tokenCalls,1,'authentication cached');
 data.syncpaySettings.enabled=false;assert.equal((await call('/api/syncpay/create-charge',{})).status,503);
 console.log('SyncPay contract tests passed: Pix from provider, amount/ownership validation, pending cannot activate, authenticated webhook, replay protection, cache and disabled payments. No real charge made.');
}finally{await new Promise<void>(r=>server.close(()=>r()));}
