import {RHYTHMS,clamp} from './core.js';
export class SoundDesk {
  constructor(onError=()=>{}){this.onError=onError;this.ctx=null;this.nodes=new Set();this.players=new Set();this.music=null;this.cuePlayer=null;this.musicTimer=null;this.onEnd=null;this.musicEpoch=0;this.effectsEpoch=0;this.settings={musicVolume:.65,effectsVolume:.35};}
  configure(settings){this.settings=settings;if(this.music)this.music.volume=settings.musicVolume;if(this.cuePlayer)this.cuePlayer.volume=settings.effectsVolume;}
  async unlock(){try{this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx;}catch{return null;}}
  tone(freq,start,duration=.2,volume=.12,type='sine',music=false){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);if(type==='triangle')o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.6),start+duration);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume*(music?this.settings.musicVolume:this.settings.effectsVolume),start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(this.ctx.destination);this.nodes.add(o);o._music=music;o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(start);o.stop(start+duration+.02);}
  effect(type){if(!this.ctx||this.settings.effectsVolume===0)return;const now=this.ctx.currentTime;const notes={tick:[760],lock:[440,330],blip:[940],safe:[523.25,659.25,783.99,1046.5],out:[392,349.23,293.66],end:[523.25,659.25,783.99,1046.5,1318.5]};if(type==='suspense'){for(let i=0;i<16;i++)this.tone(130+(i%3)*20,now+i*.08,.06,.1,'triangle');return;}for(const [i,freq]of(notes[type]||notes.tick).entries())this.tone(freq,now+i*.11,type==='tick'?.06:.25,type==='tick'?.08:.2,type==='tick'?'triangle':'sine');}
  custom(src,offset=0){
    if(!src||this.settings.effectsVolume===0)return Promise.resolve(false);
    const epoch=this.effectsEpoch,p=new Audio();p.preload='auto';p.volume=this.settings.effectsVolume;p.hidden=true;
    if(typeof document!=='undefined')document.body.append(p);
    this.players.add(p);this.cuePlayer=p;
    return new Promise(resolve=>{
      let settled=false,starting=false,timer;
      const active=()=>epoch===this.effectsEpoch&&this.players.has(p);
      const finish=ok=>{clearTimeout(timer);if(!settled){settled=true;resolve(ok);}};
      p._cancel=()=>{p.onloadedmetadata=p.onended=p.onerror=null;finish(false);p.remove?.();};
      const release=()=>{this.players.delete(p);if(this.cuePlayer===p)this.cuePlayer=null;p._cancel();p.pause();p.src='';};
      const fail=message=>{if(active())this.onError(message);release();};
      const ready=async()=>{
        if(starting||!active())return;starting=true;
        try{
          if(offset>0){if(!Number.isFinite(p.duration)||offset>=p.duration){release();return;}p.currentTime=offset;}
          await p.play();
          if(!active()){p.pause();finish(false);return;}finish(true);
        }catch{if(active())fail('Audio could not start. Tap the sound control to try again.');else finish(false);}
      };
      p.onloadedmetadata=ready;p.onended=release;p.onerror=()=>fail('That sound could not be played. Try another audio file.');
      timer=setTimeout(()=>{if(active())fail('That sound took too long to load. The game can continue.');},8000);
      p.src=src;p.load();if(p.readyState>=1)ready();
    });
  }
  async startCountdown(engine,src){
    if(!['choose','paused'].includes(engine.state))return;
    this.stopAll();const epoch=this.effectsEpoch,roundEpoch=engine.epoch;
    const active=()=>epoch===this.effectsEpoch&&roundEpoch===engine.epoch&&['choose','paused'].includes(engine.state);
    await this.unlock();if(!active())return;
    if(src)await this.custom(src,Math.max(0,engine.settings.seconds-engine.remaining/1000));
    if(active())engine.start();
  }
  stopEffects(){this.effectsEpoch++;for(const p of this.players){p._cancel?.();p.pause();p.src='';}this.players.clear();this.cuePlayer=null;for(const o of [...this.nodes])if(!o._music){try{o.stop();}catch{}}}
  async play(slide,onEnd=()=>{}){this.stopMusic();const epoch=this.musicEpoch;this.onEnd=onEnd;await this.unlock();if(epoch!==this.musicEpoch)return;if(slide.centerContent&&slide.centerType==='audio'){const p=new Audio(slide.centerContent);this.music=p;p.volume=this.settings.musicVolume;const start=clamp(slide.clip?.start,0,86400),end=clamp(slide.clip?.end,0,86400);p.onloadedmetadata=()=>{if(epoch!==this.musicEpoch)return;if(start<p.duration)p.currentTime=start;else{this.onError('The clip start is past the end of the audio.');this.stopMusic();}};p.ontimeupdate=()=>{if(epoch===this.musicEpoch&&end>start&&p.currentTime>=end)this.stopMusic();};p.onended=()=>{if(epoch===this.musicEpoch)this.stopMusic();};p.onerror=()=>{if(epoch===this.musicEpoch){this.onError('This audio could not be played. Try importing an MP3 or WAV file.');this.stopMusic();}};try{await p.play();}catch{if(epoch===this.musicEpoch){this.onError('Audio could not start. Tap Play audio to try again.');this.stopMusic();}}return;}
    if(!this.ctx){this.onError('Audio is not available in this browser.');this.stopMusic();return;}
    const sound=slide.sound;const start=this.ctx.currentTime+.08;const beat=60/(sound?.tempo||100);let length=0;
    if(sound?.type==='rhythm'){const rhythm=RHYTHMS.find(r=>r.id===sound.pattern);if(!rhythm){this.stopMusic();return;}for(let rep=0;rep<2;rep++){let pos=rep*5;for(const item of rhythm.beats){const d=typeof item==='number'?item:item.d;if(!(typeof item==='object'&&item.rest)){this.tone(780,start+pos*beat,.065,.65,'triangle',true);this.tone(1520,start+pos*beat,.045,.2,'sine',true);}pos+=d;}}length=9*beat+.3;}
    else if(sound?.type==='melody'){sound.notes.forEach((note,i)=>{const f=440*2**((note-69)/12);this.tone(f,start+i*beat,beat*.8,.38,'sine',true);this.tone(f*3,start+i*beat,.12,.08,'sine',true);});length=sound.notes.length*beat+.4;}
    else{this.stopMusic();return;}
    this.musicTimer=setTimeout(()=>this.stopMusic(),length*1000);
  }
  stopMusic(){this.musicEpoch++;clearTimeout(this.musicTimer);this.musicTimer=null;if(this.music){this.music.onended=null;this.music.onerror=null;this.music.onloadedmetadata=null;this.music.ontimeupdate=null;this.music.pause();this.music.src='';this.music=null;}for(const o of [...this.nodes])if(o._music){try{o.stop();}catch{}}const done=this.onEnd;this.onEnd=null;done?.();}
  stopAll(){this.stopMusic();this.stopEffects();}
}
