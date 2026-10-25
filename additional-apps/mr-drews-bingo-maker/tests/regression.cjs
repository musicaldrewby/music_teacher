// Behavioral regression checks. DOM/media doubles do not replace browser QA.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
new vm.Script(script);
const tests = [];
const test = (name, run) => tests.push({name, run});

function app() {
    const elements = new Map(), listeners = new Map();
    function element(id = '') {
        const classes = new Set(), handlers = new Map(), attributes = new Map();
        let markup = '';
        const el = {id, value:'', style:{}, children:[], disabled:false, innerText:'', textContent:'',
            classList:{add(...xs){xs.forEach(x=>classes.add(x));}, remove(...xs){xs.forEach(x=>classes.delete(x));}, replace(a,b){classes.delete(a);classes.add(b);}, toggle(x,on){if(on===undefined)on=!classes.has(x);if(on)classes.add(x);else classes.delete(x);}, contains(x){return classes.has(x);}},
            addEventListener(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn);},
            dispatch(name,event={}){for(const fn of handlers.get(name)||[])fn(event);}, focus(){},remove(){},click(){},
            setAttribute(name,value){attributes.set(name,String(value));},getAttribute(name){return attributes.get(name)??null;},removeAttribute(name){attributes.delete(name);},
            appendChild(child){this.children.push(child);if(child.id)elements.set(child.id,child);},
            querySelectorAll(selector){return this.children.flatMap(child=>[...(selector==='img' && child.tagName==='IMG'?[child]:[]),...child.querySelectorAll(selector)]);}
        };
        Object.defineProperty(el,'innerHTML',{get(){return markup;},set(value){
            markup=value;el.children=[];
            for(const m of value.matchAll(/<img\s[^>]*src="([^"]+)"[^>]*>/g)){const image=element();image.tagName='IMG';image.src=m[1];el.children.push(image);}
            for(const m of value.matchAll(/id="([a-z0-9_-]+)"/gi))elements.set(m[1],element(m[1]));
        }});
        return el;
    }
    for(const m of html.matchAll(/id="([a-z0-9_-]+)"/gi))elements.set(m[1],element(m[1]));
    const values = {'content-type':'text','free-space-mode':'center','game-title':'Music Bingo','card-count':'30','print-color':'color','rule-teacher':'image','rule-student':'text','audio-rule-teacher':'audio','audio-rule-student':'text','grid-size':'5','win-pattern':'line','thinking-seconds':'0','narrator-rate':'0.9','narrator-volume':'1','narrator-voice':'','math-min':'1','math-max':'12','math-operation':'multiply'};
    Object.entries(values).forEach(([id,value])=>elements.get(id).value=value);
    let ctx;
    class Reader {
        abort(){this.onabort?.();}
        readAsText(file){queueMicrotask(()=>{if(file.fail)this.onerror?.();else {this.result=file.contents;this.onload?.();}});}
        readAsDataURL(file){queueMicrotask(()=>{if(file.fail)this.onerror?.();else {this.result=file.data;this.onload?.();}});}
    }
    class Image {
        constructor(){this.width=100;this.height=100;this.naturalWidth=100;}
        set src(value){this.source=value;queueMicrotask(()=>value.includes('broken')?this.onerror?.():this.onload?.());}
    }
    class Audio {
        constructor(data){this.src=data;this.paused=true;this.currentTime=0;}
        play(){if(ctx.failAudio)return Promise.reject(new Error('Decode failed'));this.paused=false;return ctx.deferAudio?new Promise((resolve,reject)=>{ctx.resolvePlay=resolve;ctx.rejectPlay=reject;}):Promise.resolve();}
        pause(){this.paused=true;}
    }
    ctx=vm.createContext({console,setTimeout,clearTimeout,setInterval:(fn,ms)=>{const t=setInterval(fn,ms);t.unref();return t;},clearInterval,setImmediate,clearImmediate,queueMicrotask,Buffer,Uint8Array,ArrayBuffer,Blob,TextEncoder,TextDecoder,crypto:{randomUUID},FileReader:Reader,Image,Audio,
        navigator:{userAgent:'regression-test'},
        document:{getElementById:id=>elements.get(id)||null,createElement(tag){const el=element();el.tagName=tag.toUpperCase();if(tag==='canvas'){el.getContext=()=>({fillRect(){},drawImage(){}});el.toDataURL=()=> 'data:image/jpeg;base64,AAAA';}return el;},body:element(),fonts:{ready:Promise.resolve()}},
        addEventListener(name,fn){listeners.set(name,fn);},confirm:()=>true,print(){ctx.printCalls=(ctx.printCalls||0)+1;},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
    });
    ctx.window=ctx;
    const run = code => vm.runInContext(code,ctx);
    run(script);
    return {ctx, elements, listeners, run,
        value(id,v){elements.get(id).value=String(v);},
        json(code){return JSON.parse(run(`JSON.stringify(${code})`));},
        seed(type='text',count=30){ctx.seedType=type;ctx.seedCount=count;elements.get('content-type').value=type;run("items=Array.from({length:seedCount},(_,i)=>({id:'item_'+i,type:seedType,prompt:'',text:'Note '+i,data:seedType==='text'?null:'data:'+seedType+'/test;base64,AAAA',...(seedType==='audio'?{attachedImage:null}:{})}));updateUI();");},
        async load(data){ctx.fileEvent={target:{files:[{contents:typeof data==='string'?data:JSON.stringify(data)}],value:'selected'}};await run('loadProject(fileEvent)');},
        async csv(contents){ctx.fileEvent={target:{files:[{contents}],value:'selected'}};await run('processCSV(fileEvent)');},
        async save(){ctx.showSaveFilePicker=async()=>({createWritable:async()=>({write:async text=>{ctx.saved=JSON.parse(text);},close:async()=>{}})});await run('saveProject()');return ctx.saved;},
        message(){return elements.get('modal-message').innerText;}
    };
}

