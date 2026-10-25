import * as T from 'three';

// three-gpu-pathtracer 0.0.24 already uploads an atlas for spot-light IES textures,
// but its stock shader reads only one row. Prism uses that atlas for projected
// masks. Keep this small adapter guarded and tested against the pinned dependency.
const original=/float spotAttenuation = light\.iesProfile != - 1 \?\s*getPhotometricAttenuation\( iesProfiles, light\.iesProfile, direction, normal, u, v \) :\s*getSpotAttenuation\( light\.coneCos, light\.penumbraCos, cosTheta \);/;
export function patternTracingShader(shader:string){
 if(!original.test(shader))throw Error('This physical renderer does not support light patterns. Choose Standard rendering.');
 return shader.replace(original,`float spotAttenuation = getSpotAttenuation( light.coneCos, light.penumbraCos, cosTheta );
  if ( light.iesProfile != -1 ) {
   vec3 projectorDirection = normalize( light.position - rayOrigin );
   float forward = dot( projectorDirection, normal );
   vec2 patternUv = vec2( 0.5 ) - vec2( dot( projectorDirection, u ), dot( projectorDirection, v ) ) / ( 2.0 * max( forward * angleTan, EPSILON ) );
   if ( forward <= 0.0 ) spotAttenuation = 0.0;
   else spotAttenuation *= texture2D( iesProfiles, vec3( clamp( patternUv, vec2( 0.0 ), vec2( 1.0 ) ), light.iesProfile ) ).r;
  }`);
}
type PatternMaterial=T.ShaderMaterial&{iesProfiles:T.Texture&{setTextures:(renderer:T.WebGLRenderer,textures:T.Texture[],width?:number,height?:number)=>void}};
export function enablePatternTracing(tracer:unknown){
 const internal=tracer as {_pathTracer?:{material:PatternMaterial}};const material=internal._pathTracer?.material;
 if(!material)throw Error('Light patterns need the Standard renderer on this version.');
 material.fragmentShader=patternTracingShader(material.fragmentShader);
 const upload=material.iesProfiles.setTextures;
 material.iesProfiles.setTextures=(renderer,textures)=>upload(renderer,textures,512,512);material.needsUpdate=true;
}
/** Same centered perspective UV as Three's spotlight shadow camera. */
export function projectedPatternUV(light:T.SpotLight,worldPoint:T.Vector3){
 light.updateWorldMatrix(true,false);light.target.updateWorldMatrix(true,false);
 const position=light.getWorldPosition(new T.Vector3()),target=light.target.getWorldPosition(new T.Vector3()),basis=new T.Matrix4().lookAt(position,target,new T.Vector3(0,1,0));
 const offset=worldPoint.clone().sub(position),x=new T.Vector3().setFromMatrixColumn(basis,0),y=new T.Vector3().setFromMatrixColumn(basis,1),z=new T.Vector3().setFromMatrixColumn(basis,2),forward=-offset.dot(z),diameter=2*forward*Math.tan(light.angle);
 return new T.Vector2(.5+offset.dot(x)/diameter,.5+offset.dot(y)/diameter);
}
