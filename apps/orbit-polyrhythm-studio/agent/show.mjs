#!/usr/bin/env node
import fs from 'node:fs';
import {ALL_PRESETS,getFactoryPreset} from '../dist/factory-presets.js';
import {createJourney,normalizeShow,summarizeShow,makeCue} from '../dist/show-score.js';
const [command,...args]=process.argv.slice(2),get=(flag,fallback)=>{const i=args.indexOf('--'+flag);return i<0?fallback:args[i+1]};
try{
 if(command==='presets'){console.log(JSON.stringify(ALL_PRESETS.map(p=>({id:p.id,name:p.state.name,category:p.category})),null,2));process.exit(0)}
 if(command==='create'){const show=createJourney({minutes:Number(get('minutes',60)),title:get('title','Beyond the Event Horizon'),seed:Number(get('seed',20261011)),style:get('style','horizon')});const out=get('out','show.orbit-show.json');fs.writeFileSync(out,JSON.stringify(show,null,2));console.log(JSON.stringify({file:out,...summarizeShow(show)},null,2));process.exit(0)}
 const file=args[0];if(!file)throw Error('Usage: node scripts/show.mjs create|presets|inspect|validate|apply [show.json] [--out file] [--commands actions.json]');
 let show=normalizeShow(JSON.parse(fs.readFileSync(file,'utf8')));
 if(command==='apply'){
  const actions=JSON.parse(fs.readFileSync(get('commands'),'utf8'));if(!Array.isArray(actions))throw Error('Commands must be a JSON array.');
  for(const a of actions){const cue=show.cues.find(c=>c.id===a.cue);
   if(a.op==='add'){const state=a.state||getFactoryPreset(a.preset);if(!state)throw Error('Unknown preset.');show.cues.push(makeCue(state,{id:a.id||`cue-${Date.now()}`,title:a.title||state.name,duration:a.duration||120,transition:a.transition??12}))}
   else if(a.op==='remove'){if(!cue)throw Error('Unknown cue.');show.cues=show.cues.filter(c=>c!==cue)}
   else if(a.op==='automate'){if(!cue)throw Error('Unknown cue.');cue.automation.push({at:a.at,duration:a.duration??0,path:a.path,value:a.value,curve:a.curve||'smooth'})}
   else if(a.op==='visual'){if(!cue)throw Error('Unknown cue.');Object.assign(cue.visual,a.settings)}
   else if(a.op==='cue'){if(!cue)throw Error('Unknown cue.');for(const key of ['title','duration','transition','state'])if(a[key]!==undefined)cue[key]=a[key]}
   else if(a.op==='show'){for(const key of ['title','artist','seed','tailSeconds','fadeIn','fadeOut','cinema'])if(a[key]!==undefined)show[key]=a[key]}
   else throw Error(`Unknown operation: ${a.op}`);
  }
  show=normalizeShow(show);const out=get('out',file);fs.writeFileSync(out,JSON.stringify(show,null,2));
 }else if(!['inspect','validate'].includes(command))throw Error('Unknown command.');
 console.log(JSON.stringify(summarizeShow(show),null,2));
}catch(e){console.error(e.message);process.exitCode=1}
