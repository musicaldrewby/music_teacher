const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync(require('node:path').join(__dirname, '../dist/index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Browser primitives are simulated; these checks exercise app behavior, not browser rendering.
function app({manualImages = false} = {}) {
    let time = 0, nextFrame = 0;
    const frames = new Map(), elements = new Map(), contexts = [], imageJobs = [], imageRequests = [], timers = new Map();
    let timerId = 0;
    function events(target = {}) {
        const handlers = new Map();
        target.addEventListener = (name, fn) => {
            if (!handlers.has(name)) handlers.set(name, []);
            handlers.get(name).push(fn);
        };
        target.emit = (name, event = {}) => {
            for (const fn of handlers.get(name) || []) fn({ currentTarget: target, ...event });
        };
        return target;
    }
    function element() {
        const classes = new Set(), captures = new Set(), calls = {}, attributes = new Map();
        const ctx = {};
        for (const name of ['beginPath','clearRect','moveTo','lineTo','stroke','setLineDash','arc','fill','save','restore','drawImage']) {
            ctx[name] = () => { calls[name] = (calls[name] || 0) + 1; };
        }
        ctx.calls = calls; contexts.push(ctx);
        const style = {setProperty(key, value) { this[key] = value; }};
        const el = events({style,children:[],width:300,height:150});
        Object.defineProperty(el, 'className', { get: () => [...classes].join(' '), set: value => { classes.clear(); String(value).split(/\s+/).filter(Boolean).forEach(x => classes.add(x)); } });
        Object.defineProperty(el, 'innerHTML', { get: () => el._html || '', set: value => { el._html = value; el.children = []; } });
        Object.defineProperty(el, 'innerText', { get: () => el._text || '', set: value => { el._text = value; el.children = []; } });
        Object.assign(el, {
            classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x,v) { v = v ?? !classes.has(x); v ? classes.add(x) : classes.delete(x); return v; } },
            setAttribute(name,value) { attributes.set(name,String(value)); },
            getAttribute(name) { return attributes.get(name) ?? null; },
            appendChild(child) { this.children.push(child); },
            getContext: () => ctx,
            getBoundingClientRect: () => ({left:0,top:0,width:win.innerWidth,height:win.innerHeight}),
            setPointerCapture: id => captures.add(id),
            hasPointerCapture: id => captures.has(id),
            releasePointerCapture(id) { captures.delete(id); this.emit('lostpointercapture',{pointerId:id}); }
        });
        return el;
    }
    const param = () => ({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;}});
    const audioNode = () => ({gain:param(),frequency:param(),delayTime:param(),connect(){},start(){}});
    class AudioContext {
        constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
        createGain(){return audioNode();} createDelay(){return audioNode();} createOscillator(){return audioNode();}
        resume(){this.state='running';return Promise.resolve();}
    }
    class Image {
        set src(value) {
            this._src = value;
            if (!value) return;
            imageRequests.push(value); imageJobs.push(this);
            if (!manualImages) queueMicrotask(() => this.succeed());
        }
        get src() { return this._src; }
        succeed() { this.done = true; this.onload?.(); }
        fail() { this.done = true; this.onerror?.(); }
        decode() { return Promise.resolve(); }
    }
    const win = events({innerWidth:1280,innerHeight:960,AudioContext});
    const doc = events({hidden:false,getElementById(id) { if (!elements.has(id)) elements.set(id,element()); return elements.get(id); },createElement:element,documentElement:element()});
    const sandbox = {window:win,document:doc,console,Image,setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)};
    vm.createContext(sandbox); vm.runInContext(source,sandbox);
    const run = code => vm.runInContext(code,sandbox);
    win.emit('load');
    return {run,win,doc,elements,contexts,frames,imageJobs,imageRequests,timers,
        async flushImages() { for (let i=0;i<20;i++) { for (const image of imageJobs.filter(x=>!x.done)) image.succeed(); await new Promise(resolve=>setImmediate(resolve)); } },
        time(v){time=v;},
        pointer(kind,id,x,y,surface='voyager-object',pointerType='touch') {
            const event={pointerId:id,clientX:x,clientY:y,pointerType,button:0,preventDefault(){}};
            (kind==='pointerdown' ? elements.get(surface) : win).emit(kind,event);
        },
        draw(){const start=time;run('toggleRecordingMode()');this.pointer('pointerdown',1,100,480);this.time(start+100);this.pointer('pointermove',1,500,720);this.time(start+200);this.pointer('pointerup',1,500,720);}
    };
}
function close(a,b){assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);}
function installPath(a, points) {
    a.run(`path=${JSON.stringify(points)}; pathDirty=true;`);
    a.time(0);a.run('startPlayback()');
}

