
'use strict';
        const CHORD_FINGERINGS = {
            'C': [0,0,0,3], 'Cm': [0,3,3,3], 'C7': [0,0,0,1], 'Cmaj7':[0,0,0,2], 'D': [2,2,2,0], 'Dm': [2,2,1,0], 'D7': [2,2,2,3],
            'E': [4,4,4,2], 'Em': [0,4,3,2], 'E7': [1,2,0,2], 'F': [2,0,1,0], 'Fm': [1,0,1,3], 'F7': [2,3,1,3], 'G': [0,2,3,2],
            'Gm': [0,2,3,1], 'G7': [0,2,1,2], 'A': [2,1,0,0], 'Am': [2,0,0,0], 'A7': [0,1,0,0], 'Am7': [0,0,0,0], 'B': [4,3,2,2],
            'Bm': [4,2,2,2], 'B7': [2,3,2,2], 'Bb': [3,2,1,1], 'Bbm': [3,1,1,1], 'Eb': [3,3,3,6], 'Ab': [5,3,4,3], '--': null
        };

        const STRUM_PATTERNS = {
            'basic-4': { name: 'Basic Down', timeSignature: '4/4', pattern: [{type:'D',velocity:1},{type:'.',velocity:0},{type:'D',velocity:0.7},{type:'.',velocity:0},{type:'D',velocity:0.85},{type:'.',velocity:0},{type:'D',velocity:0.7},{type:'.',velocity:0}] },
            'folk-4': { name: 'Folk Strum', timeSignature: '4/4', pattern: [{type:'D',velocity:1},{type:'.',velocity:0},{type:'D',velocity:0.6},{type:'U',velocity:0.5},{type:'.',velocity:0},{type:'U',velocity:0.65},{type:'D',velocity:0.7},{type:'U',velocity:0.5}] },
            'island-4': { name: 'Chuck Strum', timeSignature: '4/4', pattern: [{type:'D',velocity:0.9},{type:'U',velocity:0.4},{type:'X',velocity:0.7},{type:'U',velocity:0.5},{type:'D',velocity:0.85},{type:'U',velocity:0.4},{type:'X',velocity:0.65},{type:'U',velocity:0.5}] },
            'pop-4': { name: 'Pop Rock', timeSignature: '4/4', pattern: [{type:'D',velocity:1},{type:'.',velocity:0},{type:'D',velocity:0.5},{type:'U',velocity:0.6},{type:'X',velocity:0.8},{type:'U',velocity:0.5},{type:'D',velocity:0.6},{type:'U',velocity:0.55}] },
            'calypso-4': { name: 'Syncopated', timeSignature: '4/4', pattern: [{type:'D',velocity:0.95},{type:'U',velocity:0.3},{type:'.',velocity:0},{type:'U',velocity:0.6},{type:'.',velocity:0},{type:'U',velocity:0.5},{type:'D',velocity:0.7},{type:'U',velocity:0.4}] },
            'waltz-3': { name: '3/4 Basic', timeSignature: '3/4', pattern: [{type:'D',velocity:1},{type:'.',velocity:0},{type:'D',velocity:0.5},{type:'.',velocity:0},{type:'D',velocity:0.5},{type:'.',velocity:0}] },
            'arpeggio-3': { name: '3/4 Arpeggio', timeSignature: '3/4', pattern: [{type:'D',velocity:0.9},{type:'U',velocity:0.4},{type:'D',velocity:0.6},{type:'U',velocity:0.5},{type:'D',velocity:0.55},{type:'U',velocity:0.45}] },
            'flowing-3': { name: '3/4 Flowing', timeSignature: '3/4', pattern: [{type:'D',velocity:1},{type:'U',velocity:0.3},{type:'D',velocity:0.5},{type:'U',velocity:0.4},{type:'.',velocity:0},{type:'U',velocity:0.5}] },
            'march-2': { name: 'March', timeSignature: '2/4', pattern: [{type:'D',velocity:1},{type:'.',velocity:0},{type:'D',velocity:0.7},{type:'.',velocity:0}] },
            'polka-2': { name: 'Bounce', timeSignature: '2/4', pattern: [{type:'D',velocity:1},{type:'U',velocity:0.5},{type:'D',velocity:0.75},{type:'U',velocity:0.5}] },
            'compound-6': { name: '6/8 Lilting', timeSignature: '6/8', pattern: [{type:'D',velocity:1},{type:'.',velocity:0},{type:'U',velocity:0.4},{type:'D',velocity:0.8},{type:'.',velocity:0},{type:'U',velocity:0.45}] },
            'ballad-6': { name: '6/8 Ballad', timeSignature: '6/8', pattern: [{type:'D',velocity:0.95},{type:'U',velocity:0.3},{type:'U',velocity:0.4},{type:'D',velocity:0.75},{type:'U',velocity:0.35},{type:'U',velocity:0.45}] }
        };

