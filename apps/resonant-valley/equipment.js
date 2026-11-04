export const TOOLS={
 hand:{name:'Fist',color:'#d8a17c',category:'Tools',description:'Slow on wood and stone; cannot recover buried cases'},
 woodPickaxe:{name:'Wooden pickaxe',kind:'pickaxe',wooden:true,color:'#ca9254',category:'Tools'},
 woodAxe:{name:'Wooden axe',kind:'axe',wooden:true,color:'#ca9254',category:'Tools'},
 woodShovel:{name:'Wooden shovel',kind:'shovel',wooden:true,color:'#ca9254',category:'Tools'},
 pickaxe:{name:'Stone pickaxe',kind:'pickaxe',color:'#b3c6d2',category:'Tools',description:'Stone, brick, and buried cases'},
 shovel:{name:'Stone shovel',kind:'shovel',color:'#c3cbd1',category:'Tools',description:'Earth, sand, clay, snow, and gravel'},
 axe:{name:'Stone axe',kind:'axe',color:'#c2cbd3',category:'Tools',description:'Logs, boards, and wooden furnishings'}
};
const wood=new Set([4,6,15,16,20,26,28]),soil=new Set([1,2,10,14,18,21,24]);
const woodenFurniture=new Set(['bed','bench','desk','door','steps','workbench','planter','piano','marimba','drums','record','crate','cache','shutter','sign','beam','exchangeCrate','gigPoster']);
export function requiredTool(item){if(wood.has(Number(item))||woodenFurniture.has(item))return 'axe';if(soil.has(Number(item)))return 'shovel';if(['bells','lantern','minecart','rail','railBend','railGrade','railSwitch','roofSlope'].includes(item)||[3,7,8,9,11,13,17,19,23,25,29].includes(Number(item)))return 'pickaxe';return null;}
export function mayHarvest(item,selected,inventory,mode){return Number(item)!==29||selected==='pickaxe'&&(mode==='creative'||(inventory.pickaxe||0)>0);}
export function torchActive(inventory,mode,carried){return !!carried&&(mode==='creative'||inventory.torch>0);}
const shaft=`
 <path fill="#192438" d="m2 27 16-20 6 4L7 32H4l-2-2z"/>
 <path fill="#a26541" d="m3 27 16-19 4 3L7 30H5z"/>
 <path fill="#efb975" d="M4 27 19 9l1 1L6 28H4z"/>
 <path fill="#75483c" d="m5 24 2-2 4 3-2 2zm7-8 2-2 3 3-2 2z"/>`;
const toolSprites={
 pickaxe:shaft+`
  <path fill="#172638" d="M1 8V6h2V5h2V4h3V3h4V2h5v1h4v2h3v2h3v3h2v3h2v4h1v9h-2v-3h-2v-4h-2v-3h-3v-3h-3v-2h-4V9h-4V8H7v1H3v1H1z"/>
  <path fill="#7898b1" d="M3 7h2V6h3V5h5V4h4v1h4v2h3v2h2v3h2v3h2v5h-1v-2h-2v-3h-3v-3h-3v-2h-4V8h-4V7H7v1H3z"/>
  <path fill="#c6e1eb" d="M4 6h2V5h3V4h4V3h4v1h4v2h3v2h2v3h2v2h-2v-1h-2V9h-3V7h-4V5h-6v1H7v1H4z"/>
  <path fill="#a4bacb" d="M27 13h2v3h1v3h1v4h-1v-3h-1v-3h-2z"/>
  <path fill="#704b3d" d="m16 8 3-4 5 4-3 5z"/>
  <path fill="#e7ac64" d="m17 8 2-3 3 2-2 3z"/>`,
 axe:shaft+`
  <path fill="#172638" d="m12 5 4-4 6 4 2 3 6 1 2 4-1 5-3 4-5 3-5-5 2-5-2-4-5-3z"/>
  <path fill="#8198ad" d="m14 5 3-2 5 4 1 3 6 1 1 3-1 4-5 5-4-4 2-4-3-5z"/>
  <path fill="#b9d0dd" d="m21 9 3 2 5 1-1 5-4 4-3-3 3-5z"/>
  <path fill="#e6f0e9" d="M30 13v4l-2 4-4 2-2-2 4-2 2-3v-3z"/>
  <path fill="#b98450" d="m15 8 3-4 3 2-3 4z"/>`,
 shovel:`
  <path fill="#172638" d="m8 22 16-18 4 4-17 18z"/>
  <path fill="#a66f49" d="m10 22 14-16 2 2-15 16z"/>
  <path fill="#f0ba79" d="m11 20 12-14 1 1-12 14z"/>
  <path fill="#172638" fill-rule="evenodd" d="M21 1h8l3 3v7l-5 4-7-6-1-5z M23 4v3l4 4 2-2V4z"/>
  <path fill="#c69764" d="M22 2h7v2h-6v3l4 5-2-1-4-4V4z"/>
  <path fill="#172638" d="m2 20 8-8h4l8 7v3l-7 7-7 2H1v-6z"/>
  <path fill="#8da5b4" d="m3 21 8-7h2l7 6-1 2-6 6-7 2H3z"/>
  <path fill="#bfd4dd" d="m4 22 7-7 3 2-8 10-3 2z"/>
  <path fill="#5a748e" d="m5 29 11-12 3 3-6 7z"/>
  <path fill="#dceae6" d="m3 28 1 1 8-1 7-6-6 7-8 2H2z"/>
  <path fill="#cc955c" d="m12 16 4-5 3 2-5 6z"/>`
};
export function equipmentIcon(id){
 if(id==='hand')return '<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#487cc7" d="M6 17h12v7H6z"/><path fill="#d8a17c" d="M5 6h3V3h4v1h4v1h3v6h2v5l-4 4H7l-4-5V9h2z"/><path fill="#a86e52" d="M8 7h2v6H8zm4 0h2v6h-2zm4 1h2v5h-2z"/></svg>';
 if(id==='torch')return '<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ac7346" d="M10 11h4v12h-4z"/><path fill="#ff9b3d" d="M7 5h3V1h3v3h3v4h2v5H7z"/><path fill="#ffe3a0" d="M10 7h4v7h-4z"/></svg>';
 const tool=TOOLS[id],base=toolSprites[tool?.kind]||'';
 const woodColors={'#7898b1':'#a96d3d','#c6e1eb':'#edc489','#a4bacb':'#c89559','#8198ad':'#9f6339','#b9d0dd':'#d59e61','#e6f0e9':'#f1cb92','#8da5b4':'#b78046','#bfd4dd':'#ddb478','#5a748e':'#88542f','#dceae6':'#efc990'};
 const art=tool?.wooden?base.replace(/#[a-f0-9]{6}/g,c=>woodColors[c]||c):base;
 return `<svg class="tool-icon" viewBox="0 0 33 33" shape-rendering="crispEdges" aria-hidden="true">${art}</svg>`;
}
