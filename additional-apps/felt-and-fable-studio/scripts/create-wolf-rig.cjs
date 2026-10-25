const fs=require('fs'),path=require('path'),{createCanvas,Image}=require('@napi-rs/canvas');
const h=require('./app-harness.cjs');
const root=path.resolve('story-source/wolf-rig'),manifest=JSON.parse(fs.readFileSync(root+'/art/manifest.json'));
const keys={head:'head-neutral',headListen:'head-listen',headReact:'head-surprise',torso:'torso',upperArm:'upper-arm',forearm:'forearm',hand:'hand-relaxed',fist:'hand-knock',tail:'tail',thigh:'thigh',shin:'shin',foot:'foot'};
const pivots={head:'neck',headListen:'neck',headReact:'neck',hand:'wrist',fist:'wrist',tail:'base',foot:'ankle'};
async function load(file){const im=new Image();im.src=fs.readFileSync(file);await im.decode();return im;}
(async()=>{
 await h.ready;const atlas=createCanvas(1440,1728),g=atlas.getContext('2d'),parts={};let n=0;
 for(const [key,source]of Object.entries(keys)){const p=manifest.parts[source],im=await load(root+'/art/'+p.filename),x=n%3*480,y=Math.floor(n/3)*432;g.drawImage(im,x,y);const q=parts[key]={rect:[x,y,p.width,p.height],pivot:p.anchors[pivots[key]]||[.5,.5]};if(p.anchors.start){q.a=p.anchors.start;q.b=p.anchors.end;}if(key==='fist'){q.a=p.anchors.wrist;q.b=p.anchors.contact;}n++;}
 fs.writeFileSync(root+'/art/wolf-rig-atlas.webp',atlas.toBuffer('image/webp',94));
 const backdrop=await load(root+'/art/door-set-render.png'),bgCanvas=createCanvas(1672,941);bgCanvas.getContext('2d').drawImage(backdrop,0,0);
 const imports={'import-wolf-rig-v1':atlas.toDataURL('image/webp',.94),'import-wolf-door-set':bgCanvas.toDataURL('image/webp',.94)};
 const background={id:'wolf-door-set',type:'asset',asset:'import-wolf-door-set',name:'Cottage doorway',x:800,y:450,w:1600,h:900,bw:1672,bh:941,rotation:0,opacity:1,fiber:0,locked:true};
 const floor=756,height=510,target={pieceId:background.id,u:1245/1672,v:554/941};
 const wolf={id:'wolf-rig-actor',type:'asset',asset:'import-wolf-rig-v1',name:'Wolf',x:460,y:floor-height/600*270,w:height*2/3,h:height,bw:400,bh:600,rotation:0,opacity:1,fiber:0,rig:{version:1,model:'wolf',facing:'right',parts,commands:[
  {id:'wolf-establish',kind:'hold',start:0,duration:1},
  {id:'wolf-approach',kind:'walk',start:1,duration:7.5,target:{x:1100,y:floor}},
  {id:'wolf-settle',kind:'hold',start:8.5,duration:.7},
  {id:'wolf-knock',kind:'knock',start:9.2,duration:3.8,target},
  {id:'wolf-listen',kind:'listen',start:13,duration:3.2},
  {id:'wolf-react',kind:'react',start:16.2,duration:2.2},
  {id:'wolf-recover',kind:'hold',start:18.4,duration:1.6}
 ]}};
 const shot=(id,name,duration,from,to=from)=>({id,name,duration,from,to,move:JSON.stringify(from)!==JSON.stringify(to),connection:'cut',easing:'cinematic'});
 const s={id:'wolf-door-scene',name:'The Wolf at the Door',bg:-1,bgColor:'#b9c39b',caption:'',duration:20,items:[background,wolf],cues:[],feltStage:{walkArea:{x:180,y:700,w:1300,h:180},obstacles:[]},cinema:{shots:[shot('wolf-wide','Approach',8.5,{x:800,y:450,zoom:1},{x:880,y:480,zoom:1.12}),shot('wolf-medium','Knock, listen, react',11.5,{x:984,y:530,zoom:1.3})]}};
 h.context.wolfProject={format:'felt-and-fable',version:1,title:'The Wolf at the Door',active:0,scenes:[s],custom:[],imports,exportFps:30,exportCaptions:false,exportNormalizeAudio:true};
 h.run('audioDefaults(wolfProject);rigSyncSounds(wolfProject.scenes[0],wolfProject.scenes[0].items[1]);validateProject(wolfProject)');
 const project=h.run('wolfProject');fs.writeFileSync('public/examples/wolf-door.felt.json',JSON.stringify(project));
 fs.writeFileSync(root+'/rig-parts.json',JSON.stringify(parts,null,2)+'\n');
 console.log(JSON.stringify({scenes:1,duration:20,commands:wolf.rig.commands.length,bytes:fs.statSync('public/examples/wolf-door.felt.json').size,review:h.run('rigReview(wolfProject)')}));
})().catch(e=>{console.error(e);process.exitCode=1});
