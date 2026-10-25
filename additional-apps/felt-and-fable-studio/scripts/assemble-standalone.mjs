// Recreate the original portable folder layout without a server dependency.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function assembleStandalone(){
 const out=path.join(root,'.sites-runtime/standalone');
 await fs.rm(out,{recursive:true,force:true});
 await fs.cp(path.join(root,'public'),out,{recursive:true,filter:p=>!p.includes('__asset-seed')});
 await fs.cp(path.join(root,'asset-packs'),out,{recursive:true});
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await assembleStandalone());
