import * as T from 'three';
import type {StagePose} from './sequence';
/** Clip triangles, rather than shader planes, so the curtain halves transfer to exports. */
export function splitGeometry(source:T.BufferGeometry,side:-1|1,cut?:number){
 const geo=source.index?source.toNonIndexed():source;if(!geo.boundingBox)geo.computeBoundingBox();const middle=cut??(geo.boundingBox!.min.x+geo.boundingBox!.max.x)/2;
 const attrs=['position','normal','uv'].filter(k=>geo.getAttribute(k)),data=Object.fromEntries(attrs.map(k=>[k,[] as number[]]));
 const result=new T.BufferGeometry();let out=0,lastMaterial=-1;
 type Vertex=Record<string,number[]>;
 for(let i=0;i<geo.getAttribute('position').count;i+=3){
  const triangle:Vertex[]=[0,1,2].map(j=>Object.fromEntries(attrs.map(k=>{const a=geo.getAttribute(k);return [k,Array.from({length:a.itemSize},(_,c)=>(a.array as ArrayLike<number>)[(i+j)*a.itemSize+c])];})));
  let clipped:Vertex[]=[];
  for(let j=0;j<3;j++){const a=triangle[j],b=triangle[(j+1)%3],da=(a.position[0]-middle)*side,db=(b.position[0]-middle)*side;
   if(da>=0)clipped.push(a);if((da>=0)!==(db>=0)){const f=da/(da-db);clipped.push(Object.fromEntries(attrs.map(k=>[k,a[k].map((v,c)=>v+(b[k][c]-v)*f)])));}
  }
  const mat=geo.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex||0;
  for(let j=1;j<clipped.length-1;j++){if(lastMaterial!==mat){result.addGroup(out,0,mat);lastMaterial=mat;}for(const v of [clipped[0],clipped[j],clipped[j+1]]){for(const k of attrs)data[k].push(...v[k]);out++;result.groups.at(-1)!.count++;}}
 }
 for(const k of attrs)result.setAttribute(k,new T.Float32BufferAttribute(data[k],geo.getAttribute(k).itemSize));
 if(geo!==source)geo.dispose();result.computeBoundingBox();return result;
}
function ghost(source:T.Mesh,geometry:T.BufferGeometry,name:string){
 const mats=(Array.isArray(source.material)?source.material:[source.material]).map(m=>{const c=m.clone();c.transparent=true;c.depthWrite=false;return c;});
 const node=new T.Mesh(geometry,Array.isArray(source.material)?mats:mats[0]);node.name=name;node.userData.motionGhost=true;node.visible=false;node.castShadow=false;source.add(node);return node;
}
export function prepareTextEffects(mesh:T.Mesh,entrance:string,exit:string,cut?:number,width?:number){
 const modes=[entrance==='curtain-reveal'?'curtain':'',entrance==='focus-reveal'?'blur':'',exit==='receding-echo'?'echo':''].filter(Boolean);
 mesh.userData.effectWidth=width;const key=modes.join(':')+':'+(cut??'auto');if(mesh.userData.textEffectsKey===key)return;
 for(const child of [...mesh.children])if(child.userData.motionGhost){const node=child as T.Mesh;if(node.geometry!==mesh.geometry)node.geometry.dispose();(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>m.dispose());node.removeFromParent();}
 mesh.userData.textEffectsKey=key;
 if(modes.includes('curtain'))for(const side of [-1,1] as const){const geometry=splitGeometry(mesh.geometry,side,cut);if(!geometry.getAttribute('position').count){geometry.dispose();continue;}const n=ghost(mesh,geometry,'Curtain half');n.userData.effect='curtain';n.userData.side=side;}
 if(modes.includes('blur'))for(let i=0;i<8;i++){const n=ghost(mesh,mesh.geometry,'Focus reveal sample');n.userData.effect='blur';n.userData.sample=i;}
 if(modes.includes('echo'))for(let i=0;i<3;i++){const n=ghost(mesh,mesh.geometry,'Receding echo');n.userData.effect='echo';n.userData.sample=i;}
}
export function sampleTextEffects(mesh:T.Mesh,stage:StagePose,amount:number,alpha:number){
 const source=Array.isArray(mesh.material)?mesh.material:[mesh.material];
 let blur=0;
 for(const child of mesh.children){if(!child.userData.motionGhost)continue;const node=child as T.Mesh;let opacity=0;node.position.set(0,0,0);node.rotation.set(0,0,0);node.scale.setScalar(1);
  if(node.userData.effect==='curtain'&&stage.curtain!==undefined){const p=stage.curtain;opacity=alpha*(1-p)**2;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const width=mesh.userData.effectWidth??(mesh.geometry.boundingBox!.max.x-mesh.geometry.boundingBox!.min.x);node.position.x=node.userData.side*(width*.65+amount)*p;}
  if(node.userData.effect==='blur'&&(stage.blur||0)>0){blur=Math.min(.85,stage.blur!*6);const angle=node.userData.sample*Math.PI/4;node.position.set(Math.cos(angle)*stage.blur!,Math.sin(angle)*stage.blur!,0);opacity=alpha*stage.opacity*blur/8;}
  if(node.userData.effect==='echo'&&(stage.echo||0)>0){const p=stage.echo!,i=node.userData.sample+1;opacity=alpha*stage.opacity*Math.sin(Math.PI*p)*.25/i;node.position.z=i*amount*.85;node.scale.setScalar(1+i*.035*Math.sin(Math.PI*p));}
  const mats=Array.isArray(node.material)?node.material:[node.material];mats.forEach((m,i)=>{const src=source[i]||source[0],dest=m as T.MeshStandardMaterial,origin=src as T.MeshStandardMaterial;dest.opacity=opacity*(src.userData.baseOpacity??1);if(dest.color&&origin.color)dest.color.copy(origin.color);if(dest.emissive&&origin.emissive){dest.emissive.copy(origin.emissive);dest.emissiveIntensity=origin.emissiveIntensity;}});node.visible=opacity>1e-5;
 }
 if(blur)source.forEach(m=>{m.opacity*=1-blur;});
}
