import {TRACKS} from './content.js';
import {performanceProfile} from './performance.js';
import {LiveJam} from './live-jam.js';
import {LIVE_SONG} from './arrangement.js';
export class Soundtrack {
 constructor(onChange,onError,getState){this.getState=getState;this.profile=performanceProfile(getState());this.live=null;this.liveActive=false;this.onChange=onChange;this.onError=onError;this.tracks=[...TRACKS];this.ctx=null;this.current=null;this.enabled=false;this.volume=.35;this.sfx=.18;this.choice='live';this.chapter=0;this.generation=0;this.cache=new Map();this.db=null;this.ready=this.loadLibrary();}
 async loadLibrary(){try{this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('tips-to-tours-music',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const items=await this.dbRead();for(const t of items)this.install(t);this.onChange();}catch{this.db=null;}}
 dbRead(){return new Promise((res,rej)=>{const r=this.db.transaction('tracks').objectStore('tracks').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
 persist(track,remove=false){if(!this.db)throw new Error('Music storage is unavailable in this browser.');return new Promise((res,rej)=>{const tx=this.db.transaction('tracks','readwrite');const s=tx.objectStore('tracks');remove?s.delete(track.id):s.put(track);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('Music storage is full.'));});}
 install(t){const i=this.tracks.findIndex(x=>x.id===t.id);const built=TRACKS.find(x=>x.id===t.id);const next={...t,chapters:built?.chapters||t.chapters||[],custom:true};if(i>=0)this.tracks[i]=next;else this.tracks.push(next);this.cache.delete(t.id);}
 ensure(){if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)throw new Error('This browser does not support game audio.');this.ctx=new A();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);this.live=new LiveJam(this.ctx,this.master,this.profile);}return this.ctx.resume();}
 updateCareer(){const p=performanceProfile(this.getState());this.profile=p;this.live?.setProfile(p);}
 selected(){if(this.choice==='live')return {id:'live',title:LIVE_SONG.title+' · '+this.profile.skill.name,chapters:[]};return this.tracks.find(x=>x.id===this.choice)||this.tracks.find(x=>x.chapters.includes(this.chapter))||this.tracks[0];}
 async set({enabled=this.enabled,volume=this.volume,sfx=this.sfx,choice=this.choice,chapter=this.chapter}={}){
  this.updateCareer();this.enabled=enabled;this.volume=volume;this.sfx=sfx;this.choice=choice;this.chapter=chapter;
  if(this.master)this.master.gain.setTargetAtTime(volume,this.ctx.currentTime,.05);
  const track=this.selected();this.onChange();
  if(!enabled){this.stop();return;}
  const token=++this.generation;
  if(choice==='live'){
   if(this.current){try{this.current.src.stop();}catch{}this.current=null;}
   try{await this.ensure();if(token!==this.generation||!this.enabled)return;this.live.start();this.liveActive=true;this.onChange();}catch(e){if(token===this.generation){this.enabled=false;this.stop();this.onError(e.message||'Live Jam could not start.');}}return;
  }
  this.live?.stop();this.liveActive=false;
  if(this.current?.id===track.id)return;
  try{await this.ensure();let buffer=this.cache.get(track.id);if(!buffer){const bytes=track.blob?await track.blob.arrayBuffer():await fetch(track.src).then(r=>{if(!r.ok)throw new Error('Track could not be loaded.');return r.arrayBuffer();});buffer=await this.ctx.decodeAudioData(bytes);this.cache.set(track.id,buffer);}
   if(token!==this.generation||!this.enabled)return;
   const src=this.ctx.createBufferSource(),gain=this.ctx.createGain();src.buffer=buffer;src.loop=true;gain.gain.setValueAtTime(0,this.ctx.currentTime);gain.gain.linearRampToValueAtTime(1,this.ctx.currentTime+.35);src.connect(gain);gain.connect(this.master);const old=this.current;this.current={id:track.id,src,gain};src.start();if(old){old.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.1);old.src.stop(this.ctx.currentTime+.6);}this.onChange();
  }catch(e){if(token===this.generation){this.enabled=false;this.stop();this.onError(e.message||'Music could not start.');this.onChange();}}
 }
 stop(){this.generation++;this.live?.stop();this.liveActive=false;if(this.current){try{this.current.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.05);this.current.src.stop(this.ctx.currentTime+.3);}catch{}this.current=null;}this.onChange();}
 async add(file,replaceId=null){await this.ready;if(file.size>30*1024*1024)throw new Error('Choose an audio file under 30 MB.');if(!/\.(mp3|wav|ogg|flac)$/i.test(file.name))throw new Error('Choose an MP3, WAV, OGG or FLAC file.');await this.ensure();await this.ctx.decodeAudioData(await file.arrayBuffer());const t={id:replaceId||'custom-'+crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,''),artist:'Your soundtrack',blob:file,chapters:[],custom:true};await this.persist(t);this.install(t);if(this.current?.id===t.id)this.stop();await this.set({choice:t.id,enabled:true});return t;}
 async remove(id){await this.persist({id},true);const built=TRACKS.find(t=>t.id===id);this.tracks=this.tracks.filter(t=>t.id!==id);if(built)this.tracks.push(built);this.cache.delete(id);if(this.current?.id===id)this.stop();if(this.choice===id)this.choice='auto';await this.set();}
 perform(){if(!this.sfx)return;try{this.updateCareer();this.ensure().then(()=>{if(this.enabled&&this.choice!=='live'){this.clickTone('click');return;}this.live.perform(this.ctx.destination,this.sfx);}).catch(()=>{});}catch{}}
 clickTone(kind='click'){if(!this.sfx)return;try{this.ensure();const t=this.ctx.currentTime;if(this.lastEffect&&t-this.lastEffect<.065)return;this.lastEffect=t;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='triangle';const f=kind==='buy'?659:440;osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(kind==='buy'?988:554,t+.08);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(this.sfx*.13+.0001,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+.12);osc.connect(gain);gain.connect(this.ctx.destination);osc.start(t);osc.stop(t+.14);}catch{}}
}
