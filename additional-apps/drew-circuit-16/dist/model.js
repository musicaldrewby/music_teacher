import {DRUM_MAP} from './drum-map.js';
export const SCALE = {minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],pentatonic:[0,3,5,7,10],chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]};
export const NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
export const DRUMS=[['Kick',36],['Snare',38],['Closed hat',42],['Open hat',46],['Shaker',82],['Low tom',45],['Clap',39],['Ride',51]];
export function drumSound(kit,note){return DRUM_MAP[kit]?.notes[note]||null;}
export function drumName(kit,note){return drumSound(kit,note)?.name||`Key ${note}`;}
export const clone=x=>JSON.parse(JSON.stringify(x));
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
// SoundFont amplitude is roughly velocity-squared: preserve a usable lane-level range.
export function drumVelocity(volume,evolution=0,random=.5){return Math.round(clamp(127*Math.sqrt(clamp(volume,0,1))*(1+evolution*(random-.5)*.5),0,127));}
export function drumStatus(p){const mix=p.mix[4],d=p.patterns[p.activePattern].drums;
 if(p.master===0)return 'Master volume is at zero.';
 if(mix.mute)return 'Drums are muted — turn off M to hear them.';
 if(p.mix.some(m=>m.solo)&&!mix.solo)return 'Another part is soloed — turn off its S or solo DRUM.';
 if(mix.volume===0)return 'Drum level is at zero — raise LEVEL.';
 const active=d.lanes.filter(l=>l.on.slice(0,d.length).some(Boolean));
 if(!active.length)return 'No drum steps are on in this pattern. Tap squares to add hits.';
 if(!active.some(l=>l.volume>0))return 'Active drum lanes are at zero — raise their row sliders.';
 return '';
}
export const noteName=n=>NAMES[((n%12)+12)%12]+(Math.floor(n/12)-1);
export function snap(n,root,scale){let best=n,dist=100;for(let k=0;k<=127;k++){if(SCALE[scale].includes((k-root+120)%12)&&Math.abs(k-n)<dist){best=k;dist=Math.abs(k-n);}}return best;}
export function stepIndex(n,len,dir){if(len<=1)return 0;if(dir==='reverse')return len-1-(n%len);if(dir==='pendulum'){let k=n%(2*len-2);return k<len?k:2*len-2-k;}return n%len;}
export function parseChain(text){const parts=String(text).toUpperCase().trim().split(/[\s,→]+/).filter(Boolean);if(!parts.length||parts.length>64)throw Error('Use a chain such as A:4 B:4 C:8.');return parts.map(p=>{const m=p.match(/^([A-H])(?::([1-9]\d?))?$/);if(!m)throw Error('Use letters A–H and bar counts, for example A:4 B:4.');return {pattern:m[1].charCodeAt(0)-65,bars:Number(m[2]||4)};});}
function seq(program,notes,length,rate,volume=.55){return {program,bank:0,source:'soundfont',length,rate,direction:'forward',chord:'single',octave:0,notes:Array.from({length:16},(_,i)=>notes[i%notes.length]),on:Array(16).fill(true),velocity:Array(16).fill(85),gates:Array(16).fill(.6),chance:Array(16).fill(1),ratchet:Array(16).fill(1),tie:Array(16).fill(false),volume};}
export const PRESETS=[
 {name:'Amber Current',detail:'Interlocking pulses · D minor · 92 BPM',tempo:92,root:2,scale:'minor',sounds:[81,12,98,89],lengths:[16,7,12,8],rates:[.25,.5,1,2],notes:[[50,57,62,65,57,62,69,65,50,57,62,65,69,62,57,53],[62,69,65,72,74,69,65],[74,81,77,86,81,77],[50,50,53,53,48,48,46,45]],cutoff:2200,rev:.46,delay:.3},
 {name:'Desert Spiral',detail:'Slowly shifting sequences · C dorian · 108 BPM',tempo:108,root:0,scale:'dorian',sounds:[80,81,11,90],lengths:[15,16,7,8],rates:[.25,.5,1,2],notes:[[48,55,60,63,67,60,55,58],[60,67,70,65,63,60,72,67],[79,75,72,82,79,75,84],[48,48,53,53,46,46,48,48]],cutoff:1700,rev:.36,delay:.4},
 {name:'Glass Observatory',detail:'Delicate bells & a soft pulse · A minor · 76 BPM',tempo:76,root:9,scale:'minor',sounds:[12,98,10,89],lengths:[12,7,15,4],rates:[.5,1,2,4],notes:[[57,64,69,72,76,72,69,64],[81,76,84,88,81,79,76],[69,76,81,84,88],[45,48,43,41]],cutoff:4800,rev:.58,delay:.44},
 {name:'Night Signal',detail:'A deeper motor pulse · E minor · 116 BPM',tempo:116,root:4,scale:'minor',sounds:[81,80,99,95],lengths:[16,5,8,8],rates:[.25,.5,1,2],notes:[[52,59,64,67,71,67,64,59],[64,71,67,74,76],[76,83,79,86],[52,50,48,47]],cutoff:1400,rev:.31,delay:.33},
 {name:'Slow Earth',detail:'Open space & warm layers · F pentatonic · 58 BPM',tempo:58,root:5,scale:'pentatonic',sounds:[89,92,98,48],lengths:[8,7,4,4],rates:[1,2,4,4],notes:[[53,60,63,65,68,65,63,60],[65,72,75,77,80,77,72],[77,84,87,89],[41,44,39,41]],cutoff:3100,rev:.65,delay:.27},
 {name:'Blank Canvas',detail:'An empty studio · D minor · 92 BPM',tempo:92,root:2,scale:'minor',sounds:[81,12,98,89],lengths:[16,16,16,16],rates:[.25,.5,1,2],notes:[[62],[62],[74],[50]],cutoff:4000,rev:.35,delay:.25}
];
export function makeProject(presetIndex=0){const p=PRESETS[presetIndex];const tracks=p.sounds.map((s,i)=>seq(s,p.notes[i],p.lengths[i],p.rates[i]));tracks[1].on=Array.from({length:16},(_,i)=>i%4!==3);tracks[2].on=Array.from({length:16},(_,i)=>[0,3,7,10].includes(i));tracks[2].chance.fill(.85);tracks[2].gates.fill(.8);tracks[3].gates.fill(.94);tracks[3].chord='fifth';
 const bass=seq(38,[p.root+36,p.root+36,p.root+36,p.root+43,p.root+36,p.root+36,p.root+46,p.root+43],8,.5);Object.assign(bass,{source:'analog',wave:'triangle',cutoff:1100,decay:.7,slide:.15,accent:.3});bass.on=Array.from({length:16},(_,i)=>[0,3,4,6].includes(i%8));bass.gates.fill(.8);
 const drums={kit:0,length:16,rate:.25,lanes:DRUMS.map(([name,note],j)=>({name,note,volume:j===0?.65:.4,on:Array.from({length:16},(_,i)=>j===0?i%8===0:j===2?[2,6,10,14].includes(i):j===4?i%4===3:j===5?i===14:false)}))};
 if(presetIndex===4){drums.lanes.forEach(l=>l.on.fill(false));bass.on=Array.from({length:16},(_,i)=>i%4===0);bass.rate=2;tracks[0].gates.fill(.95);}
 if(presetIndex===5){tracks.forEach(t=>t.on.fill(false));bass.on.fill(false);drums.lanes.forEach(l=>l.on.fill(false));}
 const pattern={tracks,bass,drums};const patterns=Array.from({length:8},(_,k)=>{const pat=clone(pattern);if(k>0){for(let i=0;i<4;i++){pat.tracks[i].notes=pat.tracks[i].notes.map((n,j)=>snap(n+(k%3===1&&j%4===0?3:k%3===2&&j%3===0?-2:0),p.root,p.scale));}pat.tracks[1].on=pat.tracks[1].on.map((v,j)=>k%2?j%3!==2:v);}return pat;});
 return {version:1,title:p.name,tempo:p.tempo,root:p.root,scale:p.scale,swing:0,master:.75,activePattern:0,songMode:false,chain:'A:4 B:4 C:4 D:4',evolution:.12,seed:20261024,fx:{cutoff:p.cutoff,resonance:.7,motion:.16,delay:p.delay,feedback:.42,reverb:p.rev,delayBeats:.75},mix:[.63,.5,.35,.45,.25,.52].map((volume,i)=>({volume,pan:[-.2,.23,-.35,.3,0,0][i],mute:false,solo:false})),patterns};}