test('extra fingers neither steal nor finish the active drawing', () => {
    const a=app();a.run('toggleRecordingMode()');a.pointer('pointerdown',1,100,480);
    a.time(100);a.pointer('pointermove',1,400,600);
    a.pointer('pointerdown',2,800,300);a.pointer('pointermove',2,900,200);a.pointer('pointerup',2,900,200);
    assert.equal(a.run('isDrawing'),true);assert.equal(a.run('voyagerX'),400);
    a.time(200);a.pointer('pointerup',1,400,600);
    assert.equal(a.run('isRecordingMode'),false);assert.equal(a.elements.get('play-btn').disabled,false);
});

test('canceled input and lost pointer capture stop sound and retain a usable recording', () => {
    for(const cancellation of ['pointercancel','lostpointercapture']) {
        const a=app();a.run('toggleSound(); toggleRecordingMode()');a.pointer('pointerdown',1,100,480);
        a.time(100);a.pointer('pointermove',1,400,600);
        a.time(200);
        if(cancellation==='pointercancel')a.pointer(cancellation,1,400,600);
        else a.elements.get('voyager-object').emit(cancellation,{pointerId:1});
        assert.equal(a.run('isDrawing'),false);assert.equal(a.run('activePointerId'),null);
        assert.equal(a.run('outputGain.gain.value'),0);assert.equal(a.elements.get('play-btn').disabled,false);
        a.run('startPlayback()');assert.equal(a.run('outputGain.gain.value'),1);
    }
});

test('lost focus and a hidden page end recording/playback and mute both dry sound and echo', () => {
    for(const cause of ['blur','pagehide','visibilitychange']) {
        const a=app();a.run('toggleSound(); toggleReverb(); toggleMultiStroke(); toggleRecordingMode()');
        a.pointer('pointerdown',1,100,480);a.time(100);a.pointer('pointermove',1,400,600);a.time(200);
        if(cause==='visibilitychange'){a.doc.hidden=true;a.doc.emit(cause);}else a.win.emit(cause);
        assert.equal(a.run('isDrawing || isRecordingMode || isPlaying'),false);
        assert.equal(a.run('outputGain.gain.value'),0);assert.equal(a.run('gainNode.gain.value'),0);
        a.doc.hidden=false;a.run('startPlayback()');assert.equal(a.run('isPlaying'),true);
        a.win.emit('blur');assert.equal(a.run('isPlaying'),false);assert.equal(a.run('outputGain.gain.value'),0);
    }
});

test('resizing preserves relative positions and recorded pitch through rotation', () => {
    const a=app();a.draw();
    const before=a.run('getQuantizedFrequency(path[1].y)');
    for(const [w,h] of [[640,480],[960,1280],[1280,960]]) {
        a.win.innerWidth=w;a.win.innerHeight=h;a.win.emit('resize');
        close(a.run('path[1].x / canvas.width'),500/1280);
        close(a.run('path[1].y / canvas.height'),720/960);
        close(a.run('getQuantizedFrequency(path[1].y)'),before);
    }
});

test('rotation during a stroke finishes it safely, and rotation during playback preserves playback', () => {
    const a=app();a.run('toggleRecordingMode()');a.pointer('pointerdown',1,100,480);
    a.time(100);a.pointer('pointermove',1,500,720);a.time(200);
    a.win.innerHeight=480;a.win.emit('resize');
    assert.equal(a.run('isDrawing'),false);assert.equal(a.run('activePointerId'),null);
    close(a.run('path[1].y'),360);
    a.run('startPlayback()');a.win.innerHeight=960;a.win.emit('resize');
    assert.equal(a.run('isPlaying'),true);close(a.run('path[1].y'),720);
});

test('all scale modes select a nearest allowed pitch, including octave boundaries', () => {
    const a=app();
    const scales={chromatic:[0,1,2,3,4,5,6,7,8,9,10,11],major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],pentatonic:[0,3,5,7,10]};
    for(const [name,notes] of Object.entries(scales)) {
        a.run(`changeScale('${name}')`);
        const permitted=Array.from({length:49},(_,i)=>48+i).filter(n=>notes.includes(n%12));
        for(let step=0;step<=480;step++) {
            const wanted=48+step/10, y=(1-(wanted-48)/48)*960;
            const actual=69+12*Math.log2(a.run(`getQuantizedFrequency(${y})`)/440);
            assert.ok(permitted.some(n=>Math.abs(n-actual)<1e-8));
            close(Math.abs(actual-wanted),Math.min(...permitted.map(n=>Math.abs(n-wanted))));
        }
    }
});