test('card layouts survive save/load, reprint, and printing more or fewer cards', async()=>{
    const a=app();a.seed();a.value('card-count',3);await a.run('printCards()');
    const cards=a.json('generatedCards'),id=a.run('cardSetId');
    const saved=await a.save();assert.deepEqual(saved.generatedCards,cards);assert.equal(saved.cardSetId,id);assert.equal(a.run('dirty'),false);
    const b=app();await b.load(saved);assert.deepEqual(b.json('generatedCards'),cards);assert.equal(b.run('cardSetId'),id);
    await b.run('printCards()');assert.deepEqual(b.json('generatedCards'),cards);
    b.value('card-count',5);await b.run('printCards()');assert.deepEqual(b.json('generatedCards.slice(0,3)'),cards);assert.equal(b.run('generatedCards.length'),5);
    b.value('card-count',2);await b.run('printCards()');assert.equal(b.run('generatedCards.length'),5);assert.equal(b.run('cardSetId'),id);
    b.run('startGameMode(); for(let i=0;i<30;i++)drawNextItem();');b.value('verify-card-num',1);b.run('checkBingo()');assert.match(b.elements.get('verify-result-msg').innerText,/We have a winner/);
});
test('new sets are deliberate and canceled printing changes nothing', async()=>{
    const a=app();a.seed();a.value('card-count',2);await a.run('printCards()');const cards=a.json('generatedCards'),id=a.run('cardSetId');
    a.ctx.confirm=()=>false;await a.run('printCards(true)');assert.deepEqual(a.json('generatedCards'),cards);
    a.ctx.confirm=()=>true;await a.run('printCards(true)');assert.notEqual(a.run('cardSetId'),id);
});
test('legacy projects reset old cards and caller state',async()=>{
    const a=app();a.seed();await a.run('printCards()');a.run('startGameMode();drawNextItem()');
    await a.load({title:'Legacy',type:'text',items:[{id:'other',type:'text',text:'New'}]});
    assert.equal(a.run('generatedCards.length'),0);assert.equal(a.run('drawnItems.length'),0);assert.equal(a.run('gamePool.length'),0);assert.equal(a.run('cardSetId'),'');assert.equal(a.run('dirty'),false);
});
test('invalid projects are rejected atomically, including stale cards and unsafe media',async()=>{
    const a=app();a.seed();a.value('card-count',1);await a.run('printCards()');const before=a.json('collectProject()');
    const badInputs=['{broken', {items:{}}, {items:[] ,type:'unexpected'}, {...before,items:[...before.items,before.items[0]]}, {...before,generatedCards:[Array(25).fill('missing')]}, {items:[{id:'one',type:'image',text:'bad',data:'https://example.invalid/picture.jpg'}]}, {...before,cardSetId:'<bad>'}];
    for(const input of badInputs){await a.load(input);assert.deepEqual(a.json('collectProject()'),before);assert.equal(a.elements.get('modal-title').innerText,'Project Not Loaded');}
    a.ctx.confirm=()=>false;await a.load({items:[]});assert.deepEqual(a.json('collectProject()'),before);
});
test('CSV supports commas, escaped quotes, multiline fields, BOM and one-column answers',async()=>{
    const a=app();await a.csv('\uFEFF"Fast, lively","Allegro"\r\n"Say ""hello""","C, D"\n"Two\nlines",Answer\nSolo\n');
    assert.deepEqual(a.json('items.map(({prompt,text})=>({prompt,text}))'),[{prompt:'Fast, lively',text:'Allegro'},{prompt:'Say "hello"',text:'C, D'},{prompt:'Two\nlines',text:'Answer'},{prompt:'',text:'Solo'}]);
    const before=a.json('items');for(const bad of ['good,value\n"unterminated','one,two,three']){await a.csv(bad);assert.deepEqual(a.json('items'),before);}
});
test('printing validates whole-number quantities without destroying existing cards',async()=>{
    const a=app();a.seed();a.value('card-count',1);await a.run('printCards()');const cards=a.json('generatedCards');
    for(const count of ['',0,-1,101,1.5,'nope']){a.value('card-count',count);await a.run('printCards()');assert.deepEqual(a.json('generatedCards'),cards);assert.equal(a.ctx.printCalls,1);}
});
test('editing content or matching rules invalidates verification; titles do not',async()=>{
    const a=app();a.seed();a.value('card-count',1);await a.run('printCards()');
    a.elements.get('game-title').dispatch('input');assert.equal(a.run('generatedCards.length'),1);
    a.run("updateItemData('item_0','text','Updated')");assert.equal(a.run('generatedCards.length'),0);
    await a.run('printCards()');a.value('free-space-mode','none');a.elements.get('free-space-mode').dispatch('change');assert.equal(a.run('generatedCards.length'),0);
});
test('unload warning and dirty tracking respect canceled/failed saves and later edits',async()=>{
    const a=app();a.seed();a.run('markDirty()');let warned=false;a.listeners.get('beforeunload')({preventDefault(){warned=true;}});assert.equal(warned,true);
    a.ctx.showSaveFilePicker=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});};await a.run('saveProject()');assert.equal(a.run('dirty'),true);
    await a.save();assert.equal(a.run('dirty'),false);warned=false;a.listeners.get('beforeunload')({preventDefault(){warned=true;}});assert.equal(warned,false);
    a.ctx.showSaveFilePicker=async()=>({createWritable:async()=>({write:async()=>a.run('markDirty()'),close:async()=>{}})});await a.run('saveProject()');assert.equal(a.run('dirty'),true);
});
test('user text remains escaped in list, call, history and printed cards',async()=>{
    const a=app();a.seed();a.run(`items[0].text='Say "hello" <img src=x> & sing';items[0].prompt='<b>Question</b>';renderList();`);
    const markup=a.elements.get('item-list').children[0].innerHTML;assert.match(markup,/&quot;hello&quot;/);assert.match(markup,/&lt;img src=x&gt;/);assert.ok(!markup.includes('<b>Question</b>'));
    a.run('gamePool=[items[0]];drawNextItem()');assert.match(a.elements.get('current-draw-card').innerHTML,/&lt;b&gt;Question/);assert.match(a.elements.get('history-tray').children[0].innerHTML,/&lt;b&gt;Question/);
});
test('all card modes have 25 distinct cells; every item is called exactly once',async()=>{
    const a=app();a.seed();for(const mode of ['center','random','none']){a.value('free-space-mode',mode);const card=a.json('generateCardData()');assert.equal(card.length,25);assert.equal(new Set(card).size,25);assert.equal(card.includes('FREE'),mode!=='none');if(mode==='center')assert.equal(card[12],'FREE');}
    a.run('startGameMode();for(let i=0;i<30;i++)drawNextItem()');assert.equal(a.run('new Set(drawnItems.map(i=>i.id)).size'),30);assert.equal(a.run('gamePool.length'),0);
});
test('media batch continues after a broken image or read error',async()=>{
    const a=app();a.value('content-type','image');a.ctx.upload={target:{value:'selected',files:[{name:'bad.png',type:'image/png',data:'broken'},{name:'unreadable.png',type:'image/png',fail:true},{name:'good.picture.png',type:'image/png',data:'data:image/png;base64,AAAA'}]}};
    await a.run('processMediaFiles(upload)');assert.equal(a.run('items.length'),1);assert.equal(a.run('items[0].text'),'good.picture');assert.equal(a.run('pendingImports'),0);assert.match(a.message(),/Could not add 2/);
});
test('audio errors are reported; intentional stops do not produce late errors',async()=>{
    const a=app();a.ctx.failAudio=true;a.run("currentAudio=makeAudio('data:audio/wav;base64,AAAA')");await a.run('playAudio(currentAudio)');assert.equal(a.elements.get('modal-title').innerText,'Audio Could Not Play');
    a.ctx.failAudio=false;a.ctx.deferAudio=true;a.run("currentAudio=makeAudio('data:audio/wav;base64,AAAA');closeModal()");const playing=a.run('playAudio(currentAudio)');a.run('stopCurrentAudio()');a.ctx.rejectPlay(new Error('Abort'));await playing;assert.equal(a.elements.get('modal-overlay').style.display,'none');
});
test('real PowerPoint export still generates ten caller games',async()=>{
    const a=app();a.seed();a.run("items[0].text='C & D';items[0].prompt='Say \\\"hello\\\"';");
    for(const name of ['jszip.min.js','pptxgen.min.js'])a.run(fs.readFileSync(path.join(root,'dist/assets/vendor',name),'utf8'));
    a.run("const ActualPptx=PptxGenJS;PptxGenJS=function(){const pptx=new ActualPptx();pptx.writeFile=async()=>{globalThis.exportBuffer=await pptx.write({outputType:'arraybuffer'});};return pptx;};");
    await a.run('exportPPTX()');assert.ok(a.ctx.exportBuffer);
    const zip=await a.ctx.JSZip.loadAsync(a.ctx.exportBuffer);assert.equal(Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,311);
});

