import {trackColor} from './usability-model.js';
import {gridBeats,noteSegments} from './sequencer-model.js';

export function createWorkspacePanel(canvas,id){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Could not create the VR workspace screen.');canvas.width=1440;canvas.height=960;
 let last='',buttons=[],sliders=[];
 function paint(state,room,hovered=new Set()){
  const data=state.workspace;if(!data)return false;
  const status={theme:state.theme,track:state.track,recording:state.recording,locked:state.locked,playing:state.playing,song:state.song,busy:state.busy};
  const relevant=id==='mixer'?data.mix:id==='pattern'?{notes:data.notes,controllers:data.controllers,selected:data.selected,grid:data.grid,snap:data.snap,barBeats:data.barBeats,bars:data.bars,totalBeats:data.totalBeats,noteCount:data.noteCount,tracks:data.mix.map(t=>t.name),step:data.step,stepCursor:data.stepCursor,beat:state.playing?Math.floor(data.beat*24)/24:0}:id==='song'?{name:data.name,song:data.song,selected:data.songSelection,barBeats:data.barBeats,beat:state.song?Math.floor(data.beat*24)/24:0}:{groups:data.groups,status:data.status,presetStatus:data.presetStatus,midiStatus:data.midiStatus,exportStatus:data.exportStatus,slots:data.slots,slotStatus:data.slotStatus};
  const signature=JSON.stringify([id,status,relevant,id==='mixer'?null:{ui:room.ui,edit:room.edit,ghost:room.ghost,notice:room.notice,roomFields:room.roomFields,eventFields:room.eventFields},[...hovered].filter(h=>h.startsWith(id+':'))]);if(signature===last)return false;last=signature;buttons=[];sliders=[];
  const accent=state.theme==='purple'?'#c88aff':'#b0ed43',dark='#18202b';ctx.fillStyle=dark;ctx.fillRect(0,0,1440,960);
  function text(value,x,y,size=26,color='#e6edf6',max=1300,font='Arial, sans-serif'){ctx.font=`${size}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign='left';let label=String(value);if(ctx.measureText(label)?.width>max){while(label.length&&ctx.measureText(label+'…')?.width>max)label=label.slice(0,-1);label+='…'}ctx.fillText(label,x,y)}
  function button(key,label,x,y,w,h,action,active=false,disabled=false,extra={}){
   const control={id:id+':'+key,x,y,w,h,action,disabled,...extra};buttons.push(control);const hover=hovered.has(control.id);
   ctx.fillStyle=disabled?'#202832':active?accent:hover?'#43566c':'#2b394b';ctx.fillRect(x,y,w,h);ctx.strokeStyle=hover||active?accent:'#526880';ctx.lineWidth=hover?3:1;ctx.strokeRect(x,y,w,h);
   text(label,x+13,y+h/2,extra.fontSize||26,disabled?'#7b8999':active?'#1b2428':'#e7edf6',w-26);return control;
  }
  function slider(key,label,value,min,max,step,x,y,w,h,action,vertical=false,disabled=false){
   const control={id:id+':'+key,label,value,min,max,step,x,y,w,h,action,vertical,disabled,kind:'slider'};buttons.push(control);sliders.push(control);
   const t=(value-min)/(max-min)||0;ctx.fillStyle='#090f18';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#53667f';ctx.strokeRect(x,y,w,h);ctx.fillStyle=accent;
   if(vertical)ctx.fillRect(x+w*.43,y+h*(1-t),w*.14,h*t);else ctx.fillRect(x,y+h*.42,w*t,h*.16);
   if(!vertical&&label)text(label+'  '+Math.round(value*100)/100,x,y-20,22,disabled?'#7b8999':'#b5c9dc',w);
   return control;
  }
  const titles={mixer:'MIXER / 08 SHARED PARTS',pattern:'PATTERN / EVENT EDITOR',song:'SONG / SCENE ARRANGEMENT',tools:'WORKSTATION TOOLS'};
  ctx.fillStyle='#0d151e';ctx.fillRect(0,0,1440,100);text(titles[id]||id,35,35,32,accent,1070,'"Soundroom Matrix", monospace');text('HOLD GRIP OR TRIGGER ON THIS BAR TO MOVE',35,77,20,'#9db4cb',1060);
  buttons.push({id:id+':grab',x:0,y:0,w:1120,h:100,kind:'grab',action:{type:'grab',panel:id}});
  button('front','FOCUS',1135,26,120,54,{type:'focus-panel',value:id});button('close','CLOSE',1269,26,135,54,{type:'toggle-panel',value:id});
  function tool(group){return {type:'tools',value:group}}
  function controlAction(field){return {type:field.external?'file':field.kind==='button'?'control':'field',id:field.id,field}}
  function field(field,x,y,w=496){
   if(field.kind==='range'){text(field.label,x,y+17,26,'#d8e4ef',w-142);const reset=Number.isFinite(field.defaultValue);slider(field.id,'',Number(field.value),field.min,field.max,field.step,x,y+61,w-(reset?118:0),42,{type:'control',id:field.id},false,field.disabled);button(field.id+'-value',field.display,x+w-132,y-3,132,43,{type:'field',field:{...field,kind:'number'}},false,field.disabled,{fontSize:22});if(reset)button(field.id+'-reset','RESET',x+w-104,y+61,104,42,{type:'control',id:field.id,value:field.defaultValue},false,field.disabled,{fontSize:22})}
   else if(field.kind==='button')button(field.id,field.label,x,y+28,w,74,controlAction(field),field.active,field.disabled);
   else{ text(field.label,x,y+17,23,'#a7bdd2',w);button(field.id,field.kind==='check'?(field.value?'ON':'OFF'):field.display||'Tap to enter',x,y+43,w,62,field.kind==='check'?{type:'control',id:field.id,value:!field.value}:controlAction(field),field.kind==='check'&&field.value,field.disabled)}
  }
  if(id==='mixer'){
   text('Drag the raised faders. Volume, pan and both sends stay live during playback.',36,133,23,'#a8bfd4');
   for(const [i,t]of data.mix.entries()){
    const x=36+i*173;ctx.fillStyle=i===state.track?'#263b3b':'#202d3b';ctx.fillRect(x,162,160,750);ctx.fillStyle=trackColor(i);ctx.fillRect(x,162,160,5);
    button('part-'+i,'PART '+(i+1),x+7,177,146,57,{type:'mix-select',value:i},i===state.track);text(t.patch,x+8,255,20,'#afc6d9',145);
    button('mute-'+i,'M',x+8,283,66,47,{type:'mix',track:i,key:'mute',value:!t.mute},t.mute);button('solo-'+i,'S',x+86,283,66,47,{type:'mix',track:i,key:'solo',value:!t.solo},t.solo);
    button('value-volume-'+i,Math.round(t.volume/127*100)+'%',x+12,340,136,42,{type:'mix-field',track:i,key:'volume'},false,false,{fontSize:22});slider('volume-'+i,'Volume',t.volume,0,127,1,x+46,393,68,262,{type:'mix',track:i,key:'volume'},true);ctx.fillStyle='#101820';ctx.fillRect(x+129,393,9,262);ctx.fillStyle=t.level>.85?'#ffcb69':accent;ctx.fillRect(x+129,655-(t.level||0)*262,9,(t.level||0)*262);
    button('value-pan-'+i,'PAN '+(t.pan===64?'C':t.pan-64),x+8,677,144,38,{type:'mix-field',track:i,key:'pan'},false,false,{fontSize:22});slider('pan-'+i,'',t.pan,0,127,1,x+12,725,136,34,{type:'mix',track:i,key:'pan'});
    button('value-reverb-'+i,'REV '+Math.round(t.reverb/127*100)+'%',x+8,772,144,35,{type:'mix-field',track:i,key:'reverb'},false,false,{fontSize:21});slider('reverb-'+i,'',t.reverb,0,127,1,x+12,813,136,30,{type:'mix',track:i,key:'reverb'});
    button('value-delay-'+i,'DLY '+Math.round(t.delay/127*100)+'%',x+8,849,144,33,{type:'mix-field',track:i,key:'delay'},false,false,{fontSize:21});slider('delay-'+i,'',t.delay,0,127,1,x+12,888,136,30,{type:'mix',track:i,key:'delay'});
   }
   text('M = Mute   S = Solo  /  Effects settings are in Tools → Reverb / Delay.',36,944,22,'#9eb4c8');
  }else if(id==='pattern'){
   const ui=room.ui,bar=Math.max(0,Math.min(data.bars-1,ui.bar)),span=Math.min(ui.span||1,data.bars-bar),start=bar*data.barBeats,length=span*data.barBeats,step=gridBeats(data.grid),low=ui.pitch,grid={x:132,y:270,w:1266,h:456,start,length,low,rows:12,step,mode:ui.editor,lane:ui.lane};
   for(let i=0;i<8;i++){button('part-'+i,(i+1)+' / '+data.mix[i].name,36+i*173,116,160,47,{type:'editor-track',value:i},i===state.track,state.recording||state.busy);ctx.fillStyle=trackColor(i);ctx.fillRect(36+i*173,116,160,4)}
   button('prev','◀',36,185,80,55,{type:'editor-bar',value:-span},false,bar===0);text('MEASURES '+(bar+1)+'–'+(bar+span)+' / '+data.bars,137,212,26,accent,530);button('next','▶',672,185,80,55,{type:'editor-bar',value:span},false,bar+span>=data.bars);
   button('zoom','VIEW '+span+' BAR'+(span>1?'S':''),769,185,208,55,{type:'editor-span'});button('grid','GRID '+data.grid,990,185,199,55,tool('quantize'));button('undo','UNDO',1205,185,193,55,{type:'control',id:'seq-undo'},false,state.locked);
   ctx.fillStyle='#0b131d';ctx.fillRect(grid.x,grid.y,grid.w,grid.h);
   const columns=Math.min(128,Math.ceil(length/step));ctx.lineWidth=1;
   for(let i=0;i<=columns;i++){const x=grid.x+Math.min(length,i*step)/length*grid.w;ctx.strokeStyle=i%(Math.max(1,Math.round(data.barBeats/step)))===0?'#678058':'#263849';ctx.beginPath();ctx.moveTo(x,grid.y);ctx.lineTo(x,grid.y+grid.h);ctx.stroke()}
   for(let i=0;i<=span;i++)text(String(bar+i+1),grid.x+i/span*grid.w+5,252,19,accent,100);
   buttons.push({id:'pattern:grid',x:grid.x,y:grid.y,w:grid.w,h:grid.h,kind:'grid',grid,disabled:state.locked,action:{type:'editor-grid'}});
   if(ui.editor==='events'){
    const lane=ui.lane,info={sustain:['cc',64,127],modulation:['cc',1,127],expression:['cc',11,127],bend:['bend',null,16383],pressure:['pressure',null,127]}[lane],max=info?.[2]||127;
    text(String(max),42,grid.y+10,23,'#a7bdd2',85);text('0',72,grid.y+grid.h-10,23,'#a7bdd2',60);
    if(lane==='velocity')for(const n of data.notes){if(n.start<start||n.start>=start+length)continue;const x=grid.x+(n.start-start)/length*grid.w,h=n.velocity/127*(grid.h-18);ctx.fillStyle=data.selected.includes(n.id)?accent:'#71a8bd';ctx.fillRect(x,grid.y+grid.h-h,12,h);buttons.push({id:'pattern:velocity-'+n.id,x:x-10,y:grid.y,w:32,h:grid.h,kind:'event',grid,note:n,action:{type:'event-hit'},disabled:state.locked})}
    else{
     let previous=lane==='bend'?8192:lane==='expression'?127:0;ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(grid.x,grid.y+grid.h-previous/max*grid.h);
     for(const c of data.controllers.filter(c=>c.type===info[0]&&(info[1]===null||c.controller===info[1])).sort((a,b)=>a.beat-b.beat)){
      const x=grid.x+(c.beat-start)/length*grid.w,y=grid.y+grid.h-c.value/max*grid.h;ctx.lineTo(x,grid.y+grid.h-previous/max*grid.h);ctx.lineTo(x,y);previous=c.value;ctx.fillStyle=c.id===ui.eventID?'#fff':accent;ctx.fillRect(x-7,y-7,14,14);buttons.push({id:'pattern:event-'+c.id,x:x-18,y:y-22,w:36,h:44,kind:'event',event:c,grid,action:{type:'event-hit'},disabled:state.locked});
     }ctx.lineTo(grid.x+grid.w,grid.y+grid.h-previous/max*grid.h);ctx.stroke();
    }
    const lanes=['velocity','sustain','modulation','expression','bend','pressure'];for(const [i,lane]of lanes.entries())button('lane-'+lane,lane.toUpperCase(),36+i*230,752,215,53,{type:'editor-lane',value:lane},lane===ui.lane);
   }else{
    for(let row=0;row<12;row++){const pitch=low+11-row,y=grid.y+row*grid.h/12,black=[1,3,6,8,10].includes(pitch%12);ctx.fillStyle=black?'#141f2c':'#223244';ctx.fillRect(36,y,88,grid.h/12-1);text(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pitch%12]+(Math.floor(pitch/12)-1),45,y+grid.h/24,22,'#c2d6e7',73);ctx.strokeStyle='#37485b';ctx.beginPath();ctx.moveTo(grid.x,y);ctx.lineTo(grid.x+grid.w,y);ctx.stroke()}
    for(const n of data.notes.flatMap(n=>noteSegments(n,data.totalBeats,true))){if(n.pitch<low||n.pitch>low+11||n.start>=start+length||n.start+n.duration<=start)continue;
     const left=Math.max(start,n.start),end=Math.min(start+length,n.start+n.duration),x=grid.x+(left-start)/length*grid.w,y=grid.y+(low+11-n.pitch)*grid.h/12+3,w=Math.max(8,(ui.editor==='drums'?Math.min(step,n.duration):end-left)/length*grid.w),h=grid.h/12-6;
     ctx.fillStyle=data.selected.includes(n.id)?accent:'#64a2b6';ctx.fillRect(x,y,w,h);if(w>48)text(String(n.velocity),x+7,y+h/2,18,'#15232b',w-10);
     buttons.push({id:'pattern:note-'+n.id,x,y,w,h,kind:'note',note:n,grid,action:{type:'note-hit'},disabled:state.locked});
    }
    if(room.ghost){const n=room.ghost,x=grid.x+(n.start-start)/length*grid.w,y=grid.y+(low+11-n.pitch)*grid.h/12;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(x,y,Math.max(8,n.duration/length*grid.w),grid.h/12)}
    if(state.playing&&!state.song||data.step){const beat=data.step?data.stepCursor:((data.beat%data.totalBeats)+data.totalBeats)%data.totalBeats;if(beat>=start&&beat<=start+length){ctx.fillStyle='#ffe397';ctx.fillRect(grid.x+(beat-start)/length*grid.w,grid.y,3,grid.h)}}
    for(const [i,t]of ['draw','select','erase','resize'].entries())button('tool-'+t,t.toUpperCase(),36+i*202,752,188,53,{type:'editor-tool',value:t},ui.tool===t);
    button('pitch-down','OCT −',850,752,166,53,{type:'editor-pitch',value:-12},false,low===0);button('pitch-up','OCT +',1030,752,166,53,{type:'editor-pitch',value:12},false,low>=116);button('multi','MULTI',1210,752,188,53,{type:'editor-multi'},ui.multi);
   }
   for(const [i,e]of ['piano','drums','events'].entries())button('view-'+e,e.toUpperCase(),36+i*210,826,196,55,{type:'editor-view',value:e},ui.editor===e);
   button('notes',ui.editor==='events'?'EVENT EDIT':'NOTE TOOLS',675,826,227,55,tool(ui.editor==='events'?'events':'notes'));
   if(ui.editor==='events'){for(const [i,t]of ['draw','select','erase'].entries())button('event-tool-'+t,t.toUpperCase(),916+i*164,826,154,55,{type:'editor-tool',value:t},ui.tool===t,t==='erase'&&ui.lane==='velocity')}
   else{button('step','STEP REC',916,826,227,55,tool('step'),data.step);button('edit','EDIT MEASURES',1157,826,241,55,tool('measures'))}
   text(state.locked?'Playback running · stop to edit events.':ui.editor==='events'?'Draw a value with the trigger. Select an event, then use Event edit in Tools.':data.selected.length+' selected / '+data.noteCount+' notes · Hold trigger to draw, move or resize.',36,924,25,'#acbed1',1360);
  }else if(id==='song'){
   const total=data.song.reduce((n,e)=>n+e.bars,0)||1,selected=data.song.find(e=>e.id===data.songSelection);text(data.name,36,141,32,accent,920);text(total+' MEASURES',1070,141,25,'#b5c9da',330);
   let at=0;for(const [i,e]of data.song.entries()){const x=36+at/total*1360,w=e.bars/total*1360;button('block-'+e.id,w>90?e.name:'',x,181,Math.max(1,w-3),147,{type:'control',id:'song-selected-entry',value:e.id},e.id===data.songSelection,state.locked);if(w>130)text('S'+(e.scene+1)+' ×'+e.repeats,x+12,303,21,'#9fc0a4',w-24);at+=e.bars}
   if(!data.song.length)text('Add scene patterns below to build your song.',67,254,34,'#8199b1');
   if(state.song&&data.beat>=0){ctx.fillStyle='#fff0a5';ctx.fillRect(36+data.beat/data.barBeats/total*1360,174,4,165)}
   for(let i=0;i<8;i++)button('add-'+i,'+ SCENE '+(i+1),36+i*173,365,160,57,{type:'song-add',value:i},false,state.locked);
   const pages=Math.max(1,Math.ceil(data.song.length/8)),page=Math.min(room.ui.songPage,pages-1);text('ENTRIES '+(page+1)+' / '+pages,36,453,24,'#a7bed3');
   data.song.slice(page*8,page*8+8).forEach((e,i)=>{const x=36+(i%2)*690,y=487+Math.floor(i/2)*75;button('entry-'+e.id,(page*8+i+1)+'. '+e.name+' / ×'+e.repeats,x,y,670,62,{type:'control',id:'song-selected-entry',value:e.id},e.id===data.songSelection,state.locked)});
   button('prev','PREVIOUS',36,808,199,53,{type:'song-page',value:-1},false,page===0);button('next','NEXT',249,808,155,53,{type:'song-page',value:1},false,page>=pages-1);
   for(const [i,[key,label]]of [['song-entry-earlier','EARLIER'],['song-entry-later','LATER'],['song-entry-duplicate','DUPLICATE'],['song-entry-remove','REMOVE']].entries())button(key,label,421+i*246,808,230,53,{type:'control',id:key},false,state.locked||!selected);
   button('edit','ENTRY SETTINGS',36,883,302,51,tool('song'));button('play','PLAY / STOP SONG',352,883,353,51,{type:'transport',value:'song'},state.song,state.busy);text(selected?'SELECTED: '+selected.name+' ×'+selected.repeats:'No entry selected',732,910,26,accent,665);
  }else if(id==='tools'){
   if(room.edit){
    const e=room.edit;text(e.label,36,140,34,accent);button('cancel-edit','CANCEL',1160,115,238,57,{type:'cancel-edit'});
    if(e.kind==='select'){
     const page=Math.min(e.page||0,Math.max(0,Math.ceil(e.options.length/8)-1));e.options.slice(page*8,page*8+8).forEach((o,i)=>button('choice-'+i,o.label,36,204+i*76,1362,62,{type:'apply-edit',value:o.value},String(e.value)===o.value));
     button('choices-prev','PREVIOUS',36,850,230,60,{type:'choice-page',value:-1},false,page===0);text((page+1)+' / '+Math.max(1,Math.ceil(e.options.length/8)),300,880,27,'#a8bfd4');button('choices-next','NEXT',1168,850,230,60,{type:'choice-page',value:1},false,(page+1)*8>=e.options.length);
    }else{
     ctx.fillStyle='#0b1721';ctx.fillRect(36,192,1362,122);text((e.value.length>48?'…'+e.value.slice(-48):e.value)+'▌',59,253,40,accent,1310);const rows=['1234567890','QWERTYUIOP','ASDFGHJKL','ZXCVBNM.-'];
     for(const [r,chars]of rows.entries())for(const [c,char]of [...chars].entries())button('key-'+char,room.ui.upper?char:char.toLowerCase(),36+c*137+(10-chars.length)*68,350+r*99,125,85,{type:'type',value:room.ui.upper?char:char.toLowerCase()});
     button('case',room.ui.upper?'ABC':'abc',36,776,189,67,{type:'text-case'});button('space',e.kind==='number'&&Number.isFinite(e.defaultValue)?'RESET TO '+e.defaultValue:'SPACE',240,776,537,67,e.kind==='number'&&Number.isFinite(e.defaultValue)?{type:'apply-edit',value:String(e.defaultValue)}:{type:'type',value:' '});button('backspace','⌫ BACKSPACE',792,776,360,67,{type:'backspace'});button('clear','CLEAR',1167,776,231,67,{type:'clear-text'});button('apply','APPLY',1018,876,380,60,{type:'apply-edit',value:e.value});text(room.notice||'Names and numeric values are entered here in VR.',36,906,25,'#afc5da',940);
    }
   }else{
    const groups={...data.groups,room:{label:'VR room & mallets',fields:room.roomFields},events:{label:'Event edit',fields:room.eventFields},saved:{label:'Saved songs',fields:[]},help:{label:'VR controls',fields:[]}},names=Object.keys(groups),g=groups[room.ui.group]||groups.record,gp=Math.min(room.ui.groupPage,Math.floor((names.length-1)/10));
    text('PAGES',36,145,24,'#9ab3c9');for(const [i,key]of names.slice(gp*10,gp*10+10).entries())button('group-'+key,groups[key].label,36,186+i*59,267,50,{type:'tools',value:key},room.ui.group===key);
    button('groups-prev','◀',36,815,126,53,{type:'group-page',value:-1},false,gp===0);button('groups-next','▶',177,815,126,53,{type:'group-page',value:1},false,(gp+1)*10>=names.length);
    text(g.label,333,148,33,accent,1065);
    if(room.ui.group==='saved'){
     button('save-slot','SAVE A COPY ON THIS HEADSET',333,190,1065,69,{type:'slot-save'},false,state.locked);text(data.slotStatus||'Song files can be moved between devices with Import / Export.',333,290,24,'#a7bed3',1065);
     const page=room.ui.toolPage;data.slots.slice(page*6,page*6+6).forEach((s,i)=>{button('load-'+s.id,s.name,333,343+i*72,840,60,{type:'slot-load',value:s.id},false,state.locked);button('delete-'+s.id,'DELETE',1187,343+i*72,211,60,{type:'slot-delete',value:s.id},false,state.locked)});
     button('slots-prev','PREVIOUS',333,810,235,58,{type:'tool-page',value:-1},false,page===0);button('slots-next','NEXT',1163,810,235,58,{type:'tool-page',value:1},false,(page+1)*6>=data.slots.length);
    }else if(room.ui.group==='help'){
     ['GRIP / TRIGGER ON A TITLE BAR: move that panel.','WHILE HOLDING A PANEL: thumbstick up/down changes distance.','B / Y: bring the studio and panels back in front of you.','STRIKE: swing to play; harder = louder. Lift between hits.','HOLD: touch a bar to play; lift to release. Uses keyboard velocity.','GRIP PEDAL: enable in Mallets / Keys; squeeze away from panels.','Keep either grip held to sustain; release both to let notes end.','FADERS / PATTERN: aim and drag with the trigger.','FILE DIALOGS: return briefly to the headset browser.','Saved songs and performances can stay inside VR.'].forEach((line,i)=>text(line,333,218+i*61,24,'#c2d2e3',1065));
    }else{
     const count=Math.max(1,Math.ceil(g.fields.length/8)),page=Math.min(room.ui.toolPage,count-1);g.fields.slice(page*8,page*8+8).forEach((f,i)=>field(f,333+i%2*541,193+Math.floor(i/2)*147,524));
     button('tools-prev','PREVIOUS',333,816,222,57,{type:'tool-page',value:-1},false,page===0);text((page+1)+' / '+count,591,845,27,'#a8bed3');button('tools-next','NEXT',1176,816,222,57,{type:'tool-page',value:1},false,page>=count-1);
    }
    text(room.notice||(['performance'].includes(room.ui.group)?data.presetStatus:room.ui.group==='export'?data.exportStatus:room.ui.group==='midi'?data.midiStatus:data.status),36,925,23,'#bbcee0',1362);
   }
  }
  return true;
 }
 return {paint,invalidate(){last=''},get buttons(){return buttons},get sliders(){return sliders}};
}
