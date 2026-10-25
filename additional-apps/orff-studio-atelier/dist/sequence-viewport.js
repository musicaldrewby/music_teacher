// Each part keeps its own view. First visits reveal its first notes (or low register).
const positions=new Map();
export function rememberSequenceViewport(scroller){
 if(scroller?.dataset.viewportKey)positions.set(scroller.dataset.viewportKey,{left:scroller.scrollLeft,top:scroller.scrollTop});
}
export function restoreSequenceViewport(scroller,{track,section,notes,grid}){
 const key=section+':'+track.id,saved=positions.get(key);scroller.dataset.viewportKey=key;
 if(saved){scroller.scrollLeft=saved.left;scroller.scrollTop=saved.top;}
 else if(scroller.clientHeight){
  const first=track.events.slice().sort((a,b)=>a.beat-b.beat||a.note-b.note)[0],index=first?notes.findIndex(n=>n.note===first.note&&(n.shift||0)===(first.shift||0)):0;
  const row=scroller.querySelector('.piano-roll [data-cell]')?.getBoundingClientRect().height||29;
  const col=scroller.querySelector('.piano-roll [data-cell]')?.getBoundingClientRect().width||27;
  scroller.scrollTop=Math.max(0,(notes.length-1-Math.max(0,index))*row+row-scroller.clientHeight/2+row/2);
  scroller.scrollLeft=Math.max(0,((first?.beat||0)/grid-2)*col);
 }
 scroller.onscroll=()=>rememberSequenceViewport(scroller);
}
