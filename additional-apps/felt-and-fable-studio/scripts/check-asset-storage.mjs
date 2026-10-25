import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createAssetStorage} from '../lib/asset-storage.mjs';
const manifest=JSON.parse(await fs.readFile('lib/asset-manifest.json','utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
for(const [url,e] of Object.entries(manifest.files)){
 const bytes=await fs.readFile('asset-packs'+url);assert.equal(bytes.length,e.bytes);assert.equal(digest(bytes),e.sha256);
 assert(!await fs.stat('public'+url).catch(()=>null),'Large asset still bundled: '+url);
}
const rows=new Map(),writes=[],pending=[];
const BUCKET={async put(k,data,meta){writes.push(k);rows.set(k,{data:new Uint8Array(data).slice(),...meta})},async get(k){const r=rows.get(k);return r?{size:r.data.length,customMetadata:r.customMetadata,body:new Blob([r.data]).stream(),arrayBuffer:async()=>r.data.slice().buffer}:null},async head(k){return this.get(k)}};
const env={BUCKET,FELT_ASSET_ADMIN_TOKEN:'test-only-secret-never-used-in-production',ASSETS:{async fetch(request){const seed=new URL(request.url).pathname,entry=Object.entries(manifest.files).find(([,e])=>e.seed===seed);const bytes=entry?gzipSync(await fs.readFile('asset-packs'+entry[0])):null;return bytes?new Response(bytes):new Response(null,{status:404})}}};
const ctx={waitUntil(p){pending.push(p)}};
const handler=createAssetStorage(manifest),url='/assets/prepared/bg0.js',entry=manifest.files[url];
const req=(p,init)=>new Request('https://studio.example'+p,init);
assert.equal(await handler(req('/unrelated'),env,ctx),null);
assert.equal((await handler(req('/api/asset-storage',{method:'POST',body:'{}'}),env,ctx)).status,401);
assert.equal((await handler(req(url,{method:'POST'}),env,ctx)).status,405);
const admin=body=>handler(req('/api/asset-storage',{method:'POST',headers:{Authorization:'Bearer '+env.FELT_ASSET_ADMIN_TOKEN},body:JSON.stringify(body)}),env,ctx);
assert.equal((await admin({action:'seed',paths:['/../../private']})).status,400);
const mode=JSON.parse(await fs.readFile('asset-storage.json','utf8')).mode;
if(mode==='migration'){
 const first=await handler(req(url),env,ctx);assert.equal(first.status,200);assert.equal(digest(Buffer.from(await first.arrayBuffer())),entry.sha256);await Promise.all(pending);assert.equal(writes.length,1);
 assert.equal((await admin({action:'seed',paths:[url]})).status,200);
}else{
 const bytes=await fs.readFile('asset-packs'+url);await BUCKET.put(entry.key,bytes,{customMetadata:{sha256:entry.sha256}});
}
// With no fallback present, reads must actually come from persistent storage.
env.ASSETS.fetch=async()=>new Response(null,{status:404});
const stored=await handler(req(url),env,ctx);assert.equal(digest(Buffer.from(await stored.arrayBuffer())),entry.sha256);assert.equal(stored.headers.get('content-type'),'text/javascript; charset=utf-8');
assert.equal((await handler(req(url,{method:'HEAD'}),env,ctx)).headers.get('content-length'),String(entry.bytes));
assert.equal((await handler(req(url,{headers:{'If-None-Match':'"'+entry.sha256+'"'}}),env,ctx)).status,304);
assert.equal((await admin({action:'verify',paths:[url]})).status,200);
const original=rows.get(entry.key);rows.set(entry.key,{...original,customMetadata:{sha256:'bad'}});
const log=console.error;console.error=()=>{};
try{assert.equal((await handler(req(url),env,ctx)).status,503);rows.clear();assert.equal((await handler(req(url),env,ctx)).status,503)}finally{console.error=log}
console.log(JSON.stringify({files:Object.keys(manifest.files).length,checks:'all exact file hashes, public reads, authenticated migration, path allowlist, streamed stored reads, HEAD, ETag, missing/corrupt file recovery'}));
