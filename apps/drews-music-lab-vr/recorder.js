import {HARMONIES} from './music-presets.js?v=14';
import {validateBass,bassEvent} from './bass.js?v=43';
import {SYNTH_DEFAULT,SYNTH_PARAMS} from './synth.js?v=43';
const TYPES=['gong','windchimes','steelpan','piano','xylophone','metallophone','glockenspiel','boomwhacker','maracas','tambourine','cowbell','kick','snare','hat','clap','synth'];
const IDS=['gong','windchimes','steelpan','piano','sx','ax','bx','sm','am','bm','glock','bw','maracas','tambourine','cowbell','synth','drums'];
const copy=x=>JSON.parse(JSON.stringify(x));
function validDrums(value){if(value==null)return null;if(!Array.isArray(value)||value.length!==4||value.some(row=>!Array.isArray(row)||row.length!==16||row.some(cell=>typeof cell!=='boolean')))throw Error('Invalid drum pattern.');return copy(value);}

export function validateMix(value){
 if(value==null)return {};
 if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid song mix.');
 const out={};for(const [id,p]of Object.entries(value)){
  if(![...IDS,'bass','xylophone','metallophone'].includes(id)||!p||typeof p!=='object'||!Number.isFinite(p.volume)||p.volume<0||p.volume>1||typeof p.muted!=='boolean')throw Error('Invalid instrument level.');
  out[id]={volume:p.volume,muted:p.muted};
 }return out;
}

