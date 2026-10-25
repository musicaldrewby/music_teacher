import {STRING_LAYOUTS} from './string-layouts.js?v=spooky-scenes-1';
// All coordinates use the unchanged reference photographs, 1672 × 941.
export const PHOTO={width:1672,height:941,barTop:553,barBottom:712,bottom:790};
// Measured ivory faces; the photographed rows are not evenly spaced.
// Both environment images retain these same button positions.
export const CHORD_CENTERS=[
  [699.5,576,36,29],[757,575.5,37,28],[813.5,576,36,29],[868.5,575.5,36,28],[924.5,575.5,36,28],[982,575.5,37,28],[1036.5,576,36,29],
  [697,619.5,37,30],[755,619.5,37,30],[812.5,619.5,36,30],[869,619.5,37,30],[926.5,619,36,29],[984.5,619,38,29],[1040.5,619,36,29],
  [694.5,665.5,38,30],[754,666,37,31],[813,665.5,37,30],[870.5,666,38,31],[929,665.5,37,30],[988,665.5,37,30],[1045,665.5,37,30]
].map(([x,y,width,height])=>({x,y,width,height}));
export const SCENES=[
  {id:'sunlit',name:'Sunlit windows',image:'assets/sunlit-walnut.png',photoId:'scenePhoto',backdropId:'sceneBackdrop'},
  {id:'classroom',name:'Classroom studio',image:'assets/classroom-studio.png',photoId:'scenePhotoClassroom',backdropId:'sceneBackdropClassroom'},
  {id:'manor',name:'Moonlit manor',image:'assets/moonlit-manor.png',photoId:'scenePhotoManor',backdropId:'sceneBackdropManor',layered:true},
  {id:'storm',name:'Stormy old house',image:'assets/stormy-old-house.png',photoId:'scenePhotoStorm',backdropId:'sceneBackdropStorm',layered:true}
];
export function sceneGeometry(id='sunlit'){
  // The new rooms reuse the original instrument image at its original coordinates.
  const layout=STRING_LAYOUTS[id]||STRING_LAYOUTS.sunlit;
  const segments=[];
  for(const zone of ['upper','lower'])layout[zone].forEach(([x0,y0,x1,y1],j)=>{
    // Preserve the 36 sampled pitches while following every photographed strand.
    const note=zone==='upper'?Math.round(j*35/(layout.upper.length-1)):j;
    segments.push({x0,y0,x1,y1,note,zone,index:segments.length});
  });
  const byNote=Array.from({length:36},(_,i)=>segments.filter(s=>s.note===i));
  return {segments,byNote,topX:byNote.map(s=>s[0].x0),topY:byNote.map(s=>s[0].y0),bottomX:layout.lower.map(s=>s[2]),bottom:layout.bottom,barTop:layout.barTop,barBottom:layout.barBottom,chords:CHORD_CENTERS};
}
const DEFAULT_GEOMETRY=sceneGeometry();
export const STRING_TOP_X=DEFAULT_GEOMETRY.topX;
export const STRING_TOP_Y=DEFAULT_GEOMETRY.topY;
export const STRING_BOTTOM_X=DEFAULT_GEOMETRY.bottomX;
// Convert normalized scene weights to ordinary stacked-image alpha values.
// This keeps a crossfade bright and continuous even across rapid scene changes.
export function compositeOpacities(weights){
  let remaining=1;const alphas=weights.map(()=>0);
  for(let i=weights.length-1;i>=0;i--){alphas[i]=remaining>1e-7?Math.min(1,Math.max(0,weights[i]/remaining)):0;remaining=Math.max(0,remaining-weights[i]);}
  return alphas;
}
function segmentX(s,y){return s.x0+(s.x1-s.x0)*(y-s.y0)/(s.y1-s.y0);}
function containsY(s,y){return y>s.y0&&y<s.y1;}
export function xAtY(i,y,g=DEFAULT_GEOMETRY){
  const candidates=g.byNote[i];if(!candidates)return NaN;
  const segment=candidates.find(s=>containsY(s,y))||candidates.reduce((a,b)=>Math.min(Math.abs(y-a.y0),Math.abs(y-a.y1))<Math.min(Math.abs(y-b.y0),Math.abs(y-b.y1))?a:b);
  return segmentX(segment,y);
}
export function canPickString(i,y,g=DEFAULT_GEOMETRY){return g.byNote[i]?.some(s=>containsY(s,y))||false;}
export function nearestSegment(x,y,g=DEFAULT_GEOMETRY){
  let nearest=null,distance=11;
  for(const s of g.segments){
    if(!containsY(s,y))continue;
    const d=Math.abs(x-segmentX(s,y));if(d<distance){distance=d;nearest=s;}
  }
  return nearest;
}
export function nearestString(x,y,g=DEFAULT_GEOMETRY){return nearestSegment(x,y,g)?.note??-1;}
export function sweepStrings(a,b,g=DEFAULT_GEOMETRY){
  const hits=[];
  for(const s of g.segments){
    const from=a.x-segmentX(s,a.y),to=b.x-segmentX(s,b.y);
    if(!((from<0&&to>=0)||(from>0&&to<=0)))continue;
    const t=from/(from-to),y=a.y+(b.y-a.y)*t;
    if(containsY(s,y))hits.push({i:s.note,y,t,segmentIndex:s.index});
  }
  return hits.sort((a,b)=>a.t-b.t);
}
export function photoPath(i,offset=0,y=undefined,g=DEFAULT_GEOMETRY,segmentIndex=null){
  // A touch illuminates its exact strand; keyboard strums illuminate the note's
  // exposed sections. Separate subpaths never connect across the wooden housing.
  const segments=segmentIndex==null?g.byNote[i]:g.byNote[i].filter(s=>s.index===segmentIndex);
  return segments.map(s=>{
    const bendY=Math.max(s.y0+(s.y1-s.y0)*.2,Math.min(s.y1-(s.y1-s.y0)*.2,y??(s.y0+s.y1)/2));
    return `M${s.x0},${s.y0}Q${segmentX(s,bendY)+offset},${bendY} ${s.x1},${s.y1}`;
  }).join(' ');
}
export function fitPhoto(width,height){
  // Fill the view where possible, but always retain the entire physical instrument.
  const cover=Math.max(width/PHOTO.width,height/PHOTO.height);
  return {scale:Math.min(cover,(width-24)/792,(height-18)/900),x:width/2,y:height/2};
}
