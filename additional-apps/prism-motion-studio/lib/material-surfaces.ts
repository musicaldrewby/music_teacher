import * as T from 'three';
import type {MaterialPreset} from './material-presets';

const tau=Math.PI*2,fract=(v:number)=>v-Math.floor(v),wrap=(v:number,n:number)=>(v%n+n)%n;
const hash=(x:number,y:number)=>fract(Math.sin(x*127.1+y*311.7+19)*43758.5453);
function noise(u:number,v:number,n:number){
 const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
 const at=(dx:number,dy:number)=>hash(wrap(ix+dx,n),wrap(iy+dy,n));
 return T.MathUtils.lerp(T.MathUtils.lerp(at(0,0),at(1,0),a),T.MathUtils.lerp(at(0,1),at(1,1),a),b);
}
export type MaterialMaps={color:T.DataTexture;normal:T.DataTexture;roughness:T.DataTexture};
/** Periodic color, normal and roughness maps; no canvas, random state or image downloads. */
export function createMaterialMaps(p:MaterialPreset,size=256):MaterialMaps {
 const heights=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 const base=new T.Color(p.color).convertLinearToSRGB();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,low=noise(u,v,4),mid=noise(u,v,16),fine=noise(u,v,96);let shade=1,h=.5,rough=.95;
  switch(p.grain||p.texture){
   case 'wood':{const flow=v*18+noise(u,v,4)*1.7+.25*Math.sin(u*tau),ring=Math.pow(.5+.5*Math.sin(flow*tau),9),fibers=Math.pow(.5+.5*Math.sin(tau*(v*93+.25*Math.sin(u*tau))),12);shade=.78+.2*low-.25*ring-.07*fibers;h=.5-.18*ring-.06*fibers;rough=.8+.16*mid;break;}
   case 'marble':{const flow=u+v*2+low*.75+mid*.15,vein=Math.exp(-Math.pow(Math.sin(flow*tau)*19,2));shade=.91+.07*low-.4*vein;h=.5-.025*vein;rough=.8+.18*vein;break;}
   case 'stone':{const pores=Math.pow(fine,9);shade=.8+.15*low+.1*mid-.24*pores;h=.35+.23*mid+.12*fine-.28*pores;rough=.83+.17*fine;break;}
   case 'fabric':{const a=Math.sin(u*tau*48),b=Math.sin(v*tau*48),weave=(a+b+a*b)*.12;shade=.86+weave*.28+fine*.08;h=.5+weave;rough=.9+.1*fine;break;}
   case 'brushed':{const line=Math.sin(tau*(v*79+.025*Math.sin(u*tau)))*.07+Math.sin(v*tau*101)*.045;shade=.96+line*.1;h=.5+line;rough=.78+fine*.08+line;break;}
   case 'enamel':{shade=.99;h=.5+(fine-.5)*.035;rough=.94+mid*.06;break;}
   case 'checker':{shade=(Math.floor(u*8)+Math.floor(v*8))%2?.13:1;break;}
   case 'stripes':{shade=fract((u+v)*6)<.45?1:.4;break;}
  }
  const i=(y*size+x)*4;heights[y*size+x]=h;
  color[i]=Math.round(T.MathUtils.clamp(base.r*shade,0,1)*255);color[i+1]=Math.round(T.MathUtils.clamp(base.g*shade,0,1)*255);color[i+2]=Math.round(T.MathUtils.clamp(base.b*shade,0,1)*255);color[i+3]=255;
  roughness[i]=roughness[i+1]=roughness[i+2]=Math.round(T.MathUtils.clamp(rough,0,1)*255);roughness[i+3]=255;
 }
 const at=(x:number,y:number)=>heights[wrap(y,size)*size+wrap(x,size)],n=new T.Vector3();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;n.set((at(x-1,y)-at(x+1,y))*2,(at(x,y-1)-at(x,y+1))*2,1).normalize();
  normal[i]=Math.round((n.x*.5+.5)*255);normal[i+1]=Math.round((n.y*.5+.5)*255);normal[i+2]=Math.round((n.z*.5+.5)*255);normal[i+3]=255;
 }
 const map=(data:Uint8Array,srgb=false)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(.65,.65);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 return {color:map(color,true),normal:map(normal),roughness:map(roughness)};
}
export function needsMaterialMaps(p:MaterialPreset){return !!p.grain||['checker','stripes'].includes(p.texture);}
export function createStudioMaterial(p:MaterialPreset,tint='#ffffff',opacity=1,maps?:MaterialMaps){
 const material=new T.MeshPhysicalMaterial({color:new T.Color(p.color).multiply(new T.Color(tint)),metalness:p.metalness,roughness:p.roughness,clearcoat:p.clearcoat??0,clearcoatRoughness:p.coatRoughness??.2,transparent:opacity<1,opacity});
 if(p.texture==='glass'){material.transmission=p.transmission??.94;material.thickness=.65;material.ior=p.ior??1.5;}
 if(p.texture==='iridescent'){material.iridescence=p.iridescence??1;material.iridescenceIOR=1.35;}
 if(p.texture==='neon'){material.emissive.set(p.color);material.emissiveIntensity=2.2;}
 if(p.grain==='fabric'){material.sheen=.35;material.sheenColor.set(p.color);material.sheenRoughness=.8;}
 if(maps){material.map=maps.color;material.color.set(tint);material.normalMap=maps.normal;material.normalScale.setScalar(p.grain==='fabric'?.6:p.grain==='stone'?.35:.22);material.roughnessMap=maps.roughness;}
 return material;
}
export function disposeMaterialMaps(maps:MaterialMaps){Object.values(maps).forEach(t=>t.dispose());}
