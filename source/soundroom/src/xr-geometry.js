// Room-space geometry in metres. Rendering and picking use the same dimensions.
export const PANEL={x:0,y:-.035,z:-1.14,width:1.5,height:1,px:1440,py:960};
export function keyboardKeys(base=48){
 const whiteNotes=[];for(let n=base;n<=base+24;n++)if(![1,3,6,8,10].includes(n%12))whiteNotes.push(n);
 const width=1.23/whiteNotes.length,keys=[];
 for(let n=base;n<=base+24;n++){
  const black=[1,3,6,8,10].includes(n%12),i=black?whiteNotes.filter(w=>w<n).length:whiteNotes.indexOf(n)+.5;
  keys.push({id:'key:'+n,note:n,black,x:-.615+i*width,y:black?-.471:-.49,z:black?-.748:-.69,w:width*(black?.59:.96),h:black?.054:.032,d:black?.17:.3});
 }return keys;
}
export function rayBox(origin,direction,box){
 let near=0,far=Infinity;
 for(const [i,center,size] of [[0,box.x,box.w],[1,box.y,box.h],[2,box.z,box.d]]){
  const min=center-size/2,max=center+size/2,d=direction[i],o=origin[i];
  if(Math.abs(d)<1e-8){if(o<min||o>max)return null;continue}
  let a=(min-o)/d,b=(max-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(far<near)return null;
 }return near;
}
export function panelPoint(origin,direction){
 if(direction[2]>=-1e-6)return null;
 const distance=(PANEL.z-origin[2])/direction[2];if(distance<0)return null;
 const x=(origin[0]+direction[0]*distance+PANEL.width/2)/PANEL.width*PANEL.px;
 const y=(PANEL.height/2-(origin[1]+direction[1]*distance-PANEL.y))/PANEL.height*PANEL.py;
 return x>=0&&x<=PANEL.px&&y>=0&&y<=PANEL.py?{x,y,distance}:null;
}
export function pickRoom(origin,direction,keys,buttons){
 let hit=null;for(const key of keys){const distance=rayBox(origin,direction,key);if(distance!==null&&(!hit||distance<hit.distance))hit={...key,distance}}
 const point=panelPoint(origin,direction);
 if(point&&(!hit||point.distance<hit.distance)){
  const button=buttons.find(b=>!b.disabled&&point.x>=b.x&&point.x<=b.x+b.w&&point.y>=b.y&&point.y<=b.y+b.h);
  hit={id:button?.id||'panel',action:button?.action,distance:point.distance};
 }return hit;
}
export function roomAnchor(transform){
 const m=transform.matrix,yaw=Math.atan2(m[8],m[10]),c=Math.cos(yaw),s=Math.sin(yaw),p=transform.position;
 return {x:p.x,y:p.y,z:p.z,c,s,matrix:new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,p.x,p.y,p.z,1])};
}
export function localRay(transform,anchor){
 const m=transform.matrix,p=transform.position,x=p.x-anchor.x,z=p.z-anchor.z;
 return {origin:[anchor.c*x-anchor.s*z,p.y-anchor.y,anchor.s*x+anchor.c*z],direction:[-anchor.c*m[8]+anchor.s*m[10],-m[9],-anchor.s*m[8]-anchor.c*m[10]]};
}
export function multiply(a,b){
 const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out;
}
export function boxMatrix(x,y,z,w,h,d){return new Float32Array([w,0,0,0,0,h,0,0,0,0,d,0,x,y,z,1])}

