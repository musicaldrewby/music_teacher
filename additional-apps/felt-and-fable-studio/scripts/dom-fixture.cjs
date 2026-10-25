// Minimal DOM/event fixture for source-level interaction tests, not browser QA.
const {execFileSync}=require('child_process');
const {createCanvas}=require('@napi-rs/canvas');
module.exports=function makeDOM(filename){
 const elements=new Map();let document;
 function match(e,s){
  if(!e.tagName)return false;
  const attrs=[...s.matchAll(/\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]/g)];
  for(const a of attrs){if(a[2]===undefined){if(!e.hasAttribute(a[1]))return false}else if(e.getAttribute(a[1])!==a[2])return false}
  s=s.replace(/\[[^\]]+\]/g,'');const tag=s.match(/^[a-z]+/i)?.[0];if(tag&&tag.toUpperCase()!==e.tagName)return false;
  for(const c of s.matchAll(/\.([\w-]+)/g))if(!e.classList.contains(c[1]))return false;
  const id=s.match(/#([\w-]+)/)?.[1];return !id||id===e.id;
 }
 function matches(e,selector){const parts=selector.split(/\s+/);if(!match(e,parts.pop()))return false;let p=e.parentElement;while(parts.length){const part=parts.pop();while(p&&!match(p,part))p=p.parentElement;if(!p)return false;p=p.parentElement}return true}
 function all(e){return e.children.flatMap(c=>[c,...all(c)])}
 function element(tag='div'){
  const e=tag==='canvas'?createCanvas(1600,900):{};
  Object.assign(e,{tagName:tag.toUpperCase(),attributes:{},dataset:{},style:{setProperty(k,v){this[k]=v},getPropertyValue(k){return this[k]||''}},children:[],listeners:[],parentElement:null,clientWidth:1200,clientHeight:700,scrollWidth:1200,scrollHeight:700,scrollLeft:0,scrollTop:0,disabled:false,hidden:false,checked:false,open:false,
   setAttribute(k,v){this.attributes[k]=String(v);if(k==='id'){this.id=String(v);elements.set(this.id,this)}if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=String(v);if(['hidden','disabled','checked','open'].includes(k))this[k]=true;if(k==='value')this.value=v},
   getAttribute(k){if(k==='class')return this.className;if(k==='open')return this.open?'':null;return this.attributes[k]??null},
   hasAttribute(k){return this.getAttribute(k)!==null},removeAttribute(k){delete this.attributes[k];if(['hidden','disabled','checked','open'].includes(k))this[k]=false},
   append(...nodes){for(const n of nodes){n.remove?.();n.parentElement=this;this.children.push(n)}},appendChild(n){this.append(n);return n},replaceChildren(...nodes){for(const c of this.children)c.parentElement=null;this.children=[];this._text='';this.append(...nodes)},remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null},
   querySelectorAll(s){return all(this).filter(e=>s.split(',').some(t=>matches(e,t.trim())))},querySelector(s){return this.querySelectorAll(s)[0]||null},closest(s){let n=this;while(n){if(matches(n,s))return n;n=n.parentElement}return null},contains(n){return n===this||all(this).includes(n)},
   addEventListener(type,fn){this.listeners.push({type,fn})},removeEventListener(){},
   dispatchEvent(event){event.target??=this;event.preventDefault??=()=>{};event.stopPropagation??=()=>{};event.stopImmediatePropagation??=()=>{};for(const l of this.listeners.filter(l=>l.type===event.type))l.fn(event);this['on'+event.type]?.(event);return true},
   click(){if(!this.disabled)this.dispatchEvent({type:'click',detail:1})},focus(){document.activeElement=this},select(){this.selectionStart=0;this.selectionEnd=String(this.value).length},blur(){this.dispatchEvent({type:'blur'})},scrollIntoView(){},getBoundingClientRect(){return {left:0,top:0,width:1200,height:675}},setPointerCapture(){},releasePointerCapture(){},hasPointerCapture(){return false},showModal(){this.open=true},close(){this.open=false;this.dispatchEvent({type:'close'})}
  });
  Object.defineProperties(e,{
   className:{get(){return this.attributes.class||''},set(v){this.attributes.class=v}},
   options:{get(){return all(this).filter(n=>n.tagName==='OPTION')}},
   value:{get(){return this._value??(this.tagName==='SELECT'?(this.options.find(o=>o.hasAttribute('selected'))||this.options[0])?.value||'':this.attributes.value||'')},set(v){this._value=String(v)}},
   textContent:{get(){return (this._text||'')+this.children.map(c=>c.textContent||'').join('')},set(v){this._text=String(v);for(const c of this.children)c.parentElement=null;this.children=[]}},
   isConnected:{get(){let n=this;while(n?.parentElement)n=n.parentElement;return n===document?.documentElement}}
  });
  e.classList={contains(c){return e.className.split(/\s+/).includes(c)},add(...cs){e.className=[...new Set([...e.className.split(/\s+/).filter(Boolean),...cs])].join(' ')},remove(...cs){e.className=e.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ')},toggle(c,force){const on=force??!this.contains(c);on?this.add(c):this.remove(c);return on}};
  return e;
 }
 const raw=JSON.parse(execFileSync('python',['-c',"from lxml import html; import json,sys; r=html.parse(sys.argv[1]).getroot();\ndef f(e): return {'tag':e.tag,'attrs':dict(e.attrib),'text':e.text or '', 'children':[f(c) for c in e if isinstance(c.tag,str)]}\nprint(json.dumps(f(r)))",filename],{maxBuffer:4e6}));
 function build(n){const e=element(n.tag);for(const [k,v] of Object.entries(n.attrs))e.setAttribute(k,v);e._text=n.text;for(const c of n.children)e.append(build(c));return e}
 const root=build(raw);document={documentElement:root,body:root.querySelector('body'),head:root.querySelector('head'),activeElement:null,visibilityState:'visible',getElementById(id){if(!elements.has(id))throw Error('Missing element '+id);return elements.get(id)},createElement:element,querySelectorAll:s=>root.querySelectorAll(s),querySelector:s=>root.querySelector(s),listeners:[],addEventListener(type,fn){this.listeners.push({type,fn})}};document.activeElement=document.body;
 return {document,elements};
};
