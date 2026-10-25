import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {type Generator,generatorSchema} from './procedural-schema';
import {random,noise,fbm,clamp,smooth,tau,fract} from './procedural-math';

type Preset={id:Generator['kind'];name:string;category:string;description:string;settings:Partial<Generator>};
export const generatorCatalog:Preset[]=[
 {id:'terrain',name:'Alpine terrain',category:'Landscapes',description:'Layered ridges with elevation colors.',settings:{width:30,depth:30,height:6,colorA:'#125e48',colorB:'#bbc9d6',colorC:'#3a465b'}},
 {id:'dunes',name:'Desert dunes',category:'Landscapes',description:'Flowing sand ridges and wind-shaped hills.',settings:{width:30,depth:30,height:4,colorA:'#a84b12',colorB:'#ffb941',colorC:'#512419'}},
 {id:'island',name:'Rocky island',category:'Landscapes',description:'A raised island with a shoreline falloff.',settings:{width:24,depth:24,height:7,colorA:'#126c42',colorB:'#b2c4c8',colorC:'#b78b47'}},
 {id:'cave',name:'Crystal cavern',category:'Landscapes',description:'A winding, uneven passage you can fly through.',settings:{width:9,height:8,depth:35,colorA:'#203346',colorB:'#00d6c2',amplitude:.06}},
 {id:'city',name:'Neon district',category:'Architecture',description:'Blocks, streets, lit windows and varied rooflines.',settings:{width:36,depth:36,height:14,count:25,colorA:'#15364d',colorB:'#ffb741',colorC:'#00cfff'}},
 {id:'building',name:'City building',category:'Architecture',description:'A single building with windows and roof details.',settings:{width:5,depth:5,height:10,count:1,colorA:'#163b53',colorB:'#ffbb54',colorC:'#00d1e8'}},
 {id:'tree',name:'Branching tree',category:'Nature',description:'Seeded branches and rounded clusters of foliage.',settings:{width:5,depth:5,height:7,count:1,colorA:'#09623d',colorB:'#25a555',colorC:'#63361d'}},
 {id:'forest',name:'Woodland',category:'Nature',description:'A grove of individually varied, swaying trees.',settings:{width:24,depth:24,height:7,count:24,colorA:'#07513c',colorB:'#16965e',colorC:'#512f1e',amplitude:.15}},
 {id:'vine',name:'Climbing vine',category:'Nature',description:'A curling stem with leaves and progressive growth.',settings:{width:3,depth:3,height:9,count:30,twist:3,colorA:'#0c7d41',colorB:'#52d333',colorC:'#375b21'}},
 {id:'water',name:'Ocean & ripples',category:'Water',description:'A smooth wave surface with looping mesh deformation.',settings:{width:30,depth:30,height:1,colorA:'#0064a5',colorB:'#00c8ec',amplitude:.3}},
 {id:'waterfall',name:'Waterfall',category:'Water',description:'Flowing ribbons and falling droplets.',settings:{width:6,height:12,depth:2,count:36,colorA:'#0d9dce',colorB:'#83eaff',amplitude:.2}},
 {id:'sky',name:'Panoramic sky',category:'Atmosphere',description:'An enclosing gradient sky with a sun or moon.',settings:{width:180/2,depth:90,height:70,colorA:'#020d37',colorB:'#b92748',colorC:'#060a20',count:1,animated:false}},
 {id:'clouds',name:'Cloud banks',category:'Atmosphere',description:'Rounded cloud volumes with gentle cyclic drift.',settings:{width:35,height:6,depth:25,count:12,colorA:'#677aab',colorB:'#c4d4ec',colorC:'#26395f',amplitude:1}},
 {id:'fog',name:'Ground mist',category:'Atmosphere',description:'Soft layered haze drifting close to the ground.',settings:{width:30,height:3,depth:25,count:12,colorA:'#3f6593',colorB:'#89bbd8',amplitude:.4}},
 {id:'aurora',name:'Aurora curtains',category:'Atmosphere',description:'Luminous ribbons that ripple across the sky.',settings:{width:35,height:12,depth:12,count:5,colorA:'#00d994',colorB:'#7133ff',colorC:'#00a0ff',amplitude:.8}},
 {id:'stars',name:'Star field',category:'Atmosphere',description:'Seeded stars with individual twinkle phases.',settings:{width:80,height:55,depth:80,count:120,colorA:'#257aff',colorB:'#fff1b0',colorC:'#ac55ff'}},
 {id:'rain',name:'Rain volume',category:'Weather',description:'Streaks falling through a repeatable volume.',settings:{width:18,height:16,depth:18,count:120,colorA:'#5baddd',colorB:'#b0e4ff',cycles:6}},
 {id:'snow',name:'Snow volume',category:'Weather',description:'Drifting flakes with seamless wrapped lifetimes.',settings:{width:18,height:12,depth:18,count:120,colorA:'#dbf4ff',colorB:'#ffffff',cycles:1}},
 {id:'lightning',name:'Lightning branches',category:'Weather',description:'Forked bolts with timed double flashes.',settings:{width:12,height:20,depth:5,count:4,colorA:'#5e5fff',colorB:'#dcecff',colorC:'#1caaff',cycles:2}},
 {id:'crystals',name:'Crystal garden',category:'Shapes',description:'Clusters of pointed crystalline geometry.',settings:{width:10,height:6,depth:10,count:24,colorA:'#3921b1',colorB:'#00dbff',colorC:'#ef2281'}},
 {id:'spiral',name:'Helix sculpture',category:'Shapes',description:'A continuous mathematical spiral in polished metal.',settings:{width:6,height:10,depth:6,twist:3,colorA:'#00c2f4',colorB:'#d21cff',colorC:'#edb42c'}},
 {id:'fractal',name:'Fractal branches',category:'Shapes',description:'A recursive branching sculpture with luminous tips.',settings:{width:10,height:10,depth:10,detail:3,count:80,colorA:'#5834e1',colorB:'#00d5f7',colorC:'#ffb72e'}},
 {id:'tunnel',name:'Neon tunnel',category:'Shapes',description:'A twisting series of glowing portals for fly-throughs.',settings:{width:10,height:10,depth:40,count:40,twist:2,colorA:'#134bff',colorB:'#ee13d1',colorC:'#00ddff',amplitude:.3}}
];
export function generatorPreset(kind:Generator['kind']){return generatorSchema.parse({...generatorCatalog.find(p=>p.id===kind)?.settings,kind});}
function physical(color:string,roughness=.5,metalness=.1,glow=0){return new T.MeshStandardMaterial({color,roughness,metalness,emissive:color,emissiveIntensity:glow});}
function glow(color:string,intensity=1){return new T.MeshStandardMaterial({color:'#000000',emissive:color,emissiveIntensity:intensity,roughness:1});}
function skyTexture(p:Generator,aurora=false,index=0){const width=aurora?128:2,height=128,data=new Uint8Array(width*height*4),colors=[p.colorA,p.colorB,p.colorC].map(c=>new T.Color(c)),c=new T.Color();for(let y=0;y<height;y++)for(let x=0;x<width;x++){const u=x/(width-1),v=y/(height-1),h=-Math.cos(v*Math.PI);if(aurora)c.copy(colors[index%3]).lerp(colors[(index+1)%3],v);else c.copy(colors[1]).lerp(h>0?colors[0]:colors[2],Math.abs(h)**.55);c.convertLinearToSRGB();const i=(y*width+x)*4;data[i]=Math.round(c.r*255);data[i+1]=Math.round(c.g*255);data[i+2]=Math.round(c.b*255);data[i+3]=aurora?Math.round(255*Math.sin(v*Math.PI)**.6*Math.sin(u*Math.PI)**.4*(.45+.55*Math.sin(u*tau*28+noise(u*8,v*4,p.seed)*3)**2)):255;}const tex=new T.DataTexture(data,width,height,T.RGBAFormat);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.LinearFilter;tex.needsUpdate=true;tex.userData.procedural=true;return tex;}
function mesh(g:T.Group,geo:T.BufferGeometry,mat:T.Material,p=[0,0,0],s=[1,1,1]){const m=new T.Mesh(geo,mat);m.position.fromArray(p);m.scale.fromArray(s);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function rod(g:T.Group,a:T.Vector3,b:T.Vector3,r:number,mat:T.Material,r2=r*.7){const m=mesh(g,new T.CylinderGeometry(r2,r,a.distanceTo(b),10),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
function batch(g:T.Group){g.updateMatrixWorld(true);const bins=new Map<T.Material,T.BufferGeometry[]>(),oldG=new Set<T.BufferGeometry>();g.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const list=bins.get(o.material)||[];list.push(geo);bins.set(o.material,list);oldG.add(o.geometry);}});g.clear();for(const [m,geos] of bins){const merged=mergeGeometries(geos,false);if(merged)mesh(g,merged,m);geos.forEach(g=>g.dispose());}oldG.forEach(g=>g.dispose());}
type Animated={kind:'sway'|'cloud'|'fall'|'twinkle'|'flash'|'ring'|'morph';phase:number;index:number;position:number[];scale:number[];rotation:number[];extra?:number};
function animateTag(o:T.Object3D,kind:Animated['kind'],phase=0,index=0,extra=0){o.userData.proceduralAnimation={kind,phase,index,extra,position:o.position.toArray(),scale:o.scale.toArray(),rotation:[o.rotation.x,o.rotation.y,o.rotation.z]} satisfies Animated;}
function growthTag(o:T.Object3D,index:number,total:number){o.userData.proceduralGrowth={index,total,position:o.position.toArray(),scale:o.scale.toArray(),rotation:[o.rotation.x,o.rotation.y,o.rotation.z]};}
function tree(p:Generator,rng:()=>number){const g=new T.Group(),trunk=physical(p.colorC,.87),leaves=[physical(p.colorA,.8),physical(p.colorB,.74)];const tipGeo=new T.SphereGeometry(1,12,8);const h=p.height;
 function branch(a:T.Vector3,d:T.Vector3,length:number,radius:number,level:number){const b=a.clone().addScaledVector(d,length);rod(g,a,b,radius,trunk);if(level<=0){const m=mesh(g,tipGeo,leaves[rng()>.5?1:0],b.toArray(),[h*.15,h*.19,h*.15]);m.rotation.set(rng(),rng(),rng());return;}for(let i=0;i<3;i++){const angle=i*tau/3+rng()*.7,spread=.45+rng()*.35;const direction=new T.Vector3(Math.cos(angle)*spread,.75+rng()*.2,Math.sin(angle)*spread).addScaledVector(d,.4).normalize();branch(b,direction,length*(.54+rng()*.12),radius*.5,level-1);}}
 branch(new T.Vector3(),new T.Vector3(0,1,0),h*.36,h*.045,Math.min(3,Math.ceil(p.detail/2)));batch(g);const size=new T.Box3().setFromObject(g).getSize(new T.Vector3());g.scale.set(p.width/Math.max(.01,size.x),p.height/Math.max(.01,size.y),p.depth/Math.max(.01,size.z));return g;
}
export function terrainHeight(p:Generator,x:number,z:number){const u=x/p.width+.5,v=z/p.depth+.5,n=fbm(u*4,v*4,p.seed,Math.min(6,p.detail+2));let h=Math.pow(n,1.7)*p.height;
 if(p.kind==='dunes')h=(.5+.5*Math.sin(u*tau*3+(fbm(u*2,v*2,p.seed)-.5)*5+v*tau))*p.height*.65+n*p.height*.22;
 if(p.kind==='island'){const r=Math.hypot((u-.5)*2,(v-.5)*2);h*=1-smooth(.28,.99,r);h-=p.height*.05;}
 return h;
}
function terrain(p:Generator){const g=new T.Group(),segments=16+p.detail*12,geo=new T.PlaneGeometry(p.width,p.depth,segments,segments);geo.rotateX(-Math.PI/2);const a=geo.getAttribute('position'),colors=new Float32Array(a.count*3),low=new T.Color(p.colorA),high=new T.Color(p.colorB),rock=new T.Color(p.colorC),c=new T.Color();for(let i=0;i<a.count;i++){const h=terrainHeight(p,a.getX(i),a.getZ(i));a.setY(i,h);c.copy(low).lerp(high,smooth(.35,.85,h/p.height)).lerp(rock,(1-smooth(.05,.2,h/p.height))*.65);c.toArray(colors,i*3);}geo.computeVertexNormals();geo.setAttribute('color',new T.BufferAttribute(colors,3));const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide});mesh(g,geo,m);return g;}
function building(p:Generator,rng:()=>number){const g=new T.Group(),w=p.width,d=p.depth,h=p.height,stone=physical(p.colorA,.55,.2),trim=physical(p.colorC,.3,.65),glass=physical('#061426',.16,.5),lit=physical(p.colorB,.35,.05,1.5);const cube=new T.BoxGeometry(1,1,1);mesh(g,cube,stone,[0,h/2,0],[w,h,d]);mesh(g,cube,trim,[0,.13,0],[w*1.08,.26,d*1.08]);mesh(g,cube,trim,[0,h+.12,0],[w*1.05,.24,d*1.05]);mesh(g,cube,stone,[w*.15,h+.45,d*.12],[w*.5,.7,d*.5]);
 const rows=Math.max(1,Math.min(20,Math.floor(h/1.1))),cols=Math.max(1,Math.min(10,Math.floor(w/.9))),sideCols=Math.max(1,Math.min(10,Math.floor(d/.9)));
 for(let r=0;r<rows;r++){const y=.65+(h-1)*r/rows;for(let c=0;c<cols;c++)for(const side of [-1,1])mesh(g,cube,rng()>.28?lit:glass,[-w/2+(c+.5)*w/cols,y,side*(d/2+.012)],[w/cols*.52,.55,.025]);for(let c=0;c<sideCols;c++)for(const side of [-1,1])mesh(g,cube,rng()>.32?lit:glass,[side*(w/2+.012),y,-d/2+(c+.5)*d/sideCols],[.025,.55,d/sideCols*.52]);}
 mesh(g,cube,glass,[0,.65,d/2+.03],[Math.min(1.1,w*.3),1.3,.05]);batch(g);return g;
}
/** Morphs are real geometry targets, also transferred as Blender shape keys. */
function waveMesh(p:Generator,vertical=false){const geo=new T.PlaneGeometry(p.width,vertical?p.height:p.depth,48,32);if(!vertical)geo.rotateX(-Math.PI/2);const a=geo.getAttribute('position'),morphs:T.BufferAttribute[]=[],normalMorphs:T.BufferAttribute[]=[];
 for(let phase=0;phase<4;phase++){const copy=geo.clone(),pos=copy.getAttribute('position');for(let i=0;i<pos.count;i++){const x=a.getX(i)/p.width,v=(vertical?a.getY(i)/p.height:a.getZ(i)/p.depth),ph=phase/4*tau+(p.seed%997)/997*tau;const h=(Math.sin(x*tau*2+v*tau+ph)*.65+Math.sin(v*tau*3-x*tau+ph*2)*.35)*p.amplitude;if(vertical)pos.setZ(i,h);else pos.setY(i,h);}copy.computeVertexNormals();morphs.push(pos.clone() as T.BufferAttribute);normalMorphs.push(copy.getAttribute('normal').clone() as T.BufferAttribute);copy.dispose();}
 geo.morphAttributes.position=morphs;geo.morphAttributes.normal=normalMorphs;const m=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:p.colorA,metalness:.35,roughness:.13,clearcoat:1,side:T.DoubleSide}));m.castShadow=false;m.receiveShadow=true;animateTag(m,'morph');return m;
}
export function buildGenerator(p:Generator){
 const g=new T.Group(),rng=random(p.seed),colors=[p.colorA,p.colorB,p.colorC],mats=colors.map(c=>physical(c,.38,.35));g.userData.generator=true;
 const jitter=(n:number)=>n*(1-p.variation*.5+rng()*p.variation);
 if(['terrain','dunes','island'].includes(p.kind)){mats.forEach(m=>m.dispose());return terrain(p);}
 if(p.kind==='tree'||p.kind==='forest'){
  const count=p.kind==='tree'?1:p.count;for(let i=0;i<count;i++){const t=tree({...p,height:jitter(p.height),width:p.kind==='forest'?p.height*.6:p.width,depth:p.kind==='forest'?p.height*.6:p.depth},rng);if(count>1)t.position.set((rng()-.5)*p.width,0,(rng()-.5)*p.depth);t.rotation.y=rng()*tau;animateTag(t,'sway',rng()*tau,i);growthTag(t,i,count);g.add(t);}
 }else if(p.kind==='building'||p.kind==='city'){
  const count=p.kind==='building'?1:Math.min(p.count,64),cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols),cw=p.width/cols,cd=p.depth/rows;
  if(count>1)mesh(g,new T.BoxGeometry(p.width,.12,p.depth),physical('#152434',.52,.1),[0,-.08,0]);
  for(let i=0;i<count;i++){const b=building({...p,width:count>1?cw*.65:p.width,depth:count>1?cd*.65:p.depth,height:jitter(p.height)*(count>1?.45+rng()*.55:1)},rng);if(count>1)b.position.set((i%cols-(cols-1)/2)*cw,0,(Math.floor(i/cols)-(rows-1)/2)*cd);growthTag(b,i,count);g.add(b);}
 }else if(p.kind==='water')g.add(waveMesh(p));
 else if(p.kind==='waterfall'){
  const sheet=waveMesh(p,true);sheet.position.y=p.height/2;g.add(sheet);const droplet=new T.SphereGeometry(1,8,6);for(let i=0;i<p.count;i++){const m=mesh(g,droplet,mats[i%2],[(rng()-.5)*p.width,rng()*p.height,(rng()-.5)*p.depth],[.025,.13+rng()*.15,.025]);animateTag(m,'fall',rng(),i,1);}
 }else if(p.kind==='clouds'||p.kind==='fog'){
  const sphere=new T.SphereGeometry(1,16,12),fog=p.kind==='fog';if(fog)mats.forEach(m=>{m.transparent=true;m.opacity=.075;m.depthWrite=false;});
  for(let i=0;i<p.count;i++){const cloud=new T.Group();for(let j=0;j<5;j++)mesh(cloud,sphere,mats[j%2],[(rng()-.5)*3,(rng()-.5)*.5,(rng()-.5)*1.5],[1.5+rng(),.7+rng()*.5,1+rng()]);batch(cloud);cloud.position.set((rng()-.5)*p.width,rng()*p.height,(rng()-.5)*p.depth);cloud.scale.setScalar(.6+rng()*.8);animateTag(cloud,'cloud',rng()*tau,i);g.add(cloud);}
 }else if(p.kind==='sky'){
  const geo=new T.SphereGeometry(1,48,32),pos=geo.getAttribute('position'),data=new Float32Array(pos.count*3),a=new T.Color(p.colorA),b=new T.Color(p.colorB),c=new T.Color(p.colorC),out=new T.Color();for(let i=0;i<pos.count;i++){const y=pos.getY(i);out.copy(b).lerp(y>0?a:c,Math.pow(Math.abs(y),.55)).toArray(data,i*3);}geo.setAttribute('color',new T.BufferAttribute(data,3));const sky=mesh(g,geo,new T.MeshStandardMaterial({color:'#000000',emissive:'#ffffff',emissiveMap:skyTexture(p),side:T.DoubleSide}),[0,0,0],[p.width,p.height,p.depth]);sky.castShadow=sky.receiveShadow=false;mesh(g,new T.SphereGeometry(Math.max(.4,p.width*.025),24,16),glow(p.colorB,1.4),[-p.width*(.2+rng()*.2),p.height*(.2+rng()*.15),-p.depth*.75]);
 }else if(p.kind==='aurora'){
  for(let j=0;j<Math.min(p.count,12);j++){const geo=new T.PlaneGeometry(p.width,p.height,64,12),pos=geo.getAttribute('position'),data=new Float32Array(pos.count*3),c=new T.Color();for(let i=0;i<pos.count;i++){pos.setZ(i,Math.sin(pos.getX(i)/p.width*tau*2+j+(p.seed%991)/991*tau)*p.depth*.25);c.set(colors[j%3]).lerp(new T.Color(colors[(j+1)%3]),(pos.getY(i)/p.height+.5)).toArray(data,i*3);}geo.computeVertexNormals();geo.setAttribute('color',new T.BufferAttribute(data,3));const texture=skyTexture(p,true,j);const mat=new T.MeshStandardMaterial({color:'#000000',emissive:'#ffffff',emissiveIntensity:1.4,map:texture,emissiveMap:texture,transparent:true,opacity:.4,side:T.DoubleSide,depthWrite:false});const m=mesh(g,geo,mat,[0,p.height/2,j*p.depth/Math.min(p.count,12)]);m.castShadow=false;animateTag(m,'cloud',j*1.3+rng(),j);}
 }else if(p.kind==='stars'){
  const sphere=new T.SphereGeometry(1,8,6);for(let i=0;i<p.count;i++){const mat=glow(colors[i%3],1.6),m=mesh(g,sphere,mat,[(rng()-.5)*p.width,rng()*p.height,(rng()-.5)*p.depth]);m.scale.setScalar(.025+rng()*.07);m.castShadow=m.receiveShadow=false;animateTag(m,'twinkle',rng()*tau,i);}
 }else if(p.kind==='rain'||p.kind==='snow'){
  const snow=p.kind==='snow',geo=snow?new T.SphereGeometry(.035,8,6):new T.CylinderGeometry(.012,.012,.5,5);for(let i=0;i<p.count;i++){const m=mesh(g,geo,mats[i%2],[(rng()-.5)*p.width,rng()*p.height,(rng()-.5)*p.depth]);m.castShadow=false;animateTag(m,'fall',rng(),i,snow?2:0);}
 }else if(p.kind==='lightning'){
  for(let i=0;i<Math.min(p.count,12);i++){const bolt=new T.Group(),mat=glow(p.colorB,3);let a=new T.Vector3((rng()-.5)*p.width,p.height,(rng()-.5)*p.depth);for(let j=0;j<16;j++){const b=a.clone().add(new T.Vector3((rng()-.5)*p.width*.12,-p.height/16,(rng()-.5)*p.depth*.1));rod(bolt,a,b,.025,mat);if(j%4===2){const c=b.clone().add(new T.Vector3((rng()-.5)*p.width*.4,-p.height*.14,0));rod(bolt,b,c,.016,mat);}a=b;}batch(bolt);animateTag(bolt,'flash',rng(),i);g.add(bolt);}
 }else if(p.kind==='crystals'){
  for(let i=0;i<p.count;i++){const c=new T.Group(),h=jitter(p.height)*(.3+rng()*.7),r=.15+rng()*.45,mat=mats[i%3];mesh(c,new T.CylinderGeometry(r,r,h*.75,6),mat,[0,h*.375,0]);mesh(c,new T.ConeGeometry(r,h*.25,6),mat,[0,h*.875,0]);c.position.set((rng()-.5)*p.width,0,(rng()-.5)*p.depth);c.rotation.set((rng()-.5)*.4,rng()*tau,(rng()-.5)*.4);growthTag(c,i,p.count);g.add(c);}
 }else if(p.kind==='spiral'||p.kind==='vine'){
  const vine=p.kind==='vine',pts=Array.from({length:161},(_,i)=>{const f=i/160,a=f*tau*p.twist+(p.seed%100)/100*tau;return new T.Vector3(Math.cos(a)*p.width*.4,f*p.height,Math.sin(a)*p.depth*.4);}),curve=new T.CatmullRomCurve3(pts);if(!vine)mesh(g,new T.TubeGeometry(curve,200,Math.min(p.width,p.depth)*.04,12,false),mats[0]);else{const count=p.count;for(let i=0;i<count;i++){const a=curve.getPoint(i/count),b=curve.getPoint((i+1)/count),part=new T.Group();part.position.copy(a);rod(part,new T.Vector3(),b.clone().sub(a),.045,mats[2]);const leaf=mesh(part,new T.SphereGeometry(1,12,8),mats[i%2],b.clone().sub(a).toArray(),[.32,.06,.16]);leaf.rotation.set(.4,i*2.4,.3);growthTag(part,i,count);g.add(part);}}animateTag(g,'sway',0,0);
 }else if(p.kind==='fractal'){
  const sphere=new T.SphereGeometry(.13,12,8);let n=0;function branch(a:T.Vector3,length:number,level:number){if(n>=p.count)return;const part=new T.Group();part.position.copy(a);mesh(part,sphere,mats[level%3]);g.add(part);const index=n++;if(level)for(let j=0;j<4;j++){if(n>=p.count)break;const ang=j*tau/4+level*.7,delta=new T.Vector3(Math.cos(ang)*length,length*.65,Math.sin(ang)*length);rod(part,new T.Vector3(),delta,.04*level,mats[level%3]);branch(a.clone().add(delta),length*.48,level-1);}part.userData.fractalIndex=index;}branch(new T.Vector3(0,0,0),p.width*.25,Math.min(4,p.detail));g.children.forEach((part,i)=>growthTag(part,i,g.children.length));const size=new T.Box3().setFromObject(g).getSize(new T.Vector3());g.scale.set(p.width/Math.max(.01,size.x),p.height/Math.max(.01,size.y),p.depth/Math.max(.01,size.z));
 }else if(p.kind==='tunnel'){
  for(let i=0;i<p.count;i++){const f=i/Math.max(1,p.count-1),a=f*tau*p.twist,m=mesh(g,new T.TorusGeometry(1,.035,8,48),new T.MeshStandardMaterial({color:colors[i%3],emissive:colors[i%3],emissiveIntensity:1.8,metalness:.6,roughness:.22}),[Math.sin(a)*p.width*.12,Math.cos(a)*p.height*.12,-f*p.depth],[p.width/2,p.height/2,1]);m.rotation.z=a;animateTag(m,'ring',f*tau+rng()*.2,i);growthTag(m,i,p.count);}
 }else if(p.kind==='cave'){
  const pts=Array.from({length:30},(_,i)=>new T.Vector3(Math.sin(i/29*tau)*.4,Math.sin(i/29*tau*2)*.2,-i/29*p.depth));const geo=new T.TubeGeometry(new T.CatmullRomCurve3(pts),96,1,40,false),pos=geo.getAttribute('position');for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),s=.8+fbm(x*3+z*.2,y*3,p.seed,3)*.4;pos.setXYZ(i,x*p.width*.45*s,y*p.height*.45*s,z);}geo.computeVertexNormals();mats[0].side=T.DoubleSide;mesh(g,geo,mats[0]);
 }
 const used=new Set<T.Material>();g.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){used.add(m);m.userData.baseOpacity=m.opacity;m.userData.baseTransparent=m.transparent;}});mats.forEach(m=>{if(!used.has(m))m.dispose();});return g;
}
export function sampleGenerator(root:T.Group,p:Generator,time:number,duration:number){
 const normalized=p.animated?time/duration:p.frozenPhase,phase=normalized*tau*p.cycles;
 root.traverse(o=>{
  const a=o.userData.proceduralAnimation as Animated|undefined;if(a){o.position.fromArray(a.position);o.scale.fromArray(a.scale);o.rotation.set(a.rotation[0],a.rotation[1],a.rotation[2]);const v=phase+a.phase;
   if(a.kind==='sway'){o.rotation.z+=Math.sin(v)*p.amplitude*.045;o.rotation.x+=Math.cos(v)*p.amplitude*.025;}
   if(a.kind==='cloud'){o.position.x+=Math.sin(v)*p.amplitude*2;o.position.y+=Math.cos(v)*p.amplitude*.2;o.rotation.y+=Math.sin(v)*p.amplitude*.025;}
   if(a.kind==='twinkle')o.scale.multiplyScalar(.65+.35*Math.sin(v)**2);
   if(a.kind==='flash'){const f=fract(normalized*p.cycles+a.phase);o.visible=f<.035||(f>.065&&f<.09);}
   if(a.kind==='ring'){o.scale.x*=1+Math.sin(v)*p.amplitude*.06;o.scale.y*=1+Math.sin(v)*p.amplitude*.06;}
   if(a.kind==='fall'){const f=fract(normalized*p.cycles+a.phase);o.position.y=(1-f)*p.height;if(a.extra===2){o.position.x+=Math.sin(v)*p.amplitude;o.position.z+=Math.cos(v)*p.amplitude*.5;}o.scale.multiplyScalar(smooth(0,.04,f)*(1-smooth(.93,1,f)));}
   if(a.kind==='morph'&&o instanceof T.Mesh&&o.morphTargetInfluences){const f=fract(normalized*p.cycles)*4,index=Math.floor(f),mix=smooth(0,1,fract(f));o.morphTargetInfluences.fill(0);o.morphTargetInfluences[index]=1-mix;o.morphTargetInfluences[(index+1)%4]=mix;}
  }
  const b=o.userData.proceduralGrowth;if(b&&p.growth!=='none'){
   if(!a){o.position.fromArray(b.position);o.scale.fromArray(b.scale);o.rotation.set(...b.rotation as [number,number,number]);}
   const progress=p.growthLoop?(1-Math.cos(normalized*tau))/2:clamp(((p.animated?time:p.frozenPhase*duration)-p.growthStart)/p.growthDuration),f=smooth(b.index/b.total*.6,Math.min(1,b.index/b.total*.6+.4),progress);
   if(p.growth==='grow')o.scale.multiplyScalar(Math.max(.0001,f));else if(p.growth==='assemble'||p.growth==='explode'){const spread=p.growth==='explode'?f:1-f,angle=b.index*2.399+p.seed;o.position.x+=Math.cos(angle)*spread*p.width*.5;o.position.y+=spread*p.height;o.position.z+=Math.sin(angle)*spread*p.depth*.5;o.rotation.y+=spread*tau;o.scale.multiplyScalar(p.growth==='assemble'?Math.max(.0001,f):1);}else o.scale.multiplyScalar(1+Math.sin(phase+b.index*.2)*p.amplitude*.12);
  }
 });
}