test('dragging outside the canvas remains in bounds with finite pitches', () => {
    const a=app();a.pointer('pointerdown',1,100,480);
    a.pointer('pointermove',1,-1000,-1000);
    assert.equal(a.run('voyagerX'),0);assert.equal(a.run('voyagerY'),0);
    a.pointer('pointermove',1,10000,10000);
    assert.equal(a.run('voyagerX'),1280);assert.equal(a.run('voyagerY'),960);
    close(a.run('getQuantizedFrequency(-10000)'),a.run('getQuantizedFrequency(0)'));
});

const skippedPath=[{type:'down',x:100,y:480,t:0},{type:'move',x:300,y:280,t:1000},{type:'up',x:300,y:280,t:1100},{type:'down',x:900,y:700,t:2000},{type:'move',x:1000,y:800,t:3000},{type:'up',x:1000,y:800,t:3100}];
test('replay interpolates within strokes and retains silence and jumps between them', () => {
    const a=app();a.run('toggleSound()');installPath(a,skippedPath);
    a.time(500);a.run('animate()');close(a.run('voyagerX'),200);close(a.run('voyagerY'),380);
    a.time(1500);a.run('animate()');close(a.run('voyagerX'),300);assert.equal(a.run('gainNode.gain.value'),0);
    a.time(2000);a.run('animate()');close(a.run('voyagerX'),900);assert.ok(a.run('gainNode.gain.value')>0);
    a.time(2500);a.run('animate()');close(a.run('voyagerX'),950);
});

test('loop wrap preserves fractional timing, jumps and restart behavior', () => {
    const a=app();a.run('toggleLoop()');installPath(a,skippedPath);
    a.time(3600);a.run('animate()');close(a.run('voyagerX'),200);
    a.time(3*3100+500);a.run('animate()');close(a.run('voyagerX'),200);
    a.run('stopPlayback()');a.time(10000);a.run('startPlayback()');close(a.run('voyagerX'),100);
    a.run('toggleLoop()');a.time(14000);a.run('animate()');assert.equal(a.run('isPlaying'),false);
});

test('a long replay caches its path and advances without rescanning old points', () => {
    const a=app();
    const points=Array.from({length:20000},(_,i)=>({type:i===0?'down':'move',x:i%1280,y:480,t:i*10}));
    points.push({type:'up',x:points.at(-1).x,y:480,t:200000});
    installPath(a,points);
    const before=a.run('pathCtx.calls.beginPath');
    a.run("globalThis.reads=0; path=new Proxy(path,{get(target,key){if(/^\\d+$/.test(String(key)))reads++;return target[key];}})");
    for(let i=1;i<=100;i++){a.time(i*1500);a.run('animate()');}
    assert.equal(a.run('pathCtx.calls.beginPath'),before);
    assert.ok(a.run('reads')<20000, 'Playback repeatedly rescanned the path');
    a.run('applyTheme(1)');assert.equal(a.run('pathCtx.calls.beginPath'),before+1);
    a.win.innerHeight=480;a.win.emit('resize');assert.equal(a.run('pathCtx.calls.beginPath'),before+2);
});

test('multi-stroke capture can finish, replay, reset, and start a fresh recording', () => {
    const a=app();a.run('toggleMultiStroke();toggleRecordingMode()');
    a.pointer('pointerdown',1,100,480);a.time(100);a.pointer('pointermove',1,200,400);a.time(200);a.pointer('pointerup',1,200,400);
    assert.equal(a.run('isRecordingMode'),true);
    a.time(1000);a.pointer('pointerdown',2,700,600,'canvas');a.time(1100);a.pointer('pointermove',2,800,700);a.time(1200);a.pointer('pointerup',2,800,700);
    a.run('toggleRecordingMode()');assert.equal(a.run('path.length'),6);
    a.run('startPlayback(); resetApp()');assert.equal(a.run('path.length'),0);assert.equal(a.run('isPlaying'),false);
    assert.equal(a.elements.get('play-btn').disabled,true);a.draw();a.run('toggleRecordingMode()');assert.equal(a.elements.get('play-btn').disabled,false);
});


test('all eight illustrated scenes have matching sprites, bounded layers and no duplicate fish tails', async () => {
    const a=app(), voyager=a.elements.get('voyager-object'), decor=a.elements.get('decor-layer');
    const rocket=voyager.children.find(x=>x.className==='explorer-art');
    assert.equal(rocket.src,'assets/rocket-explorer.webp');
    for(let i=1;i<=24;i++) {
        await a.run('cycleTheme()');
        const index=i%8;
        assert.equal(a.run('currentThemeIndex'),index);
        assert.ok(voyager.classList.contains('illustrated'));
        assert.equal(voyager.children.filter(x=>x.className==='explorer-tail').length,index===1?1:0);
        assert.ok(decor.children.length<=30);
        assert.ok(a.run('imageCache.size')<=3);
        const art=voyager.children.find(x=>x.className==='explorer-art');
        assert.equal(art.src,a.run('themes[currentThemeIndex].sprite'));
        art.emit('load');assert.ok(voyager.classList.contains('art-ready'));
    }
    await a.run('cycleTheme()');
    rocket.emit('load');
    assert.equal(voyager.classList.contains('art-ready'),false, 'Old sprite load revealed a different sprite');
});

