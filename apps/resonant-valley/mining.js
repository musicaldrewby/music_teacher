import {requiredTool,mayHarvest,TOOLS} from './equipment.js';
import {MIN_Y,WATER} from './terrain.js';

// Hand / matching-tool seconds. Unlimited building still uses gradual breaking.
const hardness={
 1:[1.6,.4],2:[1.25,.32],3:[14,.95],4:[5.5,1.1],5:[.35,.2],6:[3.5,.75],
 7:[9,1.1],8:[.8,.4],9:[7,1],10:[1.1,.3],11:[12,1.05],12:[.35,.2],13:[16,1.25],
 14:[2,.55],15:[5.5,1.1],16:[3.5,.75],17:[3,.6],18:[1.5,.4],19:[14,1.1],20:[4,.85],
 21:[.65,.22],22:[.35,.2],23:[8,.9],24:[1.5,.4],25:[12,.95],26:[5.5,1.1],27:[.35,.2],28:[2,.5],29:[Infinity,2.1],
 bed:[3.5,.85],piano:[4.5,1.2],marimba:[3.5,1],drums:[3,1],bells:[2.5,.8],record:[3,1],crate:[2.6,.65],desk:[3.5,1],
 bench:[3,.8],torch:[.3,.3],lantern:[1.5,.55],door:[3.5,.85],steps:[3.5,.75],workbench:[4,1],planter:[2,.6],cache:[1.4,.55]
};
export function effectiveTool(selected,inventory,mode){return selected!=='hand'&&TOOLS[selected]&&(mode==='creative'||inventory[selected]>0)?selected:'hand';}
export function breakSeconds(item,selected,inventory,mode){
 if(!mayHarvest(item,selected,inventory,mode))return Infinity;
 const times=hardness[item]||[2,.65],tool=TOOLS[effectiveTool(selected,inventory,mode)];
 return tool.kind&&tool.kind===requiredTool(item)?Math.min(times[0],times[1]*(tool.wooden?1.8:1)):times[0];
}
export function breakTarget(hit,selected,inventory,mode){
 if(!hit||hit.distance>7.5)return null;
 const item=hit.entity?.type??hit.id;
 if(!item||item===WATER)return null;
 const key=hit.entity?`entity:${hit.entity.id}:${hit.entity.r||0}:${!!hit.entity.open}`:`block:${hit.cell.x},${hit.cell.y},${hit.cell.z}:${hit.id}`;
 const bedrock=!hit.entity&&hit.cell.y<=MIN_Y;
 return {key,item,tool:effectiveTool(selected,inventory,mode),seconds:bedrock||hit.entity?.discovery&&mode==='creative'?Infinity:breakSeconds(item,selected,inventory,mode),reason:hit.entity?.discovery&&mode==='creative'?'Switch to Discovery to open instrument cases.':bedrock?'Bedrock cannot be broken.':Number(item)===29?'Use a stone pickaxe to recover this buried case.':null,hit};
}
export class BreakSession {
 constructor(){this.reset();}
 reset(){this.key=null;this.tool=null;this.elapsed=0;this.cooldown=0;this.completedKey=null;}
 step(target,dt){
  if(!target){this.reset();return {state:'idle',progress:0};}
  if(!Number.isFinite(target.seconds)||target.seconds<=0){this.reset();return {state:'blocked',progress:0,target};}
  if(this.completedKey===target.key)return {state:'cooldown',progress:0,target};
  if(this.cooldown>0){this.cooldown=Math.max(0,this.cooldown-Math.min(.25,Math.max(0,dt)));return {state:'cooldown',progress:0,target};}
  if(this.key!==target.key||this.tool!==target.tool){this.key=target.key;this.tool=target.tool;this.elapsed=0;this.completedKey=null;return {state:'working',progress:0,target};}
  this.elapsed+=Math.min(.25,Math.max(0,Number(dt)||0));
  const progress=Math.min(1,this.elapsed/target.seconds);
  if(progress>=1){this.completedKey=this.key;this.key=null;this.elapsed=0;this.cooldown=.12;return {state:'complete',progress:1,target};}
  return {state:'working',progress,target};
 }
}

const paths=[
 [[16,16],[13,14],[12,10],[9,9],[7,4],[4,2],[3,0]],
 [[16,16],[20,14],[20,11],[24,9],[25,5],[29,3],[31,0]],
 [[16,16],[18,20],[16,23],[18,27],[16,31]],
 [[16,16],[12,18],[10,22],[6,23],[4,27],[0,28]],
 [[18,20],[22,21],[23,25],[27,26],[31,30]],
 [[12,10],[7,12],[5,10],[0,11]],
 [[20,11],[21,7],[17,5],[16,1]],
 [[10,22],[9,26],[11,29],[10,31]],
 [[24,9],[27,13],[31,14]],
 [[13,14],[9,16],[5,15],[2,18],[0,18]],
 [[22,21],[26,19],[29,21],[31,20]],
 [[18,27],[23,30],[24,31]]
];
export function crackPixels(stage){
 stage=Math.max(0,Math.min(7,stage|0));const pixels=new Uint8ClampedArray(32*32*4),count=Math.min(paths.length,2+stage*2);
 const dot=(x,y)=>{if(x<0||x>31||y<0||y>31)return;const at=(y*32+x)*4;pixels.set([13,19,29,225],at);};
 for(let n=0;n<count;n++){
  const path=paths[n],segments=Math.min(path.length-1,2+stage);
  for(let k=0;k<segments;k++){
   let [x,y]=path[k];const [tx,ty]=path[k+1],dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;let err=dx+dy;
   while(true){dot(x,y);if(stage>=5&&n%3===0||stage>=6&&n%2===0)dot(x+1,y);if(stage===7&&n%4===1)dot(x,y+1);if(x===tx&&y===ty)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
  }
 }
 return pixels;
}
