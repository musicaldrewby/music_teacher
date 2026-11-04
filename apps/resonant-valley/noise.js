// Integer hashing keeps each coordinate independent of exploration order.
export function seedHash(text) {
  let h = 2166136261;
  for (const c of String(text)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function hash3(seed, x, y, z, salt = 0) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(salt, 1274126177);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
const fade = t => t*t*t*(t*(t*6-15)+10);
const mix = (a,b,t) => a+(b-a)*t;
export class Noise {
  constructor(seed) { this.seed = seedHash(seed); }
  random(x,z,salt=0) { return hash3(this.seed,x,0,z,salt); }
  value2(x,z,salt=0) {
    const ix=Math.floor(x),iz=Math.floor(z),fx=fade(x-ix),fz=fade(z-iz);
    const r=(a,b)=>hash3(this.seed,a,0,b,salt)*2-1;
    return mix(mix(r(ix,iz),r(ix+1,iz),fx),mix(r(ix,iz+1),r(ix+1,iz+1),fx),fz);
  }
  value3(x,y,z,salt=0) {
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=fade(x-ix),fy=fade(y-iy),fz=fade(z-iz);
    const r=(a,b,c)=>hash3(this.seed,a,b,c,salt)*2-1;
    const plane=dy=>mix(mix(r(ix,iy+dy,iz),r(ix+1,iy+dy,iz),fx),mix(r(ix,iy+dy,iz+1),r(ix+1,iy+dy,iz+1),fx),fz);
    return mix(plane(0),plane(1),fy);
  }
  fbm(x,z,octaves=4,salt=0) {
    let sum=0,weight=1,total=0;
    for(let i=0;i<octaves;i++){sum+=this.value2(x,z,salt+i*19)*weight;total+=weight;weight*=.5;x*=2.03;z*=2.03;}
    return sum/total;
  }
}
