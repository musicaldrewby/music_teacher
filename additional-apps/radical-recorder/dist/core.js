import { FINGERINGS, FREQUENCIES, DEFAULTS } from './data.js';
export const ALTO_KEYS = new Set(DEFAULTS.alto);
export const SOPRANO_KEYS = Object.keys(FINGERINGS).filter(k => !ALTO_KEYS.has(k));
export const STORAGE_KEY = 'radical_recorder_v2';
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const frequency = key => FREQUENCIES[key?.replace('_A', '')] || 0;
export const pitchName = key => key ? key.replace('_A', '').replace(/\d/g, '').replace('-', '♭').replace('#', '♯') : 'REST';
export function registerName(key, instrument = 'soprano') {
    if (!key) return 'Take a breath';
    if (instrument === 'soprano') return /6/.test(key) ? 'High' : /^[CDE][#-]?5$/.test(key) ? 'Low' : '';
    return ['F5_A','G5_A','A5_A'].includes(key) ? 'High' : /4/.test(key) ? 'Low' : '';
}
export function noteLabel(key, instrument = 'soprano') {
    return [registerName(key, instrument), pitchName(key)].filter(Boolean).join(' ');
}
export function parseNoteOrder(value, instrument) {
    if (typeof value !== 'string' || value.length > 2000) throw new Error('Enter a comma-separated note list.');
    const keys = value.split(',').map(s => s.trim()).filter(Boolean).map(key => {
        key = key.charAt(0).toUpperCase() + key.slice(1);
        key = key.replace(/♭|b/g, '-').replace(/♯/g, '#');
        if (instrument === 'alto' && !ALTO_KEYS.has(key) && ALTO_KEYS.has(key + '_A')) key += '_A';
        if (!(instrument === 'alto' ? ALTO_KEYS.has(key) : SOPRANO_KEYS.includes(key))) throw new Error(`Unsupported ${instrument} note: ${key}.`);
        return key;
    });
    if (!keys.length) throw new Error(`Choose at least one ${instrument} note.`);
    return [...new Set(keys)];
}
export function validateLibrary(library) {
    if (!Array.isArray(library) || library.length > 300) throw new Error('The recording library must contain no more than 300 songs.');
    return library.map(song => {
        if (!song || typeof song.title !== 'string' || song.title.length > 120 || !Array.isArray(song.notes) || !song.notes.length || song.notes.length > 20000) throw new Error('A recording has an invalid title or note list.');
        let total = 0;
        const notes = song.notes.map(n => {
            if (!n || (n.k !== null && !SOPRANO_KEYS.includes(n.k)) || typeof n.d !== 'number' || !Number.isFinite(n.d) || n.d < 0 || n.d > 600000) throw new Error('A recording contains an unsupported note or duration.');
            total += n.d;
            return { k:n.k, d:n.d };
        }).filter(n => n.d > 0); // Legacy recordings can contain duplicate, simultaneous events.
        if (!notes.some(n => n.k) || total > 7200000) throw new Error('A recording must contain a note and last less than two hours.');
        return { title:song.title.trim() || 'Untitled Recording', notes, ...(song.score ? {score:validateScoreOptions(song.score)} : {}) };
    });
}
export function validateStack(stack) {
    if (!Array.isArray(stack) || stack.length > 80) throw new Error('A pitch stack may contain up to 80 notes.');
    return stack.map((n,i) => {
        if (!n || !Object.hasOwn(FINGERINGS,n.key) || !Number.isFinite(n.x) || !Number.isFinite(n.y)) throw new Error('Invalid pitch stack note.');
        return { id:`stack-${i}`, key:n.key, x:clamp(n.x,0,100), y:clamp(n.y,0,100) };
    });
}
export function defaultProject() {
    return { meta:{ appName:'RadicalRecorder', version:'4.0' }, board:defaultBoard(), lessons:[], layouts:{}, settings:{
        sopranoOrder:DEFAULTS.soprano.join(', '), altoOrder:DEFAULTS.alto.join(', '),
        showHz:false, hidePresets:false, soundPreview:true, speed:100, instrument:'soprano', theme:'oak'
    }, library:[], stack:[] };
}
export function validateProject(json) {
    if (!json || json.meta?.appName !== 'RadicalRecorder') throw new Error('Choose a Radical Recorder backup file.');
    const result = defaultProject();
    const s = json.settings ?? {};
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('Invalid settings.');
    if (s.theme !== undefined) {
        if (!['oak','walnut','ivory'].includes(s.theme)) throw new Error('Invalid theme.');
        result.settings.theme=s.theme;
    }
    for (const name of ['soprano','alto']) if (s[name+'Order'] !== undefined) result.settings[name+'Order'] = parseNoteOrder(s[name+'Order'],name).join(', ');
    for (const key of ['showHz','hidePresets','soundPreview']) {
        if (s[key] !== undefined && typeof s[key] !== 'boolean') throw new Error('Invalid setting: '+key);
        if (s[key] !== undefined) result.settings[key] = s[key];
    }
    if (s.speed !== undefined) {
        if (!Number.isFinite(s.speed) || s.speed < 50 || s.speed > 150) throw new Error('Invalid playback speed.');
        result.settings.speed = s.speed;
    }
    if (s.instrument !== undefined) {
        if (!['soprano','alto'].includes(s.instrument)) throw new Error('Invalid instrument.');
        result.settings.instrument = s.instrument;
    }
    result.library = validateLibrary(json.library ?? []);
    result.stack = validateStack(json.stack ?? []);
    result.board = validateBoard(json.board ?? defaultBoard());
    if (!json.board) {
        result.board.instrument=result.settings.instrument;
        for(const instrument of ['soprano','alto'])if(json.settings?.[instrument+'Order'])result.board.notes[instrument]=parseNoteOrder(result.settings[instrument+'Order'],instrument);
        if(result.stack.length)result.board.notes.soprano=[...new Set(result.stack.filter(n=>SOPRANO_KEYS.includes(n.key)).map(n=>n.key))];
        if(!result.board.notes.soprano.length)result.board.notes.soprano=['B5','A5','G5'];
    }
    if(json.lessons!==undefined) {
        if(!Array.isArray(json.lessons)||json.lessons.length>100)throw new Error('A backup may contain up to 100 lessons.');
        result.lessons=json.lessons.map((lesson,i)=>{
            if(!lesson||typeof lesson.title!=='string'||lesson.title.length>120)throw new Error('Invalid lesson name.');
            return {id:typeof lesson.id==='string'&&lesson.id.length<100?lesson.id:'lesson-'+i,title:lesson.title.trim()||'Untitled lesson',board:validateBoard(lesson.board),stack:validateStack(lesson.stack)};
        });
    }
    if(json.layouts!==undefined) {
        if(!json.layouts||typeof json.layouts!=='object'||Array.isArray(json.layouts)||Object.keys(json.layouts).length>500)throw new Error('Invalid saved pitch stacks.');
        for(const [key,value] of Object.entries(json.layouts)){if(!/^song-[a-z0-9]+$/.test(key))throw new Error('Invalid song layout identifier.');result.layouts[key]=validateStack(value);}
    }
    return result;
}
export function createSafeStorage(getStorage, warn) {
    const memory = new Map(); let warned = false;
    function report() { if (!warned) { warned = true; warn(); } }
    return {
        get(key) { if (memory.has(key)) return memory.get(key); try { return getStorage().getItem(key); } catch { report(); return null; } },
        set(key, value) { memory.set(key,value); try { getStorage().setItem(key,value); return true; } catch { report(); return false; } }
    };
}
export function eventsToNotes(events) {
    const notes = [];
    for (let i=0;i<events.length-1;i++) {
        const duration = Math.max(0,events[i+1].t-events[i].t);
        if (!duration) continue;
        const last = notes.at(-1);
        if (events[i].k === null && last?.k === null) last.d += duration;
        else notes.push({k:events[i].k,d:duration});
    }
    while (notes.length && notes.at(-1).k === null) notes.pop();
    return notes;
}
export function makeTimeline(notes, speed) {
    let cursor = 0;
    return notes.map(n => { const entry={key:n.k,start:cursor,end:cursor+n.d/1000/(speed/100)}; cursor=entry.end; return entry; });
}
export function stackBounds(width, height, size, toolbarHeight) {
    const half = size/2+8;
    return { minX:half, maxX:Math.max(half,width-half), minY:Math.min(height-half,toolbarHeight+half+12), maxY:Math.max(half,height-half) };
}

export function validateScoreOptions(options) {
    if(!options||!Number.isFinite(options.bpm)||options.bpm<40||options.bpm>200||!['2/4','3/4','4/4','6/8'].includes(options.meter)||typeof options.quantized!=='boolean')throw new Error('Invalid song score settings.');
    const pickup=options.pickup??0,bar=options.meter==='6/8'?3:Number(options.meter[0]);
    if(!Number.isFinite(pickup)||pickup<0||pickup>=bar||pickup*4%1!==0)throw new Error('Invalid pickup length.');
    return {bpm:options.bpm,meter:options.meter,pickup,quantized:options.quantized};
}
export const VIEW_DEFAULTS = {
    stack:{showRecorder:false,showStaff:false,showStack:true,showScore:false,scoreMode:'open'},
    fingerings:{showRecorder:true,showStaff:true,showStack:false,showScore:false,scoreMode:'open'},
    song:{showRecorder:true,showStaff:false,showStack:true,showScore:true,scoreMode:'open'}
};
export function rememberView(board) {
    board.viewLayouts[board.view]=Object.fromEntries(Object.keys(VIEW_DEFAULTS.stack).map(key=>[key,board[key]]));
}
export function changeView(board,view,reset=false) {
    if(!Object.hasOwn(VIEW_DEFAULTS,view))throw new Error('Invalid teaching view.');
    rememberView(board);board.view=view;
    Object.assign(board,reset?VIEW_DEFAULTS[view]:(board.viewLayouts[view]||VIEW_DEFAULTS[view]));
    rememberView(board);
}
export function defaultBoard() {
    return {mode:'explore',view:'stack',viewLayouts:{},toolsOpen:false,stackLayout:'vertical',stackFit:true,instrument:'soprano',notes:{soprano:['B5','A5','G5'],alto:['E5_A','D5_A','C5_A']},song:null,notation:'staff',...VIEW_DEFAULTS.stack,modelSound:true,noteSize:104,tempo:100,countIn:true,loop:false,phrase:-1};
}
export function validateBoard(input) {
    if(!input||typeof input!=='object')throw new Error('Invalid lesson settings.');
    const b=defaultBoard();
    for(const [key,allowed] of Object.entries({mode:['explore','teach'],view:['stack','fingerings','song'],stackLayout:['vertical','custom'],instrument:['soprano','alto'],notation:['staff','staff-letters','letters']}))if(input[key]!==undefined){if(!allowed.includes(input[key]))throw new Error('Invalid lesson '+key);b[key]=input[key];}
    if(input.view===undefined)b.view=input.mode==='teach'&&input.song?'song':'stack';
    Object.assign(b,VIEW_DEFAULTS[b.view]);
    if(input.notes)for(const kind of ['soprano','alto']){if(!Array.isArray(input.notes[kind]))throw new Error('Invalid lesson notes.');b.notes[kind]=parseNoteOrder(input.notes[kind].join(','),kind);}
    for(const key of ['showRecorder','showStack','showStaff','showScore','toolsOpen','stackFit','countIn','loop','modelSound'])if(input[key]!==undefined){
        if(typeof input[key]!=='boolean')throw new Error('Invalid lesson switch.');
        if(input.view!==undefined||b.view==='song'||!key.startsWith('show'))b[key]=input[key];
    }
    if(input.scoreMode!==undefined){if(!['open','collapsed','full'].includes(input.scoreMode))throw new Error('Invalid music display.');b.scoreMode=input.scoreMode;}
    if(input.viewLayouts!==undefined){
        if(!input.viewLayouts||typeof input.viewLayouts!=='object'||Array.isArray(input.viewLayouts))throw new Error('Invalid saved views.');
        for(const view of Object.keys(VIEW_DEFAULTS))if(input.viewLayouts[view]!==undefined){
            const saved=input.viewLayouts[view];if(!saved||typeof saved!=='object'||Array.isArray(saved))throw new Error('Invalid saved view.');
            const panels={...VIEW_DEFAULTS[view]};
            for(const key of ['showRecorder','showStaff','showStack','showScore'])if(saved[key]!==undefined){if(typeof saved[key]!=='boolean')throw new Error('Invalid saved panel.');panels[key]=saved[key];}
            if(saved.scoreMode!==undefined){if(!['open','collapsed','full'].includes(saved.scoreMode))throw new Error('Invalid saved music display.');panels.scoreMode=saved.scoreMode;}
            b.viewLayouts[view]=panels;
        }
    }
    for(const [key,min,max] of [['tempo',40,200],['noteSize',60,132],['phrase',-1,9999]])if(input[key]!==undefined){if(!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw new Error('Invalid lesson '+key);b[key]=input[key];}
    b.phrase=Math.floor(b.phrase);if(input.song)b.song=validateLibrary([input.song])[0];
    return b;
}
export function songId(song) {
    let hash=2166136261;const text=JSON.stringify([song.title,song.notes]);
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return 'song-'+(hash>>>0).toString(36);
}
export function notesInSong(song) {return [...new Set(song.notes.map(n=>n.k).filter(Boolean))].sort((a,b)=>frequency(b)-frequency(a));}
export function arrangeStack(keys) {
    const sorted=[...new Set(keys)].sort((a,b)=>frequency(b)-frequency(a));
    return sorted.map((key,i)=>({id:'auto-'+i,key,x:50,y:sorted.length===1?50:i/(sorted.length-1)*100}));
}
// Notes occupy a scrollable canvas; the fixed toolbar never consumes note space.
// Fit stops at 60 px. Extra notes extend the canvas rather than forming columns.
export function pitchStackLayout(notes,{width=400,height=600,size=104,fit=true,layout='vertical'}={}) {
    width=Math.max(100,width);height=Math.max(120,height);
    const count=notes.length,pad=18,gap=14,preferred=clamp(size,60,132);
    const available=(height-pad*2-Math.max(0,count-1)*gap)/Math.max(1,count);
    const actual=Math.min(width-pad*2,fit?Math.max(60,Math.min(preferred,Math.floor(available))):preferred);
    const canvasHeight=Math.max(height,count*actual+Math.max(0,count-1)*gap+pad*2);
    const bounds={minX:pad+actual/2,maxX:width-pad-actual/2,minY:pad+actual/2,maxY:canvasHeight-pad-actual/2};
    const ordered=layout==='vertical'?[...notes].sort((a,b)=>frequency(b.key)-frequency(a.key)):notes;
    const positions=ordered.map((note,i)=>({id:note.id,
        x:layout==='vertical'?width/2:bounds.minX+clamp(note.x,0,100)/100*(bounds.maxX-bounds.minX),
        y:layout==='vertical'?(count===1?canvasHeight/2:bounds.minY+i/Math.max(1,count-1)*(bounds.maxY-bounds.minY)):bounds.minY+clamp(note.y,0,100)/100*(bounds.maxY-bounds.minY)
    }));
    return {width,height:canvasHeight,size:actual,bounds,positions,scrolls:canvasHeight>height+1};
}
export function quantizeNotes(notes,bpm,step=.5) {
    const ms=60000/bpm;let elapsed=0,cursor=0;const result=[];
    for(const n of notes){elapsed+=n.d;let end=Math.round(elapsed/ms/step)*step;if(end<=cursor){if(!n.k)continue;end=cursor+step;}result.push({k:n.k,d:(end-cursor)*ms});cursor=end;}
    while(result.length&&result.at(-1).k===null)result.pop();return result;
}
