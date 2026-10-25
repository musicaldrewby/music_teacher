import * as T from 'three';
import type {MaterialPreset} from './material-presets';
import {createMaterialMaps,createStudioMaterial,disposeMaterialMaps,needsMaterialMaps} from './material-surfaces';
import {buildLighting,createLightingEnvironment,disposeLighting} from './lighting';
import {applyLightingPreset} from './lighting-actions';
import {blankScene} from './scene';

export const materialSwatches=new Map<string,string>();
/** One temporary renderer, one swatch per frame, then release its GPU context. */
export function renderMaterialSwatches(presets:MaterialPreset[],ready:(id:string,url:string)=>void){
 const pending=presets.filter(p=>!materialSwatches.has(p.id));
 if(!pending.length)return ()=>{};
 let frame=0,closed=false,renderer:T.WebGLRenderer|undefined,env:T.WebGLRenderTarget|undefined,hdr:T.DataTexture|undefined,rig:T.Group|undefined,geometry:T.SphereGeometry|undefined,floor:T.Mesh<T.PlaneGeometry,T.MeshStandardMaterial>|undefined;
 const release=()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);rig&&disposeLighting(rig);env?.dispose();hdr?.dispose();geometry?.dispose();floor?.geometry.dispose();floor?.material.dispose();renderer?.dispose();renderer?.forceContextLoss();};
 frame=requestAnimationFrame(()=>{
  try{
   renderer=new T.WebGLRenderer({alpha:false,antialias:true});renderer.setPixelRatio(1);renderer.setSize(160,140);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   const settings=applyLightingPreset(blankScene(),'product');settings.shadows.quality=1024;
   const world=new T.Scene();world.background=new T.Color('#202a34');rig=buildLighting(settings);world.add(rig);
   hdr=createLightingEnvironment(settings);const pm=new T.PMREMGenerator(renderer);try{env=pm.fromEquirectangular(hdr);}finally{pm.dispose();}world.environment=env.texture;world.environmentIntensity=.85;
   const camera=new T.PerspectiveCamera(36,160/140,.1,30);camera.position.set(0,.3,3.8);camera.lookAt(0,-.02,0);
   geometry=new T.SphereGeometry(.86,48,32);floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#38424a',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-.88;floor.receiveShadow=true;world.add(floor);
   const next=()=>{
    if(closed)return;const p=pending.shift();if(!p){release();return;}
    let material:T.MeshPhysicalMaterial|undefined,maps:ReturnType<typeof createMaterialMaps>|undefined,mesh:T.Mesh|undefined;
    try{
     if(needsMaterialMaps(p))maps=createMaterialMaps(p);material=createStudioMaterial(p,'#ffffff',1,maps);mesh=new T.Mesh(geometry,material);mesh.castShadow=true;world.add(mesh);renderer!.render(world,camera);
     const url=renderer!.domElement.toDataURL('image/png');materialSwatches.set(p.id,url);ready(p.id,url);
    }catch{release();return;}finally{mesh?.removeFromParent();material?.dispose();if(maps)disposeMaterialMaps(maps);}
    frame=requestAnimationFrame(next);
   };next();
  }catch{release();} // Color chips remain usable if WebGL is unavailable.
 });
 return release;
}
