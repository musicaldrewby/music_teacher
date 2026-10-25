const artFs=require('fs'),artPath=require('path');artFs.mkdirSync(artPath.resolve(__dirname,'../public/assets/prepared'),{recursive:true});
const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'public');
const specs=[
 ['viola','Viola & bow','strings bowed alto',170],
 ['double-bass','Double bass & bow','strings bowed upright contrabass bass fiddle',220],
 ['oboe','Oboe','woodwind double reed',100],
 ['bassoon','Bassoon','woodwind double reed bocal',130],
 ['contrabassoon','Contrabassoon','woodwind double reed double bassoon',200],
 ['piccolo','Piccolo','woodwind transverse small flute',190],
 ['french-horn','French horn','brass horn rotary valves',250],
 ['concert-bass-drum','Concert bass drum','percussion orchestral bass drum beater',330],
 ['snare-drum','Snare drum','percussion orchestral snare drum sticks',220],
 ['marimba','Marimba','percussion pitched wooden bars mallets resonators',380],
 ['cymbals','Orchestral cymbals','percussion crash cymbals pair',260],
 ['tambourine','Tambourine','percussion jingles frame drum',180]
];
(async()=>{
 const sheet=createCanvas(1536,256),g=sheet.getContext('2d'),entries=[];
 let total=0;
 for(let i=0;i<specs.length;i++){
  const[slug,name,tags,defaultWidth]=specs[i],id='orchestra-'+slug;
  const source=path.join(root,'art-source/orchestra',slug+'.png'),im=await loadImage(source);
  const original=createCanvas(im.width,im.height),og=original.getContext('2d');og.drawImage(im,0,0);
  const pixels=og.getImageData(0,0,im.width,im.height).data;
  let x0=im.width,y0=im.height,x1=-1,y1=-1,clear=0;
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
   if(pixels[(y*im.width+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}else clear++;
  }
  if(x1<0||clear<im.width*im.height*.1)throw Error('Missing transparency: '+slug);
  // Trim empty transparent margins only; retain every original alpha pixel.
  const w=x1-x0+1,h=y1-y0+1,c=createCanvas(w+8,h+8);c.getContext('2d').drawImage(im,x0,y0,w,h,4,4,w,h);
  const bytes=c.encodeSync('webp',97),prepared='assets/prepared/'+id+'.js';
  fs.writeFileSync(path.join(dist,prepared),'FELT_DATA['+JSON.stringify(id)+']='+JSON.stringify('data:image/webp;base64,'+bytes.toString('base64'))+';\n');total+=bytes.length;
  const cellX=(i%8)*192,cellY=Math.floor(i/8)*128,z=Math.min(184/c.width,120/c.height),tw=Math.round(c.width*z),th=Math.round(c.height*z);
  g.drawImage(c,cellX+(184-tw)/2,cellY+(120-th)/2,tw,th);
  entries.push({id,name,category:'instruments',themes:['orchestra',...(tags.startsWith('strings')?[]:['band'])],tags:tags+' orchestra orchestral music felt',nativeAlpha:true,defaultWidth,maxInitialHeight:420,prepared,preparedSize:[c.width,c.height],orchestraThumb:[cellX,cellY,184,120]});
 }
 const preview=sheet.encodeSync('webp',92).toString('base64');
 fs.writeFileSync(path.join(dist,'assets/orchestra-catalog.js'),"'use strict';\n// Full-resolution felt pieces load only when placed; this small sheet is for browsing.\nconst ORCHESTRA_ART="+JSON.stringify(entries)+";\nART.pieces.push(...ORCHESTRA_ART);\nconst ORCHESTRA_PREVIEWS='data:image/webp;base64,"+preview+"';\nasync function loadOrchestraThumbnails(){const im=new Image();im.src=ORCHESTRA_PREVIEWS;await im.decode();for(const a of ORCHESTRA_ART){const[x,y,w,h]=a.orchestraThumb,c=makeCanvas(w,h);c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);thumbMap.set(a.id,c)}}\n");
 fs.writeFileSync(path.join(root,'art-source/orchestra/manifest.json'),JSON.stringify(entries,null,2)+'\n');
 console.log(JSON.stringify({pieces:entries.length,preparedBytes:total,previewBytes:preview.length*.75}));
})().catch(e=>{console.error(e);process.exitCode=1});
