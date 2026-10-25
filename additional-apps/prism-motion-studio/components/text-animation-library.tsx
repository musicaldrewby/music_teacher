'use client';
import {useEffect,useRef,useState,useId} from 'react';
import {textAnimations} from '../lib/text-animation-catalog';
import {sampleHold,samplePerformance} from '../lib/performance';
import type {Obj} from '../lib/scene';
export function TextAnimationLibrary({sequence:q,choose}:{sequence:Obj['sequence'];choose:(phase:'entrance'|'hold'|'exit',id:string)=>void}){
 const [phase,setPhase]=useState<'entrance'|'hold'|'exit'>('entrance'),[time,setTime]=useState(0),[animate,setAnimate]=useState(true);const uid=useId().replace(/:/g,''),last=useRef(0);
 useEffect(()=>{if(!animate)return;let raf=0,start=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)return;const tick=(now:number)=>{if(now-last.current>80&&!document.hidden){last.current=now;setTime(((now-start)/1000)%3.6);}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[phase,animate]);
 return <div className="text-animation-library"><div className="text-animation-tabs" role="tablist" aria-label="Animation phase">{(['entrance','hold','exit'] as const).map(p=><button type="button" key={p} role="tab" aria-selected={phase===p} onClick={()=>{setPhase(p);setTime(0)}}>{p==='entrance'?'Entrances':p==='hold'?'Hold moves':'Exits'}</button>)}</div><label className="text-preview-toggle"><input type="checkbox" checked={animate} onChange={e=>setAnimate(e.target.checked)}/>Animate previews</label><div className="text-animation-grid">{textAnimations.filter(a=>a[2]===phase).map(([id,label,,description])=>{
 const selected=(phase==='hold'?q.holdMotion:phase==='entrance'?q.entrance:q.exit)===id;
 return <button type="button" key={id} className={selected?'chosen':''} aria-pressed={selected} title={description} onClick={()=>choose(phase,id)}><svg viewBox="0 0 160 78" aria-hidden="true"><defs><filter id={`${uid}-${id}`}><feGaussianBlur stdDeviation={Math.max(0,(1-time/2)*2)}/></filter></defs>{'PRISM'.split('').map((letter,i)=>{
 const progress=Math.max(0,Math.min(1,(time-i*.12)/1.8)),pose=phase==='hold'?sampleHold(id,Math.min(time,3.2),3.2,.8,i,5):samplePerformance(id,progress,i,.8,q.settle);
 const x=24+i*24+pose.position[0]*8+(pose.pull||0)*20,y=47-pose.position[1]*5-(pose.pull||0)*15,zScale=1/(1+Math.max(-.7,-pose.position[2]*.07));
 const sx=pose.scale[0]*zScale*Math.max(.04,Math.abs(Math.cos(pose.rotation[1]))),sy=pose.scale[1]*zScale*Math.max(.04,Math.abs(Math.cos(pose.rotation[0])));
 return <g key={i} transform={`translate(${x} ${y}) rotate(${-pose.rotation[2]*180/Math.PI}) scale(${sx} ${sy})`} opacity={id==='curtain-reveal'?1:pose.opacity} filter={id==='focus-reveal'?`url(#${uid}-${id})`:undefined}>{pose.echo!==undefined&&[1,2,3].map(j=><text key={j} x={j*3} y={j} opacity={(1-progress)*.2} textAnchor="middle">{letter}</text>)}{id==='curtain-reveal'&&<><defs><clipPath id={`${uid}-${id}-${i}-l`}><rect x="-16" y="-28" width="16" height="40"/></clipPath><clipPath id={`${uid}-${id}-${i}-r`}><rect x="0" y="-28" width="16" height="40"/></clipPath></defs>{[-1,1].map(side=><g key={side} transform={`translate(${side*progress*20} 0)`} opacity={(1-progress)**2}><text textAnchor="middle" clipPath={`url(#${uid}-${id}-${i}-${side<0?'l':'r'})`}>{letter}</text></g>)}</>}<text textAnchor="middle" opacity={id==='curtain-reveal'?pose.opacity:1}>{letter}</text></g>;
 })}</svg><strong>{label}</strong><small>{description}</small></button>;
 })}</div></div>;
}
