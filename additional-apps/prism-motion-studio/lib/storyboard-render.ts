import {Engine} from './engine';
import {shotRanges,shotPose} from './sequence';
import {inspectShotFrame} from './storyboard';
import type {Scene} from './scene';
export type ShotPreview={image:string;warnings:string[]};
export async function renderStoryboard(scene:Scene,signal:AbortSignal,onShot:(id:string,preview:ShotPreview)=>void){
 const engine=new Engine(document.createElement('canvas'),false);const check=()=>{if(signal.aborted)throw new DOMException('Canceled','AbortError');};
 try{engine.resize(480,270);await engine.sync(scene);await engine.readyBackground();check();for(const {shot,start} of shotRanges(scene.camera.shots)){const warnings=new Set<string>();for(const fraction of [0,.5,.999]){check();const local=shot.duration*fraction;engine.render(start+local,false,shotPose(shot,local));for(const warning of inspectShotFrame(engine.world,engine.camera,scene.objects.filter(o=>o.type==='text').flatMap(o=>{const node=engine.objects.get(o.id);return node?[{name:o.name,node}]:[]})))warnings.add(warning);await new Promise(r=>setTimeout(r,0));}engine.render(start+shot.duration*.5,false,shotPose(shot,shot.duration*.5));onShot(shot.id,{image:engine.canvas.toDataURL('image/jpeg',.82),warnings:[...warnings]});await new Promise(r=>setTimeout(r,0));}}finally{engine.dispose();}
}
