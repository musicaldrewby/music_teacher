import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {RhythmDocument,placePoint} from '../dist/rhythm-model.js';
import {RhythmWriter} from '../dist/rhythm.js';
import {SYMBOLS,drawMusicStaff,symbolBounds} from '../dist/notation.js';
import {INSTRUMENTS,asset} from '../dist/data.js';

assert.equal(SYMBOLS.length,11);
const expected=['quarter','eighth-pair','eighth','half','dotted-half','whole','quarter-rest','half-rest','whole-rest','dotted-half-rest','barline'];
assert.deepEqual(SYMBOLS.map(s=>s.id),expected);
const doc=new RhythmDocument();
assert.equal(doc.snap,false);assert.equal(doc.guides,false);
for(const type of expected)assert.ok(doc.add(type,doc.nextPosition(type)));
assert.equal(doc.items.length,11);
assert.equal(new Set(doc.items.map(i=>i.id)).size,11);
const original=doc.snapshot(),selected=doc.items[0].id;
doc.move(selected,{x:605,y:580});assert.deepEqual({x:doc.items.at(-1).x,y:doc.items.at(-1).y},{x:605,y:580});assert.equal(doc.items.at(-1).id,selected,'Moving a magnet brings it to the front');
doc.undo();assert.deepEqual(doc.snapshot(),original);doc.redo();assert.equal(doc.items.find(i=>i.id===selected).x,605);
doc.remove(selected);assert.equal(doc.items.length,10);doc.undo();assert.equal(doc.items.length,11);
doc.clear();assert.equal(doc.items.length,0);doc.undo();assert.equal(doc.items.length,11);
const restored=new RhythmDocument(JSON.parse(JSON.stringify(doc.snapshot())));assert.deepEqual(restored.snapshot(),doc.snapshot());
const positions=structuredClone(restored.items);restored.configure('rows',3);restored.configure('guides',true);assert.deepEqual(restored.items,positions,'Guide settings never rearrange magnets');
assert.equal(new RhythmDocument(restored.snapshot()).guides,true,'A chosen guide preference survives reload');
const legacy=new RhythmDocument({...original,placement:undefined,snap:true,guides:true});assert.deepEqual(legacy.items,original.items);assert.equal(legacy.snap,false);assert.equal(legacy.guides,false,'Older boards migrate to free placement without losing notes');
restored.configure('size',40);for(const type of expected){const b=symbolBounds(type,40),p=placePoint(type,{x:-500,y:-500},restored),q=placePoint(type,{x:5000,y:5000},restored);assert.ok(p.x+b.left>=8-1e-9&&p.y+b.top>=8-1e-9);assert.ok(q.x+b.right<=1192+1e-9&&q.y+b.bottom<=712+1e-9)}
assert.ok(placePoint('whole',{x:100,y:0},restored).y<40,'Short symbols can reach the top edge');
restored.configure('snap',true);assert.equal(restored.snap,false);const moved=restored.items[0];restored.move(moved.id,{x:321.5,y:333.5});assert.equal(moved.x,321.5);assert.equal(moved.y,333.5);

// Exercise the real pointer handlers independently of browser layout.
const storage=new Map();globalThis.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)};
const view=Object.create(RhythmWriter.prototype);Object.assign(view,{doc:new RhythmDocument(),selected:null,drag:null,visible:true,notify:()=>{},point:e=>({x:e.clientX,y:e.clientY}),render:()=>{},renderPaper:()=>{},ghost:{hidden:true,style:{},innerHTML:''},root:{setPointerCapture:()=>{},querySelector:()=>({textContent:''})}});
const event=(x,y,target={closest:()=>null})=>({clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true,target,preventDefault(){}});
const palette={closest:selector=>selector==='[data-clone]'?{dataset:{clone:'quarter'}}:null};
for(let i=0;i<3;i++){view.down(event(-50,50,palette));view.move(event(140+i*120,255));view.up(event(140+i*120,255));}
assert.equal(view.doc.items.length,3);assert.equal(new Set(view.doc.items.map(i=>i.id)).size,3);assert.equal(palette.closest('[data-clone]').dataset.clone,'quarter');
const first=view.doc.items[0],copyTarget={closest:selector=>selector==='[data-r-id]'?{dataset:{rId:first.id}}:null};
view.down(event(first.x+8,first.y-12,copyTarget));view.move(event(700,410));view.up(event(709.25,399.75));assert.equal(first.x,701.25);assert.equal(first.y,411.75);assert.equal(view.doc.items.length,3,'Drop uses the final pointer position and preserves the grab offset');
view.down(event(-50,50,palette));view.move(event(-90,600));view.up(event(-90,600));assert.equal(view.doc.items.length,3,'Dropping outside cancels a new copy');
view.down(event(-50,50,palette));view.up(event(-50,50));assert.equal(view.doc.items.length,4,'Tapping a cloner appends a copy');
view.down(event(-50,50,palette));view.move(event(700,255));view.cancel();assert.equal(view.doc.items.length,4,'Cancelled gestures leave the document unchanged');
view.key({key:'z',ctrlKey:true,target:{tagName:'svg'},preventDefault(){}});assert.equal(view.doc.items.length,3);
view.key({key:'z',ctrlKey:true,shiftKey:true,target:{tagName:'svg'},preventDefault(){}});assert.equal(view.doc.items.length,4);
assert.ok(storage.get('band-board:rhythm:v1'));
const exported=view.paperMarkup(true);assert.ok(!exported.includes('data-r-id'));assert.ok(!exported.includes('stroke-dasharray'));

// A single, continuous stroke per staff: no copied raster line fragments.
globalThis.Path2D=class{constructor(path){this.path=path}};
for(const type of ['treble','bass','double']){const segments=[],strokes=[];let current;
 const c={fillRect(){},beginPath(){current=[]},moveTo(x,y){current.push([x,y])},lineTo(x,y){current.at(-1).push(x,y)},stroke(){segments.push(...current);strokes.push(this.lineWidth)},save(){},translate(){},scale(){},fill(){},restore(){},drawImage(){throw new Error('Raster staff artwork must not return')}};
 drawMusicStaff(c,{width:1200,height:700,type});assert.equal(segments.length,type==='double'?10:5);assert.ok(segments.every(s=>s[0]===30&&s[2]===1170&&s[1]===s[3]));assert.equal(new Set(strokes).size,1);
}
for(const inst of INSTRUMENTS)for(let note=0;note<7;note++)for(const part of ['staff','fingers'])await access(new URL('../dist/'+asset(inst.id,note,part),import.meta.url));
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(html.includes('data-mode="rhythm"'));assert.ok(html.includes('id="rhythm"'));
console.log('Passed: 11 symbols; free placement and stacking; unlimited cloning; precise drag/drop/cancel/tap; legacy board migration; undo/redo/delete/clear; persistence; symbol bounds; clean staff strokes; all 98 chart assets.');
