import {expeditionSites,expeditionBoxes} from './expedition-sites.js';
import {skylineSites,skylineBoxes} from './skyline.js';
export function* sampleHorizonTile(g,x,z){
 const columns=[],trees=[],left=x*16,top=z*16;
 for(let dz=-1;dz<=8;dz++){
  for(let dx=-1;dx<=8;dx++){
   const wx=left+dx*2+1,wz=top+dz*2+1,c=g.column(wx,wz);
   columns.push({h:c.h,id:g.material(c,0,wx,wz)});
  }
  yield;
 }
 const towers=skylineSites(g,left+8,top+8,24).filter(s=>s.type==='lookout');
 for(let gx=Math.floor(left/6);gx<=Math.floor((left+15)/6);gx++){
  for(let gz=Math.floor(top/6);gz<=Math.floor((top+15)/6);gz++){
   const f=g.naturalFeature(gx,gz,towers);
   if(f&&f.kind!=='boulder'&&f.x>=left&&f.x<left+16&&f.z>=top&&f.z<top+16)trees.push(f);
  }
  yield;
 }
 return {columns,trees};
}
export function horizonFeatures(g,cx,cz){return [...skylineSites(g,cx*16+8,cz*16+8,160).map(site=>({site,boxes:skylineBoxes(g,site)})),...expeditionSites(g,cx*16+8,cz*16+8,160).map(site=>({site,boxes:expeditionBoxes(site).filter(b=>b.id&&b.y>=site.y-1)}))];}