export function malletBars(base=48,chromatic=false,height=0){
 const naturals=[];for(let n=base;n<=base+24;n++)if(![1,3,6,8,10].includes(n%12))naturals.push(n);
 const notes=chromatic?Array.from({length:25},(_,i)=>base+i):naturals.slice(0,13),width=1.26/(chromatic?15:13);
 return notes.map((note,index)=>{
  const black=[1,3,6,8,10].includes(note%12),i=black?naturals.filter(n=>n<note).length:naturals.indexOf(note)+.5;
  return {id:'key:'+note,note,black,bar:true,x:-.63+i*width,y:-.49+height,z:black?-.99:-.65,w:width*.88,h:.045,d:(black?.20:.38)-(note-base)*.004};
 });
}
export function defaultPanels(){return [
 {id:'play',title:'PLAY / SOUNDS',x:0,y:.04,z:-1.55,yaw:0,width:1.5,height:1,visible:true},
 {id:'mixer',title:'08-CHANNEL MIXER',x:-1.5,y:.02,z:-1.34,yaw:.78,width:1.4,height:.934,visible:true},
 {id:'pattern',title:'PATTERN / EVENT EDITOR',x:1.5,y:.02,z:-1.34,yaw:-.78,width:1.4,height:.934,visible:true},
 {id:'song',title:'SONG ARRANGEMENT',x:1.25,y:.25,z:-1.3,yaw:-.65,width:1.4,height:.934,visible:false},
 {id:'tools',title:'WORKSTATION TOOLS',x:0,y:.02,z:-1.08,yaw:0,width:1.35,height:.9,visible:false}
 ]}
export function panelMatrix(panel){const c=Math.cos(panel.yaw),s=Math.sin(panel.yaw);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,panel.x,panel.y,panel.z,1])}
export function panelRay(origin,direction,panel){const c=Math.cos(panel.yaw),s=Math.sin(panel.yaw),x=origin[0]-panel.x,z=origin[2]-panel.z;return {origin:[c*x-s*z,origin[1]-panel.y,s*x+c*z],direction:[c*direction[0]-s*direction[2],direction[1],s*direction[0]+c*direction[2]]}}
export function panelCoordinates(origin,direction,panel,clipped=true){
 const ray=panelRay(origin,direction,panel);if(ray.direction[2]>=-1e-6)return null;
 const distance=-ray.origin[2]/ray.direction[2];if(distance<=0)return null;
 const x=(ray.origin[0]+ray.direction[0]*distance+panel.width/2)/panel.width*1440,y=(panel.height/2-ray.origin[1]-ray.direction[1]*distance)/panel.height*960;
 return !clipped||x>=0&&x<=1440&&y>=0&&y<=960?{x,y,distance}:null;
}
export function pickWorkspace(origin,direction,keys,panels,surfaces){
 let result=null;for(const key of keys){const distance=rayBox(origin,direction,key);if(distance!==null&&(!result||distance<result.distance))result={...key,distance}}
 for(const panel of panels.filter(p=>p.visible)){
  const point=panelCoordinates(origin,direction,panel);if(!point||result&&point.distance>=result.distance)continue;
  const controls=surfaces.get(panel.id)?.buttons||[],button=[...controls].reverse().find(b=>!b.disabled&&point.x>=b.x&&point.x<=b.x+b.w&&point.y>=b.y&&point.y<=b.y+b.h);
  result={...button,id:button?.id||panel.id+'-surface',panel:panel.id,point,distance:point.distance};
 }return result;
}
export function sliderValue(control,point){const fraction=control.vertical?1-(point.y-control.y)/control.h:(point.x-control.x)/control.w;const raw=control.min+Math.max(0,Math.min(1,fraction))*(control.max-control.min),step=control.step||1;return Math.max(control.min,Math.min(control.max,Math.round(raw/step)*step))}
export function beamMatrix(from,to,thickness){
 const z=from.map((n,i)=>to[i]-n),len=Math.hypot(...z)||1;for(let i=0;i<3;i++)z[i]/=len;
 let x=Math.abs(z[1])<.98?[z[2],0,-z[0]]:[0,-z[2],z[1]],xl=Math.hypot(...x);x=x.map(n=>n/xl);
 const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
 return new Float32Array([...x.map(n=>n*thickness),0,...y.map(n=>n*thickness),0,...z.map(n=>n*len),0,...from.map((n,i)=>(n+to[i])/2),1]);
}
