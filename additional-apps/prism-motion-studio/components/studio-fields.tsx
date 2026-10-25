import {createContext,useContext} from 'react';
import {sliderPosition,sliderNumber} from '../lib/numeric-slider';
import type {Vec} from '../lib/scene';
export function Button({children,onClick,title,active=false,disabled=false,className=''}:{children:React.ReactNode;onClick?:()=>void;title?:string;active?:boolean;disabled?:boolean;className?:string}){return <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`button ${active?'active':''} ${className}`}>{children}</button>}
export function Select({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void}){return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
export const NumericEditContext=createContext({begin:()=>{},end:()=>{}});
export function Num({label,value,onChange,min=-10000,max=10000,step=.1,slider,log=false}:{label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number;slider?:boolean;log?:boolean}){
 const edits=useContext(NumericEditContext),ranged=slider??(min>=0&&max<10000);
 const showRange=ranged&&max>min;
 const rangeValue=log?sliderPosition(value,min,max,true)*1000:value;
 return <label className={`number ${showRange?'has-slider':''}`}><span>{label}</span><input aria-label={label} type="number" value={Number(value.toFixed(3))} min={min} max={max} step={step} onChange={e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(Number.isFinite(n))onChange(Math.max(min,Math.min(max,n)))}}/>{showRange&&<input className="numeric-range" aria-label={`${label} slider`} type="range" min={log?0:min} max={log?1000:max} step={log?1:step} value={Math.max(log?0:min,Math.min(log?1000:max,rangeValue))} aria-valuetext={String(Number(value.toFixed(3)))} onPointerDown={e=>{edits.begin();e.currentTarget.setPointerCapture?.(e.pointerId);}} onPointerUp={edits.end} onPointerCancel={edits.end} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))edits.begin();}} onKeyUp={edits.end} onBlur={edits.end} onChange={e=>onChange(log?sliderNumber(Number(e.target.value)/1000,min,max,step,true):Number(e.target.value))}/>}</label>;
}
export function Vector({label,value,onChange,rotation=false,min=-10000}:{label:string;value:Vec;onChange:(v:Vec)=>void;rotation?:boolean;min?:number}){return <div className="vector"><span className="field-label">{label}</span><div>{value.map((v,i)=><Num key={i} label={rotation?['Pitch X','Yaw Y','Roll Z'][i]:['X','Y','Z'][i]} value={v} min={min} step={rotation?1:.1} onChange={n=>onChange(value.map((a,j)=>j===i?n:a) as Vec)}/>)}</div></div>}
export const InspectorCategory=createContext('all');
export const sectionCategories:Record<string,string>={
 'Equalizer':'shape','Audio motion':'animate','Physics body':'physics','Typography':'shape','Transform':'shape','Procedural generator':'shape','Smart placement':'shape',
 'Surface':'look','Cinematic finishes':'look','Procedural material':'look','Layer opacity':'look',
 'Entrance · Hold · Exit':'animate','Motion':'animate','Procedural motion':'animate','Follow a path':'animate','Reactions at the playhead':'animate','Toy assembly & wrapping':'animate','Keyframes':'animate',
 'Procedural placement':'advanced','Explode & reassemble':'advanced','Interactive action':'advanced','Group & pivot':'advanced','Layer':'advanced'
};
const initiallyOpen=new Set(['Equalizer','Audio motion','Views captured in VR','Physics body','Director mode','Weather timeline','Typography','Transform','Surface','Procedural generator','Entrance · Hold · Exit','Camera','Background','Cinematic sets']);
export function Section({title,children,aside}:{title:string;children:React.ReactNode;aside?:React.ReactNode}){
 const category=useContext(InspectorCategory);
 if(category!=='all'&&(sectionCategories[title]||'advanced')!==category)return null;
 return <details className="inspector-section collapsible-section" open={initiallyOpen.has(title)}><summary><span>{title}</span>{aside}</summary><div className="section-content">{children}</div></details>;
}
