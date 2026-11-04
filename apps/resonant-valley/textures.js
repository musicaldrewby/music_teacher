import {BLOCKS} from './data.js';
import {leafPixels} from './visuals.js';
import {materialPixels} from './material-art.js';
import {TILE,CELL,PAD,WIDTH,HEIGHT,tileOrigin} from './atlas-layout.js';

function fixedTile(tile,ctx){
 const block=BLOCKS[tile+1]||BLOCKS[2];
 if(block.texture==='leaf')return leafPixels(tile+1);
 ctx.clearRect(0,0,TILE,TILE);
 if(block.texture==='glass'){
  ctx.fillStyle='#b7e4ef40';ctx.fillRect(0,0,32,32);ctx.strokeStyle='#d8f4f2b0';ctx.lineWidth=2;ctx.strokeRect(1,1,30,30);
  ctx.fillStyle='#e4faf566';ctx.fillRect(6,5,3,12);ctx.fillRect(10,14,3,6);
 }else{
  ctx.fillStyle=block.color;ctx.fillRect(0,0,32,32);
  if(block.texture==='relic'){
   ctx.fillStyle='#7352a6';ctx.fillRect(4,4,24,24);ctx.fillStyle='#f3d18e';
   ctx.fillRect(6,6,20,3);ctx.fillRect(6,23,20,3);ctx.fillRect(14,12,4,9);ctx.fillRect(10,18,7,5);
  }
 }
 return ctx.getImageData(0,0,TILE,TILE).data;
}
export function createAtlasCanvas(){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(WIDTH,HEIGHT),out=new Uint32Array(image.data.buffer);
 const small=document.createElement('canvas');small.width=small.height=TILE;
 const brush=small.getContext('2d',{willReadFrequently:true});
 for(let tile=0;tile<32;tile++){
  let fixed;
  for(let v=0;v<4;v++){
   const bytes=materialPixels(tile,v)??(fixed??=fixedTile(tile,brush));
   const pixels=new Uint32Array(bytes.buffer,bytes.byteOffset,TILE*TILE),[x,y]=tileOrigin(tile,v);
   for(let row=0;row<CELL;row++){
    const src=Math.min(TILE-1,Math.max(0,row-PAD))*TILE,dst=(y+row)*WIDTH+x;
    out.fill(pixels[src],dst,dst+PAD);out.set(pixels.subarray(src,src+TILE),dst+PAD);
    out.fill(pixels[src+TILE-1],dst+PAD+TILE,dst+CELL);
   }
  }
 }
 ctx.putImageData(image,0,0);return canvas;
}
