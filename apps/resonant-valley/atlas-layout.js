// A 32px face sits inside its own guard band so minification filters read
// matching edge colors. The same layout is used by the atlas and mesh worker.
export const TILE=32, CELL=64, PAD=(CELL-TILE)/2, WIDTH=CELL*16, HEIGHT=CELL*8;
export function tileOrigin(tile,variant){
 return [((tile%8)+8*(variant%2))*CELL,((tile>>3)+4*(variant>>1))*CELL];
}
export const faceUVs=Array.from({length:32},(_,tile)=>Array.from({length:4},(_,variant)=>{
 const [x,y]=tileOrigin(tile,variant),u=(x+PAD)/WIDTH,v=1-(y+PAD)/HEIGHT,w=TILE/WIDTH,h=TILE/HEIGHT;
 return [[u,v-h],[u+w,v-h],[u,v],[u+w,v]];
}));
