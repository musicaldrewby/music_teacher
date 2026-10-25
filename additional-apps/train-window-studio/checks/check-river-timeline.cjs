const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/app.js','utf8'),scope={LOOP:300,state:{}};
// Exercise the production route functions, including station-distance timing.
vm.runInNewContext(source.slice(source.indexOf('const SCENES='),source.indexOf('const WINDOWS='))+
 source.slice(source.indexOf('const clamp01='),source.indexOf('\nlet renderer'))+
 '\nglobalThis.api={SCENES,RIVER_CROSSING,journeyFrame};',scope);
const {SCENES,RIVER_CROSSING,journeyFrame}=scope.api,fixtures=[];
for(const scene of Object.keys(SCENES))for(const stations of [false,true])for(const tunnels of [false,true]){
 const settings={scene,stations,tunnels,bridges:true,journey:false,rainAmount:0,snowAmount:0,fogAmount:0};
 for(const local of [0,186,188,195,202,205,220,235,238,245,252,254,299.99]){
  const j=journeyFrame(local,settings);
  assert.equal(j.bridgeActive,local>=195&&local<245?1:0);
  if(local===195||local===245){assert.equal(j.tunnel,1);assert.ok(j.tunnelBounds[0]<-3&&j.tunnelBounds[1]>3);}
  if([205,220,235].includes(local)){assert.equal(j.tunnel,0);assert.equal(j.bridge,1);}
  if(!tunnels)assert.equal(journeyFrame(58,settings).tunnel,0);
  assert.equal(journeyFrame(local,{...settings,bridges:false}).bridgeActive,0);
  if([195,245].includes(local))assert.equal(journeyFrame(local,{...settings,bridges:false}).tunnel,0);
 }
 assert.deepEqual(journeyFrame(0,settings),journeyFrame(300,settings));
 for(const local of [186,188,195,202,204,220,238,245,252,254])
  fixtures.push({sceneIndex:SCENES[scene].value,stations,tunnels,time:local,...journeyFrame(local,settings)});
}
// Connected routes retain their own transition portals and cannot bypass the
// two river tunnels when optional scenic tunnels are off.
for(const stations of [false,true]){
 const settings={scene:'country',journey:true,route:['country','halloween','bayou'],stations,tunnels:false,bridges:true,rainAmount:0,snowAmount:0};
 for(const offset of [0,300,600])for(const local of [195,245]){
  const j=journeyFrame(offset+local,settings);assert.equal(j.tunnel,1);assert.equal(j.bridgeActive,local===195?1:0);
 }
 assert.deepEqual(journeyFrame(0,settings),journeyFrame(900,settings));
 assert.equal(journeyFrame(300,settings).tunnel,1);
}
assert.equal(RIVER_CROSSING.preview,186);
if(process.argv.includes('--fixtures'))process.stdout.write(JSON.stringify(fixtures));
else console.log('PASS: river entry/exit tunnels are mandatory, water changes only inside them, land returns after departure, optional scenic tunnels remain optional, and single/connected loops close with station stops on or off.');
