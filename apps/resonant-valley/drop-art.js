import * as THREE from './vendor/three.module.min.js';
import {BLOCKS,FURNITURE,ITEMS} from './data.js';
import {faceUVs} from './atlas-layout.js';
import {isLeaf} from './visuals.js';
import {isTrack} from './railway.js';
import {makeTrackMesh} from './track-mesh.js';
import {caveMaterial} from './cave-material.js';

const blockWidth=.34,objectWidth=.43;
const faceShade=[.86,.72,1,.55,.9,.78];

function blockModel(id,atlas){
 const g=new THREE.BoxGeometry(blockWidth,blockWidth,blockWidth),uv=g.getAttribute('uv');
 const tint=new THREE.Color(atlas?0xffffff:BLOCKS[id].color),color=[];
 for(let face=0;face<6;face++){
  const cap=face===2||face===3;
  let tile=id-1;
  if(id===1&&face!==2)tile=face===3?1:30;
  else if(cap&&(id===4||id===15||id===26))tile=31;
  const [bl,br,tl]=faceUVs[tile][0];
  for(let i=face*4;i<face*4+4;i++){
   uv.setXY(i,bl[0]+uv.getX(i)*(br[0]-bl[0]),bl[1]+uv.getY(i)*(tl[1]-bl[1]));
   const shade=faceShade[face];color.push(tint.r*shade,tint.g*shade,tint.b*shade);
  }
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));g.clearGroups();return g;
}

// Bake the game's own placed model once per kind. Keys, rails, and drumheads
// share a draw call; only printed faces need their own texture.
function miniature(source,stylesFor){
 const batches=new Map(),point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 const geoSet=new Set(),matSet=new Set(),bounds=new THREE.Box3();
 source.updateMatrixWorld(true);
 source.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  const g=mesh.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),c=g.getAttribute('color'),uv=g.getAttribute('uv');
  const mat=mesh.material,style=stylesFor(mat.map,mesh.userData.ownedSleeveTexture),count=g.index?.count??p.count;
  if(!batches.has(style))batches.set(style,{positions:[],normals:[],colors:[],uvs:[]});
  const b=batches.get(style);normalMatrix.getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<count;i++){
   const v=g.index?g.index.getX(i):i;
   point.fromBufferAttribute(p,v).applyMatrix4(mesh.matrixWorld);bounds.expandByPoint(point);
   normal.fromBufferAttribute(n,v).applyNormalMatrix(normalMatrix);
   b.positions.push(point.x,point.y,point.z);b.normals.push(normal.x,normal.y,normal.z);
   b.colors.push(mat.color.r*(c?c.getX(v):1),mat.color.g*(c?c.getY(v):1),mat.color.b*(c?c.getZ(v):1));
   if(mat.map)b.uvs.push(uv.getX(v),uv.getY(v));
  }
 });
 source.traverse(o=>{if(o.isMesh){geoSet.add(o.geometry);matSet.add(o.material);}});
 for(const g of geoSet)g.dispose();for(const m of matSet)m.dispose();
 const middle=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const scale=objectWidth/Math.max(size.x,size.y,size.z,.01),parts=[];
 for(const [style,b] of batches){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.colors,3));
  if(b.uvs.length)g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2));
  g.translate(-middle.x,-middle.y,-middle.z);g.scale(scale,scale,scale);parts.push({geometry:g,style});
 }
 return parts;
}

const lightStep=n=>Math.min(15,Math.max(0,Math.round(n*15)));
export class DropArt{
 constructor(world){
  this.world=world;this.models=new Map();this.styles=new Set();this.paper=new Map();this.ownedTextures=new Set();
  const map=world.atlas||null;
  this.terrain=this.style({map});this.leaves=this.style({map,alphaTest:.5,side:THREE.DoubleSide});
  this.glass=this.style({map,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide});this.solid=this.style({});
 }
 style(options){const s={options,shades:new Map()};this.styles.add(s);return s;}
 model(item){
  if(Object.hasOwn(BLOCKS,item)){
   const id=Number(item);return [{geometry:blockModel(id,this.world.atlas),style:isLeaf(id)?this.leaves:id===8?this.glass:this.terrain}];
  }
  const rail=isTrack(item),e={type:item,x:0,y:0,z:0,r:0};
  if(!rail&&!Object.hasOwn(FURNITURE,item))throw new Error('No placed pickup model for '+item);
  const source=rail?makeTrackMesh(this.world,[e]):this.world.entityModel(e);
  return miniature(source,(map,ownedTexture)=>{
   if(!map)return this.solid;
   if(ownedTexture)this.ownedTextures.add(ownedTexture);
   if(!this.paper.has(map))this.paper.set(map,this.style({map,side:THREE.DoubleSide}));
   return this.paper.get(map);
  });
 }
 create(item){
  const id=String(item);
  if(!this.models.has(id))this.models.set(id,this.model(id));
  const root=new THREE.Group();root.name='Dropped '+ITEMS[id].name;
  for(const part of this.models.get(id)){
   const mesh=new THREE.Mesh(part.geometry,this.material(part.style,15,0));
   mesh.userData.dropStyle=part.style;mesh.receiveShadow=true;root.add(mesh);
  }
  root.userData.dropLight=15*16;return root;
 }
 material(style,sky,glow){
  const key=sky*16+glow;
  if(!style.shades.has(key)){
   const m=new THREE.MeshLambertMaterial({vertexColors:true,...style.options});
   caveMaterial(m,{light:{value:new THREE.Vector2(sky/15,glow/15)}});style.shades.set(key,m);
  }
  return style.shades.get(key);
 }
 setLight(root,sky,glow){
  const s=lightStep(sky),g=lightStep(glow),key=s*16+g;
  if(root.userData.dropLight===key)return;
  for(const mesh of root.children)mesh.material=this.material(mesh.userData.dropStyle,s,g);
  root.userData.dropLight=key;
 }
 dispose(){
  for(const parts of this.models.values())for(const part of parts)part.geometry.dispose();
  for(const style of this.styles){for(const m of style.shades.values())m.dispose();style.shades.clear();}
  for(const texture of this.ownedTextures)texture.dispose();
  this.models.clear();this.paper.clear();this.ownedTextures.clear();
 }
}
