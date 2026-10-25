import * as T from 'three';
import type {Shot} from './scene';
import {boxCorners} from './layout';
export function moveShot(shots:Shot[],id:string,to:number){const from=shots.findIndex(s=>s.id===id);if(from<0||to<0||to>=shots.length)return shots;const next=[...shots],item=next.splice(from,1)[0];next.splice(to,0,item);return next;}
function visible(node:T.Object3D){let p:T.Object3D|null=node;while(p){if(!p.visible||p.userData.editorHelper)return false;p=p.parent;}return true;}
export function inspectShotFrame(world:T.Scene,camera:T.PerspectiveCamera,titles:{name:string;node:T.Object3D}[]){
 world.updateMatrixWorld(true);camera.updateMatrixWorld(true);const warnings:string[]=[],origin=camera.getWorldPosition(new T.Vector3()),ray=new T.Raycaster();
 for(const {name,node} of titles){if(!visible(node))continue;const box=new T.Box3().setFromObject(node);if(box.isEmpty())continue;
  if(boxCorners(box).some(p=>{const view=p.clone().applyMatrix4(camera.matrixWorldInverse),ndc=p.project(camera);return view.z>=-camera.near||Math.abs(ndc.x)>.84||Math.abs(ndc.y)>.84;}))warnings.push(`${name}: leaves the title-safe area`);
  const center=box.getCenter(new T.Vector3()),direction=center.clone().sub(origin),distance=direction.length();ray.set(origin,direction.normalize());ray.far=Math.max(0,distance-.05);
  const obstruction=ray.intersectObjects(world.children,true).find(hit=>{let p:T.Object3D|null=hit.object;while(p){if(p===node)return false;p=p.parent;}if(!visible(hit.object)||!(hit.object instanceof T.Mesh))return false;return (Array.isArray(hit.object.material)?hit.object.material:[hit.object.material]).some(m=>m.visible&&m.opacity>.95&&!m.transparent&&!(m as T.MeshPhysicalMaterial).transmission);});
  if(obstruction)warnings.push(`${name}: possible obstruction by ${obstruction.object.name||'a scene object'}`);
 }
 return [...new Set(warnings)];
}
