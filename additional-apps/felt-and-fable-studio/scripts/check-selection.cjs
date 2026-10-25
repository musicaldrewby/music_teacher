const assert=require('assert');
module.exports=async({run,el,click,document,context})=>{
 const before=run('snapshot()'),area=document.querySelector('.workspace'),bar=el('selectionToolbar');
 const areaRect=area.getBoundingClientRect,boardRect=el('board').getBoundingClientRect,toolbarRect=bar.getBoundingClientRect;
 area.getBoundingClientRect=()=>({left:230,top:160,width:1000,height:500});
 el('board').getBoundingClientRect=()=>({left:300,top:175,width:860,height:484});
 bar.getBoundingClientRect=()=>({left:0,top:0,width:el('selectionGroup').hidden?310:365,height:el('selectionMoreMenu').hidden?67:183});
 run(`scene().items=[newShape('Circle'),newShape('Square'),newShape('Star')];items().forEach((o,i)=>{o.x=360+i*300;o.y=400;o.w=o.h=100});selected=[items()[0].id];refresh()`);
 assert(!bar.hidden);assert.equal(el('selectionLabel').textContent,'Circle');assert(el('selectionGroup').hidden);assert(!el('selectionDelete').disabled);
 const unchanged=run('snapshot()');context.FeltSelection.update();assert.equal(run('snapshot()'),unchanged);
 click('selectionDuplicate');assert.equal(run('items().length'),4);assert.equal(run('chosen().length'),1);assert.equal(run('chosen()[0].x'),390);
 click('undo');await new Promise(setImmediate);assert.equal(run('items().length'),3);
 // Mixed selection only acts on unlocked pieces, and names the affected count.
 run('items()[1].locked=true;selected=items().map(o=>o.id);refreshSelection()');
 assert.equal(el('selectionDeleteLabel').textContent,'Delete 2');assert.equal(el('selectionDuplicateLabel').textContent,'Duplicate 2');assert(el('selectionGroup').disabled);assert(/1 locked/.test(el('selectionLabel').textContent));
 click('selectionDelete');assert.equal(run('items().length'),1);assert(run('items()[0].locked'));assert(bar.hidden);
 click('undo');await new Promise(setImmediate);assert.equal(run('items().length'),3);assert(run('items()[1].locked'));
 run('selected=[items()[1].id];refreshSelection()');assert(el('selectionDelete').disabled);assert(el('selectionDuplicate').disabled);
 click('selectionMore');assert(!el('selectionMoreMenu').hidden);assert.equal(el('selectionLock').textContent,'Unlock selected');click('selectionLock');assert(!run('items()[1].locked'));assert(!el('selectionDelete').disabled);
 // Group and ungroup preserve original geometry and remain one undo step each.
 run('selected=[items()[0].id,items()[1].id];refreshSelection()');assert.equal(el('selectionGroupLabel').textContent,'Group');assert(!el('selectionGroup').disabled);click('selectionGroup');
 assert.equal(run('items().length'),2);assert.equal(run('chosen()[0].children.length'),2);assert.equal(el('selectionGroupLabel').textContent,'Ungroup');click('selectionGroup');assert.equal(run('items().length'),3);assert.equal(run('items()[0].x'),360);assert.equal(run('items()[1].x'),660);
 run('selected=[items()[0].id,items()[1].id];refreshSelection()');click('selectionGroup');
 run(`chosen()[0].animationBlocks=[{id:'toolbar-path',preset:'path-custom',start:0,duration:2,strength:1,distance:250,direction:0,repeats:1,ease:'linear',loop:'none',path:[125,-125,250,0]}];refreshSelection()`);assert(el('selectionGroup').disabled,'Animated groups must not be ungrouped accidentally');
 run('delete items().find(o=>o.children).animationBlocks;refreshSelection()');click('selectionGroup');
 // More actions reuse the same protected layer and alignment operations.
 run('selected=[items()[0].id];globalThis.toolbarPiece=selected[0];refreshSelection()');click('selectionMore');click('selectionFront');assert.equal(run('items().at(-1).id'),run('toolbarPiece'));click('selectionMore');click('selectionBack');assert.equal(run('items()[0].id'),run('toolbarPiece'));
 run('selected=[items()[0].id,items()[2].id];refreshSelection()');click('selectionMore');click('selectionAlignX');assert.equal(run('items()[0].x'),run('items()[2].x'));
 click('selectionMore');bar.dispatchEvent({type:'keydown',key:'Escape'});assert(el('selectionMoreMenu').hidden);assert.equal(document.activeElement,el('selectionMore'));
 // Every candidate stays inside the workspace at edges, offstage, and small sizes.
 for(const size of [{width:365,height:67},{width:284,height:183}])for(const area of [{width:1000,height:500},{width:300,height:260}])for(const box of [
  {left:450,right:550,top:200,bottom:300},{left:-900,right:-750,top:50,bottom:150},
  {left:900,right:1800,top:450,bottom:900},{left:0,right:1000,top:-50,bottom:550}
 ]){
  const fit={width:Math.min(size.width,area.width-16),height:Math.min(size.height,area.height-16)},p=context.FeltSelection.place(box,fit,area);
  assert(p.x>=8&&p.y>=8);assert(p.x+fit.width<=area.width-8);assert(p.y+fit.height<=area.height-8);
 }
 const normal=context.FeltSelection.place({left:450,right:550,top:200,bottom:300},{width:310,height:67},{width:1000,height:500});assert(normal.y+67<200,'Toolbar covers resize or rotation handles');
 run('selected=[items()[0].id];items()[0].x=-1600;setOffstage(true);findSelectedOffstage();refreshSelection()');assert(!bar.hidden);assert(Number.parseFloat(bar.style.left)>=8);assert(Number.parseFloat(bar.style.top)>=8);
 for(const flag of ['drag','cameraGesture','offstageGesture']){run(`${flag}={};FeltSelection.update()`);assert(bar.hidden);run(`${flag}=null;FeltSelection.update()`);assert(!bar.hidden)}
 run('blockPathEditing=true;FeltSelection.update()');assert(bar.hidden);run('blockPathEditing=false;FeltSelection.update()');assert(!bar.hidden);
 click('workspaceSound');assert(bar.hidden);click('workspaceAnimate');assert(!bar.hidden);run('animRun={};FeltSelection.update()');assert(bar.hidden);run('animRun=null');
 // Restore the test story and workspace for the rest of the regression suite.
 run(`setOffstage(false);state=JSON.parse(${JSON.stringify(before)});selected=[];history=[];future=[];dirty=false;FeltRecovery.newDocument();resetAnimationTime();setStudioWorkspace('build');refresh()`);
 area.getBoundingClientRect=areaRect;el('board').getBoundingClientRect=boardRect;bar.getBoundingClientRect=toolbarRect;assert(bar.hidden);
 console.log('PASS: contextual selection actions, locked/mixed selections, group/ungroup, animation protection, layer order, alignment, Undo, menu keyboard handling, edge/offstage positioning and gesture/playback visibility.');
};
