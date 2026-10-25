import {bounds,seeded,type Layer,type Point} from './model';
const TAU=Math.PI*2;
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
// Smooth dimming follows whole cycles, preserving a seamless scene loop.
export function lightBrightness(l:Layer,p:number,index:number,positionY=0){
 const cycles=Math.max(1,Math.round(l.speed*3)),depth=l.twinkleDepth??.9;
 const random=seeded(l.seed+index*7919),offset=random()*TAU,variation=random();
 let wave=1;
 switch(l.lightMode??'twinkle'){
  case 'steady': return 1;
  case 'flash': wave=smooth((Math.sin(p*TAU*cycles+(index%2)*Math.PI)+.3)/.6);break;
  case 'chase': wave=Math.pow((1+Math.cos(p*TAU*cycles-positionY*TAU*1.5))*.5,5);break;
  default:
   // Keep a few bulbs glowing while the rest independently swell and sparkle.
   if(index%3===0)return .88+.12*Math.sin(p*TAU*cycles+offset)**2;
   wave=.18+.82*Math.pow((1+Math.sin(p*TAU*(cycles+(index%3))+offset))*.5,1.2+variation);
 }
 return (1-depth)+depth*wave;
}
const color=(hex:string,alpha:number)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${Math.max(0,Math.min(1,alpha))})`;
function halo(c:CanvasRenderingContext2D,x:number,y:number,r:number,tint:string,a:number){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color(tint,a));g.addColorStop(.18,color(tint,a*.45));g.addColorStop(.55,color(tint,a*.1));g.addColorStop(1,color(tint,0));
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
export function drawLights(c:CanvasRenderingContext2D,l:Layer,p:number,w:number,h:number){
 const b=bounds(l.region),random=seeded(l.seed),unit=w/1280;
 const pts=l.points?.length?l.points:Array.from({length:24},()=>[b.x+random()*b.w,b.y+random()*b.h] as Point);
 const festive=['#ff4b38','#ffcb56','#55e783','#6faaff','#ff77be'];
 c.globalCompositeOperation='screen';
 pts.forEach(([px,py],i)=>{
  const a=lightBrightness(l,p,i,py),r=(1+random()*.45)*l.scale*unit;
  const tint=l.lightPalette==='multicolor'?festive[i%festive.length]:l.lightPalette==='custom'?l.color:'#ffd38a';
  const x=px*w,y=py*h,spread=l.glowRadius??1;
  // Broad spill lights nearby needles; a tighter bloom surrounds the small bulb.
  halo(c,x,y,r*25*spread,tint,a*.12);
  halo(c,x,y,r*11*spread,tint,a*.55);
  halo(c,x,y,r*3.5,tint,a*.95);
  c.fillStyle=color(tint,a);c.beginPath();c.ellipse(x,y,r*.7,r,0,0,TAU);c.fill();
  c.fillStyle=color('#fff9e7',a*.95);c.beginPath();c.arc(x,y,r*.65,0,TAU);c.fill();
 });
}
