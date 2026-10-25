import {defaultPanels,panelCoordinates,sliderValue} from './xr-geometry.js';
import {gridBeats} from './sequencer-model.js';
import {XR_GROUPS} from './xr-controls.js';

export function createSpatialWorkspace(host,callbacks,storage){
 const key='soundroom-vr-workspace-v2';let panels=defaultPanels(),options={instrument:'mallets',playingMode:'strike',gripPedal:false,chromatic:false,height:0,gate:180,sensitivity:1,base:48};
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved){for(const p of panels){const old=saved.panels?.find(x=>x.id===p.id);if(old&&['x','y','z','yaw'].every(k=>Number.isFinite(old[k])))Object.assign(p,{x:Math.max(-4,Math.min(4,old.x)),y:Math.max(-1,Math.min(2,old.y)),z:Math.max(-4,Math.min(2,old.z)),yaw:old.yaw,visible:p.id==='play'||!!old.visible})}const o=saved.options||{};options={instrument:o.instrument==='keyboard'?'keyboard':'mallets',playingMode:o.playingMode==='hold'?'hold':'strike',gripPedal:o.gripPedal===true,chromatic:!!o.chromatic,height:Math.max(-.25,Math.min(.35,Number(o.height)||0)),gate:Math.max(80,Math.min(2000,Number(o.gate)||180)),sensitivity:Math.max(.4,Math.min(2,Number(o.sensitivity)||1)),base:Math.max(0,Math.min(96,Math.round((Number.isFinite(o.base)?o.base:48)/12)*12))}}}catch{}
 const ui={group:'record',toolPage:0,groupPage:0,bar:0,span:1,pitch:48,editor:'piano',tool:'draw',lane:'velocity',eventID:null,multi:false,songPage:0,upper:true,soundSearch:''};
 let edit=null,notice='',ghost=null,ghostSource=null,state=null;const drags=new Map();
 function persist(){try{storage?.setItem(key,JSON.stringify({panels,options}))}catch{notice='The room layout could not be saved on this device.'}}
 function panel(id){return panels.find(p=>p.id===id)}
 function show(id){panel(id).visible=true}
 function focus(id){const p=panel(id);Object.assign(p,{visible:true,x:0,y:.06,z:-1.12,yaw:0});persist()}
 function reset(){cancel();panels=defaultPanels();persist();callbacks.recenter()}
 function changed(){callbacks.invalidate()}
 function tools(group){ui.group=group;ui.toolPage=0;ui.groupPage=Math.floor(Math.max(0,[...Object.keys(XR_GROUPS),'room','events','saved','help'].indexOf(group))/10);edit=null;show('tools');changed()}
 function fieldAction(id,value,phase){
  if(id.startsWith('mix-value:')){const [,track,key]=id.split(':');host.mix?.(Number(track),key,key==='pan'?Number(value)+64:Math.round(Number(value)/100*127));return}
  if(id==='sound-search'){ui.soundSearch=String(value).slice(0,48);panel('tools').visible=false;callbacks.search?.();changed();return}
  if(id.startsWith('room-')){
   callbacks.release();const param=id.slice(5);
   if(param==='instrument')options.instrument=value==='keyboard'?'keyboard':'mallets';
   if(param==='playingMode')options.playingMode=value==='hold'?'hold':'strike';
   if(param==='gripPedal')options.gripPedal=!!value;
   if(param==='chromatic')options.chromatic=!!value;
   if(['height','gate','sensitivity'].includes(param))options[param]=Number(value);
   if(param==='reset'){reset();return}
   if(param==='xylophone'){host.action({type:'xylophone'});return}
   persist();changed();return;
  }
  if(id.startsWith('event-')){
   const e=state?.workspace.controllers.find(e=>e.id===ui.eventID);if(!e)return;
   if(id==='event-delete')host.edit({type:'controller-delete',id:e.id});else host.edit({type:'controller-set',id:e.id,lane:ui.lane,...(id==='event-beat'?{beat:Number(value)-1}:{value:Number(value)})});changed();return;
  }
  return host.control?.(id,value,phase);
 }
 function action(a){
  notice='';
  if(a.type==='toggle-panel'){const p=panel(a.value);if(p)p.visible=!p.visible;persist()}
  else if(a.type==='focus-panel')focus(a.value);
  else if(a.type==='reset-panels')reset();
  else if(a.type==='tools')tools(a.value);
  else if(a.type==='group-page'){ui.groupPage=Math.max(0,Math.min(2,ui.groupPage+a.value))}
  else if(a.type==='tool-page'){ui.toolPage=Math.max(0,ui.toolPage+a.value)}
  else if(a.type==='instrument'){callbacks.release();options.instrument=options.instrument==='mallets'?'keyboard':'mallets';persist()}
  else if(a.type==='octave'){callbacks.release();options.base=Math.max(0,Math.min(96,options.base+a.value));persist()}
  else if(a.type==='file'){callbacks.handoff(a.id);return}
  else if(a.type==='mix-field'){const t=state?.workspace.mix[a.track];if(!t||!['volume','pan','reverb','delay'].includes(a.key))return false;const pan=a.key==='pan',to=v=>pan?v-64:Math.round(v/127*100);edit={id:'mix-value:'+a.track+':'+a.key,label:'T'+(a.track+1)+' '+t.name+' / '+a.key+(pan?' (0 = center)':' (%)'),kind:'number',value:String(to(t[a.key])),min:pan?-64:0,max:pan?63:100,defaultValue:to({volume:100,pan:64,reverb:80,delay:64}[a.key]),maxLength:8,options:[],page:0};show('tools')}
  else if(a.type==='field'){
   if(a.field.disabled)return;const f=a.field;edit={id:f.id,label:f.label,kind:f.kind,min:f.min,max:f.max,defaultValue:f.defaultValue,value:String(f.value??''),maxLength:f.maxLength||80,options:f.options||[],page:0};show('tools');
  }else if(a.type==='cancel-edit'){edit=null}
  else if(a.type==='choice-page'&&edit){edit.page=Math.max(0,Math.min(Math.ceil(edit.options.length/8)-1,edit.page+a.value))}
  else if(a.type==='type'&&edit){edit.value=(edit.value+a.value).slice(0,edit.maxLength)}
  else if(a.type==='backspace'&&edit){edit.value=edit.value.slice(0,-1)}
  else if(a.type==='clear-text'&&edit){edit.value=''}
  else if(a.type==='text-case'){ui.upper=!ui.upper}
  else if(a.type==='apply-edit'&&edit){
   if(edit.kind==='number'&&(!String(a.value).trim()||!Number.isFinite(Number(a.value))||Number(a.value)<edit.min||Number(a.value)>edit.max)){notice='Enter a number'+(Number.isFinite(edit.min)&&Number.isFinite(edit.max)?' from '+edit.min+' to '+edit.max:'')+'.';changed();return}
   fieldAction(edit.id,a.value);edit=null;
  }else if(a.type==='control'){
   if(a.id==='step-toggle'){callbacks.release();show('pattern')}
   Promise.resolve(fieldAction(a.id,a.value,a.phase)).catch(e=>{notice=e.message||'That setting could not be changed.';changed()});
  }else if(a.type==='mix'){host.mix?.(a.track,a.key,a.value)}
  else if(a.type==='mix-select'||a.type==='editor-track'){callbacks.release();host.selectTrack?.(a.value)}
  else if(a.type==='editor-bar'){ui.bar=Math.max(0,Math.min((state?.workspace.bars||1)-1,ui.bar+a.value))}
  else if(a.type==='editor-span'){ui.span=ui.span===1?2:ui.span===2?4:1}
  else if(a.type==='editor-pitch'){ui.pitch=Math.max(0,Math.min(116,ui.pitch+a.value))}
  else if(a.type==='editor-tool'){ui.tool=a.value}
  else if(a.type==='editor-multi'){ui.multi=!ui.multi}
  else if(a.type==='editor-view'){ui.editor=a.value;if(a.value==='drums')ui.pitch=36}
  else if(a.type==='editor-lane'){ui.lane=a.value;ui.eventID=null}
  else if(a.type==='song-add'){host.control?.('song-add-scene',String(a.value));host.control?.('song-add')}
  else if(a.type==='song-page'){ui.songPage=Math.max(0,Math.min(Math.max(0,Math.ceil((state?.workspace.song.length||0)/8)-1),ui.songPage+a.value))}
  else if(a.type==='slot-save'||a.type==='slot-load'||a.type==='slot-delete'){Promise.resolve(host.slots?.(a.type.slice(5),a.value)).then(changed)}
  else return false;
  changed();return true;
 }
 function position(point,grid){
  const step=grid.step,raw=grid.start+Math.max(0,Math.min(.999999,(point.x-grid.x)/grid.w))*grid.length;
  return {start:state?.workspace.snap?Math.floor((raw+1e-8)/step)*step:raw,pitch:Math.max(0,Math.min(127,grid.low+11-Math.floor(Math.max(0,Math.min(.9999,(point.y-grid.y)/grid.h))*12))),value:Math.max(0,Math.min(1,1-(point.y-grid.y)/grid.h))};
 }
 function begin(source,hit,ray){
  if(!hit)return false;
  if(['grab','slider','grid','note','event'].includes(hit.kind)){
   if([...drags.values()].some(d=>d.panel===hit.panel))return true;
   callbacks.release(source);
   if(hit.kind==='grab'){
    const p=panel(hit.panel),target=ray.origin.map((o,i)=>o+ray.direction[i]*hit.distance);drags.set(source,{kind:'panel',panel:hit.panel,distance:hit.distance,offset:[p.x-target[0],p.y-target[1],p.z-target[2]]});
   }else if(hit.kind==='slider'){
    const value=sliderValue(hit,hit.point);action({...hit.action,value,phase:'input'});drags.set(source,{kind:'slider',panel:hit.panel,control:hit,last:value,pending:value,elapsed:0});
   }else{
    if(state.locked)return true;
    const g=hit.grid,pos=position(hit.point,g);let n=hit.note&&state.workspace.notes.find(n=>n.id===hit.note.id);
    if(state.workspace.step&&g.mode!=='events'){
     host.control?.('step-measure',Math.floor(pos.start/state.workspace.barBeats)+1);host.control?.('step-beat',(pos.start%state.workspace.barBeats)*(state.workspace.meter?.[1]||4)/4+1);host.control?.('step-go');changed();return true;
    }
    if(g.mode==='events'){
     if(hit.event)ui.eventID=hit.event.id;
     if(ui.tool==='erase'){if(hit.event)host.edit?.({type:'controller-delete',id:hit.event.id});changed();return true}
     if(ui.tool==='select'){if(hit.event)tools('events');else if(n)host.edit?.({type:'select',id:n.id,toggle:ui.multi});changed();return true}
     if(ui.lane==='velocity'&&!n)n=state.workspace.notes.reduce((best,n)=>!best||Math.abs(n.start-pos.start)<Math.abs(best.start-pos.start)?n:best,null);
     drags.set(source,{kind:'event',panel:hit.panel,grid:g,event:hit.event,note:n,pos,last:pos});
    }else if(ui.tool==='erase'){if(n)host.edit?.({type:'note-delete',id:n.id});changed();return true}
    else if(ui.tool==='select'){host.edit?.({type:'select',id:n?.id,toggle:ui.multi});changed();return true}
    else if(g.mode==='drums'){
     host.edit?.(n?{type:'note-delete',id:n.id}:{type:'note-add',pitch:pos.pitch,start:pos.start,duration:Math.min(.2,g.step*.8),velocity:96});changed();return true;
    }else{
     const note=n?{...n}:{pitch:pos.pitch,start:pos.start,duration:g.step,velocity:96};ghost={...note};ghostSource=source;drags.set(source,{kind:n?ui.tool==='resize'?'resize':'move':'draw',panel:hit.panel,grid:g,note,pos});
    }
   }
   changed();return true;
  }
  return false;
 }
 function move(source,ray,dt=0){
  const d=drags.get(source);if(!d)return false;if(!ray){cancel(source);return true}
  if(d.kind==='panel'){
   const stick=source.gamepad?.mapping==='xr-standard'?source.gamepad.axes[3]||0:0;d.distance=Math.max(.65,Math.min(3.5,d.distance+(Math.abs(stick)>.2?stick*dt:0)));
   const p=panel(d.panel),at=ray.origin.map((o,i)=>o+ray.direction[i]*d.distance+d.offset[i]);p.x=Math.max(-4,Math.min(4,at[0]));p.y=Math.max(-1,Math.min(2,at[1]));p.z=Math.max(-4,Math.min(2,at[2]));p.yaw=Math.atan2(-p.x,-p.z);return true;
  }
  const point=panelCoordinates(ray.origin,ray.direction,panel(d.panel),false);if(!point)return true;
  if(d.kind==='slider'){
   const value=sliderValue(d.control,point);d.pending=value;d.elapsed+=dt;if(value!==d.last&&d.elapsed>=.033){d.last=value;d.elapsed=0;action({...d.control.action,value,phase:'input'})}return true;
  }
  const pos=position(point,d.grid);if(d.kind==='event'){d.last=pos;changed();return true}
  ghost={...d.note};if(d.kind==='draw')ghost.duration=Math.max(d.grid.step,pos.start-d.note.start+d.grid.step);
  else if(d.kind==='resize')ghost.duration=Math.max(.01,pos.start-d.note.start+d.grid.step);
  else{ghost.pitch=Math.max(0,Math.min(127,d.note.pitch+pos.pitch-d.pos.pitch));ghost.start=Math.max(0,Math.min(state.workspace.totalBeats-.01,d.note.start+pos.start-d.pos.start))}
  changed();return true;
 }
 function finish(source){
  const d=drags.get(source);if(!d)return false;drags.delete(source);
  if(d.kind==='panel')persist();
  else if(d.kind==='slider')action({...d.control.action,value:d.pending,phase:'commit'});
  else if(d.kind==='event'){
   const max=ui.lane==='bend'?16383:127,value=Math.round(d.last.value*max);
   if(ui.lane==='velocity'){if(d.note)host.edit?.({type:'note-update',id:d.note.id,velocity:Math.max(1,value)})}
   else host.edit?.({type:'controller-set',id:d.event?.id,lane:ui.lane,beat:d.last.start,value});
  }else if(ghost&&ghostSource===source)host.edit?.(d.kind==='draw'?{type:'note-add',...ghost}:d.kind==='resize'?{type:'note-update',id:ghost.id,duration:ghost.duration}:{type:'note-update',id:ghost.id,start:ghost.start,pitch:ghost.pitch});
  if(ghostSource===source){ghost=null;ghostSource=null}changed();return true;
 }
 function cancel(source){if(source){if(!drags.has(source))return;drags.delete(source)}else drags.clear();if(!source||ghostSource===source){ghost=null;ghostSource=null}changed()}
 function field(id,label,kind,value,min=0,max=100,step=1,choices){return {id:'room-'+id,label,kind,value,display:String(value),min,max,step,options:choices,disabled:false}}
 function snapshot(next){
  state=next;if(state.workspace){ui.bar=Math.min(ui.bar,state.workspace.bars-1);ui.songPage=Math.min(ui.songPage,Math.max(0,Math.ceil(state.workspace.song.length/8)-1));while(ui.span>1&&ui.span*state.workspace.barBeats/gridBeats(state.workspace.grid)>128)ui.span/=2}
  const e=state.workspace?.controllers.find(e=>e.id===ui.eventID),eventFields=[
   {id:'event-beat',label:'Selected event · beat',kind:'number',value:e?e.beat+1:1,display:e?String(e.beat+1):'Select an event',disabled:!e||state.locked,maxLength:12},
   {id:'event-value',label:'Selected event · value',kind:'number',value:e?.value||0,display:String(e?.value||0),disabled:!e||state.locked,maxLength:8},
   {id:'event-delete',label:'Delete selected event',kind:'button',disabled:!e||state.locked}];
  return {panels,options,ui,edit,notice,ghost,eventFields,roomFields:[
   field('instrument','Playable surface','select',options.instrument,0,100,1,[{label:'Mallet bars',value:'mallets'},{label:'Piano keyboard',value:'keyboard'}]),
   {...field('playingMode','Mallet playing mode','select',options.playingMode,0,100,1,[{label:'Strike · velocity-sensitive hits',value:'strike'},{label:'Hold · touch to play, lift to release',value:'hold'}]),disabled:options.instrument!=='mallets'},
   field('gripPedal','Grip sustain pedal (away from panels)','check',options.gripPedal),field('chromatic','Chromatic bars (all semitones)','check',options.chromatic),field('height','Instrument height (metres)','range',options.height,-.25,.35,.01),
   {...field('gate','Strike note gate (ms)','range',options.gate,80,2000,10),disabled:options.instrument!=='mallets'||options.playingMode==='hold'},
   {...field('sensitivity','Strike sensitivity','range',options.sensitivity,.4,2,.05),disabled:options.instrument!=='mallets'||options.playingMode==='hold'},
   {id:'room-xylophone',label:'Load xylophone into selected part',kind:'button',disabled:state.locked},{id:'room-reset',label:'Reset panels & recenter room',kind:'button',disabled:false}
  ]};
 }
 return {get panels(){return panels},options,ui,action,begin,move,finish,cancel,reset,snapshot,tools,get dragging(){return drags.size>0},isDragging:source=>drags.has(source)};
}
