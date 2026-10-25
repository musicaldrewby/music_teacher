import {stationLayout, type Project} from './project';
export type CameraSettings = Project['camera'];
type Vec = [number, number, number];
const radians = (degrees: number) => degrees * Math.PI / 180;
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const wrapYaw = (n: number) => ((n + 180) % 360 + 360) % 360 - 180;
export const defaultCamera: CameraSettings = {mode: 'front', yaw: 0, pitch: 23, roll: 0, zoom: 1, focus: '', pan: [0,0,0], fov: 38, orbitAmount: 10.313240312354818, orbitSpeed: 1};
export const cameraPresets = [
  {id: 'wide', name: 'Wide stage', yaw: 0, pitch: 23, zoom: 1},
  {id: 'front', name: 'Front row', yaw: 0, pitch: 12, zoom: 1.25},
  {id: 'three', name: 'Three-quarter', yaw: -35, pitch: 25, zoom: 1.15},
  {id: 'side', name: 'Side view', yaw: 90, pitch: 18, zoom: 1.1},
  {id: 'top', name: 'Overhead', yaw: 0, pitch: 89, zoom: 1.1},
  {id: 'hero', name: 'Instrument', yaw: -25, pitch: 19, zoom: 1.25},
] as const;
export function cameraPreset(id: string, selected: string): CameraSettings {
  const shot = cameraPresets.find(p => p.id === id) || cameraPresets[0];
  return {...defaultCamera, yaw: shot.yaw, pitch: shot.pitch, zoom: shot.zoom, focus: id === 'hero' ? selected : ''};
}
// Shared by interactive navigation and the renderer. Blender uses the same bounds and equations.
export function cameraPose(project: Project, time: number) {
  const c = project.camera, layout = stationLayout(project);
  const focus = project.tracks.findIndex(t => t.id === c.focus);
  const bounds = layout.map((s, i) => {
    const t = project.tracks[i], angle = radians(t.yaw), half = (s.width / 2 + .9) * t.scale, advanced=t.machine==='waterfall'||t.machine==='pipeworks', depth = (advanced?5:2.6) * t.scale;
    return {center: [s.position[0], s.position[1] + (advanced?4.2:2.1) * t.scale, s.position[2]] as Vec,
      half: [Math.abs(Math.cos(angle)) * half + Math.abs(Math.sin(angle)) * depth, (advanced?4.4:2.6) * t.scale, Math.abs(Math.sin(angle)) * half + Math.abs(Math.cos(angle)) * depth] as Vec};
  }).filter((_, i) => focus < 0 || i === focus);
  const low = [0,1,2].map(axis => Math.min(...bounds.map(b => b.center[axis] - b.half[axis])));
  const high = [0,1,2].map(axis => Math.max(...bounds.map(b => b.center[axis] + b.half[axis])));
  const target = low.map((n, i) => (n + high[i]) / 2 + c.pan[i]) as Vec;
  const radius = Math.hypot(...high.map((n, i) => (n - low[i]) / 2));
  const distance = Math.max(9, radius / Math.sin(radians(19)) * 1.06) / c.zoom;
  const yawDegrees = c.yaw + (c.mode === 'orbit' ? Math.sin(time * .13 * c.orbitSpeed) * c.orbitAmount : 0);
  const yaw = radians(yawDegrees), pitch = radians(c.pitch), roll = radians(c.roll);
  const back: Vec = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const right: Vec = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up: Vec = [-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch)];
  const screenRight = right.map((v, i) => v * Math.cos(roll) + up[i] * Math.sin(roll)) as Vec;
  const screenUp = up.map((v, i) => v * Math.cos(roll) - right[i] * Math.sin(roll)) as Vec;
  return {target, distance, position: target.map((n, i) => n + back[i] * distance) as Vec, right: screenRight, up: screenUp, yaw: yawDegrees};
}
export function manualCamera(p: Project, time: number): CameraSettings {
  return {...p.camera, mode: 'front', yaw: wrapYaw(cameraPose(p, time).yaw)};
}
export function orbitCamera(c: CameraSettings, dx: number, dy: number): CameraSettings {
  return {...c, mode: 'front', yaw: wrapYaw(c.yaw - dx * .25), pitch: clamp(c.pitch + dy * .2, 0, 89)};
}
export function panCamera(p: Project, time: number, dx: number, dy: number, height: number): CameraSettings {
  const pose = cameraPose(p, time), units = 2 * pose.distance * Math.tan(radians(p.camera.fov / 2)) / Math.max(1, height);
  return {...manualCamera(p, time), pan: p.camera.pan.map((n, i) => clamp(n + (-dx * pose.right[i] + dy * pose.up[i]) * units, i === 1 ? -20 : -50, i === 1 ? 20 : 50)) as Vec};
}
export function zoomCamera(c: CameraSettings, delta: number): CameraSettings {
  return {...c, zoom: clamp(c.zoom * Math.exp(-clamp(delta, -300, 300) * .0015), .2, 5)};
}
