import {build} from 'esbuild';import fs from 'node:fs/promises';import path from 'node:path';
const result=await build({entryPoints:['scripts/document-tools-entry.js'],outfile:'dist/vendor/document-tools.js',bundle:true,format:'esm',platform:'browser',minify:true,target:'es2022',legalComments:'inline',metafile:true});
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
 if(!input.includes('node_modules/'))continue;let dir=path.dirname(path.resolve(input));
 while(dir!==path.dirname(dir)){
  try{const pkg=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));if(pkg.name){packages.set(pkg.name,{dir,pkg});break;}}catch{}
  dir=path.dirname(dir);
 }
}
const licenses=[];
for(const [name,{dir,pkg}]of [...packages].sort()){
 const files=(await fs.readdir(dir)).filter(f=>/^(license|licence|copying|copyright)(\.|$)/i.test(f));
 const texts=[];for(const file of files)if((await fs.stat(path.join(dir,file))).isFile())texts.push(await fs.readFile(path.join(dir,file),'utf8'));
 licenses.push(name+' '+pkg.version+' — '+pkg.license+'\n'+(texts.join('\n')||'See bundled source notices.'));
}
await fs.writeFile('dist/vendor/document-tools-LICENSES.txt',licenses.join('\n\n'+'='.repeat(70)+'\n\n'));
console.log('Document tools built; '+packages.size+' dependency notices included.');
