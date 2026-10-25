import {GLYPHS} from './notation-glyphs.js';
export const SYMBOLS=[
 {id:'quarter',label:'Quarter note',glyph:'noteQuarterUp'},
 {id:'eighth-pair',label:'Eighth-note pair'},
 {id:'eighth',label:'Single eighth',glyph:'note8thUp'},
 {id:'half',label:'Half note',glyph:'noteHalfUp'},
 {id:'dotted-half',label:'Dotted half note',glyph:'noteHalfUp',dot:true},
 {id:'whole',label:'Whole note',glyph:'noteWhole'},
 {id:'quarter-rest',label:'Quarter rest',glyph:'restQuarter',rest:true},
 {id:'half-rest',label:'Half rest',glyph:'restHalf',rest:true,line:true},
 {id:'whole-rest',label:'Whole rest',glyph:'restWhole',rest:true,line:true},
 {id:'dotted-half-rest',label:'Dotted half rest',glyph:'restHalf',dot:true,rest:true,line:true},
 {id:'barline',label:'Measure line'}
];
export function glyphMarkup(name,x=0,y=0,space=1){const g=GLYPHS[name];return `<path d="${g.path}" transform="translate(${x} ${y}) scale(${space})" fill="currentColor"/>`}
export function glyphBounds(name){return GLYPHS[name].bounds}
export function symbolWidth(type,space=30){if(type==='eighth-pair')return 4.1*space;if(type==='barline')return .7*space;const s=SYMBOLS.find(s=>s.id===type);return Math.max(s.line?2:1,GLYPHS[s.glyph].bounds[2]+(s.dot?.65:0))*space}
// Actual symbol extents allow short rests and whole notes near the board edges.
export function symbolBounds(type,space=30){
 let b;
 if(type==='barline')b=[-.055,-3.155,.055,.855];
 else if(type==='eighth-pair')b=[-2.05,-3.56,1.89,.5];
 else{const s=SYMBOLS.find(v=>v.id===type),g=GLYPHS[s.glyph].bounds,start=-symbolWidth(type,1)/2;b=[start+g[0],g[1],start+g[2],g[3]];
  if(s.line)b=[Math.min(b[0],start-.4),Math.min(b[1],-.04),Math.max(b[2],start+1.6),Math.max(b[3],.04)];
  if(s.dot){const dot=GLYPHS.augmentationDot.bounds,x=start+g[2]+.32,y=-(s.rest?.28:.5);b=[Math.min(b[0],x+dot[0]),Math.min(b[1],y+dot[1]),Math.max(b[2],x+dot[2]),Math.max(b[3],y+dot[3])];}
 }
 return {left:b[0]*space,top:b[1]*space,right:b[2]*space,bottom:b[3]*space};
}
export function symbolMarkup(type,x=0,y=0,space=30){
 const s=SYMBOLS.find(v=>v.id===type);if(!s)return '';
 let body='';
 if(type==='barline')return `<path d="M${x} ${y-3.1*space}V${y+.8*space}" stroke="currentColor" stroke-width="${space*.11}"/>`;
 if(type==='eighth-pair'){
  const x1=x-2.05*space,x2=x1+2.7*space;
  body=glyphMarkup('noteheadBlack',x1,y,space)+glyphMarkup('noteheadBlack',x2,y,space);
  const stem1=x1+1.18*space,stem2=x2+1.18*space,top=y-3.5*space;
  body+=`<path d="M${stem1} ${y-.13*space}V${top} M${stem2} ${y-.13*space}V${top}" fill="none" stroke="currentColor" stroke-width="${.12*space}"/><path d="M${stem1-.06*space} ${top}H${stem2+.06*space}V${top+.45*space}H${stem1-.06*space}Z" fill="currentColor"/>`;
  return body;
 }
 const w=symbolWidth(type,space),start=x-w/2,gy=y;
 if(s.line)body+=`<path d="M${start-.4*space} ${gy}H${start+1.6*space}" fill="none" stroke="currentColor" stroke-width="${.08*space}"/>`;
 body+=glyphMarkup(s.glyph,start,gy,space);
 if(s.dot)body+=glyphMarkup('augmentationDot',start+(GLYPHS[s.glyph].bounds[2]+.32)*space,gy-(s.rest?.28:.5)*space,space);
 return body;
}
export function symbolSVG(type,space=18){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 112" aria-hidden="true" style="color:#132b38">${symbolMarkup(type,64,82,space)}</svg>`}

const paths=new Map();
export function drawGlyph(ctx,name,x,y,space){if(!paths.has(name))paths.set(name,new Path2D(GLYPHS[name].path));ctx.save();ctx.translate(x,y);ctx.scale(space,space);ctx.fill(paths.get(name));ctx.restore()}
export function drawMusicStaff(ctx,{width,height,type}){
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 if(type==='blank')return;
 ctx.strokeStyle='#17212a';ctx.fillStyle='#101820';
 const gap=type==='double'?height*.055:height*.105;
 const tops=type==='double'?[height*.16,height*.62]:[height*.27];
 // Every staff line has a single stroke, of a single width, from end to end.
 ctx.lineWidth=Math.max(1.4,gap*.037);ctx.lineCap='butt';
 for(const top of tops){ctx.beginPath();for(let k=0;k<5;k++){ctx.moveTo(width*.025,top+k*gap);ctx.lineTo(width*.975,top+k*gap)}ctx.stroke();
  if(type!=='double')drawGlyph(ctx,type==='treble'?'gClef':'fClef',width*.035,top+(type==='treble'?3:1)*gap,gap);
 }
}
export function staffSVG(note,clef='treble'){
 const gap=18,top=35,left=9,right=227,x=160;
 const type=clef.toLowerCase(),origin=type==='bass'?18:30;
 const match=note.match(/^([A-G])([♭♯]?)(\d)$/);const step=Number(match[3])*7+'CDEFGAB'.indexOf(match[1]);
 const bottom=top+4*gap,y=bottom-(step-origin)*gap/2;
 let body=`<g color="#111820"><path d="${[0,1,2,3,4].map(i=>`M${left} ${top+i*gap}H${right}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.1"/>`;
 body+=glyphMarkup(type==='bass'?'fClef':'gClef',16,top+(type==='bass'?1:3)*gap,gap);
 for(let v=origin-2;v>=step;v-=2)body+=`<path d="M${x-17} ${bottom-(v-origin)*gap/2}h34" stroke="currentColor" stroke-width="1.1"/>`;
 for(let v=origin+10;v<=step;v+=2)body+=`<path d="M${x-17} ${bottom-(v-origin)*gap/2}h34" stroke="currentColor" stroke-width="1.1"/>`;
 if(match[2])body+=glyphMarkup(match[2]==='♭'?'accidentalFlat':'accidentalSharp',x-35,y,gap);
 // Preserve the reference chart's simple, stemless oval notehead.
 body+=`<ellipse cx="${x}" cy="${y}" rx="13.5" ry="8.7" fill="currentColor"/></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" fill="#fff"/>${body}</svg>`;
}
