import assert from 'node:assert/strict';
import {resolveTikTokLink} from '../server/tiktok-link';
const full='https://www.tiktok.com/@creator/photo/7421111111111111111';
let calls=0;
const mock=(async(input:any,options:any)=>{calls++;assert.equal(options.redirect,'manual');assert.ok(String(input).startsWith('https://vt.tiktok.com/')||String(input).startsWith('https://vm.tiktok.com/'));return new Response(null,{status:302,headers:{location:full+'?slide=2'}});}) as typeof fetch;
assert.equal(await resolveTikTokLink('https://vt.tiktok.com/ZSgbqA5DS/',mock),full);
assert.equal(await resolveTikTokLink('https://vm.tiktok.com/ZSgbqymfn/',mock),full);
assert.equal(calls,2);assert.equal(await resolveTikTokLink(full,mock),full);assert.equal(calls,2,'canonical URL must not request media');
for(const target of ['http://127.0.0.1/','https://evil.test/path','https://www.tiktok.com@evil.test/x','https://www.tiktok.com/not-a-post']){
 let requests=0;
 await assert.rejects(()=>resolveTikTokLink('https://vt.tiktok.com/abc/',(async()=>{requests++;return new Response(null,{status:302,headers:{location:target}});}) as typeof fetch));assert.equal(requests,1,'never request unsafe redirect destination');
}
await assert.rejects(()=>resolveTikTokLink('https://vt.tiktok.com/abc/',(async()=>new Response(null,{status:200})) as typeof fetch));
let hops=0;await assert.rejects(()=>resolveTikTokLink('https://vt.tiktok.com/abc/',(async()=>{hops++;return new Response(null,{status:302,headers:{location:'https://vt.tiktok.com/loop/'}});}) as typeof fetch));assert.equal(hops,6);
console.log('TikTok short links passed: vt/vm redirects, canonical URLs without fetch, strict destination allowlist, unavailable links and redirect limit. Network mocked.');
