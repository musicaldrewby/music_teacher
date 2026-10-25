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
 make('soprano-glockenspiel','Soprano glockenspiel','glockenspiels','glockenspiel',84,'bars'),
 make('soprano-recorder','Soprano recorder','recorders','recorder',72,'recorder'),
 make('hand-drums','Hand drums','drums','drum',0,'handdrums',{pads:[['Lowest',41],['Low',43],['Middle',45],['High',47],['Highest',50]]}),
 make('triangle','Triangle','percussion','drum',0,'triangle',{pads:[['Open',81],['Muted',80]]}),
 make('woodblock','Woodblock','percussion','drum',0,'woodblock',{pads:[['Low',77],['High',76]]}),
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
