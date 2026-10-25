import {writeFileSync} from 'node:fs';
import {buildSet,disposeSet,setCatalog} from '../lib/sets';
import {setSchema} from '../lib/cinematic';
import {indexSetPieces} from '../lib/set-pieces';
const variants:Record<string,string[]>={},pieces:Record<string,ReturnType<typeof indexSetPieces>[number]['info']>={};
for(const set of setCatalog){if(set.id==='none')continue;for(const winter of [false,true])for(const decorations of [false,true]){const config=setSchema.parse({id:set.id,winter,decorations});const root=buildSet(config,0),entries=indexSetPieces(root);variants[[set.id,winter,decorations].join('|')]=entries.map(({info})=>{pieces[info.id]=info;return info.id;});disposeSet(root);}}
writeFileSync('lib/set-piece-catalog.json',JSON.stringify({pieces,variants}));
console.log(`${Object.keys(pieces).length} stable piece IDs; ${Object.keys(variants).length} variants`);
