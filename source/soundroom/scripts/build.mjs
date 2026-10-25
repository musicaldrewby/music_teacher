import { createRequire } from 'node:module';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { delimiter } from 'node:path';
const require = createRequire(import.meta.url);
const { build } = require('esbuild');
await mkdir('dist/assets', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', outfile: 'dist/assets/app.js', logLevel: 'info', nodePaths: process.env.NODE_PATH?.split(delimiter).filter(Boolean) || [] });
await copyFile('src/index.html', 'dist/index.html');
for (const name of ['hardware.css', 'performance.css', 'studio.css', 'workstation.css', 'lcd-browser.css', 'ui.css', 'workspace-layout.css', 'play-layout.css', 'score.css']) await copyFile('src/' + name, 'dist/assets/' + name);

const processor=await readFile('dist/assets/spessasynth-processor-4.3.14.js','utf8');
const extension=await build({entryPoints:['src/sequencer-worklet.js'],bundle:true,minify:true,format:'iife',write:false,logLevel:'silent'});
// Capture the registered base without depending on minified class names.
await writeFile('dist/assets/soundroom-processor.js','let SoundroomBase; const registerProcessor=(name,Processor)=>{SoundroomBase=Processor;globalThis.registerProcessor(name,Processor)};\n'+processor.replace(/\/\/# sourceMappingURL=.*$/gm,'')+'\n'+extension.outputFiles[0].text);

await build({entryPoints:['src/export-worker.js'],bundle:true,minify:true,format:'esm',outfile:'dist/assets/export-worker.js',logLevel:'info',nodePaths:process.env.NODE_PATH?.split(delimiter).filter(Boolean)||[]});

await build({entryPoints:['src/score-worker.js'],bundle:true,minify:true,format:'esm',outfile:'dist/assets/score-worker.js',logLevel:'info'});
