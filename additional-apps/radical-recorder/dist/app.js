import { FINGERINGS, DEFAULTS, SONG_LIBRARY } from './data.js';
import { ALTO_KEYS, SOPRANO_KEYS, STORAGE_KEY, frequency, pitchName, registerName, noteLabel, parseNoteOrder, validateLibrary, validateProject, defaultProject, createSafeStorage, eventsToNotes, makeTimeline, clamp, pitchStackLayout, VIEW_DEFAULTS, changeView, rememberView, arrangeStack, songId, notesInSong, quantizeNotes, validateBoard } from './core.js';
import { AudioEngine } from './audio.js';
import {MUSIC_GLYPHS} from './glyphs.js';
import {makeMeasures,phraseWindows,rangeNotes,renderScore} from './score.js';
const $ = id => document.getElementById(id);
let noticeTimer;
function notice(message, persistent=false) {
    clearTimeout(noticeTimer); $('app-notice').textContent=message; $('app-notice').hidden=false;
    if (!persistent) noticeTimer=setTimeout(()=>$('app-notice').hidden=true,7000);
}
$('app-notice').onclick=()=>$('app-notice').hidden=true;
const storage=createSafeStorage(()=>window.localStorage,()=>notice('This browser cannot save changes permanently. Use Teacher Settings → Save All to keep a backup.',true));
function loadProject() {
    const current=storage.get(STORAGE_KEY);
    if (current) { try {return validateProject(JSON.parse(current));} catch { notice('Saved data could not be read. Your backup can be restored in Teacher Settings.',true); return defaultProject(); } }
    const p=defaultProject();
    for (const instrument of ['soprano','alto']) {
        const value=storage.get('radical_'+instrument);
        if (value) { try { p.settings[instrument+'Order']=parseNoteOrder(value,instrument).join(', '); } catch {notice('An old note list contained unsupported notes. The default list is shown.');} }
    }
    const songs=storage.get('radical_custom_songs');
    if (songs) {try {p.library=validateLibrary(JSON.parse(songs));} catch {notice('Old recordings could not be read. Import a valid backup to restore them.',true);}}
    p.settings.hidePresets=storage.get('radical_hide_presets')==='true';
    return p;
}
let project=loadProject();
const state={instrument:project.board.instrument,mode:'play',selected:null,displayed:null,lessonId:null,scorePage:0,measures:[],windows:[],scoreNodes:[]};
const board=()=>project.board;
const initialAutoStack=!project.stack.length&&!storage.get(STORAGE_KEY);
if(initialAutoStack)project.stack=arrangeStack(board().notes[state.instrument]);
function saveProject() {
    rememberView(board());
    project.settings.instrument=state.instrument;board().instrument=state.instrument;
    if(board().song&&state.instrument==='soprano')project.layouts[songId(board().song)]=structuredClone(project.stack);
    storage.set(STORAGE_KEY,JSON.stringify(project));
}
function currentNotes() {
    const selected=board().notes[state.instrument],order=parseNoteOrder(project.settings[state.instrument+'Order'],state.instrument);
    return [...order.filter(k=>selected.includes(k)),...selected.filter(k=>!order.includes(k))];
}
const audio=new AudioEngine(message=>notice(message));

