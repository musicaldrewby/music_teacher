const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').join(__dirname,'..');const ts=require(root+'/node_modules/typescript');
const html=fs.readFileSync(root+'/public/studio.html','utf8'),app=html.split('<script>')[1].split('</script>')[0];
const sf=ts.createSourceFile('app.js',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let validators='';for(const n of sf.statements){const s=n.getText(sf);if(ts.isFunctionDeclaration(n)&&n.name?.text==='validateProject'||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['modeMap','types','NATURE_TYPES','SNOW_LIMITS','KEY_PROPS'].includes(d.name.getText(sf))))validators+=s+'\n';if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.initializer?.getText(sf)==='validateProject'))validators+=s+'\n';if(ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&n.expression.left.getText(sf)==='validateProject')validators+=s+'\n';}
const project=JSON.parse(fs.readFileSync(root+'/public/examples/mega-volcano.motion.json','utf8'));
const ctx=vm.createContext({project});vm.runInContext(validators+'\nvalidateProject(project)',ctx);
assert.equal(project.duration,30);assert.equal(project.layers.length,11);assert.equal(project.camera,0);
for(const l of project.layers.filter(l=>['flow','flame','plume','heat','lightning','emitter'].includes(l.type)))assert(l.mask,'Local effects require masks');
for(const l of project.layers.filter(l=>l.paths?.length))for(const path of l.paths){assert(path.points.at(-1).y>path.points[0].y,'Lava must flow downhill');assert(path.speed>0);}
assert(project.layers.some(l=>l.type==='plume'&&l.plumeSpeed>0));assert(project.layers.some(l=>l.type==='flame'&&l.natureSpeed>0));
console.log('PASS: actual project validators; 11 editable layers; downhill lava paths; masked eruption and heat; animated flame and plume.');
