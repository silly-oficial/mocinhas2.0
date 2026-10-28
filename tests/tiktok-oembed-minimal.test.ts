import assert from 'node:assert/strict';
import {makeTikTokResolver} from '../server/tiktok-oembed';
import type {DB} from '../server/db';
const state:any={};const db={get:()=>state,save:()=>{}} as unknown as typeof DB;
const url='https://www.tiktok.com/@mariaclaradeolivera0/video/6860111551957961989';
// Shape observed from the user's real share URL: no thumbnail or author fields.
const minimal={version:'1.0',type:'video',provider_name:'TikTok',provider_url:'https://www.tiktok.com',embed_product_id:'6860111551957961989',embed_type:'video'};
const resolver=(data:any)=>makeTikTokResolver(db,(async()=>new Response(JSON.stringify(data))) as typeof fetch);
const value=await resolver(minimal)(url);assert.equal(value.available,true);assert.equal(value.thumbnail_url,'');
state.tiktokOembedCache={};await assert.rejects(()=>resolver({...minimal,embed_product_id:'0000000000000000000'})(url));
state.tiktokOembedCache={};await assert.rejects(()=>resolver({...minimal,author_url:'https://www.tiktok.com/@someoneelse'})(url));
state.tiktokOembedCache={};await assert.rejects(()=>resolver({...minimal,thumbnail_url:'javascript:alert(1)'})(url));
state.tiktokOembedCache={};await assert.rejects(()=>resolver({})(url));
console.log('Observed minimal oEmbed shape accepted; mismatched IDs/authors and unsafe thumbnails rejected.');
