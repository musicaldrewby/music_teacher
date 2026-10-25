import assert from 'node:assert/strict';
import fs from 'node:fs';
import {contraptionProject} from '../lib/contraption-presets';
import {contraptionPlan,contraptionBall,keyActivity,isContraption} from '../lib/contraption';
import {ContraptionObjects,exportContraptions} from '../lib/contraption-geometry';
import {stationLayout,noteTime,projectSchema,type Project} from '../lib/project';
import {exportScenery} from '../lib/scenery-geometry';
import {exportCameraPlan} from '../lib/camera-sequence';
import {renderAudio,wavBytes} from '../lib/audio';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const font=Buffer.concat([fs.readFileSync('public/soundfonts/generaluser-1.bin'),fs.readFileSync('public/soundfonts/generaluser-2.bin')]);
const sf=font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength) as ArrayBuffer;
for(const kind of ['waterfall','pipeworks'] as const){
 const p=contraptionProject(kind),t=p.tracks[0],plan=contraptionPlan(t,stationLayout(p)[0].width);projectSchema.parse(p);
 assert.equal(plan.keys.length,new Set(t.notes.map(n=>n.midi)).size);assert.equal(new Set(plan.keys.map(k=>k.hit.join(','))).size,plan.keys.length,'Each pitch must have a distinct striking surface');
 for(const k of plan.keys){const pos=contraptionBall(k,0);near(pos[1]-.14,k.y+.125);near(pos[0],k.x);near(pos[2],k.z);for(const age of [-1.4,-.38,0,.48,.76]){const a=contraptionBall(k,age-1e-8),b=contraptionBall(k,age+1e-8);assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<1e-5,'Trajectory continuity');}}
 for(const speed of [.5,1,2]){const q={...p,speed},n=t.notes[0],time=noteTime(q,n);near(keyActivity(q,t,n.midi,time-.0001).held,0);assert.ok(keyActivity(q,t,n.midi,time+.001).held>0);near(contraptionBall(plan.keys.find(k=>k.pitch===n.midi)!,time-noteTime(q,n))[1],plan.keys.find(k=>k.pitch===n.midi)!.hit[1]);}
 const machine=new ContraptionObjects(p,t,plan.width);machine.update(3);const a=Array.from(machine.balls.instanceMatrix.array);machine.update(12);machine.update(3);assert.deepEqual(Array.from(machine.balls.instanceMatrix.array),a,'Seeking must be deterministic');machine.track={...t,mute:true};machine.update(3);assert.equal(machine.balls.count,0);
 const data=exportContraptions(p);assert.equal(data.stations.length,1);assert.ok(data.stations[0].nodes.some(n=>n.motion?.kind==='lift'));assert.ok(data.stations[0].nodes.some(n=>n.motion?.kind==='key'));if(kind==='pipeworks')assert.ok(data.stations[0].nodes.some(n=>n.motion?.kind==='bellows'));
 const path=`/tmp/chroma-machine-qa/${kind}`;fs.mkdirSync(path,{recursive:true});const pcm=await renderAudio(p,()=>{},undefined,sf);assert.ok(pcm.left.some(x=>Math.abs(x)>.01));
 for(const file of ['orchestra.py','seasonal_scene.py','contraptions.py'])fs.copyFileSync(`public/blender/${file}`,`${path}/${file}`);
 for(const [name,obj] of Object.entries({'performance.json':p,'scenery.json':exportScenery(p),'contraptions.json':data,'camera-plan.json':exportCameraPlan(p)}))fs.writeFileSync(`${path}/${name}`,JSON.stringify(obj));fs.writeFileSync(`${path}/soundtrack.wav`,wavBytes(pcm));
 const samples=t.notes.slice(0,8).flatMap((n,ni)=>[-.8,-.15,0,.15,.6].map(age=>({note:ni,time:noteTime(p,n)+age,position:contraptionBall(plan.keys.find(k=>k.pitch===n.midi)!,age)})));fs.writeFileSync(`${path}/motion-check.json`,JSON.stringify(samples));
 console.log(JSON.stringify({kind,passed:true,pitches:plan.keys.length,notes:t.notes.length,meshes:Object.keys(data.stations[0].geometries).length,bytes:JSON.stringify(data).length,checks:['distinct pitch lanes','exact surface contact','continuous motion','tempo sync','scrubbing','mute','native export','soundfont audio']}));
}
