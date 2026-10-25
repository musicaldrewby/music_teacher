import {newProject,newSlide,RHYTHMS} from '../dist/core.js';
const make=(question,answers,correct=0,extra={})=>Object.assign(newSlide(),{question,corners:answers.map((a,i)=>({text:typeof a==='string'?a:a.text||'',image:'',graphic:typeof a==='object'?a.graphic||null:null,isCorrect:i===correct}))},extra);
const instrument=(name)=>({text:name[0].toUpperCase()+name.slice(1),graphic:{kind:'instrument',value:name}});
const rhythm=id=>({text:'',graphic:{kind:'rhythm',value:id}});
const note=value=>({text:'',graphic:{kind:'note',value}});
export const TEMPLATES=[
  {id:'instruments',title:'Instrument families',subtitle:'Pictures · 6 rounds',icon:'music',color:'blue'},
  {id:'rhythms',title:'Rhythm detective',subtitle:'Listen & move · 8 rounds',icon:'headphones',color:'gold'},
  {id:'notes',title:'Note finder',subtitle:'Treble clef · 6 rounds',icon:'note',color:'mint'},
  {id:'lucky',title:'Lucky corners',subtitle:'Random selection · 12 rounds',icon:'shuffle',color:'violet'}
];
export function template(id){const p=newProject();
 if(id==='instruments'){p.name='Instrument Families';p.slides=[
 make('Which instrument belongs to the woodwind family?',['trumpet','clarinet','violin','timpani'].map(instrument),1,{explanation:'A clarinet makes sound with a vibrating single reed.'}),
 make('Which instrument belongs to the brass family?',['flute','guitar','trumpet','xylophone'].map(instrument),2,{explanation:'A trumpet player vibrates their lips into a mouthpiece.'}),
 make('Which instrument is played with a bow?',['violin','drum','clarinet','timpani'].map(instrument),0,{explanation:'Violin strings can be bowed or plucked.'}),
 make('Which instrument has wooden bars?',['trumpet','flute','timpani','xylophone'].map(instrument),3,{explanation:'Xylophone bars are made of wood.'}),
 make('Which instrument is a woodwind without a reed?',['clarinet','flute','guitar','drum'].map(instrument),1,{explanation:'A flute player blows air across an opening.'}),
 make('Which instrument has six strings in its standard form?',['timpani','violin','guitar','trumpet'].map(instrument),2,{explanation:'A standard guitar has six strings. A violin has four.'})];}
 if(id==='rhythms'){p.name='Rhythm Detective';p.slides=RHYTHMS.map((r,i)=>{const indices=[i,(i+2)%8,(i+4)%8,(i+6)%8];const offset=i%4;const ordered=[...indices.slice(offset),...indices.slice(0,offset)];return make('Which rhythm did you hear?',ordered.map(n=>rhythm(RHYTHMS[n].id)),ordered.indexOf(i),{centerType:'audio',sound:{type:'rhythm',pattern:r.id,tempo:100},explanation:r.name+'. Clap it together!'});});}
 if(id==='notes'){p.name='Note Finder';const choices=[['E4','G4','B4','D5'],['F4','A4','C5','E5'],['C4','D4','F4','A4'],['G4','B4','D5','F5'],['E4','A4','C5','G5'],['D4','G4','C5','E5']];const names=['G','C','middle C','F','A','E'];const wins=[1,2,0,3,1,3];p.slides=choices.map((c,i)=>make(`Find ${names[i]} on the treble staff.`,c.map(note),wins[i],{explanation:`The answer is ${c[wins[i]].replace(/\d/,'')}.`}));}
 if(id==='lucky'){p.name='Lucky Corners';p.rules='out';p.slides=Array.from({length:12},()=>make('Choose your corner!',['','','',''],0,{mode:'roulette',explanation:'Move again for the next round!'}));}
 return p;
}