test('all three steps are reachable with an empty game and show readiness guidance',async()=>{
    const a=app();a.run("goToStep('print')");assert.equal(a.run('currentStep'),'print');assert.equal(a.elements.get('panel-print').classList.contains('hidden'),false);assert.equal(a.elements.get('preview-paper').classList.contains('hidden'),true);assert.equal(a.run('generatedCards.length'),0);
    a.run("goToStep('play')");assert.equal(a.elements.get('panel-play').classList.contains('hidden'),false);assert.equal(a.elements.get('btn-start-game').disabled,true);
    a.run("goToStep('create')");assert.equal(a.elements.get('step-create').getAttribute('aria-current'),'step');assert.equal(a.elements.get('step-print').getAttribute('aria-current'),null);
});
test('type and free-space buttons stay synchronized with examples and item requirements',async()=>{
    const a=app();a.run("setContentType('image')");assert.equal(a.run('typeSelect.value'),'image');assert.equal(a.elements.get('type-image').getAttribute('aria-pressed'),'true');assert.equal(a.elements.get('type-text').getAttribute('aria-pressed'),'false');assert.equal(a.elements.get('image-rules').classList.contains('hidden'),false);
    a.run("setFreeSpace('none')");assert.equal(a.run('requiredItemCount()'),25);assert.equal(a.elements.get('free-none').getAttribute('aria-pressed'),'true');
    a.run("setContentType('audio')");assert.equal(a.elements.get('btn-pptx').disabled,true);assert.match(a.elements.get('teacher-example').innerHTML,/Sound plays/);
});
test('hidden picture and audio clues survive mode changes and save/load without changing card words',async()=>{
    for(const type of ['image','audio']){
        const a=app();a.seed(type,2);
        a.run("items[1].text='Trumpet';items[1].prompt='A brass instrument';renderList();selectMatchingItem(items[1].id)");
        const teacherRule=type==='image'?'rule-teacher':'audio-rule-teacher';
        assert.doesNotMatch(a.elements.get('item-list').children[1].innerHTML,/Teacher screen only/);
        assert.doesNotMatch(a.elements.get('teacher-example').innerHTML,/A brass instrument/);
        assert.match(a.elements.get('student-example').innerHTML,/Trumpet/);
        a.value(teacherRule,'both');a.elements.get(teacherRule).dispatch('change');
        assert.match(a.elements.get('item-list').children[1].innerHTML,/value="A brass instrument"/);
        assert.match(a.elements.get('teacher-example').innerHTML,/A brass instrument/);
        assert.match(a.elements.get('student-example').innerHTML,/Trumpet/);
        a.value(teacherRule,type);a.elements.get(teacherRule).dispatch('change');
        const saved=await a.save();assert.equal(saved.items[1].prompt,'A brass instrument');
        const b=app();await b.load(saved);b.value(teacherRule,'both');b.elements.get(teacherRule).dispatch('change');b.run('selectMatchingItem(items[1].id)');
        assert.match(b.elements.get('teacher-example').innerHTML,/A brass instrument/);
        b.run("updateItemData(items[1].id,'text','French horn')");
        assert.match(b.elements.get('student-example').innerHTML,/French horn/);
        assert.match(b.elements.get('teacher-example').innerHTML,/A brass instrument/);
    }
});
test('matching selection preserves a saved live game, follows edits and safely handles removal or new content',async()=>{
    const a=app();assert.equal(a.elements.get('matching-item').disabled,true);
    a.seed('image');a.value('card-count',2);a.run("goToStep('print');startGameMode();drawNextItem();goToStep('create')");await a.save();
    const before=a.json('collectProject()'),pool=a.json('gamePool'),drawn=a.json('drawnItems');
    a.run('selectMatchingItem(items[4].id)');
    assert.equal(a.elements.get('matching-item').value,'item_4');assert.match(a.elements.get('student-example').innerHTML,/Note 4/);
    assert.deepEqual(a.json('collectProject()'),before);assert.deepEqual(a.json('gamePool'),pool);assert.deepEqual(a.json('drawnItems'),drawn);assert.equal(a.run('dirty'),false);
    a.run(`updateItemData(items[6].id,'text','Trumpet <br> & horn')`);
    assert.equal(a.elements.get('matching-item').value,'item_6');assert.match(a.elements.get('student-example').innerHTML,/Trumpet &lt;br&gt; &amp; horn/);
    assert.match(a.elements.get('matching-item').innerHTML,/Trumpet &lt;br&gt; &amp; horn/);
    a.run('removeItem(items[6].id)');assert.equal(a.elements.get('matching-item').value,'item_0');assert.match(a.elements.get('student-example').innerHTML,/Note 0/);
    a.run("setContentType('text')");assert.equal(a.elements.get('matching-item').disabled,true);assert.doesNotMatch(a.elements.get('student-example').innerHTML,/Note 0/);
    await a.load({title:'Another game',type:'text',items:[{id:'new_item',type:'text',text:'Quarter note',prompt:'One beat'}]});
    assert.equal(a.elements.get('matching-item').value,'new_item');assert.equal(a.elements.get('matching-item').disabled,false);assert.match(a.elements.get('teacher-example').innerHTML,/One beat/);
});
test('preview browsing, saving and print output use the same actual card layouts',async()=>{
    const a=app();a.seed();a.value('card-count',3);a.run("goToStep('print')");const cards=a.json('generatedCards');assert.equal(cards.length,3);assert.equal(a.ctx.printCalls||0,0);assert.equal(a.run('dirty'),true);
    const cellHTML=()=>a.elements.get('preview-grid-container').children[0].children.map(cell=>cell.innerHTML);
    const first=cellHTML();a.run('changePreviewCard(1)');assert.equal(a.run('previewIndex'),1);assert.equal(a.elements.get('preview-counter').textContent,'Card 2 of 3');const second=cellHTML();
    await a.run('printCards()');const pages=a.elements.get('print-area').children;assert.deepEqual(pages[0].children[1].children.map(cell=>cell.innerHTML),first);assert.deepEqual(pages[1].children[1].children.map(cell=>cell.innerHTML),second);
    assert.deepEqual((await a.save()).generatedCards,cards);a.run('changePreviewCard(99)');assert.equal(a.run('previewIndex'),2);assert.equal(a.elements.get('btn-preview-next').disabled,true);
});
test('preview and printed cells match for every picture and audio matching rule',async()=>{
    for(const type of ['image','audio'])for(const rule of ['image','text','both']){
        const a=app();a.seed(type);if(type==='audio')a.run("items.forEach((item,i)=>{item.attachedImage=i%2?'data:image/png;base64,AAAA':null;})");
        a.value(type==='image'?'rule-student':'audio-rule-student',rule);a.value('card-count',1);a.run("goToStep('print')");const preview=a.elements.get('preview-grid-container').children[0].children.map(cell=>cell.innerHTML);
        await a.run('printCards()');const printed=a.elements.get('print-area').children[0].children[1].children.map(cell=>cell.innerHTML);assert.deepEqual(printed,preview);
    }
});
test('switching screens preserves an active round and drawing order',async()=>{
    const a=app();a.seed();a.run("goToStep('print');startGameMode();drawNextItem();drawNextItem()");const pool=a.json('gamePool'),drawn=a.json('drawnItems');
    a.run("goToStep('create');goToStep('print');goToStep('play')");assert.equal(a.run('gameActive'),true);assert.deepEqual(a.json('gamePool'),pool);assert.deepEqual(a.json('drawnItems'),drawn);assert.equal(a.elements.get('game-mode').style.display,'flex');assert.equal(a.elements.get('edit-mode').style.display,'none');
    a.run('drawNextItem()');assert.equal(a.run('drawnItems.length'),3);
});
test('show-answer buttons work for words, pictures and audio without hovering',async()=>{
    for(const type of ['text','image','audio']){
        const a=app();a.seed(type);a.run("items.forEach(item=>{item.prompt='A clue';item.text='Answer <with> quotes';});startGameMode();drawNextItem();");
        assert.equal(a.elements.get('answer-controls').classList.contains('hidden'),false);assert.equal(a.elements.get('current-answer').classList.contains('hidden'),true);
        a.run('toggleCurrentAnswer()');assert.equal(a.elements.get('current-answer').textContent,'Answer <with> quotes');assert.equal(a.elements.get('btn-reveal-answer').getAttribute('aria-expanded'),'true');assert.match(a.elements.get('history-tray').children[0].innerHTML,/Answer &lt;with&gt; quotes/);
        a.run('toggleCurrentAnswer()');assert.equal(a.elements.get('current-answer').classList.contains('hidden'),true);a.run('toggleHistoryAnswer(drawnItems[0].id)');assert.equal(a.elements.get('btn-reveal-answer').getAttribute('aria-expanded'),'true');
        a.run('drawNextItem()');assert.equal(a.elements.get('current-answer').classList.contains('hidden'),true);
    }
});
test('editing a running game resets the round; navigation alone does not',async()=>{
    const a=app();a.seed();a.run("startGameMode();drawNextItem();goToStep('create');updateItemData(items[0].id,'text','Changed');goToStep('play');");assert.equal(a.run('gameActive'),false);assert.equal(a.run('drawnItems.length'),0);assert.equal(a.elements.get('game-mode').style.display,'none');
});
test('ink-saver preview is applied to the same cells and completed rounds disable drawing',async()=>{
    const a=app();a.seed();a.run("goToStep('print');setPrintColor('bw')");assert.ok(a.elements.get('preview-grid-container').children[0].children.every(cell=>cell.style.filter==='grayscale(100%)'));
    a.run('startGameMode();for(let i=0;i<30;i++)drawNextItem()');assert.equal(a.elements.get('btn-draw').disabled,true);assert.equal(a.elements.get('round-finished').classList.contains('hidden'),false);a.run('endGameMode();startGameMode()');assert.equal(a.elements.get('btn-draw').disabled,false);
});

