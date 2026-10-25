const fs=require('fs'),assert=require('assert');
const p=JSON.parse(fs.readFileSync('public/examples/sleepy-hollow.felt.json'));
const scene=code=>p.scenes.find(s=>s.id==='sleepy-'+code),base={ichabod:640,brom:704,katrina:576};
for(const s of p.scenes)for(const o of s.items){
 const m=o.characterScale;if(m){assert.equal(m.standingHeight,base[m.character]);assert(Math.abs(o.h-m.standingHeight*m.perspectiveScale)<1e-6,'Inconsistent adult proportions in '+s.id);assert(Math.abs(o.y+o.h*(508/520-.5)-m.groundPlane)<1e-6,'Foot anchor mismatch in '+s.id);}
 if(o.name==='Ichabod Crane'&&o.illustration){const sings=o.illustration.defaultPose==='sing'||o.illustration.changes.some(c=>c.poseId==='sing');assert(!sings||['sleepy-03B','sleepy-05B'].includes(s.id),'Unmotivated singing in '+s.id);}
}
for(const code of ['05A','11A','11B']){const o=scene(code).items.find(o=>o.name==='Ichabod Crane');assert(o.illustration.defaultPose.startsWith('seated-'));assert(o.illustration.changes.every(c=>c.poseId.startsWith('seated-')));}
const room=scene('10B'),b=room.items.find(o=>o.name==='Brom Bones'),i=room.items.find(o=>o.name==='Ichabod Crane');assert(b.characterScale.groundPlane<i.characterScale.groundPlane-150);assert(b.x-i.x>600);assert.equal(b.characterScale.perspectiveScale,.8);
for(const [code,asset]of [['04B','dining-empty'],['06B','dining-dream'],['09A','dining-feast'],['09B','dining-feast']]){const s=scene(code);assert(s.items.some(o=>o.asset==='import-sleepy-'+asset));assert(!s.items.some(o=>o.illustration||o.asset?.includes('supper-front')),'Layered torso returned in '+code);}
assert(scene('08B').items.some(o=>o.asset==='import-sleepy-lodging-stable-dusk'));assert(scene('08B').items.some(o=>o.asset==='import-sleepy-orchard-lane-dusk'));assert(scene('12B').items.some(o=>o.asset==='import-sleepy-revision-farmhouse-night'));assert(scene('22A').items.some(o=>o.asset==='import-sleepy-lodging-stable-morning'));
assert(fs.statSync('public/examples/sleepy-hollow.felt.json').size<26214400);
console.log('PASS: consistent adult proportions and depth; grounded foot anchors; seated listeners; across-room staging; singing only when narrated; distinct journey locations; complete dining compositions; story fits hosting limit.');
