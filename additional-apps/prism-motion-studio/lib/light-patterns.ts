import * as T from 'three';
import {patternUsesSeed,type LightPattern} from './light-pattern-schema';

export type PatternShape={kind:'ellipse'|'bar'|'polygon'|'ring';x:number;y:number;rx:number;ry:number;angle:number;tone?:number;points?:[number,number][];stroke?:number};
export const patternBackground=(kind:LightPattern['kind'])=>['arched-window','ripples','stars','confetti'].includes(kind)?0:1;
/** Shared vector silhouettes for the picker and the projected texture. Coordinates are tile-local. */
export function patternShapes(kind:LightPattern['kind'],seed=17):PatternShape[]{
 const shapes:PatternShape[]=[];
 const ink=1-patternBackground(kind);
 const add=(kind:PatternShape['kind'],x:number,y:number,rx:number,ry:number,angle=0,tone=ink)=>shapes.push({kind,x,y,rx,ry,angle,tone});
 const line=(x1:number,y1:number,x2:number,y2:number,width:number,tone=ink)=>add('bar',(x1+x2)/2,(y1+y2)/2,Math.hypot(x2-x1,y2-y1)/2,width,Math.atan2(y2-y1,x2-x1)*180/Math.PI,tone);
 const polygon=(x:number,y:number,rx:number,ry:number,angle:number,points:[number,number][])=>shapes.push({kind:'polygon',x,y,rx,ry,angle,points,tone:ink});
 let state=seed+1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 if(kind==='blinds')for(let i=0;i<6;i++)add('bar',.5,(i+.5)/6,.8,.045);
 if(kind==='window')for(let i=0;i<3;i++){add('bar',i/3,.5,.025,.8);add('bar',.5,i/3,.8,.025);}
 if(kind==='lattice')for(let i=-5;i<=5;i++){add('bar',.5,.5+i/4,1.5,.018,45);add('bar',.5,.5+i/4,1.5,.018,-45);}
 if(kind==='leaves'){
  // Uneven branches with paired leaves leave generous patches of open sunlight.
  for(let b=0;b<6;b++){
   const x=random(),y=random(),angle=random()*360,r=.16+random()*.15,a=angle*Math.PI/180;
   add('bar',x,y,r,.006+random()*.005,angle);
   for(let n=0;n<8;n++){
    const along=(n/7-.5)*r*1.8,side=n%2?1:-1,offset=.035+random()*.025;
    add('ellipse',x+Math.cos(a)*along-Math.sin(a)*offset*side,y+Math.sin(a)*along+Math.cos(a)*offset*side,.035+random()*.035,.015+random()*.012,angle+side*(35+random()*30));
   }
  }
 }
 if(kind==='arched-window'){
  add('ellipse',.5,.34,.34,.25);add('bar',.5,.59,.34,.25);
  add('bar',.5,.48,.016,.4,0,0);add('bar',.5,.48,.36,.016,0,0);add('bar',.5,.67,.36,.012,0,0);
 }
 if(kind==='rain')for(let i=0;i<44;i++){
  const x=random(),y=random(),rx=.012+random()*.018,ry=.022+random()*.034;
  if(i%3===0)line(x,y-.07-random()*.08,x+.008,y,rx*.4,.22);
  add('ellipse',x,y,rx,ry,-8,.08);add('ellipse',x-rx*.25,y-ry*.18,rx*.35,ry*.5,-8,.78);
 }
 if(kind==='ripples')for(let source=0;source<2;source++){
  const x=.2+source*.5+(random()-.5)*.16,y=.25+source*.48+(random()-.5)*.16,angle=(random()-.5)*35;
  for(let i=0;i<4;i++)shapes.push({kind:'ring',x,y,rx:.09+i*.105,ry:.045+i*.065,angle,stroke:.02/(.09+i*.105),tone:1});
 }
 if(kind==='stars')for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const r=.085+random()*.025,points:[number,number][]=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?.45:1;return [Math.cos(a)*r,Math.sin(a)*r];});
  polygon((col+.5)/4+(random()-.5)*.055,(row+.5)/4+(random()-.5)*.055,r,r,random()*60,points);
 }
 if(kind==='palms')for(let f=0;f<3;f++){
  const x=[.1,.8,.6][f]+(random()-.5)*.12,y=[.92,.16,.95][f],a=[-1.05,2.15,-2.1][f]+(random()-.5)*.25,length=.7+random()*.2;
  line(x,y,x+Math.cos(a)*length,y+Math.sin(a)*length,.006);
  for(let n=1;n<16;n++)for(const side of [-1,1]){
   const t=n/16,sx=x+Math.cos(a)*length*t,sy=y+Math.sin(a)*length*t,leafLength=.23*Math.sin(Math.PI*t)**.6,angle=a+side*(.7+t*.6),ex=sx+Math.cos(angle)*leafLength,ey=sy+Math.sin(angle)*leafLength;
   polygon((sx+ex)/2,(sy+ey)/2,leafLength/2,.012,angle*180/Math.PI,[[-1,0],[-.25,-1],[1,0],[0,.8]]);
  }
 }
 if(kind==='branches'){
  const branch=(x:number,y:number,a:number,length:number,width:number,depth:number)=>{
   const ex=x+Math.cos(a)*length,ey=y+Math.sin(a)*length;line(x,y,ex,ey,width);
   if(depth)for(const side of [-1,1])branch(ex,ey,a+side*(.3+random()*.5),length*(.57+random()*.17),width*.63,depth-1);
  };
  branch(.18,1.05,-1.25,.35,.025,4);branch(.84,.95,-1.9,.3,.02,4);
 }
 if(kind==='honeycomb')for(let col=0;col<4;col++)for(let row=0;row<3;row++){
  const x=col/4,y=(row+(col%2)*.5)/3;
  for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;line(x+Math.cos(a)/6,y+Math.sin(a)/(3*Math.sqrt(3)),x+Math.cos(b)/6,y+Math.sin(b)/(3*Math.sqrt(3)),.009);}
 }
 if(kind==='confetti')for(let row=0;row<5;row++)for(let col=0;col<5;col++){
  const x=(col+.5)/5+(random()-.5)*.09,y=(row+.5)/5+(random()-.5)*.09,rx=.04+random()*.03,ry=.025+random()*.025,angle=random()*180;
  if((row+col)%3===0)polygon(x,y,rx,ry,angle,[[-1,1],[0,-1],[1,1]]);else add((row+col)%3===1?'ellipse':'bar',x,y,rx,ry,angle);
 }
 return shapes;
}
const RES=256,baseCache=new Map<string,Float32Array>(),softCache=new Map<string,Float32Array>();
// All lookups address a power-of-two tile with integer pixel coordinates.
const wrap=(n:number)=>n&(RES-1);
function baseMask(pattern:LightPattern){
 const key=pattern.kind+':'+(patternUsesSeed(pattern.kind)?pattern.seed:0);const cached=baseCache.get(key);if(cached)return cached;
 const values=new Float32Array(RES*RES).fill(patternBackground(pattern.kind));
 for(const shape of patternShapes(pattern.kind,pattern.seed)){
  const a=shape.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),w=Math.abs(c)*shape.rx+Math.abs(s)*shape.ry,h=Math.abs(s)*shape.rx+Math.abs(c)*shape.ry;
  const x0=Math.floor((shape.x-w)*RES),x1=Math.ceil((shape.x+w)*RES),y0=Math.floor((shape.y-h)*RES),y1=Math.ceil((shape.y+h)*RES);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const dx=(x+.5)/RES-shape.x,dy=(y+.5)/RES-shape.y,u=(c*dx+s*dy)/shape.rx,v=(-s*dx+c*dy)/shape.ry;
   let inside=shape.kind==='ellipse'?u*u+v*v<=1:Math.abs(u)<=1&&Math.abs(v)<=1;
   if(shape.kind==='ring'){const distance=Math.hypot(u,v);inside=distance<=1&&distance>=1-(shape.stroke??.12);}
   if(shape.kind==='polygon'){
    inside=false;const points=shape.points!;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
     const [xi,yi]=points[i],[xj,yj]=points[j];if((yi>v)!==(yj>v)&&u<(xj-xi)*(v-yi)/(yj-yi)+xi)inside=!inside;
    }
   }
   if(inside)values[wrap(y)*RES+wrap(x)]=shape.tone??0;
  }
 }
 if(baseCache.size>=12)baseCache.delete(baseCache.keys().next().value!);baseCache.set(key,values);return values;
}
/** Separable periodic box blur, three passes approximate a Gaussian without canvas or assets. */
function soften(source:Float32Array,radius:number){
 if(radius<1)return source;let data=source;
 for(let pass=0;pass<3;pass++)for(let axis=0;axis<2;axis++){
  const output=new Float32Array(data.length),count=radius*2+1;
  for(let row=0;row<RES;row++){
   const index=(column:number)=>axis===0?row*RES+wrap(column):wrap(column)*RES+row;
   let sum=0;for(let i=-radius;i<=radius;i++)sum+=data[index(i)];
   for(let column=0;column<RES;column++){output[index(column)]=sum/count;sum+=data[index(column+radius+1)]-data[index(column-radius)];}
  }
  data=output;
 }
 return data;
}
export function patternSampler(pattern:LightPattern){
 const radius=Math.round(pattern.softness*7),key=[pattern.kind,patternUsesSeed(pattern.kind)?pattern.seed:0,radius].join(':');
 let data=softCache.get(key);if(!data){data=soften(baseMask(pattern),radius);if(softCache.size>=16)softCache.delete(softCache.keys().next().value!);softCache.set(key,data);}
 const values=data,a=pattern.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return (u:number,v:number)=>{
  if(pattern.kind==='none'||pattern.strength===0)return 1;
  // UV is bottom-up; silhouettes use top-down coordinates like the picker.
  const dx=u-.5,dy=.5-v,x=((c*dx+s*dy)/pattern.size+.5)*RES-.5,y=((-s*dx+c*dy)/pattern.size+.5)*RES-.5;
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const at=(px:number,py:number)=>values[wrap(py)*RES+wrap(px)];
  const value=(at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
  return Math.max(0,Math.min(1,1-pattern.strength+pattern.strength*value));
 };
}
export function patternPixels(pattern:LightPattern,width=512,height=width){
 const sample=patternSampler(pattern),data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=Math.round(sample((x+.5)/width,(y+.5)/height)*255);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}
 return data;
}
/** Retain the GPU texture while dragging sliders; release it when the pattern is removed. */
export function syncLightPattern(light:T.SpotLight,pattern:LightPattern){
 const key=JSON.stringify(pattern);if(light.userData.patternKey===key)return;
 light.userData.patternKey=key;light.userData.lightPattern={...pattern};
 if(pattern.kind==='none'){light.map?.dispose();light.map=null;return;}
 const data=patternPixels(pattern);
 if(light.map instanceof T.DataTexture){light.map.image.data=data;light.map.needsUpdate=true;}
 else{light.map=new T.DataTexture(data,512,512,T.RGBAFormat);light.map.colorSpace=T.NoColorSpace;light.map.minFilter=T.LinearFilter;light.map.magFilter=T.LinearFilter;light.map.needsUpdate=true;}
}