export function validateProject(p){if(!p||p.version!==1||!Array.isArray(p.patterns)||p.patterns.length!==8)throw Error('This is not a Circuit 16 project.');const x=clone(p);x.title=String(x.title||'Untitled').slice(0,80);x.tempo=clamp(x.tempo,30,240);x.root=Math.round(clamp(x.root,0,11));if(!SCALE[x.scale])throw Error('Unknown scale.');x.swing=clamp(x.swing,0,.45);x.master=clamp(x.master,0,1);x.evolution=clamp(x.evolution,0,.5);x.activePattern=Math.round(clamp(x.activePattern,0,7));x.songMode=!!x.songMode;parseChain(x.chain);x.seed=(x.seed>>>0)||1;
 if(!x.fx||!Array.isArray(x.mix)||x.mix.length!==6)throw Error('Incomplete mixer.');for(const [k,a,b]of [['cutoff',120,18000],['resonance',.1,8],['motion',0,1],['delay',0,.8],['feedback',0,.8],['reverb',0,.8],['delayBeats',.25,2]])x.fx[k]=clamp(x.fx[k],a,b);
 x.mix.forEach(m=>{m.volume=clamp(m.volume,0,1);m.pan=clamp(m.pan,-1,1);m.mute=!!m.mute;m.solo=!!m.solo;});
 for(const pat of x.patterns){if(!pat||pat.tracks?.length!==4||pat.drums?.lanes?.length!==8||!pat.bass)throw Error('Incomplete pattern.');for(const t of [...pat.tracks,pat.bass]){t.length=Math.round(clamp(t.length,1,16));t.rate=[.125,.25,.5,1,2,4].includes(t.rate)?t.rate:.25;t.program=Math.round(clamp(t.program,0,127));t.bank=Math.round(clamp(t.bank,0,127));t.source=t.source==='analog'?'analog':'soundfont';t.direction=['forward','reverse','pendulum'].includes(t.direction)?t.direction:'forward';t.chord=['single','fifth','minor','major','sus'].includes(t.chord)?t.chord:'single';t.octave=Math.round(clamp(t.octave,-2,2));for(const k of ['notes','on','velocity','gates','chance','ratchet','tie'])if(!Array.isArray(t[k])||t[k].length!==16)throw Error('Each sequence must contain 16 steps.');t.notes=t.notes.map(v=>Math.round(clamp(v,0,127)));t.on=t.on.map(Boolean);t.tie=t.tie.map(Boolean);t.velocity=t.velocity.map(v=>Math.round(clamp(v,1,127)));t.gates=t.gates.map(v=>clamp(v,.05,1.95));t.chance=t.chance.map(v=>clamp(v,0,1));t.ratchet=t.ratchet.map(v=>Math.round(clamp(v,1,4)));}
 Object.assign(pat.bass,{cutoff:clamp(pat.bass.cutoff,80,10000),decay:clamp(pat.bass.decay,.08,3),slide:clamp(pat.bass.slide,0,1),accent:clamp(pat.bass.accent,0,1),wave:['triangle','saw','sine'].includes(pat.bass.wave)?pat.bass.wave:'triangle'});pat.drums.kit=Math.round(clamp(pat.drums.kit,0,127));pat.drums.length=Math.round(clamp(pat.drums.length,1,16));pat.drums.rate=[.125,.25,.5,1,2,4].includes(pat.drums.rate)?pat.drums.rate:.25;pat.drums.lanes.forEach((l,i)=>{if(l.on?.length!==16)throw Error('Invalid drum sequence.');l.note=Number.isFinite(l.note)?Math.round(clamp(l.note,0,127)):DRUMS[i][1];l.name=String(l.name||drumName(pat.drums.kit,l.note)).slice(0,80);l.on=l.on.map(Boolean);l.volume=clamp(l.volume,0,1);});}
 return x;}
