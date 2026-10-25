// Behavioral tests with a small DOM double and a deterministic audio clock.
// This checks data and playback logic; it is not a browser rendering or listening test.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const nodes=new Map(),store=new Map(),timers=new Map(),frames=new Map(),intervals=new Map();let now=0,nextId=1;
const decode=x=>x.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
function makeNode(id='',tag='DIV'){
 const attrs={},classes=new Set();let inner='';const e={id,tagName:tag.toUpperCase(),value:'',checked:false,hidden:false,disabled:false,open:false,textContent:'',dataset:{},children:[],options:[],style:{},parentNode:null,attributes:attrs,
 classList:{add(...a){a.forEach(x=>classes.add(x))},remove(...a){a.forEach(x=>classes.delete(x))},toggle(x,force){if(force===true){classes.add(x);return true}if(force===false){classes.delete(x);return false}if(classes.has(x)){classes.delete(x);return false}classes.add(x);return true},contains:x=>classes.has(x)},
 addEventListener(t,f){this['on'+t]=f},setAttribute(k,v){attrs[k]=v;if(k==='aria-label')this.ariaLabel=v},getAttribute(k){return attrs[k]},removeAttribute(k){delete attrs[k]},focus(){doc.activeElement=this},select(){},scrollIntoView(){},requestFullscreen:async()=>{},
 click(){return this.onclick?.({target:this,preventDefault(){}})},showModal(){this.open=true},close(){this.open=false},appendChild(x){this.children.push(x);x.parentNode=this},getBoundingClientRect(){return{top:0,bottom:100}},
 closest(sel){if(sel==='button')return this.tagName==='BUTTON'?this:null;const m=sel.match(/^\[([\w-]+)\]$/);if(m&&Object.hasOwn(attrs,m[1]))return this;return null},
 querySelectorAll(sel){if(sel==='span')return this.children.filter(x=>x.tagName==='SPAN');return[]},querySelector(sel){if(sel==='.stroke-caption'){if(!this._caption)this._caption=makeNode('', 'div');return this._caption}return null},
 insertAdjacentHTML(where,str){parseNodes(str,this);if(where==='afterbegin')inner=str+inner;else inner+=str;}
 };
 Object.defineProperty(e,'innerHTML',{get(){return inner},set(str){for(const child of this.children){if(child.id)nodes.delete(child.id);}inner=str;this.children=[];parseNodes(str,this);}});
 Object.defineProperty(e,'lastElementChild',{get(){return this.children.at(-1)||makeNode()}});
 if(id)nodes.set(id,e);return e;
}
function parseNodes(html,parent=null){
 const re=/<(input|select|textarea|button|div|span|label|p|output|section|dialog|h\d|aside|main|header|footer|details)\b([^>]*)>(?:([\s\S]*?)<\/\1>)?/g; // ID fields are also parsed independently below.
 const tags=/<([a-z][a-z0-9-]*)\b([^>]*)>/gi;let m;
 while((m=tags.exec(html))){const [full,tag,tail]=m,attr={};for(const a of tail.matchAll(/([\w-]+)(?:="([^"]*)")?/g))attr[a[1]]=decode(a[2]??'');
  if(!attr.id&&!attr['data-measure']&&!Object.hasOwn(attr,'data-measure')&&tag!=='span')continue;
  const e=makeNode(attr.id||'',tag);for(const[k,v]of Object.entries(attr)){e.attributes[k]=v;if(k.startsWith('data-'))e.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;}
  e.value=attr.value??'';e.checked=Object.hasOwn(attr,'checked');e.hidden=Object.hasOwn(attr,'hidden');e.disabled=Object.hasOwn(attr,'disabled');(attr.class||'').split(' ').filter(Boolean).forEach(c=>e.classList.add(c));
  if(tag==='select'){const end=html.indexOf('</select>',tags.lastIndex),part=html.slice(tags.lastIndex,end);e.options=[...part.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(o=>({value:decode(o[1].match(/value="([^"]*)"/)?.[1]??o[2]),selected:/\bselected\b/.test(o[1])}));e.value=(e.options.find(o=>o.selected)||e.options[0])?.value||'';}
  if(parent)parent.appendChild(e);
 }
}
parseNodes(fs.readFileSync(path.join(root,'dist/index.html'),'utf8'));
const el=id=>nodes.get(id)||null;const stageRow=makeNode(),body=makeNode('body');body.style={};const fakeButtons=new Map();
const doc={getElementById:el,body,hidden:false,createElement:tag=>makeNode('',tag),addEventListener(){},querySelector(sel){if(sel==='dialog[open]')return [...nodes.values()].find(x=>x.tagName==='DIALOG'&&x.open)||null;if(sel==='.stage-controls .row')return stageRow;if(sel==='.shell-progress'){if(!fakeButtons.has(sel)){const n=makeNode();n.children=Array.from({length:3},()=>makeNode('','span'));fakeButtons.set(sel,n)}return fakeButtons.get(sel)}if(sel.startsWith('[data-'))return fakeButtons.get(sel)||null;return null},querySelectorAll(sel){if(sel==='#stageBeats .beat-dot')return el('stageBeats').children.filter(x=>x.classList.contains('beat-dot'));if(sel==='#measuresGrid [data-measure]')return el('measuresGrid').children.filter(x=>Object.hasOwn(x.dataset,'measure'));if(sel==='[data-close]')return[];if(sel==='.shell-progress span')return doc.querySelector('.shell-progress').children;return[]}};
const param=()=>({value:0,setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},cancelScheduledValues(){}});
let soundEvents=0;function audioNode(){return{gain:param(),threshold:param(),ratio:param(),frequency:param(),playbackRate:param(),connect(){},disconnect(){},start(){soundEvents++},stop(){}}}
class AudioContext{constructor(){this.sampleRate=8000;this.state='running';this.destination={}}get currentTime(){return now/1000}async resume(){}async decodeAudioData(){return{length:96000,duration:3}}createGain(){return audioNode()}createDynamicsCompressor(){return audioNode()}createBuffer(ch,length,sr){const d=new Float32Array(length);return{getChannelData(){return d}}}createBufferSource(){return audioNode()}createOscillator(){return audioNode()}createBiquadFilter(){return audioNode()}}
const loc=new URL('https://test.example/');let downloads=[];const c={getComputedStyle:()=>({fontSize:'32px'}),console,Math,Map,Set,JSON,Array,Object,Number,String,Float32Array,Uint8Array,Date,Error,Infinity,AudioContext,AbortController,Blob,URL,URLSearchParams,TextEncoder,TextDecoder,location:loc,history:{replaceState(){}},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),performance:{now:()=>now},crypto:{randomUUID:()=>`test-${nextId++}`},navigator:{},document:doc,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},confirm:()=>true,prompt:()=> 'My saved test',setTimeout(fn,ms){const id=nextId++;timers.set(id,{fn,at:now+ms});return id},clearTimeout(id){timers.delete(id)},setInterval(fn,ms){const id=nextId++;intervals.set(id,{fn,ms,at:now+ms});return id},clearInterval(id){intervals.delete(id)},requestAnimationFrame(fn){const id=nextId++;frames.set(id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},addEventListener(){},matchMedia:()=>({matches:false}),fetch:async url=>{const name=new URL(url).pathname.replace(/^\//,'');const p=path.join(root,'dist',name);return{ok:fs.existsSync(p),text:async()=>fs.readFileSync(p,'utf8'),arrayBuffer:async()=>{const b=fs.readFileSync(p);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}}};c.window=c;
vm.createContext(c);for(const f of ['app.js','arrangements.js','classroom.js','soundfont.js','strum-hand.js','beach.js','boot.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',f),'utf8'),c,{filename:f});
vm.runInContext("function testStarter(title){const s=STARTERS.find(s=>s.title===title);if(!s)throw Error('Missing test song '+title);return {...s,playCount:1};}function practiceSong(){return {...testStarter('Skip to My Lou'),tempo:80};}",c);
const run=code=>vm.runInContext(code,c),checks=[];function check(name,fn){fn();checks.push(name)}
async function advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+10);for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn()}for(const t of intervals.values())if(t.at<=now){t.at=now+t.ms;t.fn()}const pending=[...frames];frames.clear();for(const[,f]of pending)f(now);await Promise.resolve();}}
async function action(data,id=''){const b=makeNode(id,'button');b.dataset=data;await el('classContent').onclick({target:b});}
module.exports={c,run,el,makeNode,advance,nodes,timers,frames,store,doc};
if(require.main===module)(async()=>{
check('The splash opens with keyboard focus on entry and no automatic playback',()=>{
 assert.equal(el('splashScreen').open,true);assert.equal(doc.activeElement,el('splashStart'));assert.equal(body.style.overflow,'hidden');assert.equal(c.UkeStrum.state.state,'stopped');assert.equal(soundEvents,0);assert.equal(el('creatorTopHeading'),null);
 assert(!fs.readFileSync(path.join(root,'dist/index.html'),'utf8').includes('buymeacoffee.com'));
 assert(fs.readFileSync(path.join(root,'dist/index.html'),'utf8').includes('Created by <strong>Drew Wichman</strong>'));
 assert.equal(el('splashEmblem').src,run('SPLASH_LOGO_ASSET'));assert.equal(el('brandEmblem').src,el('splashEmblem').src);
});
const initialSong=JSON.stringify(c.UkeStrum.song);el('splashStart').click();
assert.equal(el('splashScreen').open,true);assert(el('splashScreen').classList.contains('is-leaving'));await advance(400);
check('Entering fades into Play without changing the draft or starting audio',()=>{
 assert.equal(el('splashScreen').open,false);assert.equal(el('playView').hidden,false);assert.equal(doc.activeElement,el('heroPlay'));assert.equal(JSON.stringify(c.UkeStrum.song),initialSong);assert.notEqual(body.style.overflow,'hidden');assert.equal(soundEvents,0);
});
run('openOptions()');el('welcomeBtn').click();assert.equal(el('optionsModal').open,false);assert.equal(el('splashScreen').open,true);
el('splashScreen').oncancel({preventDefault(){}});await advance(400);
check('About reopens the splash and Escape returns to the app',()=>{assert.equal(el('splashScreen').open,false);assert.equal(doc.activeElement,el('heroPlay'));});
el('motionToggle').checked=false;el('motionToggle').onchange();run('showSplash()');el('splashStart').click();
check('Reduced-motion entry opens the menu immediately',()=>assert.equal(el('splashScreen').open,false));
el('motionToggle').checked=true;el('motionToggle').onchange();
run('isViewer=true;showSplash()');assert.equal(el('splashScreen').open,false);run('isViewer=false;isProjector=true;showSplash()');
check('Shared previews and projectors bypass the startup splash',()=>assert.equal(el('splashScreen').open,false));run('isProjector=false');
check('App boots with fourteen starter songs, twelve strums, and standard C fingering',()=>{assert.equal(c.UkeStrum.starters.length,14);assert.equal(Object.keys(c.UkeStrum.patterns).length,12);assert.equal(run('CHORD_FINGERINGS.C.join()'),'0,0,0,3')});
check('Background motion can be paused and remembers the choice on reopening',()=>{
 assert.equal(el('motionToggle').checked,true);el('motionToggle').checked=false;el('motionToggle').onchange();
 assert(body.classList.contains('motion-paused'));assert.equal(JSON.parse(store.get('uke-strum-motion-v1')),false);
 run('initBackgroundMotion()');assert.equal(el('motionToggle').checked,false);
 el('motionToggle').checked=true;el('motionToggle').onchange();assert(!body.classList.contains('motion-paused'));
});
check('Device reduced motion overrides animation and responds to preference changes',()=>{
 const original=c.matchMedia,media={matches:true,addEventListener(type,fn){this.onchange=fn;}};c.matchMedia=()=>media;
 run('initBackgroundMotion()');assert(body.classList.contains('motion-paused'));assert.equal(el('motionToggle').disabled,true);assert.equal(el('motionDeviceNote').hidden,false);
 media.matches=false;media.onchange();assert(!body.classList.contains('motion-paused'));assert.equal(el('motionToggle').disabled,false);assert.equal(el('motionToggle').checked,true);assert.equal(el('motionDeviceNote').hidden,true);
 c.matchMedia=original;run('initBackgroundMotion()');
});
check('Every starter gains exactly one ending bar on its last played chord',()=>{
 const originalLengths=[8,8,4,8,8,12,8,4,16,8,16,6,8,8];
 c.UkeStrum.starters.forEach((s,i)=>{const last=s.measures.at(-1),prior=s.measures.slice(0,-1).flatMap(m=>m.chords).filter(c=>c.chord!=='--').at(-1).chord;assert.equal(s.measures.length,originalLengths[i]+1);assert.equal(s.measures.filter(m=>m.ending).length,1);assert.equal(last.chords.length,1);assert.equal(last.chords[0].step,0);assert.equal(last.chords[0].chord,prior);assert.equal(last.sectionStart,'Ending');});
});
check('Existing starter copies gain one ending while edited music and deliberate removals stay intact',()=>{
 run("window.legacyEndingSong=clone(STARTERS[2]);delete legacyEndingSong.starterEndingVersion;legacyEndingSong.measures.pop();legacyEndingSong.title='Our bakery song';legacyEndingSong.measures[0].sectionStart='Verse';");
 const migrated=run('normalizeSong(legacyEndingSong)');assert.equal(migrated.measures.length,5);assert.equal(migrated.measures[0].sectionStart,'Verse');assert.equal(migrated.measures.at(-1).ending,true);
 c.migratedEndingSong=migrated;assert.equal(run('normalizeSong(migratedEndingSong).measures.length'),5);
 run("legacyEndingSong.measures[0].lyric='Our own words';");assert.equal(run('normalizeSong(legacyEndingSong).measures.length'),4);
 run('migratedEndingSong.measures.pop();');assert.equal(run('normalizeSong(migratedEndingSong).measures.length'),4);
});
check('Existing Spider drafts and saved songs gain whole phrases while teacher-edited lyrics stay intact',()=>{
 c.legacySpider=c.UkeStrum.starters.find(s=>s.title==='Itsy Bitsy Spider');
 const old=['The itsy bitsy spider','Climbed up the waterspout.','Down came the rain','And washed the spider out.','Out came the sun','And dried up all the rain,','And the itsy bitsy spider','Climbed up the spout again.'];
 c.legacySpider.measures.slice(0,16).forEach((m,i)=>{m.lyric=i%2?'':old[i/2];m.lyricSpan=i%2?1:2;});
 c.legacySpider.title='Our spider song';c.legacySpider.id='saved-spider';c.legacySpider.tempo=72;c.legacySpider.measures[0].sectionStart='Verse';
 const upgraded=run('normalizeSong(legacySpider)');assert.equal(upgraded.measures[0].lyric,'The itsy bitsy spider climbed up the water spout.');assert.equal(upgraded.measures[0].lyricSpan,4);assert.equal(upgraded.measures[2].lyric,'');assert.equal(upgraded.title,'Our spider song');assert.equal(upgraded.tempo,72);assert.equal(upgraded.id,'saved-spider');assert.equal(upgraded.measures[0].sectionStart,'Verse');assert.equal(upgraded.measures.length,17);
 c.legacySpider.measures.pop();delete c.legacySpider.starterEndingVersion;assert.equal(run('normalizeSong(legacySpider).measures.length'),17);
 c.legacySpider.measures[0].lyric='Our own spider words';assert.equal(run('normalizeSong(legacySpider).measures[0].lyric'),'Our own spider words');assert.equal(run('normalizeSong(legacySpider).measures[2].lyric'),old[1]);
});
check('Mountain has eight sung measures at the same 84 BPM with its original down-strum pattern',()=>{
 run("loadSong(testStarter('She’ll Be Coming ’Round the Mountain'),false)");
 assert.equal(c.UkeStrum.song.tempo,84);assert.equal(c.UkeStrum.song.meter,'4/4');assert.equal(c.UkeStrum.song.pattern,'basic-4');
 assert.equal(run('cues().slice(0,8).map(c=>c.start).join()'),'-2,6,14,22,30,38,46,54');
 assert.equal(run('cues().slice(0,7).every(c=>c.end-c.start===8)&&cues()[7].end===64'),true);assert.equal(run('countInCounts()'),4);
 assert.equal(run("Array.from({length:32},(_,beat)=>arrangementChord(song,beat*2)).join()"),'C,C,C,C,C,C,C,C,C,C,C,C,G7,G7,G7,G7,C,C,C,C,F,F,F,F,C,C,G7,G7,C,C,C,C');
 assert.equal(run('song.measures[8].ending'),true);assert.equal(run('duration()*2'),60/84);
});
check('The old Mountain chart migrates once while preserving tempo, mixer, saved identity, and section positions',()=>{
 run("window.oldMountain=clone(testStarter('She’ll Be Coming ’Round the Mountain'));oldMountain.measures=Array.from({length:16},(_,i)=>measure(['C','C','C','C','C','C','G7','G7','C','C','F','F','C','G7','C','C'][i],i%2?'':STARTERS[12].measures[i/2].lyric,i%2?1:2));addStarterEnding(oldMountain);oldMountain.title='Our mountain';oldMountain.id='saved-mountain';oldMountain.tempo=76;oldMountain.pattern='folk-4';oldMountain.band.bass=11;oldMountain.measures[8].sectionStart='Second half';oldMountain.description='Three chords · Sing “She’ll be” on count-in beats 3 and 4, then “coming” on beat 1.';window.fixedMountain=normalizeSong(oldMountain);");
 assert.equal(run('oldMountain.measures.length'),17);assert.equal(run('fixedMountain.measures.length'),9);assert.equal(run('fixedMountain.title'),'Our mountain');assert.equal(run('fixedMountain.id'),'saved-mountain');assert.equal(run('fixedMountain.tempo'),76);assert.equal(run('fixedMountain.pattern'),'folk-4');assert.equal(run('fixedMountain.band.bass'),11);
 assert.equal(run('fixedMountain.measures[4].sectionStart'),'Second half');assert.equal(run('fixedMountain.measures[8].sectionStart'),'Ending');assert(run('fixedMountain.description.includes("4 &")'));
 assert.equal(run('JSON.stringify(normalizeSong(fixedMountain))'),run('JSON.stringify(fixedMountain)'));
});
check('Mountain migration leaves edited music and unmappable section starts alone, retaining deliberate ending removal',()=>{
 for(const edit of ["measures[0].lyric='My verse'","measures[3].chords[0].chord='F'","measures[0].lyricSpan=3","measures[1].sectionStart='New verse'"]){run('window.editedMountain=clone(oldMountain);editedMountain.'+edit);assert.equal(run('normalizeSong(editedMountain).measures.length'),17);}
 run('window.noEndingMountain=clone(oldMountain);noEndingMountain.measures.pop();');assert.equal(run('normalizeSong(noEndingMountain).measures.length'),8);
 run('delete noEndingMountain.starterEndingVersion;');assert.equal(run('normalizeSong(noEndingMountain).measures.length'),9);
 run('window.mountainRoundTrip=decodeShared(encodeShared(fixedMountain));');assert.equal(run('mountainRoundTrip.measures.length'),9);assert.equal(run('mountainRoundTrip.measures[6].chords[1].step'),4);
});
check('BINGO fits each phrase into one measure at 75 BPM while retaining every chord',()=>{
 run("loadSong(testStarter('BINGO'),false)");assert.equal(c.UkeStrum.song.tempo,75);assert.equal(c.UkeStrum.song.pattern,'basic-4');assert.equal(c.UkeStrum.song.measures.length,7);assert.equal(run('cues().slice(0,6).map(c=>c.start).join()'),'0,8,16,24,32,40');assert.equal(run('duration()*2'),.8);
 run("window.oldBingo=template('Our BINGO','4/4',80,'basic-4',['C',['F','C'],'G7','C','C','F','G7','C','C','G7','G7','C'],[[0,STARTERS[11].measures[0].lyric,2],[2,STARTERS[11].measures[1].lyric,2],[4,STARTERS[11].measures[2].lyric,2],[6,STARTERS[11].measures[3].lyric,2],[8,STARTERS[11].measures[4].lyric,2],[10,STARTERS[11].measures[5].lyric,2]],'',STARTERS[11].source);addStarterEnding(oldBingo);oldBingo.id='saved-bingo';oldBingo.band={enabled:true,bass:12};oldBingo.measures[4].sectionStart='Spelling';window.fixedBingo=normalizeSong(oldBingo);");
 assert.equal(run('fixedBingo.measures.length'),7);assert.equal(run('fixedBingo.tempo'),75);assert.equal(run('fixedBingo.id'),'saved-bingo');assert.equal(run('fixedBingo.band.bass'),12);assert.equal(run('fixedBingo.measures[2].sectionStart'),'Spelling');assert.equal(run('fixedBingo.title'),'Our BINGO');
 for(let tick=0;tick<48;tick++){c.bingoTick=tick;assert.equal(run('arrangementChord(fixedBingo,bingoTick)'),run('arrangementChord(oldBingo,bingoTick*2)'));}
 assert.equal(run('JSON.stringify(normalizeSong(fixedBingo))'),run('JSON.stringify(fixedBingo)'));assert.equal(run('decodeShared(encodeShared(fixedBingo)).measures.length'),7);
 assert.equal(run('bandEvents(song,18).some(e=>e.instrument==="clap")'),true);assert.equal(run('bandEvents(song,10).some(e=>e.instrument==="clap")'),false);
});
check('BINGO migration respects custom tempos, edited charts, and deliberately removed endings',()=>{
 assert.equal(run('normalizeSong({...oldBingo,tempo:68}).tempo'),68);
 for(const edit of ["measures[0].lyric='Our own words'","measures[1].chords[0].chord='G7'","measures[2].lyricSpan=3","measures[1].sectionStart='New section'"]){run('window.editedBingo=clone(oldBingo);editedBingo.'+edit);assert.equal(run('normalizeSong(editedBingo).measures.length'),13);}
 run('window.shortBingo=clone(oldBingo);shortBingo.measures.pop();');assert.equal(run('normalizeSong(shortBingo).measures.length'),6);run('delete shortBingo.starterEndingVersion;');assert.equal(run('normalizeSong(shortBingo).measures.length'),7);
});
check('Every looping starter excludes its ending from playback and the lyric preview',()=>{
 for(let i=0;i<c.UkeStrum.starters.length;i++){run(`loadSong({...STARTERS[${i}],playCount:1},false);song.loop=true;`);assert.equal(run('windowBounds().end'),run('totalSteps()-config().steps'));assert.equal(run('mappedTick(windowBounds().end)'),0);assert(!run('stageCues().some(c=>c.text.includes("One final strum"))'));}
 run('loadSong({...STARTERS[0],playCount:1},false)');
});
check('Ending behavior survives JSON and share links and overrides all twelve strum patterns',()=>{
 for(const pattern of Object.keys(c.UkeStrum.patterns)){c.endingPattern=pattern;run("window.endingCopy=normalizeSong({...STARTERS[0],meter:STRUM_PATTERNS[endingPattern].timeSignature,pattern:endingPattern});endingCopy=decodeShared(encodeShared(endingCopy));");assert.equal(run('endingCopy.measures.at(-1).ending'),true);assert.equal(run("Array.from({length:METERS[endingCopy.meter].steps},(_,i)=>strumStep(endingCopy,(endingCopy.measures.length-1)*METERS[endingCopy.meter].steps+i).type).join('')"),'D'+'.'.repeat(run('METERS[endingCopy.meter].steps')-1));}
});
check('All fourteen starters have distinct song arrangements and start with the band enabled',()=>{assert(c.UkeStrum.starters.every(s=>s.band.enabled));assert.equal(run('new Set(STARTERS.map(s=>bandProfile(s).id)).size'),14);assert.equal(run("bandProfile({...STARTERS[5],title:'Our night song'}).name"),'Starlight bells');});
check('Song arrangements use only available samples and respect every chord/rest',()=>{
 const bank=JSON.parse(fs.readFileSync(path.join(root,'dist/assets/audio/classroom-band.json')));
 for(const s of c.UkeStrum.starters){c.arrangementTest=s;const groups=run('Array.from({length:arrangementTest.measures.length*METERS[arrangementTest.meter].steps},(_,tick)=>({chord:arrangementChord(arrangementTest,tick),events:bandEvents(arrangementTest,tick)}))');let total=0;for(const {chord,events} of groups){for(const e of events){total++;assert(bank.samples.some(x=>x.instrument===e.instrument&&x.note===e.note),s.title+' '+JSON.stringify(e));const pcs=run(`CHORD_FINGERINGS[${JSON.stringify(chord)}].map((n,i)=>([67,60,64,69][i]+n)%12)`);if(['bass','melody'].includes(e.channel))assert(pcs.includes(e.note%12),s.title+' non-chord tone');}}assert(total>10,s.title);}
 assert.equal(run("bandEvents({...STARTERS[0],measures:[measure('--')]},0).length"),0);assert.equal(run('bandEvents({...STARTERS[0],band:{...STARTERS[0].band,enabled:false}},0).length'),0);
});
check('Saved band choices, zero volumes, and meter changes remain usable',()=>{assert.equal(run("normalizeSong({...STARTERS[0],band:{enabled:false,style:'gentle',melody:0}}).band.melody"),0);assert.equal(run("normalizeSong({...STARTERS[0],band:{enabled:false,style:'gentle'}}).band.style"),'gentle');assert.equal(run("bandProfile({...STARTERS[0],meter:'3/4'}).groove"),'waltz');assert.equal(run("normalizeSong({...STARTERS[0],band:{enabled:true,style:'<script>'}}).band.style"),'song');});
await run('initAudio()');
check('The local SoundFont bank decodes fully before sampled playback starts',()=>{assert.equal(run('soundState'),'ready');assert.equal(run('[...sampledInstruments.values()].flat().length'),130);assert.equal(run('sampledInstruments.get("uke").length'),54);});
run("loadSong(testStarter('She’ll Be Coming ’Round the Mountain'),false);$('countIn').checked=true;window.mountainStrums=[];window.originalMountainStrum=strum;strum=(...args)=>{mountainStrums.push(args[1]);return originalMountainStrum(...args);};");
const mountainStarted=now/1000;await run('start()');await advance(4*60/84*1000+100);
assert.equal(el('currentLyric').textContent,'She’ll be coming ’round the mountain');await advance(4*60/84*1000);
check('Mountain lyrics advance after four steady down-strums while the four-beat intro and strum spacing stay unchanged',()=>{
 assert.equal(el('currentLyric').textContent,'When she comes.');assert.equal(el('nextLyric').textContent,'She’ll be coming ’round the mountain');
 assert(c.mountainStrums.length>=5);assert(Math.abs(c.mountainStrums[0]-mountainStarted-.08-4*60/84)<1e-7);
 for(let i=1;i<c.mountainStrums.length;i++)assert(Math.abs(c.mountainStrums[i]-c.mountainStrums[i-1]-60/84)<1e-7);
});run('stop();strum=originalMountainStrum;loadSong({...STARTERS[0],playCount:1},false)');
run('window.endingOriginals={strum,chuck,click,playBandEvent};window.endingEvents=[];strum=(chord,time,velocity,up)=>{endingEvents.push({kind:"strum",chord,time,up});endingOriginals.strum(chord,time,velocity,up);};chuck=(...a)=>{endingEvents.push({kind:"chuck"});endingOriginals.chuck(...a);};click=(...a)=>{endingEvents.push({kind:"click"});endingOriginals.click(...a);};playBandEvent=(...a)=>{endingEvents.push({kind:"band",event:a[0],time:a[1]});endingOriginals.playBandEvent(...a);};');
for(let i=0;i<c.UkeStrum.starters.length;i++){
 run(`loadSong({...STARTERS[${i}],playCount:1},false);$('countIn').checked=false;$('metronomeToggle').checked=true;endingEvents=[];`);
 const before=now/1000,barMs=run('config().steps*duration()*1000');await run('start(song.measures.length-1)');await advance(100);
 assert.equal(el('currentLyric').textContent,'One final strum ↓');assert.equal(el('finishMessage').hidden,true);assert.equal(el('stageStrums').dataset.ending,'true');assert.equal(el('stageStrums').dataset.stroke,'D');assert.equal(run('bandBus.gain.value'),1);for(const key of ['drums','shaker','melody'])assert.equal(run(`bandBuses.${key}.gain.value`),0);
 await advance(run('duration()*1000'));assert.equal(el('currentLyric').textContent,'One final strum ↓');assert.equal(el('currentLyric').style.opacity,'1');assert.equal(el('endingCue').textContent,'');
 const fadeMs=Math.min(1000,barMs/2);await advance(before*1000+80+barMs-fadeMs/2-now);
 assert.equal(el('currentLyric').textContent,'One final strum ↓');assert(Math.abs(+el('currentLyric').style.opacity-.5)<.02);assert.equal(el('finishMessage').hidden,true);
 await advance(fadeMs/2-10);assert(+el('currentLyric').style.opacity<.01);await advance(110);
 assert.equal(c.endingEvents.length,2,c.UkeStrum.song.title);const bass=c.endingEvents.find(e=>e.kind==='band'),uke=c.endingEvents.find(e=>e.kind==='strum');assert.equal(bass.event.instrument,'bass');assert.equal(bass.event.channel,'bass');assert.equal(bass.event.note%12,{C:0,F:5}[uke.chord]);assert.equal(uke.up,false);assert.equal(uke.chord,c.UkeStrum.song.measures.at(-1).chords[0].chord);assert.equal(bass.time,uke.time);assert.equal(bass.event.length,barMs/1000);assert(Math.abs(uke.time-before-.08)<1e-7);assert.equal(c.UkeStrum.state.state,'finished');assert.equal(el('finishMessage').hidden,false);run('stop();');assert.equal(el('finishMessage').hidden,true);
}
check('All fourteen endings fade their strum prompt before Well played, retaining one bass root and down-strum',()=>{});
run("loadSong({...STARTERS[2],playCount:1},false);song.loop=true;endingEvents=[];");await run('start(song.measures.length-2)');await advance(run('config().steps*duration()*1000')+200);
check('Loops skip the ending and return directly to the first sung measure',()=>{assert(c.endingEvents.some(e=>e.kind==='band'));assert.equal(run('bandBus.gain.value'),1);assert.equal(el('stageStrums').dataset.ending,'false');assert.equal(el('currentLyric').textContent,'Hot cross buns!');});
run("stop();({strum,chuck,click,playBandEvent}=endingOriginals);loadSong({...STARTERS[0],playCount:1},false);$('countIn').checked=true;$('metronomeToggle').checked=false;");
run("makeGate();window.strikes=[];window.sampleNoteBeforeTest=sampleNote;sampleNote=(instrument,note,time,velocity,...rest)=>{strikes.push({instrument,note,time,velocity});return sampleNoteBeforeTest(instrument,note,time,velocity,...rest);};strum('C',ctx.currentTime+.1,1,false);strum('C',ctx.currentTime+.6,1,true);");
check('Sampled C strums preserve high-G tuning and reverse string order on lighter upstrokes',()=>{assert.equal(c.strikes.slice(0,4).map(x=>x.note).join(), '67,60,64,72');assert.equal(c.strikes.slice(4).map(x=>x.note).join(),'72,64,60,67');assert(c.strikes[1].time>c.strikes[0].time);assert(c.strikes.slice(4).every(x=>x.velocity<.91));});run('sampleNote=window.sampleNoteBeforeTest;silence();');
const workingFetch=c.fetch;c.fetch=async()=>{throw Error('Simulated network failure')};run("soundState='idle';soundBankData=null;");await run('initAudio()');
check('An audio download failure leaves playable basic sound and a visible retry',()=>{assert.equal(run('soundState'),'fallback');run('openBand()');assert.equal(el('retrySounds').hidden,false);assert(el('classContent').innerHTML.includes('Basic sound'));});
c.fetch=workingFetch;await run('loadSampledSounds()');run('closeClass()');
check('Retry restores the complete sampled band after a download failure',()=>assert.equal(run('soundState'),'ready'));
run('window.initBeforeWaitTest=initAudio;initAudio=()=>new Promise(resolve=>window.releasePendingAudio=resolve);');
const pendingStart=run('start()');run('stop();releasePendingAudio();');await pendingStart;
check('Stop while instruments are loading prevents a delayed performance',()=>{assert.equal(c.UkeStrum.state.state,'stopped');assert.equal(c.UkeStrum.state.queue.length,0);});
const countBeforeAudition=soundEvents,pendingAudition=run("hearChord('G7')");run('stop();releasePendingAudio();');await pendingAudition;
check('Stop also cancels a chord audition waiting for audio',()=>assert.equal(soundEvents,countBeforeAudition));run('initAudio=window.initBeforeWaitTest;');
check('The app opens in Play with Create and Teach tucked away',()=>{assert.equal(el('playView').hidden,false);assert.equal(el('createView').hidden,true);assert.equal(el('teachView').hidden,true);assert.equal(el('navPlay').getAttribute('aria-current'),'page');assert.equal(el('songShelf').innerHTML.match(/data-shelf-song=/g).length,14)});
const addedTitles=['Apple Tree','Lucy Locket','The More We Get Together','The Farmer in the Dell','Itsy Bitsy Spider','BINGO','She’ll Be Coming ’Round the Mountain'];
check('Epo uses F and C7, a four-beat intro, accurate background, and a bass-and-ukulele F ending',()=>{
 run("loadSong(testStarter('Epo I Tai Tai E'),false)");
 assert.equal(c.UkeStrum.song.measures.map(m=>m.chords.map(c=>c.chord).join('/')).join('|'),'F|F|F|F|F|F|C7|F|F');
 assert.equal(c.UkeStrum.song.tempo,80);assert.equal(run('countInBeats()'),4);
 assert.equal(run('CHORD_FINGERINGS.C7.join()'),'0,0,0,1');
 assert.equal(el('songBackgroundBtn').hidden,false);el('songBackgroundBtn').click();
 for(const text of ['Kīngi Tāhiwi','1909','classroom syllables','C4–A4','Ōtaki Museum'])assert(el('generalContent').innerHTML.includes(text));
 el('generalModal').close();
 const shared=run("decodeShared(encodeShared({...song,title:'Our F song'}))");
 assert.equal(shared.source,'https://otakimuseum.blogspot.com/2009/11/he-waiata-song.html');
 assert(shared.measures[8].ending);assert.equal(shared.band.style,'song');
 assert.equal(run('bandProfile(song).id'),'epo');assert.equal(run('bandEvents(song,64)[0].note'),41);
 run('loadSong({...STARTERS[0],playCount:1},false)');assert.equal(el('songBackgroundBtn').hidden,true);
});
check('Earlier Epo drafts update their default wording without losing teacher edits',()=>{
 const starter=run("clone(testStarter('Epo I Tai Tai E'))"),old=['Epo e tai tama e, o','','Epo e tai tama e.','','Epo e tai tama','epo e huru huru,','Epo e tai tama e.',''],spans=[2,1,2,1,1,1,2,1];
 const legacy={...starter,title:'Epo e Tai',tempo:92,measures:starter.measures.map((m,i)=>i<8?{...m,lyric:old[i],lyricSpan:spans[i]}:m)};
 legacy.measures[0].chords=[{step:0,chord:'Dm'}];c.epoLegacy=legacy;
 const migrated=run('normalizeSong(epoLegacy)');assert.equal(migrated.title,'Epo I Tai Tai E');assert.equal(migrated.tempo,92);assert.equal(migrated.measures[0].chords[0].chord,'Dm');
 assert.deepEqual(Array.from(migrated.measures,m=>m.lyric),Array.from(starter.measures,m=>m.lyric));assert.equal(migrated.measures[6].lyricSpan,1);assert.equal(migrated.measures[7].lyric,'e.');
 assert.equal(legacy.measures[0].lyric,old[0]);assert.equal(legacy.title,'Epo e Tai');
 legacy.title='Our class version';legacy.measures[0].lyric='Our own words';const custom=run('normalizeSong(epoLegacy)');assert.equal(custom.title,'Our class version');assert.equal(custom.measures[0].lyric,'Our own words');assert.equal(custom.measures[6].lyric,old[6]);
 legacy.measures[0].lyric=old[0];legacy.measures[0].lyricStart=1;assert.equal(run('normalizeSong(epoLegacy).measures[0].lyric'),old[0]);
});
check('The seven retained additions use only the promised beginner chord sets and matching meters',()=>{
 const added=c.UkeStrum.starters.slice(6,13);assert.equal(added.map(s=>s.title).join('|'),addedTitles.join('|'));
 const counts=[1,1,2,2,2,3,3];const meters=['2/4','4/4','3/4','6/8','6/8','4/4','4/4'];
 added.forEach((s,i)=>{const chords=[...new Set(s.measures.flatMap(m=>m.chords.map(c=>c.chord)))];assert.equal(chords.length,counts[i]);assert(chords.every(c=>['C','F','G7'].includes(c)));assert.equal(s.meter,meters[i]);assert(s.tempo>=60&&s.tempo<=84);});
});
check('Every new song keeps its unique collage artwork after a renamed share round-trip',()=>{
 const slugs=['apple-tree','lucy-locket','more-we-get-together','farmer-in-the-dell','itsy-bitsy-spider','bingo','coming-round-the-mountain','epo-e-tai'];
 slugs.forEach((slug,i)=>{const index=i+6;c.testStarterIndex=index;const src=run("collageArtSource(artworkIndex(decodeShared(encodeShared({...STARTERS[testStarterIndex],title:'Our class version'}))))");assert.equal(src,'assets/collage/'+slug+'.webp');assert(fs.statSync(path.join(root,'dist',src)).size>1000);});
 assert(run("stageArtwork('sunny')").includes('sunny-beach.webp'));assert(run("stageArtwork('sunset')").includes('sunset-beach.webp'));assert(run("songArtwork(artworkIndex({title:'A brand new song'}))").includes('sunny-beach.webp'));
});
check('Song references preserve approved teaching sources and reject misleading domains',()=>{
 assert.equal(run("normalizeSong(testStarter(\"Apple Tree\")).source"),'https://www.thesingingclassroom.com/articles/apple-tree');
 assert.equal(run("normalizeSong(testStarter(\"BINGO\")).source"),'https://www.bethsnotesplus.com/2013/01/bingo.html');
 for(const source of ['javascript:alert(1)','https://www.kidsplaymusic.com.evil.example/song','https://www.thesingingclassroom.com@evil.example/song','https://otakimuseum.blogspot.com.evil.example/2009/11/he-waiata-song.html']){c.testSource=source;assert.equal(run('normalizeSong({...testStarter(\"Apple Tree\"),source:testSource}).source'),'');}
});
check('Removed repertoire is absent from starters, source links, and bundled artwork',()=>{
 const retired=['Old MacDonald Had a Farm','Mary Had a Little Lamb','Row, Row, Row Your Boat'];
 assert.equal(c.UkeStrum.song.title,'Are You Sleeping?');
 el('sourceBtn').click();
 for(const title of retired){assert(!c.UkeStrum.starters.some(s=>s.title===title));assert(!el('generalContent').innerHTML.includes(title));}
 el('generalModal').close();
 for(const slug of ['old-macdonald','little-lamb','row-your-boat']){assert(!run('COLLAGE_ART_ASSETS').some(p=>p.includes(slug)));assert(!fs.existsSync(path.join(root,'dist/assets/collage',slug+'.webp')));}
});
check('An old unnamed starter draft opens the new default and remains recoverable',()=>{
 for(const title of ['Old MacDonald Had a Farm','Mary Had a Little Lamb','Row, Row, Row Your Boat']){
  c.retiredDraft={...c.UkeStrum.starters[0],title,source:'',id:null};
  run('restoreDraft(retiredDraft)');assert.equal(c.UkeStrum.song.title,'Are You Sleeping?');
  assert.equal(JSON.parse(store.get('uke-strum-retired-draft-v1')).title,title);
  assert.equal(JSON.parse(store.get('uke-strum-draft-v2')).title,'Are You Sleeping?');
 }
 c.teacherDraft={...c.UkeStrum.starters[0],title:'My original class song',id:null};
 run('restoreDraft(teacherDraft)');assert.equal(c.UkeStrum.song.title,'My original class song');
 run('loadSong({...STARTERS[0],playCount:1},false)');
});
check('Navigation changes workspaces without changing the song',()=>{const before=JSON.stringify(c.UkeStrum.song);el('navTeach').click();assert.equal(el('teachView').hidden,false);assert.equal(el('playView').hidden,true);el('navCreate').click();assert.equal(el('createView').hidden,false);assert.equal(el('teachView').hidden,true);assert.equal(JSON.stringify(c.UkeStrum.song),before);el('navPlay').click();});
check('Song shelf filters one-chord arrangements and searches by title',()=>{el('shelfOneChord').click();assert.equal(el('songShelf').innerHTML.match(/data-shelf-song=/g).length,4);el('shelfOneChord').click();el('shelfSearch').value='London';el('shelfSearch').oninput();assert.equal(el('songShelf').innerHTML.match(/data-shelf-song=/g).length,1);assert(el('songShelf').innerHTML.includes('London Bridge'));el('shelfSearch').value='';el('shelfSearch').oninput();});
check('Choosing an illustrated song updates the on-deck title and tempo',()=>{const b=makeNode('','button');b.dataset.shelfSong=String(c.UkeStrum.starters.findIndex(s=>s.title==='London Bridge'));b.attributes['data-shelf-song']=b.dataset.shelfSong;el('songShelf').onclick({target:b});assert.equal(el('playHeading').textContent,'London Bridge');assert.equal(+el('homeTempo').value,80);assert.equal(el('heroCountIn').textContent,'4 beats to get ready');});
check('Stage selection updates the same saved song setting and Play label',()=>{el('stagePickerBtn').click();const b=makeNode('','button');b.dataset.stageChoice='moonlight';b.attributes['data-stage-choice']='moonlight';el('stageChoices').onclick({target:b});assert.equal(c.UkeStrum.song.theme,'moonlight');assert.equal(el('stageBadge').textContent,'Moonlight Lagoon');el('stageModal').close();assert(el('stageScenery').innerHTML.includes('scene-moonlight'));});
check('Creating a song takes the teacher directly to the arrangement editor',()=>{el('newSong').click();el('newSongName').value='Our sunny song';el('newSongForm').onsubmit({preventDefault(){}});assert.equal(el('newSongModal').open,false);assert.equal(el('createView').hidden,false);assert.equal(el('playView').hidden,true);assert.equal(c.UkeStrum.song.title,'Our sunny song');assert.equal(el('buildGuide').hidden,false);el('navPlay').click();});
check('All classroom tools are bound to real HTML controls',()=>{for(const id of ['teachBtn','challengeBtn','bandBtn','setlistBtn','sectionsBtn','shareBtn','projectorBtn','rangePlay','stageTheme'])assert.equal(typeof el(id).onclick==='function'||typeof el(id).onchange==='function',true,id)});
check('Song schema retains sections, themes, and clamped mixer settings',()=>{const s=run("normalizeSong({...testStarter(\"Are You Sleeping?\"),theme:'sunset',band:{enabled:true,ukulele:0,bass:900},measures:[{...measure('C'),sectionStart:'Verse 1'}]})");assert.equal(s.version,3);assert.equal(s.theme,'sunset');assert.equal(s.band.ukulele,0);assert.equal(s.band.bass,100);assert.equal(s.band.shaker,10);assert.equal(s.measures[0].sectionStart,'Verse 1');assert.equal(run("normalizeSong(testStarter(\"Are You Sleeping?\")).theme"),'sunny')});
for(let i=6;i<c.UkeStrum.starters.length;i++){
 c.testStarterIndex=i;run("loadSong({...STARTERS[testStarterIndex],playCount:1},false);$('countIn').checked=true;");
 const planned=run('cues()'),stepMs=run('duration()*1000'),introMs=run('countInSteps()*duration()*1000');
 assert.equal(planned[0].start,0-run('lyricPickupFor(song.measures[0])*config().beat')); assert.equal(planned.at(-1).end,run('totalSteps()'));
 for(let j=0;j<planned.length;j++){assert(planned[j].end>planned[j].start);if(j)assert.equal(planned[j-1].end,planned[j].start);}
 await run('start()');await advance(100);assert.equal(el('currentLyric').textContent,c.UkeStrum.song.meter==='6/8'?'1':'Get ready… 1');
 await advance(introMs+30);assert.equal(el('currentLyric').textContent,planned[0].text);
 for(let j=1;j<planned.length;j++){await advance((planned[j].start-planned[j-1].start)*stepMs);assert.equal(el('currentLyric').textContent,planned[j].text);}
 await advance((planned.at(-1).end-planned.at(-1).start)*stepMs+300);
 check(c.UkeStrum.starters[i].title+' plays all lyric phrases after its count-in and reaches the final cutoff',()=>{assert.equal(c.UkeStrum.state.state,'finished');assert.equal(el('endingCue').textContent,'');assert.equal(c.UkeStrum.state.queue.length,0);});run('stop()');
}
// Pickup lyrics use their own clock while the original chord/audio clock keeps time.
check('Pickup defaults migrate untouched Mountain copies, preserving an explicit None and teacher-written lyrics',()=>{
 run("window.legacyPickup=clone(STARTERS[12]);delete legacyPickup.lyricPickup;legacyPickup.title='Our mountain';legacyPickup.tempo=79;legacyPickup.measures[4].sectionStart='Verse';");
 const migrated=run('normalizeSong(legacyPickup)');assert.equal(migrated.lyricPickup,1);assert.equal(migrated.title,'Our mountain');assert.equal(migrated.tempo,79);assert.equal(migrated.measures[4].sectionStart,'Verse');assert.equal(run('legacyPickup.lyricPickup'),undefined);
 assert.equal(run('normalizeSong({...legacyPickup,lyricPickup:0}).lyricPickup'),0);
 run("legacyPickup.measures[0].lyric='Our own words'");assert.equal(run('normalizeSong(legacyPickup).lyricPickup'),0);
 run('window.legacyLongPickup=clone(oldMountain);delete legacyLongPickup.lyricPickup;');assert.equal(run('normalizeSong(legacyLongPickup).lyricPickup'),1);
});
check('New Song, song pickup, per-line overrides, undo, and shared files retain the selected timings',()=>{
 el('newSong').click();el('newSongPickup').value='0.5';el('newSongForm').onsubmit({preventDefault(){}});assert.equal(c.UkeStrum.song.lyricPickup,.5);
 el('songLyricPickup').onchange({target:{value:'2'}});assert.equal(c.UkeStrum.song.lyricPickup,2);
 el('lineLyricPickup').onchange({target:{value:'0'}});assert.equal(c.UkeStrum.song.measures[0].lyricPickup,0);
 run("song.measures[0].lyric='First';song.measures[1].lyric='Second';");assert.equal(run('cues()[0].start'),0);assert.equal(run('cues()[1].start'),4);
 const roundTrip=run('decodeShared(encodeShared(song))');assert.equal(roundTrip.lyricPickup,2);assert.equal(roundTrip.measures[0].lyricPickup,0);assert.equal(roundTrip.measures[1].lyricPickup,null);
 el('lineLyricPickup').onchange({target:{value:''}});assert.equal(run('cues()[0].start'),-4);el('undoBtn').click();assert.equal(c.UkeStrum.song.measures[0].lyricPickup,0);
 assert.equal(run("normalizeSong({...song,lyricPickup:'bad'}).lyricPickup"),0);assert.equal(run('normalizeSong({...song,measures:[{...measure(),lyricPickup:99}]}).measures[0].lyricPickup'),null);
});
check('Pickup durations follow the selected beat in every meter without moving chords or the last note',()=>{
 for(const meter of ['2/4','3/4','4/4','6/8'])for(const pickup of [0,.5,1,2]){
  c.pickupMeter=meter;c.pickupAmount=pickup;run("loadSong({...template('Pickup check',pickupMeter,80,METERS[pickupMeter].default,['C','G7'],[[0,'First'],[1,'Last']],'',''),lyricPickup:pickupAmount},false)");
  assert.equal(run('cues()[0].start'),0-run('config().beat')*pickup);assert.equal(run('cues().at(-1).end'),run('totalSteps()'));assert.equal(run('chordAt(0)'),'C');assert.equal(run('chordAt(config().steps)'),'G7');assert.equal(run('duration()*config().beat'),.75);
 }
});
async function atPickupPhase(phase){const ms=run(`(transport.origin+${phase}*duration()-ctx.currentTime)*1000`);if(ms>0)await advance(ms);}
run("loadSong({...STARTERS[12],playCount:1},false);$('countIn').checked=true;$('stage').hidden=false;");el('lyricCrawl').clientHeight=210;
await run('start()');await atPickupPhase(-2.05);assert.equal(el('currentLyric').textContent,'Get ready… 3');await atPickupPhase(-1.95);
const pickupText=el('currentLyric').textContent;
check('Mountain turns yellow on count four and previews its next line while the four-beat intro continues',()=>{
 assert.equal(pickupText,'She’ll be coming ’round the mountain');assert.equal(el('nextLyric').textContent,'When she comes.');assert.equal(el('currentLyric').style.opacity,'1');assert(!el('stage').classList.contains('counting'));assert.equal(run('countingDisplay'),true);assert.equal(el('stageStatus').textContent,'Count-in · 4 of 4');
});
run('pause()');const frozenPickup=el('currentLyric').style.transform;await advance(400);assert.equal(el('currentLyric').style.transform,frozenPickup);await run('start()');await atPickupPhase(.05);
check('Pickup pause/resume and the first downbeat retain the same active line without a restart',()=>{
 assert.equal(el('currentLyric').textContent,pickupText);assert.equal(run('lyricDisplay.start'),-2);assert.equal(run('countingDisplay'),false);assert.equal(el('currentLyric').style.opacity,'1');
});
await atPickupPhase(5.95);assert.equal(el('currentLyric').textContent,pickupText);await atPickupPhase(6.05);
check('The next Mountain line starts on beat four of the preceding measure',()=>{assert.equal(el('currentLyric').textContent,'When she comes.');assert.equal(c.UkeStrum.state.tick,6);assert.equal(el('departingLyric').textContent,pickupText);assert.equal(el('currentLyric').style.opacity,'1');});
await atPickupPhase(63.95);
check('The last sung Mountain line remains fully visible through its final beat',()=>{assert.equal(el('currentLyric').textContent,'When she comes.');assert.equal(el('currentLyric').style.opacity,'1');});
await atPickupPhase(64.05);assert.equal(el('currentLyric').textContent,'One final strum ↓');run('stop();song.loop=true;');await run('start()');await atPickupPhase(61.95);assert.equal(el('currentLyric').textContent,'When she comes.');await atPickupPhase(62.05);
assert.equal(el('currentLyric').textContent,pickupText);const loopPickupKey=run('lyricDisplay.key');await atPickupPhase(64.05);
check('Loop pickups enter before the repeat downbeat and cross it without restarting the lyric animation',()=>{assert.equal(el('currentLyric').textContent,pickupText);assert.equal(run('lyricDisplay.key'),loopPickupKey);assert.equal(run('lyricDisplay.start'),62);assert.equal(el('finishMessage').hidden,true);});
await atPickupPhase(128.1);assert.equal(run('lyricDisplay.start'),126);run('setLoop(false)');await atPickupPhase(63.95);assert.equal(el('currentLyric').textContent,'When she comes.');await atPickupPhase(64.1);assert.equal(el('currentLyric').textContent,'One final strum ↓');run('stop();');
run("loadSong({...STARTERS[12],playCount:1},false);activeRange={start:2,end:4,loop:true};$('countIn').checked=true;");await run('start()');await atPickupPhase(14.1);
check('A practice passage sings its own pickup during its fresh count-in',()=>{assert.equal(el('currentLyric').textContent,pickupText);assert.equal(run('activeCue.nominalStart'),16);assert.equal(el('nextLyric').textContent,'When she comes.');assert.equal(run('countingDisplay'),true);});
await atPickupPhase(30.1);assert.equal(run('activeCue.start'),30);await atPickupPhase(32.1);assert.equal(run('activeCue.start'),30);run('stop();activeRange=null;');
run("loadSong({...template('Half-beat test','6/8',60,'compound-6',['C','G7'],[[0,'Sing early'],[1,'Next line']],'',''),lyricPickup:.5},false);$('countIn').checked=true;");await run('start()');await atPickupPhase(-1.55);assert.equal(el('currentLyric').textContent,'Sing');await atPickupPhase(-1.45);
check('Half-beat pickups in 6/8 enter between subdivision ticks using the continuous clock',()=>{assert.equal(el('currentLyric').textContent,'Sing early');assert.equal(run('activeCue.start'),-1.5);assert.equal(run('countingDisplay'),true);assert.equal(run('countInSteps()*duration()'),4);});run('stop();');

// Verify whole phrases, visual transitions, real clock continuity, and a queued repeat edge.
run("loadSong(testStarter('Itsy Bitsy Spider'),false);$('countIn').checked=false;$('stage').hidden=false;");
const fullSpider=['The itsy bitsy spider climbed up the water spout.','Down came the rain and washed the spider out.','Out came the sun and dried up all the rain.','And the itsy bitsy spider climbed up the spout again.'];
el('lyricCrawl').clientHeight=210;
const crawlY=id=>Number(el(id).style.transform.match(/translate3d\(0,([\d.e+-]+)px/)[1]);
await run('start()');await advance(100);const crawlPositions=[];
for(let i=0;i<4;i++){
 assert.equal(el('currentLyric').textContent,fullSpider[i]);assert.equal(el('currentLyric').style.opacity,'1');if(i<3)assert.equal(el('nextLyric').textContent,fullSpider[i+1]);
 if(i===0){crawlPositions.push(crawlY('currentLyric'));await advance(2000);crawlPositions.push(crawlY('currentLyric'));await advance(2000);crawlPositions.push(crawlY('currentLyric'));await advance(3800);}else await advance(7800);
 assert.equal(el('currentLyric').textContent,fullSpider[i]);assert.equal(el('currentLyric').style.opacity,'1');assert(Math.abs(crawlY('nextLyric')-crawlY('currentLyric')-70)<1e-8);
 if(i<3){const upcoming=crawlY('nextLyric');await advance(200);assert(Math.abs(crawlY('currentLyric')-upcoming)<3,'Upcoming phrase jumped when becoming active');}
}
check('Spider holds four full sentences through measures 1–4, 5–8, 9–12, and 13–16',()=>{assert.equal(run('stageCues().filter(c=>c.start<96).map(c=>c.start).join()'),'0,24,48,72');});
check('Both lyric phrases crawl continuously at the song tempo and hand off without a positional jump',()=>{assert(crawlPositions[0]>crawlPositions[1]&&crawlPositions[1]>crawlPositions[2]);assert(Math.abs((crawlPositions[0]-crawlPositions[1])-17.5)<1e-7);assert(Math.abs((crawlPositions[1]-crawlPositions[2])-17.5)<1e-7);});
run('stop();');await run('start()');await advance(2100);run('pause();');const pausedCrawl=crawlY('currentLyric');await advance(1000);assert.equal(crawlY('currentLyric'),pausedCrawl);await run('start()');await advance(1000);
check('Pause freezes the lyric crawl and resume continues from the same position',()=>{assert(crawlY('currentLyric')<pausedCrawl);assert(pausedCrawl-crawlY('currentLyric')<9);});run('stop();');
el('motionToggle').checked=false;el('motionToggle').onchange();await run('start()');await advance(4100);assert.equal(crawlY('currentLyric'),70);assert.equal(crawlY('nextLyric'),140);await advance(4100);
check('Motion off keeps both phrases stationary and fully opaque while the correct cue advances',()=>{assert.equal(el('currentLyric').textContent,fullSpider[1]);assert.equal(crawlY('currentLyric'),70);assert.equal(crawlY('nextLyric'),140);assert.equal(el('currentLyric').style.opacity,'1');assert.equal(el('nextLyric').style.opacity,'1');assert.equal(el('departingLyric').hidden,true);});
run('stop();');el('motionToggle').checked=true;el('motionToggle').onchange();run("$('stage').hidden=true;");
run("loadSong(testStarter('Itsy Bitsy Spider'),false);$('countIn').checked=false;");await run('start()');await advance(8070);
check('The sung phrase stays fully visible through its last beat, with no early fade',()=>{assert.equal(el('currentLyric').textContent,fullSpider[0]);assert.equal(el('currentLyric').style.opacity,'1');assert.equal(el('departingLyric').hidden,true);assert.equal(el('nextLyric').style.opacity,'1');});
const outgoingY=crawlY('currentLyric'),incomingY=crawlY('nextLyric');await advance(20);
check('At the cue boundary the completed line lingers and the new preview begins transparent',()=>{assert.equal(el('departingLyric').textContent,fullSpider[0]);assert.equal(el('departingLyric').hidden,false);assert(+el('departingLyric').style.opacity>.99);assert(Math.abs(crawlY('departingLyric')-outgoingY)<1);assert.equal(el('currentLyric').textContent,fullSpider[1]);assert.equal(el('currentLyric').style.opacity,'1');assert(Math.abs(crawlY('currentLyric')-incomingY)<1);assert.equal(el('nextLyric').textContent,fullSpider[2]);assert(+el('nextLyric').style.opacity<.01);});
await advance(280);
const outgoingOpacity=+el('departingLyric').style.opacity,incomingOpacity=+el('nextLyric').style.opacity;
assert(outgoingOpacity>0&&outgoingOpacity<1);assert(incomingOpacity>0&&incomingOpacity<1);assert(crawlY('departingLyric')<0);run('pause();');await advance(1000);
check('Pausing freezes both fades as well as the upward crawl',()=>{assert.equal(+el('departingLyric').style.opacity,outgoingOpacity);assert.equal(+el('nextLyric').style.opacity,incomingOpacity);assert.equal(el('currentLyric').style.opacity,'1');});
await run('start()');await advance(1000);
check('The completed line clears and the preview becomes fully readable early in the next phrase',()=>{assert.equal(el('departingLyric').hidden,true);assert.equal(el('nextLyric').style.opacity,'1');assert.equal(el('currentLyric').style.opacity,'1');assert.equal(el('currentLyric').textContent,fullSpider[1]);});
run('stop();song.loop=true;');await run('start(15)');await advance(2100);
check('The last sung line fades after a loop wraps directly to the opening phrase',()=>{assert.equal(el('departingLyric').textContent,fullSpider[3]);assert.equal(el('departingLyric').hidden,false);assert.equal(el('currentLyric').textContent,fullSpider[0]);assert.equal(el('currentLyric').style.opacity,'1');});
run('seek(8);');assert.equal(el('departingLyric').hidden,true);run('stop();');
run("loadSong({...template('Our short song','4/4',120,'basic-4',['C'],[[0,'Our final sung phrase']],''),playCount:1},false);$('countIn').checked=false;");await run('start()');await advance(2100);
check('A song without an extra ending measure fades its final lyric only after the cutoff',()=>{assert.equal(c.UkeStrum.state.state,'finished');assert.equal(el('currentLyric').textContent,'');assert.equal(el('nextLyric').textContent,'');assert.equal(el('departingLyric').textContent,'Our final sung phrase');assert.equal(el('departingLyric').hidden,false);});
await advance(800);assert.equal(el('departingLyric').hidden,true);run('stop();');
for(const [title,control] of [['Hot Cross Buns','stageLoop'],['Itsy Bitsy Spider','loopToggle']]){
 c.flowTitle=title;run("loadSong(testStarter(flowTitle),false);song.loop=true;$('countIn').checked=false;window.flowEvents=[];window.originalFlowStep=scheduleSongStep;scheduleSongStep=(tick,time)=>{flowEvents.push({tick,time});originalFlowStep(tick,time);};");
 const period=run('windowBounds().end*duration()*1000'),musicalSteps=run('windowBounds().end'),unit=run('duration()');
 await run('start()');await advance(period*2+380);
 const beforePhase=run('mappedTick((ctx.currentTime-transport.origin)/duration())'),beforeGate=run('gate'),generation=run('transport.generation');
 el(control).value='once';el(control).onchange({target:el(control)});
 assert.equal(c.UkeStrum.state.state,'playing');assert.equal(run('transport.generation'),generation);assert.equal(run('gate'),beforeGate);assert(Math.abs(run('(ctx.currentTime-transport.origin)/duration()')-beforePhase)<1e-7);
 await advance(run('(windowBounds().end*duration()-(ctx.currentTime-transport.origin))*1000')+150);
 check(title+' exits after the current pass, without a count-in, restart, or extra loop measure',()=>{
  assert.equal(c.UkeStrum.state.state,'finished');const events=c.flowEvents;assert.equal(events.filter(e=>e.tick===musicalSteps).length,1);let wraps=0;for(let i=1;i<events.length;i++){assert(Math.abs(events[i].time-events[i-1].time-unit)<1e-7);if(events[i].tick===0&&events[i-1].tick===musicalSteps-1)wraps++;}assert.equal(wraps,2);
 });run('stop();scheduleSongStep=originalFlowStep;');
}
run("loadSong(testStarter('Hot Cross Buns'),false);song.loop=true;$('countIn').checked=false;");await run('start()');
await advance(run('windowBounds().end*duration()*1000')+20);
const queuedGate=run('gate');assert(run('transport.queue.some(ev=>ev.tick===0&&ev.absolute>0)'));
run('setLoop(false)');
check('Loop off replaces an already queued repeat downbeat with the ending on the same beat',()=>{assert.notEqual(run('gate'),queuedGate);assert.equal(queuedGate.gain.value,0);assert(run('transport.queue.some(ev=>ev.tick===32)'));assert(!run('transport.queue.some(ev=>ev.tick===0&&ev.absolute>0)'));});
await advance(run('config().steps*duration()*1000')+200);assert.equal(c.UkeStrum.state.state,'finished');assert.equal(el('finishMessage').hidden,false);run('stop();');assert.equal(el('finishMessage').hidden,true);
run("loadSong(testStarter('Hot Cross Buns'),false);$('countIn').checked=false;");await run('start()');await advance(run('(totalSteps()-config().steps)*duration()*1000')+20);
assert(run('transport.queue.some(ev=>ev.tick===32)'));run('setLoop(true)');await advance(100);
check('Turning looping on replaces an already queued ending with the next round',()=>{assert.equal(c.UkeStrum.state.state,'playing');assert(c.UkeStrum.state.tick<8);assert.equal(el('stageStatus').textContent,'Measure 1 / 4');assert.equal(el('currentLyric').textContent,'Hot cross buns!');assert.equal(el('stageStrums').dataset.ending,'false');});run('stop();');
run("loadSong(testStarter('Hot Cross Buns'),false);song.loop=true;");await run('start()');await advance(run('windowBounds().end*duration()*2000')+500);run('pause();');const pausedTick=run('mappedTick(transport.pos/duration())');run('setLoop(false)');
check('Turning looping off while paused preserves the current position after multiple rounds',()=>{assert.equal(c.UkeStrum.state.state,'paused');assert(Math.abs(run('transport.pos/duration()')-pausedTick)<1e-7);});
await run('start()');await advance(run('(windowBounds().end*duration()-(ctx.currentTime-transport.origin))*1000')+200);assert.equal(c.UkeStrum.state.state,'finished');run("stop();$('countIn').checked=true;");
run('loadSong(testStarter("The Farmer in the Dell"),false);window.countClicks=[];window.normalClick=click;window.normalCompoundStep=scheduleSongStep;window.compoundSteps=[];click=(time,accent)=>{countClicks.push({time,accent});normalClick(time,accent);};scheduleSongStep=(tick,time)=>{compoundSteps.push({tick,time});normalCompoundStep(tick,time);};');
const compoundStarted=now/1000;await run('start()');const compoundLabels=[];
for(let i=0;i<4;i++){await advance(i?1000:100);compoundLabels.push(el('currentLyric').textContent);assert.equal(el('stageBeats').children.filter(x=>x.classList.contains('on')).map(x=>+x.dataset.step).join(),String(i*3));}
check('6/8 counts 1, 2, Ready, Sing across two measures with four big-beat clicks',()=>{
 assert.equal(compoundLabels.join('|'),'1|2|Ready|Sing');
 assert.equal(el('stageStatus').textContent,'Count-in · 4 of 4');assert.equal(el('nextCount').textContent,'Start after 4');
 assert.equal(el('stageBeats').innerHTML.match(/>[1-4]<\/span>/g).join(''),'>1</span>>2</span>>3</span>>4</span>');
 assert.equal(c.countClicks.length,4);assert.equal(c.countClicks.map(x=>x.accent?1:0).join(), '1,0,1,0');
 for(let i=1;i<4;i++)assert(Math.abs(c.countClicks[i].time-c.countClicks[i-1].time-1)<1e-8);
 assert.equal(el('heroCountIn').textContent,'4 big beats to get ready');assert.equal(el('countInLabel').textContent,'4 big beats · 2-measure count-in');
});
await advance(600);
check('Each compound intro pulse stays highlighted through all three eighth-note subdivisions',()=>{assert.equal(el('currentLyric').textContent,'Sing');assert.equal(el('stageBeats').children.filter(x=>x.classList.contains('on')).map(x=>+x.dataset.step).join(),'9');assert.equal(c.compoundSteps.length,0);});
await advance(400);
check('The first strum enters after four dotted-quarter beats and normal 6/8 subdivisions resume',()=>{
 assert.equal(c.UkeStrum.song.tempo,60);assert.equal(c.UkeStrum.state.tick,0);assert.equal(el('currentLyric').textContent,'The farmer in the dell,');
 assert.equal(c.compoundSteps[0].tick,0);assert(Math.abs(c.compoundSteps[0].time-compoundStarted-.08-4)<1e-8);
 assert.equal(run('countInSteps()*duration()'),4);assert.equal(run('slotLabel(3)'), 'Count 4');assert.equal(run('duration()*config().steps'),2);
 assert(!el('patternVisual').innerHTML.includes('>la<'));assert(el('patternVisual').innerHTML.includes('<small>6</small>'));
 assert.equal(el('stageBeats').children.length,6);
});
check('Saved 6/8 instructions and New Song describe the four-beat intro while teacher notes stay intact',()=>{
 c.legacyDescription='One-chord practice · Feel two big beats: ONE-la-li, TWO-la-li.';
 assert.equal(run('normalizeSong({...testStarter("The Farmer in the Dell"),description:legacyDescription}).description'),'One-chord practice · Two big beats per measure. Count in “1, 2, Ready, Sing.”');
 c.legacyDescription='Two chords · Count 1–2–3 | 4–5–6. Sing “The” on count 6 before the first measure.';
 assert.equal(run('normalizeSong({...testStarter("Itsy Bitsy Spider"),description:legacyDescription}).description'),run('testStarter("Itsy Bitsy Spider").description'));
 assert.equal(run("normalizeSong({...testStarter('The Farmer in the Dell'),description:'My own teacher note'}).description"),'My own teacher note');
 el('newSongMeter').value='6/8';run('updateNewSongHint()');assert.equal(el('newSongCountHint').textContent,'Two measures to get ready: 1 · 2 · Ready · Play, on four big beats.');
});run('stop();click=normalClick;scheduleSongStep=normalCompoundStep;');
run("loadSong({...template('Compound strumming','6/8',60,'compound-6',['C','F'],[],'','')},false);$('countIn').checked=true;");await run('start()');await advance(3100);
check('Compound songs without sung lyrics finish the count-in with Play',()=>{assert.equal(el('currentLyric').textContent,'Play');assert.equal(el('endingCue').textContent,'1 · 2 · Ready · Play');});
run('pause()');const compoundPaused=c.UkeStrum.state.pos;await advance(800);assert.equal(c.UkeStrum.state.pos,compoundPaused);await run('start()');await advance(650);assert.equal(c.UkeStrum.state.tick,0);assert.equal(run('countingDisplay'),true);await advance(500);
check('Pausing a compound intro preserves the remaining big beat before music starts',()=>{assert.equal(run('countingDisplay'),false);assert.equal(c.UkeStrum.state.state,'playing');assert.equal(el('currentLyric').textContent,'Strum together');});run('stop();');
run("loadSong(testStarter('Itsy Bitsy Spider'),false);activeRange={start:4,end:8,loop:true};countClicks=[];click=(time,accent)=>{countClicks.push({time,accent});normalClick(time,accent);};");await run('start()');await advance(3100);assert.equal(el('currentLyric').textContent,'Sing');assert.equal(el('nextLyric').textContent,'Down came the rain and washed the spider out.');await advance(1200);
check('Compound practice passages count four big beats and start on the selected measure',()=>{assert.equal(el('currentLyric').textContent,'Down came the rain and washed the spider out.');assert.equal(c.UkeStrum.state.tick,24);assert.equal(c.countClicks.length,4);});
await advance(8100);
check('Repeating a compound passage adds no extra count-in or click subdivisions',()=>{assert.equal(c.countClicks.length,4);assert.equal(c.UkeStrum.state.state,'playing');assert.equal(el('currentLyric').textContent,'Down came the rain and washed the spider out.');});run('stop();activeRange=null;click=normalClick;');
run('loadSong(testStarter(\"London Bridge\"),false)');await run('start()');const labels=[];for(let i=0;i<4;i++){await advance(i?750:100);labels.push(el('currentLyric').textContent)}
check('2/4 plays a four-beat intro at 80 BPM',()=>{assert.equal(labels.join('|'),'Get ready… 1|Get ready… 2|Get ready… 3|Get ready… 4');assert.equal(c.UkeStrum.song.tempo,80);assert(el('stageBeats').innerHTML.includes('>4</span>'))});await advance(750);
check('Intro changes to two-beat measures on the first lyric',()=>{assert.equal(el('currentLyric').textContent,'London Bridge is falling down,');assert.equal(run('countingDisplay'),false);assert.equal(c.UkeStrum.state.tick,0)});run('stop()');
run('loadSong(testStarter(\"London Bridge\"),false)');await run('start()');await advance(900);run('pause()');const introPos=c.UkeStrum.state.pos;await advance(500);assert.equal(c.UkeStrum.state.pos,introPos);await run('start()');await advance(2350);
check('Pause/resume preserves the remaining intro',()=>assert.equal(el('currentLyric').textContent,'London Bridge is falling down,'));run('stop()');
run('loadSong(practiceSong(),false);practiceRange(2,4,true)');await Promise.resolve();await advance(100);
check('A passage has a fresh intro and previews its own first chord and lyric',()=>{assert.equal(el('currentChord').textContent,'G7');assert.equal(el('nextLyric').textContent,'Lou, lou, skip to my lou,');assert.equal(el('currentLyric').textContent,'Get ready… 1')});await advance(9500);
check('Passage repeats only the selected measures',()=>{assert.equal(c.UkeStrum.state.state,'playing');assert(c.UkeStrum.state.tick>=16&&c.UkeStrum.state.tick<32);assert.equal(run('windowBounds().start'),16);assert.equal(run('windowBounds().end'),32)});run('stop();activeRange=null');
run("loadSong(testStarter(\"Hot Cross Buns\"),false);song.tempo=200;$('countIn').checked=false;");await run('start()');await advance(run('totalSteps()*duration()*1000')+200);
check('A performance shows Well played only at the cutoff',()=>{assert.equal(el('finishMessage').hidden,false);assert.equal(c.UkeStrum.state.state,'finished');assert.equal(el('currentLyric').textContent,'');assert.equal(el('nextLyric').textContent,'');assert.equal(el('endingCue').textContent,'');assert.equal(c.UkeStrum.state.queue.length,0)});
check('The finish has no popping music-note layer',()=>assert.equal(el('celebration'),null));
check('Reopening the completed stage keeps Well played in the lyric area',()=>{el('performBtn').click();assert.equal(el('finishMessage').hidden,false);assert.equal(el('currentLyric').textContent,'');assert.equal(el('nextLyric').textContent,'');});
const notesFinishedSound=soundEvents;
check('The menu stays hidden while the finish words arrive',()=>assert.equal(el('finishMenu').hidden,true));
await advance(1900);assert.equal(el('finishMenu').hidden,true);await advance(1100);
check('The menu appears after the wave entrance and returns to Play with the same song',()=>{
 assert.equal(el('finishMenu').hidden,false);const selectedSong=JSON.stringify(c.UkeStrum.song);
 run("setView('create')");el('finishMenu').click();
 assert.equal(el('stage').hidden,true);assert.equal(el('editor').inert,false);assert.equal(el('playView').hidden,false);assert.equal(el('createView').hidden,true);assert.equal(body.style.overflow,'');assert.equal(JSON.stringify(c.UkeStrum.song),selectedSong);
});
check('Well played persists without extra sound, including when motion is switched off',()=>{
 assert.equal(el('finishMessage').hidden,false);assert.equal(el('currentLyric').textContent,'');assert.equal(el('nextLyric').textContent,'');assert.equal(soundEvents,notesFinishedSound);
 el('motionToggle').checked=false;el('motionToggle').onchange();assert.equal(el('finishMessage').hidden,false);
 el('motionToggle').checked=true;el('motionToggle').onchange();run('stop();');assert.equal(el('finishMessage').hidden,true);
});
run("finish();$('performBtn').click()");await advance(1000);run('stop(false)');await advance(2000);
check('Stopping before the menu reveal cancels it completely',()=>{assert.equal(el('finishMenu').hidden,true);assert.equal(run('finishMenuTimer'),0);});
run("$('motionToggle').checked=false;$('motionToggle').onchange();finish();$('performBtn').click()");await advance(1100);
check('The menu remains available with motion disabled',()=>assert.equal(el('finishMenu').hidden,false));
run("stop();$('motionToggle').checked=true;$('motionToggle').onchange()");
run('loadSong(testStarter(\"Hot Cross Buns\"),false);song.tempo=200;song.loop=true');await run('start()');await advance(run('windowBounds().end*duration()*1000')+350);
check('Whole-song loops return to their opening cue without showing a finish message',()=>{assert.equal(el('finishMessage').hidden,true);assert.equal(el('finishMenu').hidden,true);assert.equal(c.UkeStrum.state.state,'playing');assert(c.UkeStrum.state.tick<8);assert.equal(el('currentLyric').textContent,'Hot cross buns!')});run('stop()');
run("loadSong(practiceSong(),false);song.title='My working draft';changed();");await advance(400);const draft=store.get('uke-strum-draft-v2'),snapshot=JSON.stringify(c.UkeStrum.song);run('openChallenge()');
check('Challenge chooses real song chords and creates a temporary practice score',()=>{assert.equal(el('challengeA').value,'C');assert.equal(el('challengeB').value,'G7');assert.equal(c.UkeStrum.song.meter,'4/4');assert.equal(run('!!exerciseBackup'),true);assert.equal(c.UkeStrum.song.tempo,72)});
await run('start()');await advance(5000);run('awardStar();awardStar();awardStar();');
check('Class stars are awarded by the teacher, capped at three',()=>{assert.equal(run('challengeStars'),3);assert(el('teamMessage').textContent.includes('team'));assert.equal(store.get('uke-strum-draft-v2'),draft)});
run('nextChallengeLevel()');check('Next challenge level shortens preparation while keeping tempo',()=>{assert.equal(el('challengeBeats').value,'2');assert.equal(c.UkeStrum.song.meter,'2/4');assert.equal(c.UkeStrum.song.tempo,72);assert.equal(run('countInBeats()'),4);assert.equal(run('challengeStars'),0)});run('closeClass()');
check('Leaving practice restores the exact working song and dirty state',()=>{assert.equal(JSON.stringify(c.UkeStrum.song),snapshot);assert.equal(run('dirty'),true);assert.equal(run('exerciseBackup'),null)});
run('openLesson(0)');check('Guided lesson shows the actual song chords',()=>{assert(el('classContent').innerHTML.includes('data-hear="G7"'));assert(el('classContent').innerHTML.includes('Fingers ready'))});await action({lesson:'2'});
check('Strum lesson uses the song pattern at a slower practice tempo',()=>{assert.equal(c.UkeStrum.song.pattern,'basic-4');assert.equal(c.UkeStrum.song.tempo,68);assert.equal(run('lessonStep'),2)});await action({lesson:'3'});
check('Whole-song lesson restores song settings before performance',()=>{assert.equal(c.UkeStrum.song.title,'My working draft');assert.equal(c.UkeStrum.song.tempo,80);assert.equal(run('exerciseBackup'),null);assert(el('classContent').innerHTML.includes('Open the stage'))});run('closeClass()');
run('loadSong(practiceSong(),false);song.measures[0].sectionStart="Verse";song.measures[4].sectionStart="Chorus";openSections();sectionAction("duplicate",1)');
check('Duplicating a section keeps its chords, lyrics, and label together',()=>{assert.equal(c.UkeStrum.song.measures.length,13);assert.equal(c.UkeStrum.song.measures[8].sectionStart,'Chorus copy');assert.equal(c.UkeStrum.song.measures[8].lyric,'Lou, lou, skip to my lou,')});run('sectionAction("up",2)');
check('Reordering sections moves complete blocks and can be undone',()=>{assert.equal(c.UkeStrum.song.measures[4].sectionStart,'Chorus copy');el('undoBtn').click();assert.equal(c.UkeStrum.song.measures[8].sectionStart,'Chorus copy')});run('closeClass()');
run('openBand();setMix("ukulele",0);song.band.enabled=true;song.band.melody=20;');const beforeSounds=soundEvents;await run('start()');await advance(1000);
check('Band schedules from the audio clock even with ukulele volume at zero',()=>{assert(soundEvents>beforeSounds);assert.equal(run('ukeBus.gain.value'),0);assert.equal(run('master.gain.value'),.8)});run('pause();setMix("ukulele",43);closeClass()');
check('Independent ukulele mixer changes persist in the song',()=>assert.equal(c.UkeStrum.song.band.ukulele,43));
run('openSetlists()');await action({setlistNew:''});await action({setlistAddCurrent:''});const savedSnapshot=run('JSON.stringify(currentSetlist().songs[0])');run("song.title='Changed after adding';");
check('Setlists keep independent song snapshots',()=>{assert.equal(run('JSON.stringify(currentSetlist().songs[0])'),savedSnapshot);assert.equal(JSON.parse(store.get('uke-strum-setlists-v1'))[0].songs.length,1)});
await run("importSetlist({size:100,text:async()=>JSON.stringify({format:'uke-strum-setlist',name:'Imported',songs:[testStarter(\"London Bridge\")]})})");
check('Export-format setlists import with meter and tempo intact',()=>{assert.equal(run('currentSetlist().name'),'Imported');assert.equal(run('currentSetlist().songs[0].tempo'),80)});run('closeClass();loadSong(practiceSong(),false);song.title="École 🌴";song.theme="moonlight";song.band.enabled=true;song.measures[0].sectionStart="Verse";');
const shared=run('encodeShared(song)');c.shared=shared;const sharedSong=run('decodeShared(shared)');
check('Share links round-trip Unicode, chords, sections, and mixer without a saved-song ID',()=>{assert.equal(sharedSong.title,'École 🌴');assert.equal(sharedSong.theme,'moonlight');assert.equal(sharedSong.id,null);assert.equal(sharedSong.band.enabled,true);assert.equal(sharedSong.measures[0].sectionStart,'Verse')});
run('previewSong(decodeShared(shared))');check('Shared preview is read-only until making a copy',()=>{assert.equal(run('isViewer'),true);assert.equal(el('editor').inert,true);assert.equal(el('sharePreview').hidden,false)});run('closePreview(true)');
check('Make my own copy produces a new editable draft',()=>{assert.equal(run('isViewer'),false);assert.equal(el('editor').inert,false);assert.equal(c.UkeStrum.song.id,null);assert(c.UkeStrum.song.title.includes('my copy'));assert.equal(run('dirty'),true)});
run('openShare();downloadFile=(text,name,type)=>{window.downloadResult={text,name,type};}');await run('downloadPlayer()');
check('Portable player contains all scripts and CSS with a safe embedded song',()=>{const d=c.downloadResult;assert(d);assert(d.name.endsWith('.html'));assert(d.text.includes('window.PORTABLE_SONG='));assert(!/^<script src=/m.test(d.text));assert(!/^<link rel="stylesheet"/m.test(d.text));assert(d.text.includes('function songArtwork'));assert(d.text.includes('.beach-header'));assert(d.text.includes('École 🌴'))});
check('Portable player embeds every collage scene with identical image bytes',()=>{
 const match=c.downloadResult.text.match(/window\.EMBEDDED_ART=(.*?);window\.EMBEDDED_SOUNDBANK=/);assert(match);
 const embedded=JSON.parse(match[1]);const paths=run('COLLAGE_ART_ASSETS');assert.equal(Object.keys(embedded).length,19);
 for(const asset of paths){const expected=fs.readFileSync(path.join(root,'dist',asset));assert(Buffer.from(embedded[asset].split(',')[1],'base64').equals(expected));}
 c.EMBEDDED_ART=embedded;run('isViewer=true;initSplash();isViewer=false');assert(el('splashEmblem').src.startsWith('data:image/png;base64,'));assert(run("songArtwork(4,'hero')").includes('src="data:image/webp;base64,'));assert(run("stageArtwork('sunset','test')").includes('src="data:image/webp;base64,'));delete c.EMBEDDED_ART;
});
check('Portable players include the same complete SoundFont bank and its credit',()=>{const match=c.downloadResult.text.match(/window\.EMBEDDED_SOUNDBANK=(.*?);window\.PORTABLE_SONG=/);assert(match);const bank=JSON.parse(match[1]),original=JSON.parse(fs.readFileSync(path.join(root,'dist/assets/audio/classroom-band.json')));assert.equal(JSON.stringify(bank),JSON.stringify(original));assert(bank.license.includes('S. Christian Collins')||bank.author==='S. Christian Collins');for(const script of c.downloadResult.text.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);});
check('HTML-like song content is escaped and survives share encoding',()=>{run("song.title='</script><img src=x onerror=alert(1)>';song.measures[0].sectionStart='<img src=x>';renderMeasures()");assert(!el('measuresGrid').innerHTML.includes('<img'));assert.equal(run('decodeShared(encodeShared(song)).title'),'</script><img src=x onerror=alert(1)>')});
await run('downloadPlayer()');check('Portable song payload cannot close its embedding script',()=>{const payload=c.downloadResult.text.split('window.PORTABLE_SONG=')[1].split(';</script>')[0];assert(!payload.includes('</script>'));assert(payload.includes('\\u003c'))});
check('Every starter and new or legacy song defaults to Play once, while saved Twice and Loop choices persist',()=>{
 assert(c.UkeStrum.starters.every(s=>s.playCount===1&&!s.loop));
 run("window.oldPlayback=clone(STARTERS[0]);delete oldPlayback.playCount;");assert.equal(run('normalizeSong(oldPlayback).playCount'),1);assert.equal(run('normalizeSong({...oldPlayback,playCount:2}).playCount'),2);assert.equal(run('normalizeSong({...oldPlayback,loop:true}).loop'),true);
 el('newSong').click();el('newSongForm').onsubmit({preventDefault(){}});assert.equal(c.UkeStrum.song.playCount,1);assert.equal(el('loopToggle').value,'once');assert.equal(el('stageLoop').value,'once');assert.equal(el('playbackBadge').textContent,'Play once');
 el('loopToggle').onchange({target:{value:'once'}});assert.equal(c.UkeStrum.song.playCount,1);assert.equal(el('stageLoop').value,'once');
 el('stageLoop').onchange({target:{value:'twice'}});assert.equal(run('decodeShared(encodeShared(song)).playCount'),2);el('stageLoop').onchange({target:{value:'loop'}});assert.equal(c.UkeStrum.song.loop,true);assert.equal(el('loopToggle').value,'loop');
});
run('window.twiceOriginals={scheduleSongStep,strum,playBandEvent,click};window.twiceSteps=[];window.twiceStrums=[];window.twiceBand=[];window.twiceClicks=[];scheduleSongStep=(tick,time,phase)=>{twiceSteps.push({tick,time,phase});twiceOriginals.scheduleSongStep(tick,time,phase);};strum=(chord,time,v,up)=>{twiceStrums.push({chord,time,up});twiceOriginals.strum(chord,time,v,up);};playBandEvent=(event,time)=>{twiceBand.push({event,time});twiceOriginals.playBandEvent(event,time);};click=(time,accent)=>{twiceClicks.push({time,accent});twiceOriginals.click(time,accent);};');
for(let i=0;i<c.UkeStrum.starters.length;i++){
 run(`loadSong({...STARTERS[${i}],playCount:2},false);$('countIn').checked=true;$('metronomeToggle').checked=false;twiceSteps=[];twiceStrums=[];twiceBand=[];twiceClicks=[];`);
 const before=now/1000,unit=run('duration()'),intro=run('countInSteps()'),n=run('config().steps'),bodySteps=run('totalSteps()-config().steps'),originalMeasures=JSON.stringify(c.UkeStrum.song.measures),firstChord=c.UkeStrum.song.measures[0].chords[0].chord;
 await run('start()');await advance((intro+bodySteps)*unit*1000+100);
 assert.equal(c.UkeStrum.state.state,'playing');assert.equal(c.UkeStrum.state.tick,0);assert.equal(el('finishMessage').hidden,true);assert.equal(el('stageStatus').textContent,'Pass 2 of 2 · Measure 1');assert.equal(el('currentChord').textContent,firstChord);
 await advance((bodySteps+n)*unit*1000+100);
 check(c.UkeStrum.starters[i].title+' plays twice continuously, then one last-chord ukulele and bass ending',()=>{
  assert.equal(c.UkeStrum.state.state,'finished');assert.equal(el('finishMessage').hidden,false);
  const expected=[...Array(bodySteps).keys(),...Array(bodySteps).keys(),...Array.from({length:n},(_,j)=>bodySteps+j)];assert.deepEqual(Array.from(c.twiceSteps,e=>e.tick),expected);
  for(let j=1;j<c.twiceSteps.length;j++)assert(Math.abs(c.twiceSteps[j].time-c.twiceSteps[j-1].time-unit)<1e-7);
  assert.equal(c.twiceClicks.length,run('countInCounts()'));assert(Math.abs(c.twiceSteps[0].time-before-.08-intro*unit)<1e-7);
  const endingTime=before+.08+(intro+bodySteps*2)*unit,finalStrums=c.twiceStrums.filter(e=>e.time>=endingTime-.001),finalBand=c.twiceBand.filter(e=>e.time>=endingTime-.001);
  assert.equal(finalStrums.length,1);assert.equal(finalStrums[0].up,false);assert.equal(finalStrums[0].chord,c.UkeStrum.song.measures.slice(0,-1).flatMap(m=>m.chords).filter(c=>c.chord!=='--').at(-1).chord);
  assert.equal(finalBand.length,1);assert.equal(finalBand[0].event.instrument,'bass');assert.equal(finalBand[0].time,finalStrums[0].time);assert.equal(finalBand[0].event.length,n*unit);
  assert.equal(JSON.stringify(c.UkeStrum.song.measures),originalMeasures);assert.equal(c.UkeStrum.state.queue.length,0);
 });run('stop();');
}
run("loadSong({...template('Our own ending','4/4',120,'basic-4',['C',['C','F'],'--'],[[0,'One'],[1,'Two'],[2,'Rest']],'',''),playCount:2,band:{enabled:true}},false);$('countIn').checked=false;twiceSteps=[];twiceStrums=[];twiceBand=[];");
await run('start()');await advance(14100);
check('A custom song adds one performance-only ending on its last played chord, even after a rest',()=>{
 assert.equal(c.UkeStrum.state.state,'finished');assert.equal(c.UkeStrum.song.measures.length,3);assert.equal(c.twiceSteps.length,56);assert.equal(c.twiceSteps.filter(e=>e.tick===0).length,2);assert.equal(c.twiceStrums.at(-1).chord,'F');assert.equal(c.twiceBand.at(-1).event.instrument,'bass');assert.equal(c.twiceBand.at(-1).event.note%12,5);assert.equal(c.twiceStrums.filter(e=>e.time>=c.twiceSteps[48].time-.001).length,1);
});run('stop();({scheduleSongStep,strum,playBandEvent,click}=twiceOriginals);');
run("loadSong({...STARTERS[12],playCount:2},false);$('countIn').checked=false;");await run('start()');await atPickupPhase(62.1);const firstRepeatKey=run('lyricDisplay.key');assert.equal(el('currentLyric').textContent,pickupText);await atPickupPhase(64.1);
check('The first repeat keeps the pickup line continuous across its downbeat',()=>{assert.equal(run('lyricDisplay.key'),firstRepeatKey);assert.equal(run('lyricDisplay.start'),62);assert.equal(el('currentLyric').style.opacity,'1');});
await atPickupPhase(70.5);run('pause();');const twicePaused=c.UkeStrum.state.pos,twicePausedText=el('currentLyric').textContent;await advance(700);await run('start()');await advance(200);
check('Pause and resume retain the second pass without adding another count-in',()=>{assert(c.UkeStrum.state.pos>=twicePaused);assert.equal(el('currentLyric').textContent,twicePausedText);assert.equal(run('countingDisplay'),false);assert(run('(ctx.currentTime-transport.origin)/duration()>70'));});
await atPickupPhase(126.1);
check('The last line of pass two holds to the final chord without previewing a third pass',()=>{assert.equal(el('currentLyric').textContent,'When she comes.');assert.equal(el('nextLyric').textContent,'One final strum ↓');assert.equal(el('currentLyric').style.opacity,'1');});
await atPickupPhase(128.1);assert.equal(el('currentLyric').textContent,'One final strum ↓');await atPickupPhase(136.1);assert.equal(c.UkeStrum.state.state,'finished');run('stop();');
run("loadSong({...STARTERS[2],playCount:2},false);$('countIn').checked=false;");await run('start()');await atPickupPhase(34.2);run('pause();seek(2);');
check('Seeking while paused on pass two stays on pass two',()=>{assert.equal(run('transport.pos/duration()'),48);assert.equal(c.UkeStrum.state.tick,16);assert.equal(c.UkeStrum.state.state,'paused');});
await run('start()');await atPickupPhase(72.1);assert.equal(c.UkeStrum.state.state,'finished');run('stop();');
for(const [phase,mode] of [[10.2,'once'],[40.2,'once'],[31.9,'loop']]){
 run("loadSong({...STARTERS[2],playCount:2},false);$('countIn').checked=false;");await run('start()');await atPickupPhase(phase);const generation=c.UkeStrum.state.generation,before=run('mappedTick((ctx.currentTime-transport.origin)/duration())');c.twiceMode=mode;run('setPlaybackMode(twiceMode)');
 assert.equal(c.UkeStrum.state.generation,generation);assert(Math.abs(run('mappedTick((ctx.currentTime-transport.origin)/duration())')-before)<1e-7);
 if(mode==='once'){await atPickupPhase(40.1);assert.equal(c.UkeStrum.state.state,'finished');}else{await atPickupPhase(65);assert.equal(c.UkeStrum.state.state,'playing');assert.equal(el('finishMessage').hidden,true);}
 run('stop();');
}
check('Changing from Play twice to Once or Loop preserves the current beat and follows the new finish choice',()=>{});
run("loadSong({...STARTERS[2],playCount:1},false);$('countIn').checked=false;");await run('start()');await atPickupPhase(31.8);assert(run('transport.queue.some(e=>e.tick===32)'));run("setPlaybackMode('twice')");await atPickupPhase(32.1);
check('Choosing Play twice replaces a queued ending with the repeat on the same downbeat',()=>{assert.equal(c.UkeStrum.state.tick,0);assert.equal(el('finishMessage').hidden,true);assert.equal(el('stageStatus').textContent,'Pass 2 of 2 · Measure 1');});await atPickupPhase(72.1);assert.equal(c.UkeStrum.state.state,'finished');run('stop();');

run("loadSong({...STARTERS[2],playCount:2},false);$('countIn').checked=false;");
check('The strumming hand lifts slowly and completes its quick downstroke exactly on every beat',()=>{
 for(const phase of [0,2,4,6,32,34,64]){c.handPhase=phase;assert(Math.abs(run('strumHandPose(handPhase).position')-1)<1e-7);assert.equal(run('strumHandPose(handPhase).stroke'),'D');assert.equal(run('strumHandPose(handPhase).striking'),true);}
 assert(run('strumHandPose(.3).position>strumHandPose(.9).position'));assert(run('strumHandPose(.9).position>strumHandPose(1.5).position'));assert(run('strumHandPose(1.5).position<.02'));assert(run('strumHandPose(1.9).position>.85'));
 assert.equal(run('strumHandPose(-2,true).position'),0);assert.equal(run('strumHandPose(-.1,true).striking'),false);assert(run('strumHandPose(-.1,true).position>.85'));
 assert(el('strummingHand'));assert(!el('stageStrums').innerHTML.includes('strum-step'));assert.equal(el('stageBeats').children.length,4);
});
check('Every downstroke, upstroke, and mute lands with its selected pattern, including swing and compound meter',()=>{
 for(const [pattern,definition] of Object.entries(c.UkeStrum.patterns)){
  c.handPattern=pattern;run("loadSong(template('Hand check',STRUM_PATTERNS[handPattern].timeSignature,90,handPattern,['C','C','C','C'],[], '', ''),false);song.swing=song.meter==='6/8'?0:.25;");
  const n=run('config().steps');
  definition.pattern.forEach((event,step)=>{if(event.type==='.')return;c.handPhase=n+step+(c.UkeStrum.song.meter!=='6/8'&&step%2?.25:0);const pose=run('strumHandPose(handPhase)');assert.equal(pose.stroke,event.type);assert.equal(pose.striking,true);assert(Math.abs(pose.position-({D:1,U:0,X:.72}[event.type]))<1e-7);});
 }
 run("loadSong({...STARTERS[2],pattern:'polka-2',meter:'2/4',swing:.25},false)");assert.equal(run('strumHandPose(1.2).stroke'),'D');assert.equal(run('strumHandPose(1.25).stroke'),'U');
});
run("loadSong({...STARTERS[2],playCount:2},false);$('countIn').checked=false;");await run('start()');await atPickupPhase(1.2);run('pause()');const frozenHand=el('strummingHand').style.transform;await advance(500);
check('Pause freezes the exact hand position, while hiding the guide preserves playback',()=>{assert.equal(el('strummingHand').style.transform,frozenHand);assert.equal(el('strumAction').textContent,'Paused');el('strumToggle').onchange({target:{checked:false}});assert.equal(el('stageStrums').hidden,true);assert.equal(c.UkeStrum.state.state,'paused');el('strumToggle').onchange({target:{checked:true}});assert.equal(el('stageStrums').hidden,false);assert.equal(el('strummingHand').style.transform,frozenHand);});
await run('start()');await atPickupPhase(2);assert.equal(+el('stageStrums').dataset.position,1);assert.equal(el('strumAction').textContent,'Down strum');
check('Background-motion settings preserve the teaching gesture, while device reduced motion uses a still hand',()=>{
 body.classList.add('motion-paused');run('updateStrumHand(1.5)');assert(+el('stageStrums').dataset.position<.02);body.classList.remove('motion-paused');
 const match=c.matchMedia;c.matchMedia=()=>({matches:true});run('updateStrumHand(0)');const still=el('strummingHand').style.transform;run('updateStrumHand(1.5)');assert.equal(el('strummingHand').style.transform,still);assert.equal(+el('stageStrums').dataset.position,.4);c.matchMedia=match;
});
await atPickupPhase(64.1);const finalHand=el('strummingHand').style.transform;await atPickupPhase(70);
check('The ending makes just one downstroke and holds still instead of lifting for another strum',()=>{assert.equal(+el('stageStrums').dataset.position,1);assert.equal(el('strummingHand').style.transform,finalHand);assert.equal(el('strumAction').textContent,'Final strum');});await atPickupPhase(72.1);assert.equal(el('strummingHand').style.transform,finalHand);run('stop();');assert.equal(+el('stageStrums').dataset.position,0);
check('Silent measures never produce a hand strike',()=>{run("loadSong(template('Rest check','4/4',80,'basic-4',['--','--','C','C'],[],'',''),false)");assert.equal(run('strumHandPose(2).stroke'),'.');assert.equal(run('strumHandPose(2).striking'),false);assert.equal(run('strumHandPose(16).striking'),true);});

run('closeClass()');check('Unknown chords are rejected before import',()=>assert.throws(()=>run("normalizeSong({measures:[{chords:[{step:0,chord:'BAD'}]}]})")));
run("loadSong(testStarter(\"London Bridge\"),false);$('countIn').checked=true;window.BroadcastChannel=class{constructor(name){this.name=name;this.messages=[];}postMessage(p){this.messages.push(p);}close(){}};window.open=()=>({closed:false,focus(){}});openProjector();");await run('start()');await advance(100);run('broadcastProjection(true);window.projectorPacket=projectorChannel.messages.at(-1)');
check('Projector messages carry the song, four-beat intro phase, and shared transport state',()=>{assert.equal(c.projectorPacket.song.title,'London Bridge');assert.equal(c.projectorPacket.count,-8);assert.equal(c.projectorPacket.state,'playing');assert.equal(c.projectorPacket.song.meter,'2/4')});
run('stop();isProjector=true;isViewer=true;query.set("projector","test-display");initProjector()');const beforeProjection=soundEvents;
check('The student display explains where to press Play before receiving a song',()=>{assert.equal(el('currentLyric').textContent,'Press Play in your teacher window');assert.equal(el('nextLyric').textContent,'Keep the teacher window open for controls and sound.');assert.equal(el('lyricStage').hidden,false);assert.equal(doc.title,'Uke Strum · Student display');});
run('projectorChannel.onmessage({data:{...projectorPacket,state:"stopped",count:null,phase:0,tick:0,song:{...projectorPacket.song,showLyrics:false}}});');
run('projectorChannel.onmessage({data:{...projectorPacket,state:"stopped",count:null,phase:0,tick:0,song:null}});');
check('Waiting instructions survive song updates and repeated stopped packets even with lyrics hidden',()=>{assert.equal(el('currentLyric').textContent,'Press Play in your teacher window');assert.equal(el('nextLyric').textContent,'London Bridge is falling down,');assert.equal(el('lyricStage').hidden,false);assert.equal(el('lyricProgress').hidden,true);assert.equal(el('endingCue').textContent,'Controls and sound stay in the teacher window.');assert.equal(soundEvents,beforeProjection);});
run('projectorChannel.onmessage({data:window.projectorPacket})');
check('Silent projector renders received count-in without creating accompaniment',()=>{assert.equal(el('currentLyric').textContent,'Get ready… 1');assert.equal(el('currentChord').textContent,'C');assert.equal(soundEvents,beforeProjection);assert.equal(el('editor').hidden,true)});
run('projectorChannel.onmessage({data:{...window.projectorPacket,count:null,phase:0,tick:0,song:null}})');
check('Projector switches to two-beat song display and lyric on beat one',()=>{assert.equal(el('currentLyric').textContent,'London Bridge is falling down,');assert.equal(run('countingDisplay'),false);assert.equal(soundEvents,beforeProjection)});
run('projectorChannel.onmessage({data:{...window.projectorPacket,count:null,phase:totalSteps()-config().steps,tick:totalSteps()-config().steps,song:null}})');
check('The silent projector shows the one-strum ending with the down-strumming hand',()=>{assert.equal(el('currentLyric').textContent,'One final strum ↓');assert.equal(el('finishMessage').hidden,true);assert.equal(el('stageStrums').dataset.ending,'true');assert.equal(el('stageStrums').dataset.stroke,'D');assert.equal(soundEvents,beforeProjection)});
run('projectorChannel.onmessage({data:{...window.projectorPacket,count:null,phase:totalSteps()-config().steps/4,tick:totalSteps()-config().steps/4,song:null}})');
check('The projector fades the final-strum prompt with the ending measure',()=>{assert.equal(el('currentLyric').textContent,'One final strum ↓');assert(+el('currentLyric').style.opacity>0&&+el('currentLyric').style.opacity<1);assert.equal(el('finishMessage').hidden,true);});
run('projectorChannel.onmessage({data:{...window.projectorPacket,count:null,state:"finished",finished:true,phase:32,tick:31,song:null}})');
check('Projector receives Well played at the shared cutoff without music notes',()=>{assert.equal(el('finishMessage').hidden,false);assert.equal(el('currentLyric').textContent,'');assert.equal(el('nextLyric').textContent,'');assert.equal(el('celebration'),null);assert.equal(el('endingCue').textContent,'')});
await advance(3000);check('The silent projector keeps the finish message without an inactive menu control',()=>assert.equal(el('finishMenu').hidden,true));
const projectorFinishMessage=el('finishMessage');run('projectorChannel.onmessage({data:{...window.projectorPacket,count:null,state:"finished",finished:true,phase:32,tick:31,song:null}})');
check('Repeated projector finish messages retain the same completion message',()=>{assert.equal(el('finishMessage'),projectorFinishMessage);assert.equal(el('finishMessage').hidden,false);assert.equal(el('celebration'),null);});
run("window.spiderProjection={...window.projectorPacket,song:{...testStarter('Itsy Bitsy Spider'),loop:true},count:null,state:'playing',finished:false,range:null,until:0,phase:95,tick:95};projectorChannel.onmessage({data:spiderProjection});");
check('The projector previews the first whole phrase instead of a skipped ending while looping',()=>{assert.equal(el('currentLyric').textContent,fullSpider[3]);assert.equal(el('nextLyric').textContent,fullSpider[0]);});
run('projectorChannel.onmessage({data:{...spiderProjection,song:null,phase:96,tick:0}});');
check('The projector wraps on the same sixteen-measure boundary as the teacher window',()=>{assert.equal(el('currentLyric').textContent,fullSpider[0]);assert.equal(el('stageStrums').dataset.ending,'false');});
assert.equal(el('departingLyric').textContent,fullSpider[3]);assert.equal(el('currentLyric').style.opacity,'1');await advance(350);
const projectionFade=+el('departingLyric').style.opacity,projectionPreview=+el('nextLyric').style.opacity;
assert(projectionFade>0&&projectionFade<1);assert(projectionPreview>0&&projectionPreview<1);
run('projectorChannel.onmessage({data:{...spiderProjection,song:null,state:"paused",phase:97.05,tick:1}});');
const frozenProjectionFade=el('departingLyric').style.opacity;await advance(900);
check('Projector fades follow the shared music clock and freeze when the teacher pauses',()=>{assert.equal(el('departingLyric').style.opacity,frozenProjectionFade);assert.equal(el('currentLyric').style.opacity,'1');assert.equal(el('currentLyric').textContent,fullSpider[0]);assert.equal(soundEvents,beforeProjection);});
run("window.pickupProjection={...window.projectorPacket,song:{...testStarter('She’ll Be Coming ’Round the Mountain'),loop:true},count:-3,state:'playing',finished:false,range:null,until:0,phase:-2.1,tick:0};projectorChannel.onmessage({data:pickupProjection});");
assert.equal(el('currentLyric').textContent,'Get ready… 3');await advance(100);
check('Silent projector pickup timing advances between teacher packets without starting audio',()=>{assert.equal(el('currentLyric').textContent,pickupText);assert.equal(el('currentLyric').style.opacity,'1');assert(!el('stage').classList.contains('counting'));assert.equal(soundEvents,beforeProjection);});
run("projectorChannel.onmessage({data:{...pickupProjection,song:null,state:'paused',phase:-1.8,count:-2}})");const frozenProjectedPickup=el('currentLyric').style.transform;await advance(600);
check('Pausing the projector during the pickup preserves the line and its exact scroll position',()=>{assert.equal(el('currentLyric').style.transform,frozenProjectedPickup);assert.equal(el('currentLyric').textContent,pickupText);});
run('projectorChannel.onmessage({data:{...pickupProjection,song:null,phase:61.9,tick:61,count:null}})');await advance(100);assert.equal(el('currentLyric').textContent,pickupText);const projectedPickupKey=run('lyricDisplay.key');
run('projectorChannel.onmessage({data:{...pickupProjection,song:null,phase:64.1,tick:0,count:null}})');
check('Projector repeats share the same early lyric entrance and continuous downbeat handoff',()=>{assert.equal(run('lyricDisplay.key'),projectedPickupKey);assert.equal(run('lyricDisplay.start'),62);assert.equal(el('currentLyric').textContent,pickupText);assert.equal(el('finishMessage').hidden,true);assert.equal(soundEvents,beforeProjection);});

run("window.compoundProjection={...projectorPacket,song:testStarter('The Farmer in the Dell'),state:'playing',finished:false,until:0,range:null,tick:0};");
check('Silent projector uses the same four compound count prompts and big-beat dots',()=>{
 for(const [count,label] of [[-12,'1'],[-9,'2'],[-6,'Ready'],[-3,'Sing']]){c.compoundCount=count;run('projectorChannel.onmessage({data:{...compoundProjection,count:compoundCount,phase:compoundCount}})');assert.equal(el('currentLyric').textContent,label);assert.equal(el('stageBeats').children.length,4);}
 assert.equal(soundEvents,beforeProjection);
 run('projectorChannel.onmessage({data:{...compoundProjection,song:null,count:null,phase:0}})');assert.equal(el('currentLyric').textContent,'The farmer in the dell,');assert.equal(el('stageBeats').children.length,6);assert.equal(soundEvents,beforeProjection);
});
run("window.twiceProjection={...projectorPacket,song:{...STARTERS[12],playCount:2},state:'playing',finished:false,count:null,until:0,range:null,phase:62.1,tick:62};projectorChannel.onmessage({data:twiceProjection});");
const twiceProjectorKey=run('lyricDisplay.key');
run('projectorChannel.onmessage({data:{...twiceProjection,song:null,phase:64.1,tick:0}})');
check('The silent student display follows pass two and preserves the pickup through the repeat',()=>{assert.equal(el('currentLyric').textContent,pickupText);assert.equal(run('lyricDisplay.key'),twiceProjectorKey);assert.equal(el('stageStatus').textContent,'Pass 2 of 2 · Measure 1');assert.equal(el('finishMessage').hidden,true);assert.equal(soundEvents,beforeProjection);});
run('projectorChannel.onmessage({data:{...twiceProjection,song:null,phase:126.1,tick:62}})');assert.equal(el('currentLyric').textContent,'When she comes.');assert.equal(el('nextLyric').textContent,'One final strum ↓');
run('projectorChannel.onmessage({data:{...twiceProjection,song:null,phase:128.1,tick:64}})');assert.equal(el('currentLyric').textContent,'One final strum ↓');assert.equal(el('finishMessage').hidden,true);
run("projectorChannel.onmessage({data:{...twiceProjection,song:null,phase:136,tick:71,state:'finished',finished:true}})");
check('The student display waits until the second pass and final chord to show Well played',()=>{assert.equal(el('finishMessage').hidden,false);assert.equal(soundEvents,beforeProjection);});
run('projectorChannel.onmessage({data:{...twiceProjection,phase:1.2,tick:1}})');const projectedHand=el('strummingHand').style.transform;await advance(100);
check('The student hand moves between packets on the shared clock without creating audio',()=>{assert.notEqual(el('strummingHand').style.transform,projectedHand);assert.equal(soundEvents,beforeProjection);});
run("projectorChannel.onmessage({data:{...twiceProjection,song:null,state:'paused',phase:1.4,tick:1}})");const pausedProjectedHand=el('strummingHand').style.transform;await advance(500);
check('The student hand freezes on a pause packet and resumes at the next shared beat',()=>{assert.equal(el('strummingHand').style.transform,pausedProjectedHand);run('projectorChannel.onmessage({data:{...twiceProjection,song:null,phase:2,tick:2}})');assert.equal(+el('stageStrums').dataset.position,1);assert.equal(soundEvents,beforeProjection);});
check('Portable players embed the hand sprite and animation with the rest of the artwork',()=>{assert(c.downloadResult.text.includes('function strumHandPose'));const art=JSON.parse(c.downloadResult.text.match(/window\.EMBEDDED_ART=(.*?);window\.EMBEDDED_SOUNDBANK=/)[1]);assert(art['assets/collage/strumming-hand-front.png'].startsWith('data:image/png;base64,'));assert(art['assets/collage/strumming-ukulele-front.png'].startsWith('data:image/png;base64,'));});
fs.writeFileSync(path.join(require('node:os').tmpdir(),'uke-strum-portable-test.html'),c.downloadResult.text);
fs.writeFileSync(path.join(root,'checks/results.json'),JSON.stringify({method:'Node VM with DOM and AudioContext doubles; no browser rendering or listening',passed:checks},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
