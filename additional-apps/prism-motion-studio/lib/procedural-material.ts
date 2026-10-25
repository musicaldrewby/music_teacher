import * as T from 'three';
import {type ProceduralMaterial,proceduralMaterialSchema,textureKinds} from './procedural-schema';
import {noise,fbm,hash,fract,clamp,smooth,tau} from './procedural-math';

const palettes:Record<typeof textureKinds[number],[string,string,string,number,number,number]>={
 wood:['#7b3516','#cf893f','#25120b',.58,0,0],marble:['#153573','#06cbe3','#051024',.24,.1,0],
 granite:['#626d7b','#c1cbd5','#202632',.82,.05,0],brick:['#912c1a','#d66636','#343441',.85,0,0],
 concrete:['#657587','#a4afba','#283442',.9,0,0],asphalt:['#192334','#3e4b5e','#090e17',.6,.05,0],
 metal:['#68788e','#d6edfa','#1c2a3b',.3,.95,0],rust:['#b85116','#f3a337','#304353',.83,.45,0],
 frost:['#1250a1','#b5e9ff','#021e53',.4,.15,0],lava:['#200b0b','#ff5e00','#ffcc20',.82,.1,2.5],
 woven:['#093e85','#2c95e8','#03152b',.95,0,0],tiles:['#004b75','#00bfd1','#082032',.26,.2,0],
 hexagon:['#262151','#7d2fff','#00d9ff',.3,.65,.4],circuit:['#031b28','#19e3bc','#e1a62a',.32,.6,1.2]
};
export const proceduralMaterialPresets=textureKinds.map(pattern=>{const [colorA,colorB,colorC,roughness,metalness,glow]=palettes[pattern];return {id:pattern,name:({metal:'Brushed metal',wood:'Walnut grain',marble:'Electric marble',hexagon:'Hex alloy',circuit:'Neon circuit'} as Record<string,string>)[pattern]||pattern[0].toUpperCase()+pattern.slice(1),settings:proceduralMaterialSchema.parse({enabled:true,pattern,colorA,colorB,colorC,roughness,metalness,glow})};});

