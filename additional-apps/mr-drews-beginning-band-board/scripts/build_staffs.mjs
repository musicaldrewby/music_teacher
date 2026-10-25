import {mkdir,writeFile} from 'node:fs/promises';
import {INSTRUMENTS} from '../dist/data.js';
import {staffSVG} from '../dist/notation.js';
const output=new URL('../dist/assets/notation/',import.meta.url);
await mkdir(output,{recursive:true});
for(const inst of INSTRUMENTS)for(const [n,note] of inst.written.entries())await writeFile(new URL(`${inst.id}-${n}-staff.svg`,output),staffSVG(note,inst.clef));
console.log('Wrote 49 clean vector staff charts.');
