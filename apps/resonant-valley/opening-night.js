import {sleeveFor,validSleeve,drawSleeve} from './record-sleeve.js';
import {drawOpeningPoster} from './opening-art.js';
const el=id=>document.getElementById(id);
const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
export function openingState(raw={}){
 const b=raw?.bill,valid=b&&Array.isArray(b.records)&&b.records.length===3&&b.records.every(r=>r&&validSleeve(r.sleeve))&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&Number.isFinite(Date.parse(b.date));
 return {artist:clean(raw?.artist,32),venue:clean(raw?.venue,44),firstSpin:raw?.firstSpin===true,
  bill:valid?{artist:clean(b.artist,32),venue:clean(b.venue,44),date:b.date,records:b.records.map(r=>({title:clean(r.title,70),sleeve:r.sleeve}))}:null};
}
export function audibleScore(song){
 const solo=song.tracks.some(t=>t.solo);
 return song.tracks.some(t=>t.instrument&&!t.mute&&(!solo||t.solo)&&t.volume>0&&t.notes.some(n=>n.s<song.bars*16&&(t.instrument!=='drums'||t.pads?.[n.p])));
}
export function originalSet(crate,records,prepare){
 const byId=new Map(records.map(r=>[r.id,r])),seen=new Set(),set=[];
 for(const id of crate?.recordIds||[]){
  const r=byId.get(id);if(!r||r.edition)continue;
  const song=prepare(r.song);if(!audibleScore(song))continue;
  const solo=song.tracks.some(t=>t.solo);
  const parts=song.tracks.filter(t=>t.instrument&&!t.mute&&(!solo||t.solo)&&t.volume>0).map(t=>[t.instrument,
   t.notes.filter(n=>n.s<song.bars*16&&(t.instrument!=='drums'||t.pads?.[n.p])).map(n=>[n.s,t.instrument==='drums'?t.pads[n.p]:n.p,n.d,n.v]).sort((a,b)=>a[0]-b[0]||String(a[1]).localeCompare(String(b[1])))]).filter(t=>t[1].length);
  
  const fingerprint=JSON.stringify([song.bpm,song.bars,parts]);if(seen.has(fingerprint))continue;
  seen.add(fingerprint);set.push(r);if(set.length===3)break;
 }
 return set;
}
export function openingBill(artist,venue,set,now=new Date()){
 const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 return {artist:clean(artist,32),venue:clean(venue,44),date,records:set.map(r=>({title:r.song.title,sleeve:sleeveFor(r)}))};
}
export class OpeningNightUI{
 constructor(a){
  this.a=a;this.selected=null;
  el('gig-crate').onchange=e=>{this.selected=e.target.value;this.refresh();};
  for(const [id,key] of [['gig-artist','artist'],['gig-venue','venue']])el(id).oninput=e=>{a.state()[key]=e.target.value.slice(0,key==='artist'?32:44);a.save();this.refresh();};
  el('gig-go').onclick=()=>{const {crate,player,set,near}=this.program();if(!crate||!player||!near||set.length!==3||!set.some(r=>r.painted))return;
   const s=a.state();a.start({crate,player,set,bill:openingBill(s.artist,s.venue,set)});this.refresh();};
  el('gig-stop').onclick=()=>{a.stop();this.refresh();};
  el('gig-png').onclick=()=>el('gig-print').toBlob(blob=>{if(blob)a.download(blob,'Opening Night - '+a.state().bill.venue+'.png');},'image/png');
  el('gig-crate-open').onclick=()=>{const {crate}=this.program();if(crate)a.browse(crate);};
 }
 program(){
  const w=this.a.world(),pos=w.camera.position,dist=e=>Math.hypot(e.x+.5-pos.x,e.y+.5-pos.y,e.z+.5-pos.z);
  const crates=w.entities.filter(e=>e.type==='crate').sort((a,b)=>dist(a)-dist(b)),crate=crates.find(c=>c.id===this.selected)||crates[0];
  return {crates,crate,near:!!crate&&dist(crate)<=10,player:crate?w.nearestRecordPlayer(crate,8):null,set:originalSet(crate,this.a.records(),this.a.prepare)};
 }
 open(crate){this.selected=crate?.id||null;const s=this.a.state();el('gig-artist').value=s.artist;el('gig-venue').value=s.venue;this.refresh();}
 refresh(){
  const a=this.a,s=a.state(),{crates,crate,near,player,set}=this.program(),run=a.running();
  el('gig-crate').replaceChildren(...crates.map(c=>new Option('Crate at '+c.x+', '+c.y+', '+c.z,c.id)));if(crate)el('gig-crate').value=crate.id;else el('gig-crate').add(new Option('Place a record crate first',''));el('gig-crate').disabled=!crate||!!run;
  el('gig-crate-open').disabled=!crate||!near;el('gig-artist').disabled=el('gig-venue').disabled=!!run;
  const originals=a.records().filter(r=>!r.edition&&audibleScore(a.prepare(r.song)));
  const steps=[['Find an instrument',a.found()],['Press an original record',!!originals.length],['Design a record sleeve',originals.some(r=>r.painted)],['Spin a record on a player',s.firstSpin]];
  el('gig-checks').replaceChildren(...steps.map(([txt,done])=>{const li=document.createElement('li');li.dataset.done=String(done);li.textContent=(done?'✓  ':'□  ')+txt;return li;}));
  el('gig-set').replaceChildren(...Array.from({length:3},(_,i)=>{const li=document.createElement('li'),r=set[i];if(r){const c=document.createElement('canvas');drawSleeve(c,sleeveFor(r));li.append(c);}const n=document.createElement('span');n.textContent=r?r.song.title:'Empty slot';li.append(n);return li;}));
  const ready=a.found()&&set.length===3&&set.some(r=>r.painted)&&player&&near&&s.artist.trim()&&s.venue.trim();
  el('gig-note').textContent=run?'On the turntable · '+run.index+' of 3':!crate?'Craft a record crate from four wood boards and place it near a record player.':!near?'Walk to this crate to host a listening session.':!player?'Place a record player within eight blocks of this crate.':set.length<3?'File three different original pieces in this crate. A one-note groove counts.':!set.some(r=>r.painted)?'Design a sleeve for one of the records on tonight’s bill.':!s.artist.trim()||!s.venue.trim()?'Choose your stage name and name this listening room.':'Your three records are ready to play in order.';
  el('gig-go').disabled=!ready||!!run;el('gig-go').textContent=s.bill?'Play another set':'Open the doors';el('gig-stop').hidden=!run;
  el('gig-souvenir').hidden=!s.bill;if(s.bill&&this.drawn!==s.bill){this.drawn=s.bill;drawOpeningPoster(el('gig-print'),s.bill);}
 }
}
