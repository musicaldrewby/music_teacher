import {lightingSettingsSchema,type Scene} from './scene';
import {lightingPresets} from './lighting-presets';

/** One preset selection resets previous rig tweaks; stored custom lights are retained. */
export function applyLightingPreset(scene:Scene,id:string):Scene {
 const preset=lightingPresets.find(p=>p.id===id);
 if(!preset)return scene;
 const everyday=preset.group==='everyday';
 return {...scene,manualRig:{...scene.manualRig,mode:'preset'},lighting:id,
  lightingSettings:lightingSettingsSchema.parse({bloom:everyday?0:.3,tone:everyday?'filmic':'vivid',motion:id==='concert'?'sweep':'still'}),
  shadows:{...scene.shadows,mode:id==='noir'?'crisp':'soft',softness:preset.softness??2,strength:1},exposure:1};
}
