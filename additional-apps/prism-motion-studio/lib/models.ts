import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export function decodeData(data:string):ArrayBuffer{const raw=atob(data.split(',')[1]||'');return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
export function validateGLB(buffer:ArrayBuffer){
 if(buffer.byteLength>4_000_000)throw Error('Choose a GLB smaller than 4 MB.');
 const view=new DataView(buffer);if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('This is not a valid GLB 2.0 file.');
 const length=view.getUint32(12,true);if(view.getUint32(16,true)!==0x4e4f534a||length+20>buffer.byteLength)throw Error('The GLB JSON chunk is damaged.');
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
 for(const item of [...(json.buffers||[]),...(json.images||[])])if(item.uri&&!item.uri.startsWith('data:'))throw Error('Embed every texture and buffer in the GLB before importing.');
 if((json.extensionsRequired||[]).some((e:string)=>/draco|meshopt|basisu/i.test(e)))throw Error('Export an uncompressed GLB without Draco, Meshopt or KTX2 textures.');
 if(json.skins?.length||json.animations?.length)throw Error('Import a static GLB. Animate its layer using Prism motion paths and keyframes.');
 let triangles=0;for(const mesh of json.meshes||[])for(const p of mesh.primitives||[]){if(p.mode!==undefined&&p.mode!==4)throw Error('GLB models must use triangle meshes.');triangles+=(json.accessors?.[p.indices??p.attributes?.POSITION]?.count||0)/3;}
 if(triangles>300_000)throw Error('Use a GLB with fewer than 300,000 triangles.');
 return json;
}
export async function loadModel(data:string){
 const bytes=decodeData(data);validateGLB(bytes);const gltf=await new GLTFLoader().parseAsync(bytes,'');const root=new T.Group();root.add(gltf.scene);
 const box=new T.Box3().setFromObject(root);if(box.isEmpty()){disposeModel(root);throw Error('This GLB has no visible geometry.');}
 const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const max=Math.max(size.x,size.y,size.z);if(!Number.isFinite(max)||max<.000001){disposeModel(root);throw Error('This GLB has invalid bounds.');}
 gltf.scene.position.sub(center);gltf.scene.scale.multiplyScalar(3/max);gltf.scene.position.multiplyScalar(3/max);
 root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])m.userData.baseOpacity=m.opacity;}});
 root.userData.importedModel=true;return root;
}
export function disposeModel(root:T.Object3D){const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);}}});geos.forEach(g=>g.dispose());textures.forEach(t=>{t.dispose();if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)t.image.close();});mats.forEach(m=>m.dispose());}
