import {bounds,seeded,type Layer,type Scene} from './model';
const TAU=Math.PI*2,clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Separate buoyant tongues rooted in the fuel, with advected heat and thin luminous edges. */
export class FireRenderer{
 surface:HTMLCanvasElement; fields=new Map<number,Float32Array>();
 constructor(){this.surface=document.createElement('canvas');this.surface.width=64;this.surface.height=144;}
 draw(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const b=bounds(l.region),random=seeded(l.seed),unit=w/1280;
  const sources=l.points?.length?l.points:Array.from({length:9},(_,i)=>[b.x+b.w*(.12+i*.095),b.y+b.h*.92]);
  let field=this.fields.get(l.seed);if(!field){field=Float32Array.from({length:1024},()=>random());this.fields.set(l.seed,field);}
  const noise=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,d=y-iy;a=a*a*(3-2*a);d=d*d*(3-2*d);const at=(xx:number,yy:number)=>field![((yy&31)*32)+(xx&31)];return (at(ix,iy)*(1-a)+at(ix+1,iy)*a)*(1-d)+(at(ix,iy+1)*(1-a)+at(ix+1,iy+1)*a)*d;};
  const ctx=this.surface.getContext('2d')!,pixels=ctx.createImageData(64,144),cycles=Math.max(1,Math.round(s.duration*l.speed/2)),clock=p*TAU*cycles;
  c.save();c.globalCompositeOperation='screen';
  sources.forEach(([nx,ny],index)=>{
   const seed=l.seed*.13+index*3.71;
   const pulse=.84+.15*Math.sin(clock+seed)+.08*Math.sin(clock*3+seed*2)+.035*Math.sin(clock*7+seed);
   const height=Math.min(b.h*h*.92,(47+((index*37+11)%39))*l.scale*unit)*pulse;
   const width=height*(.85+.15*(index%3)),x=nx*w,y=ny*h;
   const lean=(Math.sin(seed)*.04+Math.sin(clock+seed)*.13+s.wind*.12);
   const advect=p*32*cycles;
   for(let py=0;py<144;py++){
    const up=1-py/143,center=lean*up*up+Math.sin(up*8-clock*2+seed)*.065*up;
    const radius=(.07+.13*Math.sin(up*Math.PI))*(1-up)**.8;
    for(let px=0;px<64;px++){
     const u=(px/63-.5)*.9,n=noise(u*9+index*4,up*5-advect),fine=noise(u*26+index*3,up*15-advect*2);
     const curl=center+(n-.5)*(.055+up*.25);
     const distance=Math.abs(u-curl)/(radius*(.65+n*.75)+.001);
     const heat=clamp((1-distance)*2.2+(fine-.5)*1.2);
     const tip=clamp((1-up-(n-.5)*.10)*15),root=clamp(up*23);
     const alpha=heat*tip*root*(.5+.5*fine);
     const core=clamp((1-distance)*1.5)*clamp((.78-up)*2.4);
     const k=(py*64+px)*4;
     pixels.data[k]=255;pixels.data[k+1]=Math.round(90+core*162);pixels.data[k+2]=Math.round(9+core**3*174);pixels.data[k+3]=Math.round(alpha*235);
    }
   }
   const glow=c.createRadialGradient(x,y-height*.32,0,x,y-height*.32,height*.67);
   glow.addColorStop(0,'rgba(255,123,23,.10)');glow.addColorStop(1,'rgba(255,90,10,0)');c.fillStyle=glow;c.fillRect(x-height*.67,y-height,height*1.34,height*1.34);
   ctx.putImageData(pixels,0,0);c.drawImage(this.surface,x-width*.5,y-height,width,height);
  });c.restore();
 }
}
