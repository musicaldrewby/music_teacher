import {SYMBOLS,symbolBounds} from './notation.js';
export const RHYTHM_WIDTH=1200,RHYTHM_HEIGHT=720;
const types=new Set(SYMBOLS.map(s=>s.id));
const copy=v=>JSON.parse(JSON.stringify(v));
export function lanes(rows=2){return rows===1?[440]:rows===3?[185,405,625]:[255,590]}
export function placePoint(type,point,{size=32}={}){
 const b=symbolBounds(type,size),margin=8;
 return {x:Math.max(margin-b.left,Math.min(RHYTHM_WIDTH-margin-b.right,point.x)),y:Math.max(margin-b.top,Math.min(RHYTHM_HEIGHT-margin-b.bottom,point.y))};
}
export class RhythmDocument {
 constructor(initial={}){this.items=Array.isArray(initial.items)?initial.items.filter(i=>types.has(i.type)&&Number.isFinite(i.x)&&Number.isFinite(i.y)).map(i=>({id:String(i.id),type:i.type,x:i.x,y:i.y})):[];this.rows=[1,2,3].includes(initial.rows)?initial.rows:2;this.size=[24,32,40].includes(initial.size)?initial.size:32;this.snap=false;this.guides=initial.placement==='free'&&initial.guides===true;this.undoStack=[];this.redoStack=[];this.counter=0}
 snapshot(){return copy({placement:'free',items:this.items,rows:this.rows,size:this.size,snap:false,guides:this.guides})}
 checkpoint(){this.undoStack.push(this.snapshot());if(this.undoStack.length>100)this.undoStack.shift();this.redoStack=[]}
 restore(v){const {placement,...state}=copy(v);Object.assign(this,state,{snap:false})}
 id(){let id;do{id=`r${Date.now().toString(36)}-${++this.counter}`}while(this.items.some(i=>i.id===id));return id}
 add(type,point){if(!types.has(type))return null;this.checkpoint();const item={id:this.id(),type,...placePoint(type,point,this)};this.items.push(item);return item}
 move(id,point){const index=this.items.findIndex(i=>i.id===id);if(index<0)return;const item=this.items[index],pos=placePoint(item.type,point,this);if(Math.abs(pos.x-item.x)<.01&&Math.abs(pos.y-item.y)<.01&&index===this.items.length-1)return;this.checkpoint();Object.assign(item,pos);this.items.splice(index,1);this.items.push(item)}
 remove(id){if(!this.items.some(i=>i.id===id))return;this.checkpoint();this.items=this.items.filter(i=>i.id!==id)}
 clear(){if(!this.items.length)return;this.checkpoint();this.items=[]}
 undo(){if(!this.undoStack.length)return false;this.redoStack.push(this.snapshot());this.restore(this.undoStack.pop());return true}
 redo(){if(!this.redoStack.length)return false;this.undoStack.push(this.snapshot());this.restore(this.redoStack.pop());return true}
 configure(key,value){if(!(['rows','size','guides'].includes(key))||this[key]===value)return;if(key==='rows'&&![1,2,3].includes(value)||key==='size'&&![24,32,40].includes(value))return;this.checkpoint();this[key]=value;if(key==='size')for(const i of this.items)Object.assign(i,placePoint(i.type,i,this))}
 nextPosition(type,anchor){if(anchor)return placePoint(type,anchor,this);const offset=(this.items.length%9-4)*22,b=symbolBounds(type,this.size);return placePoint(type,{x:RHYTHM_WIDTH/2-(b.left+b.right)/2+offset,y:RHYTHM_HEIGHT/2-(b.top+b.bottom)/2+offset},this)}
}
