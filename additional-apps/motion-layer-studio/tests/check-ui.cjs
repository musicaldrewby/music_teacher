const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../public/studio.html'),'utf8');
const source=html.split('<script>')[1].split('</script>')[0];
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.style={};this._text='';this.className='';this.hidden=false;this.scrollTop=0;this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...cs])].join(' ')},toggle:(c,on)=>{on??=!this.classList.contains(c);this.className=this.className.split(/\s+/).filter(v=>v&&v!==c).concat(on?[c]:[]).join(' ');return on}};}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('')}set textContent(v){this._text=String(v);this.children=[]}
 get firstChild(){return this.children[0]||null}get nextSibling(){const a=this.parentElement?.children||[];return a[a.indexOf(this)+1]||null}
 get parentNode(){return this.parentElement}
 append(...ns){for(let n of ns){if(typeof n==='string'){let e=new Element('#text');e.textContent=n;n=e;}n.remove();n.parentElement=this;this.children.push(n)}}
 prepend(...ns){for(const n of ns.reverse()){n.remove();n.parentElement=this;this.children.unshift(n)}}
 remove(){if(this.parentElement){let a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null}}
 replaceChildren(...ns){for(const n of [...this.children])n.remove();this._text='';this.append(...ns)}
 insertBefore(n,b){if(!b)return this.append(n);n.remove();const i=this.children.indexOf(b);assert(i>=0);this.children.splice(i,0,n);n.parentElement=this}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=v;if(k==='class')this.className=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,a)=>a.toUpperCase())]=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 matches(q){let attr=q.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);if(attr){const k=attr[1],v=k.startsWith('data-')?this.dataset[k.slice(5).replace(/-([a-z])/g,(_,a)=>a.toUpperCase())]:this.getAttribute(k);if(v===undefined||v===null||(attr[2]!==undefined&&v!==attr[2]))return false;q=q.replace(attr[0],'')}const parts=q.split('.');return (!parts[0]||parts[0].toUpperCase()===this.tagName)&&parts.slice(1).every(c=>this.classList.contains(c));}
 querySelectorAll(q){const out=[];for(const n of this.children){if(n.matches(q))out.push(n);out.push(...n.querySelectorAll(q))}return out}querySelector(q){return this.querySelectorAll(q)[0]||null}
 closest(q){return this.matches(q)?this:this.parentElement?.closest(q)||null}focus(){this.focused=true}addEventListener(){} getBoundingClientRect(){return{width:600,height:300}}close(){}
}
const nodes=new Map();function el(tag,attrs={},text){const e=new Element(tag);Object.assign(e,attrs);if(attrs.id)nodes.set(attrs.id,e);if(text!==undefined)e.textContent=text;return e}
Object.defineProperty(Element.prototype,'id',{get(){return this._id},set(v){this._id=v;nodes.set(v,this)}});
for(const id of ['inspector','inspectorQuickActions','soloSelected','collapseSettings','inspectorState','selectedName','motionPane','flowControls','effectGrid','effectCategories','effectSearchCount','showAllEffects','showFavoriteEffects','effectsDialog','rightSidebar'])nodes.set(id,el('div',{id}));nodes.get('motionPane').append(nodes.get('inspector'));
const state={effectFavorites:[],imageWidth:1920,imageHeight:1080};let active;
const sandbox={console,assert,Element,Map,Set,Array,Object,Math,Number,String,state,selected:'one',soloId:null,current:()=>active,$:id=>nodes.get(id)||null,element:el,editButton:(title,fn)=>{let e=el('button',{},title);e.onclick=fn;return e},inspector:()=>{},renderLayers:()=>{},inspectorSections:new Map(),SETUP_CUES:{},ESSENTIAL_KEYS:{},EFFECT_WORDS:{},checkpoint(){},mark(){},setTool(){},drawOverlay(){},freezePreview(){},getComputedStyle:()=>({display:'block'}),tool:'preview',document:{createElement:tag=>el(tag)},finishingRange:(host,obj,title,key,min,max,step,def)=>{const l=el('label',{className:'control'},title),i=el('input',{type:'range',value:obj[key],disabled:!!obj.locked});i.dataset.controlKey=key;i.setAttribute('aria-label',title);l.append(i);host.append(l);return i},checkControl:(host,label,value,fn)=>{const e=el('label',{className:'control'},label);e.append(el('input',{type:'checkbox',checked:value,onchange:fn}));host.append(e)},selectControl:(host,label,choices,val,fn)=>{const e=el('label',{className:'control'},label);e.append(el('select',{value:val,onchange:fn}));host.append(e)}};
vm.createContext(sandbox);
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
vm.runInContext(section('const types=','let state='),sandbox);
vm.runInContext(section('const EFFECT_CATEGORIES=','const SETUP_CUES=').replace(/const EFFECT_WORDS=[\s\S]*?;\n/,''),sandbox);
vm.runInContext(section('const NATURE_TYPES=','let natureProgram='),sandbox);
vm.runInContext(section('function frostInspector(','EDIT_TOOLS.push(\'naturePins\')'),sandbox);
vm.runInContext(section('function cleanupInspector(){','function updateCleanupMode(){'),sandbox);
vm.runInContext(section('// Focused presentation improvements;','function setupStudioSplash(){'),sandbox);
vm.runInContext(`for(const t of types)pickerButtons.set(t[0],element('button',{},t[1]));`,sandbox);
vm.runInContext(`renderEffectPicker();assert.equal($('effectGrid').querySelectorAll('div.effect-choice').length,37);assert.equal($('effectCategories').children.length,6);effectCategory='Sky';renderEffectPicker();assert.equal($('effectGrid').querySelectorAll('div.effect-choice').length,6);effectSearch='bat';renderEffectPicker();assert.equal($('effectGrid').querySelectorAll('div.effect-choice').length,1);effectCategory='Lighting';renderEffectPicker();assert.equal($('effectGrid').querySelectorAll('div.effect-choice').length,0);effectCategory='all';effectSearch='';favoritesOnly=true;state.effectFavorites=['flame','frost'];renderEffectPicker();assert.equal($('effectGrid').querySelectorAll('div.effect-choice').length,2);favoritesOnly=false;effectSearch='pool';renderEffectPicker();assert(matchingEffects(types.map(t=>t[0])).includes('caustics'));`,sandbox);
for(const type of ['flame','foliage','caustics','aurora','dappled','leaves','frost','flock']){
 active=vm.runInContext(`({...NATURE_BASE,...NATURE_START['${type}'],id:'one',name:'Layer',naturePins:[],type:'${type}',opacity:1,locked:false,visible:true,x:.5,y:.5})`,sandbox);vm.runInContext('frostDefaults(current())',sandbox);const before=JSON.stringify(active),box=nodes.get('inspector');box.replaceChildren(el('input',{type:'text'}));
 vm.runInContext(`natureInspector(current(),$('inspector'));cleanupInspector();polishInspector();`,sandbox);
 assert.equal(JSON.stringify(active),before,type+' project data mutated');
 const essentials=box.querySelector('.essential-controls');assert(essentials,type);
 for(const key of vm.runInContext(`ESSENTIAL_KEYS['${type}']`,sandbox).filter(k=>type!=='frost'||!['frostFog','frostDroplets'].includes(k))){assert(essentials.querySelectorAll('input').some(i=>i.dataset.controlKey===key),type+' '+key+' not promoted')}
 assert.equal(box.querySelectorAll('.setup-cue').length,1);assert(box.querySelectorAll('details').every(d=>d.children.some(c=>c.tagName!=='SUMMARY')));
 const count=box.querySelectorAll('input').length;vm.runInContext('polishInspector()',sandbox);assert.equal(box.querySelectorAll('input').length,count,'repeated cleanup dropped controls');
 active.locked=true;vm.runInContext('syncInspectorReviewState()',sandbox);assert(nodes.get('inspectorState').textContent.includes('Locked'));
 active.locked=false;active.visible=false;vm.runInContext('syncInspectorReviewState()',sandbox);assert(nodes.get('inspectorState').textContent.includes('Hidden'));
}
console.log('PASS category filters, search, favorites and empty results; all eight nature inspectors retain controls, promote essentials and preserve scene data; repeated cleanup and layer status.');
// Exercise setup and the two new review actions with a DOM model.
for(const id of ['scenePane','sceneEnvironment','sceneFilterPanel','environmentPanel','quality','zoom','saveProject','openProject','tabMotion','tabLinks','helpDialog'])nodes.set(id,el('div',{id}));
const pickerToolbar=el('div',{className:'picker-toolbar'});nodes.get('effectsDialog').append(el('p',{},'old'),pickerToolbar);nodes.get('effectCategories').remove();nodes.get('rightSidebar').append(el('div',{className:'inspector-heading'}));nodes.get('scenePane').append(nodes.get('environmentPanel'),nodes.get('sceneEnvironment'),nodes.get('sceneFilterPanel'));nodes.get('helpDialog').append(el('ol',{className:'help-list'}));
sandbox.fitCanvasUI=()=>{};sandbox.updateToolPresentation=()=>{};
vm.runInContext('setupStudioReviewUI()',sandbox);
assert.equal(nodes.get('environmentPanel').parentElement,nodes.get('sceneEnvironment'));
assert.equal(nodes.get('tabMotion').textContent,'Effect');
assert.equal(nodes.get('effectsDialog').querySelectorAll('.effect-categories').length,1);
active.visible=true;active.locked=false;vm.runInContext('polishInspector()',sandbox);nodes.get('soloSelected').onclick();assert.equal(vm.runInContext('soloId',sandbox),'one');assert.equal(nodes.get('soloSelected').textContent,'Exit solo');nodes.get('soloSelected').onclick();assert.equal(vm.runInContext('soloId',sandbox),null);
for(const d of nodes.get('motionPane').querySelectorAll('details'))d.open=true;nodes.get('collapseSettings').onclick();assert(nodes.get('motionPane').querySelectorAll('details').every(d=>!d.open));
console.log('PASS environment tab containment, inspector labels, solo toggle and collapse action.');
