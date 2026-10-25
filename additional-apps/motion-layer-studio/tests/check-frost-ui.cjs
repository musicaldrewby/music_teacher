const fs=require('fs'),vm=require('vm'),path=require('path');
let code=fs.readFileSync(path.join(__dirname,'check-ui.cjs'),'utf8');
code+=`
for(const variant of [0,1,2]){
 active=vm.runInContext('({...NATURE_BASE,...NATURE_START.frost,...FROST_DEFAULTS,type:"frost",id:"one",name:"Glass",x:.42,y:.52,opacity:1,locked:false,visible:true,natureVariant:'+variant+'})',sandbox);
 const box=nodes.get('inspector');box.replaceChildren(el('input',{type:'text'}));vm.runInContext('frostInspector(current(),$("inspector"));cleanupInspector();polishInspector();',sandbox);
 assert.equal(box.querySelector('select').closest('details'),null,'Glass appearance stays visible');const keys=box.querySelectorAll('input').map(i=>i.dataset.controlKey);
 assert.equal(keys.includes('natureAmount'),variant!==1);assert.equal(keys.includes('frostFog'),variant!==0);assert.equal(keys.includes('frostDroplets'),variant!==0);assert(keys.includes('natureSpeed'));assert(keys.includes('natureGrowth'));
 const placement=[active.x,active.y,active.natureSize,active.natureHeight];box.querySelectorAll('button').find(b=>b.textContent==='Steamy window').onclick();assert.deepEqual([active.x,active.y,active.natureSize,active.natureHeight],placement);assert.equal(active.natureVariant,1);
}
vm.runInContext(section('const natureValidation=','// Shared parameter slots'),Object.assign(sandbox,{validateProject:p=>p}));
vm.runInContext('for(const [key,value] of [["frostDropSize",0],["frostBlur",25],["frostFog",NaN],["frostDensity",-1],["frostEdgeSoftness",1]])assert.throws(()=>validateProject({layers:[{type:"frost",[key]:value}]}));const old={type:"frost",natureVariant:1,natureAmount:.63};frostDefaults(old);assert.equal(old.frostFog,.63);const zero={type:"frost",frostFog:0,frostDroplets:0,frostBlur:0};frostDefaults(zero);assert.equal(zero.frostFog,0);assert.equal(zero.frostDroplets,0);assert.equal(zero.frostBlur,0);',sandbox);
console.log('PASS three glass modes, conditional controls, preset placement, old-project defaults, zero values and field validation');
`;
vm.runInNewContext(code,{require,console,__dirname},{filename:'frost-ui-model.cjs'});
