import {ITEMS} from './data.js';

const logs=[4,15,26];
export const freshBar=mode=>mode==='creative'?['pickaxe','shovel','axe','torch',6,3,'record','door','lantern']:['hand',null,null,null,null,null,null,null,null];
export function restoreBar(raw,mode,allowed){
 if(!Array.isArray(raw)||raw.length!==9)return freshBar(mode);
 return raw.map(id=>Object.hasOwn(ITEMS,id)&&allowed(id)?id:null);
}
export function ingredients(recipe,bag){
 return Object.entries(recipe.cost).map(([id,need])=>{
  const ids=id==='log'?logs:[id],have=ids.reduce((sum,key)=>sum+(bag[key]||0),0);
  return {ids,need,have,name:id==='log'?'Any log':ITEMS[id].name};
 });
}
export function canCraft(recipe,bag,mode,atBench){
 return mode==='creative'||((!recipe.bench||atBench)&&ingredients(recipe,bag).every(i=>i.have>=i.need));
}
export function makeRecipe(recipe,bag,mode,atBench){
 if(!canCraft(recipe,bag,mode,atBench))return false;
 if(mode==='creative')return true;
 for(const {ids,need} of ingredients(recipe,bag)){
  let left=need;
  for(const id of ids){const used=Math.min(bag[id]||0,left);if(used)bag[id]-=used;left-=used;if(!left)break;}
 }
 bag[recipe.item]=(bag[recipe.item]||0)+recipe.count;return true;
}
