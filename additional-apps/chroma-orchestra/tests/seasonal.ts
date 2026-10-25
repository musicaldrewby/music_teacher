import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seasonalProject} from '../lib/seasonal';
import {projectSchema,duration,demoProject} from '../lib/project';
import {sceneryManifest,snowPosition} from '../lib/scenery';
import {exportScenery} from '../lib/scenery-geometry';
import {filmFrame,filmCues,cuePose,exportCameraPlan,takeCameraControl} from '../lib/camera-sequence';
import {cameraPose,defaultCamera} from '../lib/camera';
import {renderAudio,wavBytes,audioKey} from '../lib/audio';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const legacy=JSON.parse(JSON.stringify(demoProject()));delete legacy.scenery;delete legacy.sequence;const restored=projectSchema.parse(legacy);assert.equal(restored.scenery.theme,'studio');assert.equal(restored.sequence.enabled,false);
const christmas=seasonalProject('christmas'),halloween=seasonalProject('halloween');assert.equal(christmas.scenery.snow,true);assert.equal(halloween.scenery.snow,false);assert.equal(christmas.sequence.cues.length,4);
const scenery=exportScenery(christmas),dark=sceneryManifest(halloween);assert.ok(scenery.props.some(p=>p.name==='Tree topper star'));assert.ok(dark.props.some(p=>p.name==='Jack-o-lantern pumpkin'));assert.ok(dark.props.some(p=>p.name==='Haunted house'));assert.ok(dark.props.some(p=>p.name==='Gravestone'));assert.ok(scenery.props.some(p=>p.name==='Wrapped present'));assert.ok(scenery.snow.length>100);
for(const s of [scenery,dark])for(const p of s.props)assert.ok([...p.position,...p.scale,...p.rotation].every(Number.isFinite));
for(const g of Object.values(scenery.geometries)){assert.ok(g.vertices.length>0);assert.ok(g.faces.every(face=>face.every(i=>i>=0&&i<g.vertices.length)));}
const snowAt5=snowPosition(scenery,0,5);assert.notDeepEqual(snowAt5,snowPosition(scenery,0,0));snowPosition(scenery,0,99);assert.deepEqual(snowPosition(scenery,0,5),snowAt5,'Scrubbing must not change snowfall');
for(const time of [0,1,7,44,160])for(let i=0;i<scenery.snow.length;i++){const pos=snowPosition(scenery,i,time);assert.ok(pos[1]>=0&&pos[1]<scenery.snowBounds.height);assert.ok(pos.every(Number.isFinite));}
const cues=filmCues(christmas),cut=cues[2],glide=cues[1],dissolve=cues[3];
assert.notDeepEqual(filmFrame(christmas,cut.at-.001).primary.position,filmFrame(christmas,cut.at).primary.position);
assert.deepEqual(filmFrame(christmas,glide.at).primary,cuePose(christmas,cues,0,glide.at),'Glide must start at outgoing camera');
assert.deepEqual(filmFrame(christmas,glide.at+glide.seconds).primary,cuePose(christmas,cues,1,glide.at+glide.seconds));
const middle=filmFrame(christmas,dissolve.at+dissolve.seconds/2);assert.ok(middle.secondary);near(middle.mix,.5);assert.equal(filmFrame(christmas,dissolve.at+dissolve.seconds).secondary,null);
const plan=exportCameraPlan(christmas);assert.equal(plan.frames,Math.ceil(duration(christmas)*60));assert.equal(plan.segments.at(-1)!.end,plan.frames+1);
for(let f=1;f<=plan.frames;f++){const active=plan.segments.filter(s=>f>=s.start&&f<s.end);assert.ok(active.length===1||active.length===2,'Every film frame needs one or two camera views');const browser=filmFrame(christmas,(f-1)/60);const last=active.at(-1)!;const baked=last.cameras.find(c=>c.frame===f)!;const expected=browser.secondary||browser.primary;for(let i=0;i<3;i++)near(baked.position[i],expected.position[i]);}
const manual=takeCameraControl(christmas,glide.at+.7),frozen=cameraPose({...christmas,camera:manual},0),visible=filmFrame(christmas,glide.at+.7).primary;for(let i=0;i<3;i++){near(frozen.position[i],visible.position[i]);near(frozen.target[i],visible.target[i]);}
assert.equal(audioKey(christmas),audioKey({...christmas,scenery:halloween.scenery,sequence:{enabled:false,cues:[]}}));
assert.throws(()=>projectSchema.parse({...christmas,sequence:{enabled:true,cues:[cues[0],{...cues[1],at:cues[0].at}]}}));
const font=Buffer.concat([fs.readFileSync('public/soundfonts/generaluser-1.bin'),fs.readFileSync('public/soundfonts/generaluser-2.bin')]);const sf=font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength) as ArrayBuffer;
for(const [name,p] of [['christmas',christmas],['halloween',halloween]] as const){
 const path=`/tmp/chroma-seasonal-qa/${name}`;fs.mkdirSync(path,{recursive:true});const pcm=await renderAudio(p,()=>{},undefined,sf);assert.ok(pcm.left.some(x=>Math.abs(x)>.01));
 for(const file of ['orchestra.py','seasonal_scene.py','contraptions.py'])fs.copyFileSync(`public/blender/${file}`,`${path}/${file}`);
 fs.writeFileSync(`${path}/performance.json`,JSON.stringify(p));fs.writeFileSync(`${path}/scenery.json`,JSON.stringify(exportScenery(p)));fs.writeFileSync(`${path}/camera-plan.json`,JSON.stringify(exportCameraPlan(p)));fs.writeFileSync(`${path}/soundtrack.wav`,wavBytes(pcm));
 fs.writeFileSync(`${path}/snow-check.json`,JSON.stringify([0,1,4].map(time=>({time,points:p.scenery.snow?[0,7,15].map(i=>({i,position:snowPosition(sceneryManifest(p),i,time)})):[]}))));
}
console.log(JSON.stringify({passed:true,christmasNotes:christmas.tracks.reduce((n,t)=>n+t.notes.length,0),halloweenNotes:halloween.tracks.reduce((n,t)=>n+t.notes.length,0),sceneryProps:scenery.props.length,snowflakes:scenery.snow.length,framesCompared:plan.frames,checks:['legacy migration','seasonal scenery','snow scrubbing determinism','cut boundaries','glide continuity','dissolve weights','every export frame matches preview camera','manual takeover without jump','camera edits preserve soundtrack','real seasonal soundfont audio']}));
