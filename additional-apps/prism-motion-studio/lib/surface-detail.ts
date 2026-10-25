import * as T from 'three';
import type {SurfaceDetail} from './cinematic';

const fract=(v:number)=>v-Math.floor(v),clamp=(v:number)=>Math.max(0,Math.min(1,v));
const hash=(x:number,y:number)=>fract(Math.sin(x*127.1+y*311.7+91.73)*43758.5453);
const wrap=(v:number,n:number)=>((v%n)+n)%n;
function noise(u:number,v:number,n:number){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);const a=hash(wrap(ix,n),wrap(iy,n)),b=hash(wrap(ix+1,n),wrap(iy,n)),c=hash(wrap(ix,n),wrap(iy+1,n)),d=hash(wrap(ix+1,n),wrap(iy+1,n));return (a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy;}
function height(pattern:SurfaceDetail['pattern'],u:number,v:number){
 const grain=noise(u,v,64),soft=noise(u,v,8),tau=Math.PI*2;
 switch(pattern){
  case 'brushed':return .5+.15*Math.sin(tau*(v*79+.04*Math.sin(u*tau)))+.11*Math.sin(tau*v*103)+grain*.04;
  case 'scratched':{let groove=0;for(let i=0;i<12;i++){const line=Math.abs(fract(u*(i%3+1)+v*(i%2?7:1)+hash(i,4))-.5);groove+=Math.exp(-line*line*180000)*(.12+hash(i,2)*.2);}return .55-groove+grain*.07;}
  case 'hammered':{const x=u*12,y=v*12;let distance=2;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const ix=Math.floor(x)+a,iy=Math.floor(y)+b,px=ix+hash(wrap(ix,12),wrap(iy,12))*.7+.15,py=iy+hash(wrap(iy,12)+20,wrap(ix,12))*.7+.15;distance=Math.min(distance,Math.hypot(x-px,y-py));}return .25+.45*(1-Math.exp(-distance*distance*5))+grain*.015;}
  case 'enamel':return .45+noise(u,v,32)*.1+grain*.025;
  case 'fingerprints':{let ridges=0;for(let i=0;i<3;i++){const x=fract(u-hash(i,5)+.5)-.5,y=fract(v-hash(i,6)+.5)-.5,r=Math.hypot(x*1.5,y);const envelope=Math.max(0,1-r/.27)**2;ridges+=Math.sin(r*230+Math.atan2(y,x)*.3)*envelope*.17;}return .5+ridges+soft*.04;}
  case 'woven':{const x=Math.sin(u*tau*32),y=Math.sin(v*tau*32);return .5+.13*x+.13*y+.1*x*y;}
 }
}
export function createDetailMaps(detail:Pick<SurfaceDetail,'pattern'|'scale'|'rotation'>,size=256){
 const heights=new Float32Array(size*size),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)heights[y*size+x]=height(detail.pattern,x/size,y/size);
 const sample=(x:number,y:number)=>heights[wrap(y,size)*size+wrap(x,size)],n=new T.Vector3();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;n.set((sample(x-1,y)-sample(x+1,y))*2.5,(sample(x,y-1)-sample(x,y+1))*2.5,1).normalize();normal[i]=Math.round((n.x*.5+.5)*255);normal[i+1]=Math.round((n.y*.5+.5)*255);normal[i+2]=Math.round((n.z*.5+.5)*255);normal[i+3]=255;const value=Math.round((.62+clamp(sample(x,y))*.38)*255);rough[i]=rough[i+1]=rough[i+2]=value;rough[i+3]=255;}
 const texture=(data:Uint8Array)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=T.NoColorSpace;t.repeat.set(detail.scale,detail.scale);t.center.set(.5,.5);t.rotation=T.MathUtils.degToRad(detail.rotation);t.needsUpdate=true;t.updateMatrix();return t;};
 return {normal:texture(normal),roughness:texture(rough)};
}
export type DetailMaps=ReturnType<typeof createDetailMaps>;
export function detailApplies(detail:SurfaceDetail,surface:number,isProp=false){return detail.enabled&&(isProp||detail.target==='all'||['face','sides','bevel','back'][surface]===detail.target);}
export function applySurfaceDetail(material:T.MeshPhysicalMaterial,detail:SurfaceDetail,maps:DetailMaps){
 material.normalMap=maps.normal;material.normalScale.setScalar(detail.strength);material.roughnessMap=maps.roughness;material.roughness=detail.roughness;material.metalness=detail.metalness;material.clearcoat=detail.clearcoat;material.clearcoatRoughness=detail.coatRoughness;material.clearcoatNormalMap=maps.normal;material.clearcoatNormalScale.setScalar(detail.strength*.35);material.needsUpdate=true;
}
export function disposeDetailMaps(maps:DetailMaps){maps.normal.dispose();maps.roughness.dispose();}
