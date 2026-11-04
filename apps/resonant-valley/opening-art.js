import {recordSharingEnabled} from './record-sharing.js';
import * as THREE from './vendor/three.module.min.js';
import {SLEEVE_PALETTE, makeSleeve, sleeveBytes, sleeveFor, validSleeve} from './record-sleeve.js';

const ink='#24253f',plum='#44405c',violet='#96859d',peach='#f7dcb2',coral='#e77b62',gold='#ebb06b';
const glyphs={
 O:['0111110','1100011','1100011','1100011','1100011','1100011','1100011','1100011','0111110'],
 P:['1111110','1100011','1100011','1100011','1111110','1100000','1100000','1100000','1100000'],
 E:['1111111','1100000','1100000','1100000','1111110','1100000','1100000','1100000','1111111'],
 N:['1100011','1110011','1110011','1111011','1101111','1101111','1100111','1100111','1100011'],
 I:['1111','0110','0110','0110','0110','0110','0110','0110','1111'],
 G:['0111110','1100011','1100000','1100000','1101111','1100011','1100011','1100011','0111111'],
 H:['1100011','1100011','1100011','1100011','1111111','1100011','1100011','1100011','1100011'],
 T:['1111111','1111111','0011100','0011100','0011100','0011100','0011100','0011100','0011100']
};

function poly(c,color,points){
 c.fillStyle=color;c.beginPath();c.moveTo(points[0][0],points[0][1]);
 for(const [x,y] of points.slice(1))c.lineTo(x,y);
 c.closePath();c.fill();
}
function disc(c,x,y,r,color){
 c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
}
function arc(c,x,y,r,a,b,color,width){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,a,b);c.stroke();
}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function star(c,x,y,size,color){
 poly(c,color,[[x,y-size],[x+size*.22,y-size*.25],[x+size,y],[x+size*.22,y+size*.21],[x,y+size],[x-size*.21,y+size*.21],[x-size,y],[x-size*.21,y-size*.25]]);
}
function masthead(c,word,x,y,w,h,color){
 const units=[...word].reduce((sum,ch)=>sum+glyphs[ch][0].length+1,-1);
 const dx=w/units,dy=h/9;
 for(const ch of word){
  const bits=glyphs[ch];
  for(let row=0;row<bits.length;row++){
   for(let col=0;col<bits[row].length;){
    if(bits[row][col]==='0'){col++;continue;}
    const start=col++;
    while(bits[row][col]==='1')col++;
    rect(c,Math.round(x+start*dx),Math.round(y+row*dy),Math.round(x+col*dx)-Math.round(x+start*dx),Math.round(y+(row+1)*dy)-Math.round(y+row*dy),color);
   }
  }
  x+=(bits[0].length+1)*dx;
 }
}
function seedOf(text){
 let n=2166136261;
 for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);
 return n>>>0;
}
function clean(value,fallback){
 const s=String(value??'').replace(/[\u0000-\u001f\u007f-\u009f]+/g,' ').replace(/\s+/g,' ').trim();
 return Array.from(s||fallback).slice(0,100).join('');
}
function dateLabel(value){
 if(value==null||value==='')return '';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return clean(value,'');
 return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date).toUpperCase();
}
function tracking(c,text,x,y,gap,color){
 c.fillStyle=color;
 for(const ch of text){c.fillText(ch,x,y);x+=c.measureText(ch).width+gap;}
}
function fit(c,text,maxSize,minSize,width,family){
 for(let size=maxSize;size>=minSize;size--){c.font='bold '+size+'px '+family;if(c.measureText(text).width<=width)break;}
}
// Keep long student titles readable, including names without spaces.
function wrap(c,text,width){
 const lines=[];let line='';
 for(const word of text.split(' ')){
  if(line&&c.measureText(line+' '+word).width<=width){line+=' '+word;continue;}
  if(line){lines.push(line);line='';}
  for(const ch of word){
   if(line&&c.measureText(line+ch).width>width){lines.push(line);line='';}
   line+=ch;
  }
 }
 if(line)lines.push(line);return lines;
}

