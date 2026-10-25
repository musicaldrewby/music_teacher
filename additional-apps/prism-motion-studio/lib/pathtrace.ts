import * as T from 'three';
import {enablePatternTracing} from './pathtrace-light-patterns';
import {stereoEyePose,type StereoEye,type RenderPose} from './stereo';
import type {WebGLPathTracer} from 'three-gpu-pathtracer';
import {configurePhysicalFocus,type PhysicalLensCamera} from './focus';
import {sampleCamera} from './sequence';
import type {CameraPose} from './scene';
import type {Engine} from './engine';

// Keep the flattened objects stable between frames so the BVH can refit animated geometry.
// traverseVisible also excludes children of hidden layers and hidden type-on glyphs.
export function flattenTraceScene(world:T.Scene,target:T.Scene,cache:Map<string,T.Object3D>,options:{omit?:T.Object3D|T.Object3D[];castShadow:boolean}){
 world.updateMatrixWorld(true);target.clear();target.environmentIntensity=world.environmentIntensity;target.environmentRotation.copy(world.environmentRotation);
 world.traverseVisible(source=>{
  const excluded=Array.isArray(options.omit)?options.omit:options.omit?[options.omit]:[];for(let ancestor:T.Object3D|null=source;ancestor;ancestor=ancestor.parent)if(excluded.includes(ancestor)||ancestor.userData.editorHelper)return;
  if(source instanceof T.Mesh){
   let mesh=cache.get(source.uuid) as T.Mesh|undefined;if(!mesh){mesh=new T.Mesh(source.geometry,source.material);mesh.matrixAutoUpdate=false;cache.set(source.uuid,mesh);}
   mesh.geometry=source.geometry;mesh.material=source.material;if(source.morphTargetInfluences){mesh.morphTargetInfluences=[...source.morphTargetInfluences];mesh.morphTargetDictionary=source.morphTargetDictionary;}mesh.matrix.copy(source.matrixWorld);mesh.matrixWorld.copy(source.matrixWorld);
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])(material as T.Material & {castShadow:boolean}).castShadow=options.castShadow&&source.castShadow;
   target.add(mesh);
  }else if(source instanceof T.PointLight){
   let light=cache.get(source.uuid) as T.PointLight|undefined;if(!light){light=new T.PointLight();cache.set(source.uuid,light);}
   light.color.copy(source.color);light.intensity=source.intensity;source.getWorldPosition(light.position);light.distance=source.distance;light.decay=source.decay;light.castShadow=source.castShadow;target.add(light);
  }else if(source instanceof T.DirectionalLight||source instanceof T.SpotLight){
   let light=cache.get(source.uuid) as T.DirectionalLight|T.SpotLight|undefined;
   if(!light){light=source instanceof T.SpotLight?new T.SpotLight():new T.DirectionalLight();cache.set(source.uuid,light);}
   light.color.copy(source.color);light.intensity=source.intensity;source.getWorldPosition(light.position);source.target.getWorldPosition(light.target.position);
   if(light instanceof T.SpotLight&&source instanceof T.SpotLight){(light as T.SpotLight&{iesMap:T.Texture|null}).iesMap=source.map;light.angle=source.angle;light.penumbra=source.penumbra;light.distance=source.distance;light.decay=source.decay;(light as T.SpotLight & {radius?:number}).radius=(source as T.SpotLight & {radius?:number}).radius;}
   target.add(light,light.target);
  }
 });target.updateMatrixWorld(true);
}
export class PathTraceSession{
 private traceScene=new T.Scene();private cache=new Map<string,T.Object3D>();private particles:T.Mesh[]=[];private particleGeometry=new T.SphereGeometry(1,6,4);private backdrop?:CanvasImageSource;output:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;
 private constructor(private engine:Engine,private tracer:WebGLPathTracer,private physicalCamera:PhysicalLensCamera){
  this.output=document.createElement('canvas');this.output.width=engine.canvas.width;this.output.height=engine.canvas.height;const ctx=this.output.getContext('2d');if(!ctx)throw Error('Could not prepare the path-traced export canvas.');this.ctx=ctx;
  this.traceScene.environment=engine.environmentMap||null;const bg=engine.world.background;if(bg instanceof T.Texture)this.backdrop=bg.image as CanvasImageSource;
 }
 static async create(engine:Engine){
  if(!engine.renderer.extensions.has('EXT_color_buffer_float'))throw Error('Path tracing needs floating-point WebGL render targets on this device. Choose the standard renderer.');
  const {WebGLPathTracer,PhysicalCamera}=await import('three-gpu-pathtracer');const tracer=new WebGLPathTracer(engine.renderer),settings=engine.scene!.renderSettings;
  if(engine.scene!.manualRig.mode==='custom'&&engine.scene!.manualRig.lights.some(l=>l.kind==='spot'&&l.pattern.kind!=='none')){try{enablePatternTracing(tracer);}catch(error){tracer.dispose();throw error;}}
  tracer.bounces=settings.bounces;tracer.transmissiveBounces=8;tracer.multipleImportanceSampling=true;tracer.renderDelay=0;tracer.fadeDuration=0;tracer.minSamples=1;tracer.rasterizeScene=false;tracer.dynamicLowRes=false;tracer.tiles.set(2,2);tracer.textureSize.set(1024,1024);
  // The library's default compositing callback retains earlier canvas pixels.
  // Each export sample must start transparent, independent of the editor render.
  tracer.renderToCanvasCallback=(_target,renderer,quad)=>{const color=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;renderer.setRenderTarget(null);renderer.setClearColor(0,0);renderer.clear();renderer.autoClear=false;quad.render(renderer);renderer.autoClear=auto;renderer.setClearColor(color,alpha);};
  return new PathTraceSession(engine,tracer,new PhysicalCamera());
 }
 async frame(time:number,transparent:boolean,signal:AbortSignal,progress:(v:number)=>void=()=>{},eye?:StereoEye){
  const scene=this.engine.scene!,base=sampleCamera(scene,time),plan=eye?{...base,current:stereoEyePose(base.current,scene.stereo,eye),previous:base.previous?stereoEyePose(base.previous,scene.stereo,eye):undefined}:base;
  if(!plan.previous)return this.singleFrame(time,transparent,signal,progress,plan.current);
  await this.singleFrame(time,transparent,signal,v=>progress(v/2),plan.previous);
  const first=document.createElement('canvas');first.width=this.output.width;first.height=this.output.height;first.getContext('2d')!.drawImage(this.output,0,0);
  await this.singleFrame(time,transparent,signal,v=>progress(.5+v/2),plan.current);
  const second=document.createElement('canvas');second.width=this.output.width;second.height=this.output.height;second.getContext('2d')!.drawImage(this.output,0,0);
  // Weighted premultiplied addition also preserves transparent PNG edges.
  this.ctx.clearRect(0,0,this.output.width,this.output.height);this.ctx.save();this.ctx.globalAlpha=1-plan.mix;this.ctx.drawImage(first,0,0);this.ctx.globalCompositeOperation='lighter';this.ctx.globalAlpha=plan.mix;this.ctx.drawImage(second,0,0);this.ctx.restore();first.width=second.width=0;return this.output;
 }
 private async singleFrame(time:number,transparent:boolean,signal:AbortSignal,progress:(v:number)=>void,camera:RenderPose){
  if(signal.aborted)throw Error('Export canceled');const engine=this.engine,scene=engine.scene!;engine.render(time,transparent,camera);
  flattenTraceScene(engine.world,this.traceScene,this.cache,{omit:transparent?[engine.floor,engine.stage].filter((o):o is T.Group|T.Mesh=>!!o):undefined,castShadow:scene.shadows.mode!=='off'});
  // The physical renderer consumes meshes, so turn the editor's Points into tiny emissive spheres.
  const points=engine.particles;if(points?.visible){const positions=points.geometry.attributes.position,colors=points.geometry.attributes.color;
   for(let i=0;i<positions.count;i++){let mesh=this.particles[i];if(!mesh){const color=new T.Color().fromBufferAttribute(colors,i);mesh=new T.Mesh(this.particleGeometry,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.7,roughness:1}));this.particles[i]=mesh;}mesh.position.fromBufferAttribute(positions,i).applyMatrix4(points.matrixWorld);mesh.scale.setScalar(scene.particles==='confetti'?.035:.013);this.traceScene.add(mesh);}
  }
  this.traceScene.updateMatrixWorld(true);configurePhysicalFocus(this.physicalCamera,engine.camera,scene.lens,engine.focusDistance());this.tracer.setScene(this.traceScene,this.physicalCamera);const samples=scene.renderSettings.samples,start=performance.now();let iterations=0;
  while(this.tracer.samples<samples){
   if(signal.aborted)throw Error('Export canceled');if(engine.renderer.getContext().isContextLost())throw Error('The GPU context was lost. Try fewer samples or the standard renderer.');
   this.tracer.renderSample();progress(Math.min(1,this.tracer.samples/samples));
   if(this.tracer.samples<1&&performance.now()-start>120000)throw Error('The path-tracing shader did not become ready. Try the standard renderer on this device.');
   if(++iterations%2===0)await new Promise(r=>setTimeout(r,0));
  }
  this.ctx.clearRect(0,0,this.output.width,this.output.height);if(!transparent&&this.backdrop)this.ctx.drawImage(this.backdrop,0,0,this.output.width,this.output.height);this.ctx.drawImage(engine.canvas,0,0);progress(1);return this.output;
 }
 dispose(){this.tracer.dispose();this.particleGeometry.dispose();this.particles.forEach(p=>(p.material as T.Material).dispose());this.cache.forEach(o=>{if(o instanceof T.DirectionalLight||o instanceof T.SpotLight||o instanceof T.PointLight)o.shadow.dispose();});this.traceScene.clear();this.cache.clear();}
}
