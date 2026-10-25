import esbuild from '../node_modules/.pnpm/node_modules/esbuild/lib/main.js';
import {spawnSync} from 'node:child_process';
for(const name of ['core','score-camera','seasonal','contraptions']){
await esbuild.build({entryPoints:[`tests/${name}.ts`],outfile:`work/${name}-test.mjs`,bundle:true,platform:'node',format:'esm',external:['spessasynth_core']});
const result=spawnSync(process.execPath,[`work/${name}-test.mjs`],{stdio:'inherit'});if(result.status!==0){process.exitCode=result.status??1;break;}
}