function landscape(c){
 c.save();c.beginPath();c.rect(40,80,688,351);c.clip();
 rect(c,40,80,688,351,ink);
 // In the handbill the setting sun reads as a pressed record. Interrupted grooves
 // leave room for the mountains to silhouette against a quiet disc edge.
 disc(c,599,232,99,coral);
 for(const r of [93,88,82,75,67,54,46]){
  arc(c,599,232,r,-2.92,-.55,plum,2);
  arc(c,599,232,r,.12,1.95,plum,2);
 }
 disc(c,599,232,29,peach);disc(c,599,232,9,plum);disc(c,599,232,3,gold);
 for(const [x,y,s] of [[489,111,7],[691,114,5],[469,242,5],[706,207,4],[523,132,3],[95,332,4],[418,336,3]])star(c,x,y,s,peach);
 for(const [x,y] of [[459,149],[679,91],[499,206],[457,301],[713,172],[662,114],[526,108],[113,315],[402,342]])rect(c,x,y,3,3,violet);
 masthead(c,'OPENING',59,115,363,68,coral);
 masthead(c,'OPENING',55,111,363,68,peach);
 masthead(c,'NIGHT',61,201,396,101,plum);
 masthead(c,'NIGHT',55,196,396,101,gold);
 poly(c,violet,[[40,352],[78,342],[112,341],[125,332],[173,332],[201,341],[261,342],[290,336],[347,337],[372,326],[404,325],[423,313],[449,312],[462,299],[489,299],[508,274],[539,274],[551,266],[569,266],[578,252],[625,252],[638,268],[654,269],[677,285],[728,278],[728,431],[40,431]]);
 poly(c,plum,[[40,360],[71,352],[125,351],[147,343],[176,343],[194,351],[226,351],[246,342],[265,342],[282,329],[320,329],[337,347],[369,344],[405,338],[445,316],[462,316],[468,310],[502,310],[517,294],[546,295],[548,284],[562,284],[574,306],[610,309],[637,298],[650,286],[681,285],[692,306],[728,308],[728,431],[40,431]]);
 poly(c,coral,[[40,382],[112,369],[169,371],[201,355],[234,354],[241,347],[285,347],[298,362],[335,364],[361,358],[418,359],[451,347],[486,347],[540,336],[566,338],[585,330],[639,331],[663,322],[695,321],[728,315],[728,431],[40,431]]);
 // Terraced cuts and printmakers' hatch marks give the mesas scale without a gradient.
 for(const [x,y,w] of [[566,277,16],[581,266,28],[581,272,16],[518,286,18],[652,302,13],[619,320,8],[228,360,33],[240,365,15],[465,327,22]])rect(c,x,y,w,2,peach);
 poly(c,ink,[[40,378],[84,380],[125,370],[145,371],[159,366],[193,368],[222,383],[271,387],[314,380],[354,383],[381,376],[428,377],[473,365],[506,368],[533,358],[573,361],[613,356],[657,364],[701,350],[728,351],[728,431],[40,431]]);
 // A pair of rails sweeps from the foreground toward the distant valley.
 poly(c,gold,[[133,431],[218,403],[301,388],[380,379],[316,391],[237,407],[177,431]]);
 poly(c,peach,[[226,431],[274,408],[339,389],[387,380],[355,389],[295,410],[266,431]]);
 for(const [x1,x2,y] of [[202,263,415],[245,288,404],[278,309,397],[308,330,391]])poly(c,coral,[[x1,y],[x2,y+2],[x2-5,y+4],[x1-6,y+2]]);
 for(const [x,y,w] of [[50,393,57],[103,397,26],[407,388,64],[442,393,61],[514,383,47],[638,378,35],[647,382,40],[558,398,72]])rect(c,x,y,w,2,plum);
 c.restore();
}

