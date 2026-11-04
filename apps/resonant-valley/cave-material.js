import * as THREE from './vendor/three.module.min.js';
// Only sky/sun terms are attenuated. The carried torch remains a real shadowed
// point light; placed lights use the occlusion-aware voxel light field.
export function caveMaterial(material,{attributes=false,light={value:new THREE.Vector2(1,0)}}={}){
 material.userData.valleyLight=light;
 material.onBeforeCompile=shader=>{
  shader.uniforms.valleyLight=light;
  shader.vertexShader=(attributes?'attribute vec2 blockLight;':'uniform vec2 valleyLight;')+'\nvarying vec2 vValleyLight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvValleyLight = '+(attributes?'blockLight':'valleyLight')+';');
  shader.fragmentShader='varying vec2 vValleyLight;\n'+shader.fragmentShader;
  const lighting=THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color *= valleySky;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',`float valleySky = pow(clamp(vValleyLight.x, 0.0, 1.0), 2.0);\n${lighting}\nirradiance *= max(0.002, valleySky);\nirradiance += vec3(3.6, 2.15, 0.85) * pow(vValleyLight.y, 2.0);`);
  const fog=THREE.ShaderChunk.fog_fragment.replace('fogColor, fogFactor','mix(vec3(0.003, 0.004, 0.007), fogColor, clamp(vValleyLight.x, 0.0, 1.0)), fogFactor');
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',fog);
 };
 material.customProgramCacheKey=()=>attributes?'valley-cave-vertex-v1':'valley-cave-uniform-v1';return material;
}
