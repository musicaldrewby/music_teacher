export const PRESETS = [
  {id:'steel',name:'Steel Guitar',description:'Clear, natural steel-string plucks.'},
  {id:'twelve',name:'12-String Guitar',description:'Full, shimmering guitar strings.'},
  {id:'dulcimer',name:'Dulcimer',description:'Bright, ringing hammered strings.'},
  {id:'nylon',name:'Nylon Guitar',description:'Soft, rounded acoustic plucks.'},
  {id:'harp',name:'Orchestral Harp',description:'Gentle, flowing harp strings.'},
  {id:'mandolin',name:'Mandolin',description:'Crisp, lively picked strings.'},
];
export const DEFAULT_PRESET='dulcimer';
export const PRESET_PREFERENCE_VERSION=2;
export const getPreset=id=>PRESETS.find(p=>p.id===id);
export const savedPreset=saved=>saved?.presetPreferenceVersion===PRESET_PREFERENCE_VERSION&&getPreset(saved.preset)?saved.preset:DEFAULT_PRESET;
