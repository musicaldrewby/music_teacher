import * as T from 'three';
import type {Scene,Vec} from './scene';
export type LightField='position'|'target';
export const lightHandleId=(id:string,field:LightField)=>`light:${id}:${field}`;
export function authorLightPoint(scene:Scene,id:string,field:LightField,world:T.Vector3,rig:T.Object3D,time:number):Vec {
 rig.updateWorldMatrix(true,false);const result=rig.worldToLocal(world.clone());
 const index=scene.manualRig.lights.findIndex(l=>l.id===id),spec=scene.manualRig.lights[index];
 if(field==='target'&&spec?.kind==='spot'&&scene.lightingSettings.motion==='sweep'){
  const phase=time/scene.duration*Math.PI*2*scene.lightingSettings.speed;
  result.x-=Math.sin(phase+index*1.7)*2;result.y-=Math.cos(phase+index)*.5;
 }
 return result.toArray().map(v=>T.MathUtils.clamp(v,-10000,10000)) as Vec;
}
function disposeNode(node:T.Object3D){node.traverse(n=>{if(n instanceof T.Mesh||n instanceof T.Line){n.geometry.dispose();(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());}});node.removeFromParent();}
export class LightHandles{
 root=new T.Group();nodes=new Map<string,T.Group>();private lines=new Map<string,T.Line>();enabled=true;
 constructor(){this.root.name='Light editor handles';this.root.userData.editorHelper=true;}
 private make(id:string,field:LightField,color:string){
  const g=new T.Group();g.name=field==='position'?'Move light':'Aim light';g.userData={id:lightHandleId(id,field),lightId:id,lightField:field,editorHelper:true};
  const mat=new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,opacity:.95});
  const ball=new T.Mesh(field==='position'?new T.IcosahedronGeometry(.18,1):new T.OctahedronGeometry(.13),mat);ball.renderOrder=1001;g.add(ball);
  const ring=new T.Mesh(new T.TorusGeometry(field==='position'?.28:.22,.02,5,24),mat.clone());ring.renderOrder=1001;g.add(ring);
  this.root.add(g);this.nodes.set(g.userData.id,g);return g;
 }
 update(scene:Scene,rig:T.Group,selected:string,dragged?:T.Object3D,time=0,camera?:T.Camera){
  const active=scene.manualRig.mode==='custom';this.root.visible=this.enabled&&active;if(!this.enabled)return;
  const wanted=new Set<string>();
  for(const spec of active?scene.manualRig.lights:[]){
   const light=rig.children.find(n=>n.userData.lightId===spec.id) as T.PointLight|T.SpotLight|T.DirectionalLight|undefined;if(!light)continue;
   const fields:LightField[]=spec.kind==='point'?['position']:['position','target'];
   for(const field of fields){const id=lightHandleId(spec.id,field);wanted.add(id);const node=this.nodes.get(id)||this.make(spec.id,field,spec.color);
    const point=field==='position'?light:!(light instanceof T.PointLight)?light.target:light;
    if(dragged===node){const author=authorLightPoint(scene,spec.id,field,node.getWorldPosition(new T.Vector3()),rig,time);point.position.fromArray(author);
     // Keep the current sweep offset in the preview, while the saved value remains authored.
     if(field==='target'&&light instanceof T.SpotLight&&scene.lightingSettings.motion==='sweep'){
      const index=scene.manualRig.lights.indexOf(spec),p=time/scene.duration*Math.PI*2*scene.lightingSettings.speed;point.position.x+=Math.sin(p+index*1.7)*2;point.position.y+=Math.cos(p+index)*.5;
     }
    }else node.position.copy(point.getWorldPosition(new T.Vector3()));
    const size=camera?T.MathUtils.clamp(camera.getWorldPosition(new T.Vector3()).distanceTo(node.position)*.075,.45,60):1;node.scale.setScalar(size*(id===selected?1.3:1));node.traverse(n=>{if(n instanceof T.Mesh){const m=n.material as T.MeshBasicMaterial;m.color.set(spec.enabled?spec.color:'#77808c');m.opacity=id===selected?1:.8;}});
   }
   if(!(light instanceof T.PointLight)){
    let line=this.lines.get(spec.id);if(!line){line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:spec.color,depthTest:false,transparent:true,opacity:.55,depthWrite:false}));line.renderOrder=1000;this.lines.set(spec.id,line);this.root.add(line);}
    const points=line.geometry.getAttribute('position') as T.BufferAttribute;const a=light.getWorldPosition(new T.Vector3()),b=light.target.getWorldPosition(new T.Vector3());points.setXYZ(0,...a.toArray());points.setXYZ(1,...b.toArray());points.needsUpdate=true;line.geometry.computeBoundingSphere();(line.material as T.LineBasicMaterial).color.set(spec.color);
   }
  }
  for(const [id,node] of this.nodes)if(!wanted.has(id)){disposeNode(node);this.nodes.delete(id);}
  for(const [id,line] of this.lines)if(!active||!scene.manualRig.lights.some(l=>l.id===id&&l.kind!=='point')){disposeNode(line);this.lines.delete(id);}
 }
 pick(ray:T.Raycaster){if(!this.root.visible)return undefined;this.root.updateWorldMatrix(true,true);const hit=ray.intersectObjects([...this.nodes.values()],true)[0];let node:T.Object3D|null=hit?.object||null;while(node&&!node.userData.lightId)node=node.parent;return node?.userData.id as string|undefined;}
 edit(node:T.Object3D,scene:Scene,rig:T.Group,time:number){return {id:node.userData.lightId as string,field:node.userData.lightField as LightField,value:authorLightPoint(scene,node.userData.lightId,node.userData.lightField,node.getWorldPosition(new T.Vector3()),rig,time)};}
 dispose(){for(const n of [...this.root.children])disposeNode(n);this.nodes.clear();this.lines.clear();this.root.removeFromParent();}
}
