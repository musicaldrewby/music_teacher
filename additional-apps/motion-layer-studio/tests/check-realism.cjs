// Reuse the focused DOM model to exercise real inspector functions without a browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let code=fs.readFileSync(require('path').join(__dirname,'check-ui.cjs'),'utf8');
code+=`\nvm.runInContext(section('const REALISM_DEFAULTS=','// Focused presentation improvements;'),Object.assign(sandbox,{validateProject:p=>p}));
sandbox.checkControl=(host,label,value,fn,disabled)=>{const e=el('label',{className:'control'},label);e.append(el('input',{type:'checkbox',checked:value,onchange:fn,disabled}));host.append(e)};sandbox.document.createTextNode=text=>el('#text',{},text);sandbox.layerReset=(l,k,min,max)=>l[k];sandbox.updateFlowSelection=()=>{};
vm.runInContext(section('function slider(','function inspector('),sandbox);
vm.runInContext(section('function glassDefaults(','const validateGlass='),sandbox);
vm.runInContext(section('function ensureFlow(','const segmentCache='),sandbox);
vm.runInContext(section('const FLOW_PRESETS=','function flowTiming('),sandbox);
for(const type of ['water','smoke','glass','flow']){
 active={id:'one',type,name:'Test',visible:true,opacity:1,locked:false,strength:.25,scale:.45,radius:.3,cycles:2,direction:0,feather:.005,x:.5,y:.7,flowX:0,flowY:0,color:'#aabbcc',arrows:[],paths:[],anchors:[]};
 const box=nodes.get('inspector');box.replaceChildren(el('input',{type:'text'}));
 vm.runInContext('realismInspector(current(),$("inspector"))||glassInspector(current(),$("inspector"))||flowInspector(current(),$("inspector"));cleanupInspector();polishInspector();',sandbox);
 const ranges=box.querySelectorAll('input').filter(e=>e.type==='range');assert(ranges.length>=8,type);
 for(const e of ranges){assert(Number.isFinite(+e.value),type+' '+e.dataset.controlKey);assert(+e.value>=+e.min&&+e.value<=+e.max,type+' out of range '+e.dataset.controlKey);}
 for(const e of ranges){const old=active[e.dataset.controlKey];e.value=+e.min;e.oninput();assert.equal(active[e.dataset.controlKey],+e.min);e.value=old;e.oninput();}
 active.locked=true;box.replaceChildren(el('input',{type:'text'}));vm.runInContext('realismInspector(current(),$("inspector"))||glassInspector(current(),$("inspector"))||flowInspector(current(),$("inspector"));',sandbox);assert(box.querySelectorAll('input').every(e=>e.type==='text'||e.disabled),'locked '+type);
}
vm.runInContext('for(const type of ["water","smoke"]){const old={type,cycles:3};realismDefaults(old);assert.equal(old.effectSpeed,3);const custom={type,effectSpeed:0,waterSwell:1.7};realismDefaults(custom);assert.equal(custom.effectSpeed,0);assert.equal(custom.waterSwell,1.7);}for(const [k,v] of [["effectSpeed",.5],["smokeDissipation",2],["glassMeander",-1],["flowDetail",NaN]])assert.throws(()=>validateProject({layers:[{[k]:v}]}));validateProject({layers:[{}, {effectSpeed:0,waterFine:0,glassMerge:1}]});',sandbox);
vm.runInContext(section("const ENV_WEATHER_TYPES=","function environmentDefaults"),sandbox);
vm.runInContext(section('function environmentWeather(','const envEvaluate='),sandbox);
sandbox.TAU=Math.PI*2;state.duration=20;state.environment={weatherEnabled:true,weatherAmount:.8,weatherWind:.6,weatherAngle:90,weatherGust:.7,weatherRate:3};
vm.runInContext('for(const type of ["flame","foliage","dappled","leaves"]){const l={type,weatherLinked:true,opacity:1,direction:0,natureWind:.3};const before=JSON.stringify(l),a=environmentWeather(l,0),b=environmentWeather(l,20);assert.deepEqual(a,b);assert.equal(JSON.stringify(l),before);assert.equal(a.direction,90);assert(a.natureWind>0);l.weatherLinked=false;assert.equal(environmentWeather(l,1),l);}',sandbox);
console.log('PASS new inspectors, disabled controls, fine slider ranges, legacy defaults, zero values, parameter validation, opt-in shared wind and wind loop.');
`;
vm.runInNewContext(code,{require,console,__dirname},{filename:'logic-dom-model.cjs'});
