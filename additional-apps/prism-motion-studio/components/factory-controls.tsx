'use client';
import type {Scene} from '../lib/scene';
import {factoryStage,factoryStages} from '../lib/factory-timing';
import {Button} from './studio-fields';

export function FactoryControls({scene,time,change,seek}:{scene:Scene;time:number;change:(scene:Scene)=>void;seek:(time:number)=>void}){
 if(scene.set.id!=='toy-factory')return null;
 const stage=factoryStage(time);
 return <div className="factory-controls" aria-label="Christmas Toy Factory controls"><div className="factory-view-row"><strong><span>TOY WORKS</span> {stage.name}</strong><div role="group" aria-label="Factory camera view">{([{id:'cinematic',label:'Cinematic'},{id:'parcel',label:'Follow present'},{id:'overview',label:'Overview'}] as const).map(v=><Button key={v.id} active={scene.camera.factoryView===v.id} onClick={()=>change({...scene,camera:{...scene.camera,factoryView:v.id,ride:{...scene.camera.ride,enabled:false}}})}>{v.label}</Button>)}</div></div><div className="factory-chapters" aria-label="Jump to factory chapter">{factoryStages.map((p,i)=><button key={p.id} aria-current={stage.id===p.id?'step':undefined} onClick={()=>seek(Math.min(p.start,scene.duration))}><span>{String(i+1).padStart(2,'0')}</span>{p.name}</button>)}</div></div>;
}