test('slow scene loading leaves recording and replay responsive and coalesces rapid taps', async () => {
    const a=app({manualImages:true});
    a.run('cycleTheme(); cycleTheme(); cycleTheme();'); // Latest choice is Garden.
    assert.equal(a.run('currentThemeIndex'),0);
    assert.equal(a.imageRequests.length,2, 'Unbounded parallel image loads');
    a.draw();assert.equal(a.run('path.length'),3);
    a.run('startPlayback()');a.time(250);a.run('animate()');
    assert.ok(a.run('voyagerX')>100);
    await a.flushImages();
    assert.equal(a.run('currentThemeIndex'),3);
    assert.equal(a.run('isPlaying'),true);
    assert.equal(a.imageRequests.some(src=>src.includes('sky-')),false, 'Loaded a skipped scene');
    assert.equal(a.run('path.length'),3);
});

test('failed and timed out assets preserve the working scene and allow a retry', async () => {
    for (const failWithTimeout of [false,true]) {
        const a=app({manualImages:true});
        const task=a.run('cycleTheme()');
        if (failWithTimeout) {
            for(const [id,timer] of [...a.timers]) if(timer.ms===8000) {a.timers.delete(id);timer.fn();}
        } else {
            a.imageJobs[0].fail();a.imageJobs[1].succeed();
        }
        await task;
        assert.equal(a.run('currentThemeIndex'),0);
        assert.equal(a.run('sceneLoadTask'),null);
        assert.match(a.elements.get('status').innerText,/could not load/);
        a.run('cycleTheme()');await a.flushImages();
        assert.equal(a.run('currentThemeIndex'),1);
        assert.ok(a.elements.get('voyager-object').classList.contains('explorer-ocean'));
    }
});

test('an idle prefetch never wins over a later theme choice or blocks controls', async () => {
    const a=app({manualImages:true});
    const [id,timer]=[...a.timers].find(([,timer])=>timer.ms===1500);
    a.timers.delete(id);timer.fn();
    a.run('cycleTheme(); cycleTheme();');
    a.pointer('pointerdown',1,100,480);a.pointer('pointermove',1,400,320);a.pointer('pointerup',1,400,320);
    assert.equal(a.run('voyagerX'),400);
    await a.flushImages();
    assert.equal(a.run('currentThemeIndex'),2);
    assert.equal(a.elements.get('app-title').innerText,'Clouds');
    assert.ok(a.run('imageCache.size')<=3);
});

test('returning to the current scene during a prefetch clears its loading indicator', async () => {
    const a=app({manualImages:true});
    const [,timer]=[...a.timers].find(([,timer])=>timer.ms===1500);timer.fn();
    a.run('for(let i=0;i<8;i++) cycleTheme()');
    await a.flushImages();
    assert.equal(a.run('currentThemeIndex'),0);
    assert.equal(a.elements.get('app-title').innerText,'Space');
});

test('long recordings append to the cached drawing without revisiting old points', () => {
    const a=app();a.run('toggleRecordingMode()');
    a.pointer('pointerdown',1,100,480);
    for(let i=1;i<=20000;i++) a.run(`appendPoint('move',${i%1200},400,${i*10})`);
    a.run('drawPath()');
    const initial=a.run('pathCtx.calls.lineTo');
    a.run("globalThis.recordingReads=0; path=new Proxy(path,{get(target,key){if(/^\\d+$/.test(String(key)))recordingReads++;return target[key];}})");
    for(let i=0;i<100;i++) a.run(`appendPoint('move',${i},400,${200010+i*10});drawPath()`);
    assert.equal(a.run('pathCtx.calls.lineTo')-initial,100);
    assert.ok(a.run('recordingReads')<500, 'Recording repeatedly rescanned old samples');
    assert.equal(a.run('pathRenderedCount'),20101);
});

test('asset references resolve to small local files and artwork has no remote dependencies', () => {
    const root=require('node:path').join(__dirname,'../dist');
    const assets=fs.readdirSync(root+'/assets');
    assert.equal(assets.length,20);
    for(const asset of assets) {
        assert.match(asset,/\.webp$/);
        assert.ok(fs.statSync(root+'/assets/'+asset).size<300*1024,asset+' is too large');
    }
    for(const asset of [...html.matchAll(/assets\/[a-z-]+\.webp/g)].map(x=>x[0])) assert.ok(fs.existsSync(root+'/'+asset),asset);
    assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)=['"]https?:/);
});
