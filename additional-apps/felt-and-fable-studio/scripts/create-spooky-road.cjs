// A silent, editable, exactly repeating background journey. No music timing.
const fs=require('fs'),path=require('path'),{createCanvas,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),art=root+'/story-source/spooky-road/art',imports={},items=[];
const T=140,LAST=T-1/60,phase=t=>t<=10?0:t<=70?smooth((t-10)/60):t<=80?1:1-smooth((t-80)/(LAST-80));
function smooth(x){return x*x*(3-2*x)}
let serial=0;
function piece(name,props){const o={id:'spooky-piece-'+(++serial),name,type:'asset',x:800,y:450,w:200,h:200,bw:200,bh:200,rotation:0,opacity:1,color:null,fiber:0,stitch:false,depth:'middle',...props};items.push(o);return o}
const pose=o=>Object.fromEntries(['x','y','w','h','rotation','opacity'].map(k=>[k,o[k]]));
function keys(o,fn,times){o.keyframes=(times||Array.from({length:281},(_,i)=>Math.min(LAST,i*.5))).map(t=>({t,ease:'linear',pose:{...pose(o),...fn(t===LAST?T:t,t===LAST?0:phase(t))}}));}
function travel(o,factor=1){const start=o.x;keys(o,(_t,u)=>({x:start-travelWidth*factor*u}));return o}
async function embed(name,file){const bytes=fs.readFileSync(file),im=new Image();im.src='data:image/png;base64,'+bytes.toString('base64');await im.decode();const id='import-spooky-'+name;imports[id]='data:image/png;base64,'+bytes.toString('base64');return{id,w:im.width,h:im.height}}
function effect(name,w,h,paint){const c=createCanvas(w,h);paint(c.getContext('2d'),w,h);const id='import-spooky-'+name;imports[id]=c.toDataURL('image/png');return id}
let travelWidth;
(async()=>{
 const pano=await embed('panorama',art+'/panorama.png'),fg=await embed('foreground',art+'/foreground.png');
 const h=914,w=h*pano.w/pano.h;travelWidth=w-1600-12;
 travel(piece('Continuous Spooky Road panorama',{asset:pano.id,x:w/2-6,y:450,w,h,bw:pano.w,bh:pano.h,locked:true}));
 const glow=effect('moon-halo',240,240,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,6,w/2,h/2,w/2);r.addColorStop(0,'#e2ead861');r.addColorStop(.22,'#d7e5ef28');r.addColorStop(1,'#b7d4eb00');g.fillStyle=r;g.fillRect(0,0,w,h)});
 const moonX=950;travel(piece('Distant moonlight',{asset:glow,x:moonX,y:125,w:230,h:230,bw:240,bh:240,opacity:.45}),.07);
 travel(piece('Felt moon',{type:'shape',shape:'Circle',x:moonX,y:125,w:48,h:48,bw:48,bh:48,color:'#d9e7da',fiber:.7,rotation:0,opacity:.67}),.07);
 const fog=effect('mist',900,180,(g,w,h)=>{g.scale(1,h/w);const r=g.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);r.addColorStop(0,'#b7d1df65');r.addColorStop(.4,'#bfd6dd30');r.addColorStop(1,'#bfd6dd00');g.fillStyle=r;g.fillRect(0,0,w,w)});
 for(let i=0;i<5;i++){const o=piece('Drifting mist '+(i+1),{asset:fog,x:200+i*580,y:635+(i%3)*72,w:1150,h:160,bw:900,bh:180,opacity:.27,depth:'foreground'});const x=o.x,y=o.y;keys(o,(t,u)=>({x:x-travelWidth*.78*u+95*Math.sin(2*Math.PI*t/T+i)-95*Math.sin(i),y:y+9*(Math.cos(4*Math.PI*t/T+i)-Math.cos(i)),opacity:.22+.05*Math.cos(4*Math.PI*t/T+i)}));}
 // The warm and cool sign colors echo the identity of each destination.
 for(const [label,x,color]of [['Spooky Town',275,'#f5d49b'],['Creepyville',w-290,'#c8e9d9']]){
  travel(piece(label+' signpost',{type:'shape',shape:'Rectangle',x,y:835,w:11,h:140,bw:11,bh:140,color:'#453330',fiber:.7}));
  travel(piece(label+' signboard',{type:'shape',shape:'Rounded rectangle',x,y:802,w:254,h:57,bw:254,bh:57,color:'#322c36',fiber:.6,rotation:label==='Spooky Town'?-3:3}));
  travel(piece(label,{type:'text',text:label,x,y:802,w:230,h:36,bw:230,bh:36,color,rotation:label==='Spooky Town'?-3:3}));
 }
 // Small distant silhouettes have periodic independent motion; returning the
 // camera never makes them run backwards. They meet their opening pose exactly.
 const batPoints=[[0,12],[13,2],[24,15],[34,10],[42,18],[47,11],[50,15],[53,11],[58,18],[66,10],[76,15],[87,2],[100,12],[85,26],[73,21],[60,32],[50,25],[40,32],[27,21],[15,26]];
 for(let i=0;i<3;i++){const o=piece('Distant bat '+(i+1),{type:'path',points:batPoints,x:950+i*135,y:220+i*31,w:33+i*4,h:12+i*2,bw:100,bh:34,color:'#171b32',opacity:.7});const x=o.x,y=o.y;keys(o,(t,u)=>({x:x-travelWidth*.28*u+150*(Math.sin(2*Math.PI*t/T+i)-Math.sin(i)),y:y+20*(Math.sin(8*Math.PI*t/T+i)-Math.sin(i)),h:11+4*Math.cos(2*Math.PI*t*1.5)}),Array.from({length:1121},(_,j)=>Math.min(LAST,j*.125)));}
 for(const x of [1500]){const o=piece('Soft close foreground branches',{asset:fg.id,x,y:415,w:3400,h:3400*fg.h/fg.w,bw:fg.w,bh:fg.h,opacity:.57,depth:'foreground'});keys(o,(t,u)=>({x:x-travelWidth*1.24*u+8*Math.sin(2*Math.PI*t/T),y:415+5*Math.sin(4*Math.PI*t/T)}));}
 const p={format:'felt-and-fable',version:1,title:'Spooky Road — Spooky Town to Creepyville',active:0,custom:[],imports,exportFps:30,exportCaptions:false,backgroundLoop:{version:1,enabled:true},filmFinish:{look:'none',strength:0,glow:.18,grain:0,vignette:.12,aspect:'native'},music:{assetId:null,volume:0,loop:false,duck:false,fade:0,startSceneId:null,endSceneId:null},audioAssets:{},notes:'Silent classroom background. Present opens a continuous 2:20 loop. 10 seconds in Spooky Town, 60 seconds along Spooky Road, 10 seconds in Creepyville, 60 seconds home. Independent of singing, instruments, or steps. Main scenery stays sharp; foreground branches and mist add depth. All artwork embedded. Export MP4 for a video player with Repeat enabled.',scenes:[{id:'spooky-road-loop',name:'Spooky Town · Spooky Road · Creepyville · Home',bg:-1,bgColor:'#151b3a',caption:'',duration:T,items,cinema:{depthMode:'grounded',focus:{enabled:true,plane:'middle',amount:7,targetId:null}},director:{notes:'A single continuous panorama, with foreground parallax and periodic atmosphere. No fades to black, cuts, shaking, lyrics, sounds, or step cues.'}}]};
 fs.writeFileSync(root+'/public/examples/spooky-road.felt.json',JSON.stringify(p));
 fs.writeFileSync(root+'/story-source/spooky-road/README.md','# Spooky Road\n\nOriginal imagegen felt artwork. Run `node scripts/create-spooky-road.cjs` to rebuild the self-contained editable example. Present uses the optional backgroundLoop player. The native renderer and MP4 export use the same ordinary editable pieces, focus settings, keyframes, and film finish. No song audio or step timing.\n');
 console.log(JSON.stringify({duration:T,pieces:items.length,embeddedAssets:Object.keys(imports).length,bytes:fs.statSync(root+'/public/examples/spooky-road.felt.json').size,panorama:[w,h],travel:travelWidth}));
})().catch(e=>{console.error(e);process.exitCode=1});
