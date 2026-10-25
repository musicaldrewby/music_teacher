'use strict';
const WARDROBE_OPTIONS={hat:['none','cap','beret','crown'],glasses:['none','round','square'],neck:['none','scarf','bowtie','tie'],vest:['none','felt']};
const WARDROBE_DEFAULT={hat:'none',glasses:'none',neck:'none',vest:'none',color:'#497d87',accent:'#ca6576'};
const WARDROBE_PRESETS={explorer:{hat:'cap',glasses:'none',neck:'scarf',vest:'felt',color:'#758259',accent:'#d69b53'},artist:{hat:'beret',glasses:'round',neck:'scarf',vest:'none',color:'#425d7b',accent:'#be5e68'},royal:{hat:'crown',glasses:'none',neck:'none',vest:'felt',color:'#83609b',accent:'#e3b849'},musician:{hat:'none',glasses:'square',neck:'bowtie',vest:'felt',color:'#39454e',accent:'#b65868'}};
function wardrobeValidate(o){if(o.wardrobe===undefined)return;const w=o.wardrobe;if(o.type!=='puppet'||!w||typeof w!=='object'||Array.isArray(w))throw Error('Wardrobe requires an acting character.');for(const [k,values]of Object.entries(WARDROBE_OPTIONS))if(w[k]!==undefined&&!values.includes(w[k]))throw Error('Invalid wardrobe '+k+'.');for(const k of ['color','accent'])if(w[k]!==undefined&&!/^#[0-9a-f]{6}$/i.test(w[k]))throw Error('Invalid wardrobe color.');for(const k of Object.keys(w))if(!Object.hasOwn(WARDROBE_DEFAULT,k))throw Error('Unknown wardrobe setting.');}
const wardrobeFabricCache=new Map();
function wardrobeFabric(color){if(wardrobeFabricCache.has(color))return wardrobeFabricCache.get(color);const c=makeCanvas(96,96),g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,96,96);let seed=73471;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};g.lineWidth=.65;for(let i=0;i<3300;i++){const x=rand()*96,y=rand()*96,a=rand()*Math.PI;g.strokeStyle=i%2?'#ffffff25':'#1b182521';g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*3,y+Math.sin(a)*3);g.stroke()}if(wardrobeFabricCache.size>32)wardrobeFabricCache.clear();wardrobeFabricCache.set(color,c);return c}
function wardrobeShape(g,path,color,stitch=false){g.save();g.fillStyle=g.createPattern(wardrobeFabric(color),'repeat');g.strokeStyle='#2b263c38';g.lineWidth=1.6;g.lineJoin='round';g.shadowColor='#231d2730';g.shadowBlur=2;g.shadowOffsetY=1.5;g.fill(path);g.stroke(path);g.shadowColor='transparent';if(stitch){g.setLineDash([2,4]);g.strokeStyle='#fff9dd88';g.lineWidth=1;g.stroke(path)}g.restore()}
function wardrobePath(d){return new Path2D(d)}
function wardrobeBody(g,o){if(!o.wardrobe)return;const w={...WARDROBE_DEFAULT,...o.wardrobe};
 if(w.vest==='felt'){
  wardrobeShape(g,wardrobePath('M -43 -24 L -60 -13 Q -40 27 -56 67 L -56 113 L -8 106 L -8 33 L -23 -17 Z'),w.color,true);
  wardrobeShape(g,wardrobePath('M 43 -24 L 60 -13 Q 40 27 56 67 L 56 113 L 8 106 L 8 33 L 23 -17 Z'),w.color,true);
  for(const y of [44,69,94]){g.fillStyle=w.accent;g.beginPath();g.arc(17,y,3,0,Math.PI*2);g.fill()}
 }
 if(w.neck==='scarf'){
  wardrobeShape(g,wardrobePath('M -12 -25 Q 7 -15 18 -6 L 40 80 L 14 88 L -5 4 Z'),w.accent,true);
  wardrobeShape(g,wardrobePath('M -26 -27 Q -2 -12 28 -27 L 23 -5 Q 0 7 -25 -7 Z'),w.accent);
  g.save();g.strokeStyle=w.accent;g.lineWidth=2;for(let x=15;x<=37;x+=4){g.beginPath();g.moveTo(x,85-(x-15)*.3);g.lineTo(x+3,94-(x-15)*.3);g.stroke()}g.restore();
 }else if(w.neck==='bowtie'){
  wardrobeShape(g,wardrobePath('M -4 -12 L -32 -26 Q -38 -12 -30 2 L -4 -5 Z M 4 -12 L 32 -26 Q 38 -12 30 2 L 4 -5 Z'),w.accent);
  wardrobeShape(g,wardrobePath('M -6 -17 L 6 -17 L 7 -3 L -7 -3 Z'),w.accent);
 }else if(w.neck==='tie')wardrobeShape(g,wardrobePath('M -11 -25 L 11 -25 L 6 -10 L 17 56 L 0 74 L -17 56 L -6 -10 Z'),w.accent,true);
}
function wardrobeHead(g,o,face){if(!o.wardrobe)return;const w={...WARDROBE_DEFAULT,...o.wardrobe};
 // Painted in the head's own transform: no separate floating accessories.
 if(w.hat==='cap'){
  wardrobeShape(g,wardrobePath('M -90 -183 Q -83 -233 -12 -235 Q 64 -237 85 -184 Q 1 -166 -90 -183 Z'),w.color,true);
  wardrobeShape(g,wardrobePath('M -8 -182 Q 48 -201 99 -182 Q 117 -171 85 -168 L -8 -173 Z'),w.color);
 }else if(w.hat==='beret'){
  wardrobeShape(g,wardrobePath('M -93 -199 Q -106 -229 -51 -239 Q 24 -251 89 -225 Q 117 -204 69 -188 Q -5 -177 -93 -199 Z'),w.color);
  wardrobeShape(g,wardrobePath('M -70 -193 Q -5 -179 66 -191 L 65 -181 Q -7 -168 -72 -184 Z'),w.color,true);
 }else if(w.hat==='crown'){
  wardrobeShape(g,wardrobePath('M -77 -182 L -89 -231 L -46 -211 L -4 -244 L 34 -211 L 81 -233 L 72 -182 Q -4 -164 -77 -182 Z'),w.accent,true);
  for(const x of [-44,0,43]){const d=new Path2D();d.ellipse(x,-190,5,7,0,0,Math.PI*2);wardrobeShape(g,d,w.color)}
 }
 if(w.glasses!=='none'){
  const y=face.y,x=face.x,gap=face.eyeGap||37;g.save();g.strokeStyle='#283038';g.lineWidth=4;g.lineJoin='round';g.beginPath();
  for(const d of [-1,1]){const cx=x+d*gap;if(w.glasses==='round'){g.moveTo(cx+20,y);g.ellipse(cx,y,20,19,0,0,Math.PI*2)}else g.roundRect(cx-22,y-17,44,34,9)}
  g.moveTo(x-gap+21,y-2);g.quadraticCurveTo(x,y-12,x+gap-21,y-2);g.moveTo(x-gap-21,y-3);g.lineTo(x-gap-34,y-9);g.moveTo(x+gap+21,y-3);g.lineTo(x+gap+34,y-9);g.stroke();g.restore();
 }
}
let wardrobeReady=false;
function wardrobeSync(){if(!wardrobeReady)return;const o=cinemaActor();$('wardrobePanel').hidden=!o;const w={...WARDROBE_DEFAULT,...o?.wardrobe};for(const k of Object.keys(w)){const el=$('wardrobe'+k[0].toUpperCase()+k.slice(1));if(document.activeElement!==el)el.value=w[k]}
 const busy=!o||o.locked||directorAgentBusy||talkUIBusy||exportJob||animRun||storyPlayback||presenting;for(const el of document.querySelectorAll('#wardrobePanel input, #wardrobePanel select, #wardrobePanel button'))el.disabled=!!busy;
}
function wardrobeEdit(value){const o=cinemaActor();if(!o||o.locked||directorAgentBusy||talkUIBusy||exportJob||animRun||storyPlayback||presenting)return;cinemaEdit(()=>{if(value===null)delete o.wardrobe;else{o.wardrobe=copy(value);wardrobeValidate(o)}puppetFrames.clear()});$('wardrobePreset').value='';}
function wardrobeInit(){wardrobeReady=true;for(const k of Object.keys(WARDROBE_DEFAULT))$('wardrobe'+k[0].toUpperCase()+k.slice(1)).onchange=()=>{const w={};for(const k of Object.keys(WARDROBE_DEFAULT))w[k]=$('wardrobe'+k[0].toUpperCase()+k.slice(1)).value;wardrobeEdit(w)};$('wardrobePreset').onchange=()=>{const w=WARDROBE_PRESETS[$('wardrobePreset').value];if(w)wardrobeEdit(w)};$('wardrobeReset').onclick=()=>wardrobeEdit(null);wardrobeSync()}
window.FeltWardrobe={init:wardrobeInit,sync:wardrobeSync};
