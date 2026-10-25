(function(root){
 'use strict';
 const W=1920,H=1080,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},noise=i=>{const n=Math.sin(i*78.233+12.891)*43758.5453;return n-Math.floor(n);};
 const surfaces=new Map(),sandCache=new Map();
 function surface(key){if(!surfaces.has(key)){const a=api.createCanvas?api.createCanvas(W,H):typeof root.OffscreenCanvas!=='undefined'?new root.OffscreenCanvas(W,H):root.document.createElement('canvas');a.width=W;a.height=H;surfaces.set(key,a);}return surfaces.get(key);}
 function snapshot(key,draw){const a=surface(key),c=a.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);draw(c);return a;}
 function wrap(c,value,width,size){
  c.font='700 '+size+'px UkeIsland, Georgia, serif';const result=[];let line='';
  for(const word of String(value).split(/\s+/)){if(c.measureText(word).width>width){if(line){result.push(line);line='';}for(const char of word){if(c.measureText(line+char).width>width){result.push(line);line='';}line+=char;}continue;}const next=line?line+' '+word:word;if(line&&c.measureText(next).width>width){result.push(line);line=word;}else line=next;}if(line)result.push(line);return result;
 }
 function title(c,value,box,elapsed=10,animate=true){
  let size=box.size||126,list;do{list=wrap(c,value,box.w-30,size);if(list.length*size*1.22<=box.h)break;size-=2;}while(size>24);
  c.save();c.font='700 '+size+'px UkeIsland, Georgia, serif';c.textBaseline='middle';c.textAlign='left';c.lineJoin='round';let index=0;
  for(let row=0;row<list.length;row++){
   const line=list[row],width=c.measureText(line).width,x=box.align==='left'?box.x:box.x+(box.w-width)/2,y=box.y+box.h/2+(row-(list.length-1)/2)*size*1.22;
   let prefix='';for(const char of line){const offset=c.measureText(prefix).width;prefix+=char;const entry=animate?ease((elapsed-.06-Math.min(index*.028,.9))/.62):1;index++;
    c.save();c.globalAlpha*=entry;c.translate(x+offset,y+(1-entry)*(55+noise(index)*25));c.rotate((1-entry)*(noise(index)-.5)*.25);
    const stroke=Math.max(1.5,size*.045);c.strokeStyle='#023f51';c.lineWidth=stroke*2.8;c.strokeText(char,2,size*.075);c.strokeStyle='#d4ffed';c.lineWidth=stroke;c.strokeText(char,0,0);
    const g=c.createLinearGradient(0,-size*.5,0,size*.5);g.addColorStop(0,'#f1ffe2');g.addColorStop(.18,'#b6ffe6');g.addColorStop(.52,'#50d8ce');g.addColorStop(1,'#128fa6');c.fillStyle=g;c.fillText(char,0,0);c.restore();
   }
  }
  c.restore();return {size,lines:list};
 }
 function paper(c,r,outgoing,incoming){
  incoming();if(r>=1)return;const pic=snapshot('paper',outgoing),cols=6,rows=4,tw=W/cols,th=H/rows;
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const k=j*cols+i,q=ease((r-noise(k)*.12)/(.88-noise(k)*.03)),cx=(i+.5)*tw,cy=(j+.5)*th;
   c.save();c.translate(cx+(cx-W/2)*q*.8+(noise(k+91)-.5)*450*q,cy-(H+th+cy*.3)*q);c.rotate((noise(k+29)-.5)*q*1.4);c.scale(1-q*.18,1-q*.08);c.globalAlpha=1-ease((q-.78)/.22);
   c.shadowColor='#012c4e55';c.shadowBlur=q*28;c.shadowOffsetY=10*q;c.fillStyle='#fff2d6';c.fillRect(-tw/2-3,-th/2-3,tw+6,th+6);c.shadowBlur=0;
   c.beginPath();c.moveTo(-tw/2-2,-th/2-2);c.lineTo(tw/2+2,-th/2+3);c.lineTo(tw/2+1,th/2+3);c.lineTo(-tw/2-3,th/2-2);c.closePath();c.clip();c.drawImage(pic,-cx,-cy);c.restore();
  }
 }
 function surf(c,r,outgoing,incoming){
  if(r<.5)outgoing();else incoming();if(r<=0||r>=1)return;
  const q=ease(r),front=-900+q*(2*W+3000),tail=front-W-1600;
  c.save();const water=c.createLinearGradient(front-900,0,front+200,H);water.addColorStop(0,'#087c9c');water.addColorStop(.55,'#11bbc5');water.addColorStop(1,'#8ef5dc');
  c.beginPath();c.moveTo(tail,-80);c.lineTo(front-300,-80);for(let y=-80;y<H+100;y+=25)c.lineTo(front-300+Math.sin(y/220+r*3)*110,y);c.lineTo(tail,H+100);c.closePath();c.fillStyle=water;c.fill();
  // A curling crest rolls over the water, with a dark hollow and a foamy lip.
  function curl(){c.beginPath();c.moveTo(front-620,H+130);c.bezierCurveTo(front-880,760,front+350,610,front+65,195);c.bezierCurveTo(front-65,-35,front-515,90,front-550,355);c.bezierCurveTo(front-580,590,front-190,590,front-230,335);}
  curl();c.strokeStyle='#04627bbd';c.lineWidth=195;c.lineCap='round';c.stroke();curl();c.strokeStyle='#4ee6d4';c.lineWidth=137;c.stroke();curl();c.strokeStyle='#d2fff1';c.lineWidth=55;c.stroke();curl();c.strokeStyle='#fff9e7';c.lineWidth=19;c.stroke();
  for(let i=0;i<95;i++){const a=noise(i)*Math.PI*2,rr=200+noise(i+100)*270,x=front-265+Math.cos(a)*rr,y=355+Math.sin(a)*rr;const drift=(r*85+i*7)%55;c.beginPath();c.arc(x+drift,y-drift*.65,3+noise(i+222)*13,0,Math.PI*2);c.fillStyle=i%3?'#f4fff3ba':'#a1f6e6a6';c.fill();}
  for(let k=0;k<4;k++){c.beginPath();c.moveTo(tail,780+k*78);c.bezierCurveTo(front-1500,730+k*80,front-1100,1000,front-620,930);c.strokeStyle='#a1ffe033';c.lineWidth=12;c.stroke();}
  c.restore();
 }
 function leaf(c,length,color){
  c.fillStyle=color;
  for(let i=1;i<14;i++){const x=i*length/15,w=Math.sin(i/15*Math.PI)*length*.23;for(const side of [-1,1]){c.beginPath();c.moveTo(x-70,0);c.quadraticCurveTo(x+30,side*w*.75,x+length*.19,side*w);c.quadraticCurveTo(x+length*.08,side*w*.18,x+70,0);c.closePath();c.fill();}}
  c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(length*.5,-10,length,0);c.strokeStyle='#bddb8b';c.lineWidth=7;c.stroke();
  c.strokeStyle='#d8f4a92b';c.lineWidth=2;for(let i=2;i<14;i++){const x=i*length/15,w=Math.sin(i/15*Math.PI)*length*.23;for(const side of [-1,1]){c.beginPath();c.moveTo(x,0);c.lineTo(x+length*.15,side*w*.83);c.stroke();}}
 }
 function palms(c,r,outgoing,incoming){
  if(r<.5)outgoing();else incoming();if(r<=0||r>=1)return;const closed=Math.pow(Math.sin(Math.PI*r),.8);
  // The dark canopy closes completely before the scene underneath changes.
  c.save();c.globalAlpha=ease((closed-.78)/.2);c.fillStyle='#174d43';c.fillRect(0,0,W,H);c.restore();
  for(let i=0;i<10;i++){const right=i%2,band=Math.floor(i/2),y=-90+band*310,sign=right?-1:1;c.save();c.translate(right?W+120:-120,y);c.scale(sign,1);c.rotate((1-closed)*(-1.45+band*.72)+(band-2)*-.12);c.translate(-(1-closed)*1750,0);c.shadowColor='#082e3970';c.shadowBlur=20;c.shadowOffsetY=13;leaf(c,1450,['#256f54','#39835b','#24785e','#599761','#19685a'][band]);c.restore();}
 }
 function sand(c,r,outgoing,incoming,caption){
  incoming();if(r>=1)return;const pic=snapshot('sand-scene',outgoing);c.save();c.globalAlpha=1-ease(r/.78);c.drawImage(pic,0,0);c.restore();
  const key=caption.text+':'+JSON.stringify(caption.box);let grains=sandCache.get(key);
  if(!grains){const mask=snapshot('sand-letters',g=>title(g,caption.text,caption.box,10,false)),pixels=mask.getContext('2d').getImageData(0,0,W,H).data;grains=[];
   for(let y=20;y<H-20;y+=8)for(let x=20;x<W-20;x+=8){const k=(y*W+x)*4;if(pixels[k+3]>110)grains.push({x,y,color:'rgb('+pixels[k]+','+pixels[k+1]+','+pixels[k+2]+')'});}sandCache.set(key,grains);if(sandCache.size>3)sandCache.delete(sandCache.keys().next().value);
  }
  c.save();for(let i=0;i<grains.length;i++){const g=grains[i],q=ease((r-noise(i)*.12)/.86),travel=q*q,x=g.x+travel*(W*.9+noise(i+9)*800),y=g.y-travel*(110+noise(i+7)*380)+Math.sin(q*12+i)*q*60;
   c.globalAlpha=ease(r/.16)*(1-ease((q-.72)/.28));c.fillStyle=q>.18?(i%3?'#f5dca4':'#fff4cd'):g.color;const size=3+noise(i)*5;c.fillRect(x,y,size*(1-q*.3),size*(1-q*.3));}c.restore();
 }
 function transition(c,style,r,outgoing,incoming,caption){if(style==='collage')paper(c,r,outgoing,incoming);else if(style==='surf')surf(c,r,outgoing,incoming);else if(style==='palms')palms(c,r,outgoing,incoming);else sand(c,r,outgoing,incoming,caption);}
 const api={title,transition};root.UkeIsland=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
