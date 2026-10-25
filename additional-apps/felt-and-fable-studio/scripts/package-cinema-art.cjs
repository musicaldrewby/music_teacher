const artFs=require('fs'),artPath=require('path');artFs.mkdirSync(artPath.resolve(__dirname,'../public/assets/prepared'),{recursive:true});
const fs=require('fs'),path=require('path'),vm=require('vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'public');
const original=JSON.parse(fs.readFileSync(path.join(dist,'assets/catalog.js'),'utf8').split('=').slice(1).join('=').replace(/;\s*$/,''));
const dirs=['manor-home','train-stage','space-seaside','foreground','puppets'];
const manifest=dirs.flatMap(d=>JSON.parse(fs.readFileSync(path.join(root,'art-source',d,'manifest.json'),'utf8')));
const thumbSheet=createCanvas(1536,Math.ceil(manifest.length/8)*128),tg=thumbSheet.getContext('2d'),entries=[];
const puppetContext={Map,Math,JSON,makeCanvas:createCanvas,artById:new Map(),imageMap:new Map(),cinemaActingAt:(o)=>({...o.acting,phase:0,mouth:0,blink:false})};vm.createContext(puppetContext);vm.runInContext(fs.readFileSync(path.join(dist,'js/cinema-characters.js'),'utf8'),puppetContext);
(async()=>{let bg=original.backgrounds.length,totalBytes=0;
 for(let i=0;i<manifest.length;i++){
  const m=manifest[i],artPath=m.renderPath||m.path,source=path.resolve(root,artPath.startsWith('art-source/')||artPath.startsWith('public/')?artPath:'public/'+artPath),im=await loadImage(source);const puppet=m.kind==='puppet-atlas',isBg=m.kind==='background',isForeground=m.theme==='foreground';
  const id=isBg?'bg'+bg++:'cinema-'+m.slug;const c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const bytes=c.encodeSync('webp',isBg?93:97),data='data:image/webp;base64,'+bytes.toString('base64');const prepared='assets/prepared/'+id+(puppet&&m.rigVersion?'-rig'+m.rigVersion:'')+'.js';fs.writeFileSync(path.join(dist,prepared),'FELT_DATA['+JSON.stringify(id)+']='+JSON.stringify(data)+';\n');totalBytes+=bytes.length;
  const entry={id,name:m.name+(puppet?' · actor':''),category:puppet?'cast':isBg?m.theme:isForeground?'foreground':'props',themes:[m.theme],tags:m.name+' cinematic movie '+m.theme,cinema:true,prepared,preparedSize:[im.width,im.height],cinemaThumb:[i%8*192,Math.floor(i/8)*128,isBg||isForeground?184:104,104],defaultWidth:isForeground?1600:230};
  if(isBg)entry.fullBleed=true;if(isForeground)entry.foreground=true;
  let preview=im;
  if(puppet){entry.puppet={rigVersion:m.rigVersion||1,parts:m.parts,skin:m.skin,face:{x:0,y:-87,eyeGap:34}};puppetContext.artById.set(id,entry);puppetContext.imageMap.set(id,im);preview=createCanvas(460,500);puppetContext.previewG=preview.getContext('2d');puppetContext.previewO={asset:id,acting:{expression:'happy',pose:'standing',talk:false,phase:0,mouth:0,blink:false}};vm.runInContext('cinemaDrawPuppet(previewG,previewO)',puppetContext)}
  const [x,y,w,h]=entry.cinemaThumb,f=Math.min(w/preview.width,h/preview.height);tg.drawImage(preview,x+(w-preview.width*f)/2,y+(h-preview.height*f)/2,preview.width*f,preview.height*f);entries.push(entry);
 }
 const payload=thumbSheet.encodeSync('webp',92).toString('base64');
 const js="'use strict';\n// New assets load on demand; this sheet is only for collection previews.\nconst CINEMA_ART="+JSON.stringify(entries)+";\nfor(const a of CINEMA_ART)(a.id.startsWith('bg')?ART.backgrounds:ART.pieces).push(a);\nconst CINEMA_PREVIEWS='data:image/webp;base64,"+payload+"';\nasync function loadCinemaThumbnails(){const im=new Image();im.src=CINEMA_PREVIEWS;await im.decode();for(const a of CINEMA_ART){const [x,y,w,h]=a.cinemaThumb,c=makeCanvas(w,h);c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);thumbMap.set(a.id,c)}}\n";
 fs.writeFileSync(path.join(dist,'assets/cinema-catalog.js'),js);
 fs.writeFileSync(path.join(root,'art-source/cinema-index.json'),JSON.stringify(entries,null,2)+'\n');
 console.log(JSON.stringify({backgrounds:entries.filter(a=>a.id.startsWith('bg')).length,pieces:entries.filter(a=>!a.id.startsWith('bg')).length,preparedImageBytes:totalBytes,previewBytes:payload.length*.75}));
 const contact=createCanvas(4*350,550),g=contact.getContext('2d');g.fillStyle='#f3efe3';g.fillRect(0,0,contact.width,contact.height);for(let i=0;i<4;i++){const a=entries.filter(a=>a.puppet)[i];g.save();g.translate(i*350+30,20);g.scale(.8,.8);puppetContext.previewG=g;puppetContext.previewO={asset:a.id,acting:{expression:['happy','worried','surprised','sad'][i],pose:['standing','waving','pointing','sitting'][i],phase:.8,mouth:0,blink:false}};vm.runInContext('cinemaDrawPuppet(previewG,previewO)',puppetContext);g.restore();g.fillStyle='#23473d';g.font='22px sans-serif';g.fillText(a.name,i*350+100,530)}fs.writeFileSync('/workspace/scratch/ce7361a185e7/cast-check.png',contact.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1});
