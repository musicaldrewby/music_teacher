import * as T from 'three';
import {defaultPieceEdit,type PieceEdit,type SetEdits} from './set-edit-schema';
export type PieceInfo={id:string;name:string;depth:number;detail:boolean;duplicate:boolean;parent:string};
type Base={position:T.Vector3;quaternion:T.Quaternion;scale:T.Vector3;visible:boolean};
const snapshot=(node:T.Object3D):Base=>({position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),visible:node.visible});
function hash(text:string){let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return (a>>>0).toString(36)+(b>>>0).toString(36);}
const excluded=(n:T.Object3D)=>n.userData.snowIndex!==undefined||n.userData.globeSnow||n.userData.globeGlass||n.userData.editorHelper;
/** IDs depend on semantic hierarchy and same-name siblings, not mesh allocation order. */
export function indexSetPieces(root:T.Group){
 const entries:{info:PieceInfo;node:T.Object3D}[]=[];const setId=root.userData.setId||'set';
 function walk(parent:T.Object3D,path:string,depth:number,nearest:string){const counts=new Map<string,number>();for(const node of parent.children){if(excluded(node))continue;const label=node.name||node.type,index=counts.get(label)||0;counts.set(label,index+1);const next=path+'/'+label+'#'+index,id=setId+':'+hash(next);const container=node.children.length>0&&parent===root&&(/miniature railway town|toy factory|snow globe/i.test(node.name));const editable=!!node.name&&!container&&(node instanceof T.Mesh||node instanceof T.Group);if(editable){node.userData.setPieceId=id;entries.push({node,info:{id,name:node.name+(index?' '+(index+1):''),depth,detail:nearest!==''||node instanceof T.Mesh,duplicate:false,parent:nearest}});}walk(node,next,depth+(container?0:1),editable?id:nearest);}}
 walk(root,'',0,'');return entries;
}
export class SetPieceController{
 nodes=new Map<string,T.Object3D>();infos:PieceInfo[]=[];private bases=new Map<T.Object3D,Base>();private edits=new Map<T.Object3D,PieceEdit>();private applied=new Set<T.Object3D>();
 constructor(root:T.Group,edits:SetEdits){
  const entries=indexSetPieces(root);for(const {node,info} of entries){this.nodes.set(info.id,node);this.infos.push({...info,name:edits.pieces[info.id]?.name||info.name});}
  // Clone authored geometry before any overrides. Duplicates have their own transforms/material tint.
  for(const copy of edits.duplicates){const source=this.nodes.get(copy.sourceId);if(!source||!source.parent)continue;const node=source.clone(true);node.traverse(child=>delete child.userData.setPieceId);const id='copy:'+copy.id;node.userData.setPieceId=id;source.parent.add(node);this.nodes.set(id,node);this.infos.push({id,name:copy.name||source.name+' copy',depth:0,detail:false,duplicate:true,parent:''});this.edits.set(node,copy);}
  for(const [id,node] of this.nodes){this.bases.set(node,snapshot(node));if(edits.pieces[id])this.edits.set(node,edits.pieces[id]);}
  // Isolate tint materials from shared set materials; nested edits intentionally multiply.
  const originals=new Set<T.Material>(),used=new Set<T.Material>();root.traverse(n=>{if(n instanceof T.Mesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>originals.add(m));});
  for(const [node,edit] of this.edits){if(edit.tint==='#ffffff')continue;const tint=new T.Color(edit.tint),clones=new Map<T.Material,T.Material>();node.traverse(n=>{if(!(n instanceof T.Mesh))return;const recolor=(m:T.Material)=>{let c=clones.get(m);if(!c){c=m.clone();originals.add(c);const colored=c as T.MeshStandardMaterial;colored.color?.multiply(tint);colored.emissive?.multiply(tint);clones.set(m,c);}return c;};n.material=Array.isArray(n.material)?n.material.map(recolor):recolor(n.material);});}
  root.traverse(n=>{if(n instanceof T.Mesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>used.add(m));});originals.forEach(m=>{if(!used.has(m))m.dispose();});
 }
 restore(skip?:T.Object3D){for(const node of this.applied){if(node===skip)continue;const b=this.bases.get(node)!;node.position.copy(b.position);node.quaternion.copy(b.quaternion);node.scale.copy(b.scale);node.visible=b.visible;}this.applied.clear();}
 apply(skip?:T.Object3D){for(const node of this.nodes.values()){if(node===skip)continue;const base=this.bases.get(node)!;base.position.copy(node.position);base.quaternion.copy(node.quaternion);base.scale.copy(node.scale);base.visible=node.visible;const edit=this.edits.get(node);if(!edit)continue;node.position.add(new T.Vector3(...edit.offset));node.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(...edit.rotation.map(v=>v*Math.PI/180) as [number,number,number])));node.scale.multiply(new T.Vector3(...edit.scale));node.visible=node.visible&&edit.visible;this.applied.add(node);}}
 transformEdit(node:T.Object3D):PieceEdit{const base=this.bases.get(node)!;const q=base.quaternion.clone().invert().multiply(node.quaternion),r=new T.Euler().setFromQuaternion(q);return {...defaultPieceEdit(),...this.edits.get(node),offset:node.position.clone().sub(base.position).toArray(),rotation:[r.x*180/Math.PI,r.y*180/Math.PI,r.z*180/Math.PI],scale:node.scale.clone().divide(base.scale).toArray()};}
 pick(node:T.Object3D){let selected='';while(node.parent){const id=node.userData.setPieceId;if(id){selected=id;if(!this.infos.find(p=>p.id===id)?.detail)break;}node=node.parent;}return selected;}
}
