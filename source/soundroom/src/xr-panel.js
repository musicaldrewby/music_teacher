import {trackColor} from './usability-model.js';
// A readable hardware panel, painted once per UI change rather than per eye/frame.
export function createXRPanel(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('The VR control screen could not be created.');
 canvas.width=1440;canvas.height=960;let last='',buttons=[];
 function paint(state,room,hovered=new Set()){
  const {workspace,...displayState}=state,displayRoom={page:room.page,filter:room.filter,base:room.base,patchPage:room.patchPage,pageCount:room.pageCount,patches:room.patches,instrument:room.options?.instrument,playingMode:room.options?.playingMode,gripPedal:room.options?.gripPedal,gripSustain:room.gripSustain,search:room.ui?.soundSearch};
  const signature=JSON.stringify([displayState,displayRoom,[...hovered].filter(id=>!id.includes(':')||id.startsWith('play:'))]);if(signature===last)return false;last=signature;buttons=[];
  const purple=state.theme==='purple',accent=purple?'#c17aff':'#b0ed43',ink=purple?'#f6e6ff':'#233408',lcd=purple?'#7334b0':'#9dd22f';
  ctx.fillStyle='#171d24';ctx.fillRect(0,0,1440,960);
  function text(value,x,y,size=26,color='#dbe3ec',font='Arial, sans-serif',max){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textBaseline='middle';ctx.textAlign='left';if(max===undefined)ctx.fillText(String(value),x,y);else ctx.fillText(String(value),x,y,max)}
  function button(id,label,x,y,w,h,action,active=false,disabled=false,subtitle=''){
   buttons.push({id,x,y,w,h,action,disabled});const hover=hovered.has(id);
   ctx.fillStyle=disabled?'#20262e':active?accent:hover?'#495869':'#2e3947';ctx.fillRect(x,y,w,h);
   ctx.lineWidth=hover?4:2;ctx.strokeStyle=disabled?'#323c47':active||hover?accent:'#536477';ctx.strokeRect(x,y,w,h);
   ctx.save();ctx.beginPath();ctx.rect(x+10,y+2,w-20,h-4);ctx.clip();
   const color=disabled?'#788491':active?'#1c2520':'#f0f4f7';text(label,x+15,y+(subtitle?h*.35:h/2),subtitle?26:27,color,'Arial, sans-serif',w-30);
   if(subtitle)text(subtitle,x+15,y+h*.73,21,color,'Arial, sans-serif',w-30);ctx.restore();
  }
  text('SOUNDROOM',44,40,38,accent,'"Soundroom Matrix", monospace');text('GRAB THIS HEADER TO MOVE',44,79,20,'#a2b2c5');text('SR-08 / STUDIO',425,48,25,'#a2b2c5');
  buttons.push({id:'play:grab',x:0,y:0,w:790,h:100,kind:'grab',action:{type:'grab',panel:'play'}});
  button('theme',purple?'GREEN LCD':'PURPLE LCD',806,26,210,52,{type:'theme'});
  button('recenter','RECENTER',1030,26,183,52,{type:'recenter'});button('exit','EXIT VR',1227,26,169,52,{type:'exit'});
  ctx.shadowColor=accent;ctx.shadowBlur=24;ctx.fillStyle=lcd;ctx.fillRect(44,110,1352,194);ctx.shadowBlur=0;
  ctx.globalAlpha=.12;ctx.fillStyle=ink;for(let y=113;y<304;y+=5)ctx.fillRect(44,y,1352,1);ctx.globalAlpha=1;
  text('PART '+String(state.track+1).padStart(2,'0')+' / '+state.trackName,68,141,23,ink,'"Soundroom Matrix", monospace',960);
  if(room.options?.instrument==='mallets')for(const [i,mode]of ['strike','hold'].entries())button('mode-'+mode,mode.toUpperCase(),1070+i*170,122,156,40,{type:'control',id:'room-playingMode',value:mode},(room.options.playingMode||'strike')===mode);
  text(state.patchName,68,205,60,ink,'"Soundroom Matrix", monospace',1280);
  text('PROGRAM '+state.program+'   BANK '+state.bank+'   '+(state.drums?'DRUMS':'INSTRUMENT'),68,267,23,ink,'"Soundroom Matrix", monospace');
  text('SUSTAIN '+(state.sustain?'ON':'OFF'),1070,267,23,ink,'"Soundroom Matrix", monospace',300);
  button('page-play','PERFORMANCE',44,330,245,54,{type:'page',value:'play'},room.page==='play');
  button('page-sounds','SOUNDS',303,330,181,54,{type:'page',value:'sounds'},room.page==='sounds');
  text(state.position+'  /  '+state.transport,512,357,26,accent,'"Soundroom Matrix", monospace',862);
  if(room.page==='sounds'){
   button('sound-search','SEARCH: '+(room.ui?.soundSearch||'Tap to find a sound'),512,330,884,54,{type:'field',field:{id:'sound-search',label:'Find a sound',kind:'text',value:room.ui?.soundSearch||'',maxLength:48}});
   for(const [i,f] of ['all','gm','variations','drums','favorites','recent'].entries())button('filter-'+f,f.toUpperCase(),44+i*153,410,142,52,{type:'filter',value:f},room.filter===f);
   text((room.patchPage+1)+' / '+room.pageCount,1000,437,27,'#dbe3ec');
   button('prev','<',1190,410,94,52,{type:'patch-page',value:-1},false,room.patchPage===0);
   button('next','>',1300,410,96,52,{type:'patch-page',value:1},false,room.patchPage>=room.pageCount-1);
   room.patches.forEach((p,i)=>{const x=44+(i%2)*684,y=486+Math.floor(i/2)*76;button('patch-'+p.index,p.name,x,y,591,64,{type:'patch',value:p.index},p.selected,state.locked,String(p.program+1).padStart(3,'0')+' / BANK '+p.bankMSB+':'+p.bankLSB);button('favorite-'+p.index,p.favorite?'★':'☆',x+601,y,67,64,{type:'favorite',value:p.index},p.favorite)});
   if(!room.patches.length)text('No matching sounds. Tap SEARCH to change or clear the name.',44,605,32,'#a5b6c9');
   text(state.locked?'STOP PLAYBACK TO CHANGE SOUNDS':'Choose a sound for this part. All eight scenes share the same sounds.',44,829,24,'#a5b6c9');
  }else{
   text('PART / RECORD TRACK',44,415,21,'#a5b6c9');
   state.tracks.forEach((t,i)=>{button('track-'+i,String(i+1)+'  '+t.name,44+i*171,444,155,70,{type:'track',value:i},i===state.track,state.locked,i===state.armed?'REC ARMED':t.patch);ctx.fillStyle=trackColor(i);ctx.fillRect(44+i*171,444,155,5)});
   text('SCENES  /  CHANGES ON THE NEXT MEASURE',44,545,21,'#a5b6c9');
   state.scenes.forEach((s,i)=>{button('scene-'+i,String(i+1)+'  '+(state.queued===i?'NEXT':i===state.scene?(state.playing?'PLAYING':'SELECTED'):''),44+i*171,574,155,72,{type:'scene',value:i},i===state.scene,state.sceneLocked,s);if(state.playing&&(state.queued===i||state.scene===i)){ctx.fillStyle=state.queued===i?'#ffdc8d':accent;ctx.fillRect(44+i*171,650,155*(state.measureProgress||0),4)}});
   button('play',state.playing&&!state.song?'STOP PATTERN':'PLAY PATTERN',44,672,275,64,{type:'transport',value:'pattern'},state.playing&&!state.song&&!state.recording,state.busy||state.song||state.recording);
   button('song',state.song?'STOP SONG':'PLAY SONG',333,672,245,64,{type:'transport',value:'song'},state.song,state.busy||(state.playing&&!state.song));
   button('record',state.recording?'FINISH TAKE':'RECORD T'+(state.armed+1),592,672,273,64,{type:'transport',value:'record'},state.recording,state.busy||state.song);
   button('stop','STOP',879,672,177,64,{type:'transport',value:'stop'});
   button('oct-down','OCT -',1070,672,156,64,{type:'octave',value:-12},false,room.base<=0);
   button('oct-up','OCT +',1240,672,156,64,{type:'octave',value:12},false,room.base>=96);
   for(const [i,id,label,value] of [[0,'volume','VOLUME',state.volume],[1,'reverb','REVERB',state.reverb],[2,'delay','DELAY',state.delay]]){
    const x=44+i*455;text(label+'  '+value+'%',x,775,23,'#b7c7d7');
    button(id+'-down','−',x+235,754,91,48,{type:'level',value:id,delta:-5});button(id+'-up','+',x+339,754,91,48,{type:'level',value:id,delta:5});
   }
   text(state.recordSummary+'  /  '+state.tempo+' BPM',44,836,25,accent,'"Soundroom Matrix", monospace',1352);
  }
  ctx.fillStyle='#0d1219';ctx.fillRect(0,872,1440,88);
  for(const [i,[label,action]]of [['MIXER',{type:'toggle-panel',value:'mixer'}],['PATTERN',{type:'toggle-panel',value:'pattern'}],['SONG',{type:'toggle-panel',value:'song'}],['TOOLS',{type:'tools',value:'record'}],['MALLETS / KEYS',{type:'tools',value:'room'}],['RESET ROOM',{type:'reset-panels'}]].entries())button('workspace-'+i,label,44+i*228,883,212,45,action);
  const playingHint=room.options?.instrument==='mallets'?(room.options.playingMode==='hold'?'HOLD: touch a bar; lift to release.':'STRIKE: hit bars; lift between hits.'):'Aim + hold trigger to play.';
  text(state.monitor?playingHint+'  Grip pedal: '+(room.options?.gripPedal?(room.gripSustain?'DOWN':'ready'):'off')+'  ·  B / Y resets the room.':'LIVE INPUT MUTED · Check Monitor, Mute and Solo.',44,946,20,'#96aac0','Arial, sans-serif',1352);
  return true;
 }
 return {paint,invalidate(){last=''},get buttons(){return buttons}};
}
