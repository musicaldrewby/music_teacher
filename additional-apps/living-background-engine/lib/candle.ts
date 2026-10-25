import {bounds,type Layer} from './model';
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** A small, softly sampled flame; its wick remains fixed while the tip flickers. */
export class CandleRenderer{
 surface:HTMLCanvasElement;
 constructor(){this.surface=document.createElement('canvas');this.surface.width=64;this.surface.height=96;}
 draw(c:CanvasRenderingContext2D,l:Layer,p:number,w:number,h:number){
  const b=bounds(l.region),points=l.points?.length?l.points:[[b.x+b.w*.5,b.y+b.h*.75]];
  const unit=w/1280,fc=this.surface.getContext('2d')!,pixels=fc.createImageData(64,96);
  points.forEach(([nx,ny],index)=>{
   const t=p*TAU*Math.max(1,Math.round(l.speed*2)),seed=l.seed*.37+index*2.7;
   const flicker=Math.sin(t*7+seed)*.10+Math.sin(t*13+seed*2)*.045+Math.sin(t*23+seed)*.018;
   const height=15*l.scale*unit*(1+flicker),lean=(Math.sin(t*3+seed)*.12+Math.sin(t*11+seed)*.035);
   const x=nx*w,y=ny*h,power=.88+flicker;
   c.save();c.globalCompositeOperation='screen';
   const glow=c.createRadialGradient(x,y-height*.4,0,x,y-height*.4,height*2.1);
   glow.addColorStop(0,`rgba(255,162,53,${.23*power})`);glow.addColorStop(.28,`rgba(255,132,32,${.10*power})`);glow.addColorStop(1,'rgba(255,116,20,0)');
   c.fillStyle=glow;c.fillRect(x-height*2.1,y-height*2.5,height*4.2,height*4.2);
   for(let py=0;py<96;py++)for(let px=0;px<64;px++){
    const up=1-py/95,u=(px/63-.5)*1.1;
    const center=lean*up**1.7+Math.sin(up*7-t*7+seed)*.018*up;
    const width=.19*Math.pow(Math.sin(Math.PI*up),.65)*(1-.62*up);
    const distance=Math.abs(u-center)/(width+.002),edge=clamp((1-distance)*5);
    const core=clamp((1-distance)*1.6)*clamp((1-up)*3);
    const root=clamp((.13-up)/.13),a=edge*clamp(up*28)*clamp((1-up)*40);
    const k=(py*64+px)*4;
    pixels.data[k]=Math.round(255-root*105);pixels.data[k+1]=Math.round(125+core*124-root*30);pixels.data[k+2]=Math.round(20+core*174+root*60);pixels.data[k+3]=Math.round(a*245);
   }
   fc.putImageData(pixels,0,0);c.drawImage(this.surface,x-height*.55,y-height,height*1.1,height);
   c.globalCompositeOperation='source-over';c.strokeStyle='rgba(48,24,10,.7)';c.lineWidth=Math.max(.5,unit*.7);c.beginPath();c.moveTo(x,y+unit);c.lineTo(x+.2*unit,y-height*.085);c.stroke();
   c.restore();
  });
 }
}
