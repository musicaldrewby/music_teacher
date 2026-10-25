import {delayMilliseconds,delayValue} from './synth-effects.js';

// Entry uses the same control handlers and mixer model as dragging a slider.
const fields={
 volume:['Master volume','%',65],velocity:['Keyboard velocity','',96],
 'shape-octave':['Octave','octaves',0],'shape-tune':['Fine tune','cents',0],
 'shape-attack':['Attack','offset from patch default',64],'shape-release':['Release','offset from patch default',64],'shape-brightness':['Brightness','offset from patch default',64],
 reverb:['Reverb amount','%',25],'reverb-decay':['Reverb decay','0–127',64],'reverb-damping':['Reverb damping','0–7',2],'reverb-predelay':['Reverb pre-delay','ms',12],
 delay:['Delay amount','%',25],'delay-time':['Delay time','ms · nearest supported time',100],'delay-feedback':['Delay feedback','%',35],'delay-damping':['Delay damping','0–7',2],
 'seq-click-volume':['Metronome volume','%',65],'seq-strength':['Quantize strength','%',100],'seq-swing':['Swing','%',0],'drum-velocity':['Drum velocity','',96]
};
export function createValueEditor(document,host){
 const $=id=>document.getElementById(id),dialog=$('value-dialog'),input=$('value-number');let current=null,opener=null;
 function close(){dialog.close();current=null;opener?.focus?.({preventScroll:true})}
 function show(config,trigger){if(config.disabled())return;current=config;opener=trigger||document.activeElement;$('value-heading').textContent=config.label;$('value-unit').textContent=config.unit;input.min=config.min;input.max=config.max;input.step=1;input.value=config.read();$('value-error').textContent='';$('value-reset').textContent='Reset to '+config.reset;dialog.showModal();input.focus({preventScroll:true});input.select?.()}
 function open(id,trigger){
  const el=$(id),f=fields[id];if(!el||!f)return;
  const offset=['shape-attack','shape-release','shape-brightness'].includes(id)?64:0,to=id==='delay-time'?delayMilliseconds:v=>v-offset,from=id==='delay-time'?delayValue:v=>v+offset;
  show({label:f[0],unit:f[1],min:to(Number(el.min||el.getAttribute('min')||0)),max:to(Number(el.max||el.getAttribute('max')||127)),reset:Math.round(to(f[2])),read:()=>Math.round(to(Number(el.value))),disabled:()=>el.disabled||host.locked?.(id),write(value){el.value=from(value);el.oninput?.({target:el});el.onchange?.({target:el});host.persist()}},trigger);
 }
 function openMix(index,key,trigger){
  if(!Number.isInteger(index)||index<0||index>7||!['volume','pan','reverb','delay'].includes(key))return;
  const t=host.track(index),pan=key==='pan',to=v=>pan?v-64:Math.round(v/127*100),from=v=>pan?v+64:Math.round(v/100*127),defaults={volume:100,pan:64,reverb:80,delay:64};
  show({label:'T'+(index+1)+' '+t.name+' · '+({volume:'Volume',pan:'Pan',reverb:'Reverb send',delay:'Delay send'}[key]),unit:pan?'0 = center · negative = left · positive = right':'%',min:pan?-64:0,max:pan?63:100,reset:to(defaults[key]),read:()=>to(host.track(index)[key]),disabled:()=>false,write:value=>host.mix(index,key,from(value))},trigger);
 }
 function apply(reset=false){if(!current)return;if(current.disabled()){close();return}const value=reset?current.reset:Number(input.value);if(!reset&&!String(input.value).trim()||!Number.isFinite(value)||value<current.min||value>current.max){$('value-error').textContent='Enter a number from '+current.min+' to '+current.max+'.';return}current.write(Math.round(value));close()}
 $('value-apply').onclick=()=>apply();$('value-reset').onclick=()=>apply(true);$('value-cancel').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply()}});
 for(const b of document.querySelectorAll('[data-value-id]'))b.onclick=e=>{e?.preventDefault();open(b.dataset.valueId,b)};
 return {open,openMix,close,get active(){return !!current}};
}
