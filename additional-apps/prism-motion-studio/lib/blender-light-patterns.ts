import * as T from 'three';
/** Store the exact linear, bottom-up mask used by WebGL. Blender needs no external images. */
export function packLightPattern(light:T.SpotLight,id:string){
 if(!(light.map instanceof T.DataTexture))return undefined;
 const {width,height,data}=light.map.image,rgba=new Float32Array(width*height*4);
 for(let i=0;i<rgba.length;i++)rgba[i]=Number(data[i])/255;
 return {info:{file:`${id}-pattern.f32`,width,height},bytes:new Uint8Array(rgba.buffer)};
}
