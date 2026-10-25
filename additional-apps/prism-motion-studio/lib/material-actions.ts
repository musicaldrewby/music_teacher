import type {Obj} from './scene';
export type MaterialSurface='all'|'material'|'sideMaterial'|'bevelMaterial'|'backMaterial';
export const surfaceFields=['material','sideMaterial','bevelMaterial','backMaterial'] as const;
export function supportsMaterialLibrary(o:Obj){return o.type==='text'||o.type==='prop'&&!['train','factory-parcel','factory-wagon','procedural'].includes(o.prop);}
const targetFor={material:'face',sideMaterial:'sides',bevelMaterial:'bevel',backMaterial:'back'};
export function materialChoice(o:Obj,id:string,surface:MaterialSurface):Partial<Obj>{
 const all=surface==='all'||o.type==='prop',target=surface==='all'?'all':targetFor[surface];
 const overlaps=(detail:{target:string})=>all||detail.target==='all'||detail.target===target;
 return {...(all?{material:id,sideMaterial:id,bevelMaterial:id,backMaterial:id}:{[surface]:id}),tint:'#ffffff',
  surfaceDetail:{...o.surfaceDetail,enabled:o.surfaceDetail.enabled&&!overlaps(o.surfaceDetail)},
  proceduralMaterial:{...o.proceduralMaterial,enabled:o.proceduralMaterial.enabled&&!overlaps(o.proceduralMaterial)}};
}
export function materialSelected(o:Obj|undefined,id:string,surface:MaterialSurface){
 if(!o||!supportsMaterialLibrary(o))return false;
 const all=surface==='all'&&o.type==='text',target=surface==='all'?'all':targetFor[surface];
 const overlaps=(detail:{enabled:boolean;target:string})=>detail.enabled&&(surface==='all'||o.type==='prop'||detail.target==='all'||detail.target===target);
 if(overlaps(o.surfaceDetail)||overlaps(o.proceduralMaterial))return false;
 return all?surfaceFields.every(key=>o[key]===id):o[o.type==='prop'||surface==='all'?'material':surface]===id;
}
