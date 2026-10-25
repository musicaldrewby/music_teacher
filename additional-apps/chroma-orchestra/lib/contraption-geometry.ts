import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {type Project,type Track,audible,noteTime,stationLayout,duration} from './project';
import {contraptionPlan,contraptionBall,keyActivity,liftPosition,samplePath,isContraption,type V3} from './contraption';
import {craftedMaterial,type Finish} from './crafted-materials';

export class ContraptionObjects{
 notesByPitch=new Map<number,Track['notes']>();group=new THREE.Group();plan:ReturnType<typeof contraptionPlan>;keys:THREE.Group[]=[];lamps:THREE.Mesh[]=[];cups:THREE.Group[]=[];supplyBalls:THREE.Mesh[]=[];bellows=new THREE.Group();wheel=new THREE.Group();balls:THREE.InstancedMesh;dummy=new THREE.Object3D();events:{time:number;pitch:number;velocity:number}[];materials=new Map<string,THREE.MeshPhysicalMaterial>();
 constructor(public project:Project,public track:Track,width:number){this.plan=contraptionPlan(track,width);for(const k of this.plan.keys)this.notesByPitch.set(k.pitch,track.notes.filter(n=>n.midi===k.pitch));const p=this.plan,organ=track.machine==='pipeworks';this.group.name=track.name;
 const mat=(f:Finish,tint?:string)=>{const id=f+(tint||'');if(!this.materials.has(id))this.materials.set(id,craftedMaterial(f,tint));return this.materials.get(id)!;};
 const mesh=(name:string,g:THREE.BufferGeometry,f:Finish,pos:V3=[0,0,0],parent:THREE.Object3D=this.group,tint?:string)=>{const m=new THREE.Mesh(g,mat(f,tint));m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(name:string,size:V3,pos:V3,f:Finish,parent:THREE.Object3D=this.group,tint?:string)=>mesh(name,new RoundedBoxGeometry(...size,2,Math.min(.05,...size.map(x=>x/5))),f,pos,parent,tint);
 const cyl=(name:string,r:number,h:number,pos:V3,f:Finish,parent:THREE.Object3D=this.group)=>mesh(name,new THREE.CylinderGeometry(r,r,h,20),f,pos,parent);
 const line=(name:string,pts:V3[],r:number,f:Finish,parent:THREE.Object3D=this.group)=>mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v))),Math.max(8,pts.length),r,8,false),f,[0,0,0],parent);
 const lathe=(name:string,profile:[number,number][],pos:V3,f:Finish,parent:THREE.Object3D=this.group)=>mesh(name,new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),32),f,pos,parent);
 box('Carved walnut platform',[width+.7,.38,8],[0,.24,0],'wood');box('Brass plinth inlay',[width+.8,.07,8.1],[0,.46,0],'brass');box('Lower dark pedestal',[width+1,.17,8.3],[0,.05,0],'wood');
 for(const x of [-width/2+.3,width/2-.3])for(const z of [-3.3,3.3]){cyl('Turned column',.13,z<0?6.25:1.1,[x,z<0?3.6:1.05,z],'brass');for(const y of (z<0?[.7,1.1,5.9,6.6]:[.7,1.6]))cyl('Column collar',.22,.12,[x,y,z],'brass');box('Column foot',[.62,.55,.62],[x,.74,z],'wood');}
 for(let i=0;i<9;i++){const x=(i-4)*(width-1)/9;box('Front wood panel',[(width-1)/9-.08,.6,.12],[x,.93,4.03],'wood');box('Panel brass fillet',[(width-1)/9-.18,.035,.04],[x,1.18,4.11],'brass');}
 // A broad return raceway is separate from the accurately timed playing lanes.
 for(const side of [-1,1])line('Spiral supply rail',p.supply.map(v=>[v[0],v[1]-.11,v[2]+side*.09]),.035,'brass');
 line('Cobalt raceway',p.supply.map(v=>[v[0],v[1]-.19,v[2]]),.095,'enamel');
 for(let i=0;i<p.supply.length;i+=24){const v=p.supply[i];cyl('Raceway support',.055,v[1]-.8,[v[0],(v[1]+.8)/2,v[2]],'brass');}
 lathe('Upper feeder bowl',[[.13,0],[.14,.14],[.65,.55],[.7,.57],[.72,.52],[.19,.08]], [p.liftX,7.4,-1.3],'brass');
 for(let i=0;i<12;i++){const ball=mesh('Circulating supply marble',new THREE.SphereGeometry(.14,20,12),'glass',[0,0,0],this.group,i%2?'#ed204c':track.color);ball.userData.motion={kind:'supply',index:i};this.supplyBalls.push(ball);}
 // Visible returning bucket chain, with both rising and descending runs.
 for(const z of [-1.3,-2.3])line('Lift chain',[[p.liftX,.5,z],[p.liftX,7.8,z]],.045,'brass');
 box('Lift backplate',[.65,7.5,.12],[p.liftX,4.1,-2.5],'wood');
 for(let i=0;i<16;i++){const cup=new THREE.Group();cup.name='Bucket '+i;cup.userData.motion={kind:'lift',index:i};this.group.add(cup);lathe('Return bucket',[[.01,0],[.22,.04],[.29,.22],[.3,.24],[.27,.25],[.2,.08],[.01,.05]],[0,0,0],'brass',cup);mesh('Returning marble',new THREE.SphereGeometry(.13,16,10),'glass',[0,.19,0],cup,track.color);this.cups.push(cup);}
 this.wheel.position.set(p.liftX,1,-1.8);this.wheel.name='Driven flywheel';this.wheel.userData.motion={kind:'wheel'};this.group.add(this.wheel);const hoop=mesh('Flywheel rim',new THREE.TorusGeometry(.72,.09,10,48),'brass',[0,0,0],this.wheel);hoop.rotation.y=Math.PI/2;for(let i=0;i<8;i++){const spoke=box('Flywheel spoke',[.08,1.35,.08],[0,0,0],'wood',this.wheel);spoke.rotation.x=i*Math.PI/4;}
 const rows=organ?1:3;for(let row=0;row<rows;row++){const y=organ?1.91:1.6+row*1.35,z=organ?.9:2.25-row*1.85;for(const side of [-1,1])box('Instrument rack',[width-2,.16,.16],[0,y-.08,z+side*.48],'wood');for(const x of [-width/2+1.25,width/2-1.25])box('Rack support',[.18,y-.5,.18],[x,(y+.5)/2,z],'brass');
 box('Pitch gate manifold',[width-2,.26,.35],[0,y+1.3,z-1.2],'enamel');line('Gravity feed to pitch manifold',[[p.supply.at(-1)![0],5.6,-1.7],[-width/2+.65,5.2,-1.7],[-width/2+.65,y+1.3,z-1.2],[-width/2+1,y+1.3,z-1.2]],.11,'enamel');}
 for(const k of p.keys){
  const key=new THREE.Group();key.name='Playable note '+k.pitch;key.position.set(k.x,k.y,k.z);key.userData.motion={kind:'key',pitch:k.pitch,organ};this.group.add(key);this.keys.push(key);
  box(organ?'Organ pallet':'Rosewood marimba bar',[organ?.48:.55,.25,k.length],[0,0,0],organ?'enamel':'wood',key,organ?'#432682':undefined);
  for(const z of [-k.length*.32,k.length*.32]){cyl('Brass retaining pin',.025,.05,[0,.15,z],'brass',key);}
  if(organ){
   const pipeY=2.5,pipeZ=-2.6,height=k.pipeHeight;const pipe=lathe('Speaking organ pipe '+k.pitch,[[.14,0],[.18,.15],[.18,height-.35],[.32,height],[.29,height+.025],[.15,height-.35],[.15,.15],[.12,0]],[k.x,pipeY,pipeZ],'enamel');pipe.material=mat('enamel','#49218f');lathe('Copper pipe flare '+k.pitch,[[.181,height-.37],[.325,height],[.29,height+.025],[.152,height-.37]],[k.x,pipeY,pipeZ],'copper');for(const y of [pipeY+.2,pipeY+height-.55])cyl('Pipe collar',.197,.08,[k.x,y,pipeZ],'brass');
   line('Wind conduit '+k.pitch,[[k.x,1.15,-.4],[k.x,1.15,-2.6],[k.x,pipeY,-2.6]],.1,'brass');
   box('Pipe mouth '+k.pitch,[.22,.3,.06],[k.x,pipeY+.48,pipeZ+.18],'enamel',this.group,'#090714');
   line('Key action rod '+k.pitch,[[0,-.05,-.55],[0,-.15,-1.4],[0,-.8,-1.45]],.027,'brass',key);
   const lamp=mesh('Open valve indicator '+k.pitch,new THREE.SphereGeometry(.07,12,8),'glass',[k.x,2.55,-.65],this.group,track.color);lamp.material=mat('glass',track.color).clone();lamp.userData.motion={kind:'lamp',pitch:k.pitch};this.lamps.push(lamp);
  }else{
   const length=.6+(p.keys.length-p.keys.indexOf(k))/p.keys.length*.55;cyl('Tuned resonator '+k.pitch,.16,length,[k.x,k.y-.2-length/2,k.z],'brass');
  }
  for(const side of [-1,1])line('Note '+k.pitch+' guided approach',k.approach.map(v=>[v[0]+side*.09,v[1]-.105,v[2]]),.025,'brass');
  lathe('Pitch '+k.pitch+' release port',[[.12,0],[.12,.25],[.2,.28],[.2,.31],[.09,.31],[.09,0]],k.gate,'brass');
  lathe('Note '+k.pitch+' rebound collector',[[.07,0],[.08,.18],[.28,.52],[.3,.55],[.31,.51],[.11,.15]],[k.x,k.hit[1]-1.3,k.z+1.05],'brass');
  line('Collector return hose',[[k.x,k.hit[1]-1.3,k.z+1.05],[k.x,.7,k.z+1.05],[p.liftX,.7,-1.3]],.055,'enamel');
 }
 if(organ){this.bellows.name='Working bellows';this.bellows.position.set(0,1.5,2.7);this.bellows.userData.motion={kind:'bellows'};this.group.add(this.bellows);const vertices:number[]=[],faces:number[]=[];for(let i=0;i<=32;i++){const x=(i/32-.5)*width*.6,y=i%2?.4:.48,z=i%2?.45:.58;vertices.push(x,-y,-z,x,y,-z,x,y,z,x,-y,z);if(i)for(let j=0;j<4;j++){const a=(i-1)*4+j,b=(i-1)*4+(j+1)%4,c=i*4+(j+1)%4,d=i*4+j;faces.push(a,b,c,a,c,d);}}faces.push(0,2,1,0,3,2,128,129,130,128,130,131);let folds=new THREE.BufferGeometry();folds.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));folds.setIndex(faces);const flat=folds.toNonIndexed();folds.dispose();folds=flat;folds.computeVertexNormals();mesh('Sealed pleated leather bellows',folds,'leather',[0,0,0],this.bellows);for(const x of [-width*.3,width*.3])box('Bellows oak end',[.14,1.1,1.3],[x,0,0],'wood',this.bellows);}
 this.events=track.notes.map(n=>({time:noteTime(project,n),pitch:n.midi,velocity:n.velocity})).sort((a,b)=>a.time-b.time);let max=1,j=0;for(let i=0;i<this.events.length;i++){while(this.events[i].time-this.events[j].time>2.16)j++;max=Math.max(max,i-j+1);}this.balls=new THREE.InstancedMesh(new THREE.SphereGeometry(.14,20,12),mat('glass',track.color),max);this.balls.name='Scored note marbles';this.balls.userData.skipExport=true;this.balls.frustumCulled=false;this.balls.castShadow=true;this.group.add(this.balls);this.update(0);
 }
 activity(pitch:number,time:number){return keyActivity(this.project,{...this.track,notes:this.notesByPitch.get(pitch)||[]},pitch,time);}
 update(time:number){const p=this.project,t=this.track;this.keys.forEach((o,i)=>{const activity=this.activity(this.plan.keys[i].pitch,time);o.rotation.x=t.machine==='pipeworks'?-.09*activity.held:0;o.position.y=this.plan.keys[i].y-.035*activity.hit;});this.lamps.forEach((lamp,i)=>(lamp.material as THREE.MeshPhysicalMaterial).emissiveIntensity=.15+this.activity(this.plan.keys[i].pitch,time).held*3);this.bellows.scale.x=.8+.15*Math.sin(time*2.1);this.wheel.rotation.x=-time*.9;this.cups.forEach((o,i)=>o.position.set(...liftPosition(this.plan,i,time)));this.supplyBalls.forEach((o,i)=>o.position.set(...samplePath(this.plan.supply,((time*.11+i/12)%1+1)%1)));
 let count=0;for(const e of this.events){const age=time-e.time;if(age< -1.4)break;if(age>=.76||!audible(p,t))continue;const k=this.plan.keys.find(k=>k.pitch===e.pitch)!;this.dummy.position.set(...contraptionBall(k,age));this.dummy.updateMatrix();this.balls.setMatrixAt(count++,this.dummy.matrix);}this.balls.count=count;this.balls.instanceMatrix.needsUpdate=true;}
}
export function exportContraptions(p:Project){const layout=stationLayout(p);return {duration:duration(p),layouts:layout,stations:p.tracks.flatMap((t,i)=>{if(!isContraption(t.machine))return [];const machine=new ContraptionObjects(p,t,layout[i].width);machine.update(0);const geometries:Record<string,unknown>={},nodes:any[]=[],materialDefs:Record<string,unknown>={};let serial=0;
 const walk=(o:THREE.Object3D,parent:string|null)=>{if(o.userData.skipExport)return;const id='node-'+serial++;o.updateMatrix();const item:any={id,parent,name:o.name,matrix:Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>o.matrix.elements[c*4+r])),motion:o.userData.motion};if(o instanceof THREE.Mesh){const g=o.geometry,pos=g.getAttribute('position'),index=g.getIndex(),uv=g.getAttribute('uv'),norm=g.getAttribute('normal');if(!geometries[g.uuid])geometries[g.uuid]={vertices:Array.from({length:pos.count},(_,j)=>[pos.getX(j),pos.getY(j),pos.getZ(j)]),faces:Array.from({length:(index?.count??pos.count)/3},(_,j)=>[0,1,2].map(k=>index?index.getX(j*3+k):j*3+k)),uv:uv?Array.from({length:uv.count},(_,j)=>[uv.getX(j),uv.getY(j)]):[],normals:norm?Array.from({length:norm.count},(_,j)=>[norm.getX(j),norm.getY(j),norm.getZ(j)]):[]};const mat=o.material as THREE.MeshPhysicalMaterial;item.geometry=g.uuid;item.material=mat.name;materialDefs[mat.name]=mat.userData;}nodes.push(item);o.children.forEach(child=>walk(child,id));};walk(machine.group,null);
 machine.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});machine.materials.forEach(m=>{m.map?.dispose();m.dispose();});return [{trackId:t.id,plan:machine.plan,nodes,geometries,materials:materialDefs}];})};}