export function drawOpeningPoster(canvas,bill){
 const records=bill?.records;
 if(!Array.isArray(records)||records.length!==3)throw new Error('Opening Night needs three record sleeves.');
 const artist=clean(bill.artist,'Valley musician'),venue=clean(bill.venue,'The listening room'),date=dateLabel(bill.date);
 const albums=records.map(r=>({title:clean(r.title??r.song?.title,'Untitled piece'),sleeve:sleeveFor(r)}));
 const hash=seedOf(JSON.stringify([artist,venue,date,albums]));
 canvas.width=768;canvas.height=1024;
 canvas.setAttribute?.('role','img');
 canvas.setAttribute?.('aria-label','Opening Night at '+venue+' with '+artist+'. '+date+'. '+albums.map(a=>a.title).join('. ')+'.');
 const c=canvas.getContext('2d');
 c.imageSmoothingEnabled=false;
 rect(c,0,0,768,1024,peach);rect(c,22,22,724,980,ink);rect(c,25,25,718,974,peach);
 c.font='bold 16px monospace';c.textBaseline='alphabetic';c.textAlign='left';
 star(c,54,53,8,coral);tracking(c,'RESONANT VALLEY',72,58,2,ink);
 c.textAlign='right';c.fillStyle=ink;c.fillText(date,713,58,222);c.textAlign='left';
 landscape(c);
 rect(c,40,435,688,4,coral);
 c.font='bold 15px monospace';tracking(c,'A LISTENING SESSION WITH',55,476,1.5,plum);
 fit(c,artist,53,23,656,'Georgia, serif');c.fillStyle=ink;c.fillText(artist,52,535,659);
 c.font='italic 24px Georgia, serif';c.fillStyle=plum;c.fillText('at',55,574);
 fit(c,venue,30,18,615,'Georgia, serif');c.fillStyle=ink;c.fillText(venue,86,574,626);
 rect(c,52,595,664,3,ink);
 c.font='bold 15px monospace';tracking(c,'ON THE TURNTABLE',54,621,1.6,plum);
 // Put the paper texture beneath the sleeves so their twelve palette inks stay exact.
 let state=hash||1;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 c.save();c.globalAlpha=.10;
 for(let i=0;i<4200;i++){
  const x=28+Math.floor(random()*712),y=28+Math.floor(random()*968);
  rect(c,x,y,random()<.28?2:1,1,y>=80&&y<431?peach:plum);
 }
 c.restore();
 const width=192;
 albums.forEach((album,i)=>{
  const x=56+i*229,y=639;
  rect(c,x+3,y+4,width+4,width+4,coral);rect(c,x-2,y-2,width+4,width+4,ink);
  for(let row=0;row<16;row++)for(let col=0;col<16;col++){
   const color=SLEEVE_PALETTE[parseInt(album.sleeve[row*16+col],16)][1];
   rect(c,x+col*12,y+row*12,12,12,color);
  }
  rect(c,x,y+211,26,19,ink);c.font='bold 13px monospace';c.fillStyle=peach;c.textAlign='center';c.fillText('0'+(i+1),x+13,y+225);c.textAlign='left';
  rect(c,x+36,y+220,width-37,1,plum);
  let lines=[],size=23;
  for(;size>=10;size--){c.font='bold '+size+'px Georgia, serif';lines=wrap(c,album.title,196);if(lines.length*(size+3)<=85)break;}
  c.fillStyle=ink;
  for(let n=0;n<lines.length;n++)c.fillText(lines[n],x,y+238+size+n*(size+3),196);
 });
 rect(c,52,965,664,2,ink);
 c.font='bold 12px monospace';tracking(c,'RV  /  '+hash.toString(16).slice(-5).toUpperCase(),54,985,1.3,plum);
 for(const x of [665,681,697]){disc(c,x,981,5,plum);disc(c,x,981,1.5,peach);}
 return canvas;
}