test('math generator computes all operations correctly and groups equivalent facts',()=>{
    const a=app();
    for(const operation of ['add','subtract','multiply','divide','mixed']){
        a.ctx.op=operation;const list=a.json('buildMathItems(op,0,12)');assert.equal(new Set(list.map(i=>i.text)).size,list.length);
        for(const item of list)for(const clue of item.clues){
            const m=clue.match(/^(\d+) ([+−×÷]) (\d+) = \?$/);assert.ok(m,clue);const x=+m[1],y=+m[3];
            const answer=m[2]==='+'?x+y:m[2]==='−'?x-y:m[2]==='×'?x*y:x/y;
            assert.equal(answer,+item.text);assert.ok(Number.isInteger(answer)&&answer>=0);if(m[2]==='÷')assert.notEqual(y,0);
        }
    }
    const list=a.json("buildMathItems('mixed',1,12)");const i=list.find(i=>i.text==='24');
    for(const clue of ['6 × 4 = ?','3 × 8 = ?'])assert.ok(i.clues.includes(clue));
    assert.throws(()=>a.run("buildMathItems('divide',0,21)"));
    a.value('math-operation','divide');a.run('generateMathGame()');assert.equal(a.run('gridSize'),3);assert.equal(a.run('items.length'),12);assert.match(a.elements.get('math-result').textContent,/12 unique answers/);
});
test('3x3 and 4x4 cards preserve layout and settings through saving and reopening',async()=>{
    for(const size of [3,4,5])for(const free of ['none','random',...(size===4?[]:['center'])]){
        const a=app();a.seed();a.value('grid-size',size);a.run('changeGridSize()');a.run(`setFreeSpace('${free}')`);a.value('card-count',4);a.run("goToStep('print')");
        const cards=a.json('generatedCards');assert.equal(cards.length,4);
        for(const card of cards){assert.equal(card.length,size*size);assert.equal(new Set(card).size,size*size);assert.equal(card.includes('FREE'),free!=='none');if(free==='center')assert.equal(card[Math.floor(size*size/2)],'FREE');}
        a.value('win-pattern','x');const saved=await a.save();const b=app();await b.load(saved);assert.equal(b.run('gridSize'),size);assert.deepEqual(b.json('generatedCards'),cards);assert.equal(b.elements.get('win-pattern').value,'x');
        const invalid={...saved,gridSize:7};const before=b.json('collectProject()');await b.load(invalid);assert.deepEqual(b.json('collectProject()'),before);
    }
});
test('line, corners, X and blackout require the correct called squares on every size',()=>{
    for(const size of [3,4,5])for(const pattern of ['line','corners','x','blackout']){
        const a=app();a.seed();a.value('grid-size',size);a.run('changeGridSize();setFreeSpace("none")');a.value('card-count',1);a.run("goToStep('print');startGameMode()");a.value('win-pattern',pattern);a.value('verify-card-num',1);
        const expected=pattern==='corners'?[0,size-1,size*(size-1),size*size-1]:pattern==='x'?[...new Set(Array.from({length:size},(_,i)=>[i*size+i,i*size+size-1-i]).flat())]:pattern==='blackout'?Array.from({length:size*size},(_,i)=>i):Array.from({length:size},(_,i)=>i);
        a.ctx.positions=expected;a.run('drawnItems=positions.map(p=>items.find(i=>i.id===generatedCards[0][p]));checkBingo()');assert.match(a.elements.get('verify-result-msg').innerText,/We have a winner/);
        a.run('drawnItems.pop();checkBingo()');assert.match(a.elements.get('verify-result-msg').innerText,/No BINGO/);
    }
});
test('save falls back after unavailable picker or failed writable; cancel never downloads',async()=>{
    for(const failure of ['NotAllowedError','SecurityError','NotSupportedError','write']){
        const a=app();a.seed();a.run('markDirty()');let downloads=0;a.ctx.URL.createObjectURL=()=>{downloads++;return 'blob:test';};
        a.ctx.showSaveFilePicker=async()=>{if(failure==='write')return {createWritable:async()=>{throw new Error('disk');}};throw Object.assign(new Error('picker'),{name:failure});};
        await a.run('saveProject()');assert.equal(downloads,1);assert.equal(a.run('dirty'),false);
    }
    const a=app();a.seed();let downloads=0;a.ctx.URL.createObjectURL=()=>{downloads++;return 'blob:test';};a.ctx.showSaveFilePicker=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});};
    a.run('markDirty()');await a.run('saveProject()');assert.equal(downloads,0);assert.equal(a.run('dirty'),true);await a.run('saveProject(true)');assert.equal(downloads,1);
});
test('narrator reads only a clue, respects settings, cancels and does not reveal picture answers',()=>{
    const a=app();a.seed();const spoken=[];let cancellations=0;
    a.ctx.SpeechSynthesisUtterance=function(text){this.text=text;};a.ctx.speechSynthesis={cancel(){cancellations++;},getVoices:()=>[{voiceURI:'test',name:'Test',lang:'en-US'}],speak(u){spoken.push(u);}};
    a.value('narrator-voice','test');a.value('narrator-volume','0.5');a.value('narrator-rate','0.8');a.elements.get('narrator-enabled').checked=true;
    a.run("items[0].text='42';items[0].prompt='6 × 7 = ?';gamePool=[items[0]];gameActive=true;drawNextItem()");
    assert.equal(spoken[0].text,'6 times 7');assert.equal(spoken[0].volume,0.5);assert.equal(spoken[0].rate,0.8);assert.equal(a.elements.get('current-answer').classList.contains('hidden'),true);
    a.run('stopNarration()');assert.ok(cancellations>0);
    a.run("speakClue({type:'image',text:'Secret answer',prompt:'',data:'data:image/png;base64,AAAA'})");assert.equal(spoken.length,1);
    assert.equal(a.run("spokenText('48 ÷ 6 = ?')"),'48 divided by 6');
});
test('personal recordings and equivalent clues survive save/load; manual edits clear stale audio',async()=>{
    const a=app();a.run("items=buildMathItems('multiply',1,12);items[0].narration='data:audio/wav;base64,AAAA';");
    const saved=await a.save();const b=app();await b.load(saved);assert.deepEqual(b.json('items'),saved.items);
    assert.equal(b.run('roundItem(items[0]).prompt'),saved.items[0].prompt);
    b.run("updateItemData(items[0].id,'prompt','New clue')");assert.equal(b.run('items[0].narration'),undefined);assert.equal(b.run('items[0].clues'),undefined);
    const before=b.json('collectProject()');await b.load({...saved,items:[{...saved.items[0],narration:'https://bad.invalid'}]});assert.deepEqual(b.json('collectProject()'),before);
});
test('timer is teacher paced and cancels on navigation; presentation exits cleanly',()=>{
    const a=app();a.seed();let tick; a.ctx.setInterval=fn=>{tick=fn;return 1;};a.ctx.clearInterval=()=>{};a.value('thinking-seconds',5);
    a.run('startGameMode();drawNextItem()');assert.equal(a.run('thinkingRemaining'),5);a.run('pauseThinking()');tick();assert.equal(a.run('thinkingRemaining'),5);a.run('pauseThinking()');tick();assert.equal(a.run('thinkingRemaining'),4);
    for(let i=0;i<4;i++)tick();assert.equal(a.run('drawnItems.length'),1);assert.equal(a.run('revealedAnswers.size'),0);assert.equal(a.elements.get('thinking-status').textContent,'Ready to discuss?');
    a.run('togglePresentation()');assert.equal(a.elements.get('app-shell').classList.contains('classroom-view'),true);a.run("goToStep('create')");assert.equal(a.elements.get('app-shell').classList.contains('classroom-view'),false);assert.equal(a.run('thinkingTimer'),null);
});
test('draft writes preserve layouts and classroom preferences and recover only valid projects',async()=>{
    const a=app();a.seed();a.value('card-count',2);a.run("goToStep('print')");let stored;
    const db={transaction(name,mode){const tx={objectStore(){return {put(value,key){stored=JSON.parse(JSON.stringify(value));queueMicrotask(()=>tx.oncomplete?.());},get(){const req={};queueMicrotask(()=>{req.result=stored;req.onsuccess();});return req;}};}};return tx;}};
    a.ctx.testDb=db;a.run('draftDbPromise=Promise.resolve(testDb)');await a.run('saveDraft()');assert.equal(stored.project.generatedCards.length,2);assert.deepEqual(stored.project,a.json('collectProject()'));assert.match(a.elements.get('draft-status').textContent,/Draft saved/);
    const b=app();b.ctx.testDb=db;b.run('draftDbPromise=Promise.resolve(testDb)');await b.run('findDraft()');assert.equal(b.elements.get('recovery-banner').classList.contains('hidden'),false);assert.deepEqual(b.json('pendingDraft.project'),stored.project);
});

(async()=>{let passed=0;for(const {name,run} of tests){try{await run();console.log('PASS '+name);passed++;}catch(error){console.error('FAIL '+name);console.error(error);process.exitCode=1;}}console.log(`${passed}/${tests.length} regression checks passed. Browser visual QA not included.`);})();
