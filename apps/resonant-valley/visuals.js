// Neutral daylight keeps the pixel palette distinct; sunset remains optional.
export const SKY = {
 day:{sky:'#72c9ff',hemi:'#eef8ff',ground:'#587d9d',ambient:1.55,sun:'#ffffff',sunlight:2.35,water:1},
 sunset:{sky:'#d195cf',hemi:'#e8d8ff',ground:'#665d91',ambient:1.15,sun:'#ffd39b',sunlight:2.25,water:.85},
 night:{sky:'#152958',hemi:'#9cbbff',ground:'#263865',ambient:.4,sun:'#b5d1ff',sunlight:.5,water:.45}
};
export const isLeaf=id=>id===5||id===12||id===22||id===27;
export const LEAF_PALETTES={27:['#3f784d','#66984d','#8db958','#b1ce76'],5:['#22663b','#329d46','#50bc42','#81d64d'],12:['#a83b26','#dc572b','#f78b2d','#ffbc44'],22:['#155d50','#187a59','#249d69','#56bb7d']};
// Two-pixel cutouts, with no semitransparent pixels or sorted alpha blending.
export function leafPixels(id){
 const colors=LEAF_PALETTES[id],data=new Uint8ClampedArray(32*32*4);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const n=((x*73+y*151+id*31)^(x*y*17))>>>0;
  const hole=n%13<3||((x+2*y+id)%11===0);
  const rgb=colors[(n%7<3?1:n%4)].match(/[a-f\d]{2}/gi).map(h=>parseInt(h,16));
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const at=((y*2+dy)*32+x*2+dx)*4;data.set([...rgb,hole?0:255],at);}
 }
 return data;
}
