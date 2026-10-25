'use client';
import {useEffect,useRef,useState} from 'react';
import {Glasses,Camera,Box,Hand,LoaderCircle,Trash2} from 'lucide-react';
import type {Scene,CameraPose} from '../lib/scene';
import {XRStudio,type XRReport} from '../lib/xr-studio';
import {useXRView,viewToStoryboard,type XRScaleMode} from '../lib/xr-math';
import {Button,Section} from './studio-fields';

export function XRViews({scene,change,toast}:{scene:Scene;change:(s:Scene)=>void;toast:(s:string)=>void}){
 if(!scene.xrViews.length)return null;
 return <Section title="Views captured in VR"><p className="hint">Saved viewpoints use a normal video camera. Add one to the storyboard or use it as the scene camera.</p><div className="xr-views">{scene.xrViews.map(v=><div className="xr-view" key={v.id}><strong><Camera size={15}/>{v.name}</strong><div><Button onClick={()=>{change(useXRView(scene,v));toast('VR viewpoint applied to the scene camera.');}}>Use view</Button><Button onClick={()=>{try{change(viewToStoryboard(scene,v));toast('VR view added to the storyboard.');}catch(e){toast((e as Error).message)}}}>Add to storyboard</Button><Button title={`Delete ${v.name}`} onClick={()=>change({...scene,xrViews:scene.xrViews.filter(n=>n.id!==v.id)})}><Trash2 size={13}/></Button></div></div>)}</div></Section>;
}

