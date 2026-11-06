import {buildOpeningFurniture} from './opening-art.js';
import {Railway,cartPose,TRACK_LIMIT} from './railway.js';
import {makeTrackMesh} from './track-mesh.js';
import {CABIN_PARTS,buildCabinPart,buildCart,signData} from './cabin-parts.js';
import {WeatherTraces} from './weather-traces.js';
import {TerrainBlend,blendMaterial,markChunk} from './terrain-blend.js';
import {Horizon} from './horizon.js';
import {Atmosphere} from './atmosphere.js';
import {SkyScene} from './sky-scene.js';
import {WorldFeedback} from './world-feedback.js';
import {Exploration} from './exploration.js';
import {protectExisting} from './landmarks.js';
import {BreakOverlay} from './break-overlay.js';

import {createAtlasCanvas} from './textures.js';
import {createWaterMaterial} from './water-material.js';
import {traceBlocks} from './block-pick.js';
import {crateContents,sleeveFor,sleeveBytes} from './record-sleeve.js';
import {caveMaterial} from './cave-material.js';
import {GroundDrops,DROP_LIMIT} from './ground-drops.js';
import {HeldEquipment} from './held-equipment.js';
import {characterSettings} from './character-style.js';
import {CharacterAvatar} from './character-avatar.js';
import {PlayerCamera} from './player-camera.js';
import {discoverySites,discoveryKey,FIRST_CASE_VERSION} from './discovery-sites.js';
import * as THREE from './vendor/three.module.min.js';
import {BLOCKS,FURNITURE,uid} from './data.js';
import {TerrainGenerator,MIN_Y,MAX_Y,SEA_LEVEL,WATER,WORLD_LIMIT,GENERATOR_VERSION,solid,chunkAt,voxelIndex,BIOMES} from './terrain.js';
import {TerrainStream} from './terrain-stream.js';
import {prepareView} from './frame-work.js';
export class World{
 constructor(container){
  this.container=container;this.chunks=new Map();this.entities=[];this.entityMeshes=new Map();this.stream=null;this.time='cycle';this.rotation=0;this.viewDistance=3;this.streamingError=null;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b6dce6');this.scene.fog=new THREE.Fog('#b6dce6',40,108);
  this.camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.06,256);this.camera.rotation.order='YXZ';
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=1;container.appendChild(this.renderer.domElement);
  this.hemi=new THREE.HemisphereLight('#e9f5ff','#a59b7c',2.05);this.scene.add(this.hemi);this.sun=new THREE.DirectionalLight('#ffecd1',3.1);this.sun.position.set(-24,50,24);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:1,far:115});this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.035;this.scene.add(this.sun);this.sun.target.position.set(0,0,-8);this.scene.add(this.sun.target);
  this.atlas=new THREE.CanvasTexture(createAtlasCanvas());this.atlas.magFilter=THREE.NearestFilter;this.atlas.minFilter=THREE.LinearMipmapLinearFilter;this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.anisotropy=4;this.material=new THREE.MeshLambertMaterial({map:this.atlas,vertexColors:true});this.glassMaterial=new THREE.MeshLambertMaterial({map:this.atlas,vertexColors:true,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide});
  this.leafMaterial=new THREE.MeshLambertMaterial({map:this.atlas,vertexColors:true,alphaTest:.5,side:THREE.DoubleSide});
  this.leafDepthMaterial=new THREE.MeshDepthMaterial({map:this.atlas,alphaTest:.5,depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  this.leafDistanceMaterial=new THREE.MeshDistanceMaterial({map:this.atlas,alphaTest:.5,side:THREE.DoubleSide});
  this.ray=new THREE.Raycaster();this.outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),new THREE.LineBasicMaterial({color:'#fff6dc',transparent:true,opacity:.8}));this.outline.visible=false;this.scene.add(this.outline);
  this.makeEnvironment();caveMaterial(this.material,{attributes:true});caveMaterial(this.glassMaterial,{attributes:true});caveMaterial(this.floraMaterial,{attributes:true});caveMaterial(this.leafMaterial,{attributes:true});
  this.windUniform={value:0};for(const material of [this.floraMaterial,this.leafMaterial,this.leafDepthMaterial,this.leafDistanceMaterial]){const compile=material.onBeforeCompile,cache=material.customProgramCacheKey();material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);shader.uniforms.valleyWind=this.windUniform;shader.vertexShader='uniform float valleyWind;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(position.y*.7+position.z*.48+valleyWind)*.025;');};material.customProgramCacheKey=()=>cache+'-wind';}
  this.detailBlend=new TerrainBlend();
  this.terrainDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});this.terrainDistance=new THREE.MeshDistanceMaterial();
  for(const m of [this.material,this.glassMaterial,this.leafMaterial,this.floraMaterial,this.waterMaterial,this.terrainDepth,this.terrainDistance,this.leafDepthMaterial,this.leafDistanceMaterial])blendMaterial(m,this.detailBlend);
  this.atmosphere=new Atmosphere('Resonant Valley');this.skyScene=new SkyScene(this);this.horizon=new Horizon(this);this.traces=new WeatherTraces(this);this.detailRevision=0;this.feedback=new WorldFeedback(this.scene);
  this.drops=new GroundDrops(this);this.breakOverlay=new BreakOverlay(this.scene);this.hands=new HeldEquipment(this.scene,this.camera);this.heldState={};this.lastEntityLight=-1;
  this.playerState={eyeHeight:1.66,visible:false};this.playerCamera=new PlayerCamera(this);this.avatar=new CharacterAvatar(this);this.setCharacter({});this.renderCamera=this.camera;
  addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
 }
 get seed(){return this.stream?.generator.seed||'';}
 get generator(){return this.stream?.generator;}
 get edits(){return this.stream?.edits||new Map();}
 get(x,y,z){return this.stream?.get(Math.floor(x),Math.floor(y),Math.floor(z))||0;}
 set(x,y,z,id){const ok=this.stream?.set(x,y,z,id)||false;if(ok){this.horizon?.invalidate(x,z);const c=this.stream.loaded.get(chunkAt(x,z));if(c?.surfaceTops)c.surfaceTops[(x-c.cx*16)*16+z-c.cz*16]=-32768;}if(ok)this.skyScene?.roofs.delete(`${x},${z}`);return ok;}
 outdoorSurface(x,z){
  x=Math.floor(x);z=Math.floor(z);const c=this.stream?.loaded.get(chunkAt(x,z));if(!c?.ready)return Infinity;
  const lx=x-c.cx*16,lz=z-c.cz*16,i=lx*16+lz;
  c.surfaceTops??=new Int16Array(256).fill(-32768);
  if(c.surfaceTops[i]===-32768){
   let y=MAX_Y,at=voxelIndex(lx+1,y,lz+1);while(y>=MIN_Y&&!c.cells[at]){at--;y--;}c.surfaceTops[i]=y+1;
  }
  return Math.max(c.surfaceTops[i],this.cabinRoofs?.get(x+','+z)??MIN_Y);
 }
 height(x,z){return this.generator.column(x,z).h;}
 biome(x,z){return BIOMES[this.generator.column(x,z).biome]||'Meadow';}
 isReady(x,z){return this.stream?.has(x,z)||false;}
 isWater(x,y,z){return this.get(x,y,z)===WATER&&(Math.floor(y)!==SEA_LEVEL||y<SEA_LEVEL+.62||this.get(x,SEA_LEVEL+1,z)===WATER);}
 disposeChunk(k){
  this.detailRevision=(this.detailRevision||0)+1;this.detailBlend?.remove(k);this.dropTrackMesh(k);
  for(const mesh of this.chunks.get(k)||[]){this.scene.remove(mesh);mesh.geometry.dispose();}this.chunks.delete(k);
  for(const e of this.entities)if(chunkAt(e.x,e.z)===k)this.releaseEntityMesh(e.id);
  for(const [id,e] of this.discoveryEntities||[])if(chunkAt(e.x,e.z)===k){this.releaseEntityMesh(id);this.discoveryEntities.delete(id);}
 }
 installChunk(k,chunk,groups){
  if(!this.chunks.has(k)){this.detailRevision=(this.detailRevision||0)+1;this.detailBlend?.add(k,chunk.cx,chunk.cz);}
  for(const mesh of this.chunks.get(k)||[]){this.scene.remove(mesh);mesh.geometry.dispose();}
  const materials=[this.material,this.glassMaterial,this.waterMaterial,this.floraMaterial,this.leafMaterial],meshes=[];
  groups.forEach((g,i)=>{
   if(!g.p.length)return;const geo=new THREE.BufferGeometry();
   for(const [name,values,size] of [['position',g.p,3],['normal',g.n,3],['color',g.c,3],['uv',g.u,2],['blockLight',g.l,2]])geo.setAttribute(name,new THREE.BufferAttribute(values,size));
   if(i===2)geo.setAttribute('waterDepth',new THREE.BufferAttribute(g.waterDepth,1));
   if(this.detailBlend)markChunk(geo,chunk.cx,chunk.cz);
   geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,materials[i]);mesh.castShadow=i===0||i===4;if(i===0&&this.terrainDepth){mesh.customDepthMaterial=this.terrainDepth;mesh.customDistanceMaterial=this.terrainDistance;}if(i===4){mesh.customDepthMaterial=this.leafDepthMaterial;mesh.customDistanceMaterial=this.leafDistanceMaterial;}mesh.receiveShadow=i!==2;mesh.userData.chunk=true;mesh.userData.water=i===2;mesh.userData.decoration=i===3;this.scene.add(mesh);meshes.push(mesh);
  });this.chunks.set(k,meshes);
  for(const e of this.entities)if(chunkAt(e.x,e.z)===k&&!this.entityMeshes.has(e.id))this.buildEntity(e);
  this.installDiscoveries(chunk.cx,chunk.cz);this.refreshTrackMesh(k);
 }
 setDiscoveryClaims(claimed){this.discoveryClaims=new Set(claimed||[]);for(const c of this.stream?.loaded.values()||[])if(c.ready)this.installDiscoveries(c.cx,c.cz);}
 installDiscoveries(cx,cz){
  this.discoveryEntities??=new Map();
  for(const site of discoverySites(this.generator,cx,cz)){
   const id=discoveryKey(this.generator,site),claimed=this.discoveryClaims?.has(id);
   if(claimed){this.releaseEntityMesh(id);this.discoveryEntities.delete(id);if(site.buried&&this.get(site.x,site.y,site.z)===29)this.set(site.x,site.y,site.z,0);continue;}
   if(!site.buried&&!this.discoveryEntities.has(id)){const e={...site,siteId:site.id,id,discovery:true};this.discoveryEntities.set(id,e);this.buildEntity(e);}
  }
 }
 discoveryAt(x,y,z){return discoverySites(this.generator,Math.floor(x/16),Math.floor(z/16)).find(s=>s.x===x&&s.y===y&&s.z===z);}
 createWorker(){try{return new Worker(new URL('./terrain-worker.js',import.meta.url),{type:'module'});}catch{return null;}}
 async load(data,position=null){
  this.breakOverlay?.clear();this.feedback?.clear();this.horizon?.reset();this.traces?.reset();
  if(data&&(!Array.isArray(data.edits)||!Array.isArray(data.entities)))throw Error('This world file is missing its building data.');
  if(data&&(data.edits.length>180000||data.entities.length>300))throw Error('This world is too large.');
  const config={...(data?.generator||{seed:'Original valley',legacy:true,version:GENERATOR_VERSION})};
  config.firstCaseVersion??=1;
  if(config.skylineVersion===undefined){config.skylineVersion=1;config.skylineExclusions=protectExisting(data); }
  if(config.landmarksVersion===undefined){config.landmarksVersion=1;config.landmarkExclusions=protectExisting(data);}
  if(data?.tracks&&(!Array.isArray(data.tracks)||data.tracks.length>TRACK_LIMIT))throw Error('This railway is too large.');
  if(data?.drops&&(!Array.isArray(data.drops)||data.drops.length>DROP_LIMIT))throw Error('Too many loose items in this world.');
  // Validate the generator before releasing the current world.
  const generator=new TerrainGenerator(config);
  this.drops?.restore(data?.drops);
  this.atmosphere=new Atmosphere(generator.seed,data?.atmosphere||{});this.time=this.atmosphere.mode;this.exploration=new Exploration(data?.exploration||{});this.skyScene?.seed(generator.seed);this.lastAtmosphereFrame=null;
  for(const id of this.discoveryEntities?.keys()||[])this.releaseEntityMesh(id);this.discoveryEntities=new Map();
  this.stream?.dispose();for(const e of [...this.entities])this.removeEntity(e.id);this.outline.visible=false;
  this.railway=new Railway(data?.tracks);this.trackMeshes=new Map();this.cabinRoofs=new Map();
  this.streamingError=null;this.stream=new TerrainStream(generator.config(),{worker:this.createWorker(),onLoad:(...args)=>this.installChunk(...args),onUnload:k=>this.disposeChunk(k),onError:message=>{this.streamingError=message;console.warn(message);}});
  await this.stream.restoreEdits(data?.edits||[],id=>id===0||id===WATER||Object.hasOwn(BLOCKS,id),this.onLoading);
  const entities=data?.entities||generator.starterEntities();
  for(const e of entities){
   if(!e||!Object.hasOwn(FURNITURE,e.type)||![e.x,e.y,e.z].every(Number.isFinite)||Math.abs(e.x)>WORLD_LIMIT||Math.abs(e.z)>WORLD_LIMIT||e.y<MIN_Y||e.y>MAX_Y)continue;
   this.addEntity({id:typeof e.id==='string'?e.id.slice(0,80):uid(),type:e.type,x:Math.floor(e.x),y:Math.floor(e.y),z:Math.floor(e.z),r:((e.r|0)%4+4)%4,open:!!e.open,lit:e.lit!==false,face:Array.isArray(e.face)&&e.face.length===3&&e.face.every(n=>[-1,0,1].includes(n))?e.face:null,recordId:typeof e.recordId==='string'?e.recordId:null,...(e.type==='record'?{stationRecordId:typeof e.stationRecordId==='string'?e.stationRecordId.slice(0,80):null}:{}),...(e.type==='sign'?signData(e):{}),...(e.type==='minecart'?{enter:Number.isInteger(e.enter)?e.enter:undefined,travel:Number.isFinite(e.travel)?Math.min(1,Math.max(0,e.travel)):.5}:{}),...(e.type==='crate'?{recordIds:crateContents(e)}:{})});
  }
  this.resetView();
  if(position&&['x','y','z','yaw','pitch'].every(k=>Number.isFinite(position[k]))){
   this.camera.position.set(Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,position.x)),Math.max(MIN_Y+1.7,Math.min(MAX_Y+30,position.y)),Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,position.z)));
   this.camera.rotation.set(Math.max(-1.45,Math.min(1.45,position.pitch)),position.yaw,0,'YXZ');
  }
  await this.ready(1);this.ensureStandingSpace();
 }
 async newWorld(seed){return this.load({generator:{seed,version:GENERATOR_VERSION,legacy:false,skylineVersion:1,firstCaseVersion:FIRST_CASE_VERSION},edits:[],entities:new TerrainGenerator({seed}).starterEntities()});}
 async ready(radius=1){const p=this.camera.position;this.stream.update(p.x,p.z,this.viewDistance);await this.stream.readyAround(p.x,p.z,radius);}
 async prepareEntry(equipment){
  this.setHeldEquipment({...equipment,visible:true});
  this.hands?.update(0,{...this.heldState,world:this,sky:1});
  // Prepare the avatar's texture and shaders behind the loading screen, too.
  this.preparingCharacter=true;this.avatar.root.visible=true;
  try{await prepareView(this,this.onLoading);}finally{this.preparingCharacter=false;this.avatar.root.visible=false;}
 }
 ensureStandingSpace(){const p=this.camera.position;if(!this.collides(p.x,p.y-1.66,p.z))return;for(let y=Math.max(MIN_Y+1,Math.floor(p.y-1.66));y<=MAX_Y+1;y++)if(!this.collides(p.x,y,p.z)){p.y=y+1.66;return;}}
 setViewDistance(value){this.viewDistance=Math.max(2,Math.min(5,Number(value)||3));if(this.stream)this.stream.update(this.camera.position.x,this.camera.position.z,this.viewDistance);}
 makeEnvironment(){
  this.waterMaterial=createWaterMaterial();
  this.floraMaterial=new THREE.MeshLambertMaterial({vertexColors:true});

 }
 dropTrackMesh(k){const m=this.trackMeshes?.get(k);if(m){this.scene.remove(m);m.traverse(o=>o.geometry?.dispose());m.material.dispose();this.trackMeshes.delete(k);}}
 refreshTrackMesh(k){
  this.dropTrackMesh(k);const tracks=this.railway?.chunks.get(k);
  if(!tracks?.size||!this.chunks.has(k))return;
  const m=makeTrackMesh(this,tracks);if(this.detailBlend){const [cx,cz]=k.split(',').map(Number);markChunk(m.geometry,cx,cz);blendMaterial(m.material,this.detailBlend);}
  this.scene.add(m);this.trackMeshes.set(k,m);
 }
 refreshCabinRoof(e){
  if(e.type!=='roofSlope'&&e.type!=='beam')return;
  const key=e.x+','+e.z;this.cabinRoofs??=new Map();
  const pieces=this.entities.filter(p=>p.x===e.x&&p.z===e.z&&['roofSlope','beam'].includes(p.type));
  if(pieces.length)this.cabinRoofs.set(key,Math.max(...pieces.map(p=>p.y+1)));else this.cabinRoofs.delete(key);
  this.skyScene?.roofs.delete(key);
 }
 positionCart(e){
  const p=cartPose(this.railway,e),mesh=this.entityMeshes.get(e.id);
  if(p&&mesh){mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=Math.atan2(p.dx,p.dz);}
  return p;
 }
 cartClear(p,tile,cart){
  if(!this.isReady(p.x,p.z))return 'Waiting for terrain';
  for(const dx of [-.23,.23])for(const dz of [-.23,.23]){
   if(!this.isReady(p.x+dx,p.z+dz))return 'Waiting for terrain';
   for(let y=Math.floor(p.y+.41);y<=Math.floor(p.y+1.44);y++)if(solid(this.get(p.x+dx,y,p.z+dz)))return 'Clear the track ahead';
  }
  for(const e of this.entities){
   if(e===cart||Math.abs(e.x-tile.x)>2||Math.abs(e.z-tile.z)>2||Math.abs(e.y-tile.y)>2)continue;
   if(e.type==='minecart'&&e.x===tile.x&&e.y===tile.y&&e.z===tile.z)return 'Another cart is on the track';
   const b=this.entityBounds(e);if(b&&p.x+.24>b.x&&p.x-.24<b.x+b.w&&p.z+.24>b.z&&p.z-.24<b.z+b.d&&p.y+1.44>b.y&&p.y+.16<b.y+b.h)return 'Clear the track ahead';
  }
  return true;
 }
 addEntity(e){
  if(e.type==='crate')e={...e,recordIds:crateContents(e)};
  e={id:uid(),r:0,...e};if(!Object.hasOwn(FURNITURE,e.type))return;if(this.entities.some(v=>v.id===e.id))e.id=uid();this.entities.push(e);this.refreshCabinRoof(e);if(['torch','lantern'].includes(e.type))this.refreshLightSources();if(this.isReady(e.x,e.z))this.buildEntity(e);return e;
 }
 releaseEntityMesh(id){const m=this.entityMeshes.get(id);if(m){this.scene.remove(m);m.traverse(o=>{o.geometry?.dispose();o.userData.ownedSleeveTexture?.dispose();if(o.isMesh)o.material?.dispose();});this.entityMeshes.delete(id);}}
 setRecordLibrary(records,changedId=null){
  this.recordLibrary=new Map(records.map(record=>[record.id,record]));
  for(const entity of this.entities)if(entity.type==='crate'&&(!changedId||entity.recordIds.includes(changedId)))this.refreshEntity(entity);
 }
 refreshEntity(entity){
  if(!this.entityMeshes.has(entity.id))return;
  this.releaseEntityMesh(entity.id);this.buildEntity(entity);
 }
 nearestRecordPlayer(origin,limit=Infinity){
  const source=origin??this.camera.position;let nearest=null,best=limit;
  for(const e of this.entities)if(e.type==='record'){
   const d=Math.hypot(e.x-source.x,e.y-source.y,e.z-source.z);
   if(d<=best){best=d;nearest=e;}
  }
  return nearest;
 }
 removeEntity(id){const e=this.entities.find(e=>e.id===id);this.entities=this.entities.filter(e=>e.id!==id);this.releaseEntityMesh(id);if(e)this.refreshCabinRoof(e);if(e&&['torch','lantern'].includes(e.type))this.refreshLightSources();return e;}
 refreshLightSources(){this.stream?.setLightSources(this.entities.filter(e=>['torch','lantern'].includes(e.type)&&e.lit!==false).map(e=>({x:e.x+.5,y:e.y+(e.type==='lantern'?1.6:.7),z:e.z+.5,level:e.type==='lantern'?15:14})));}
 toggleLight(e){e.lit=e.lit===false;this.releaseEntityMesh(e.id);if(this.isReady(e.x,e.z))this.buildEntity(e);this.refreshLightSources();}
 lightAt(x,y,z){return this.stream?.lightAt(x,y,z)||[0,0];}
 setHeldEquipment(state){this.heldState=state;}
 setCharacter(value){const next=characterSettings(value),changed=!this.character||next.skin!==this.character.skin||next.tone!==this.character.tone;this.character=next;if(changed){this.hands?.setStyle(next);this.avatar?.setStyle(next);}this.playerCamera?.setMode(next.view);}
 updatePlayerView(dt=0){return this.renderCamera=this.playerCamera?.update(dt)||this.camera;}
 swingTool(){this.hands?.swing();this.avatar?.swing();}
 showBreakDamage(target,progress){if(!target){this.breakOverlay?.clear();return;}this.breakOverlay?.show(target,progress,target.hit.entity?this.entityMeshes.get(target.hit.entity.id):null);}
 entityModel(e){
  const group=new THREE.Group(),wood='#a67950',dark='#503c31',ivory='#e8e5d9',metal='#3b454e';
  const box=(w,h,d,x,y,z,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  const cyl=(r,h,x,y,z,color,segments=16)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),new THREE.MeshLambertMaterial({color}));m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
  const legs=(w,d,h)=>{for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(.1,h,.1,x,h/2,z,dark);};
  if(e.type==='gigPoster'||e.type==='exchangeCrate')buildOpeningFurniture({...e,bill:this.openingBill},group,box);
  if(CABIN_PARTS.has(e.type))buildCabinPart(e,group,box);
  if(e.type==='minecart')buildCart(box);
  if(e.type==='crate'){
   box(.90,.07,.72,0,.04,0,dark);
   for(const x of [-.42,.42]){box(.07,.42,.72,x,.23,0,wood);}
   for(const z of [-.33,.33])for(const y of [.13,.31])box(.82,.13,.065,0,y,z,wood);
   const albums=(e.recordIds||[]).map(id=>this.recordLibrary?.get(id)).filter(Boolean);
   const count=Math.min(4,albums.length),featured=albums.find(a=>a.id===e.recordId)??albums[0];
   for(let i=0;i<count;i++)box(.59,.60,.045,0,.406,-.18+i*.085,['#e6d7b8','#86aea9','#b07b83','#e5bb85'][i]);
   if(featured){
    const texture=new THREE.DataTexture(sleeveBytes(sleeveFor(featured),true),16,16,THREE.RGBAFormat);
    texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.MeshLambertMaterial({map:texture}));
    face.position.set(0,.409,-.155+(count-1)*.085);face.userData.ownedSleeveTexture=texture;group.add(face);
   }
  }
  if(e.type==='cache'){box(.8,.48,.7,0,.24,0,'#3b435c');box(.86,.13,.76,0,.54,0,e.starter?'#d6aa60':'#9474bc');for(const x of [-.29,.29])box(.07,.57,.75,x,.29,0,'#e1c58e');box(.14,.16,.04,0,.38,.38,'#ffe0a0');}
  if(e.type==='torch'){const stand=new THREE.Group();group.add(stand);const stem=box(.09,.55,.09,0,.33,0,'#9c6c40');group.remove(stem);stand.add(stem);const flame=new THREE.Mesh(new THREE.BoxGeometry(.16,.23,.16),new THREE.MeshBasicMaterial({color:'#ffb34e'}));flame.position.y=.7;flame.visible=e.lit!==false;flame.userData.flame=true;stand.add(flame);const core=new THREE.Mesh(new THREE.BoxGeometry(.08,.16,.08),new THREE.MeshBasicMaterial({color:'#fff2bd'}));core.position.y=-.02;flame.add(core);if(e.face&&e.face[1]===0){stand.position.set(-e.face[0]*.37,.14,-e.face[2]*.37);stand.rotation.z=-e.face[0]*.35;stand.rotation.x=e.face[2]*.35;}}
  if(e.type==='piano'){box(1.8,1.25,.45,0,.77,-.2,dark);box(1.85,.09,.5,0,1.43,-.2,wood);box(1.9,.12,.8,0,.76,0,wood);legs(1.6,.5,.75);for(let k=0;k<15;k++)box(.105,.05,.4,-.79+k*.112,.85,.16,ivory);for(let k=0;k<14;k++)if(![2,6,9,13].includes(k))box(.055,.05,.22,-.73+k*.112,.895,.08,'#1b242a');box(.55,.04,.18,0,.03,.3,metal);}
  if(e.type==='marimba'){legs(1.5,.6,.8);box(1.8,.1,.75,0,.75,0,dark);for(let k=0;k<9;k++){box(.155,.09,.77-k*.032,-.73+k*.18,.86,0,k%2?wood:'#b98b55');cyl(.05,.35,-.73+k*.18,.53,0,'#a28e65',8);}}
  if(e.type==='record'){legs(.85,.7,.74);box(1.1,.15,.95,0,.77,0,wood);box(.96,.1,.8,0,.89,0,dark);const disc=cyl(.29,.024,-.12,.959,0,'#202630',32);disc.userData.disc=true;cyl(.08,.028,-.12,.963,0,'#dcba80',24);box(.027,.025,.47,.31,.99,.04,'#bdb9a9');box(.08,.04,.11,.25,.98,.24,metal);box(.96,.55,.055,0,1.16,-.42,wood);}
  if(e.type==='desk'||e.type==='workbench'){legs(1.3,.7,.85);box(1.6,.12,.95,0,.88,0,wood);if(e.type==='desk'){box(.64,.43,.08,0,1.17,-.2,metal);box(.55,.32,.015,0,1.18,-.15,'#9eaeb9');box(.72,.04,.26,0,.97,.2,ivory);box(.2,.2,.23,-.6,1.04,-.15,dark);box(.2,.2,.23,.6,1.04,-.15,dark);}else{box(.45,.08,.3,-.3,1,-.15,'#dfcda1');box(.06,.04,.5,.35,1,.06,metal);box(.36,.13,.12,.35,1,-.15,dark);}}
  if(e.type==='bed'){legs(.85,1.55,.35);box(1,.18,1.85,0,.38,0,dark);box(.94,.18,1.75,0,.53,0,'#6588dc');box(.82,.1,.42,0,.65,-.55,'#e6eafa');box(1,.7,.1,0,.55,-.9,wood);}
  if(e.type==='bench'){legs(1.35,.45,.5);box(1.6,.1,.65,0,.53,0,wood);box(1.6,.4,.08,0,.92,-.29,wood);box(.08,.7,.08,-.65,.85,-.29,dark);box(.08,.7,.08,.65,.85,-.29,dark);}
  if(e.type==='lantern'){box(.12,1.7,.12,0,.85,0,dark);box(.35,.06,.35,0,1.86,0,metal);box(.3,.42,.3,0,1.62,0,'#edc98a');box(.35,.06,.35,0,1.4,0,metal);for(const x of [-.15,.15])for(const z of [-.15,.15])box(.025,.46,.025,x,1.63,z,metal);const glow=new THREE.Mesh(new THREE.BoxGeometry(.25,.35,.25),new THREE.MeshBasicMaterial({color:'#ffd58a'}));glow.position.y=1.62;glow.visible=e.lit!==false;group.add(glow);}
  if(e.type==='door'){box(.88,1.95,.12,0,.975,0,wood);box(.08,.08,.1,.3,1,.11,'#d6bd7b');box(.62,.6,.14,0,1.45,0,'#b8ceca');}
  if(e.type==='steps'){box(1,.5,1,0,.25,0,wood);box(1,.5,.5,0,.75,-.25,wood);}
  if(e.type==='planter'){box(.95,.35,.55,0,.175,0,'#9c6b51');box(.85,.05,.45,0,.37,0,'#655344');for(let i=0;i<5;i++){box(.045,.4,.045,-.35+i*.17,.57,0,'#6a8752');box(.17,.12,.17,-.35+i*.17,.78,0,['#ebbc77','#dcb2c3','#e1dac6'][i%3]);}}
  if(e.type==='bells'){legs(1.3,.5,.8);box(1.55,.1,.65,0,.8,0,wood);for(let i=0;i<8;i++)box(.14,.04,.58-i*.035,-.63+i*.18,.88,0,'#b9c4bc');}
  if(e.type==='drums'){cyl(.36,.55,0,.5,0,'#b77959');cyl(.37,.03,0,.79,0,ivory);cyl(.22,.25,-.45,.95,-.15,wood);cyl(.23,.03,-.45,1.085,-.15,ivory);cyl(.24,.3,.45,.9,-.15,wood);cyl(.25,.03,.45,1.065,-.15,ivory);box(.035,1.4,.035,-.7,.7,.1,metal);cyl(.32,.025,-.7,1.4,.1,'#cfb770');box(.035,1.2,.035,.7,.6,.1,metal);cyl(.3,.025,.7,1.2,.1,'#cfb770');}
  return group;
 }
 buildEntity(e){
  const group=this.entityModel(e);
  group.position.set(e.x+.5,e.y,e.z+.5);group.rotation.y=(CABIN_PARTS.has(e.type)?-1:1)*(e.r||0)*Math.PI/2+(e.type==='door'&&e.open?Math.PI/2:0);group.userData.light={value:new THREE.Vector2(...this.lightAt(e.x+.5,e.y+.8,e.z+.5))};group.traverse(o=>{if(o.isMesh){o.userData.entityId=e.id;if(o.material.isMeshLambertMaterial)caveMaterial(o.material,{light:group.userData.light});
   if(this.detailBlend&&e.type!=='minecart'){
    markChunk(o.geometry,Math.floor(e.x/16),Math.floor(e.z/16));blendMaterial(o.material,this.detailBlend);
    if(o.castShadow){o.customDepthMaterial=this.terrainDepth;o.customDistanceMaterial=this.terrainDistance;}
   }}});this.scene.add(group);this.entityMeshes.set(e.id,group);if(e.type==='minecart')this.positionCart(e);
 }
 toggleDoor(e){e.open=!e.open;const g=this.entityMeshes.get(e.id);if(g)g.rotation.y=(e.r||0)*Math.PI/2+(e.open?Math.PI/2:0);}
 entityBounds(e){
  if(['roofSlope','sign','minecart'].includes(e.type))return null;
  if(e.type==='shutter'){
   if(e.open)return null;
   const off=.09,thin=.09,w=.92,[cx,cz]=[[.5,off],[1-off,.5],[.5,1-off],[off,.5]][e.r];
   return {x:e.x+cx-(e.r%2?thin:w)/2,z:e.z+cz-(e.r%2?w:thin)/2,y:e.y+.04,w:e.r%2?thin:w,d:e.r%2?w:thin,h:.92};
  }
  if(e.type==='beam')return e.r%2?{x:e.x+.34,z:e.z,y:e.y+.62,w:.32,d:1,h:.34}:{x:e.x,z:e.z+.34,y:e.y+.62,w:1,d:.32,h:.34};
  if(e.type==='gigPoster')return null;
  if(e.type==='exchangeCrate')return {x:e.x+.08,z:e.z+.1,y:e.y,w:.84,d:.8,h:1.88};
  if(e.type==='planter'||e.type==='lantern'||e.type==='torch')return null;if(e.type==='door'&&e.open)return null;
  let w=1.7,d=.85,h=1.1;if(e.type==='cache'){w=.86;d=.76;h=.61;}if(e.type==='door'){w=.9;d=.13;h=2;}if(e.type==='steps'){w=d=1;h=.5;}if(e.type==='record'){w=1.1;d=.95;h=.92;}if(e.type==='bench'){h=.6;}if(e.type==='piano')h=1.45;if(e.type==='bed'){w=1;d=1.85;h=.64;}
  if(e.type==='crate'){w=.9;d=.72;h=e.recordIds?.length ? .71 : .44;}
  if(e.r%2)[w,d]=[d,w];return {x:e.x+.5-w/2,z:e.z+.5-d/2,y:e.y,w,d,h};
 }
 collides(x,y,z,h=1.66){
  const r=.27;if(y<MIN_Y||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT)return true;for(const bx of [x-r,x+r])for(const bz of [z-r,z+r])if(!this.isReady(bx,bz))return true;for(let bx=Math.floor(x-r);bx<=Math.floor(x+r);bx++)for(let bz=Math.floor(z-r);bz<=Math.floor(z+r);bz++)for(let by=Math.floor(y+.02);by<=Math.floor(y+h);by++){if(solid(this.get(bx,by,bz)))return true;}
  for(const e of [...this.entities,...(this.discoveryEntities?.values()||[])]){if(e.type==='roofSlope'&&x+r>e.x&&x-r<e.x+1&&z+r>e.z&&z-r<e.z+1){
    const up=[e.z+1-z,x-e.x,z-e.z,e.x+1-x][e.r],top=e.y+.065+.9*Math.min(1,Math.max(0,up+r));
    if(y+h>e.y+.02&&y<top-.01)return true;
   }
   const base=this.entityBounds(e),boxes=base?[base]:[];if(e.type==='steps'){const top={x:e.x,z:e.z,y:e.y+.5,w:1,d:.5,h:.5};if(e.r===1){top.w=.5;top.d=1;}if(e.r===2)top.z+=.5;if(e.r===3){top.x+=.5;top.w=.5;top.d=1;}boxes.push(top);}for(const b of boxes)if(x+r>b.x&&x-r<b.x+b.w&&z+r>b.z&&z-r<b.z+b.d&&y+h>b.y+.02&&y<b.y+b.h-.01)return true;}
  return false;
 }
 pick(){
  const camera=this.updatePlayerView(),eye=this.camera.position,hit=this.pickFrom(camera,7.5+camera.position.distanceTo(eye));
  if(!hit||camera===this.camera)return hit;
  // A view behind the player must never extend reach or allow using objects
  // through a wall. Aim at the visible reticle, then check from the player's eye.
  const direction=hit.point.clone().sub(eye),distance=direction.length();direction.normalize();
  let blocked=distance>7.5||!!traceBlocks(eye,direction,Math.max(0,distance-.04),(x,y,z)=>this.get(x,y,z));
  if(!blocked){
   this.ray.set(eye,direction);this.ray.far=Math.max(0,distance-.04);const nearby=[];
   for(const group of this.entityMeshes.values())if(group.position.distanceToSquared(eye)<(distance+3)**2){group.updateWorldMatrix(true,true);nearby.push(group);}
   blocked=!!this.ray.intersectObjects(nearby,true)[0];
  }
  if(blocked){this.outline.visible=false;return null;}hit.distance=distance;return hit;
 }
 pickFrom(camera,reach){
  camera.updateWorldMatrix(true,false);this.ray.setFromCamera({x:0,y:0},camera);
  const {origin,direction}=this.ray.ray;
  const block=traceBlocks(origin,direction,reach,(x,y,z)=>this.get(x,y,z));
  this.ray.far=block?.distance??reach;
  const nearby=[];
  for(const group of this.entityMeshes.values())if(group.position.distanceToSquared(origin)<(this.ray.far+3)**2){
    group.updateWorldMatrix(true,true);nearby.push(group);
  }
  for(let cx=Math.floor((origin.x-reach)/16);cx<=Math.floor((origin.x+reach)/16);cx++)for(let cz=Math.floor((origin.z-reach)/16);cz<=Math.floor((origin.z+reach)/16);cz++){const m=this.trackMeshes?.get(cx+','+cz);if(m)nearby.push(m);}
  const hit=this.ray.intersectObjects(nearby,true)[0];
  if(hit?.object.userData.railAtFace){this.outline.visible=false;return {entity:hit.object.userData.railAtFace(hit.faceIndex),point:hit.point,distance:hit.distance};}
  const id=hit?.object.userData.entityId;
  if(id){this.outline.visible=false;const e=this.entities.find(e=>e.id===id)||this.discoveryEntities?.get(id),result={entity:e,point:hit.point,distance:hit.distance};
   if(e&&CABIN_PARTS.has(e.type)){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld),axis=['y','z','x'].sort((a,b)=>Math.abs(n[b])-Math.abs(n[a]))[0];result.cell={x:e.x,y:e.y,z:e.z};result.place={...result.cell};result.place[axis]+=Math.sign(n[axis]);}
   return result;}
  if(!block){this.outline.visible=false;return null;}
  const {cell}=block;this.outline.position.set(cell.x+.5,cell.y+.5,cell.z+.5);this.outline.visible=true;
  return {...block,point:this.ray.ray.at(block.distance,new THREE.Vector3())};
 }
 nearestEntity(){let best=null,dist=4;for(const e of [...this.entities,...(this.discoveryEntities?.values()||[])]){const d=this.camera.position.distanceTo(new THREE.Vector3(e.x+.5,e.y+.7,e.z+.5));if(d<dist){dist=d;best=e;}}return best;}
 setTime(t){this.atmosphere?.setMode(t);this.time=this.atmosphere?.mode||t;}
 skipToMorning(){return this.atmosphere.morning();}
 resetView(){const p=this.generator.spawn;this.camera.position.set(p.x,p.y,p.z);this.camera.rotation.set(-.055,p.yaw,0,'YXZ');this.stream.update(p.x,p.z,this.viewDistance);this.playerCamera?.reset();this.avatar?.reset();}
 render(t,active){
  const p=this.camera.position;this.stream?.update(p.x,p.z,this.viewDistance);this.stream?.tick(t*1000);

  this.waterMaterial.uniforms.time.value=t;
  const dt=this.lastAtmosphereFrame===null||this.lastAtmosphereFrame===undefined?0:Math.min(1,Math.max(0,t-this.lastAtmosphereFrame));this.lastAtmosphereFrame=t;
  this.updatePlayerView(dt);
  const sample=this.atmosphere.step(dt,this.generator.column(p.x,p.z),active&&!document.hidden);this.skyState=sample;this.skyScene?.update(t,sample);this.feedback?.update(Math.min(dt,.05),this.entityMeshes);
  this.traces?.update(t,sample);
  if(this.horizon)this.horizon.update(sample,this.skyScene.root.visible,dt);
  if(this.detailBlend)for(const [k,meshes] of this.chunks){const visible=this.detailBlend.level(k)>0;for(const m of meshes)m.visible=visible;}
  this.waterMaterial.uniforms.fogColor.value.copy(this.scene.fog.color);this.waterMaterial.uniforms.fogNear.value=this.scene.fog.near;this.waterMaterial.uniforms.fogFar.value=this.scene.fog.far;
  const [sky]=this.lightAt(p.x,p.y,p.z);
  if(t-this.lastEntityLight>.16){this.lastEntityLight=t;for(const [id,g] of this.entityMeshes){const e=this.entities.find(e=>e.id===id)||this.discoveryEntities?.get(id);if(e&&g.userData.light)g.userData.light.value.set(...this.lightAt(e.x+.5,e.y+.8,e.z+.5));}}
  for(const g of this.entityMeshes.values())g.traverse(o=>{if(o.userData.flame)o.scale.y=1+Math.sin(t*3.8+g.position.x)*.045;});
  this.hands?.update(t,{...this.heldState,sky:sky*(.25+sample.daylight*.75),world:this});
  this.avatar?.update(t,Math.min(dt,.05),this.playerState,this.preparingCharacter||this.playerCamera?.third);
  if(this.preparingCharacter)this.avatar.root.visible=true;
  this.renderer.render(this.scene,this.renderCamera);
  if(!this.playerCamera?.third)this.hands?.render(this.renderer);
 }
 serialize(){return {drops:this.drops?.serialize()||[],atmosphere:this.atmosphere?.serialize(),exploration:this.exploration?.serialize(),generator:this.generator.config(),tracks:this.railway?.serialize()||[],edits:[...this.edits],entities:this.entities.map(e=>({...e}))};}
}
