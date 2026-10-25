'use client';
import {useEffect,useRef,useState} from 'react';
import {Film,Download,Check} from 'lucide-react';
import type {Scene} from '../lib/scene';
import {renderExport} from '../lib/export';
import {exportRange,stereoDimensions,stereoSuffix} from '../lib/stereo';
import {StereoPanel} from './stereo-panel';
import {Button,Select} from './studio-fields';

export function ExportPanel({scene,change,time,ready,initialFormat,onBusy,onStart}:{scene:Scene;change:(s:Scene)=>void;time:number;ready:boolean;initialFormat:'mp4'|'webm'|'png';onBusy:(v:boolean)=>void;onStart:()=>void}){
 const [format,setFormat]=useState(initialFormat),[height,setHeight]=useState(1080),[test,setTest]=useState(false),[transparent,setTransparent]=useState(false),[busy,setBusy]=useState(''),[progress,setProgress]=useState(0),[error,setError]=useState(''),[file,setFile]=useState<{url:string;name:string;preview:boolean;stereo:boolean;depthCheck:boolean}|null>(null),abort=useRef<AbortController|null>(null);
 const vr=['vr180','vr360'].includes(scene.stereo.mode),range=exportRange(scene,time,test),d=stereoDimensions(scene.stereo.mode,scene.stereo.quality,height);
 useEffect(()=>()=>{if(file)URL.revokeObjectURL(file.url)},[file]);
 useEffect(()=>{setFile(null)},[scene,format,height,test,transparent]);
 useEffect(()=>()=>{abort.current?.abort()},[]);
 const run=async(kind:'browser'|'blender'|'check')=>{
  onStart();setBusy(kind);onBusy(true);setProgress(0);setError('');setFile(null);const ctl=new AbortController();abort.current=ctl;
  try{
   const snapshot=structuredClone(scene),name=scene.name.replace(/[^a-z0-9 _-]/gi,'').trim().replaceAll(' ','-')||'Prism';let blob:Blob,ext:string;
   if(kind==='blender'){const {blenderPackage}=await import('../lib/blender-export');blob=await blenderPackage(snapshot,{range,height,signal:ctl.signal,progress:setProgress});ext='zip';}
   else{if(kind==='check'){snapshot.stereo.mode='cinema';snapshot.renderSettings.engine='standard';}const h=kind==='check'?720:height;blob=await renderExport(snapshot,{format:kind==='check'?'png':format,width:h*16/9,height:h,fps:scene.fps,time,range,transparent:kind==='check'?false:transparent,signal:ctl.signal,progress:setProgress});ext=kind==='check'?'png':format;}
   if(ctl.signal.aborted)throw Error('Canceled');setFile({url:URL.createObjectURL(blob),name:name+(kind==='check'?'_Depth_Check':stereoSuffix(scene.stereo.mode))+(test&&kind!=='check'?'_Test':'')+'.'+ext,preview:ext==='png',stereo:kind==='check'||scene.stereo.mode==='cinema',depthCheck:kind==='check'});
  }catch(e){setError((e as Error).message)}finally{setBusy('');onBusy(false);abort.current=null;}
 };
 return <><p className="modal-intro">Frame-accurate video with synchronized sound. Choose a cinema screen or an immersive headset view.</p><div className="export-summary"><Film size={30}/><div><strong>{scene.name}</strong><span>{range.duration.toFixed(2)}s · {range.frames.toLocaleString()} frames · {d.width} × {d.height}</span></div></div>
 <fieldset disabled={!!busy} className="stereo-export-settings"><StereoPanel scene={scene} change={change} height={height}/><div className="export-options">
 <Select label="Render range" value={test?'test':'all'} options={[{value:'all',label:`Entire scene · ${scene.duration}s`},{value:'test',label:`Up to 10s from playhead · ${time.toFixed(2)}s`}]} onChange={v=>setTest(v==='test')}/>
 <Select label="Frame rate" value={String(scene.fps)} options={[60,30,24].map(n=>({value:String(n),label:`${n} FPS`}))} onChange={v=>change({...scene,fps:Number(v) as Scene['fps']})}/>
 {!vr&&<><Select label="Resolution per eye" value={String(height)} options={[{value:'1080',label:'1920 × 1080 · Full HD'},{value:'720',label:'1280 × 720 · HD'}]} onChange={v=>setHeight(Number(v))}/><Select label="Browser format" value={format} options={[{value:'mp4',label:'MP4 · H.264'},{value:'webm',label:'WebM · VP9'},{value:'png',label:'PNG · current frame'}]} onChange={v=>setFormat(v as typeof format)}/><Select label="Browser renderer" value={scene.renderSettings.engine} options={[{value:'standard',label:'Standard · fast'},{value:'path-traced',label:'Path traced · physical light'}]} onChange={v=>change({...scene,renderSettings:{...scene.renderSettings,engine:v as Scene['renderSettings']['engine']}})}/></>}
 <Select label="Ray-tracing samples" value={String(scene.renderSettings.samples)} options={[16,64,128,256].map(v=>({value:String(v),label:String(v)}))} onChange={v=>change({...scene,renderSettings:{...scene.renderSettings,samples:Number(v) as 16|64|128|256}})}/><Select label="Light bounces" value={String(scene.renderSettings.bounces)} options={[2,3,4,5,6,7,8].map(v=>({value:String(v),label:String(v)}))} onChange={v=>change({...scene,renderSettings:{...scene.renderSettings,bounces:Number(v)}})}/></div>
 {!vr&&format==='png'&&<label className="check-field"><input type="checkbox" checked={transparent} onChange={e=>setTransparent(e.target.checked)}/>Transparent PNG background</label>}
 </fieldset>
 {vr?<p className="trace-note">Immersive video uses Blender’s spherical stereo camera. Download the scene package, unzip it and double-click Launch-Prism.cmd on Windows. With Blender 4.5+ installed, the local dashboard provides Test frame, Render / Resume, automatic MP4 assembly and Open output folder. Start with Preview quality.</p>:<p className="hint">Browser video renders on this computer. Keep the tab open. Full SBS preserves the resolution of each eye. Codec support depends on your device; the Blender package provides another render path.</p>}
 <p className="hint">Blender tries OptiX for your NVIDIA GPU and reports the selected device. Meshes, materials, motion and audio transfer; camera dissolves become cuts and lighting can differ. Packages include the Windows render launcher and manual Blender scripts. No separate Python install is needed.</p>
 {error&&<p role="alert" className="export-error">{error}</p>}
 {busy?<div className="render-progress"><div><span>{busy==='blender'?'Preparing Blender package':'Rendering'} · {Math.round(progress*100)}%</span><Button onClick={()=>abort.current?.abort()}>Cancel</Button></div><progress value={progress} max={1}/></div>:<>
 {file&&<><div className="render-done"><Check size={20}/><span>Your file is ready.</span><a className="button primary" href={file.url} download={file.name}><Download size={16}/>Download {file.name.split('.').pop()?.toUpperCase()}</a></div>{file.preview&&<figure className="stereo-preview"><img src={file.url} alt={file.stereo?"Rendered left and right eye views":"Rendered scene frame"}/><figcaption>{file.depthCheck&&vr?'Perspective depth check only; the Blender render creates the panorama.':file.stereo?'Full side-by-side image · left eye first':'Current scene frame'}</figcaption></figure>}</>}
 <div className="export-actions">{!vr&&<Button className="primary wide" disabled={!ready} onClick={()=>run('browser')}><Film/>Render {format==='png'?'current frame':`${scene.stereo.mode==='cinema'?'3D ':''}${scene.fps} FPS video`}</Button>}<Button className={vr?'primary wide':'wide'} disabled={!ready} onClick={()=>run('blender')}><Download/>Download Blender package</Button>{scene.stereo.mode!=='mono'&&<Button className="wide" disabled={!ready} onClick={()=>run('check')}>Render depth-check PNG</Button>}</div></>}
 </>;
}