export function XRPanel({scene,time,spawn,onApply,onBusy,change,toast}:{scene:Scene;time:number;spawn:CameraPose;onApply:(s:Scene,changed:boolean)=>void;onBusy:(b:boolean)=>void;change:(s:Scene)=>void;toast:(s:string)=>void}){
 const [supported,setSupported]=useState<boolean|null>(null),[ready,setReady]=useState(false),[requesting,setRequesting]=useState(false),[active,setActive]=useState(false),[error,setError]=useState('');
 const [mode,setMode]=useState<XRScaleMode>('miniature'),[quality,setQuality]=useState<'balanced'|'sharp'>('balanced'),[shadows,setShadows]=useState(false),[seated,setSeated]=useState(true),[status,setStatus]=useState<XRReport|null>(null);
 const canvas=useRef<HTMLCanvasElement>(null),studio=useRef<XRStudio|null>(null),callbacks=useRef({onApply,onBusy});callbacks.current={onApply,onBusy};
 const snapshot=useRef({scene,time,spawn});snapshot.current={scene,time,spawn};
 useEffect(()=>{let mounted=true;const check=async()=>{if(!window.isSecureContext){setError('VR needs a secure HTTPS address. Open the published Prism link.');setSupported(false);return;}try{const ok=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');if(mounted)setSupported(ok);}catch{if(mounted)setSupported(false);}};void check();return()=>{mounted=false;};},[]);
 useEffect(()=>{
  if(!supported||!canvas.current)return;let mounted=true;setReady(false);setError('');
  const {scene:s,time:t,spawn:p}=snapshot.current;let xr:XRStudio;
  try{xr=new XRStudio(canvas.current,s,t,{mode,quality,shadows,seated},p);studio.current=xr;
   xr.onReport=report=>{if(mounted){setStatus(report);setActive(report.active);}};
   xr.onFinish=(draft,changed)=>{if(!mounted)return;setActive(false);setRequesting(false);callbacks.current.onBusy(false);callbacks.current.onApply(draft,changed);};
   void xr.prepare().then(()=>{if(mounted)setReady(true);}).catch(e=>{if(mounted)setError('The VR scene could not load: '+e.message);});
  }catch(e){setError((e as Error).message);return;}
  return()=>{mounted=false;xr.dispose();studio.current=null;callbacks.current.onBusy(false);};
 },[supported,mode,quality,shadows,seated,scene]);
 const enter=()=>{if(!studio.current||!ready||requesting)return;setRequesting(true);setError('');callbacks.current.onBusy(true);void studio.current.enter().catch(e=>{setRequesting(false);setActive(false);callbacks.current.onBusy(false);setError(e.name==='NotAllowedError'?'VR permission was declined. Press Enter VR to try again.':e.name==='NotSupportedError'?'This browser could not start immersive VR. Open this page directly in Quest Browser.':'Could not enter VR: '+e.message);});};
 return <div className="xr-panel"><div className="xr-hero"><div className="xr-orb"><Glasses size={48}/></div><div><small>STEP INTO YOUR SCENE</small><h3>Prism VR Studio</h3><p>Arrange a miniature world. Step inside at full size. Find your next camera angle.</p></div></div>
 <div className="xr-feature-grid"><div><Box/><strong>Two scales</strong><span>Miniature stage or full size</span></div><div><Hand/><strong>Hands-on editing</strong><span>Move, rotate and resize with controllers</span></div><div><Camera/><strong>Capture views</strong><span>Bring angles back to your storyboard</span></div></div>
 <div className="xr-setup"><label>Start in<select value={mode} disabled={requesting||active} onChange={e=>setMode(e.target.value as XRScaleMode)}><option value="miniature">Miniature stage</option><option value="full">Full size</option></select></label><label>Headset quality<select value={quality} disabled={requesting||active} onChange={e=>setQuality(e.target.value as typeof quality)}><option value="balanced">Balanced · best starting point</option><option value="sharp">Sharper · lighter scenes</option></select></label><label className="xr-checkbox"><input type="checkbox" checked={shadows} disabled={requesting||active} onChange={e=>setShadows(e.target.checked)}/>Live shadows</label><label className="xr-checkbox"><input type="checkbox" checked={seated} disabled={requesting||active} onChange={e=>setSeated(e.target.checked)}/>Seated eye height in full-size mode</label></div>
 <p className="hint">VR uses your headset’s stereo view and its own quality settings. Bloom, depth-of-field and camera moves remain available in video export. Full-size navigation is free flight at eye level; scene walls do not block movement.</p>
 <div className="xr-launch" aria-live="polite">{supported===null?<p>Checking this browser for a VR headset…</p>:!supported?<><strong>Open this Prism page in Meta Quest Browser.</strong><p>Choose a scene, open VR Studio, then press Enter VR. If Prism is inside a preview, open its full website address first.</p><a href="https://prism-motion-studio.musicaldrewby.chatgpt.site" target="_blank" rel="noreferrer">Open Prism website ↗</a></>:<><Button className="primary wide" disabled={!ready||requesting||active} onClick={enter}>{!ready?<LoaderCircle className="spin"/>:<Glasses/>}{active?'VR is running in your headset':requesting?'Starting VR…':ready?'Enter VR':'Preparing your scene…'}</Button>{active&&<Button className="wide" onClick={()=>void studio.current?.exit()}>Exit VR & apply edits</Button>}<p>{status?.message||'Your current scene and playhead will open in the headset.'}</p></>}{error&&<p className="xr-error" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></p>}</div>
 <div className="xr-controls"><h4>Quest controller guide</h4><dl><div><dt>Trigger / grip</dt><dd>Point at a layer and hold to grab; turn your hand to rotate.</dd></div><div><dt>Stick while holding</dt><dd>Push up or down to resize the held layer.</dd></div><div><dt>Left stick</dt><dd>Move through the full-size scene.</dd></div><div><dt>Right stick</dt><dd>Turn in 30° steps, or rotate the miniature stage.</dd></div><div><dt>A / X</dt><dd>Bring the floating controls back in front of you.</dd></div></dl><p>Edits apply when you exit VR. Use <b>Save</b> in the studio to keep them across devices. Path, physics and mechanism layers stay viewable; their setup is edited in the regular studio.</p></div>
 <XRViews scene={scene} change={change} toast={toast}/><canvas ref={canvas} className="xr-render-canvas" aria-hidden="true"/>
 </div>;
}
