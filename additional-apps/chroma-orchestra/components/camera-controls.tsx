'use client';
import {CameraSequence} from './camera-sequence';
import {useState} from 'react';
import {Camera, Crosshair, Trash2, BookmarkPlus} from 'lucide-react';
import {cameraPresets, cameraPreset, defaultCamera, manualCamera, type CameraSettings} from '../lib/camera';
import {type Project} from '../lib/project';

function NumberSlider({label, value, min, max, step = 1, suffix = '', onChange}: {label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (n: number) => void}) {
  return <label className="camera-number"><span>{label}<span><input aria-label={`${label} value`} type="number" min={min} max={max} step={step} value={Number(value.toFixed(2))} onChange={e => {if(e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) onChange(Math.min(max, Math.max(min, e.target.valueAsNumber)));}}/>{suffix}</span></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}/></label>;
}
export function CameraControls({p, selected, change, time, seek}: {seek:(time:number)=>void;p: Project; selected: string; time: number; change: (p: Project) => void}) {
  const [name, setName] = useState('');
  const c = p.camera, patch = (fields: Partial<CameraSettings>) => change({...p, camera: {...c, ...fields}});
  return <>
    <CameraSequence p={p} time={time} change={change} seek={seek}/>
    <div className="control-divider"/>
    <div className="inspector-title"><Camera size={17}/><h2>Find your shot</h2></div>
    <p className="camera-help">Drag to orbit · Shift-drag or right-drag to pan · Scroll to zoom. Touch: one finger orbits; two fingers pan and pinch.</p>
    <div className="camera-presets">{cameraPresets.map(shot => <button key={shot.id} onClick={() => change({...p, camera: cameraPreset(shot.id, selected)})}>{shot.name}</button>)}</div>
    <label className="field-label">FRAME<select value={c.focus} onChange={e => patch({focus: e.target.value, pan: [0,0,0], zoom: 1})}><option value="">Whole orchestra</option>{p.tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <div className="camera-mode" aria-label="Camera motion"><button className={c.mode !== 'orbit' ? 'active' : ''} onClick={() => change({...p,camera:manualCamera(p,time)})}>Steady camera</button><button className={c.mode === 'orbit' ? 'active' : ''} onClick={() => patch({mode: 'orbit'})}>Cinematic orbit</button></div>
    {c.mode === 'orbit' && <div className="camera-motion"><NumberSlider label="Orbit sweep" min={0} max={90} value={c.orbitAmount} suffix="°" onChange={orbitAmount => patch({orbitAmount})}/><NumberSlider label="Orbit speed" min={0} max={3} step={.05} value={c.orbitSpeed} suffix="×" onChange={orbitSpeed => patch({orbitSpeed})}/></div>}
    <NumberSlider label="Yaw / turn" min={-180} max={180} value={c.yaw} suffix="°" onChange={yaw => patch({yaw})}/>
    <NumberSlider label="Pitch / tilt" min={0} max={89} value={c.pitch} suffix="°" onChange={pitch => patch({pitch})}/>
    <NumberSlider label="Roll" min={-180} max={180} value={c.roll} suffix="°" onChange={roll => patch({roll})}/>
    <NumberSlider label="Camera zoom" min={.2} max={5} step={.01} value={c.zoom} suffix="×" onChange={zoom => patch({zoom})}/>
    <NumberSlider label="Lens angle" min={18} max={75} value={c.fov} suffix="°" onChange={fov => patch({fov})}/>
    <details><summary>Precise pan & height</summary>{['Pan X', 'Height Y', 'Pan Z'].map((label, i) => <NumberSlider key={label} label={label} value={c.pan[i]} min={i === 1 ? -20 : -50} max={i === 1 ? 20 : 50} step={.1} onChange={v => {const pan = [...c.pan] as CameraSettings['pan']; pan[i] = v; patch({pan});}}/>)}</details>
    <button className="focus-button" onClick={() => change({...p, camera: {...defaultCamera}})}><Crosshair size={15}/>Frame whole orchestra</button>
    <div className="control-divider"/>
    <span className="field-label">SAVED SHOTS <small>{p.shots.length} / 8</small></span>
    <div className="shot-save"><input aria-label="New shot name" placeholder="Name this shot…" maxLength={40} value={name} onChange={e => setName(e.target.value)}/><button title="Save this camera shot" aria-label="Save this camera shot" disabled={p.shots.length >= 8} onClick={() => {change({...p, shots: [...p.shots, {id: crypto.randomUUID(), name: name.trim() || `Shot ${p.shots.length + 1}`, camera: {...c, pan: [...c.pan]}}]}); setName('');}}><BookmarkPlus size={17}/></button></div>
    <div className="shot-list">{p.shots.map(shot => <div key={shot.id}><button onClick={() => change({...p, camera: {...shot.camera, pan: [...shot.camera.pan]}})}><Camera size={14}/>{shot.name}</button><button aria-label={`Delete shot ${shot.name}`} onClick={() => change({...p, shots: p.shots.filter(s => s.id !== shot.id)})}><Trash2 size={13}/></button></div>)}</div>
    <p className="camera-help">Shots stay with your saved performance. The active camera is used for your film and Blender export. Focus the stage for arrow-key controls; Home frames all.</p>
  </>;
}
