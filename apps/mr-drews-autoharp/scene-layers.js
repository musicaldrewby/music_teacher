// Native scene layers preserve the original photograph and all playable anchors.
// No scene-specific camera transform is applied to the table or instrument.
export const TABLE_OUTLINE='M0 177 L1490 130 Q1495 130 1499 139 L1672 482 L1672 941 L0 941 Z';
export const HARP_OUTLINE='M625 83 Q630 73 648 77 Q743 78 801 103 L841 112 L862 130 L882 150 L907 175 L931 200 L955 225 L978 250 L1001 275 L1025 300 L1047 325 L1071 350 L1094 375 L1117 400 L1140 425 Q1175 463 1185 500 Q1193 522 1196 548 L1208 575 L1213 600 L1217 625 L1220 650 L1223 675 L1224 700 L1223 725 Q1222 741 1210 749 Q1209 770 1218 796 Q1221 842 1204 868 Q1191 887 1156 898 Q1010 909 552 900 Q499 895 478 863 Q460 837 464 796 L475 736 L467 736 L493 551 L501 549 Z';
const svgNS='http://www.w3.org/2000/svg';
const wood='assets/weathered-wood.png';
let woodReady=null;
function node(tag,attrs,parent){const el=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));parent.append(el);return el;}
export function createSceneLayers(parent,id){
  const svg=node('svg',{viewBox:'0 0 1672 941',class:'scene-composition','aria-hidden':'true',focusable:'false'},parent);
  const defs=node('defs',{},svg),tableId=`${id}-table-clip`,harpId=`${id}-harp-clip`,shadowId=`${id}-harp-shadow`;
  const tableClip=node('clipPath',{id:tableId,clipPathUnits:'userSpaceOnUse'},defs);
  node('path',{d:TABLE_OUTLINE},tableClip);
  const harpClip=node('clipPath',{id:harpId,clipPathUnits:'userSpaceOnUse'},defs);
  node('path',{d:HARP_OUTLINE},harpClip);
  // End caps project beyond the wooden body. The top pins also stand above it.
  node('path',{d:'M493 550 L540 550 L512 737 L465 744 Z M1159 548 L1193 548 L1226 738 L1190 749 Z'},harpClip);
  for(const [x,y,w,h] of [[652,67,9,33],[675,65,9,37],[700,69,9,37],[725,69,9,39],[750,72,10,40],[776,78,9,39],[802,81,9,44]]){node('ellipse',{cx:x+w/2,cy:y+4,rx:w/2-1,ry:4},harpClip);node('rect',{x:x+3,y:y+3,width:3,height:h-3},harpClip);}
  const shadow=node('filter',{id:shadowId,x:0,y:0,width:1672,height:941,filterUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'},defs);
  node('feDropShadow',{dx:2,dy:7,stdDeviation:7,'flood-color':'#130c07','flood-opacity':.52},shadow);
  // The same fixed tabletop outline is used in both new environments.
  const table=node('g',{'clip-path':`url(#${tableId})`,class:`scene-table scene-table-${id}`},svg);
  node('image',{href:wood,x:0,y:0,width:1672,height:941,preserveAspectRatio:'none'},table);
  const instrument=node('g',{filter:`url(#${shadowId})`},svg);
  const original=node('g',{'clip-path':`url(#${harpId})`},instrument);
  node('image',{href:'assets/sunlit-walnut.png',x:0,y:0,width:1672,height:941,preserveAspectRatio:'none'},original);
}
export async function prepareSceneLayers(scene){
  if(!scene.layered)return;
  // Decode the shared texture before beginning a fade. Retain the old room if
  // it fails, and let a later selection retry the download.
  if(!woodReady){
    const image=document.createElement('img');image.src=wood;
    woodReady=image.decode().catch(error=>{woodReady=null;throw error;});
  }
  await woodReady;
}