// Native buttons support both pointer capture and keyboard holds. One note owns the audio at a time.
let activeHold=null, holdSequence=0;
function releaseHold() {
    if (!activeHold) return;
    const hold=activeHold; activeHold=null; holdSequence++;
    hold.end();
    if (hold.pointerId !== undefined && hold.element.hasPointerCapture?.(hold.pointerId)) hold.element.releasePointerCapture(hold.pointerId);
}
function bindHold(element,start,end,enabled=()=>true) {
    element.addEventListener('pointerdown',event=>{
        if (event.button !== 0 || !enabled()) return;
        event.preventDefault(); releaseHold();
        element.focus({preventScroll:true});
        element.setPointerCapture(event.pointerId);
        const hold={element,pointerId:event.pointerId,end}; activeHold=hold;
        start(++holdSequence);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) element.addEventListener(name,event=>{
        if (activeHold?.element===element && activeHold.pointerId===event.pointerId) releaseHold();
    });
    element.addEventListener('keydown',event=>{
        if (![' ','Enter'].includes(event.key) || !enabled()) return;
        event.preventDefault(); if(event.repeat) return; releaseHold();
        activeHold={element,end}; start(++holdSequence);
    });
    element.addEventListener('keyup',event=>{
        if ([' ','Enter'].includes(event.key)) {event.preventDefault(); if(activeHold?.element===element) releaseHold();}
    });
    element.addEventListener('blur',()=>{if(activeHold?.element===element) releaseHold();});
    // Assistive technology can invoke click without pointer/keyboard hold events.
    element.addEventListener('click',event=>{
        if (event.detail !== 0 || activeHold || !enabled()) return;
        if (performance.now()-(element.lastKeyRelease || 0)<150) return;
        releaseHold(); activeHold={element,end}; start(++holdSequence);
        setTimeout(()=>{if(activeHold?.element===element) releaseHold();},450);
    });
    element.addEventListener('keyup',()=>element.lastKeyRelease=performance.now());
}
async function soundHeld(key,token) {
    if (await audio.ready()) {
        if(activeHold && token===holdSequence) {audio.play(frequency(key)); $('recorder-svg').classList.add('playing');}
    }
}
function endManual() {
    recorder.capture(null); audio.stop(); $('recorder-svg').classList.remove('playing'); $('play-btn').classList.remove('held');$('recorder-play-btn').classList.remove('held');
    document.querySelectorAll('.stack-note').forEach(el=>el.classList.remove('playing'));
}
function startManual(key,token,force=false) {
    player.stop(false); state.selected=key; visualize(key); recorder.capture(key);
    if (force || project.settings.soundPreview) soundHeld(key,token);
}

// Recording preserves note holds and gaps; duplicate release events do not add spurious rests.
const recorder={
    status:'idle',events:[],started:0,pending:[],
    arm() {releaseHold();player.stop();this.events=[];this.pending=[];this.status='armed';this.update();},
    capture(key) {
        if(this.status==='idle') return;
        const now=performance.now();
        if(this.status==='armed') {
            if(!key) return;this.status='recording';this.started=now;this.events=[{k:key,t:0}];this.update();
        } else if(this.events.at(-1)?.k!==key) this.events.push({k:key,t:now-this.started});
    },
    finish() {
        if(this.status==='recording') this.events.push({k:null,t:performance.now()-this.started});
        this.pending=eventsToNotes(this.events);this.status='idle';releaseHold();audio.stop();this.update();
        if(this.pending.some(n=>n.k)) { $('song-title-input').value='';$('snap-recording').checked=false;$('record-tempo-hint').textContent=`Snap uses ${board().tempo} BPM. Leave it off to keep your original timing.`;openModal('save-song-modal','song-title-input'); }
        this.events=[];
    },
    update() {
        const btn=$('record-btn');btn.className='record-btn';
        btn.classList.toggle('armed',this.status==='armed');btn.classList.toggle('recording',this.status==='recording');
        btn.textContent=this.status==='recording'?'■':'●';
        btn.setAttribute('aria-label',this.status==='idle'?'Record a melody':this.status==='armed'?'Cancel recording':'Finish recording');
        btn.setAttribute('aria-pressed',String(this.status!=='idle'));
        $('record-status').textContent=this.status==='idle'?'Record melody':this.status==='armed'?'Ready · play a note':'Recording · tap ■';
    }
};

// Audio-clock playback with a shared cursor for fingering, stack, and score.
function playbackTimeline(song,countIn=true) {
    const bpm=song.score?.bpm||100,ratio=bpm/board().tempo,window=state.windows[board().phrase];
    const notes=rangeNotes(song,window?.start||0,window?.end??Infinity);
    let cursor=0;const timeline=[];
    if(countIn&&board().countIn){const compound=song.score?.meter==='6/8',beats=compound?2:Number((song.score?.meter||'4/4')[0]);const step=60/board().tempo*(compound?1.5:1);for(let i=0;i<beats;i++){timeline.push({key:null,start:cursor,end:cursor+step,count:i+1,sourceIndex:-1});cursor+=step;}}
    for(const n of notes){timeline.push({key:n.k,start:cursor,end:cursor+n.d/1000*ratio,sourceIndex:n.sourceIndex,absolute:n.absolute,ratio});cursor+=n.d/1000*ratio;}
    return timeline;
}
const player={
    status:'stopped',song:null,timeline:[],cursor:0,scheduled:0,startTime:0,run:0,timer:null,shown:-1,
    async start(song=board().song,countIn=true) {
        if(!song||state.instrument!=='soprano')return;
        if(recorder.status!=='idle'){notice('Finish your recording before playing a song.');return;}
        releaseHold();this.stop(false);this.song=song;this.timeline=playbackTimeline(song,countIn);this.cursor=0;
        if(!this.timeline.length){this.stop();return;}await this.resume();
    },
    async resume() {
        if(!this.song)return;
        const run=++this.run;this.status='loading';this.update();
        if(!await audio.ready()){if(run===this.run)this.stop();return;}if(run!==this.run)return;
        this.status='playing';this.startTime=audio.now-this.cursor+.025;this.scheduled=0;this.shown=-1;
        while(this.scheduled<this.timeline.length&&this.timeline[this.scheduled].end<=this.cursor)this.scheduled++;
        this.update();this.tick();this.timer=setInterval(()=>this.tick(),25);
    },
    tick() {
        if(this.status!=='playing')return;
        const elapsed=Math.max(this.cursor,audio.now-this.startTime);
        if(elapsed>=this.timeline.at(-1).end){const repeat=board().loop,song=this.song;this.stop(false);if(repeat)this.start(song,false);else $('song-status').textContent='Finished · '+song.title;return;}
        while(this.scheduled<this.timeline.length&&this.timeline[this.scheduled].start<=elapsed+.12){
            const n=this.timeline[this.scheduled++];if(n.end<=elapsed)continue;
            const start=Math.max(n.start,this.cursor,elapsed),duration=Math.max(.001,n.end-start);
            if(n.count)audio.click(n.count===1,this.startTime+start);
            else if(n.key&&board().modelSound)audio.play(frequency(n.key),this.startTime+start,duration);
        }
        let index=this.shown<0?0:this.shown;while(index<this.timeline.length-1&&elapsed>=this.timeline[index].end)index++;
        const n=this.timeline[index];
        if(index!==this.shown){this.shown=index;if(n.count){$('song-status').textContent='Count in · '+n.count;visualize(null);}else{visualize(n.key);$('song-status').textContent='Playing · '+this.song.title;$('recorder-svg').classList.toggle('playing',!!n.key);}}
        if(n.sourceIndex>=0)showScorePosition(n.sourceIndex,n.absolute+Math.max(0,elapsed-n.start)/n.ratio*1000);
    },
    pause() {
        if(!['playing','loading'].includes(this.status))return;
        if(this.status==='playing')this.cursor=Math.max(0,audio.now-this.startTime);
        clearInterval(this.timer);this.run++;audio.stop();this.status='paused';$('recorder-svg').classList.remove('playing');this.update();
    },
    stop(reset=true) {
        clearInterval(this.timer);this.run++;audio.stop();this.status='stopped';this.song=null;this.timeline=[];this.cursor=0;
        $('recorder-svg').classList.remove('playing');this.update();if(reset&&state.selected)visualize(state.selected);
    },
    seek(sourceIndex) {
        this.stop(false);if(!board().song)return;
        board().phrase=-1;$('phrase-select').value='-1';this.song=board().song;this.timeline=playbackTimeline(this.song,false);
        const n=this.timeline.find(n=>n.sourceIndex===sourceIndex);if(!n)return;
        this.cursor=n.start;this.status='paused';this.update();showScorePosition(sourceIndex,n.absolute);saveProject();
    },
    update() {
        $('start-song-btn').disabled=!board().song||this.status==='loading';
        $('pause-song-btn').disabled=!['playing','paused'].includes(this.status);$('stop-song-btn').disabled=this.status==='stopped';
        $('pause-song-btn').textContent=this.status==='paused'?'▶ Resume':'Ⅱ Pause';
        $('quick-play-btn').textContent=this.status==='playing'?'Ⅱ Pause':this.status==='paused'?'▶ Resume':'▶ Play song';
        $('quick-play-btn').disabled=!board().song||this.status==='loading';$('quick-stop-btn').disabled=this.status==='stopped';
        $('song-status').textContent=this.song?`${this.status==='paused'?'Paused':this.status==='loading'?'Loading':'Playing'} · ${this.song.title}`:board().song?'Ready · '+board().song.title:'Choose a song to begin';
        document.querySelectorAll('.song-item').forEach(li=>{li.classList.toggle('playing',!!this.song&&songId(li.song)===songId(this.song));li.classList.toggle('selected',!!board().song&&songId(li.song)===songId(board().song));});
    }
};

function drawStaff(key) {
    const canvas=$('staff-canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
    const ratio=Math.max(1,window.devicePixelRatio || 1), width=Math.max(260,canvas.clientWidth || 260),scale=width/260;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(width/260*200*ratio);
    ctx.setTransform(ratio*scale,0,0,ratio*scale,0,0);ctx.clearRect(0,0,260,200);
    ctx.strokeStyle='#111';ctx.lineWidth=2;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(10,60+i*20);ctx.lineTo(250,60+i*20);ctx.stroke();}
    ctx.fillStyle='#111';ctx.save();ctx.translate(12,120);ctx.scale(.08,-.08);ctx.fill(new Path2D(MUSIC_GLYPHS.gClef));ctx.restore();
    if(!key) {ctx.font='bold 18px Verdana';ctx.fillText('REST',110,112);canvas.setAttribute('aria-label','Rest on the treble staff');return;}
    const match=key.match(/^([A-G])([#-]?)(\d)/);if(!match)return;
    const writtenOctave=Number(match[3])-(state.instrument==='soprano'?1:0);
    const step=(writtenOctave-4)*7+['C','D','E','F','G','A','B'].indexOf(match[1]);const y=160-step*10,x=135;
    ctx.fillStyle='#111';ctx.strokeStyle='#111';ctx.lineWidth=2;
    for(let line=160;line<=y;line+=20){ctx.beginPath();ctx.moveTo(x-20,line);ctx.lineTo(x+20,line);ctx.stroke();}
    for(let line=40;line>=y;line-=20){ctx.beginPath();ctx.moveTo(x-20,line);ctx.lineTo(x+20,line);ctx.stroke();}
    ctx.beginPath();ctx.ellipse(x,y,11,8,-.22,0,Math.PI*2);ctx.fill();ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(x+(y>100?10:-10),y);ctx.lineTo(x+(y>100?10:-10),y+(y>100?-45:45));ctx.stroke();
    if(match[2]){ctx.font='bold 34px serif';ctx.fillText(match[2]==='#'?'♯':'♭',x-43,y+11);}
    canvas.setAttribute('aria-label',`${pitchName(key)}${writtenOctave} on the treble staff`);
}
const holeIds=['hole-t','hole-0','hole-1','hole-2','hole-3','hole-4','hole-5a','hole-5b','hole-6a','hole-6b'];
function visualize(key) {
    state.displayed=key;drawStaff(key);
    $('note-name').textContent=pitchName(key);$('recorder-note-name').textContent=pitchName(key);$('note-register').textContent=registerName(key,state.instrument);
    $('frequency-display').style.display=project.settings.showHz && key?'inline-block':'none';
    $('frequency-display').textContent=key?frequency(key).toFixed(2)+' Hz':'';
    $('staff-caption').textContent=key?(state.instrument==='soprano'?'Soprano notation · sounds one octave higher':'Alto notation · sounds as written'):'Rest · take a breath';
    $('recorder-svg').style.opacity=key?'1':'.35';
    const pattern=FINGERINGS[key];
    if(pattern) pattern.forEach((value,i)=>{
        const hole=$(holeIds[i]);
        hole.setAttribute('fill',value===1?'url(#hole-covered)':value===.5?'url(#grad-half-chart)':'url(#hole-open)');
        hole.setAttribute('stroke',value===1?'var(--hole-edge)':'#b6a07c');hole.setAttribute('stroke-width','1.5');
    });
    $('recorder-svg').setAttribute('aria-label',key?`${noteLabel(key,state.instrument)} fingering. Covered holes: ${pattern?.map((n,i)=>n===1?['thumb','left index','left middle','left ring','right index','right middle','right ring first','right ring second','right little first','right little second'][i]:n===.5?'half thumb':null).filter(Boolean).join(', ')}.`:'Rest');
    document.querySelectorAll('.note-btn').forEach(btn=>{const active=btn.dataset.key===key;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('.stack-note').forEach(el=>el.classList.toggle('playing',state.mode==='play' && el.dataset.key===key));
    if(state.mode==='play')scrollToPitch(key);
}
function renderNoteButtons() {
    $('note-grid-container').replaceChildren();
    for(const key of currentNotes()) {
        const btn=document.createElement('button');btn.type='button';btn.className='note-btn';btn.dataset.key=key;btn.title=noteLabel(key,state.instrument);btn.setAttribute('aria-label',noteLabel(key,state.instrument));
        const letter=document.createElement('span');letter.textContent=pitchName(key);btn.append(letter);
        const register=registerName(key,state.instrument);if(register){const small=document.createElement('small');small.textContent=register;btn.append(small);}
        bindHold(btn,token=>startManual(key,token),endManual);$('note-grid-container').append(btn);
    }
}
function renderSongs() {
    const list=$('song-list-el');list.replaceChildren();let total=0;const selected=new Set(currentNotes()),fits=song=>notesInSong(song).every(k=>selected.has(k));
    function addSong(song,customIndex=-1) {
        if($('matching-songs').checked&&!fits(song))return;
        const li=document.createElement('li');li.className='song-item';li.song=song;
        const button=document.createElement('button');button.className='song-trigger';button.type='button';
        const title=document.createElement('span');title.textContent=song.title;const notes=document.createElement('small');
        notes.textContent=notesInSong(song).map(k=>noteLabel(k)).join(' · ');button.append(title,notes);
        if(fits(song)){const badge=document.createElement('small');badge.className='fit-badge';badge.textContent='Uses your lesson notes';button.append(badge);}
        button.setAttribute('aria-label','Teach '+song.title);button.onclick=()=>selectSong(song);li.append(button);
        if(customIndex>=0){const del=document.createElement('button');del.className='song-delete';del.textContent='×';del.setAttribute('aria-label','Delete '+song.title);del.onclick=()=>{if(confirm(`Delete “${song.title}” from your recordings? Saved lessons keep their own copy.`)){player.stop();project.library.splice(customIndex,1);saveProject();renderSongs();}};li.append(del);}
        list.append(li);total++;
    }
    if(!project.settings.hidePresets)[...SONG_LIBRARY].sort((a,b)=>Number(fits(b))-Number(fits(a))).forEach(song=>addSong(song));
    if(project.library.length){const heading=document.createElement('li');heading.className='jukebox-subheader';heading.textContent='My melodies';list.append(heading);project.library.forEach((song,i)=>addSong(song,i));}
    if(!total){const empty=document.createElement('li');empty.className='song-empty';empty.textContent=$('matching-songs').checked?'No songs use only these notes. Turn off the filter or record your own pattern.':'Record a melody on the pitch stack to start your collection.';list.append(empty);}
    $('song-count').textContent=total;list.inert=state.instrument==='alto';$('alto-message').hidden=state.instrument!=='alto';player.update();
}

let stackGeometry=null,layoutQueued=false;
function setMode(mode) {
    if(recorder.status!=='idle'&&mode==='edit'){recorder.finish();return;}
    releaseHold();player.stop();state.mode=mode;$('ladder-editor').hidden=true;renderStack();
}
function updateStackControls() {
    for(const [id,active] of [['stack-edit-mode',state.mode==='edit'],['stack-play-mode',state.mode==='play'],['auto-stack-btn',board().stackLayout==='vertical'],['custom-stack-btn',board().stackLayout==='custom'],['fit-stack-btn',board().stackFit]]){
        $(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));
    }
    $('add-notes-btn').hidden=state.mode!=='edit';
    $('stack-tip').textContent=state.mode==='edit'?'Drag a letter to arrange it. Arrow keys also move notes.':'Touch and hold a letter to play.';
}
function renderStackMenu() {
    $('ladder-editor-grid').replaceChildren();
    for(const key of (state.instrument==='soprano'?[...DEFAULTS.soprano,...SOPRANO_KEYS.filter(k=>!DEFAULTS.soprano.includes(k))]:DEFAULTS.alto)) {
        const btn=document.createElement('button');btn.className='ladder-toggle-btn';btn.type='button';btn.textContent=noteLabel(key,state.instrument);btn.onclick=()=>{
            if(project.stack.length>=80){notice('This pitch stack has 80 notes. Remove a note before adding another.');return;}
            if(!board().notes[state.instrument].includes(key)){board().notes[state.instrument].push(key);renderNoteButtons();renderSongs();}
            project.stack.push({id:'note-'+crypto.randomUUID(),key,x:50,y:100});
            board().stackLayout='vertical';renderStack();saveProject();
        };$('ladder-editor-grid').append(btn);
    }
}
function ensureStackSpace() {
    const viewport=$('pitch-stack-viewport');
    stackGeometry=pitchStackLayout(project.stack,{width:$('pitch-stack-container').clientWidth||viewport.clientWidth||320,height:viewport.clientHeight||500,size:board().noteSize,fit:board().stackFit,layout:board().stackLayout});
    $('pitch-stack-container').style.height=stackGeometry.height+'px';
    $('stack-range-hint').textContent=project.stack.length+' note'+(project.stack.length===1?'':'s')+(stackGeometry.scrolls?' · Scroll for more':'');
    return stackGeometry;
}
function positionNote(element,note) {
    if(!stackGeometry)return;
    const {size,bounds,positions}=stackGeometry;
    const position=board().stackLayout==='vertical'?positions.find(p=>p.id===note.id):{
        x:bounds.minX+clamp(note.x,0,100)/100*(bounds.maxX-bounds.minX),
        y:bounds.minY+clamp(note.y,0,100)/100*(bounds.maxY-bounds.minY)
    };
    if(!position)return;
    element.style.width=size+'px';element.style.height=size+'px';element.style.fontSize=Math.round(size*.36)+'px';
    element.style.left=position.x+'px';element.style.top=position.y+'px';
}
function positionStack() {
    ensureStackSpace();
    document.querySelectorAll('.stack-note').forEach(el=>{const note=project.stack.find(n=>n.id===el.dataset.id);if(note)positionNote(el,note);});
}
function scrollToPitch(key) {
    if(!key||!board().showStack||!stackGeometry)return;
    const viewport=$('pitch-stack-viewport'),note=project.stack.find(n=>n.key===key);if(!note)return;
    const b=stackGeometry.bounds,position=board().stackLayout==='vertical'?stackGeometry.positions.find(p=>p.id===note.id):{y:b.minY+note.y/100*(b.maxY-b.minY)};
    if(!position)return;
    const top=viewport.scrollTop||0,half=stackGeometry.size/2+12;
    if(position.y-half<top||position.y+half>top+viewport.clientHeight)viewport.scrollTop=clamp(position.y-viewport.clientHeight/2,0,Math.max(0,stackGeometry.height-viewport.clientHeight));
}
function refreshLayout() {
    if(layoutQueued)return;layoutQueued=true;
    requestAnimationFrame(()=>{layoutQueued=false;positionStack();drawStaff(state.displayed);});
}
function percentPosition(value,min,max){return max>min?clamp((value-min)/(max-min)*100,0,100):50;}
function beginCustomLayout() {
    if(board().stackLayout!=='vertical')return;
    const {bounds,positions}=stackGeometry;
    for(const note of project.stack){const p=positions.find(p=>p.id===note.id);note.x=percentPosition(p.x,bounds.minX,bounds.maxX);note.y=percentPosition(p.y,bounds.minY,bounds.maxY);}
    board().stackLayout='custom';updateStackControls();
}
function renderStack() {
    ensureStackSpace();updateStackControls();
    document.querySelectorAll('.stack-note').forEach(el=>el.remove());$('stack-empty').hidden=project.stack.length>0;
    const notes=board().stackLayout==='vertical'?[...project.stack].sort((a,b)=>frequency(b.key)-frequency(a.key)):project.stack;
    for(const note of notes) {
        const el=document.createElement('div');el.className='stack-note '+(state.mode==='edit'?'editable':'playable');el.dataset.key=note.key;el.dataset.id=note.id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',noteLabel(note.key,state.instrument)+(state.mode==='edit'?' · use arrow keys to move':''));
        const span=document.createElement('span');span.className='pitch-letter';span.textContent=pitchName(note.key);el.append(span);
        const register=registerName(note.key,state.instrument);if(register){const small=document.createElement('small');small.textContent=register;el.append(small);}
        const del=document.createElement('button');del.type='button';del.className='delete-note-btn';del.textContent='×';del.setAttribute('aria-label','Remove '+noteLabel(note.key));del.onpointerdown=e=>e.stopPropagation();del.onclick=e=>{e.stopPropagation();project.stack=project.stack.filter(n=>n.id!==note.id);renderStack();saveProject();};el.append(del);
        del.onkeydown=e=>e.stopPropagation();del.onkeyup=e=>e.stopPropagation();
        bindHold(el,token=>startManual(note.key,token),endManual,()=>state.mode==='play');
        let drag=null;
        el.addEventListener('pointerdown',e=>{
            if(state.mode!=='edit'||e.button!==0||e.target===del)return;e.preventDefault();beginCustomLayout();el.focus({preventScroll:true});el.setPointerCapture(e.pointerId);
            const rect=el.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-rect.left-rect.width/2,dy:e.clientY-rect.top-rect.height/2};el.style.zIndex='90';
        });
        el.addEventListener('pointermove',e=>{
            if(!drag||drag.id!==e.pointerId)return;
            const viewport=$('pitch-stack-viewport'),edge=viewport.getBoundingClientRect();
            if(e.clientY<edge.top+35)viewport.scrollTop=Math.max(0,(viewport.scrollTop||0)-12);
            else if(e.clientY>edge.top+edge.height-35)viewport.scrollTop=(viewport.scrollTop||0)+12;
            const rect=$('pitch-stack-container').getBoundingClientRect(),b=stackGeometry.bounds;
            note.x=percentPosition(e.clientX-rect.left-drag.dx,b.minX,b.maxX);note.y=percentPosition(e.clientY-rect.top-drag.dy,b.minY,b.maxY);positionNote(el,note);
        });
        const finishDrag=()=>{if(!drag)return;drag=null;el.style.zIndex='';saveProject();};
        for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,finishDrag);
        el.addEventListener('keydown',e=>{
            if(state.mode!=='edit'||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
            e.preventDefault();beginCustomLayout();const delta=e.shiftKey?5:1;
            if(e.key==='ArrowUp')note.y-=delta;if(e.key==='ArrowDown')note.y+=delta;if(e.key==='ArrowLeft')note.x-=delta;if(e.key==='ArrowRight')note.x+=delta;
            note.x=clamp(note.x,0,100);note.y=clamp(note.y,0,100);positionNote(el,note);scrollToPitch(note.key);saveProject();
        });
        el.classList.toggle('playing',state.mode==='play'&&note.key===state.displayed);
        $('pitch-stack-container').append(el);positionNote(el,note);
    }
}
function applyVisibility() {
    const b=board(),root=document.querySelector('.app-container'),full=b.showScore&&b.scoreMode==='full'&&!!b.song;
    root.dataset.view=b.view;root.classList.toggle('presenting',!b.toolsOpen);root.classList.toggle('tools-open',b.toolsOpen);root.classList.toggle('music-full',full);
    root.classList.toggle('stack-only',b.showStack&&!b.showRecorder&&!b.showStaff);root.classList.toggle('recorder-only',b.showRecorder&&!b.showStack&&!b.showStaff);root.classList.toggle('staff-only',b.showStaff&&!b.showRecorder&&!b.showStack);
    $('teacher-tools').hidden=!b.toolsOpen;$('present-btn').setAttribute('aria-expanded',String(b.toolsOpen));$('present-btn').classList.toggle('active',b.toolsOpen);
    for(const [key,button,panel,name] of [['showRecorder','view-recorder','recorder-card','recorder'],['showStaff','view-staff','staff-card','staff note'],['showStack','view-stack','stack-card','pitch stack'],['showScore','view-score','score-panel','sheet music']]){
        $(button).setAttribute('aria-pressed',String(b[key]));$(button).classList.toggle('active',b[key]);$(button).setAttribute('aria-label',(b[key]?'Hide ':'Show ')+name);
        $(panel).hidden=!b[key]||(key==='showScore'&&!b.song);
    }
    $('board-area').hidden=full||(!b.showRecorder&&!b.showStack&&!b.showStaff);
    $('teach-empty').hidden=!b.showScore||!!b.song;
    $('empty-board').hidden=b.showRecorder||b.showStack||b.showStaff||b.showScore;
    $('quick-transport').hidden=!b.song||b.showScore;
    $('score-panel').classList.toggle('music-collapsed',b.scoreMode==='collapsed');
    $('collapse-score-btn').textContent=b.scoreMode==='collapsed'?'Show music':'Collapse';$('collapse-score-btn').setAttribute('aria-expanded',String(b.scoreMode!=='collapsed'));
    $('expand-score-btn').textContent=full?'Restore ↙':'Expand ↗';$('expand-score-btn').setAttribute('aria-pressed',String(full));
    for(const [id,view] of [['stack-view-btn','stack'],['fingering-view-btn','fingerings'],['song-view-btn','song']]){$(id).classList.toggle('active',b.view===view);$(id).setAttribute('aria-pressed',String(b.view===view));}
    refreshLayout();
}
function applyProject() {
    applyTheme();state.instrument=board().instrument;project.settings.instrument=state.instrument;
    const validKeys=state.instrument==='soprano'?new Set(SOPRANO_KEYS):ALTO_KEYS;
    if(project.stack.some(n=>!validKeys.has(n.key))){project.stack=project.stack.filter(n=>validKeys.has(n.key));if(!project.stack.length)project.stack=arrangeStack(currentNotes());}
    if(state.instrument==='alto'){board().mode='explore';if(board().view==='song')changeView(board(),'stack');board().showScore=false;}
    $('instrument-select').value=state.instrument;$('sound-toggle').checked=project.settings.soundPreview;
    $('song-speed').value=board().tempo;$('speed-label').textContent=board().tempo+' BPM';$('note-size').value=board().noteSize;
    $('notation-select').value=board().notation;$('count-in-toggle').checked=board().countIn;$('loop-toggle').checked=board().loop;$('model-sound-toggle').checked=board().modelSound;
    $('record-btn').disabled=state.instrument==='alto';$('song-view-btn').disabled=state.instrument==='alto';$('view-score').disabled=state.instrument==='alto';$('record-status').textContent=state.instrument==='alto'?'Soprano recording':'Record melody';
    state.selected=currentNotes()[0];renderNoteButtons();renderSongs();renderStack();updateMode();refreshScore();visualize(state.selected);applyVisibility();
}

// Modals trap focus and restore it on close. Save and cancel are separate actions.
let activeModal=null,previousFocus=null;
const themeNames={oak:'Sunlit oak',walnut:'Dark walnut',ivory:'Sculpted ivory'};
function applyTheme() {
    const theme=project.settings.theme;
    document.body.dataset.theme=theme;
    $('theme-btn').title='Theme: '+themeNames[theme];
    for(const key of Object.keys(themeNames)) {
        const choice=$('theme-'+key),selected=key===theme;
        choice.setAttribute('aria-pressed',String(selected));
        choice.classList.toggle('selected',selected);
    }
}
function openModal(id,focusId) {
    releaseHold();player.pause();audio.stop();previousFocus=document.activeElement;activeModal=$(id);activeModal.style.display='flex';document.querySelector('.app-container').inert=true;
    (focusId?$(focusId):activeModal.querySelector('input,textarea,button')).focus();
}
function closeModal() {
    if(!activeModal)return;activeModal.style.display='none';activeModal=null;document.querySelector('.app-container').inert=false;previousFocus?.focus();
}
function openSettings() {
    if(recorder.status!=='idle'){recorder.finish();return;}
    $('soprano-list').value=project.settings.sopranoOrder;$('alto-list').value=project.settings.altoOrder;
    $('show-hz-toggle').checked=project.settings.showHz;$('hide-presets-toggle').checked=project.settings.hidePresets;$('settings-error').textContent='';openModal('settings-modal');
}
function commitSettings() {
    try {
        const soprano=parseNoteOrder($('soprano-list').value,'soprano'),alto=parseNoteOrder($('alto-list').value,'alto');
        releaseHold();player.stop();Object.assign(project.settings,{sopranoOrder:soprano.join(', '),altoOrder:alto.join(', '),showHz:$('show-hz-toggle').checked,hidePresets:$('hide-presets-toggle').checked});
        saveProject();applyProject();closeModal();
    } catch(e){$('settings-error').textContent=e.message;}
}
function exportBackup() {
    // Include the settings currently shown in the backup dialog, without applying them silently.
    let data;
    try {
        data=validateProject({...project,settings:{...project.settings,
            sopranoOrder:$('soprano-list').value,altoOrder:$('alto-list').value,
            showHz:$('show-hz-toggle').checked,hidePresets:$('hide-presets-toggle').checked
        }});
        data.meta.date=new Date().toISOString();
    } catch(e) { $('settings-error').textContent=e.message;return; }
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');
    a.href=url;a.download=`radical_recorder_backup_${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importBackup(file) {
    if(!file)return;
    try {
        if(file.size>8*1024*1024)throw new Error('Choose a backup smaller than 8 MB.');
        const candidate=validateProject(JSON.parse(await file.text()));
        if(!confirm(`Replace this app’s ${project.lessons.length} lessons, settings, pitch stacks, and ${project.library.length} recordings with this backup?`))return;
        releaseHold();player.stop();project=candidate;state.lessonId=null;state.scorePage=0;applyProject();saveProject();closeModal();notice(`Backup restored · ${project.lessons.length} lessons and ${project.library.length} melodies.`);
    } catch(e){$('settings-error').textContent='Import failed: '+e.message;}
}

$('instrument-select').onchange=e=>{if(recorder.status!=='idle'){e.target.value=state.instrument;recorder.finish();return;}releaseHold();player.stop();saveProject();state.instrument=e.target.value;board().instrument=state.instrument;board().mode='explore';board().song=null;state.lessonId=null;project.stack=arrangeStack(currentNotes());applyProject();autoArrange();saveProject();};
$('view-recorder').onclick=()=>toggleVisibility('showRecorder');$('view-stack').onclick=()=>toggleVisibility('showStack');
$('view-staff').onclick=()=>toggleVisibility('showStaff');$('view-score').onclick=()=>toggleVisibility('showScore');
for(const [id,key] of [['hide-recorder-btn','showRecorder'],['hide-staff-btn','showStaff'],['hide-stack-btn','showStack'],['hide-score-btn','showScore']])$(id).onclick=()=>{toggleVisibility(key);$({showRecorder:'view-recorder',showStaff:'view-staff',showStack:'view-stack',showScore:'view-score'}[key]).focus();};
$('restore-panels-btn').onclick=()=>{changeView(board(),board().view,true);applyVisibility();saveProject();};
$('collapse-score-btn').onclick=()=>{releaseHold();board().scoreMode=board().scoreMode==='collapsed'?'open':'collapsed';applyVisibility();saveProject();};
$('expand-score-btn').onclick=()=>{releaseHold();board().scoreMode=board().scoreMode==='full'?'open':'full';applyVisibility();saveProject();};
$('stack-edit-mode').onclick=()=>setMode('edit');$('stack-play-mode').onclick=()=>setMode('play');
$('add-notes-btn').onclick=()=>{renderStackMenu();$('ladder-editor').hidden=!$('ladder-editor').hidden;};
$('close-ladder-editor').onclick=()=>$('ladder-editor').hidden=true;
$('starter-stack-btn').onclick=()=>setLessonNotes(state.instrument==='soprano'?['B5','A5','G5']:['E5_A','D5_A','C5_A']);
$('record-btn').onclick=()=>{
    if(recorder.status==='idle') {
        if(project.library.length>=300){notice('The library is full. Export a backup and remove a recording first.');return;}
        setMode('play');project.settings.soundPreview=true;$('sound-toggle').checked=true;saveProject();recorder.arm();
    } else recorder.finish();
};
$('sound-toggle').onchange=e=>{releaseHold();project.settings.soundPreview=e.target.checked;saveProject();};
$('song-speed').oninput=e=>$('speed-label').textContent=e.target.value+' BPM';
$('song-speed').onchange=e=>{player.stop(false);board().tempo=Number(e.target.value);saveProject();};
$('pause-song-btn').onclick=()=>player.status==='paused'?player.resume():player.pause();$('stop-song-btn').onclick=()=>player.stop();
for(const id of ['play-btn','recorder-play-btn'])bindHold($(id),token=>{startManual(state.selected,token,true);$(id).classList.add('held');},endManual);
$('settings-btn').onclick=openSettings;$('save-settings').onclick=commitSettings;$('cancel-settings-btn').onclick=closeModal;
$('theme-btn').onclick=()=>openModal('themes-modal','theme-'+project.settings.theme);
$('close-themes-btn').onclick=closeModal;
$('themes-modal').onclick=e=>{if(e.target===$('themes-modal'))closeModal();};
for(const theme of Object.keys(themeNames))$('theme-'+theme).onclick=()=>{project.settings.theme=theme;applyTheme();saveProject();};
$('export-backup-btn').onclick=exportBackup;$('import-backup-btn').onclick=()=>$('backup-file-input').click();
$('backup-file-input').onchange=e=>{importBackup(e.target.files[0]);e.target.value='';};
$('confirm-save-song-btn').onclick=()=>{
    if(!recorder.pending.length){closeModal();return;}
    try {const snap=$('snap-recording').checked;const [song]=validateLibrary([{title:$('song-title-input').value.trim() || 'Untitled Recording',notes:snap?quantizeNotes(recorder.pending,board().tempo):recorder.pending,score:{bpm:board().tempo,meter:'4/4',pickup:0,quantized:snap}}]);project.library.push(song);recorder.pending=[];saveProject();renderSongs();closeModal();selectSong(song);notice(snap?'Melody saved with notation.':'Melody saved with your original timing.');}
    catch(e){notice('Could not save recording: '+e.message);}
};
$('cancel-song-btn').onclick=()=>{recorder.pending=[];closeModal();};
$('song-title-input').onkeydown=e=>{if(e.key==='Enter'){$('confirm-save-song-btn').click();e.preventDefault();}};
$('settings-modal').onclick=e=>{if(e.target===$('settings-modal'))closeModal();};
document.addEventListener('keydown',e=>{
    if(activeModal) {
        if(e.key==='Escape' && activeModal.id!=='save-song-modal'){closeModal();e.preventDefault();return;}
        if(e.key==='Tab') {const elements=[...activeModal.querySelectorAll('button,input:not([type="file"]),textarea,select,summary')].filter(el=>!el.disabled&&el.getClientRects().length>0);const first=elements[0],last=elements.at(-1);if(e.shiftKey && document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey && document.activeElement===last){first.focus();e.preventDefault();}}
    } else if(e.key==='Escape') {releaseHold();player.stop();if(recorder.status!=='idle')recorder.finish();$('ladder-editor').hidden=true;}
});
function interrupt() {releaseHold();audio.stop();player.pause();if(recorder.status!=='idle')recorder.finish();}
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});window.addEventListener('pagehide',interrupt);
window.addEventListener('resize',refreshLayout);
if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(refreshLayout);observer.observe($('pitch-stack-viewport'));observer.observe($('staff-card'));}
window.addEventListener('beforeunload',e=>{if(recorder.status==='recording'||recorder.pending.length){e.preventDefault();e.returnValue='';}});
function updateMode() {
    $('lesson-kicker').textContent=project.lessons.find(l=>l.id===state.lessonId)?.title||'TODAY’S NOTES';
    const keys=currentNotes();$('lesson-title').textContent=board().song?.title||(keys.length<=7?'Let’s play '+keys.map(pitchName).join(' · '):keys.length+' lesson notes');
    $('lesson-subtitle').textContent='Touch a letter. Hear the pitch. See the fingering.';
    document.querySelector('.app-container').classList.toggle('teaching-song',!!board().song);
}
function setTeachingView(view) {
    if(recorder.status!=='idle'){recorder.finish();return;}
    releaseHold();changeView(board(),view);if(view==='song'&&!board().song)board().toolsOpen=true;
    updateMode();applyVisibility();saveProject();
}
function toggleVisibility(key) {
    releaseHold();board()[key]=!board()[key];
    if(key!=='showScore'&&board().scoreMode==='full')board().scoreMode='open';
    if(key==='showScore'&&board().showScore&&!board().song)board().toolsOpen=true;
    applyVisibility();saveProject();
}
function setLessonNotes(keys) {
    if(recorder.status!=='idle'){recorder.finish();return;}
    releaseHold();player.stop(false);saveProject();board().notes[state.instrument]=[...new Set(keys)];board().song=null;board().mode='explore';board().phrase=-1;state.lessonId=null;
    project.stack=arrangeStack(keys);board().stackLayout='vertical';if(board().view==='song')changeView(board(),'stack');applyProject();autoArrange();saveProject();
}
function selectSong(song) {
    if(recorder.status!=='idle'){recorder.finish();return;}
    releaseHold();player.stop(false);saveProject();state.lessonId=null;state.scorePage=0;state.instrument='soprano';
    const oldSong=board().song;board().song=structuredClone(song);board().instrument='soprano';board().mode='teach';board().notes.soprano=notesInSong(song);board().phrase=-1;
    if(!oldSong||songId(oldSong)!==songId(song))board().tempo=song.score?.bpm||100;
    const saved=project.layouts[songId(song)];project.stack=saved?structuredClone(saved):arrangeStack(board().notes.soprano);
    changeView(board(),'song');if(!saved)board().stackLayout='vertical';
    applyProject();if(!saved)requestAnimationFrame(()=>{autoArrange();saveProject();});saveProject();
}
function autoArrange() {
    releaseHold();if(!project.stack.length)project.stack=arrangeStack(currentNotes());
    board().stackLayout='vertical';renderStack();$('pitch-stack-viewport').scrollTop=0;saveProject();
}
function refreshScore() {
    state.measures=[];state.windows=[];
    if(board().song){try{state.measures=makeMeasures(board().song);}catch(e){notice(e.message);}}
    state.windows=phraseWindows(state.measures);const select=$('phrase-select');select.replaceChildren();
    const all=document.createElement('option');all.value='-1';all.textContent='Whole song';select.append(all);
    state.windows.forEach((w,i)=>{const option=document.createElement('option');option.value=i;option.textContent=w.label;select.append(option);});
    if(board().phrase>=state.windows.length)board().phrase=-1;select.value=String(board().phrase);select.disabled=!state.windows.length;
    state.scorePage=Math.min(state.scorePage,Math.max(0,scorePageCount()-1));
    $('meter-label').textContent=board().song?.score?.quantized?board().song.score.meter:'Free timing';
    $('notation-select').disabled=!state.measures.length;$('free-timing-message').hidden=!board().song||state.measures.length>0;
    paintScore();
}
function bindScoreNote(element,index) {
    bindHold(element,token=>{
        if(recorder.status!=='idle'){notice('Finish recording before exploring the score.');return;}
        const note=board().song?.notes[index];if(!note)return;player.seek(index);state.selected=note.k||currentNotes()[0];visualize(note.k);
        if(note.k&&project.settings.soundPreview)soundHeld(note.k,token);
    },endManual);
}
function scorePageCount(){return state.measures.length?Math.ceil(state.measures.length/2):Math.ceil((board().song?.notes.length||0)/16);}
function paintScore() {
    $('score-content').replaceChildren();state.scoreNodes=[];const song=board().song;
    $('prev-page').disabled=state.scorePage===0;$('next-page').disabled=state.scorePage>=scorePageCount()-1;
    if(!song)return;
    if(state.measures.length){renderScore($('score-content'),song,state.measures,state.scorePage,board().notation,bindScoreNote);state.scoreNodes=[...document.querySelectorAll('.score-note')];$('score-page-label').textContent=state.windows[state.scorePage]?.label||'Song notation';}
    else {
        $('score-page-label').textContent=`Notes ${state.scorePage*16+1}–${Math.min(song.notes.length,(state.scorePage+1)*16)}`;const ribbon=document.createElement('div');ribbon.className='free-ribbon';
        song.notes.slice(state.scorePage*16,(state.scorePage+1)*16).forEach((n,localIndex)=>{const i=state.scorePage*16+localIndex;const button=document.createElement('button');button.className='free-note';button.dataset.source=i;const name=document.createElement('span');name.textContent=pitchName(n.k);const duration=document.createElement('small');duration.textContent=(n.d/1000).toFixed(2)+' s';button.append(name,duration);bindScoreNote(button,i);ribbon.append(button);state.scoreNodes.push(button);});$('score-content').append(ribbon);
    }
}
function showScorePosition(index,absolute) {
    if(state.measures.length){const measure=state.measures.findIndex(m=>absolute>=m.start-.01&&absolute<m.end-.01);if(measure>=0){const page=Math.floor(measure/2);if(page!==state.scorePage){state.scorePage=page;paintScore();}}}
    else {const page=Math.floor(index/16);if(page!==state.scorePage){state.scorePage=page;paintScore();}}
    for(const el of state.scoreNodes){const source=Number(el.dataset.source??el.getAttribute('data-source'));const from=Number(el.getAttribute('data-from')),to=Number(el.getAttribute('data-to'));el.classList.toggle('active',source===index&&(!to||(absolute>=from-.01&&absolute<to-.01)));}
}
let chosenNotes=new Set();
function openNoteChooser() {
    if(recorder.status!=='idle'){recorder.finish();return;}
    chosenNotes=new Set(currentNotes());$('lesson-note-choices').replaceChildren();$('notes-error').textContent='';
    const options=state.instrument==='soprano'?[...DEFAULTS.soprano,...SOPRANO_KEYS.filter(k=>!DEFAULTS.soprano.includes(k))]:DEFAULTS.alto;
    for(const key of options){const button=document.createElement('button');button.textContent=noteLabel(key,state.instrument);button.setAttribute('aria-pressed',String(chosenNotes.has(key)));button.onclick=()=>{if(chosenNotes.has(key))chosenNotes.delete(key);else chosenNotes.add(key);button.setAttribute('aria-pressed',String(chosenNotes.has(key)));};$('lesson-note-choices').append(button);}
    openModal('notes-modal');
}
function showLessons() {
    $('lesson-list').replaceChildren();
    if(!project.lessons.length){const p=document.createElement('p');p.className='hint';p.textContent='Set up your board, then choose Save lesson. Your lessons are stored in this browser and included in Save all backups.';$('lesson-list').append(p);}
    for(const lesson of project.lessons){const row=document.createElement('div');row.className='lesson-row';const button=document.createElement('button');button.className='lesson-open';const title=document.createElement('span');title.textContent=lesson.title;const detail=document.createElement('small');detail.textContent=(lesson.board.song?.title||lesson.board.notes[lesson.board.instrument].map(pitchName).join(' · '))+' · '+lesson.board.tempo+' BPM';button.append(title,detail);
        button.onclick=()=>{releaseHold();player.stop(false);saveProject();project.board=structuredClone(lesson.board);project.stack=structuredClone(lesson.stack);state.lessonId=lesson.id;state.scorePage=0;state.mode='play';closeModal();applyProject();saveProject();notice('Opened '+lesson.title);};
        const remove=document.createElement('button');remove.className='lesson-remove';remove.textContent='Delete';remove.setAttribute('aria-label','Delete lesson '+lesson.title);remove.onclick=()=>{if(confirm(`Delete the saved lesson “${lesson.title}”?`)){project.lessons=project.lessons.filter(l=>l.id!==lesson.id);if(state.lessonId===lesson.id)state.lessonId=null;saveProject();showLessons();}};row.append(button,remove);$('lesson-list').append(row);
    }
}
$('stack-view-btn').onclick=()=>setTeachingView('stack');$('fingering-view-btn').onclick=()=>setTeachingView('fingerings');$('song-view-btn').onclick=()=>setTeachingView('song');
$('choose-notes-btn').onclick=openNoteChooser;$('cancel-notes-btn').onclick=closeModal;
$('apply-notes-btn').onclick=()=>{if(!chosenNotes.size){$('notes-error').textContent='Choose at least one note.';return;}closeModal();setLessonNotes([...chosenNotes]);};
$('bag-preset').onclick=()=>setLessonNotes(state.instrument==='soprano'?['B5','A5','G5']:['E5_A','D5_A','C5_A']);
$('baged-preset').onclick=()=>setLessonNotes(state.instrument==='soprano'?['B5','A5','G5','E5','D5']:['E5_A','D5_A','C5_A','A4','G4']);
$('all-notes-preset').onclick=()=>setLessonNotes(state.instrument==='soprano'?[...SOPRANO_KEYS]:[...ALTO_KEYS]);
$('matching-songs').onchange=renderSongs;
$('auto-stack-btn').onclick=autoArrange;
$('custom-stack-btn').onclick=()=>{releaseHold();board().stackLayout='custom';renderStack();saveProject();};
$('fit-stack-btn').onclick=()=>{releaseHold();board().stackFit=!board().stackFit;renderStack();saveProject();};
$('note-size').oninput=e=>{releaseHold();board().noteSize=Number(e.target.value);board().stackFit=false;renderStack();};$('note-size').onchange=saveProject;
$('present-btn').onclick=()=>{board().toolsOpen=!board().toolsOpen;applyVisibility();saveProject();};
$('close-tools-btn').onclick=()=>{board().toolsOpen=false;applyVisibility();saveProject();$('present-btn').focus();};
$('start-song-btn').onclick=()=>player.start();
$('quick-play-btn').onclick=()=>player.status==='playing'?player.pause():player.status==='paused'?player.resume():player.start();$('quick-stop-btn').onclick=()=>player.stop();
$('count-in-toggle').onchange=e=>{board().countIn=e.target.checked;saveProject();};
$('model-sound-toggle').onchange=e=>{board().modelSound=e.target.checked;audio.stop();saveProject();};
$('loop-toggle').onchange=e=>{board().loop=e.target.checked;saveProject();};
$('notation-select').onchange=e=>{board().notation=e.target.value;paintScore();saveProject();};
$('phrase-select').onchange=e=>{player.stop(false);board().phrase=Number(e.target.value);if(board().phrase>=0){state.scorePage=board().phrase;paintScore();}saveProject();};
$('prev-page').onclick=()=>{player.pause();state.scorePage=Math.max(0,state.scorePage-1);paintScore();};$('next-page').onclick=()=>{player.pause();state.scorePage=Math.min(scorePageCount()-1,state.scorePage+1);paintScore();};
$('snap-copy-btn').onclick=()=>{
    const song=board().song;if(!song)return;if(project.library.length>=300){notice('Export a backup and remove a melody before adding another.');return;}
    const copy={title:(song.title+' — score').slice(0,120),notes:quantizeNotes(song.notes,board().tempo),score:{bpm:board().tempo,meter:'4/4',pickup:0,quantized:true}};
    project.library.push(copy);saveProject();selectSong(copy);notice('Created a score copy. Your original melody is unchanged.');
};
$('lessons-btn').onclick=()=>{if(recorder.status!=='idle'){recorder.finish();return;}showLessons();openModal('lessons-modal');};$('close-lessons-btn').onclick=closeModal;
$('save-lesson-btn').onclick=()=>{if(recorder.status!=='idle'){recorder.finish();return;}const existing=project.lessons.find(l=>l.id===state.lessonId);$('lesson-name-input').value=existing?.title||board().song?.title||currentNotes().map(pitchName).join('')+' lesson';openModal('save-lesson-modal','lesson-name-input');};
$('cancel-save-lesson').onclick=closeModal;
$('confirm-save-lesson').onclick=()=>{
    const title=$('lesson-name-input').value.trim()||'Untitled lesson',existing=project.lessons.findIndex(l=>l.id===state.lessonId);
    if(existing<0&&project.lessons.length>=100){notice('You have 100 saved lessons. Export a backup and delete one before saving another.');return;}
    const lesson={id:state.lessonId||crypto.randomUUID(),title,board:validateBoard(structuredClone(board())),stack:structuredClone(project.stack)};
    if(existing>=0)project.lessons[existing]=lesson;else project.lessons.push(lesson);state.lessonId=lesson.id;saveProject();closeModal();updateMode();notice('Lesson saved · '+title);
};
$('lesson-name-input').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('confirm-save-lesson').click();}};

recorder.update();applyProject();if(initialAutoStack)requestAnimationFrame(autoArrange);
