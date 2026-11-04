import {WATER,solid} from './terrain.js';

const GRAVITY=19;
export const SWIM_RISE=4;

export function shoreJumpSpeed(world,x,feet,z){
  // Check both sides of the feet so a wading player and a bobbing swimmer can jump.
  let wetY=feet+.08;
  if(!world.isWater(x,wetY,z)){
    wetY=feet-.12;
    if(!world.isWater(x,wetY,z))return 0;
  }
  if(world.isWater(x,feet+.9,z))return 0;
  const wetCell=Math.floor(wetY);
  const surfaceCell=world.get(x,wetCell+1,z)===WATER?wetCell+1:wetCell;
  const reach=.6;
  for(let top=surfaceCell+2;top>=surfaceCell+1&&top>feet;top--){
    for(let bx=Math.floor(x-reach);bx<=Math.floor(x+reach);bx++){
      for(let bz=Math.floor(z-reach);bz<=Math.floor(z+reach);bz++){
        const dx=Math.max(bx-x,0,x-bx-1),dz=Math.max(bz-z,0,z-bz-1);
        if(dx*dx+dz*dz>reach*reach||!solid(world.get(bx,top-1,bz)))continue;
        if(world.isWater(bx+.5,top+.02,bz+.5)||world.collides(bx+.5,top,bz+.5))continue;
        // Leave enough time above the lip to move onto it, even at 20 fps.
        return Math.sqrt(2*GRAVITY*(top-feet+.45));
      }
    }
  }
  return 0;
}

export function verticalSpeed(speed,dt,swimming,rise,dive){
  // A push off a bank keeps its momentum while the swimmer breaks the surface.
  if(swimming&&speed<=SWIM_RISE)return rise?SWIM_RISE:dive?-3:Math.max(-1.2,speed*.88);
  return Math.max(-24,speed-GRAVITY*dt);
}

export function movementIntent(keys, flying, stick, rise = keys.Space, lower = false) {
  let forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + (stick?.forward || 0);
  let side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + (stick?.side || 0);
  const length = Math.max(1,Math.hypot(forward,side));
  forward /= length; side /= length;
  const shift = !!(keys.ShiftLeft || keys.ShiftRight);
  const sprint = !!(keys.ControlLeft || keys.ControlRight);
  const crouch = shift && !flying;
  const speed = flying ? (sprint ? 14 : 8.5) : crouch ? 1.35 : sprint ? 5.6 : 4.3;
  const vertical = flying ? (rise ? 1 : 0) - (shift || keys.KeyC || lower ? 1 : 0) : 0;
  return {forward,side,shift,sprint,crouch,speed,vertical};
}
