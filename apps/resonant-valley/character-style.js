// Original 16-pixel outfits shared by the world model and wardrobe portraits.
export const SKINS=[
 {id:'trail',name:'Trail Explorer',note:'Cobalt jacket · amber scarf',shirt:'#467ec5',shade:'#315a94',accent:'#f2b552',pants:'#485a73',boots:'#39404e',hair:'#51382e',pack:'#b47c46',style:'jacket'},
 {id:'grove',name:'Grove Ranger',note:'Forest vest · canvas pack',shirt:'#5b9564',shade:'#396b4a',accent:'#e6c78a',pants:'#9a8057',boots:'#4a3933',hair:'#342820',pack:'#c09c65',style:'vest'},
 {id:'studio',name:'Studio DJ',note:'Violet hoodie · headphones',shirt:'#9866c4',shade:'#624385',accent:'#76d9e5',pants:'#3a4864',boots:'#d2d9eb',hair:'#2f283a',pack:'#533e72',style:'headphones'},
 {id:'sunset',name:'Sunset Skater',note:'Coral stripes · blue denim',shirt:'#dc765e',shade:'#a54644',accent:'#ffe2a0',pants:'#466c91',boots:'#e6dbbf',hair:'#754735',pack:'#c18a4b',style:'stripes'},
 {id:'glacier',name:'Glacier Scout',note:'Teal parka · snow cap',shirt:'#4cabb1',shade:'#307480',accent:'#e2f0e8',pants:'#4b607c',boots:'#354052',hair:'#484347',pack:'#d1a365',style:'cap'},
 {id:'night',name:'Night Producer',note:'Midnight suit · lime accents',shirt:'#3b4965',shade:'#253149',accent:'#c4e77a',pants:'#303d55',boots:'#6a5890',hair:'#282839',pack:'#66548e',style:'equalizer'}
];
export const SKIN_TONES=[
 {id:'light',name:'Light',color:'#f2c8a9',shade:'#d39a7d'},
 {id:'peach',name:'Peach',color:'#e7ad87',shade:'#bd7d5d'},
 {id:'warm',name:'Warm',color:'#cc956b',shade:'#a36b48'},
 {id:'olive',name:'Olive',color:'#b58b60',shade:'#8b6346'},
 {id:'brown',name:'Brown',color:'#966345',shade:'#704532'},
 {id:'deep',name:'Deep',color:'#684637',shade:'#493126'}
];
export function characterSettings(value={}){
 return {skin:SKINS.some(s=>s.id===value?.skin)?value.skin:'trail',tone:SKIN_TONES.some(t=>t.id===value?.tone)?value.tone:'warm',view:value?.view==='third'?'third':'first'};
}
export const characterPalette=value=>{const s=characterSettings(value);return {...SKINS.find(x=>x.id===s.skin),skin:SKIN_TONES.find(x=>x.id===s.tone)};};
export const AVATAR_PARTS=['head','body','arm','leg','pack'];
// Face order matches BoxGeometry (+X, -X, +Y, -Y, +Z, -Z).
export function paintCharacterFace(ctx,x,y,part,face,p){
 const r=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x+a,y+b,w,h);},front=face===5,back=face===4;
 const base=part==='head'?p.skin.color:part==='leg'?p.pants:part==='pack'?p.pack:p.shirt;
 r(0,0,16,16,base);
 if(face===3){r(0,0,16,16,part==='head'?p.skin.shade:p.shade);return;}
 if(part==='head'){
  r(0,0,16,4,p.hair);if(back||face===2)r(0,0,16,16,p.hair);
  if(front){r(0,3,3,4,p.hair);r(11,3,5,2,p.hair);r(3,8,3,2,'#fff2df');r(10,8,3,2,'#fff2df');r(4,8,2,2,'#253340');r(10,8,2,2,'#253340');r(7,10,2,2,p.skin.shade);r(6,13,4,1,p.skin.shade);}
  if(!front&&!back&&face!==2){r(0,3,6,6,p.hair);r(7,8,3,3,p.skin.shade);}
  if(p.style==='cap'){if(face===2)r(0,0,16,16,p.accent);else{r(0,0,16,4,p.accent);r(0,4,16,1,p.shade);}}
  if(p.style==='headphones'){if(face===2)r(6,0,4,16,p.accent);else if(face<2){r(6,0,4,8,p.accent);r(4,7,8,7,p.shade);r(6,8,4,4,p.accent);}}
  return;
 }
 // Sparse stitching avoids large smooth faces without making noisy textures.
 r(1,1,1,14,p.shade);r(14,1,1,14,p.shade);
 if(part==='body'){
  r(0,0,16,2,p.shade);r(0,14,16,2,p.shade);
  if(front){r(6,0,4,2,p.skin.color);r(7,2,2,12,p.shade);r(2,8,4,4,p.shade);r(10,8,4,4,p.shade);r(3,8,2,1,p.accent);r(11,8,2,1,p.accent);}
  if(p.style==='jacket'&&front){r(4,1,8,2,p.accent);r(9,3,3,4,p.accent);}
  if(p.style==='vest'&&front){r(3,3,2,10,p.accent);r(11,3,2,10,p.accent);}
  if(p.style==='stripes'){r(0,5,16,2,p.accent);r(0,10,16,2,p.accent);}
  if((p.style==='headphones'||p.style==='equalizer')&&front){r(4,5,2,5,p.accent);r(7,3,2,7,p.accent);r(10,6,2,4,p.accent);}
  if(p.style==='cap'&&front){r(4,0,2,5,p.accent);r(10,0,2,5,p.accent);}
  if(back){r(3,0,2,14,p.pack);r(11,0,2,14,p.pack);}
 }else if(part==='arm'){
  r(0,10,16,2,p.accent);r(0,12,16,4,p.skin.color);r(0,15,16,1,p.skin.shade);
 }else if(part==='leg'){
  r(0,12,16,4,p.boots);r(0,15,16,1,p.shade);if(front){r(3,3,2,6,p.shade);r(3,12,10,1,p.accent);}
 }else if(part==='pack'){
  r(1,1,14,2,p.accent);r(2,8,12,6,p.shade);r(6,7,4,3,p.accent);
 }
}
export function paintCharacterAtlas(canvas,value){
 canvas.width=96;canvas.height=80;const ctx=canvas.getContext('2d'),p=characterPalette(value);
 AVATAR_PARTS.forEach((part,row)=>{for(let face=0;face<6;face++)paintCharacterFace(ctx,face*16,row*16,part,face,p);});
}
export function paintCharacterPortrait(canvas,value,{back=false}={}){
 canvas.width=64;canvas.height=84;const ctx=canvas.getContext('2d'),p=characterPalette(value),face=back?4:5;
 ctx.imageSmoothingEnabled=false;
 const tile=document.createElement('canvas');tile.width=tile.height=16;const tileCtx=tile.getContext('2d');
 const part=(name,x,y,w,h)=>{paintCharacterFace(tileCtx,0,0,name,face,p);ctx.drawImage(tile,x,y,w,h);};
 ctx.fillStyle='#102239';ctx.fillRect(11,78,42,3);ctx.fillRect(15,76,34,7);
 part('leg',22,48,9,28);part('leg',33,48,9,28);
 part('arm',12,28,9,25);part('arm',43,28,9,25);part('body',22,28,20,24);part('head',21,6,22,22);
 if(back)part('pack',24,31,16,18);
 if(p.style==='headphones'){ctx.fillStyle=p.accent;ctx.fillRect(19,13,3,9);ctx.fillRect(42,13,3,9);}
 if(p.style==='cap'){ctx.fillStyle=p.accent;ctx.fillRect(19,6,26,5);}
}
