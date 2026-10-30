import {build} from 'esbuild';
import {readdir,cp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
await build({entryPoints:['src/soundfont-worklet.js'],outfile:'dist/soundfont-worklet.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof'});
await cp('node_modules/spessasynth_core/LICENSE','dist/vendor/SPESSASYNTH-LICENSE.txt');
await rm('dist/client',{recursive:true,force:true});await rm('dist/server',{recursive:true,force:true});await mkdir('dist/client',{recursive:true});
for(const item of await readdir('dist',{withFileTypes:true}))if(!['client','server','.openai','_appgen_meta'].includes(item.name))await cp('dist/'+item.name,'dist/client/'+item.name,{recursive:true});
await build({entryPoints:['server/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await mkdir('dist/.openai',{recursive:true});await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
