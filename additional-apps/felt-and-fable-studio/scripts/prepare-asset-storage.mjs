import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const root=process.cwd(), prefixes=['assets/prepared','assets/danse-macabre','assets/story-props','assets/neural-v1','js/vendor/neural','js/vendor/pico'];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function files(dir){let out=[];for(const e of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await files(p));else out.push(p)}return out.sort()}
for(const prefix of prefixes){
 const src=path.join(root,'public',prefix),dst=path.join(root,'asset-packs',prefix);
 for(const f of await files(src)){const dest=path.join(dst,path.relative(src,f));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.rename(f,dest)}
 await fs.rm(src,{recursive:true,force:true});
}
const manifest={version:1,files:{}};
for(const f of await files(path.join(root,'asset-packs'))){
 const rel=path.relative(path.join(root,'asset-packs'),f).replaceAll('\\','/'),bytes=await fs.readFile(f),sha256=hash(bytes),ext=path.extname(f);
 const type=({'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'})[ext]||'application/octet-stream';
 manifest.files['/'+rel]={sha256,bytes:bytes.length,type,key:'felt-assets/v1/'+sha256,seed:'/__asset-seed/'+sha256+'.gz'};
}
const manifestText=JSON.stringify(manifest),digest=hash(manifestText);
await fs.mkdir('lib',{recursive:true});await fs.writeFile('lib/asset-manifest.json',manifestText+'\n');
const policy=JSON.parse(await fs.readFile('asset-storage.json','utf8'));
await fs.rm('public/__asset-seed',{recursive:true,force:true});
if(policy.mode==='external'){
 const proof=JSON.parse(await fs.readFile('asset-storage-verified.json','utf8'));
 if(proof.manifestSha256!==digest||Object.entries(manifest.files).some(([url,e])=>proof.files[url]!==e.sha256))throw Error('Verify every asset in hosted storage before making an external-only build.');
}else if(policy.mode==='migration'){
 const prior=JSON.parse(await fs.readFile('asset-storage-verified.json','utf8').catch(()=>'{}'));
 await fs.mkdir('public/__asset-seed',{recursive:true});
 for(const [url,e]of Object.entries(manifest.files))if(prior.files?.[url]!==e.sha256)await fs.writeFile('public'+e.seed,gzipSync(await fs.readFile('asset-packs'+url),{level:9}));
}else throw Error('Invalid asset-storage mode');
console.log(JSON.stringify({mode:policy.mode,files:Object.keys(manifest.files).length,separatedMiB:Object.values(manifest.files).reduce((n,e)=>n+e.bytes,0)/1048576,manifestSha256:digest}));
