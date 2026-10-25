'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {materialSwatches,renderMaterialSwatches} from '../lib/material-swatches';
import {Search,Check} from 'lucide-react';
import type {Obj} from '../lib/scene';
import {materials,materialCategories,type MaterialCategory} from '../lib/material-presets';
import {materialSelected,supportsMaterialLibrary,type MaterialSurface} from '../lib/material-actions';
export function MaterialLibrary({object,surface,onSurface,query,onQuery,onApply}:{object?:Obj;surface:MaterialSurface;onSurface:(v:MaterialSurface)=>void;query:string;onQuery:(v:string)=>void;onApply:(id:string)=>void}){
 const [category,setCategory]=useState<MaterialCategory>('Essentials'),allowed=!!object&&supportsMaterialLibrary(object);
 // Search spans the full collection; a filter never hides a matching material.
 const visible=materials.filter(p=>query.trim()?`${p.name} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase()):category==='All'||(category==='Essentials'?p.featured:p.category===category));
 const [swatches,setSwatches]=useState(()=>Object.fromEntries(materialSwatches)),swatchKey=visible.map(p=>p.id).join('|');
 useEffect(()=>renderMaterialSwatches(visible,(id,url)=>setSwatches(current=>({...current,[id]:url}))),[swatchKey]);
 return <><div className="panel-intro compact-intro"><h2>Materials</h2></div><label className="search"><Search size={15}/><input aria-label="Search materials" placeholder="Find a material…" value={query} onChange={e=>onQuery(e.target.value)}/></label>
 <label className="field"><span>Collection</span><select value={category} onChange={e=>{setCategory(e.target.value as MaterialCategory);onQuery('');}}>{materialCategories.map(c=><option key={c}>{c}</option>)}</select></label>
 {object?.type==='text'&&<label className="field"><span>Apply to</span><select value={surface} onChange={e=>onSurface(e.target.value as MaterialSurface)}><option value="all">All surfaces</option><option value="material">Front face</option><option value="sideMaterial">Sides</option><option value="bevelMaterial">Bevel</option><option value="backMaterial">Back face</option></select></label>}
 {!allowed&&<p className="control-note">{object?'This layer keeps its own materials. Select text or a simple object.':'Select a text or object layer to apply a material.'}</p>}
 <div className="section-label">{query.trim()?'SEARCH RESULTS':category.toUpperCase()} <span>{visible.length}</span></div>
 <div className="material-grid">{visible.map(p=>{const chosen=materialSelected(object,p.id,surface);return <button type="button" disabled={!allowed} key={p.id} aria-pressed={chosen} className={`material-card ${chosen?'chosen':''}`} onClick={()=>onApply(p.id)} title={p.name}><span className="material-swatch">{swatches[p.id]?<img src={swatches[p.id]} width={160} height={140} alt=""/>:<span aria-hidden="true" className={`material-ball texture-${p.texture} ${p.grain?'grain-'+p.grain:''}`} style={{'--mat':p.color,'--shine':String(1-p.roughness)} as CSSProperties}/>}</span><small>{p.name}</small>{chosen&&<Check className="material-check" size={12} aria-hidden="true"/>}</button>})}</div>
 {!visible.length&&<p className="control-note">No matching materials. <button type="button" onClick={()=>onQuery('')}>Clear search</button></p>}
 <details className="inline-help"><summary>Material tips</summary><p className="hint">Try Product softboxes in Lighting to reveal grain and reflections. Applying a material resets tint and overlapping custom finishes.</p></details></>;
}
