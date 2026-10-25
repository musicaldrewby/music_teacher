export const COLORS=['#bd7950','#66846f','#b6a05e','#7c82a2','#bb7183','#67a0a0','#b98a49'];
export const ZONES=[
 {id:'xylophones',name:'Xylophones',detail:'Warm wooden voices',icon:'▥',x:23,y:76,color:COLORS[0]},
 {id:'metallophones',name:'Metallophones',detail:'Soft, ringing metal',icon:'▥',x:74,y:76,color:COLORS[1]},
 {id:'glockenspiels',name:'Glockenspiels',detail:'Small, bright bells',icon:'✦',x:47,y:32,color:COLORS[2]},
 {id:'bassbars',name:'Bass bars',detail:'A deep foundation',icon:'▰',x:15,y:46,color:COLORS[3]},
 {id:'recorders',name:'Recorders',detail:'Sopranino · soprano · alto · tenor · bass',icon:'♮',x:18,y:19,color:COLORS[4]},
 {id:'drums',name:'Drums & blocks',detail:'Hands, mallets & rhythm',icon:'◉',x:76,y:37,color:COLORS[5]},
 {id:'percussion',name:'Small percussion',detail:'Shake, scrape & strike',icon:'✧',x:91,y:48,color:COLORS[6]}
];
const make=(id,name,zone,family,base,shape,extra={})=>({id,name,zone,family,base,shape,...extra});
export const INSTRUMENTS=[
 make('bass-xylophone','Bass xylophone','xylophones','marimba',48,'bars'),
 make('alto-xylophone','Alto xylophone','xylophones','marimba',60,'bars'),
 make('soprano-xylophone','Soprano xylophone','xylophones','marimba',72,'bars'),
 make('bass-metallophone','Bass metallophone','metallophones','vibraphone',48,'bars'),
 make('alto-metallophone','Alto metallophone','metallophones','vibraphone',60,'bars'),
 make('soprano-metallophone','Soprano metallophone','metallophones','vibraphone',72,'bars'),
 make('alto-glockenspiel','Alto glockenspiel','glockenspiels','glockenspiel',72,'bars'),
 make('soprano-glockenspiel','Soprano glockenspiel','glockenspiels','glockenspiel',84,'bars'),
 make('bass-bars','Contrabass bars','bassbars','marimba',36,'bassbars'),
 make('sopranino-recorder','Sopranino recorder','recorders','recorder',77,'recorder'),
 make('soprano-recorder','Soprano recorder','recorders','recorder',72,'recorder'),
 make('alto-recorder','Alto recorder','recorders','recorder',65,'recorder'),
 make('tenor-recorder','Tenor recorder','recorders','recorder',60,'recorder'),
 make('bass-recorder','Bass recorder','recorders','recorder',53,'recorder'),
 make('bongos','Bongos','drums','drum',0,'bongos',{pads:[['Low',61],['High',60]]}),
 make('hand-drums','Hand drums','drums','drum',0,'handdrums',{pads:[['Lowest',41],['Low',43],['Middle',45],['High',47],['Highest',50]]}),
 make('tubanos','Tubanos','drums','drum',0,'tubanos',{pads:[['Low',64],['Medium',63],['High',62]]}),
 make('temple-blocks','Temple blocks','drums','drum',0,'temple',{pads:[['1 · low',77,-4],['2',77,0],['3',76,-2],['4',76,2],['5 · high',76,5]]}),
 make('timpani','Timpani','drums','timpani',36,'timpani'),
 make('castanets','Castanets','percussion','drum',0,'castanets',{pads:[['Stroke 1',85],['Stroke 2',86]]}),
 make('side-drum','Side drum','drums','drum',0,'side-drum',{pads:[['Stroke 1',38],['Stroke 2',40]]}),
 make('triangle','Triangle','percussion','drum',0,'triangle',{pads:[['Open',81],['Muted',80]]}),
 make('sleigh-bells','Sleigh bells','percussion','drum',0,'sleigh',{pads:[['Hit',83],['Shake',84]]}),
 make('guiro','Güiro','percussion','drum',0,'guiro',{pads:[['Short scrape',73],['Long scrape',74]]}),
 make('claves','Claves','percussion','drum',0,'claves',{pads:[['Tap',75]]}),
 make('tambourine','Tambourine','percussion','drum',0,'tambourine',{pads:[['Hit',54],['Shake',55]]}),
 make('shakers','Shakers','percussion','drum',0,'shakers',{pads:[['Short shake',82],['Long shake',83]]}),
 make('woodblock','Woodblock','percussion','drum',0,'woodblock',{pads:[['Low',77],['High',76]]}),
 make('maracas','Maracas','percussion','drum',0,'maracas',{pads:[['Short shake',70],['Long shake',71]]}),
 make('cabasa','Cabasa','percussion','drum',0,'cabasa',{pads:[['Soft rub',69],['Strong rub',70]]}),
 make('finger-cymbals','Finger cymbals','percussion','drum',0,'finger',{pads:[['Chime',53]]}),
 make('suspended-cymbal','Suspended cymbal','percussion','drum',0,'cymbal',{pads:[['Strike',49],['Soft strike',49,0,.45]]}),
 make('cowbell','Cowbell','percussion','drum',0,'cowbell',{pads:[['Open',56],['Muted',57]]}),
 make('agogo-bells','Agogô bells','percussion','drum',0,'agogo',{pads:[['Low',68],['High',67]]}),
 make('slapstick','Slapstick','percussion','drum',0,'slapstick',{pads:[['Clap',28]]}),
 make('rhythm-sticks','Rhythm sticks','percussion','drum',0,'sticks',{pads:[['Tap',31]]}),
 make('vibraslap','Vibraslap','percussion','drum',0,'vibraslap',{pads:[['Rattle',58]]}),
 make('gong','Gong','percussion','drum',0,'gong',{pads:[['Strike',52]]}),
 make('wind-chimes','Wind chimes','percussion','drum',0,'chimes',{pads:[['Down · brisk',84],['Down · slow',85],['Up · brisk',86],['Up · medium',87],['Up · slow',88]]})
];
export const byId=id=>INSTRUMENTS.find(i=>i.id===id);
export const zoneById=id=>ZONES.find(i=>i.id===id);
export const DIATONIC=[0,2,4,5,7,9,11,12,14,16,17,19,21];
export const noteName=n=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][n%12]+(Math.floor(n/12)-1);
export function notesFor(inst,key='C',pentatonic=false){
 if(inst.pads)return inst.pads.map(([label,note,shift=0,velocity=1],index)=>({label,note,shift,velocity,index,enabled:true}));
 const offsets=inst.shape==='recorder'?Array.from({length:25},(_,i)=>i):inst.shape==='bassbars'?[0,2,4,5,7,9,11,12]:DIATONIC;
 return offsets.map((o,index)=>{let note=inst.base+o; const pc=note%12;if(inst.shape!=='recorder'){if(['G','Bb+F#'].includes(key)&&pc===5)note++;if(['F','Bb+F#'].includes(key)&&pc===11)note--;}
 return {note,label:noteName(note),index,shift:0,velocity:1,enabled:!pentatonic||inst.shape==='recorder'||[0,2,4,7,9].includes(((note-({C:0,F:5,G:7,'Bb+F#':0}[key]))%12+12)%12)};});
}
export function loopBeats(song){const [n,d]=song.meter.split('/').map(Number);return song.bars*n*4/d;}
export function beatsPerBar(song){const [n,d]=song.meter.split('/').map(Number);return n*4/d;}
export const emptySong=()=>({format:'mr-drews-orff-studio',version:1,title:'Untitled session',bpm:100,meter:'4/4',bars:2,key:'C',tracks:[],samples:{},updatedAt:Date.now()});
export function validateSong(s){
 if(!s||s.format!=='mr-drews-orff-studio'||s.version!==1)throw Error('Choose a Mallet & Measure song file.');
 if(!Number.isFinite(s.bpm)||s.bpm<30||s.bpm>240||!['2/4','3/4','4/4','6/8'].includes(s.meter)||![2,4,8,16].includes(s.bars))throw Error('This song has invalid tempo or measure settings.');
 if(!Array.isArray(s.tracks)||s.tracks.length>64)throw Error('This song has an invalid track list.');
 const copy=structuredClone(s);copy.title=String(s.title||'Imported song').slice(0,100);copy.samples=s.samples&&typeof s.samples==='object'?s.samples:{};
 if(Object.keys(copy.samples).length>64||Object.entries(copy.samples).some(([id,v])=>!byId(id)||!v||typeof v.data!=='string'||!v.data.startsWith('data:audio/')||v.data.length>16000000))throw Error('This song has invalid custom samples.');
 for(const t of copy.tracks){if(!byId(t.instrument)||!Array.isArray(t.events)||t.events.length>30000)throw Error('This song contains an unsupported instrument or too many notes.');t.muted=!!t.muted;
 for(const e of t.events){if(![e.beat,e.duration,e.note,e.velocity??.8,e.shift??0].every(Number.isFinite)||e.beat<0||e.beat>=loopBeats(s)||e.duration<=0||e.duration>128||e.note<0||e.note>127||!Number.isInteger(e.note)||Math.abs(e.shift??0)>48)throw Error('This song contains an invalid note.');if(e.score){const q=e.score;if(![q.beat,q.duration,q.note,q.shift??0].every(Number.isFinite)||q.beat<0||q.beat>=loopBeats(s)||q.duration<.25||q.duration>128||Math.abs(q.beat*4-Math.round(q.beat*4))>.00001||Math.abs(q.duration*4-Math.round(q.duration*4))>.00001||!Number.isInteger(q.note)||q.note<0||q.note>127||Math.abs(q.shift??0)>48)throw Error('This song contains an invalid notation edit.');}delete e._liveCycle;}}
 if(!['C','F','G','Bb+F#'].includes(copy.key))throw Error('This song has an invalid key.');
 if(s.ensemble!==undefined){if(!Array.isArray(s.ensemble)||s.ensemble.length>64||s.ensemble.some(id=>!byId(id)))throw Error('This song has an invalid ensemble.');copy.ensemble=[...new Set(s.ensemble)];}
 if(s.patterns!==undefined){
  if(!Array.isArray(s.patterns)||!s.patterns.length||s.patterns.length>64)throw Error('This song has an invalid pattern collection.');
  const ids=new Set();let count=0;
  copy.patterns=s.patterns.map(p=>{if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id))throw Error('This song has invalid pattern identifiers.');ids.add(p.id);
   const checked=validateSong({format:s.format,version:1,title:p.name,bpm:p.bpm,meter:p.meter,bars:p.bars,key:p.key,tracks:p.tracks,samples:{}});
   count+=checked.tracks.reduce((n,t)=>n+t.events.length,0);if(count>300000)throw Error('This pattern collection has too many notes.');
   return {id:p.id,name:String(p.name||'Untitled pattern').slice(0,80),bpm:checked.bpm,meter:checked.meter,bars:checked.bars,key:checked.key,tracks:checked.tracks};});
  if(!ids.has(s.activePattern))throw Error('This song has an invalid active pattern.');
 }
 if(s.notationGrid!==undefined&&![.25,.5,1].includes(s.notationGrid))throw Error('Invalid notation rhythm grid.');
 if(s.arrangement!==undefined){if(!Array.isArray(s.arrangement)||s.arrangement.length>64||s.arrangement.some(e=>!copy.patterns?.some(p=>p.id===e.pattern)||!Number.isInteger(e.repeats)||e.repeats<1||e.repeats>16))throw Error('This song has an invalid arrangement.');copy.arrangement=s.arrangement.map(e=>({pattern:e.pattern,repeats:e.repeats}));}
 return copy;
}
export function quantizeTracks(tracks,step,total){if(!step)return tracks;for(const t of tracks)for(const e of t.events){e.beat=Math.min(total-step,Math.max(0,Math.round(e.beat/step)*step));e.duration=Math.min(total-e.beat,Math.max(step,Math.round(e.duration/step)*step));}return tracks;}
const vlq=n=>{n=Math.max(0,Math.round(n));const out=[n&127];while(n>>=7)out.unshift((n&127)|128);return out;};
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
const u16=n=>[(n>>8)&255,n&255];
const bytes=s=>[...new TextEncoder().encode(s)];
const chunk=(tag,b)=>[...bytes(tag),...u32(b.length),...b];
export function exportMidi(song){
 const ppq=480,tempo=Math.round(60000000/song.bpm),[num,den]=song.meter.split('/').map(Number);
 const meta=[0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255,0,255,88,4,num,Math.log2(den),24,8,0,255,47,0];
 const programs={marimba:12,vibraphone:11,glockenspiel:9,timpani:47,recorder:74,gong:14};let channel=0;
 const tracks=song.tracks.filter(t=>!t.muted&&t.events.length).map(t=>{
 const inst=byId(t.instrument),drum=inst.family==='drum',ch=drum?9:(channel++%15>=9?((channel-1)%15)+1:(channel-1)%15);const name=bytes(t.name||inst.name);const prefix=[0,255,3,...vlq(name.length),...name];if(!drum)prefix.push(0,0xC0|ch,programs[inst.family]??12);
 const events=t.events.flatMap(e=>{const start=Math.round(e.beat*ppq),end=Math.max(start+1,Math.min(Math.round(loopBeats(song)*ppq),Math.round((e.beat+e.duration)*ppq)));const note=Math.max(0,Math.min(127,e.note+(drum?0:Math.round(e.shift??0))));return [{tick:start,data:[0x90|ch,note,Math.max(1,Math.min(127,Math.round((e.velocity??.8)*110)))]},{tick:end,data:[0x80|ch,note,0]}];}).sort((a,b)=>a.tick-b.tick||(a.data[0]&0xf0)-(b.data[0]&0xf0));
 let prev=0;for(const e of events){prefix.push(...vlq(e.tick-prev),...e.data);prev=e.tick;}prefix.push(...vlq(Math.max(0,Math.round(loopBeats(song)*ppq)-prev)),255,47,0);return chunk('MTrk',prefix);
 });return new Uint8Array([...chunk('MThd',[...u16(1),...u16(tracks.length+1),...u16(ppq)]),...chunk('MTrk',meta),...tracks.flat()]);
}
