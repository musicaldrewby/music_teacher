import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.rm('dist',{recursive:true,force:true});await fs.cp('public','dist',{recursive:true});
await build({entryPoints:['src/app.js','src/render-worker.js'],outdir:'dist',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'linked'});
console.log('Built static music engine, worker, and bundled sound collection.');