// Write the played pitch relative to the track octave, using the studio scale.
export function writeMidiStep(project,ch,index,note,velocity,captureVelocity=false){
 const track=ch===5?project.patterns[project.activePattern].bass:project.patterns[project.activePattern].tracks[ch];
 if(!track||!Number.isInteger(index)||index<0||index>=track.length||!Number.isInteger(note)||note<0||note>127)return null;
 track.notes[index]=snap(clamp(note-track.octave*12,0,127),project.root,project.scale);
 track.on[index]=true;track.tie[index]=false;
 if(captureVelocity)track.velocity[index]=Math.round(clamp(velocity,1,127));
 return Math.round(clamp(track.notes[index]+track.octave*12,0,127));
}
export function nextMidiStep(index,length,autoAdvance){return autoAdvance?(index+1)%length:index;}
export function chordNotes(note,type,root,scale){return ({single:[0],fifth:[0,7],minor:[0,3,7],major:[0,4,7],sus:[0,5,7]}[type]||[0]).map(n=>Math.round(clamp(note+n,0,127)));}
export class Clock{
 constructor(project){this.p=clone(project);this.randomState=this.p.seed||1;this.reset();}
 reset(){this.beat=0;this.next=[0,0,0,0,0,0];this.counts=[0,0,0,0,0,0];this.positions=[-1,-1,-1,-1,-1,-1];this.pattern=this.p.songMode?parseChain(this.p.chain)[0].pattern:this.p.activePattern;this.pending=null;this.nextBar=4;this.chainIndex=0;this.chainBars=0;this.randomState=this.p.seed||1;}
 update(p){this.p=clone(p);}
 random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296;}
 queue(n){this.pending=n;}
 process(seconds){const start=this.beat,beatsPerSecond=this.p.tempo/60,end=start+seconds*beatsPerSecond,events=[];let guard=0;while(guard++<512){const next=Math.min(...this.next,this.nextBar);if(next>=end-1e-9)break;if(this.nextBar<=next+1e-9){let changed=false;if(this.pending!==null){this.pattern=this.pending;this.pending=null;changed=true;this.chainBars=0;}else if(this.p.songMode){const chain=parseChain(this.p.chain);this.chainBars++;if(this.chainBars>=chain[this.chainIndex%chain.length].bars){this.chainIndex=(this.chainIndex+1)%chain.length;this.chainBars=0;this.pattern=chain[this.chainIndex].pattern;changed=true;}}if(changed){this.next.fill(this.nextBar);this.counts.fill(0);events.push({kind:'pattern',pattern:this.pattern,time:(this.nextBar-start)/beatsPerSecond});}this.nextBar+=4;continue;}
 const pat=this.p.patterns[this.pattern];for(let ch=0;ch<6;ch++){if(this.next[ch]>next+1e-8)continue;const t=ch<4?pat.tracks[ch]:ch===4?pat.drums:pat.bass;const n=this.counts[ch],idx=stepIndex(n,t.length,t.direction),time=Math.max(0,(next-start)/beatsPerSecond),swing=t.rate<=.5?this.p.swing:0,durBeat=t.rate*(n%2?1-swing:1+swing),dur=durBeat/beatsPerSecond;this.positions[ch]=idx;events.push({kind:'step',ch,idx,time});
 if(ch===4){for(let j=0;j<t.lanes.length;j++){const l=t.lanes[j];if(l.on[idx]&&l.volume>0)events.push({kind:'note',ch,note:l.note,velocity:drumVelocity(l.volume,this.p.evolution,this.random()),time,duration:.08,source:'soundfont'});}}
 else if(t.on[idx]&&(!t.tie[idx]||n===0)&&this.random()<t.chance[idx]){const base=snap(t.notes[idx],this.p.root,this.p.scale)+t.octave*12;let duration=dur*t.gates[idx];for(let k=1;k<t.length;k++){const ni=stepIndex(n+k,t.length,t.direction);if(!t.tie[ni]||!t.on[ni])break;duration+=t.rate/beatsPerSecond;}
 const rat=t.ratchet[idx],notes=chordNotes(base,ch===5?'single':t.chord,this.p.root,this.p.scale);for(let r=0;r<rat;r++)for(const note of notes){const vel=Math.round(clamp(t.velocity[idx]*(1+this.p.evolution*(this.random()-.5)),1,127));events.push({kind:'note',ch,note,velocity:vel,time:time+r*dur/rat,duration:rat>1?Math.min(duration/rat,dur/rat*.8):duration,source:t.source,slide:ch===5?t.slide:0,accent:ch===5?t.accent:0});}}
 this.next[ch]+=durBeat;this.counts[ch]++;}}
 this.beat=end;return events;}
}