export function validateSong(data){if(!data||data.format!=='drews-loop-song'||data.version!==1)throw Error('Choose a Music Lab song file.');if(!Number.isFinite(data.bpm)||data.bpm<40||data.bpm>200||![1,2,4,8].includes(data.bars)||!Array.isArray(data.events)||data.events.length>4096)throw Error('Invalid song tempo, length or notes.');if(data.harmony!==undefined&&data.harmony!=='d-ionian'&&!Object.hasOwn(HARMONIES,data.harmony))throw Error('Invalid song key or mode.');const events=data.events.map(e=>{if(!e||!TYPES.includes(e.type)||!Number.isFinite(e.beat)||e.beat<0||e.beat>=data.bars*4||!Number.isFinite(e.midi)||e.midi<12||e.midi>120||!Number.isFinite(e.velocity)||e.velocity<0||e.velocity>1||!Number.isFinite(e.duration)||e.duration<.01||e.duration>32)throw Error('This song contains an invalid note.');const out={beat:e.beat,type:e.type,midi:e.midi,velocity:e.velocity,duration:e.duration};if(e.instrumentId!==undefined){if(!IDS.includes(e.instrumentId))throw Error('Invalid recorded instrument.');out.instrumentId=e.instrumentId;}if(e.type==='synth'){let p={...SYNTH_DEFAULT,...e.patch};for(const [k,values]of Object.entries({wave:['sine','triangle','sawtooth','square'],filter:['lowpass','highpass','bandpass'],mod:['off','chorus','flanger','phaser']}))if(!values.includes(p[k]))throw Error('Invalid synth sound.');const clean={wave:p.wave,filter:p.filter,mod:p.mod};for(const param of SYNTH_PARAMS){if(!Number.isFinite(p[param.key])||p[param.key]<param.min||p[param.key]>param.max)throw Error('Invalid synth sound.');clean[param.key]=p[param.key];}if(e.patch?.program!==undefined){if(!Number.isInteger(e.patch.program)||e.patch.program<0||e.patch.program>127)throw Error('Invalid SoundFont voice.');clean.program=e.patch.program;}if(e.patch?.bank!==undefined){if(![0,1,8].includes(e.patch.bank))throw Error('Invalid SoundFont bank.');clean.bank=e.patch.bank;}out.patch=clean;}return out;});if(new Set(events.filter(e=>e.patch).map(e=>JSON.stringify(e.patch))).size>12)throw Error('A song may contain up to 12 different synthesizer sounds.');return{mix:validateMix(data.mix),harmony:data.harmony==='d-ionian'?'d-mixolydian':data.harmony||'c-ionian',bassPattern:validateBass(data.bassPattern),drumPattern:validDrums(data.drumPattern),format:'drews-loop-song',version:1,title:String(data.title||'My song').trim().slice(0,80)||'My song',bpm:data.bpm,bars:data.bars,events};}
export class LoopRecorder{
 constructor({play,click=()=>{},change=()=>{},finish=()=>{}}){this.playEvent=play;this.click=click;this.visualRevision=0;this.activeCaptures=new Map();this.captureCycles=new WeakMap();this.captureOrder=new WeakMap();this.captureSequence=0;this.lastLayerState=null;this.lastTakeState=null;this.takeSnapshot=null;this.continuous=false;this.takeFromPlaying=false;this.preTakeOrigin=0;this.preTakeCursor=0;this.change=()=>{this.visualRevision++;change();};this.onFinish=finish;this.mix={};this.harmony='c-ionian';this.bpm=100;this.bars=4;this.mode='overdub';this.quantize=true;this.state='stopped';this.events=[];this.drumPattern=null;this.bassPattern=null;this.take=[];this.undoState=null;this.machineStarts={drums:0,bass:0};this.origin=0;this.cursor=0;this.recordStart=0;this.recordEnd=0;this.lastClick=-1;this.metroOrigin=0;this.metronome=true;this.loop=true;this.finishAt=Infinity;}
 get beatSeconds(){return 60/this.bpm;}get length(){return this.bars*4*this.beatSeconds;}get taking(){return this.state==='countin'||this.state==='recording';}
 get hasContent(){return !!this.events.length||!!this.drumPattern?.some(row=>row.some(Boolean))||!!this.bassPattern?.steps.some(Boolean);}
 snapshot(title='My song'){return{format:'drews-loop-song',version:1,title,mix:validateMix(this.mix),harmony:this.harmony,bpm:this.bpm,bars:this.bars,events:copy(this.events),bassPattern:validateBass(this.bassPattern),drumPattern:validDrums(this.drumPattern)};}
 backup(){this.undoState=this.snapshot();}
 configure(bpm,bars){if(this.events.length||this.state!=='stopped')throw Error('Stop and clear the recorded notes before changing tempo.');if(!Number.isFinite(bpm)||bpm<40||bpm>200||![1,2,4,8].includes(bars))throw Error('Choose 40–200 BPM and 1, 2, 4 or 8 bars.');this.bpm=bpm;this.bars=bars;this.change();}
 setMode(mode){if(!['replace','overdub'].includes(mode))throw Error('Invalid recording mode.');if(this.taking)throw Error('Stop this take before starting another.');this.mode=mode;this.change();}
 startTake(now,options={}){
  if(this.taking){this.finish(now);return;}
  const mode=options.mode||this.mode;
  if(!['replace','overdub'].includes(mode))throw Error('Invalid recording mode.');
  if(options.bars!==undefined&&(![1,2,4,8].includes(options.bars)||mode!=='replace'))throw Error('Only a new recording can change length.');
  if(this.events.length>=4096&&mode==='overdub')throw Error('This loop is full. Clear it or start a new recording.');
  this.backup();this.takeSnapshot=copy(this.undoState);this.captureCycles=new WeakMap();this.mode=mode;if(options.bars)this.bars=options.bars;
  const continuing=this.state==='playing'&&mode==='overdub';
  this.takeFromPlaying=continuing;this.preTakeOrigin=this.origin;this.preTakeCursor=this.cursor;
  this.continuous=mode==='overdub';
  const bar=4*this.beatSeconds;
  this.recordStart=continuing&&options.nextMeasure?this.origin+Math.max(0,Math.ceil((now+.05-this.origin)/bar-1e-9))*bar:continuing?Math.max(now,this.origin):now+4*this.beatSeconds;
  this.recordEnd=this.continuous?Infinity:this.recordStart+this.length;
  if(!continuing){this.origin=this.recordStart;this.cursor=now;this.machineStarts={drums:0,bass:0};}
  if(mode==='replace')this.events=[];
  if(mode==='replace')this.lastLayerState=null;
  this.take=[];this.state=continuing&&now>=this.recordStart?'recording':'countin';this.metroOrigin=continuing?this.origin:now;
  this.lastClick=Math.ceil((now-this.metroOrigin)/this.beatSeconds)-1;
  if(this.metronome&&!continuing){this.click(now,true);this.lastClick=0;}
  this.finishAt=Infinity;this.loop=true;this.change();
 }
 capture({type,midi=60,velocity=.75,patch,duration=.5,instrumentId},time){if(!this.taking||time<this.recordStart||time>=this.recordEnd||this.events.length+this.take.length>=4096)return()=>{};let beat=(time-this.origin)/this.beatSeconds;if(this.quantize)beat=Math.round(beat*4)/4;beat%=this.bars*4;const note={beat,type,midi,velocity:Math.max(0,Math.min(1,velocity)),duration:Math.max(.01,Math.min(32,duration/this.beatSeconds))};if(instrumentId&&IDS.includes(instrumentId))note.instrumentId=instrumentId;if(type==='synth'){note.patch=copy(patch);const sounds=new Set([...this.events,...this.take].filter(e=>e.patch).map(e=>JSON.stringify(e.patch)));sounds.add(JSON.stringify(note.patch));if(sounds.size>12)return()=>{};}this.take.push(note);this.captureOrder.set(note,++this.captureSequence);this.captureCycles.set(note,Math.floor((time-this.origin)/this.length));const captureEnd=this.recordEnd,beatSeconds=this.beatSeconds,maxDuration=this.bars*4;if(type==='synth')this.activeCaptures.set(note,time);this.visualRevision++;return end=>{if(type==='synth'&&!this.activeCaptures.has(note))return;note.duration=Math.max(.01,Math.min(32,maxDuration,(Math.min(end,captureEnd)-time)/beatSeconds));this.activeCaptures.delete(note);this.visualRevision++;};}
 restore(song){this.mix=validateMix(song?.mix);this.events=copy(song?.events||[]);this.drumPattern=validDrums(song?.drumPattern);this.bassPattern=validateBass(song?.bassPattern);this.lastLayerState=null;if(song){this.harmony=song.harmony||'c-ionian';this.bpm=song.bpm;this.bars=song.bars;}}
 finish(now){if(!this.taking)return;for(const [note,start]of this.activeCaptures)note.duration=Math.max(.01,Math.min(32,this.bars*4,(Math.min(now,this.recordEnd)-start)/this.beatSeconds));this.activeCaptures.clear();if(now<this.recordStart){const previousLayer=this.lastLayerState,wasPlaying=this.takeFromPlaying,origin=this.preTakeOrigin,cursor=this.preTakeCursor;this.restore(this.takeSnapshot);this.takeSnapshot=null;this.lastLayerState=previousLayer;this.take=[];this.state=wasPlaying?'playing':'stopped';this.origin=origin;this.cursor=Math.max(now,cursor);this.change();return;}if(this.mode==='overdub'&&this.take.length)this.lastLayerState=copy(this.takeSnapshot);if(this.mode==='replace'||this.take.length)this.lastTakeState=this.takeSnapshot;this.takeSnapshot=null;this.events=[...this.events,...this.take].sort((a,b)=>a.beat-b.beat);this.take=[];this.state='playing';if(!this.continuous&&now<this.recordEnd){this.origin=now+.04;this.cursor=now;}this.onFinish();this.change();}
 removeLastNote(){const list=this.take.length?this.take:this.events;if(!list.length)return false;let index=list.length-1,best=-Infinity;for(let i=0;i<list.length;i++){const order=this.captureOrder.get(list[i]);if(order!==undefined&&order>best){best=order;index=i;}}const [note]=list.splice(index,1);this.activeCaptures.delete(note);this.captureCycles.delete(note);this.captureOrder.delete(note);this.change();return true;}
 undoLastLayer(now){if(this.taking||!this.lastLayerState)return false;const state=this.state,origin=this.origin,cursor=this.cursor,saved=this.lastLayerState;this.restore(saved);this.lastTakeState=null;this.lastLayerState=null;this.state=state;this.origin=origin;this.cursor=Math.max(now,cursor);this.change();return true;}
 undoLastTake(now){const saved=this.taking?this.takeSnapshot:this.lastTakeState;if(!saved)return false;this.activeCaptures.clear();this.take=[];this.restore(saved);this.takeSnapshot=null;this.lastTakeState=null;this.undoState=null;this.state='stopped';this.machineStarts={drums:0,bass:0};this.origin=now;this.cursor=now;this.finishAt=Infinity;this.change();return true;}
 recoverySnapshot(title='Recovered loop'){const song=this.snapshot(title);song.events=[...this.events,...this.take].map(copy).sort((a,b)=>a.beat-b.beat);return song;}
 play(now,loop=true){if(!this.hasContent&&!this.drumPattern&&!this.bassPattern)throw Error('Record something or start the drum machine first.');this.state='playing';this.loop=loop;this.machineStarts={drums:0,bass:0};this.origin=now+.05;this.cursor=now;this.finishAt=loop?Infinity:this.origin+this.length;this.change();}
 stop(now){if(this.taking)this.finish(now);this.state='stopped';this.machineStarts={drums:0,bass:0};this.change();}
 clear(now){this.stop(now);this.backup();this.mix={};this.events=[];this.drumPattern=null;this.bassPattern=null;this.take=[];this.lastLayerState=null;this.lastTakeState=null;this.takeSnapshot=null;this.bars=4;this.change();}
 undo(now){if(!this.undoState)return;this.stop(now);const next=this.snapshot(),old=this.undoState;this.restore(old);this.lastTakeState=null;this.takeSnapshot=null;this.undoState=next;this.change();}
 load(song,now){const valid=validateSong(song);this.stop(now);this.backup();this.restore(valid);this.lastTakeState=null;this.takeSnapshot=null;this.change();}
 toggleMachine(kind,pattern,now){
  if(!['drums','bass'].includes(kind))throw Error('Unknown machine.');
  const key=kind==='drums'?'drumPattern':'bassPattern';
  if(this[key]&&this.state!=='stopped'){this[key]=null;this.machineStarts[kind]=0;this.change();return false;}
  this[key]=pattern;
  if(this.state==='stopped'){this.play(now);return true;}
  // Keep the shared transport running. Join at a full measure boundary beyond
  // the already-scheduled audio, so the new machine never misses its first beat.
  const bar=4*this.beatSeconds,ready=Math.max(now+.03,this.cursor,this.origin);
  this.machineStarts[kind]=this.origin+Math.max(0,Math.ceil((ready-this.origin)/bar-1e-9))*bar;
  this.change();return true;
 }
 machinePhase(kind,now){
  const enabled=!!this[kind==='drums'?'drumPattern':'bassPattern']&&this.state!=='stopped';
  const at=Math.max(this.origin,this.machineStarts[kind]||0),queued=enabled&&now<at;
  const step=enabled&&!queued?Math.floor(Math.max(0,now-this.origin)/(this.beatSeconds/4)+1e-8)%16:-1;
  return {enabled,queued,at,step};
 }
 pause(now){if(this.state!=='playing')return;this.pausedAt=Math.max(0,now-this.origin);this.state='paused';this.change();}
 resume(now){if(this.state!=='paused')return;this.origin=now+.03-this.pausedAt;this.cursor=now;this.state='playing';this.change();}
 tick(now){
  if(this.state==='stopped'||this.state==='paused')return;
  if(this.state==='countin'&&now>=this.recordStart){this.state='recording';this.change();}
  if(this.state==='recording'&&now>=this.recordEnd)this.finish(now);
  if(now>=this.finishAt){this.state='stopped';this.change();return;}
  if(this.taking&&this.metronome){const beat=Math.floor((now+.075-this.metroOrigin)/this.beatSeconds);if(beat>this.lastClick){const at=this.metroOrigin+beat*this.beatSeconds;if(at>=now-.01&&at<this.recordEnd)this.click(at,beat%4===0);this.lastClick=beat;}}
  const end=Math.min(now+.09,this.taking?this.recordEnd:Infinity,this.finishAt),begin=Math.max(this.cursor,now-.025);
  if(end<=begin)return;
  for(const event of this.continuous&&this.taking?[...this.events,...this.take]:this.events){if(this.activeCaptures.has(event))continue;const offset=event.beat*this.beatSeconds;let cycle=Math.max(this.continuous&&this.taking?(this.captureCycles.get(event)??-1)+1:0,Math.ceil((begin-this.origin-offset)/this.length));for(let at=this.origin+offset+cycle*this.length;at<end;at+=this.length){if(at>=begin)this.playEvent(event,Math.max(now,at),this.beatSeconds);}}
  // The drum machine and recorded notes share this origin and scheduling cursor.
  // The one-measure pattern repeats; it is never recaptured into overdub notes.
  if(this.drumPattern){const interval=this.beatSeconds/4;let index=Math.max(0,Math.ceil((begin-this.origin)/interval-1e-9));for(let at=this.origin+index*interval;at<end;at=this.origin+(++index)*interval){if(at<begin-1e-9||at<this.machineStarts.drums-1e-9)continue;for(let voice=0;voice<4;voice++)if(this.drumPattern[voice][index%16])this.playEvent({type:['kick','snare','hat','clap'][voice],midi:60,velocity:.75,duration:.25,source:'drum-machine',instrumentId:'drums',step:index%16},Math.max(now,at),this.beatSeconds);}}
  if(this.bassPattern){const interval=this.beatSeconds/4;let index=Math.max(0,Math.ceil((begin-this.origin)/interval-1e-9));for(let at=this.origin+index*interval;at<end;at=this.origin+(++index)*interval){if(at<begin-1e-9||at<this.machineStarts.bass-1e-9)continue;const event=bassEvent(this.bassPattern,index%16);if(event)this.playEvent(event,Math.max(now,at),this.beatSeconds);}}
  this.cursor=end;
 }
 status(now){if(this.state==='stopped')return this.hasContent?'Stopped · '+this.bars+' measures':'Ready · 4 measures';if(this.state==='countin')return (this.mode==='overdub'?'Overdub':'Record')+' in '+Math.max(1,Math.ceil((this.recordStart-now)/this.beatSeconds))+' beats';const beat=Math.floor(Math.max(0,now-this.origin)/this.beatSeconds)%(this.bars*4);return (this.state==='recording'?(this.mode==='overdub'?'Overdubbing':'Recording'):'Playing')+' · measure '+(Math.floor(beat/4)+1)+'/'+this.bars+' · beat '+(beat%4+1);}
}
export class SongStore{
 constructor(){this.db=null;this.opening=null;this.localKey='drews-music-lab-song-backup-v1';}
 async open(){
  if(this.db)return this.db;if(this.opening)return this.opening;
  if(!globalThis.indexedDB)throw Error('Song database is unavailable.');
  this.opening=new Promise((resolve,reject)=>{let settled=false;const request=indexedDB.open('drews-music-lab-songs',1);
   const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);reject(Error('Song database did not respond.'));};
   const timer=setTimeout(fail,3000);request.onblocked=request.onerror=fail;
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('songs'))request.result.createObjectStore('songs',{keyPath:'id'});};
   request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;clearTimeout(timer);this.db=request.result;this.db.onversionchange=()=>{this.db?.close();this.db=null;};resolve(this.db);};
  });try{return await this.opening;}finally{this.opening=null;}
 }
 async run(mode,action){const db=await this.open();return new Promise((resolve,reject)=>{let settled=false,result,tx;const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);try{tx?.abort();}catch{}reject(Error('Song storage could not finish.'));};const timer=setTimeout(fail,3000);try{tx=db.transaction('songs',mode);const request=action(tx.objectStore('songs'));request.onsuccess=()=>{result=request.result;};request.onerror=fail;tx.oncomplete=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve(result);};tx.onerror=tx.onabort=fail;}catch{fail();}});}
 localRows(){const raw=globalThis.localStorage?.getItem(this.localKey);if(!raw)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('Saved song backup could not be read.');return rows;}
 localPut(item){if(!globalThis.localStorage)throw Error('Device storage is unavailable.');const rows=this.localRows().filter(s=>s.id!==item.id);rows.push(item);localStorage.setItem(this.localKey,JSON.stringify(rows));}
 async list(){let remote=[],local=[],remoteOK=false,localOK=false;try{remote=await this.run('readonly',s=>s.getAll());remoteOK=true;}catch{}try{local=this.localRows();localOK=!!globalThis.localStorage;}catch{}if(!remoteOK&&!localOK)throw Error('Storage unavailable. Export your song to keep it.');const items=new Map(remote.map(s=>[s.id,s]));for(const s of local){const old=items.get(s.id);if(!old||(s.savedAt||0)>=(old.savedAt||0))items.set(s.id,s);}return [...items.values()].filter(s=>!s.deleted).sort((a,b)=>b.savedAt-a.savedAt);}
 async put(item){let localOK=false;try{this.localPut(item);localOK=true;}catch{}try{await this.run('readwrite',s=>s.put(item));return item;}catch{if(localOK)return item;throw Error('Could not save on this device. Your loop is still here; free storage or export it in the browser.');}}
 async save(song){const item={...validateSong(song),id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),savedAt:Date.now()};return this.put(item);}
 async rename(id,title){const song=(await this.list()).find(s=>s.id===id);if(!song)throw Error('This song is no longer saved.');return this.put({...song,title:String(title).trim().slice(0,80)||'My song',savedAt:Date.now()});}
 async remove(id){await this.put({id,deleted:true,savedAt:Date.now()});}
}
