export function meadow(){
 const tracks=[{name:'Marimba',program:13,volume:.84,pan:-.12,notes:[]},{name:'Warm strings',program:49,volume:.37,pan:.15,notes:[]},{name:'Acoustic bass',program:33,volume:.64,pan:0,notes:[]},{name:'Soft percussion',program:1,drums:true,volume:.38,pan:.08,reverbSend:.18,notes:[]}];
 const chords=[[48,52,55],[45,48,52],[53,57,60],[55,59,62],[48,52,55],[45,48,52],[53,57,60],[55,59,62],[52,55,59],[53,57,60],[55,59,62],[48,52,55]];
 const tunes=[[76,79,81,79],[76,72,74,76],[77,81,79,77],[74,71,74,79],[76,79,84,83],[81,79,76,72],[77,76,74,72],[74,79,83,79],[79,76,74,71],[72,77,81,79],[74,79,83,79],[84,79,76,72]];
 for(let bar=0;bar<12;bar++){const b=bar*4,c=chords[bar],dynamic=bar<8?68+bar*2:84-(bar-8)*7;
  for(let i=0;i<4;i++)tracks[0].notes.push({note:tunes[bar][i],beat:b+i,duration:bar===11&&i===3?1:.75,velocity:dynamic+(i===0?7:0)});
  for(let i=0;i<4;i++)tracks[0].notes.push({note:c[(i+1)%3]+12,beat:b+i+.5,duration:.3,velocity:dynamic-20});
  for(const n of c)tracks[1].notes.push({note:n+12,beat:b,duration:3.9,velocity:bar<4?47:57});
  tracks[2].notes.push({note:c[0]-12,beat:b,duration:1.6,velocity:66},{note:c[2]-12,beat:b+2,duration:1.4,velocity:57});
  if(bar<11){for(let i=0;i<8;i++)tracks[3].notes.push({note:82,beat:b+i*.5,duration:.15,velocity:i%2?25:34});for(const i of [1,3])tracks[3].notes.push({note:37,beat:b+i,duration:.15,velocity:38});}
 }
 return {format:'drews-music-engine',version:1,title:'First Light in the Meadow',description:'An original marimba miniature with strings, bass, and soft percussion.',tempo:96,tracks};
}
export function piano(){const song={format:'drews-music-engine',version:1,title:'A Quiet Page',description:'A gentle piano sketch with room to breathe.',tempo:78,tracks:[{name:'Stereo grand piano',program:1,volume:.82,notes:[]}]};const t=song.tracks[0];for(let b=0;b<8;b++){const c=[[48,52,55],[45,48,52],[53,57,60],[55,59,62]][b%4];for(let i=0;i<8;i++)t.notes.push({note:c[i%3]+(i%4>1?12:0),beat:b*4+i*.5,duration:.85,velocity:47+(i%3)*6});t.notes.push({note:[76,72,77,74,79,76,77,72][b],beat:b*4,duration:3.5,velocity:75});}return song;}
export function groove(){const s=meadow();s.title='Pocket Marimba';s.description='A bright, syncopated marimba groove with bass and percussion.';s.tempo=118;s.tracks=s.tracks.filter(t=>t.name!=='Warm strings');for(const n of s.tracks[0].notes){n.beat+=n.beat%1===.5?.18:0;n.velocity=Math.min(110,n.velocity+8);}return s;}
export const examples={meadow,piano,groove};
