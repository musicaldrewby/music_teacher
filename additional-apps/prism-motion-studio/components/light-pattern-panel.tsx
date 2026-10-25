'use client';
import {memo,useId} from 'react';
import {lightPatternPresets,patternUsesSeed,type LightPattern} from '../lib/light-pattern-schema';
import {patternShapes,patternBackground,type PatternShape} from '../lib/light-patterns';
import {Button,Num} from './studio-fields';

function PatternMark({shape:s}:{shape:PatternShape}){
 const fill=(s.tone??0)>.5?'#ffe9ad':'#17231f';
 return <g transform={`translate(${s.x*100} ${s.y*100}) rotate(${s.angle})`} fill={fill}>
  {s.kind==='ellipse'?<ellipse rx={s.rx*100} ry={s.ry*100}/>:
   s.kind==='polygon'?<polygon points={s.points!.map(([x,y])=>`${x*s.rx*100},${y*s.ry*100}`).join(' ')}/>:
   s.kind==='ring'?<g transform={`scale(${s.rx*100} ${s.ry*100})`}><circle r={1-(s.stroke??.12)/2} fill="none" stroke={fill} strokeWidth={s.stroke??.12}/></g>:
   <rect x={-s.rx*100} y={-s.ry*100} width={s.rx*200} height={s.ry*200}/>}
 </g>;
}
const PatternPreview=memo(function PatternPreview({kind,seed}:{kind:LightPattern['kind'];seed:number}){
 const id=useId();const marks=patternShapes(kind,seed).flatMap((s,index)=>{
  const a=s.angle*Math.PI/180,w=Math.abs(Math.cos(a))*s.rx+Math.abs(Math.sin(a))*s.ry,h=Math.abs(Math.sin(a))*s.rx+Math.abs(Math.cos(a))*s.ry,result=[];
  // Repeat edge silhouettes so thumbnails match the tiling projection.
  for(let y=Math.ceil(-s.y-h);y<1-s.y+h;y++)for(let x=Math.ceil(-s.x-w);x<1-s.x+w;x++)result.push(<g key={`${index}:${x}:${y}`} transform={`translate(${x*100} ${y*100})`}><PatternMark shape={s}/></g>);
  return result;
 });
 return <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><pattern id={id} width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill={patternBackground(kind)?'#ffe9ad':'#17231f'}/>{marks}</pattern></defs><rect width="100" height="100" fill={`url(#${id})`}/></svg>;
});
export function LightPatternPanel({pattern,change}:{pattern:LightPattern;change:(pattern:LightPattern)=>void}){
 const set=(patch:Partial<LightPattern>)=>change({...pattern,...patch});
 return <div className="light-pattern-panel"><h4>Projected light pattern</h4><p className="hint">Choose a pattern, then aim this spotlight at text, objects or the set. A matte surface and less fill light make the pattern easier to see.</p><div className="light-pattern-grid">{lightPatternPresets.map(p=><button key={p.id} type="button" aria-pressed={pattern.kind===p.id} title={p.description} onClick={()=>set({kind:p.id})}><PatternPreview kind={p.id} seed={pattern.seed}/><span>{p.name}</span></button>)}</div>{pattern.kind!=='none'&&<><Num slider label="Pattern size" value={pattern.size} min={.5} max={3} step={.05} onChange={size=>set({size})}/><Num slider label="Pattern rotation" value={pattern.rotation} min={-180} max={180} step={1} onChange={rotation=>set({rotation})}/><Num label="Pattern softness" value={pattern.softness} min={0} max={1} step={.02} onChange={softness=>set({softness})}/><Num label="Pattern strength" value={pattern.strength} min={0} max={1} step={.02} onChange={strength=>set({strength})}/>{patternUsesSeed(pattern.kind)&&<Button className="wide" onClick={()=>set({seed:(pattern.seed+137)%10001})}>{pattern.kind==='leaves'?'Shuffle the leaves':'Shuffle pattern'}</Button>}<p className="hint">Size changes the spacing within the beam. Use Cone half-angle to widen the whole projection. Patterns illuminate surfaces; they do not appear on the flat background.</p></>}</div>;
}
