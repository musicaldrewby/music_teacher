(function(root){
'use strict';
let serial=0;
const uid=()=>`n${Date.now().toString(36)}${(++serial).toString(36)}`;
const KEYS={C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6};
const LETTERS=['c','d','e','f','g','a','b'], SEMI=[0,2,4,5,7,9,11];
const clone=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({id:uid(),tracks:[[],[]],bar:'single'});
const fresh=()=>({format:'music-sketchbook',version:1,title:'Untitled idea',composer:'',staff:'treble',key:'C',meter:'4/4',tempo:100,measures:Array.from({length:4},blank)});
const ticks=e=>32/e.duration*(e.dot?1.5:1);
const capacity=s=>{let [n,d]=s.meter.split('/').map(Number);return n*32/d};
const used=(s,m,t)=>s.measures[m].tracks[t].reduce((a,e)=>a+ticks(e),0);
const splitTicks=n=>{let out=[];for(const d of [1,2,4,8,16,32])for(const dot of [true,false]){let k=ticks({duration:d,dot});while(n>=k){out.push({duration:d,dot});n-=k}}if(n!==0)throw Error('This rhythm cannot be divided into supported values.');return out};
function keyAlter(key,step){let count=KEYS[key],letter=LETTERS[((step%7)+7)%7];let order=count>0?'fcgdaeb':'beadgcf';return order.slice(0,Math.abs(count)).includes(letter)?Math.sign(count):0}
function alteration(s,m,t,i,p){let alt=keyAlter(s.key,p.step);for(let j=0;j<=i;j++){for(const q of s.measures[m].tracks[t][j]?.pitches||[])if(q.step===p.step&&q.acc!==null)alt=q.acc==='#'?1:q.acc==='b'?-1:0}return alt}
function midi(s,m,t,i,p){return (Math.floor(p.step/7)+1)*12+SEMI[((p.step%7)+7)%7]+alteration(s,m,t,i,p)}
const pitchName=p=>LETTERS[((p.step%7)+7)%7].toUpperCase()+(p.acc==='#'?'♯':p.acc==='b'?'♭':p.acc==='n'?'♮':'')+Math.floor(p.step/7);
function next(s,m,t,i){if(i+1<s.measures[m].tracks[t].length)return {m,t,i:i+1};if(m+1<s.measures.length&&s.measures[m+1].tracks[t].length)return {m:m+1,t,i:0};return null}
function samePitch(s,a,b){let x=s.measures[a.m].tracks[a.t][a.i],y=s.measures[b.m].tracks[b.t][b.i];if(x.rest||y.rest||x.pitches.length!==y.pitches.length)return false;return x.pitches.every((p,j)=>midi(s,a.m,a.t,a.i,p)===midi(s,b.m,b.t,b.i,y.pitches[j]))}
function cleanTies(s){s.measures.forEach((m,mi)=>m.tracks.forEach((tr,t)=>tr.forEach((e,i)=>{if(e.tie){const n=next(s,mi,t,i);if(!n||!samePitch(s,{m:mi,t,i},n)||(n.m!==mi&&used(s,mi,t)!==capacity(s)))e.tie=false}})))}
function append(s,m,t,event,allowSplit=false){
 const remaining=capacity(s)-used(s,m,t),n=ticks(event);
 if(remaining<=0)throw Error('This measure is full. Choose the next measure.');
 if(n>remaining&&!allowSplit)throw Error('OVERFLOW');
 for(let extra=n-remaining,ni=m+1;extra>0;extra-=capacity(s),ni++){if(ni>=128)throw Error('This sketchbook supports up to 128 measures.');if(s.measures[ni]?.tracks[t].length)throw Error('The next measure already has notes. Add an empty measure first.');}
 const continuation=(event.pitches||[]).map(p=>{let value=p.acc===null?keyAlter(s.key,p.step):p.acc==='#'?1:p.acc==='b'?-1:0;if(p.acc===null)for(const old of s.measures[m].tracks[t])for(const q of old.pitches)if(q.step===p.step&&q.acc!==null)value=q.acc==='#'?1:q.acc==='b'?-1:0;return {...p,acc:value>0?'#':value<0?'b':'n'}});
 let left=n,mi=m;
 while(left>0){if(!s.measures[mi])s.measures.push(blank());let free=capacity(s)-used(s,mi,t),amount=Math.min(free,left);let parts=splitTicks(amount);for(let k=0;k<parts.length;k++){const e={...clone(event),...parts[k],id:uid(),tie:!event.rest&&(left>amount||k<parts.length-1)};if(mi!==m||k>0){e.lyric='';e.chord='';e.pitches=clone(continuation)}s.measures[mi].tracks[t].push(e)}left-=amount;mi++}
 return mi-1;
}
function fill(s,m,t){const n=capacity(s)-used(s,m,t);for(const spec of splitTicks(n))s.measures[m].tracks[t].push({id:uid(),...spec,rest:true,pitches:[],lyric:'',chord:'',tie:false});}
function timeline(s,from=0){
 const tracks=s.staff==='grand'?[0,1]:[0], events=[], q=60/s.tempo/8;
 for(const t of tracks){let prior=null;for(let m=from;m<s.measures.length;m++){let pos=(m-from)*capacity(s);const tr=s.measures[m].tracks[t];for(let i=0;i<tr.length;i++){let e=tr[i],dur=ticks(e)*q;const curr={m,t,i,time:pos*q,duration:dur,rest:e.rest,pitches:e.pitches.map(p=>midi(s,m,t,i,p)),id:e.id};if(prior?.tie&&prior.sound&&samePitch(s,prior.loc,{m,t,i})){prior.sound.duration+=dur;curr.silent=true;}else if(!e.rest)curr.sound=true;events.push(curr);prior={loc:{m,t,i},tie:e.tie,sound:curr.silent?prior.sound:curr.sound?curr:null};pos+=ticks(e)}if(used(s,m,t)!==capacity(s))prior=null}}
 return {events,duration:(s.measures.length-from)*capacity(s)*q};
}
function validate(raw){
 if(!raw||raw.format!=='music-sketchbook'||raw.version!==1)throw Error('Please choose a Music Sketchbook song file.');
 const s=clone(raw);if(!['treble','bass','grand'].includes(s.staff)||!Object.hasOwn(KEYS,s.key)||!['2/4','3/4','4/4','6/8'].includes(s.meter))throw Error('Unsupported song setup.');
 if(!Number.isFinite(s.tempo)||s.tempo<30||s.tempo>240)throw Error('Tempo must be between 30 and 240.');
 if(!Array.isArray(s.measures)||s.measures.length<1||s.measures.length>128)throw Error('Songs can have 1–128 measures.');
 s.title=String(s.title||'Untitled idea').slice(0,120);s.composer=String(s.composer||'').slice(0,100);
 for(const m of s.measures){m.id=uid();if(!['single','double','end'].includes(m.bar))throw Error('Invalid barline.');if(!Array.isArray(m.tracks)||m.tracks.length!==2)throw Error('Invalid staff data.');for(const tr of m.tracks){if(!Array.isArray(tr)||tr.length>128)throw Error('Invalid notes.');for(const e of tr){e.id=uid();if(![1,2,4,8,16,32].includes(e.duration)||typeof e.dot!=='boolean'||(e.duration===32&&e.dot))throw Error('Invalid note value.');if(typeof e.rest!=='boolean'||!Array.isArray(e.pitches)||e.pitches.length>8||(!e.rest&&!e.pitches.length))throw Error('Invalid note.');for(const p of e.pitches)if(!Number.isInteger(p.step)||p.step<14||p.step>48||![null,'#','b','n'].includes(p.acc))throw Error('Invalid pitch.');e.lyric=String(e.lyric||'').slice(0,40);e.chord=String(e.chord||'').slice(0,20);e.tie=!!e.tie;}if(tr.reduce((a,e)=>a+ticks(e),0)>capacity(s))throw Error('A measure contains too many beats.');}}
 cleanTies(s);return s;
}
root.SketchModel={uid,KEYS,LETTERS,clone,blank,fresh,ticks,capacity,used,splitTicks,keyAlter,alteration,midi,pitchName,next,samePitch,cleanTies,append,fill,timeline,validate};
if(typeof module!=='undefined')module.exports=root.SketchModel;
})(typeof window!=='undefined'?window:globalThis);
