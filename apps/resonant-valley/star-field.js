import {seedHash} from './noise.js';

// Keep the sky's random stream separate from terrain and weather. Adjacent
// coordinate hashes are correlated and can turn a star field into curved rows.
export function createStarField(seed,count=900){
 let state=seedHash(String(seed)+' stars');
 const next=()=>{
  state=(state+0x6d2b79f5)>>>0;
  let n=Math.imul(state^(state>>>15),state|1);
  n^=n+Math.imul(n^(n>>>7),n|61);
  return ((n^(n>>>14))>>>0)/4294967296;
 };
 const position=new Float32Array(count*3),color=new Float32Array(count*3),size=new Float32Array(count);
 for(let i=0;i<count;i++){
  // Uniform height, rather than latitude, gives equal density over the sphere.
  const angle=next()*Math.PI*2,y=next()*2-1,r=Math.sqrt(1-y*y),j=i*3;
  position.set([Math.cos(angle)*r*145,y*145,Math.sin(angle)*r*145],j);
  const brightness=.45+.55*next()**2;
  color.set([brightness,brightness,brightness],j);
  size[i]=.72+.58*next()**3;
 }
 return {position,color,size};
}
