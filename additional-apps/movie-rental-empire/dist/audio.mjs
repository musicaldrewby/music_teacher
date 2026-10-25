export class GameAudio{
 constructor(){this.enabled=false;this.music=.24;this.effects=.45;this.step=0;this.lastNote=0;this.ctx=null;this.musicTimer=null;}
 async enable(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.5;this.master.connect(this.ctx.destination);}await this.ctx.resume();this.enabled=true;if(!this.musicTimer)this.musicTimer=setInterval(()=>this.playMusic(),190);return true;}
 disable(){this.enabled=false;}
 note(freq,duration=.2,volume=.1,type='sine',delay=0){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.05);}
 fx(name){const v=this.effects*.26;if(name==='sale'){this.note(880,.13,v,'triangle');this.note(1320,.28,v,'sine',.09);}if(name==='door'){this.note(659,.4,v*.5,'sine');this.note(523,.5,v*.4,'sine',.16);}if(name==='rewind'){this.note(190,.09,v*.35,'square');this.note(260,.09,v*.25,'square',.1);}if(name==='reward'){[523,659,784,1047].forEach((n,i)=>this.note(n,.45,v,'triangle',i*.09));}if(name==='click')this.note(410,.055,v*.18,'triangle');}
 playMusic(){if(!this.enabled||!this.music)return;const chords=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]],ch=chords[Math.floor(this.step/32)%4];const hz=n=>440*2**((n-69)/12),v=this.music*.11;
  if(this.step%4===0)this.note(hz(ch[0]-12),.6,v*.8,'triangle');if(this.step%2===0)this.note(hz(ch[1+(Math.floor(this.step/2)%3)]+12),.7,v*.6,'sine');if(this.step%16===0)ch.slice(1).forEach((n,i)=>this.note(hz(n),2.7,v*.22,'triangle',i*.025));this.step++;
 }
}
