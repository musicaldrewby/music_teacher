import fs from 'node:fs/promises';
import {build} from 'esbuild';
await fs.mkdir('asset-packs/js/vendor/neural',{recursive:true});
await build({entryPoints:['src/voice/runtime.mjs'],outfile:'asset-packs/js/vendor/neural/runtime.mjs',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,external:['node:*']});
for(const name of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])await fs.copyFile('node_modules/onnxruntime-web/dist/'+name,'asset-packs/js/vendor/neural/'+name);
for(const name of await fs.readdir('src/voice/licenses'))await fs.copyFile('src/voice/licenses/'+name,'asset-packs/js/vendor/neural/'+name);
console.log('Built lazy neural runtime; no model or runtime loads at app startup.');
