const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),ts=require('typescript');
const root=require('path').join(__dirname,'..');
const html=fs.readFileSync(root+'/public/studio.html','utf8'),app=html.split('<script>')[1].split('</script>')[0],bridge=fs.readFileSync(root+'/public/studio-bridge.js','utf8');
const sf=ts.createSourceFile('app.js',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let validators='';
for(const n of sf.statements){const s=n.getText(sf);if(ts.isFunctionDeclaration(n)&&n.name?.text==='validateProject'||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['modeMap','types','NATURE_TYPES','SNOW_LIMITS','KEY_PROPS'].includes(d.name.getText(sf))))validators+=s+'\n';if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.initializer?.getText(sf)==='validateProject'))validators+=s+'\n';if(ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&n.expression.left.getText(sf)==='validateProject')validators+=s+'\n';}
const initial={version:1,name:'Original',duration:30,camera:0,image:null,imageWidth:1920,imageHeight:1080,layers:[{id:'existing',type:'light',name:'Porch',visible:true,locked:false,opacity:.5,strength:.3,scale:.4,cycles:1,direction:0,color:'#ffdd99',x:.5,y:.5,radius:.1,feather:.002,flowX:0,flowY:0,mask:null,src:null}]};
let restoreFailure=false,marks=0;
const classList={add(){},remove(){}};
const context=vm.createContext({console,crypto:require('crypto').webcrypto,JSON,Math,Map,Set,Error,Number,Array,Object,RegExp,String,structuredClone,state:structuredClone(initial),selected:'existing',exporting:false,restoring:false,baseImage:{},gl:{MAX_TEXTURE_SIZE:1,getParameter:()=>4096},document:{body:{classList}},mark(){marks++},setTool(){},layerDefaults(l){if(l.type==='lightning')Object.assign(l,{lightningStrikes:2,lightningLength:.5,lightningSpread:.2});},snapshot(){return JSON.stringify(context.state)},checkpoint(){},loadImage:async()=>({width:1920,height:1080}),restore:async s=>{if(restoreFailure){restoreFailure=false;throw Error('GPU resource failed');}context.state=JSON.parse(s);context.mark();},$(){return null},resources:new Map(),NATURE_BASE:{},NATURE_START:{},TAU:2*Math.PI});
vm.runInContext(validators,context);
// Run actual editing functions with GPU/DOM resources substituted; no browser required.
let cut=bridge.slice(bridge.indexOf("const sessionId="),bridge.indexOf(' const existingImport='));
cut=cut.replace(' const rawMark=mark;mark=function(){sceneRevision++;rawMark();};',' const rawMark=mark;mark=function(){sceneRevision++;rawMark();};');
vm.runInContext(cut+'\nfunction refreshRegions(){};this.edit=edits;this.inspect=summary;',context);
(async()=>{
 const before=JSON.stringify(context.state);
 await assert.rejects(context.edit([{op:'set_scene',name:'Should not apply'},{op:'no_such_action'}],0),/Unknown action/);assert.equal(JSON.stringify(context.state),before);
 await assert.rejects(context.edit([{op:'set_scene',duration:17}],0),/Invalid project/);assert.equal(JSON.stringify(context.state),before);
 await context.edit([{op:'update_layer',id:'existing',settings:{opacity:.2}},{op:'set_scene',name:'Updated'}],0);assert.equal(context.state.layers[0].opacity,.2);assert.equal(context.state.name,'Updated');
 await assert.rejects(context.edit([{op:'set_scene',name:'stale'}],0),/changed/);
 let rev=context.inspect().revision;context.state.layers[0].locked=true;await assert.rejects(context.edit([{op:'update_layer',id:'existing',settings:{opacity:1}}],rev),/Unlock/);context.state.layers[0].locked=false;
 rev=context.inspect().revision;restoreFailure=true;const current=JSON.stringify(context.state);await assert.rejects(context.edit([{op:'set_scene',name:'GPU failure'}],rev),/GPU resource/);assert.equal(JSON.stringify(context.state),current);
 rev=context.inspect().revision;await context.edit([{op:'define_region',name:'Sky',points:[[0,0],[1,0],[1,.4],[0,.4]]}],rev);assert.equal(context.state.namedRegions.length,1);
 await assert.rejects(context.edit([{op:'define_region',name:'Wrong',points:[[0,0],[2,0],[0,1]]}],context.inspect().revision),/three points/);
 await context.edit([{op:'weather',preset:'storm'}],context.inspect().revision).catch(e=>{if(!/createElement/.test(e.message))throw e;});
 // No named sky: check coordinated weather is idempotent and preserves unrelated work.
 context.state.namedRegions=[];await context.edit([{op:'weather',preset:'storm'}],context.inspect().revision);assert.equal(context.state.layers.length,3);await context.edit([{op:'weather',preset:'drizzle'}],context.inspect().revision);assert.equal(context.state.layers.length,2);assert.equal(context.state.layers[0].id,'existing');
 await context.edit([{op:'weather',preset:'clear'}],context.inspect().revision);assert.equal(context.state.layers.length,1);
 console.log('PASS: actual app validators, atomic edits, stale revisions, locked layers, GPU rollback, named-region bounds and non-destructive weather replacement.');
})().catch(e=>{console.error(e);process.exitCode=1});