/** Periodic noise and integer-frequency patterns keep opposite tile edges continuous. */
export function materialSample(p:ProceduralMaterial,u:number,v:number){
 const n=fbm(u*4,v*4,p.seed,4,4),fine=noise(u*64,v*64,p.seed+9,64);let value=n,height=n,emission=0;
 switch(p.pattern){
  case 'wood':{const w=Math.sin(tau*(u*7+Math.sin(v*tau)*.3+(n-.5)*1.6));value=.3+.55*Math.pow(Math.abs(w),.35)+fine*.12;height=value*.22;break;}
  case 'marble':{const vein=1-Math.pow(Math.abs(Math.sin(tau*(u*2+v+(n-.5)*3))),.2);value=clamp(vein*1.6+fine*.07);height=value*.06;break;}
  case 'brick':case 'tiles':{const brick=p.pattern==='brick',rows=brick?8:4,cols=4,y=v*rows,row=Math.floor(y),x=u*cols+(brick?(row%2)*.5:0),edge=Math.min(fract(x),1-fract(x),fract(y),1-fract(y)),inside=smooth(.04,.085,edge);value=inside*(.45+hash(Math.floor(x)%cols,row%rows,p.seed)*.4+fine*.15);height=inside*(.65+fine*.08);if(!brick)value=inside*(.55+Math.sin(u*tau)*.13);break;}
  case 'granite':value=clamp(fine*.7+n*.4);height=fine*.45;break;
  case 'concrete':value=n*.7+fine*.3;height=clamp(fine*.3+n*.3-(fine<.2?.2:0));break;
  case 'asphalt':value=clamp(fine*.9+(fine>.83?.14:0));height=fine*.7;break;
  case 'metal':value=.5+.2*Math.sin(v*tau*91)+.12*Math.sin(v*tau*61)+fine*.08;height=value*.18;break;
  case 'rust':value=smooth(.32,.65,n);height=value*.3+fine*.35;break;
  case 'frost':{const a=Math.sin(u*tau*24+Math.sin(v*tau)*3),b=Math.sin((u+v)*tau*24);value=Math.pow(Math.abs(a*b),5)*.7+n*.4;height=value*.65;break;}
  case 'lava':{const cracks=1-smooth(.035,.16,Math.abs(n-.5));value=cracks;height=.7-cracks*.4+fine*.1;emission=cracks;break;}
  case 'woven':{const x=Math.sin(u*tau*32),y=Math.sin(v*tau*32);value=.5+x*.18+y*.18+x*y*.1;height=value;break;}
  case 'hexagon':{const x=u*6,y=v*4,row=Math.floor(y),dx=fract(x+(row%2)*.5)-.5,dy=fract(y)-.5,d=Math.max(Math.abs(dx)*.866+Math.abs(dy)*.5,Math.abs(dy));value=1-smooth(.39,.46,d);height=value*.6;emission=1-value;break;}
  case 'circuit':{const x=u*8,y=v*8,ix=Math.floor(x),iy=Math.floor(y),a=hash(ix%8,iy%8,p.seed),line=a>.5?Math.abs(fract(x)-.5):Math.abs(fract(y)-.5);value=1-smooth(.025,.07,line);height=value*.4;emission=value;break;}
 }
 if(!['lava','hexagon','circuit'].includes(p.pattern))emission=.2+value*.8;
 const wear=smooth(1-p.weathering*.75,1,noise(u*16,v*16,p.seed+321,16));return {value:clamp((value-.5)*p.contrast+.5),height,wear,emission};
}
export function createProceduralMaps(p:ProceduralMaterial,size=256){
 const colors=[p.colorA,p.colorB,p.colorC].map(c=>new T.Color(c)),heights=new Float32Array(size*size),data=[0,1,2,3].map(()=>new Uint8Array(size*size*4)),c=new T.Color(),n=new T.Vector3();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const {value,height,wear,emission}=materialSample(p,x/size,y/size),i=(y*size+x)*4;heights[y*size+x]=height;
  c.copy(colors[0]).lerp(colors[1],value).lerp(colors[2],wear*.6);c.convertLinearToSRGB();data[0][i]=Math.round(c.r*255);data[0][i+1]=Math.round(c.g*255);data[0][i+2]=Math.round(c.b*255);
  const rough=Math.round(clamp(.6+height*.35+wear*.15)*255);data[2][i]=data[2][i+1]=data[2][i+2]=rough;
  c.copy(colors[1]).lerp(colors[2],emission*.4).multiplyScalar(emission).convertLinearToSRGB();data[3][i]=Math.round(clamp(c.r)*255);data[3][i+1]=Math.round(clamp(c.g)*255);data[3][i+2]=Math.round(clamp(c.b)*255);
  for(const d of data)d[i+3]=255;
 }
 const at=(x:number,y:number)=>heights[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;n.set((at(x-1,y)-at(x+1,y))*2.5,(at(x,y-1)-at(x,y+1))*2.5,1).normalize();data[1][i]=Math.round((n.x*.5+.5)*255);data[1][i+1]=Math.round((n.y*.5+.5)*255);data[1][i+2]=Math.round((n.z*.5+.5)*255);}
 const maps=data.map((bytes,i)=>{const t=new T.DataTexture(bytes,size,size,T.RGBAFormat);t.colorSpace=i===0||i===3?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.repeat.setScalar(p.scale);t.center.set(.5,.5);t.rotation=T.MathUtils.degToRad(p.rotation);t.updateMatrix();t.needsUpdate=true;t.userData.procedural=true;return t;});
 return {color:maps[0],normal:maps[1],roughness:maps[2],emission:maps[3]};
}
export function boxProject(geometry:T.BufferGeometry,matrix=new T.Matrix4()){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone(),a=g.getAttribute('position'),uv=new Float32Array(a.count*2),verts=[new T.Vector3(),new T.Vector3(),new T.Vector3()],normal=new T.Vector3(),edge=new T.Vector3();
 for(let i=0;i<a.count;i+=3){for(let j=0;j<3;j++)verts[j].fromBufferAttribute(a,i+j).applyMatrix4(matrix);normal.subVectors(verts[1],verts[0]).cross(edge.subVectors(verts[2],verts[0]));const ax=Math.abs(normal.x),ay=Math.abs(normal.y),az=Math.abs(normal.z);for(let j=0;j<3;j++){const p=verts[j];uv[(i+j)*2]=ay>=ax&&ay>=az?p.x:ax>=az?p.z:p.x;uv[(i+j)*2+1]=ay>=ax&&ay>=az?p.z:p.y;}}
 g.setAttribute('uv',new T.BufferAttribute(uv,2));g.deleteAttribute('tangent');return g;
}
export function applyProceduralMaterial(root:T.Group,p:ProceduralMaterial){
 if(!p.enabled)return;const maps=createProceduralMaps(p),converted=new Map<T.Material,T.MeshStandardMaterial>(),originals=new Set<T.Material>(),oldGeos=new Set<T.BufferGeometry>();root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();
 root.traverse(node=>{if(!(node instanceof T.Mesh))return;let touched=false;const convert=(source:T.Material)=>{
  const surface=source.userData.surface??0;if(p.materialName&&source.name!==p.materialName||p.target!=='all'&&['face','sides','bevel','back'][surface]!==p.target)return source;
  touched=true;let m=converted.get(source);if(m)return m;originals.add(source);m=source instanceof T.MeshStandardMaterial?source.clone():new T.MeshStandardMaterial({opacity:source.opacity,transparent:source.transparent,side:source.side});m.name=source.name;m.color.set('#ffffff');m.vertexColors=false;m.map=maps.color;m.normalMap=maps.normal;m.normalScale.setScalar(p.relief);m.bumpMap=null;m.roughnessMap=maps.roughness;m.roughness=p.roughness;m.metalnessMap=null;m.metalness=p.metalness;m.emissiveMap=p.glow>0?maps.emission:null;m.emissive.set(p.glow>0?'#ffffff':'#000000');m.emissiveIntensity=p.glow;m.userData={...source.userData};delete m.userData.baseEmissive;delete m.userData.baseEmission;converted.set(source,m);return m;
 };node.material=Array.isArray(node.material)?node.material.map(convert):convert(node.material);if(touched&&p.projection==='box'){oldGeos.add(node.geometry);node.geometry=boxProject(node.geometry,inverse.clone().multiply(node.matrixWorld));}});
 const usedM=new Set<T.Material>(),usedG=new Set<T.BufferGeometry>(),usedT=new Set<T.Texture>();root.traverse(n=>{if(n instanceof T.Mesh){usedG.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material]){usedM.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)usedT.add(v);}}});
 oldGeos.forEach(g=>{if(!usedG.has(g))g.dispose();});const orphaned=new Set<T.Texture>();originals.forEach(m=>{if(!usedM.has(m)){for(const v of Object.values(m))if(v instanceof T.Texture&&!usedT.has(v)&&v.userData.procedural)orphaned.add(v);m.dispose();}});Object.values(maps).forEach(t=>{if(!usedT.has(t))orphaned.add(t);});orphaned.forEach(t=>t.dispose());
}