const smallType={
 A:['010','101','111','101','101'],C:['111','100','100','100','111'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],
 G:['111','100','101','101','111'],H:['101','101','111','101','101'],I:['1','1','1','1','1'],N:['1001','1101','1011','1001','1001'],
 O:['111','101','101','101','111'],P:['111','101','111','100','100'],R:['110','101','110','101','101'],
 S:['111','100','111','001','111'],T:['111','010','010','010','010'],X:['101','101','010','101','101']
};
function pixelSheet(width,height){
 const bytes=new Uint8Array(width*height*4),colors=new Map();
 const fill=(x,y,w,h,hex)=>{
  if(!colors.has(hex)){const n=parseInt(hex.slice(1),16);colors.set(hex,[n>>16,n>>8&255,n&255,255]);}
  const rgba=colors.get(hex);
  for(let j=Math.max(0,y);j<Math.min(height,y+h);j++)for(let i=Math.max(0,x);i<Math.min(width,x+w);i++)bytes.set(rgba,(j*width+i)*4);
 };
 const word=(text,x,y,color)=>{
  for(const ch of text){const rows=smallType[ch];rows.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==='1')fill(x+i,y+j,1,1,color);});x+=rows[0].length+1;}
 };
 return {bytes,fill,word};
}
// Pixels use ordinary top-to-bottom image order.
export function gigPosterPixels(bill=null){
 const {bytes,fill,word}=pixelSheet(32,44);fill(0,0,32,44,peach);fill(1,1,30,42,ink);
 fill(2,2,28,40,peach);fill(3,3,26,24,ink);
 word('OPENING',3,5,peach);word('NIGHT',4,12,gold);
 for(const [x,y,w] of [[23,13,3],[22,14,5],[21,15,7],[21,16,7],[21,17,7],[22,18,5],[23,19,3]])fill(x,y,w,1,coral);
 fill(24,16,1,1,peach);
 for(const [x,y,w] of [[3,23,5],[8,21,4],[12,22,7],[19,21,4],[23,19,4],[27,20,2]])fill(x,y,w,27-y,violet);
 fill(3,25,26,2,coral);fill(5,24,6,2,plum);fill(17,23,5,3,plum);fill(25,23,4,3,plum);
 fill(3,28,26,1,plum);
 const swatches=[[plum,peach,coral],[violet,ink,gold],[coral,peach,plum]];
 for(let i=0;i<3;i++){
  const x=3+i*9,art=bill?.records?.[i]?.sleeve;fill(x,30,8,8,ink);
  if(validSleeve(art)){for(let row=0;row<6;row++)for(let col=0;col<6;col++)fill(x+1+col,31+row,1,1,SLEEVE_PALETTE[parseInt(art[Math.floor(row*16/6)*16+Math.floor(col*16/6)],16)][1]);}
  else {const [base,light,accent]=swatches[i];fill(x+1,31,6,6,base);fill(x+2,32,4,2,light);fill(x+3,33,2,3,accent);}
  fill(x,39,7,1,plum);
 }
 return bytes;
}
function stationPlate(){
 const {bytes,fill,word}=pixelSheet(48,13);
 fill(0,0,48,13,plum);fill(1,1,46,11,gold);fill(2,2,44,9,ink);
 fill(4,5,5,3,coral);fill(5,4,3,5,coral);fill(6,6,1,1,peach);
 word(recordSharingEnabled?'EXCHANGE':'RECORDS',recordSharingEnabled?11:13,4,peach);return bytes;
}
function printFace(group,bytes,dimensions,dimensions3D,pos){
 const [width,height]=dimensions;
 const stride=width*4,flipped=new Uint8Array(bytes.length);
 for(let y=0;y<height;y++)flipped.set(bytes.subarray(y*stride,(y+1)*stride),(height-1-y)*stride);
 const t=new THREE.DataTexture(flipped,width,height,THREE.RGBAFormat);
 t.minFilter=t.magFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...dimensions3D),new THREE.MeshLambertMaterial({map:t}));
 mesh.position.set(...pos);mesh.receiveShadow=true;mesh.userData.ownedSleeveTexture=t;group.add(mesh);
}

export function buildOpeningFurniture(e,group,box){
 if(e.type==='gigPoster'){
  box(.72,.93,.048,0,.54,-.45,'#734f47');
  printFace(group,gigPosterPixels(e.bill),[32,44],[.67,.89],[0,.54,-.423]);
  for(const x of [-.286,.286])box(.025,.025,.014,x,.945,-.414,gold);
 }
 if(e.type!=='exchangeCrate')return;
 const oak='#a77b57',wood='#745649',metal='#3d4055';
 for(const side of [-1,1]){
  box(.09,1.77,.11,side*.37,.885,-.25,wood);
  box(.09,.66,.11,side*.37,.33,.25,wood);
 }
 box(.84,.07,.68,0,.67,0,oak);box(.78,.055,.6,0,.723,0,wood);
 for(const x of [-.38,.38])box(.063,.30,.61,x,.86,0,oak);
 for(const z of [-.285,.285]){box(.76,.085,.047,0,.77,z,wood);box(.76,.09,.047,0,.93,z,oak);}
 // Three paper jackets above the slats make this read as a record bin.
 for(const [x,z,height,col] of [[-.12,-.14,.46,'#b5a3bc'],[.10,-.052,.45,'#eab376'],[-.045,.052,.48,'#db8871']]){
  box(.44,height,.027,x,.78+height/2,z,col);
 }
 printFace(group,sleeveBytes(makeSleeve('Depot',1)),[16,16],[.4,.40],[-.045,1.03,.067]);
 box(.89,.255,.064,0,1.58,-.15,wood);
 printFace(group,stationPlate(),[48,13],[.845,.22],[0,1.58,-.115]);
 const roof=box(1.04,.083,.87,0,1.78,0,metal);roof.rotation.x=-.12;
 for(const x of [-.38,-.19,0,.19,.38]){const rib=box(.021,.018,.86,x,1.832,.003,'#60647c');rib.rotation.x=-.12;}
 box(1.05,.086,.045,0,1.831,.421,coral);box(.85,.053,.11,0,.47,-.25,wood);
}
