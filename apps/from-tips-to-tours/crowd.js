// Original code-drawn pixel sprites. Every spectator faces the stage, away
// from the viewer. Sprite frames are cached; the camera and feet stay steady.
const SHIRTS=[['#386a82','#254151','#6299ab'],['#a75d65','#633a4f','#d38983'],['#668a66','#3b554c','#9db38a'],['#ae8952','#6e593f','#d7b777'],['#706494','#443f63','#a392bc'],['#bb7650','#724b3c','#e4a275']];
const SKINS=[['#d9a47e','#aa735b','#f1c8a0'],['#ad7558','#744c40','#d89c73'],['#815744','#503b37','#b8805e'],['#efc4a0','#bf8d73','#ffe0b9']];
const HAIR=[['#292338','#514054'],['#623f30','#a36e44'],['#b18b55','#e5bd7a'],['#282c35','#535868'],['#70524d','#b9836e'],['#a6a3b4','#d8cbd1']];
const OUTLINE='#14172a';

export function paintFan(c,variant,pose,frame,alien=false){
 const shirt=SHIRTS[variant%SHIRTS.length],skin=alien?['#76b29e','#426d69','#a4dbc1']:SKINS[(variant*3+Math.floor(variant/4))%SKINS.length],hair=HAIR[(variant*5+1)%HAIR.length];
 const p=(color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 const r=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const line=(color,points,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 // The two sleeves lead to elbows, wrists and hands, never detached blocks.
 const up=frame===1?-2:frame===3?2:0;
 const left=pose==='clap'?[[21,48],[11,30],[29+(frame%2?1:-3),9+up]]:pose==='wave'?[[21,48],[10,36],[8+frame*2,18+up]]:[[21,48],[12,64],[12,78]];
 const right=pose==='clap'?[[43,48],[53,30],[35-(frame%2?1:-3),9+up]]:pose==='phone'?[[43,48],[55,42],[53,26]]:pose==='wave'?[[43,48],[55,36],[56-frame,15-up]]:[[43,48],[51,64],[50,78]];
 for(const arm of [left,right]){
  line(OUTLINE,arm,9);line(skin[1],arm,6);line(skin[0],arm.map(([x,y])=>[x-1,y-1]),4);
  const [a,b]=arm;const sleeve=[a,[a[0]+(b[0]-a[0])*.58,a[1]+(b[1]-a[1])*.58]];
  line(shirt[1],sleeve,8);line(shirt[0],sleeve.map(([x,y])=>[x-1,y]),5);
  const [x,y]=arm[2];r(OUTLINE,x-3,y-4,7,8);r(skin[0],x-2,y-3,5,6);r(skin[2],x-2,y-3,2,3);
  if(pose==='wave'){r(OUTLINE,x-3,y-8,2,5);r(skin[0],x-2,y-7,1,4);r(OUTLINE,x+2,y-8,2,5);r(skin[2],x+2,y-7,1,4);}
 }
 // Tapered shoulders, jacket folds, waistband, separate legs and shoes.
 p(OUTLINE,[[22,42],[17,45],[15,55],[18,66],[17,80],[19,97],[29,97],[32,83],[35,97],[46,97],[47,79],[45,64],[48,54],[46,46],[40,42]]);
 p('#30354b',[[20,76],[43,76],[44,94],[36,94],[32,80],[28,94],[21,94]]);
 r('#494a60',21,79,3,14);r('#494a60',36,81,2,12);r('#151724',20,94,10,3);r('#151724',35,94,11,3);
 p(shirt[1],[[23,43],[18,47],[18,58],[21,65],[19,78],[44,78],[42,64],[45,54],[43,47],[39,43]]);
 p(shirt[0],[[24,43],[19,48],[20,57],[24,63],[23,75],[40,75],[41,61],[43,51],[39,45]]);
 line(shirt[2],[[21,49],[25,46],[39,47],[42,50]],2);
 r(shirt[2],23,55,1,12);r(shirt[1],35,59,2,12);r(shirt[1],27,73,12,2);
 if(variant%3===0){p(shirt[2],[[27,55],[36,55],[38,61],[32,67],[26,61]]);r(shirt[0],29,58,6,4);}
 if(variant%3===1){line(shirt[1],[[27,46],[27,52],[37,52],[39,47]],2);r(shirt[2],31,55,2,15);}
 // Neck and ears peek out beneath the back of the head. No front-facing face.
 r(OUTLINE,27,35,11,11);r(skin[1],29,36,7,9);r(skin[0],29,36,4,7);
 p(OUTLINE,[[24,21],[39,21],[43,26],[43,36],[39,41],[26,41],[22,37],[21,27]]);
 p(skin[1],[[25,24],[39,24],[41,29],[40,37],[36,40],[28,39],[24,34]]);
 r(skin[0],23,30,3,6);r(skin[0],39,30,3,6);r(skin[2],23,31,1,3);
 if(alien){
  p(skin[0],[[26,18],[38,18],[43,22],[45,29],[41,36],[36,39],[29,38],[23,33],[20,26],[22,21]]);
  p(skin[2],[[24,22],[27,20],[37,20],[40,22],[27,23],[23,28]]);
  line(skin[1],[[38,26],[39,33],[35,36]],2);
  if(variant%2){line(OUTLINE,[[26,21],[23,13]],3);line(OUTLINE,[[38,21],[41,13]],3);r('#d4b5ee',21,11,4,4);r('#d4b5ee',40,11,4,4);}
 }else{
  const style=variant%5;
  if(style===0){ // cropped curls
   p(hair[0],[[24,19],[28,17],[36,17],[40,20],[42,25],[41,31],[38,33],[37,37],[27,36],[24,31],[22,27]]);
   for(const [x,y]of [[25,21],[30,19],[35,21],[38,25],[27,27],[32,25]])r(hair[1],x,y,3,2);
  }else if(style===1){ // long hair, tucked behind one ear
   p(hair[0],[[25,19],[37,18],[42,23],[43,32],[41,42],[44,49],[37,51],[28,49],[24,44],[25,35],[22,29],[23,23]]);
   line(hair[1],[[27,23],[26,33],[30,45]],2);line(hair[1],[[36,21],[39,27],[37,42]],2);
  }else if(style===2){ // short hair and a ponytail
   p(hair[0],[[25,21],[30,18],[38,20],[42,25],[40,33],[36,36],[26,34],[23,29]]);
   p(hair[0],[[33,32],[38,33],[41,40],[39,49],[35,51],[36,43],[32,37]]);
   line(hair[1],[[27,23],[32,21],[38,24]],2);line(hair[1],[[36,37],[38,42],[36,48]],2);r('#dfa16e',33,34,6,3);
  }else if(style===3){ // soft cap, with visible back strap
   p(hair[0],[[24,23],[27,20],[37,20],[41,25],[40,34],[25,35]]);
   p(shirt[1],[[22,26],[24,20],[28,17],[37,17],[41,21],[43,28],[24,29]]);
   line(shirt[2],[[26,21],[29,19],[36,19],[39,22]],2);r('#dbba8c',28,27,10,2);r(OUTLINE,31,27,4,2);
  }else{ // rounded bun
   p(hair[0],[[24,23],[27,19],[37,19],[41,23],[42,30],[38,36],[27,36],[23,30]]);
   p(hair[0],[[29,15],[32,12],[37,14],[39,19],[35,23],[29,21]]);
   line(hair[1],[[27,24],[29,22],[37,23]],2);r(hair[1],32,15,3,2);r(hair[1],26,28,2,4);
  }
 }
 if(pose==='phone'){
  r(OUTLINE,48,11,11,17);r('#848199',49,12,9,14);r('#17223b',50,13,7,11);r('#9ed2d8',51,14,5,8);r('#354773',51,18,5,4);r('#ffc77d',53,16,2,4);r('#eee2c9',52,25,3,1);
 }
}

export function crowdLayout(venue,fans){
 const chapter=Math.floor(venue/6),count=Math.min(chapter<2?8:chapter<4?22:30,Math.floor(Math.log10(Math.max(0,fans)+1)*5));
 if(!count)return [];
 const people=[];
 // Spread a small street audience across the frame; larger shows gain a
 // second, staggered foreground row rather than piling people on one baseline.
 const backCount=Math.min(16,count);
 for(let i=0;i<count;i++){
  const front=i>=backCount,j=front?i-backCount:i,n=front?count-backCount:backCount;
  const x=42+(n===1?.25:j/(n-1))*598+(front?-10:0)+((i*17)%13-6);
  people.push({x:Math.round(x),bottom:front?423+(j%3)*3:405+(j%3)*4,height:front?112+(j%3)*3:101+(j%4)*3,variant:(i*5+Math.floor(i/12)*3)%12,seed:i,alien:chapter>=5&&i%4===1});
 }
 return people;
}

export class Audience {
 constructor(createCanvas=()=>document.createElement('canvas')){this.createCanvas=createCanvas;this.cache=new Map();}
 sprite(variant,pose,frame,alien){const key=[variant,pose,frame,alien].join(':');if(!this.cache.has(key)){const canvas=this.createCanvas();canvas.width=64;canvas.height=100;paintFan(canvas.getContext('2d'),variant,pose,frame,alien);this.cache.set(key,canvas);}return this.cache.get(key);}
 draw(c,venue,fans,time,motion,celebrating=false){
  for(const p of crowdLayout(venue,fans)){
   const pose=celebrating?(p.seed%2?'clap':'wave'):['wave','clap','rest','phone','rest','wave'][p.seed%6];
   const phase=motion?Math.floor(time*(pose==='clap'?3.4:2.1)+p.seed*1.7)%4:1;
   const sway=motion?Math.round(Math.sin(time*1.5+p.seed*2)*1):0;
   const bounce=motion&&pose!=='rest'?Math.round(Math.max(0,Math.sin(time*2.4+p.seed))*2):0;
   const width=Math.round(p.height*(.59+(p.seed%4)*.035));
   c.drawImage(this.sprite(p.variant,pose,phase,p.alien),Math.round(p.x-width/2+sway),p.bottom-p.height-bounce,width,p.height);
  }
 }
}
