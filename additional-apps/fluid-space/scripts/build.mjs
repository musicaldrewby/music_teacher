import {build} from 'esbuild';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:'es2022',outfile:'dist/assets/app.js',minify:true});
await build({entryPoints:['src/processor.js'],bundle:true,format:'iife',target:'es2022',outfile:'dist/assets/processor.js',minify:true});
await build({entryPoints:['src/export-worker.js'],bundle:true,format:'iife',target:'es2022',outfile:'dist/assets/export-worker.js',minify:true});
await copyFile('src/index.html','dist/index.html');await copyFile('src/style.css','dist/assets/style.css');
const manifest=JSON.parse(await readFile('.openai/hosting.json'));manifest.static={directory:'dist'};await writeFile('.openai/hosting.json',JSON.stringify(manifest,null,2)+'\n');
console.log('FLUID SPACE built.');
