import * as THREE from './vendor/three.module.js';
export function walkingInput(keys){
 const shift=keys.has('ShiftLeft')||keys.has('ShiftRight');
 let x=Number(keys.has('ArrowRight')||(shift&&keys.has('KeyD')))-Number(keys.has('ArrowLeft')||(shift&&keys.has('KeyA')));
 let z=Number(keys.has('ArrowDown')||(shift&&keys.has('KeyS')))-Number(keys.has('ArrowUp')||(shift&&keys.has('KeyW')));
 const n=Math.hypot(x,z)||1;return {x:x/n,z:z/n};
}
export function desktopFrame(s,camera,width,height,safe,zoom=1){
 const wall=['bass','drums','synth','notewall','gallery','boomwhacker','gong','windchimes'].includes(s.type);
 const w=['notewall','gallery'].includes(s.type)?6.5:['bass','drums','synth'].includes(s.type)?4:1.75;
 const h=['notewall','gallery'].includes(s.type)?3.9:['bass','drums','synth'].includes(s.type)?3.2:['gong','windchimes'].includes(s.type)?2.7:wall?2:1.5;
 const targetY=(s.heightOffset||0)+(['notewall','gallery'].includes(s.type)?2.1:['bass','drums','synth'].includes(s.type)?1.95:['gong','windchimes'].includes(s.type)?1.3:wall?1.2:1.05);
 const usableW=Math.max(160,safe.right-safe.left),usableH=Math.max(120,safe.bottom-safe.top),tan=Math.tan(camera.fov*Math.PI/360);
 let distance=Math.max(w/(2*tan*(width/height)*usableW/width),h/(2*tan*usableH/height))*1.12*zoom+(wall?.35:.1);
 let pitch=wall?Math.atan2(targetY-camera.position.y,distance):-.60;
 // Low instruments are viewed from above, with the same framing margin.
 let eyeHeight=wall?camera.position.y:targetY+distance*Math.tan(.60);
 const offset=new THREE.Vector3(0,0,distance).applyAxisAngle(new THREE.Vector3(0,1,0),s.rot||0);
 const x=THREE.MathUtils.clamp(s.x+offset.x,-8.65,8.65),z=THREE.MathUtils.clamp(s.z+offset.z,s.type==='gallery'?10:-8.65,s.type==='gallery'?17:8.65);distance=Math.hypot(x-s.x,z-s.z);eyeHeight=wall?camera.position.y:Math.min(3.8,targetY+distance*Math.tan(.60));pitch=Math.atan2(targetY-eyeHeight,distance);
 return {x,z,eyeHeight,pitch,distance,offsetX:width/2-(safe.left+safe.right)/2,offsetY:height/2-(safe.top+safe.bottom)/2};
}
