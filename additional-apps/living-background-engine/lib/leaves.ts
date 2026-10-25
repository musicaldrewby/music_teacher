import {bounds,seeded,type Layer,type Scene} from './model';
const TAU=Math.PI*2;
const fract=(n:number)=>n-Math.floor(n);
/** Sparse depth-varied leaves, with continuous wind drift and a turning silhouette. */
export function drawLeaves(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
 const b=bounds(l.region),random=seeded(l.seed),count=Math.round(23*l.density),unit=w/1280;
 const colors=['#b86526','#d59a42','#ad4820','#e5b45e','#8c612e'];
 for(let i=0;i<count;i++){
  const start=random(),offset=random(),depth=random(),turn=random(),tone=random();
  const cycles=Math.max(1,Math.round(l.speed*(.7+depth))),q=fract(offset+p*cycles);
  const drift=Math.sin(l.direction*Math.PI/180)*.25+s.wind*.18;
  const horizontal=fract(start+q*drift+Math.sin(q*TAU+turn*TAU)*.025);
  const x=(b.x+horizontal*b.w)*w,y=(b.y+q*b.h)*h;
  const alpha=Math.min(1,q*15,(1-q)*15,horizontal*30,(1-horizontal)*30);
  const size=(1.6+depth*4.1)*l.scale*unit;
  c.save();c.globalAlpha=l.opacity*alpha*(.5+depth*.5);c.translate(x,y);
  c.rotate(Math.sin(q*TAU*2+turn*TAU)*.8+turn*TAU);
  c.scale(size*(.22+.78*Math.abs(Math.cos(q*TAU*3+turn*TAU))),size);
  // A pointed maple silhouette, broad at its shoulders and tapered to a stem.
  c.beginPath();c.moveTo(0,-1);c.lineTo(.24,-.42);c.lineTo(.65,-.62);c.lineTo(.54,-.17);c.lineTo(.96,-.12);c.lineTo(.52,.31);c.lineTo(.59,.55);c.lineTo(.11,.5);c.lineTo(0,.83);c.lineTo(-.12,.5);c.lineTo(-.6,.54);c.lineTo(-.52,.3);c.lineTo(-.94,-.12);c.lineTo(-.53,-.17);c.lineTo(-.66,-.61);c.lineTo(-.24,-.42);c.closePath();
  c.fillStyle=colors[Math.floor(tone*colors.length)];c.fill();
  c.strokeStyle='rgba(71,40,15,.45)';c.lineWidth=.09;c.beginPath();c.moveTo(0,-.72);c.lineTo(0,.97);c.moveTo(0,.15);c.lineTo(-.48,-.23);c.moveTo(0,.15);c.lineTo(.48,-.23);c.stroke();c.restore();
 }
}