const $ = id => document.getElementById(id);
const clone = obj => JSON.parse(JSON.stringify(obj));
const esc = str => String(str ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,min,max,def=min) => Number.isFinite(+v)?Math.min(max,Math.max(min,+v)):def;
const uid = () => globalThis.crypto?.randomUUID?.() || `song-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const COLORS={C:'#c85342',C7:'#c85342',F:'#298358',G:'#3771bb',G7:'#3771bb',Am:'#9d741e'};
const FINGERS={C:[0,0,0,3],C7:[0,0,0,1],Cmaj7:[0,0,0,2],F:[2,0,1,0],G:[0,1,3,2],G7:[0,2,1,3],Am:[2,0,0,0],A:[2,1,0,0],Dm:[2,3,1,0],D:[1,2,3,0],Em:[0,3,2,1]};
const TIPS={C:'Ring finger: A string, fret 3. Other strings open.',C7:'Index finger: A string, fret 1.',F:'Index: E string, fret 1. Middle: G string, fret 2.',G7:'Index: E1. Middle: C2. Ring: A2.',G:'Index: C2. Middle: A2. Ring: E3.',Am:'Middle finger: G string, fret 2.'};
const METERS={'4/4':{steps:8,beat:2,beats:4,default:'basic-4'},'3/4':{steps:6,beat:2,beats:3,default:'waltz-3'},'2/4':{steps:4,beat:2,beats:2,default:'march-2'},'6/8':{steps:6,beat:3,beats:2,default:'compound-6'}};
function measure(chord='C',lyric='',span=1){return {chords:[{step:0,chord}],lyric,lyricStart:0,lyricSpan:span};}
function template(title,meter,tempo,pattern,chords,cues,description,source){const bars=chords.map(c=>Array.isArray(c)?{...measure(c[0]),chords:[{step:0,chord:c[0]},{step:METERS[meter].steps/2,chord:c[1]}]}:measure(c));for(const [bar,text,span=1] of cues){bars[bar].lyric=text;bars[bar].lyricSpan=span;}return {version:2,id:null,title,meter,tempo,pattern,swing:0,loop:false,playCount:1,showLyrics:true,showDiagrams:true,showStrum:true,description,source,measures:bars};}
const STARTERS=[
 template('Are You Sleeping?','4/4',80,'basic-4',Array(8).fill('C'),[[0,'Are you sleeping?'],[1,'Are you sleeping?'],[2,'Brother John,'],[3,'Brother John,'],[4,'Morning bells are ringing,'],[5,'Morning bells are ringing,'],[6,'Ding, dang, dong.'],[7,'Ding, dang, dong.']],'One-chord practice · Keep C throughout this traditional round.','https://www.bethsnotesplus.com/2013/05/frere-jacques-are-you-sleeping.html'),
 template('Rain, Rain, Go Away','2/4',84,'march-2',Array(8).fill('C'),[[0,'Rain, rain, go away,',2],[2,'Come again another day.',2],[4,'Little Johnny wants to play,',2],[6,'Rain, rain, go away.',2]],'One-chord practice · A simple so–mi singing game; change the name in the lyrics.','https://www.bethsnotesplus.com/2015/04/rain-rain.html'),
 template('Hot Cross Buns','4/4',72,'basic-4',['C','C',['C','G7'],'C'],[[0,'Hot cross buns!'],[1,'Hot cross buns!'],[2,'One a penny, two a penny,'],[3,'Hot cross buns!']],'Two chords · Prepare G7 for “two a penny,” then return to C.','https://www.bethsnotesplus.com/2013/09/hot-cross-buns.html'),
 template('London Bridge','2/4',80,'march-2',['C','C','G7','C','C','C','G7','C'],[[0,'London Bridge is falling down,',2],[2,'Falling down, falling down,',2],[4,'London Bridge is falling down,',2],[6,'My fair lady.',2]],'Two chords · A steady marching strum with C and G7.','https://www.bethsnotesplus.com/2015/11/london-bridge.html'),
 template('Skip to My Lou','4/4',88,'basic-4',['C','C','G7','G7','C','C','G7','C'],[[0,'Lou, lou, skip to my lou,',2],[2,'Lou, lou, skip to my lou,',2],[4,'Lou, lou, skip to my lou,',2],[6,'Skip to my lou, my darling.',2]],'Two chords · Start with down strums; try Folk Strum when ready.','https://www.bethsnotesplus.com/2012/10/skip-to-my-lou.html'),
 template('Twinkle, Twinkle, Little Star','4/4',76,'basic-4',['C',['F','C'],['F','C'],['G7','C'],['C','F'],['C','G7'],['C','F'],['C','G7'],'C',['F','C'],['F','C'],['G7','C']],[[0,'Twinkle, twinkle, little star,',2],[2,'How I wonder what you are!',2],[4,'Up above the world so high,',2],[6,'Like a diamond in the sky.',2],[8,'Twinkle, twinkle, little star,',2],[10,'How I wonder what you are!',2]],'Three chords · C, F, and G7. Some chords change on beat 3.','https://www.bethsnotesplus.com/2013/08/twinkle-twinkle-little-star.html')
];
// Editable classroom accompaniments in C. Lyric phrases follow the traditional
// measure lengths; the next-line preview also gives singers their pickup words.
STARTERS.push(
 template('Apple Tree','2/4',80,'march-2',Array(8).fill('C'),[[0,'Apple tree, apple tree,',2],[2,'Will your apple fall on me?',2],[4,'I won’t cry, I won’t shout,',2],[6,'If your apple knocks me out.',2]],'One-chord practice · Hold C for this singing game. Four beats to get ready.','https://www.thesingingclassroom.com/articles/apple-tree'),
 template('Lucy Locket','4/4',80,'basic-4',Array(4).fill('C'),[[0,'Lucy Locket lost her pocket,'],[1,'Kitty Fisher found it,'],[2,'Not a penny was there in it,'],[3,'Just a ribbon ’round it.']],'One-chord practice · Keep C and a steady down strum throughout.','https://www.bethsnotesplus.com/2012/01/lucy-locket.html'),
 template('The More We Get Together','3/4',84,'waltz-3',['C','C','G7','C','C','C','G7','C','G7','C','G7','C','C','C','G7','C'],[[0,'The more we get together,',2],[2,'Together, together,',2],[4,'The more we get together,',2],[6,'The happier we’ll be.',2],[8,'For your friends are my friends,',2],[10,'And my friends are your friends.',2],[12,'The more we get together,',2],[14,'The happier we’ll be.',2]],'Two chords · Count 1–2–3. Sing “The” on the last count-in beat, then “more” on beat 1.','https://www.bethsnotesplus.com/2013/04/the-more-we-get-together.html'),
 template('The Farmer in the Dell','6/8',60,'compound-6',['C','C','C','C','C','C','G7','C'],[[0,'The farmer in the dell,',2],[2,'The farmer in the dell,',2],[4,'Heigh-ho, the derry-o,',2],[6,'The farmer in the dell.',2]],'Two chords · Two big beats per measure. Count in “1, 2, Ready, Sing.” Sing “The” just before the first downbeat.','https://www.bethsnotesplus.com/2013/03/farmer-in-dell.html'),
 template('Itsy Bitsy Spider','6/8',60,'compound-6',['C','C','G7','C','C','C','G7','C','C','C','G7','C','C','C','G7','C'],[[0,'The itsy bitsy spider climbed up the water spout.',4],[4,'Down came the rain and washed the spider out.',4],[8,'Out came the sun and dried up all the rain.',4],[12,'And the itsy bitsy spider climbed up the spout again.',4]],'Two chords · Two big beats per measure. Count in “1, 2, Ready, Sing.” Sing “The” just before the first downbeat.','https://www.bethsnotesplus.com/2013/03/itsy-bitsy-spider.html'),
 template('BINGO','4/4',75,'basic-4',['C',['G7','C'],['C','F'],['G7','C'],['C','G7'],['G7','C']],[[0,'There was a farmer had a dog,'],[1,'And Bingo was his name-o.'],[2,'B–I–N–G–O!'],[3,'B–I–N–G–O!'],[4,'B–I–N–G–O!'],[5,'And Bingo was his name-o.']],'Three chords · One lyric phrase per measure, with steady down strums. Try clapping a letter on each repeat.','https://www.bethsnotesplus.com/2013/01/bingo.html'),
 template('She’ll Be Coming ’Round the Mountain','4/4',84,'basic-4',['C','C','C','G7','C','F',['C','G7'],'C'],[[0,'She’ll be coming ’round the mountain'],[1,'When she comes.'],[2,'She’ll be coming ’round the mountain'],[3,'When she comes.'],[4,'She’ll be coming ’round the mountain,'],[5,'She’ll be coming ’round the mountain,'],[6,'She’ll be coming ’round the mountain'],[7,'When she comes.']],'Three chords · One lyric segment per measure. Sing “She’ll be” on “4 &” of the count-in, then “coming” on beat 1.','https://www.bethsnotesplus.com/2015/01/shell-be-coming-round-mountain.html')
);
const EPO_SOURCE='https://otakimuseum.blogspot.com/2009/11/he-waiata-song.html';
STARTERS.push(template('Epo I Tai Tai E','4/4',80,'basic-4',['F','F','F','F','F','F','C7','F'],[[0,'E-po i tai tai e.',2],[2,'E-po i tai tai e.',2],[4,'E-po i tai tai,'],[5,'E-po i tu-ki, tu-ki'],[6,'E-po i tu-ki, tu-ki'],[7,'e.']],'Two chords · F and C7 in a simplified classroom version. Four beats to get ready, then steady down strums.',EPO_SOURCE));
function starterBackground(s){
 if(s.source!==EPO_SOURCE&&(s.source||!['Epo I Tai Tai E','Epo e Tai'].includes(s.title)))return '';
 return `<h3>Epo I Tai Tai E · Song background</h3><p>This classroom adaptation traces back to <i>He Pūru Taitama</i>, written by Māori composer Kīngi Tāhiwi in Ōtaki, Aotearoa New Zealand, in 1909. The original was a courting song. Its words changed as it spread internationally; the classroom syllables are not a faithful Māori text, and “I will be happy” is not a reliable translation.</p><p class="hint">Background: <a href="${EPO_SOURCE}" target="_blank" rel="noopener noreferrer">Ōtaki Museum</a> · Composer and historical recording: <a href="https://teara.govt.nz/en/music/44807/kingi-tahiwi" target="_blank" rel="noopener noreferrer">Te Ara, the Encyclopedia of New Zealand</a>.</p><h3>Our classroom arrangement</h3><p>Key of F · melody range C4–A4 · 4/4 · 80 BPM. The eight sung measures use <b>F · F · F · F · F · F · C7 · F</b>. This beginner accompaniment simplifies the B♭ and optional Dm changes in the fuller harmony. The lyrics follow Drew’s classroom score; they are an adapted version.</p><p>Count four beats before starting. Hold “e” through measures 2, 4, and 8. Sing “E-po i tu-ki, tu-ki” in both measures 6 and 7. After the last sung phrase, play one F down-strum on beat 1 of the extra ending measure and let it ring. Only ukulele and bass sound on that ending downbeat.</p><p class="hint">Teaching idea: half the class sings and claps a steady beat while the other half strums, then swap. The optional backing track is an original classroom accompaniment.</p>`;
}
function addStarterEnding(s){
 const last=s.measures.flatMap(m=>m.chords).filter(c=>c.chord!=='--').at(-1)?.chord||'C';
 s.measures.push({...measure(last,'One final strum ↓'),ending:true,sectionStart:'Ending'});s.starterEndingVersion=1;return s;
}
STARTERS.find(s=>s.title==='BINGO').measures[0].chords=[{step:0,chord:'C'},{step:4,chord:'F'},{step:6,chord:'C'}];
STARTERS.find(s=>s.title==='She’ll Be Coming ’Round the Mountain').lyricPickup=1;
for(const starter of STARTERS)addStarterEnding(starter);
function matchesStarterMusic(s,starter){
 const bars=starter.measures.slice(0,-1);
 return s.meter===starter.meter&&s.measures.length===bars.length&&s.measures.every((m,i)=>!m.ending&&JSON.stringify(m.chords)===JSON.stringify(bars[i].chords)&&m.lyric===bars[i].lyric&&m.lyricStart===bars[i].lyricStart&&m.lyricSpan===bars[i].lyricSpan);
}
// Correct only the original, stretched Mountain chart. Preserve teachers' edits,
// tempo, strum choice, mixer, and section labels by migrating before normalization.
function upgradeMountainTiming(raw){
 const starter=STARTERS.find(s=>s.title==='She’ll Be Coming ’Round the Mountain');
 if(!raw||raw.source!==starter.source||raw.meter!=='4/4'||!Array.isArray(raw.measures)||![16,17].includes(raw.measures.length))return raw;
 const oldChords=['C','C','C','C','C','C','G7','G7','C','C','F','F','C','G7','C','C'];
 if(!raw.measures.slice(0,16).every((m,i)=>m&&!m.ending&&Array.isArray(m.chords)&&m.chords.length===1&&m.chords[0]?.step===0&&m.chords[0].chord===oldChords[i]&&(m.lyric||'')===(i%2?'':starter.measures[i/2].lyric)&&(m.lyricStart||0)===0&&(m.lyricSpan??1)===(i%2?1:2)&&!(i%2&&m.sectionStart)))return raw;
 if(raw.measures.length===17&&!raw.measures[16]?.ending)return raw;
 const measures=[];
 for(let i=0;i<16;i+=2){
  const a=raw.measures[i],b=raw.measures[i+1],chords=[{step:0,chord:a.chords[0].chord}];
  if(b.chords[0].chord!==a.chords[0].chord)chords.push({step:4,chord:b.chords[0].chord});
  measures.push({...a,chords,lyricSpan:1});
 }
 if(raw.measures[16])measures.push(raw.measures[16]);
 const oldDescription='Three chords · Sing “She’ll be” on count-in beats 3 and 4, then “coming” on beat 1.';
 return {...raw,measures,description:raw.description===oldDescription?starter.description:raw.description};
}
// Upgrade only an unchanged starter lyric chart; an explicit pickup (including None) wins.
function upgradeMountainPickup(raw){
 const starter=STARTERS.find(s=>s.title==='She’ll Be Coming ’Round the Mountain');
 if(!raw||raw.lyricPickup!=null||raw.source!==starter.source||raw.meter!==starter.meter||!Array.isArray(raw.measures)||![8,9].includes(raw.measures.length))return raw;
 if(!raw.measures.slice(0,8).every((m,i)=>m.lyric===starter.measures[i].lyric&&(m.lyricStart||0)===0&&(m.lyricSpan??1)===1&&m.lyricPickup==null))return raw;
 return {...raw,lyricPickup:1};
}
// Fold each original two-measure BINGO phrase into one, keeping every chord.
// Migrate only the untouched timing chart; custom tempos and teacher edits win.
function upgradeBingoTiming(raw){
 const starter=STARTERS.find(s=>s.title==='BINGO');
 if(!raw||raw.source!==starter.source||raw.meter!=='4/4'||!Array.isArray(raw.measures)||![12,13].includes(raw.measures.length))return raw;
 const oldChords=['C',['F','C'],'G7','C','C','F','G7','C','C','G7','G7','C'];
 if(!raw.measures.slice(0,12).every((m,i)=>{
  const expected=Array.isArray(oldChords[i])?oldChords[i].map((chord,j)=>({step:j*4,chord})):[{step:0,chord:oldChords[i]}];
  return m&&!m.ending&&Array.isArray(m.chords)&&m.chords.length===expected.length&&m.chords.every((c,j)=>c.step===expected[j].step&&c.chord===expected[j].chord)&&(m.lyric||'')===(i%2?'':starter.measures[i/2].lyric)&&(m.lyricStart||0)===0&&(m.lyricSpan??1)===(i%2?1:2)&&!(i%2&&m.sectionStart);
 }))return raw;
 if(raw.measures.length===13&&!raw.measures[12]?.ending)return raw;
 const measures=[];
 for(let i=0;i<12;i+=2){
  const a=raw.measures[i],b=raw.measures[i+1],chords=[...a.chords.map(c=>({...c,step:c.step/2})),...b.chords.map(c=>({...c,step:4+c.step/2}))];
  measures.push({...a,chords:chords.filter((c,j)=>!j||c.chord!==chords[j-1].chord),lyricSpan:1});
 }
 if(raw.measures[12])measures.push(raw.measures[12]);
 const oldDescription='Three chords · Sing “There” on the last count-in beat. Try clapping a letter on each repeat.';
 return {...raw,measures,tempo:raw.tempo===80?75:raw.tempo,description:raw.description===oldDescription?starter.description:raw.description};
}
function normalizePickup(value,fallback=0){return value!==null&&value!==''&&[0,.5,1,2].includes(Number(value))?Number(value):fallback;}
function pickupLabel(value){return value===0?'None':`${value===.5?'½':value} beat${value===2?'s':''} early`;}
function pickupOptions(inherit=false){return (inherit?'<option value="">Use song setting</option>':'')+[0,.5,1,2].map(v=>`<option value="${v}">${pickupLabel(v)}</option>`).join('');}
function lyricPickupFor(m){return m.ending?0:normalizePickup(m.lyricPickup,normalizePickup(song.lyricPickup));}
function upgradeSpiderLyrics(s){
 const starter=STARTERS.find(x=>x.title==='Itsy Bitsy Spider');
 if(s.source!==starter.source||s.meter!=='6/8'||![16,17].includes(s.measures.length))return s;
 const old=['The itsy bitsy spider','Climbed up the waterspout.','Down came the rain','And washed the spider out.','Out came the sun','And dried up all the rain,','And the itsy bitsy spider','Climbed up the spout again.'];
 if(!s.measures.slice(0,16).every((m,i)=>m.lyric===(i%2?'':old[i/2])&&m.lyricStart===0&&m.lyricSpan===(i%2?1:2)))return s;
 s.measures.slice(0,16).forEach((m,i)=>{m.lyric=starter.measures[i].lyric;m.lyricStart=0;m.lyricSpan=starter.measures[i].lyricSpan;});return s;
}
// Refresh the prior classroom wording only when its lyric chart is unchanged.
// Preserve teacher-written lyrics, custom titles, timing, chords, and melody notes.
function upgradeEpoLyrics(raw){
 if(!raw||raw.source!==EPO_SOURCE)return raw;
 const starter=STARTERS.find(s=>s.source===EPO_SOURCE);
 const result={...raw,title:raw.title==='Epo e Tai'?starter.title:raw.title};
 const old=['Epo e tai tama e, o','','Epo e tai tama e.','','Epo e tai tama','epo e huru huru,','Epo e tai tama e.',''];
 const spans=[2,1,2,1,1,1,2,1];
 if(raw.meter!=='4/4'||!Array.isArray(raw.measures)||![8,9].includes(raw.measures.length)||normalizePickup(raw.lyricPickup)!==0)return result;
 if(!raw.measures.slice(0,8).every((m,i)=>m&&!m.ending&&(m.lyric||'')===old[i]&&(m.lyricStart||0)===0&&(m.lyricSpan??1)===spans[i]&&normalizePickup(m.lyricPickup)===0))return result;
 if(raw.measures.length===9&&!raw.measures[8]?.ending)return result;
 result.measures=raw.measures.map((m,i)=>i<8?{...m,lyric:starter.measures[i].lyric,lyricSpan:starter.measures[i].lyricSpan}:m);
 if(Array.isArray(raw.notation?.measures))result.notation={...raw.notation,measures:raw.notation.measures.map((m,i)=>i<8&&m.reference===old[i]?{...m,reference:starter.measures[i].lyric}:m)};
 return result;
}
function upgradeStarterEnding(s){
 if(s.starterEndingVersion===1)return s;
 const starter=STARTERS.find(x=>s.source&&x.source===s.source);
 if(starter&&matchesStarterMusic(s,starter))addStarterEnding(s);
 return s;
}
function lastPlayedChord(s){return s.measures.flatMap(m=>m.chords).filter(c=>c.chord!=='--').at(-1)?.chord||'--';}
function virtualEndingAt(s,tick){return s===song&&typeof playbackPlan==='function'&&playbackPlan().virtualEnding&&tick>=totalSteps()&&tick<totalSteps()+config().steps;}
function isEndingMeasure(s,tick){return s.measures[Math.floor(tick/METERS[s.meter].steps)]?.ending===true||virtualEndingAt(s,tick);}
function strumStep(s,tick){const step=tick%METERS[s.meter].steps;return isEndingMeasure(s,tick)?{type:step===0?'D':'.',velocity:step===0?1:0}:STRUM_PATTERNS[s.pattern].pattern[step];}
let song=clone(STARTERS[0]),selected=0,dirty=false,savedSongs=[],undoStack=[],libraryTab='starter',autosaveTimer,toastTimer;
let storageOkay=true;
function toast(msg){$('toast').textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',4400);}
function readStore(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{storageOkay=false;return fallback;}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageOkay=false;$('saveStatus').textContent='Export to keep your changes';toast('Browser storage is unavailable or full. Export your song to keep a copy.');return false;}}
function normalizeSong(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.measures)||!raw.measures.length||raw.measures.length>1024)throw Error('A song needs 1–1,024 measures.');
 raw=upgradeEpoLyrics(raw);
 const meter=raw.meter||raw.timeSignature||'4/4';if(!METERS[meter])throw Error('Unsupported meter.');const max=METERS[meter].steps;
 const pattern=raw.pattern||raw.strumPattern;const bars=raw.measures.map(m=>{if(!m||typeof m!=='object')throw Error('Invalid measure.');let chords;
 if(Array.isArray(m.chords)){chords=m.chords.map(c=>{if(!c||!Object.hasOwn(CHORD_FINGERINGS,c.chord))throw Error('Unknown chord in file.');return {step:Math.floor(clamp(c.step,0,max-1)),chord:c.chord};});}
 else{if(!Object.hasOwn(CHORD_FINGERINGS,m.chord1||'--')||!Object.hasOwn(CHORD_FINGERINGS,m.chord2||'--'))throw Error('Unknown chord in file.');chords=[{step:0,chord:m.chord1||'--'}];if(m.expanded!==false&&m.chord2&&m.chord2!=='--')chords.push({step:Math.ceil(max/2),chord:m.chord2});}
 const map=new Map(chords.map(c=>[c.step,c]));if(!map.has(0))map.set(0,{step:0,chord:'--'});
 return {ending:m.ending===true,chords:[...map.values()].sort((a,b)=>a.step-b.step),lyricPickup:normalizePickup(m.lyricPickup,null),lyric:String(m.lyric||'').slice(0,300),lyricStart:Math.floor(clamp(m.lyricStart,0,max-1)),lyricSpan:Math.floor(clamp(m.lyricSpan,1,32,1))};});
 if(!bars.some(b=>b.lyric)&&typeof raw.lyrics==='string'){raw.lyrics.split(/\n/).filter(x=>x.trim()).slice(0,bars.length).forEach((line,i)=>bars[i].lyric=line.slice(0,300));}
 return upgradeStarterEnding(upgradeSpiderLyrics({version:2,lyricPickup:normalizePickup(raw.lyricPickup),starterEndingVersion:raw.starterEndingVersion===1?1:0,id:typeof raw.id==='string'?raw.id:null,title:String(raw.title||raw.songTitle||raw.name||'Untitled song').slice(0,120),meter,tempo:Math.round(clamp(raw.tempo,40,200,100)),pattern:STRUM_PATTERNS[pattern]?.timeSignature===meter?pattern:METERS[meter].default,swing:meter==='6/8'?0:clamp(raw.swing??raw.swingAmount,0,.33,0),loop:raw.loop===true||raw.playbackMode==='loop',playCount:raw.playCount===2||raw.playbackMode==='twice'?2:1,showLyrics:raw.showLyrics!==false,showDiagrams:raw.showDiagrams!==false,showStrum:raw.showStrum!==false,description:String(raw.description||'').replace('One-chord practice · Feel two big beats: ONE-la-li, TWO-la-li.','One-chord practice · Count 1–2–3 | 4–5–6 in 6/8.').replace('Two chords · Count 1–2–3 | 4–5–6. Sing “The” on count 6 before the first measure.','Two chords · Two big beats per measure. Count in “1, 2, Ready, Sing.” Sing “The” just before the first downbeat.').replace('One-chord practice · Count 1–2–3 | 4–5–6 in 6/8.','One-chord practice · Two big beats per measure. Count in “1, 2, Ready, Sing.”').slice(0,300),source:typeof raw.source==='string'&&(raw.source===EPO_SOURCE||/^https:\/\/www\.(?:bethsnotesplus\.com|thesingingclassroom\.com)\//.test(raw.source))?raw.source:'',measures:bars}));
}
function config(){return METERS[song.meter];}
function countInBeats(meter=song.meter){return meter==='2/4'||meter==='6/8'?4:METERS[meter].beats;}
function countInSteps(){return countInBeats()*config().beat;}
function countStepSize(){return config().beat;}
function countInCounts(){return countInSteps()/countStepSize();}
function compoundCountWords(s=song){return ['1','2','Ready',s.showLyrics&&s.measures.some(m=>!m.ending&&m.lyric.trim())?'Sing':'Play'];}
function countInPrompt(count){return song.meter==='6/8'?compoundCountWords()[Math.max(0,Math.min(3,count-1))]:`Get ready… ${count}`;}
function countInAccent(elapsed){return song.meter==='6/8'?elapsed%config().steps===0:elapsed===0;}
let countingDisplay=false;
function renderBeatDots(counting=false){
 countingDisplay=counting;
 const steps=counting?countInSteps():config().steps,stride=counting?countStepSize():song.meter==='6/8'?1:config().beat;
 $('stageBeats').innerHTML=Array.from({length:steps/stride},(_,beat)=>{const i=beat*stride;return `<span class="beat-dot${i%config().beat===0?' group':''}" data-step="${i}">${counting?beat+1:stepLabel(i)}</span>`;}).join('');
}
function duration(){return 60/song.tempo/config().beat;}function totalSteps(){return song.measures.length*config().steps;}
function stepLabel(step){return song.meter==='6/8'?String(step+1):`${Math.floor(step/2)+1}${step%2?' &':''}`;}
function slotLabel(step){return song.meter==='6/8'?`Count ${step+1}`:`Beat ${stepLabel(step)}`;}
function chordAt(tick){if(virtualEndingAt(song,tick))return lastPlayedChord(song);const n=config().steps,m=Math.min(song.measures.length-1,Math.max(0,Math.floor(tick/n))),step=Math.max(0,tick%n);let c='--';for(const ev of song.measures[m].chords)if(ev.step<=step)c=ev.chord;return c;}
function cues(){
 const n=config().steps;
 const list=song.measures.flatMap((m,i)=>{if(!m.lyric.trim())return [];const nominalStart=i*n+m.lyricStart,pickup=lyricPickupFor(m)*config().beat;return [{text:m.lyric,nominalStart,pickup,start:nominalStart-pickup,end:Math.min(totalSteps(),nominalStart+m.lyricSpan*n)}];}).sort((a,b)=>a.start-b.start||a.nominalStart-b.nominalStart);
 // Shift entrances, not the final note: the last phrase holds to its original end.
 return list.map((c,i)=>({...c,end:Math.min(c.end,list[i+1]?.start??Infinity)})).filter(c=>c.end>c.start);
}
function stageCues(){return cues();}
function cueAt(tick){return cues().find(c=>tick>=c.start&&tick<c.end);}
function nextChange(tick){const current=chordAt(tick),total=totalSteps();for(let offset=1;offset<=total;offset++){let t=tick+offset;if(t>=total&&!song.loop)return null;t%=total;if(chordAt(t)!==current)return {chord:chordAt(t),offset};}return null;}
function diagram(name){const frets=CHORD_FINGERINGS[name];if(!frets)return '<div class="hint">Rest</div>';const high=Math.max(...frets),start=high>4?Math.min(...frets.filter(n=>n>0)):1;const ys=[41,62,83,104,125];let s=`<svg viewBox="0 0 110 158" role="img" aria-label="${esc(name)} ukulele chord, G C E A frets ${frets.join(', ')}" xmlns="http://www.w3.org/2000/svg" style="color:inherit">`;
 for(let x=0;x<4;x++){s+=`<text x="${26+x*20}" y="14" text-anchor="middle" font-size="11" font-family="sans-serif" fill="currentColor">${'GCEA'[x]}</text><line x1="${26+x*20}" x2="${26+x*20}" y1="41" y2="125" stroke="currentColor" opacity=".6"/>`;}
 ys.forEach((y,i)=>s+=`<line x1="26" x2="86" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="${i===0&&start===1?4:1}" opacity=".7"/>`);
 if(start>1)s+=`<text x="6" y="56" font-size="10" fill="currentColor">${start}fr</text>`;
 frets.forEach((f,i)=>{const x=26+i*20;if(f===0)s+=`<circle cx="${x}" cy="29" r="4" fill="none" stroke="currentColor"/>`;else if(f<0)s+=`<text x="${x}" y="34" text-anchor="middle" fill="currentColor">×</text>`;else{const y=51.5+(f-start)*21;s+=`<circle cx="${x}" cy="${y}" r="8" fill="currentColor"/>`;if(FINGERS[name]?.[i])s+=`<text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="10" font-weight="bold" fill="var(--diagram-dot-text,#fff)">${FINGERS[name][i]}</text>`;}});
 s+='<text x="56" y="146" text-anchor="middle" font-size="9" fill="currentColor" opacity=".65">4　　 3　　 2　　 1</text></svg>';return s;}
function checkpoint(){undoStack.push(clone(song));if(undoStack.length>50)undoStack.shift();$('undoBtn').disabled=false;}
function changed(){dirty=true;$('saveStatus').textContent='Saving draft…';clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{if(writeStore('uke-strum-draft-v2',song))$('saveStatus').textContent='Draft saved in this browser';},350);}
function mutate(fn,redraw=true){stop(false);checkpoint();fn();changed();if(redraw)renderAll();}
function stopForEdit(){if(transport.state==='playing'||transport.state==='paused')stop(false);}
function chordOptions(value){return Object.keys(CHORD_FINGERINGS).map(c=>`<option value="${c}"${c===value?' selected':''}>${c==='--'?'Rest':c}</option>`).join('');}
function renderSettings(){$('songTitle').value=song.title;$('songDescription').textContent=song.description||'Your classroom arrangement';$('timeSignature').value=song.meter;$('songLyricPickup').innerHTML=pickupOptions();$('songLyricPickup').value=normalizePickup(song.lyricPickup);$('tempo').value=song.tempo;$('countInLabel').textContent=song.meter==='6/8'?'4 big beats · 2-measure count-in':`${countInCounts()}-beat count-in`;$('tempoLabel').textContent=song.meter==='6/8'?'Tempo · dotted ♩ BPM':'Tempo · ♩ BPM';$('strumPattern').innerHTML=Object.entries(STRUM_PATTERNS).filter(([,p])=>p.timeSignature===song.meter).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('');$('strumPattern').value=song.pattern;$('swingAmount').value=String(song.swing);$('swingAmount').disabled=song.meter==='6/8';$('loopToggle').value=playbackMode();$('stageLoop').value=playbackMode();$('lyricsToggle').checked=song.showLyrics;$('diagramToggle').checked=song.showDiagrams;$('strumToggle').checked=song.showStrum;}
function renderMeasures(){const n=config().steps;$('measuresGrid').innerHTML=song.measures.map((m,i)=>{const cue=cueAt(i*n);return `<button class="measure${i===selected?' selected':''}" data-measure="${i}" aria-label="Edit measure ${i+1}" aria-pressed="${i===selected}"><span class="bar-no"><span>MEASURE ${String(i+1).padStart(2,'0')}</span><span>${m.lyric?'♫':''}</span></span><span class="chord-strip">${m.chords.map(c=>`<span class="chord-token" style="--chord:${COLORS[c.chord]||'#557477'}">${c.chord==='--'?'—':esc(c.chord)}<small>${slotLabel(c.step)}</small></span>`).join('')}</span><span class="measure-lyric${!m.lyric?' continued':''}">${esc(m.lyric||(cue?'↳ '+cue.text:'Add a lyric cue…'))}</span><span class="mini-beats">${Array.from({length:config().beats},()=>'<i></i>').join('')}</span></button>`;}).join('');$('arrangementSummary').textContent=`${song.measures.length} measures · ${song.meter} · ${Math.round(totalSteps()*duration())} seconds`;}
function renderInspector(){const m=song.measures[selected];$('selectedTitle').textContent=m.ending?`Ending · measure ${selected+1}`:`Edit measure ${selected+1}`;const steps=Array.from({length:config().steps},(_,i)=>i);$('chordEditors').innerHTML=m.chords.map((c,i)=>`<div class="chord-edit"><select aria-label="Chord ${i+1}" data-chord-index="${i}">${chordOptions(c.chord)}</select><select aria-label="Chord ${i+1} starts on" data-step-index="${i}"${i===0?' disabled':''}>${steps.filter(s=>s===c.step||!m.chords.some(x=>x.step===s)).map(s=>`<option value="${s}"${s===c.step?' selected':''}>${slotLabel(s)}</option>`).join('')}</select>${i?`<button class="remove" data-remove-chord="${i}" aria-label="Remove chord change">×</button>`:''}</div>`).join('');$('addChord').disabled=m.chords.length>=config().steps;$('lyricInput').value=m.lyric;$('lyricStart').innerHTML=steps.map(i=>`<option value="${i}">${slotLabel(i)}</option>`).join('');$('lyricStart').value=m.lyricStart;$('lyricSpan').value=m.lyricSpan;$('lineLyricPickup').innerHTML=pickupOptions(true);$('lineLyricPickup').value=m.lyricPickup??'';$('lineLyricPickup').disabled=!!m.ending;$('lyricPickupHint').textContent=`Song setting: ${pickupLabel(normalizePickup(song.lyricPickup))}. Starts this line before its selected beat. In 6/8, a beat is one dotted quarter.`;const c=m.chords[0].chord;$('inspectorDiagram').innerHTML=diagram(c);$('inspectorChordName').textContent=c==='--'?'A measure of rest':c;$('fingerTip').textContent=m.ending?'One down-strum and a bass root on beat 1. Let them ring; the other instruments rest.':TIPS[c]||'Numbers inside dots show fingers: 1 index, 2 middle, 3 ring, 4 little.';$('moveLeft').disabled=selected===0;$('moveRight').disabled=selected===song.measures.length-1;$('deleteMeasure').disabled=song.measures.length===1;}
function patternHTML(ending=false){return (ending?Array.from({length:config().steps},(_,i)=>({type:i===0?'D':'.'})):STRUM_PATTERNS[song.pattern].pattern).map((s,i)=>`<div class="strum-step${s.type==='.'?' rest':s.type==='X'?' chuck':''}"><strong>${{D:'↓',U:'↑',X:'×','.':'·'}[s.type]}</strong><small>${stepLabel(i)}</small></div>`).join('');}
function renderPattern(){$('patternName').textContent=STRUM_PATTERNS[song.pattern].name;$('patternVisual').innerHTML=patternHTML();renderStrumHandBase();$('meterHelp').textContent=song.meter==='6/8'?'Count 1–2–3 | 4–5–6. Emphasize 1 and 4; tempo counts two dotted-quarter beats per measure.':`${config().beats} beats per measure. The “&” falls halfway between beats.`;}
function renderAll(){selected=Math.min(selected,song.measures.length-1);renderSettings();renderMeasures();renderInspector();renderPattern();renderStageBase();updateTransport();renderPosition(transport.tick||0);}
function renderStageBase(){$('stageTitle').textContent=song.title||'Untitled song';$('stageMeta').textContent=`${song.meter} · ${song.tempo} ${song.meter==='6/8'?'dotted-quarter ':''}BPM · ${STRUM_PATTERNS[song.pattern].name}`;renderBeatDots(false);$('stageDiagram').hidden=!song.showDiagrams;}
function loadSong(raw,ask=true){if(ask&&dirty&&!confirm('Load this song and replace the current draft? Save or export first if you want to keep your changes.'))return false;const next=normalizeSong(raw);$('buildGuide').hidden=true;clearTimeout(autosaveTimer);stop(false);song=next;selected=0;dirty=false;undoStack=[];$('undoBtn').disabled=true;renderAll();writeStore('uke-strum-draft-v2',song);$('saveStatus').textContent=song.id?'Saved song loaded':'Starter ready to edit';return true;}
function renderLibrary(){const query=$('songSearch').value.toLowerCase();const list=(libraryTab==='starter'?STARTERS:savedSongs).map((s,i)=>({s,i})).filter(({s})=>s.title.toLowerCase().includes(query));$('starterTab').classList.toggle('active',libraryTab==='starter');$('savedTab').classList.toggle('active',libraryTab==='saved');$('libraryNote').textContent=libraryTab==='starter'?`${STARTERS.length} editable classroom arrangements with one, two, or three chords.`:'Your saved songs in this browser. Export them to keep a separate backup.';$('songLibrary').innerHTML=list.length?list.map(({s,i})=>{const ch=[...new Set(s.measures.flatMap(m=>m.chords.map(c=>c.chord)).filter(c=>c!=='--'))];return `<article class="song-card"><span class="badge">${ch.length} chord${ch.length===1?'':'s'} · ${ch.join(' · ')}</span><h3>${esc(s.title)}</h3><p class="song-meta">${s.meter} &nbsp; / &nbsp; ${s.tempo} BPM &nbsp; / &nbsp; ${s.measures.length} measures</p><p class="hint">${esc(s.description||'Your saved arrangement')}</p><div class="row"><button class="small primary" data-load-song="${i}">${libraryTab==='starter'?'Use this song':'Load song'}</button>${libraryTab==='saved'?`<button class="small danger" data-delete-song="${i}">Delete</button>`:''}</div></article>`;}).join(''):'<p class="hint">No songs here yet. Use Save song to keep your arrangement.</p>';}
function showInfo(title,html){$('generalTitle').textContent=title;$('generalContent').innerHTML=html;$('generalModal').showModal();}
function downloadJSON(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9_-]+/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
// One AudioContext clock drives the accompaniment, lyric cues, and chord changes.
let ctx=null,master=null,audioOutput=null,gate=null,ukeBus=null,midiAccess=null,midiOut=null;
const noteCache=new Map();
const transport={state:'stopped',pos:0,tick:0,origin:0,next:0,timer:null,frame:null,generation:0,queue:[]};
let activeCue=null,lastVisual=-999,playhead=0;
async function initAudio(){if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.8;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;master.connect(comp);audioOutput=ctx.createGain();comp.connect(audioOutput);audioOutput.connect(ctx.destination);}if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running')throw Error('Audio is suspended. Tap Play again.');}
function makeGate(){gate=ctx.createGain();gate.connect(master);ukeBus=ctx.createGain();ukeBus.gain.value=+$('volume').value/100;ukeBus.connect(gate);return gate;}
function silence(){if(gate){try{gate.gain.cancelScheduledValues(ctx.currentTime);gate.gain.setTargetAtTime(0,ctx.currentTime,.005);const oldGate=gate;setTimeout(()=>{try{oldGate.disconnect();}catch{}},60);gate=null;}catch{}}if(midiOut){try{midiOut.clear();midiOut.send([0xb0,123,0]);midiOut.send([0xb0,120,0]);}catch{}}}
function stringBuffer(note){if(noteCache.has(note))return noteCache.get(note);const sr=ctx.sampleRate,f=440*Math.pow(2,(note-69)/12),length=Math.ceil(sr*1.8),b=ctx.createBuffer(1,length,sr),d=b.getChannelData(0);const phases=[0,.4,.8,.2,.9,1.5];for(let i=0;i<length;i++){const t=i/sr,attack=Math.min(1,t/.003);let v=0;for(let h=1;h<=6;h++)v+=Math.sin(2*Math.PI*f*h*t+phases[h-1])*Math.exp(-t*(3.3+h*1.8))/Math.pow(h,1.7);d[i]=v*.5*attack+(Math.random()*2-1)*Math.exp(-t*200)*.035;}noteCache.set(note,b);return b;}
function strum(chord,time,velocity,up=false,muted=false){const f=CHORD_FINGERINGS[chord];if(!f)return;const order=up?[3,2,1,0]:[0,1,2,3];for(let i=0;i<4;i++){const s=order[i],note=[67,60,64,69][s]+f[s],at=time+i*.012;if(midiOut){if(+$('volume').value===0)continue;const t=performance.now()+Math.max(0,at-ctx.currentTime)*1000;try{midiOut.send([0x90,note,Math.round(clamp(velocity*100*(+$('volume').value/100),1,127))],t);midiOut.send([0x80,note,0],t+(muted?70:700));}catch{}}else{const source=ctx.createBufferSource(),g=ctx.createGain();source.buffer=stringBuffer(note);g.gain.value=velocity*.29;source.connect(g);g.connect(ukeBus);source.start(at);if(muted){g.gain.setValueAtTime(velocity*.2,at);g.gain.exponentialRampToValueAtTime(.001,at+.06);source.stop(at+.07);}source.onended=()=>{source.disconnect();g.disconnect();};}}}
function chuck(time,velocity){if(midiOut){if(+$('volume').value===0)return;velocity*=+$('volume').value/100;try{const t=performance.now()+Math.max(0,time-ctx.currentTime)*1000;midiOut.send([0x99,37,Math.round(velocity*80)],t);midiOut.send([0x89,37,0],t+60);}catch{}return;}const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.07),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*.14));const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=b;filter.type='bandpass';filter.frequency.value=1200;gain.gain.value=velocity*.3;source.connect(filter);filter.connect(gain);gain.connect(ukeBus);source.start(time);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
function click(time,accent){const osc=ctx.createOscillator(),g=ctx.createGain();osc.frequency.value=accent?1100:750;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(.6,time+.001);g.gain.exponentialRampToValueAtTime(.001,time+.045);osc.connect(g);g.connect(gate);osc.start(time);osc.stop(time+.05);osc.onended=()=>{osc.disconnect();g.disconnect();};}
function clearTimers(){clearTimeout(transport.timer);cancelAnimationFrame(transport.frame);transport.timer=null;transport.frame=null;transport.queue=[];}
async function start(from=null){if(transport.state==='playing'){pause();return;}const gen=++transport.generation;try{await initAudio();}catch(e){toast(e.message||'Audio is unavailable in this browser.');return;}if(gen!==transport.generation)return;if(!midiOut){const notes=new Set(song.measures.flatMap(m=>m.chords.flatMap(c=>(CHORD_FINGERINGS[c.chord]||[]).map((f,i)=>[67,60,64,69][i]+f))));for(const note of notes)stringBuffer(note);}clearTimers();silence();makeGate();const d=duration();if(from!==null){transport.pos=from*config().steps*d;}else if(transport.state==='finished'){transport.pos=0;}
 if(transport.state!=='paused'&&transport.pos===0&&$('countIn').checked)transport.pos=-countInSteps()*d;
 transport.origin=ctx.currentTime+.08-transport.pos;transport.next=Math.floor(transport.pos/d+1e-6);transport.state='playing';lastVisual=-999;schedule();draw();updateTransport();}
function pause(){if(transport.state!=='playing')return;transport.pos=Math.max(-countInSteps()*duration(),ctx.currentTime-transport.origin);transport.state='paused';transport.generation++;clearTimers();silence();$('stage').classList.remove('counting');updateTransport();}
function stop(redraw=true){transport.generation++;clearTimers();silence();transport.state='stopped';transport.pos=0;transport.tick=0;lastVisual=-999;$('stage').classList.remove('counting');if(redraw){renderPosition(0);updateTransport();}}
function finish(){clearTimers();transport.state='finished';transport.pos=totalSteps()*duration();transport.tick=totalSteps()-1;transport.generation++;$('stage').classList.remove('counting');$('currentLyric').textContent='';$('nextLyric').textContent='';$('lyricFill').style.width='100%';$('nextChord').textContent='✓';$('nextCount').textContent='Song complete';updateTransport();}
function schedule(){if(transport.state!=='playing')return;const d=duration(),n=config().steps,total=totalSteps();let limit=0;while(transport.origin+transport.next*d<ctx.currentTime+.12&&limit++<128){const abs=transport.next++;if(abs>=total&&!song.loop){transport.queue.push({time:transport.origin+total*d,end:true});break;}const tick=((abs%total)+total)%total,step=tick%n;const sw=abs>=0&&song.meter!=='6/8'&&step%2?song.swing*d:0,time=transport.origin+abs*d+sw;if(time<ctx.currentTime-.012)continue;
 if(abs<0){const countStep=abs+countInSteps();if(countStep%countStepSize()===0)click(time,countInAccent(countStep));transport.queue.push({time,absolute:abs});}
 else{const pat=STRUM_PATTERNS[song.pattern].pattern[step],chord=chordAt(tick);if(pat.type==='D'||pat.type==='U')strum(chord,time,pat.velocity,pat.type==='U');else if(pat.type==='X'&&chord!=='--')chuck(time,pat.velocity);if($('metronomeToggle').checked&&step%config().beat===0)click(time,step===0);transport.queue.push({time,absolute:abs});}}
 if((transport.next<=total||song.loop)&&transport.state==='playing')transport.timer=setTimeout(schedule,25);}
function draw(){if(transport.state!=='playing')return;const now=ctx.currentTime;while(transport.queue.length&&transport.queue[0].time<=now){const ev=transport.queue.shift();if(ev.end){finish();return;}if(ev.absolute!==lastVisual){lastVisual=ev.absolute;if(ev.absolute<0){renderCount(ev.absolute);}else{const tick=ev.absolute%totalSteps();transport.tick=tick;renderPosition(tick);}}}
 const scoreTime=now-transport.origin;if(scoreTime>=0){const tickFloat=(scoreTime/duration())%totalSteps();if(activeCue){const fraction=clamp((tickFloat-activeCue.start)/(activeCue.end-activeCue.start),0,1);$('lyricFill').style.width=`${fraction*100}%`;}}
 transport.frame=requestAnimationFrame(draw);}
function renderStageEnding(ending){$('stageStrums').dataset.ending=String(ending);}
let lyricDisplay=null,lyricCrawlTick=0,lyricExit=null,lyricTailFrame=0,finishMenuTimer=0;
function lyricMotionEnabled(){return !document.body.classList.contains('motion-paused')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function lyricFade(elapsed,span){const p=clamp(elapsed/span,0,1);return p*p*(3-2*p);}
function clearDepartingLyric(){lyricExit=null;$('departingLyric').hidden=true;$('departingLyric').textContent='';cancelAnimationFrame(lyricTailFrame);lyricTailFrame=0;}
function positionLyricCrawl(fraction=0){
 const row=($('lyricCrawl').clientHeight||0)/3;
 $('currentLyric').style.transform=`translate3d(0,${row*(1-fraction)}px,0)`;
 $('nextLyric').style.transform=`translate3d(0,${row*(2-fraction)}px,0)`;
}
function clearLyricMotion(){clearDepartingLyric();positionLyricCrawl();$('currentLyric').style.opacity='1';$('nextLyric').style.opacity='1';}
function clearFinishMenu(){clearTimeout(finishMenuTimer);finishMenuTimer=0;$('finishMenu').hidden=true;}
function revealFinishMenu(){
 if(isProjector||$('stage').hidden){clearFinishMenu();return;}
 if(finishMenuTimer||!$('finishMenu').hidden)return;
 // Let the staggered wave entrance settle, then offer the way back home.
 finishMenuTimer=setTimeout(()=>{finishMenuTimer=0;if(transport.state==='finished'&&!isProjector&&!$('stage').hidden)$('finishMenu').hidden=false;},lyricMotionEnabled()?2350:1000);
}
function resetLyricScroll(){clearFinishMenu();$('finishMessage').hidden=true;lyricDisplay=null;lyricCrawlTick=0;clearLyricMotion();$('currentLyric').style.fontSize='';$('nextLyric').style.fontSize='';}
function updateLyricCrawl(tick=lyricCrawlTick){
 lyricCrawlTick=tick;
 const enabled=lyricMotionEnabled(),moving=enabled&&lyricDisplay?.scrollable&&activeCue;
 positionLyricCrawl(moving?clamp((tick-activeCue.start)/(activeCue.end-activeCue.start),0,1):0);
 // Sung phrases stay fully opaque; only the final-strum prompt fades with its ending bar.
 $('currentLyric').style.opacity='1';
 if(enabled&&lyricDisplay?.key==='ending'){
  const fadeSteps=Math.min(1/duration(),(lyricDisplay.end-lyricDisplay.start)/2);
  $('currentLyric').style.opacity=String(1-lyricFade(tick-(lyricDisplay.end-fadeSteps),fadeSteps));
 }
 $('nextLyric').style.opacity=String(moving&&lyricDisplay.entering?lyricFade(tick-lyricDisplay.start,lyricDisplay.fadeSteps):1);
 if(lyricExit){
  const elapsed=Math.max(0,tick-lyricExit.start),fade=lyricFade(elapsed,lyricExit.fadeSteps);
  if(!enabled||fade>=1){clearDepartingLyric();}
  else{const row=($('lyricCrawl').clientHeight||0)/3;$('departingLyric').style.transform=`translate3d(0,${-row*elapsed/lyricExit.span}px,0)`;$('departingLyric').style.opacity=String(1-fade);}
 }
}
function fitLyricText(){
 if(typeof getComputedStyle!=='function')return;
 const lines=[$('currentLyric'),$('nextLyric')];let common=Infinity;
 for(const el of lines){if(!el.clientWidth||!el.clientHeight)continue;el.style.fontSize='';let size=parseFloat(getComputedStyle(el).fontSize);while(size>12&&(el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)){size--;el.style.fontSize=size+'px';}common=Math.min(common,size);}
 if(Number.isFinite(common)&&!$('stage').classList.contains('counting'))for(const el of lines)el.style.fontSize=common+'px';
}
function renderLyricLines(current,next,key,allowMotion=true,at=playhead){
 const previous=lyricDisplay,height=$('lyricCrawl').clientHeight||0;
 const w=typeof windowBounds==='function'?windowBounds():{start:0,end:totalSteps(),loop:song.loop};
 const wrapped=!!(previous&&w.loop&&previous.end===w.end&&playhead===w.start&&lyricCrawlTick>=w.end-1);
 if(previous?.key===key&&previous.current===current&&previous.next===next&&previous.height===height&&!wrapped)return;
 const changed=previous?.key!==key||wrapped,start=key==='finished'?(previous?.end??playhead):key==='ending'?Math.floor(at/config().steps)*config().steps:(activeCue?.start??at),end=key==='ending'?start+config().steps:(activeCue?.end??start+1),span=Math.max(1,end-start);
 const fadeSteps=Math.min(.7/duration(),span/4);
 if(changed){
  clearDepartingLyric();
  // Retain only a completed sung phrase, including at a loop boundary or final cutoff.
  if(previous?.scrollable&&previous.current&&lyricMotionEnabled()&&(transport.state==='playing'||transport.state==='finished')&&(previous.end<=at||wrapped||key==='finished')){
   lyricExit={start,span:Math.max(1,previous.end-previous.start),fadeSteps:key==='finished'?Math.min(.7/duration(),Math.max(1,previous.end-previous.start)/4):fadeSteps};
   const outgoing=$('departingLyric');outgoing.textContent=previous.current;outgoing.style.fontSize=$('currentLyric').style.fontSize;outgoing.hidden=false;
  }
 }
 const entering=changed?!!(allowMotion&&next&&transport.state==='playing'):previous?.entering;
 $('currentLyric').textContent=current;$('nextLyric').textContent=next;lyricDisplay={current,next,key,height,start,end,fadeSteps,entering,scrollable:allowMotion};fitLyricText();updateLyricCrawl(key==='finished'?start:at);
 // A custom song without an ending measure still lets its last sung line leave gently.
 if(key==='finished'&&lyricExit){const at=performance.now();function tail(){lyricTailFrame=0;if(transport.state!=='finished'){clearDepartingLyric();return;}updateLyricCrawl(start+(performance.now()-at)/1000/duration());if(lyricExit)lyricTailFrame=requestAnimationFrame(tail);}lyricTailFrame=requestAnimationFrame(tail);}
}
window.addEventListener?.('resize',()=>{fitLyricText();updateLyricCrawl();});
// The lyric clock may lead the chord clock, including into the next loop.
function renderLyricsAt(phase,counting=false){
 updateStrumHand(phase,counting);
 if(typeof updateChordProgress==='function')updateChordProgress(phase,counting);
 const list=playbackCues(phase,counting);
 const current=list.find(c=>phase>=c.start&&phase<c.end)||null;
 if(counting&&!current)return false;
 activeCue=current;
 const next=current?list[list.indexOf(current)+1]:list.find(c=>c.start>phase),tick=mappedTick(phase),ending=!counting&&isEndingMeasure(song,Math.floor(tick));
 $('stage').classList.remove('counting');
 $('lyricStage').hidden=!song.showLyrics;
 renderLyricLines(ending?'One final strum ↓':current?.text||(song.measures.some(m=>!m.ending&&m.lyric.trim())?'Instrumental':'Strum together'),ending?'':next?.text||'',ending?'ending':current?String(current.start):'rest',!ending,phase);
 $('lyricProgress').hidden=!current||counting;
 $('lyricFill').style.width=current?`${clamp((phase-current.start)/(current.end-current.start),0,1)*100}%`:'0%';
 updateLyricCrawl(phase);return true;
}
function renderCount(abs){
 renderStageEnding(false);if(!countingDisplay)renderBeatDots(true);
 const target=transport.countUntil||0,elapsed=abs+countInSteps(),count=Math.floor(elapsed/countStepSize())+1,c=chordAt(target);
 if(!renderLyricsAt(target+abs,true)){
  resetLyricScroll();activeCue=null;$('stage').classList.add('counting');
  $('currentLyric').textContent=countInPrompt(count);$('nextLyric').textContent=cueAt(target)?.text||'Find your first chord';$('lyricStage').hidden=false;$('lyricProgress').hidden=true;
 }
 $('currentChord').textContent=c==='--'?'Rest':c;$('stageDiagram').innerHTML=diagram(c);$('nextChord').textContent=c==='--'?'Rest':c;$('nextLabel').textContent='First chord';$('nextCount').textContent=`Start after ${countInCounts()}`;$('editorStatus').textContent=`Count-in · ${count}`;$('stageStatus').textContent=`Count-in · ${count} of ${countInCounts()}`;highlightSteps(elapsed,true);
}
function highlightSteps(step,counting=false){document.querySelectorAll('#stageBeats .beat-dot').forEach(el=>el.classList.toggle('on',counting?Math.floor(+el.dataset.step/countStepSize())===Math.floor(step/countStepSize()):song.meter==='6/8'?+el.dataset.step===step:Math.floor(+el.dataset.step/2)===Math.floor(step/2)));document.querySelectorAll('#patternVisual .strum-step,#stageStrums .strum-step').forEach((el,i)=>el.classList.toggle('active',!counting&&i%config().steps===step));}
function renderPosition(tick,phase=displayPhase(tick)){renderStageEnding(isEndingMeasure(song,tick));if(countingDisplay)renderBeatDots(false);tick=Math.min(playbackPlan().scoreEnd-1,Math.max(0,tick));playhead=tick;$('stage').classList.remove('counting');const n=config().steps,bar=Math.floor(tick/n),step=tick%n,chord=chordAt(tick),change=nextChange(tick,phase);$('currentChord').textContent=chord==='--'?'Rest':chord;$('stageDiagram').innerHTML=diagram(chord);$('nextLabel').textContent=change?'Next change':'Keep this chord';$('nextChord').textContent=change?(change.chord==='--'?'Rest':change.chord):chord==='--'?'—':chord;
 if(change)$('nextCount').textContent='Get your fingers ready';
 else $('nextCount').textContent=song.loop?'Keep going through the loop':'Through the end';
 renderLyricsAt(phase);
 document.querySelectorAll('.measure').forEach((el,i)=>{el.classList.toggle('playing',i===bar&&transport.state==='playing');el.querySelectorAll('.mini-beats i').forEach((b,j)=>b.classList.toggle('on',i===bar&&Math.floor(step/config().beat)===j&&transport.state==='playing'));});highlightSteps(step);if(transport.state==='playing'){const lastBar=typeof windowBounds==='function'?windowBounds().end/n:song.measures.length,status=`Measure ${bar+1} / ${lastBar}`;$('editorStatus').textContent=status;$('stageStatus').textContent=status;if($('stage').hidden&&step===0){const el=$('measuresGrid').children[bar];if(el){const box=el.getBoundingClientRect(),parent=$('measuresGrid').getBoundingClientRect();if(box.bottom>parent.bottom||box.top<parent.top)el.scrollIntoView({block:'nearest',behavior:'smooth'});}}}}
function updateTransport(){updateStrumHand();const playing=transport.state==='playing',paused=transport.state==='paused',finished=transport.state==='finished';$('finishMessage').hidden=!finished;if(finished){renderLyricLines('','','finished',false);$('lyricStage').hidden=false;revealFinishMenu();}else clearFinishMenu();$('playBtn').textContent=playing?'Ⅱ Pause':paused?'▶ Resume':finished?'↻ Play again':'▶ Play';$('stagePlay').textContent=$('playBtn').textContent;if(!playing){const state=paused?`Paused · measure ${Math.floor(transport.tick/config().steps)+1}`:finished?'Song complete':'Ready to play';$('editorStatus').textContent=state;$('stageStatus').textContent=state;document.querySelectorAll('.measure.playing').forEach(el=>el.classList.remove('playing'));}}
function seek(bar){const target=clamp(bar,0,song.measures.length-1);const playing=transport.state==='playing';stop(false);transport.pos=target*config().steps*duration();transport.tick=target*config().steps;renderPosition(transport.tick);if(playing)start(target);else updateTransport();}
async function audition(){if(transport.state==='playing')return;const gen=++transport.generation;try{await initAudio();if(gen!==transport.generation||transport.state==='playing')return;silence();makeGate();strum(song.measures[selected].chords[0].chord,ctx.currentTime+.025,.9);}catch{toast('Tap again to enable audio.');}}
async function connectMidi(){if(!navigator.requestMIDIAccess){toast('MIDI output is not supported here. Built-in sound is available.');return;}try{midiAccess=await navigator.requestMIDIAccess({sysex:false});function refresh(){const old=$('midiOutput').value;$('midiOutput').innerHTML='<option value="internal">Built-in ukulele</option>';for(const out of midiAccess.outputs.values()){const opt=document.createElement('option');opt.value=out.id;opt.textContent=out.name||'MIDI device';$('midiOutput').appendChild(opt);}if([...$('midiOutput').options].some(o=>o.value===old))$('midiOutput').value=old;else{midiOut=null;stop();}}refresh();midiAccess.onstatechange=refresh;toast(midiAccess.outputs.size?'Choose your device in Audio output.':'No MIDI outputs found. Connect your device and check again.');}catch{toast('MIDI access was not granted. Built-in sound is ready.');}}
$('chordPalette').innerHTML=['C','F','G','G7','Am','C7','Dm','--'].map(c=>`<button data-quick-chord="${c}" title="Use ${c==='--'?'rest':c}">${c==='--'?'Rest':c}</button>`).join('');
$('measuresGrid').addEventListener('click',e=>{const el=e.target.closest('[data-measure]');if(!el)return;selected=+el.dataset.measure;renderMeasures();renderInspector();$('measuresGrid').children[selected]?.focus({preventScroll:true});});
$('chordPalette').addEventListener('click',e=>{const el=e.target.closest('[data-quick-chord]');if(el)mutate(()=>song.measures[selected].chords[0].chord=el.dataset.quickChord);});
$('chordEditors').addEventListener('change',e=>{const el=e.target;if(el.dataset.chordIndex!==undefined)mutate(()=>song.measures[selected].chords[+el.dataset.chordIndex].chord=el.value);else if(el.dataset.stepIndex!==undefined)mutate(()=>{song.measures[selected].chords[+el.dataset.stepIndex].step=+el.value;song.measures[selected].chords.sort((a,b)=>a.step-b.step);});});
$('chordEditors').addEventListener('click',e=>{const b=e.target.closest('[data-remove-chord]');if(b)mutate(()=>song.measures[selected].chords.splice(+b.dataset.removeChord,1));});
$('addChord').onclick=()=>mutate(()=>{const m=song.measures[selected],n=config().steps,free=Array.from({length:n},(_,i)=>i).filter(s=>!m.chords.some(c=>c.step===s));const step=free.includes(config().beat*Math.floor(config().beats/2))?config().beat*Math.floor(config().beats/2):free[0];if(step!==undefined){m.chords.push({step,chord:'G7'});m.chords.sort((a,b)=>a.step-b.step);}});
for(const [id,key] of [['songTitle','title'],['lyricInput','lyric']]){$(id).addEventListener('focus',checkpoint);$(id).addEventListener('input',e=>{stopForEdit();if(id==='songTitle')song[key]=e.target.value;else song.measures[selected][key]=e.target.value;changed();renderMeasures();renderStageBase();});}
$('songLyricPickup').onchange=e=>mutate(()=>song.lyricPickup=normalizePickup(e.target.value));
$('lineLyricPickup').onchange=e=>mutate(()=>song.measures[selected].lyricPickup=normalizePickup(e.target.value,null));
$('lyricStart').onchange=e=>mutate(()=>song.measures[selected].lyricStart=+e.target.value);
$('lyricSpan').onchange=e=>mutate(()=>song.measures[selected].lyricSpan=Math.floor(clamp(e.target.value,1,32,1)));
$('timeSignature').onchange=e=>{const meter=e.target.value,old=config().steps,next=METERS[meter].steps;if(song.measures.some(m=>m.chords.some(c=>c.step>=next)||m.lyricStart>=next)&&!confirm('Changing meter will move any cues beyond the new measure length to its last subdivision. Continue?')){e.target.value=song.meter;return;}mutate(()=>{song.meter=meter;song.pattern=METERS[meter].default;if(meter==='6/8')song.swing=0;for(const m of song.measures){const unique=new Map(m.chords.map(c=>{const step=Math.min(c.step,next-1);return [step,{step,chord:c.chord}];}));m.chords=[...unique.values()].sort((a,b)=>a.step-b.step);m.lyricStart=Math.min(m.lyricStart,next-1);}});};
$('tempo').onchange=e=>mutate(()=>song.tempo=Math.round(clamp(e.target.value,40,200,100)));
$('strumPattern').onchange=e=>mutate(()=>song.pattern=e.target.value);
$('swingAmount').onchange=e=>mutate(()=>song.swing=+e.target.value);
for(const [id,key] of [['lyricsToggle','showLyrics'],['diagramToggle','showDiagrams'],['strumToggle','showStrum']])$(id).onchange=e=>{song[key]=e.target.checked;changed();renderStageBase();renderPattern();renderPosition(transport.tick);};
$('loopToggle').onchange=e=>setPlaybackMode(e.target.value);$('stageLoop').onchange=e=>setPlaybackMode(e.target.value);
$('volume').oninput=e=>{if(master)master.gain.setTargetAtTime(+e.target.value/100,ctx.currentTime,.025);};$('connectMidi').onclick=connectMidi;$('midiOutput').onchange=e=>{stop();midiOut=midiAccess?.outputs.get(e.target.value)||null;};
let taps=[];$('tapTempo').onclick=()=>{const now=performance.now();if(taps.length&&now-taps[taps.length-1]>2000)taps=[];taps.push(now);if(taps.length>6)taps.shift();if(taps.length>1){const bpm=Math.round(clamp(60000/((taps.at(-1)-taps[0])/(taps.length-1)),40,200));mutate(()=>song.tempo=bpm);}};
$('addMeasure').onclick=()=>{if(song.measures.length>=1024)return toast('Maximum 1,024 measures per song.');mutate(()=>{song.measures.push(measure(song.measures.at(-1).chords.at(-1).chord));selected=song.measures.length-1;});$('measuresGrid').lastElementChild.scrollIntoView({block:'nearest'});};
$('duplicateMeasure').onclick=()=>{if(song.measures.length>=1024)return;mutate(()=>{song.measures.splice(selected+1,0,clone(song.measures[selected]));selected++;});};
$('copyFour').onclick=()=>{if(song.measures.length>1020)return;mutate(()=>{const last=song.measures.slice(-4);selected=song.measures.length;song.measures.push(...clone(last));});};
$('deleteMeasure').onclick=()=>{if(song.measures.length>1)mutate(()=>song.measures.splice(selected,1));};
$('moveLeft').onclick=()=>mutate(()=>{if(selected){[song.measures[selected-1],song.measures[selected]]=[song.measures[selected],song.measures[selected-1]];selected--;}});
$('moveRight').onclick=()=>mutate(()=>{if(selected<song.measures.length-1){[song.measures[selected+1],song.measures[selected]]=[song.measures[selected],song.measures[selected+1]];selected++;}});
$('undoBtn').onclick=()=>{if(!undoStack.length)return;stop(false);song=undoStack.pop();changed();renderAll();$('undoBtn').disabled=!undoStack.length;};
function updateNewSongHint(){const meter=$('newSongMeter').value;$('newSongCountHint').textContent=meter==='2/4'?'Four-beat intro: 1 · 2 · 3 · 4, then play in 2/4.':meter==='3/4'?'Count-in: 1 · 2 · 3, then play.':meter==='6/8'?'Two measures to get ready: 1 · 2 · Ready · Play, on four big beats.':'Count-in: 1 · 2 · 3 · 4, then play.';}
function openNewSong(){if(transport.state==='playing')pause();$('libraryModal').close();$('newSongName').value='My new song';$('newSongMeter').value='4/4';$('newSongTempo').value=80;$('newSongBars').value='8';$('newSongChord').value='C';$('newSongPickup').value='0';updateNewSongHint();$('newSongModal').showModal();$('newSongName').focus();$('newSongName').select();}
$('newSong').onclick=openNewSong;$('newSongInline').onclick=openNewSong;$('newSongLibrary').onclick=openNewSong;
$('newSongMeter').onchange=()=>{const meter=$('newSongMeter').value;$('newSongTempo').value=meter==='6/8'?60:80;updateNewSongHint();};
$('newSongForm').onsubmit=e=>{e.preventDefault();const meter=$('newSongMeter').value;if(!METERS[meter])return;const bars=Math.floor(clamp($('newSongBars').value,4,32,8)),tempo=Math.round(clamp($('newSongTempo').value,40,200,80)),chord=$('newSongChord').value;if(!Object.hasOwn(CHORD_FINGERINGS,chord))return;const blank=template($('newSongName').value.trim().slice(0,120)||'My new song',meter,tempo,METERS[meter].default,Array(bars).fill(chord),[],'','');blank.lyricPickup=normalizePickup($('newSongPickup').value);if(!loadSong(blank))return;$('newSongModal').close();$('buildGuide').hidden=false;$('countIn').checked=true;changed();$('measuresGrid').firstElementChild?.focus();$('buildGuide').scrollIntoView({block:'nearest',behavior:'smooth'});toast('Song created! Choose a measure, then pick its chord in the edit panel.');};
$('hideBuildGuide').onclick=()=>$('buildGuide').hidden=true;
$('bulkLyrics').onclick=()=>{$('bulkLyricText').value='';$('lyricsModal').showModal();};
$('applyLyrics').onclick=()=>{const lines=$('bulkLyricText').value.split(/\n/).map(s=>s.trim()).filter(Boolean);const span=Math.floor(clamp($('bulkSpan').value,1,8,2));if(!lines.length)return toast('Add at least one lyric line.');if(selected+lines.length*span>1024)return toast('These lyrics would exceed 1,024 measures.');mutate(()=>{while(song.measures.length<selected+lines.length*span)song.measures.push(measure(song.measures.at(-1).chords.at(-1).chord));for(let i=selected;i<selected+lines.length*span;i++){song.measures[i].lyric='';song.measures[i].lyricStart=0;song.measures[i].lyricSpan=1;}lines.forEach((line,i)=>{song.measures[selected+i*span].lyric=line.slice(0,300);song.measures[selected+i*span].lyricSpan=span;});});$('lyricsModal').close();toast('Lyric lines placed. Select any measure to adjust its cue.');};
$('libraryBtn').onclick=()=>{if(transport.state==='playing')pause();renderLibrary();$('libraryModal').showModal();};
$('starterTab').onclick=()=>{libraryTab='starter';renderLibrary();};$('savedTab').onclick=()=>{libraryTab='saved';renderLibrary();};$('songSearch').oninput=renderLibrary;
$('songLibrary').onclick=e=>{const load=e.target.closest('[data-load-song]'),del=e.target.closest('[data-delete-song]');if(load){const raw=(libraryTab==='starter'?STARTERS:savedSongs)[+load.dataset.loadSong];if(loadSong(raw))$('libraryModal').close();}else if(del){const i=+del.dataset.deleteSong;if(confirm(`Delete “${savedSongs[i].title}” from My songs?`)){const next=savedSongs.filter((_,j)=>j!==i);if(writeStore('uke-strum-songs-v2',next)){savedSongs=next;renderLibrary();}}}};
$('saveBtn').onclick=()=>{if(transport.state==='playing')pause();const title=prompt('Save song as:',song.title||'My ukulele song');if(title===null||!title.trim())return;const saved=clone(song);saved.title=title.trim().slice(0,120);saved.id=saved.id||uid();const next=clone(savedSongs),index=next.findIndex(s=>s.id===saved.id);if(index>=0)next[index]=saved;else next.push(saved);if(writeStore('uke-strum-songs-v2',next)){song=saved;savedSongs=next;dirty=false;clearTimeout(autosaveTimer);writeStore('uke-strum-draft-v2',song);$('saveStatus').textContent='Song saved';renderSettings();toast('Saved in My songs.');}};
$('exportCurrent').onclick=()=>downloadJSON({format:'uke-strum',version:3,song},song.title||'Uke_Strum_Song');
$('exportAll').onclick=()=>downloadJSON({format:'uke-strum',version:3,songs:savedSongs},'Uke_Strum_My_Songs');
$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('Please choose a song JSON file under 5 MB.');const data=JSON.parse(await file.text()),raw=Array.isArray(data)?data:Array.isArray(data.songs)?data.songs:data.song?[data.song]:[data];if(!raw.length||raw.length>200)throw Error('Import 1–200 songs at a time.');const imported=raw.map(s=>({...normalizeSong(s),id:uid()}));const next=[...savedSongs,...imported];if(writeStore('uke-strum-songs-v2',next)){savedSongs=next;libraryTab='saved';$('songSearch').value='';renderLibrary();toast(`${imported.length} song${imported.length===1?'':'s'} imported into My songs.`);}}catch(err){toast('Could not import: '+err.message);}e.target.value='';};
$('chordChartBtn').onclick=()=>{const names=[...new Set(song.measures.flatMap(m=>m.chords.map(c=>c.chord)))].filter(c=>c!=='--');showInfo('Chords in this song',`<p class="modal-note">G–C–E–A tuning · Strings 4 to 1, left to right. Open circles mean open strings. Dot numbers are fingers: 1 index, 2 middle, 3 ring, 4 little.</p><div class="chord-charts">${names.map(c=>`<div><h2>${esc(c)}</h2>${diagram(c)}<p class="hint">${CHORD_FINGERINGS[c].join(' · ')}</p></div>`).join('')}</div><p class="hint" style="margin-top:18px">C uses the A string (string 1), third fret. Soprano and concert ukuleles use these same shapes in G–C–E–A tuning.</p>`);};
$('auditionBtn').onclick=audition;
$('printBtn').onclick=()=>{if(transport.state==='playing')pause();const names=[...new Set(song.measures.flatMap(m=>m.chords.map(c=>c.chord)))].filter(c=>c!=='--');$('printArea').innerHTML=`<h1>${esc(song.title)}</h1><p>Mr. Drew's Uke Strum · ${song.meter} · ${song.tempo} ${song.meter==='6/8'?'dotted-quarter ':''}BPM · ${esc(STRUM_PATTERNS[song.pattern].name)} · G–C–E–A</p><div class="print-chords">${names.map(c=>`<div><b>${esc(c)}</b>${diagram(c)}</div>`).join('')}</div><table><thead><tr><th>Measure</th><th>Chords</th><th>Lyrics</th></tr></thead><tbody>${song.measures.map((m,i)=>`<tr><td>${i+1}</td><td>${m.chords.map(c=>`${esc(c.chord==='--'?'Rest':c.chord)} (${slotLabel(c.step)})`).join(' → ')}</td><td>${esc(m.lyric)}${m.lyric&&lyricPickupFor(m)?` <small>[${pickupLabel(lyricPickupFor(m))}]</small>`:''}${m.lyric&&m.lyricSpan>1?` <small>[${m.lyricSpan} measures]</small>`:''}${m.lyric&&m.lyricStart?` <small>[starts ${slotLabel(m.lyricStart)}]</small>`:''}</td></tr>`).join('')}</tbody></table>`;window.print();};
$('sourceBtn').onclick=()=>showInfo('About the starter songs',`<p>These are editable classroom accompaniments to familiar songs. Background notes identify adaptations and their sources. The chord choices and lyric cues here are editable practice arrangements. One-chord versions use a steady tonic accompaniment.</p><p class="modal-note">Only the familiar opening verse or refrain is included. The app plays ukulele chords; the class supplies the singing. Reference pages for words, melodies, and song history:</p>${starterBackground(STARTERS.find(s=>s.source===EPO_SOURCE))}<ul>${STARTERS.map(s=>`<li style="margin:9px 0"><a href="${esc(s.source)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul><p class="hint" style="margin-top:18px">Twinkle, Twinkle lyrics: Jane Taylor, 1806. All 12 strumming patterns from the original app are retained.</p>`);
$('helpBtn').onclick=()=>showInfo('Create. Sing. Strum together.',`<ol style="padding-left:22px;line-height:1.85"><li><b>Click the coral New Song button</b> at the top. Name your song, choose its meter, tempo, and number of measures, then click Create song. Or choose a starter from Song library.</li><li><b>Click a measure.</b> Choose chords on the right. Add a chord change at any beat or “&”. Rest means silence; chord choices last until the next change.</li><li><b>Add a singing phrase.</b> Set its starting beat and how many measures it stays on screen. Choose Lyrics pickup to sing before that beat, or override it for one line. Use Add lyric lines to place several phrases at once.</li><li><b>Choose a strum and tempo.</b> Pattern choices match the meter. In 2/4, the intro always counts four beats before the song begins. In 6/8, the intro counts four big beats across two measures: “1, 2, Ready, Sing” (or “Play” without lyrics). Tempo counts dotted-quarter beats.</li><li><b>Choose playback.</b> Play twice repeats the song once, then finishes on its last chord. Play once and Loop are also available. The count-in plays only at the beginning.</li><li><b>Open Classroom view.</b> Students see the current chord, the next change, lyrics, beat numbers, and a strumming hand. Pause resumes from the same place. Stop resets to the beginning.</li><li><b>Save and export.</b> Drafts and named songs stay in this browser. Export JSON to move songs between computers.</li></ol><p class="modal-note">Space = play / pause. In Classroom view, ← and → move by one measure; Esc exits. Full screen is optional. Tap Play to enable sound. Use Connect MIDI if you want to send chords to an external instrument.</p>`);
$('playBtn').onclick=()=>start();$('stagePlay').onclick=()=>start();$('stopBtn').onclick=()=>stop();$('stageStop').onclick=()=>stop();$('playSelected').onclick=()=>{stop(false);start(selected);};
$('performBtn').onclick=()=>{$('stage').hidden=false;$('editor').inert=true;document.body.style.overflow='hidden';renderStageBase();renderPosition(transport.tick);updateTransport();$('stagePlay').focus();};
function exitStage(){if(transport.state==='playing')pause();$('stage').hidden=true;$('editor').inert=false;document.body.style.overflow='';if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});renderInspector();$('performBtn').focus();}
$('exitStage').onclick=exitStage;$('focusBtn').onclick=()=>{$('stage').classList.toggle('focus-view');$('focusBtn').textContent=$('stage').classList.contains('focus-view')?'Standard view':'Focus';};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{toast('Full screen is unavailable here. Classroom view still fills the window.');}};
$('previousBar').onclick=()=>seek(Math.floor(transport.tick/config().steps)-1);$('nextBar').onclick=()=>seek(Math.floor(transport.tick/config().steps)+1);
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.addEventListener('keydown',e=>{if(isProjector)return;if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(typeof beachView!=='undefined'&&beachView==='melody'){if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();if(melodyPlaying)stopMelody();else playMelody();}return;}if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();start();}if(!$('stage').hidden){if(e.key==='Escape')exitStage();else if(e.key==='ArrowLeft'){e.preventDefault();$('previousBar').click();}else if(e.key==='ArrowRight'){e.preventDefault();$('nextBar').click();}}});
// Pause instead of scheduling a burst if a device sleeps or hides the page.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!isProjector&&transport.state==='playing'&&!projectorIsOpen()){pause();toast('Playback paused while the page was hidden.');}});
window.addEventListener('beforeunload',()=>{clearTimeout(autosaveTimer);try{if(!isViewer) localStorage.setItem('uke-strum-draft-v2',JSON.stringify(window.UkeVideo?.originalSong||exerciseBackup?.song||song));}catch{}});
