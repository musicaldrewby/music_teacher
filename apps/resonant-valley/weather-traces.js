import * as THREE from './vendor/three.module.min.js';
const wetGround=new Set([1,2,3,7,14,17,18,19,24,25]),tracksGround=new Set([1,2,3,10,13,14,18,19,21,24,25]);
const dummy=new THREE.Object3D(),ice=new THREE.Color('#e6f4ff'),dusk=new THREE.Color('#ffb9a5');
const outline=[[-.45,-.18],[-.29,-.18],[-.29,-.36],[.21,-.36],[.21,-.26],[.43,-.26],[.43,.12],[.29,.12],[.29,.32],[-.18,.32],[-.18,.24],[-.45,.24]];
function patch(points){
 const v=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];v.push(0,0,0,b[0],0,b[1],a[0],0,a[1]);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));return g;
}
function batch(scene,geometry,color,max,opacity){
 const mat=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const mesh=new THREE.InstancedMesh(geometry,mat,max);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);return mesh;
}
function stamp(mesh,x,y,z,sx,sz,angle=0){
 if(mesh.count>=mesh.instanceMatrix.count)return;
 dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(sx,1,sz);dummy.updateMatrix();mesh.setMatrixAt(mesh.count++,dummy.matrix);
}
function reflectSky(material){
 const uniforms={puddleTop:{value:new THREE.Color()},puddleHorizon:{value:new THREE.Color()}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 poolPoint;\n'+shader.vertexShader.replace('#include <project_vertex>',
   '#include <project_vertex>\npoolPoint=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='uniform vec3 puddleTop; uniform vec3 puddleHorizon; varying vec3 poolPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\nvec3 eye=normalize(cameraPosition-poolPoint); float h=clamp(eye.y,0.,1.); float sheen=pow(1.-h,2.); vec3 reflected=mix(puddleHorizon,puddleTop,smoothstep(.03,.80,h)); diffuseColor.rgb=mix(reflected*.72,reflected,sheen); diffuseColor.a=.54+.37*sheen;');
 };
 material.customProgramCacheKey=()=>'weather-sky-reflection-1';return uniforms;
}
const tile=()=>patch([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]);
export class WeatherTraces{
 constructor(world){
  this.w=world;this.pools=batch(world.scene,patch(outline),'#92c7dd',225,.82);
  this.reflection=reflectSky(this.pools.material);
  this.glints=batch(world.scene,tile(),'#d6eaf4',180,.68);
  this.caps=batch(world.scene,tile(),'#e1f3ff',680,.95);
  this.prints=batch(world.scene,patch([[-.4,-.49],[.29,-.49],[.45,-.33],[.45,.2],[.26,.44],[-.22,.44],[-.4,.23]]),'#fff',120,.73);
  this.reset();
 }
 reset(){this.steps=[];this.last=null;this.stride=0;this.left=false;this.refill=-1;for(const mesh of [this.pools,this.glints,this.caps,this.prints])mesh.count=0;}
 walk(pos,feet,time,grounded){
  const w=this.w,previous=this.last;this.last=grounded?{x:pos.x,z:pos.z}:null;
  if(!previous||!grounded)return;
  const dx=pos.x-previous.x,dz=pos.z-previous.z,d=Math.hypot(dx,dz);
  if(d>2){this.stride=0;return;}this.stride+=d;if(this.stride<.82||d<.0001)return;
  this.stride%=.82;this.left=!this.left;const side=this.left?.105:-.105,x=pos.x+side*dz/d,z=pos.z-side*dx/d,y=Math.floor(feet-.045);
  const id=w.get(x,y,z),exposure=w.outdoorSurface(x,z);
  if(!tracksGround.has(id)||Math.abs(feet-y-1)>.16)return;
  const cave=exposure>feet+2,wet=w.atmosphere.puddles>.09||w.atmosphere.snowpack>.09;
  if(!cave&&!wet&&![10,14,18,21].includes(id))return;
  const light=w.lightAt(x,y+1,z);
  this.steps.push({x,y:y+1.023,z,angle:Math.atan2(dx,dz),time,shade:Math.max(.035,light[0],light[1]),snow:id===21||!cave&&w.atmosphere.snowpack>.25});
  if(this.steps.length>120)this.steps.shift();
 }
 update(t,s){
  const w=this.w,p=w.camera.position;
  const sky=w.skyScene?.dome.material.uniforms;this.reflection.puddleHorizon.value.copy(sky?.horizon.value||w.scene.fog.color);this.reflection.puddleTop.value.copy(sky?.top.value||w.scene.fog.color);
  this.glints.material.color.copy(ice).lerp(dusk,s.twilight).multiplyScalar(.22+s.daylight*.78);
  this.caps.material.color.copy(ice).multiplyScalar(.19+.81*s.daylight);
  if(t<this.refill)return;this.refill=t+.34;
  const {pools,glints,caps,prints}=this;for(const m of [pools,glints,caps,prints])m.count=0;
  const noise=w.generator.noise;
  if(s.puddles>.025||s.snowpack>.025){
   const gx=Math.floor(p.x),gz=Math.floor(p.z);
   for(let dx=-13;dx<=13;dx++)for(let dz=-13;dz<=13;dz++){
    if(dx*dx+dz*dz>169)continue;
    const x=gx+dx,z=gz+dz,y=w.outdoorSurface(x,z);
    if(!Number.isFinite(y)||Math.abs(y-p.y)>22||!Number.isInteger(y))continue;
    const id=w.get(x,y-1,z),roll=noise.random(x,z,1559);
    if(s.snowpack>.025&&(id===22||id===21||wetGround.has(id))&&roll<(id===22?.98:.32)*s.snowpack){
     const size=Math.min(.99,.35+s.snowpack*.67);stamp(caps,x+.5,y+.013,z+.5,size,size);
    }else if(wetGround.has(id)&&roll<s.puddles*.46&&noise.value2(x/3,z/3,1567)>.04&&w.outdoorSurface(x+1,z)===y&&w.outdoorSurface(x,z+1)===y){
     const size=.47+s.puddles*.58;stamp(pools,x+.5,y+.014,z+.5,size,size,roll>.15?Math.PI/2:0);
     if(roll<.17){const shimmer=(Math.floor(t*2)+Math.floor(roll*83))%4;stamp(glints,x+.48+(shimmer-1.5)*.055,y+.019,z+.48,.10+shimmer*.038,.035);}
    }
   }
  }
  this.steps=this.steps.filter(f=>t-f.time<100);
  for(const f of this.steps){
   const age=t-f.time;if(Math.abs(f.x-p.x)>30||Math.abs(f.z-p.z)>30||!tracksGround.has(w.get(f.x,f.y-.05,f.z)))continue;
   const i=prints.count,fade=Math.min(1,(100-age)/22);
   stamp(prints,f.x,f.y,f.z,.17*fade,.31*fade,f.angle);
   const col=new THREE.Color(f.snow?'#668198':'#715e51').multiplyScalar(f.shade*(.28+.72*s.daylight));prints.setColorAt(i,col);
  }
  for(const m of [pools,glints,caps,prints])m.instanceMatrix.needsUpdate=true;
  if(prints.instanceColor)prints.instanceColor.needsUpdate=true;
 }
}
