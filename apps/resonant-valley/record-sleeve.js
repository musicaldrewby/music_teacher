import {seedHash} from './noise.js';

export const SLEEVE_SIZE=16;
export const SLEEVE_PALETTE=[
  ['Midnight','#15223a'],['Indigo','#324578'],['Ocean','#447abd'],['Sky','#92ceee'],
  ['Lagoon','#398e88'],['Mint','#a4dfbb'],['Plum','#8463a0'],['Rose','#e187ab'],
  ['Coral','#ed836c'],['Gold','#efbb60'],['Paper','#f3e4c4'],['Ink','#252137']
];
const colors=SLEEVE_PALETTE.map(([,hex])=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
export const validSleeve=value=>typeof value==='string'&&value.length===256&&/^[0-9ab]+$/.test(value);
export const SLEEVE_DESIGNS=['Ridge','Orbit','Steps'];

export function makeSleeve(id,design=seedHash(String(id))%SLEEVE_DESIGNS.length){
  const seed=seedHash(String(id)),theme=seed%4;
  const [dark,mid,light,pop]=[[0,2,3,9],[11,6,7,10],[0,4,5,8],[1,8,9,10]][theme];
  const pixels=[];
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    let ink=dark;
    if(design===0){
      ink=light;
      const sun=4+(seed>>>5)%8;
      if((x-sun)**2+(y-4)**2<8)ink=pop;
      if(y>=Math.max(5,7+Math.floor(Math.abs(x-6)*.53)))ink=mid;
      if(y>=10+Math.floor(Math.abs(x-12)*.36))ink=dark;
      if(y===14&&x>2&&x<9)ink=pop;
    }else if(design===1){
      const r=Math.hypot(x-7.5,y-7.5);
      ink=(x+y)%8<2?mid:dark;
      if(r<6.7)ink=r>5.9||r>3.7&&r<4.4?light:11;
      if(r<2.55)ink=pop;if(r<.85)ink=dark;
    }else{
      ink=(x<2||y>13)?light:dark;
      const height=3+(2+Math.floor(x/3)*3+(seed>>>8)%6)%11;
      if(x>2&&x%3!==0&&y<13&&y>=13-height)ink=(x<8?mid:pop);
      if(y===2&&x>2&&x<8)ink=light;
    }
    pixels.push(ink.toString(16));
  }
  return pixels.join('');
}
export function sleeveFor(record){return validSleeve(record?.sleeve)?record.sleeve:makeSleeve(record?.id??'');}
export function sleeveBytes(sleeve,flip=false){
  const bytes=new Uint8Array(16*16*4);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const i=(y*16+x)*4,source=(flip?15-y:y)*16+x;
    const rgb=colors[parseInt(sleeve[source],16)]??colors[0];bytes.set(rgb,i);bytes[i+3]=255;
  }
  return bytes;
}
export function drawSleeve(canvas,sleeve){
  canvas.width=16;canvas.height=16;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(16,16);
  image.data.set(sleeveBytes(sleeve));ctx.putImageData(image,0,0);
}
export function crateContents(entity,known){
  const ids=Array.isArray(entity?.recordIds)?entity.recordIds:[];
  return [...new Set(ids.filter(id=>typeof id==='string'&&id.length<=80&&(!known||known.has(id))))].slice(0,60);
}
export function cratePack(entity){
  return {id:entity.id,recordIds:crateContents(entity),recordId:typeof entity.recordId==='string'?entity.recordId:null};
}
