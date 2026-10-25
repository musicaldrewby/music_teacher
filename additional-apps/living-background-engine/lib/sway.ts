import {WaterRenderer} from './water';
import {bounds,type Layer,type Scene} from './model';
const TAU=Math.PI*2,clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
/** Anchored elastic bending: one source sample, no duplicate transparent foliage. */
export class SwayRenderer extends WaterRenderer{
 fields=new Map<string,{key:string;values:Float32Array}>();
 draw(c:CanvasRenderingContext2D,l:Layer,s:Scene,p:number,w:number,h:number){
  const m=this.flowMap(l),b=bounds(l.region),anchor=l.points?.[0]??[b.x+b.w*.5,b.y+b.h],key=m.key+JSON.stringify(anchor);
  let entry=this.fields.get(l.id);
  if(entry?.key!==key){const values=new Float32Array(m.indices.length*3),max=Math.max(...l.region.map(([x,y])=>Math.hypot((x-anchor[0])*this.width,(y-anchor[1])*this.height)));
   for(let j=0;j<m.indices.length;j++){const pixel=m.indices[j]/4,x=pixel%this.width,y=(pixel-x)/this.width,dx=x-anchor[0]*this.width,dy=y-anchor[1]*this.height;
    const flex=clamp(Math.hypot(dx,dy)/max)**1.7,delay=dx/this.width*7+dy/this.height*5;
    values[j*3]=flex*Math.min(1,m.clearance[j]/(14*this.width/1280));values[j*3+1]=Math.sin(delay);values[j*3+2]=Math.cos(delay);
   }entry={key,values};this.fields.set(l.id,entry);
  }
  const t=p*TAU*Math.max(1,Math.round(s.duration*l.speed/7)),sin=Math.sin(t),cos=Math.cos(t),sin2=Math.sin(t*2),cos2=Math.cos(t*2),f=entry.values;
  const angle=l.direction*Math.PI/180,amp=5*l.scale*l.opacity*this.width/1280,source=this.source,target=m.pixels.data,row=this.width*4;
  for(let j=0;j<m.indices.length;j++){
   const idx=m.indices[j],pixel=idx/4,x=pixel%this.width,y=(pixel-x)/this.width;
   const bend=f[j*3]*amp*((sin*f[j*3+2]-cos*f[j*3+1])+.18*(sin2*f[j*3+2]-cos2*f[j*3+1]));
   const ax=clamp(x-bend*Math.cos(angle),0,this.width-1.001),ay=clamp(y-bend*Math.sin(angle)*.5,0,this.height-1.001);
   const xi=Math.floor(ax),yi=Math.floor(ay),fx=ax-xi,fy=ay-yi,at=(yi*this.width+xi)*4;
   for(let ch=0;ch<3;ch++)target[idx+ch]=source[at+ch]*(1-fx)*(1-fy)+source[at+4+ch]*fx*(1-fy)+source[at+row+ch]*(1-fx)*fy+source[at+row+4+ch]*fx*fy;
  }
  m.surface.getContext('2d')!.putImageData(m.pixels,0,0);c.globalAlpha=1;c.drawImage(m.surface,0,0,w,h);
 }
}
