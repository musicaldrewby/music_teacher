import {DYNAMICS,applyExpression,expressionAt} from './expression.js';
export function mountExpression(root,{track,ids,edit,open=false,onOpen=()=>{}}){
 const doc=root.ownerDocument,panel=doc.createElement('details');panel.className='expression-panel';panel.open=open;
 const count=ids.length,disabled=count?'':'disabled';
 panel.innerHTML=`<summary>Musical expression <span>${count?count+' selected note'+(count===1?'':'s'):'Select notes to add markings'}</span></summary><div class="expression-tools"><label>Dynamic<select id="expression-dynamic" ${disabled}><option value="">Choose…</option>${Object.keys(DYNAMICS).map(d=>`<option>${d}</option>`).join('')}</select></label><div role="group" aria-label="Articulation">${[['accent','Accent >'],['staccato','Staccato ·'],['tenuto','Tenuto —'],['breath','Breath ,']].map(([a,label])=>`<button class="outline" data-articulation="${a}" aria-pressed="${count>0&&track.events.filter(e=>ids.includes(e.id)).every(e=>e.articulations?.includes(a))}" ${disabled}>${label}</button>`).join('')}</div><div role="group" aria-label="Phrase markings"><button class="outline" data-expression="crescendo" ${disabled}>Crescendo &lt;</button><button class="outline" data-expression="diminuendo" ${disabled}>Diminuendo &gt;</button><button class="outline" data-expression="slur" ${disabled}>Slur</button><label>End dynamic<select id="expression-target"><option value="auto" selected>Automatic</option><option value="pp">pp</option><option value="p">p</option><option value="mp">mp</option><option value="mf">mf</option><option value="f">f</option><option value="ff">ff</option></select></label></div><button class="quiet" id="expression-clear" ${disabled}>Clear markings</button></div><p>Dynamics begin at the first selected note. Crescendos, diminuendos and slurs span the first to last selected notes. Select a range with Shift-click in the score. Articulations apply to every selected note. Breath marks and slurs shape recorder phrasing.</p><div class="expression-status" role="status"></div>`;
 root.append(panel);panel.ontoggle=()=>onOpen(panel.open);
 const run=(action,value)=>{try{const draft=structuredClone(track);applyExpression(draft,ids,action,value);edit(()=>{track.events=draft.events;});}catch(e){panel.querySelector('.expression-status').textContent=e.message;}};
 panel.querySelector('#expression-dynamic').onchange=e=>run('dynamic',e.target.value);
 panel.querySelectorAll('[data-articulation]').forEach(b=>b.onclick=()=>run('articulation',b.dataset.articulation));
 panel.querySelectorAll('[data-expression]').forEach(b=>b.onclick=()=>{const type=b.dataset.expression;let target=panel.querySelector('#expression-target').value;if(target==='auto'){const first=track.events.filter(e=>ids.includes(e.id)).sort((a,b)=>a.beat-b.beat)[0],level=expressionAt(track,first?.beat)??.75;const choices=Object.entries(DYNAMICS);target=(type==='crescendo'?choices.find(([,v])=>v>level):choices.reverse().find(([,v])=>v<level))?.[0]||(type==='crescendo'?'ff':'pp');}run(type==='slur'?'slur':'hairpin',{type,target});});
 panel.querySelector('#expression-clear').onclick=()=>run('clear');
}
const NS='http://www.w3.org/2000/svg';
export function drawExpression(svg,track,anchors,{from,to,top,bottom,width,names=false,octave=0,percussion=false}){
 const doc=svg.ownerDocument,g=doc.createElementNS(NS,'g');g.setAttribute('class','musical-expression');g.setAttribute('pointer-events','none');svg.append(g);
 const add=(tag,attrs,text)=>{const el=doc.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;g.append(el);return el;};
 const dynamicY=Math.max(bottom+31,...anchors.filter(a=>a.id).map(a=>a.y+27))+(names?16:0);
 const points=[...anchors].sort((a,b)=>a.beat-b.beat);const xAt=beat=>{const exact=points.find(a=>Math.abs(a.beat-beat)<1e-6);if(exact)return exact.x;const before=points.filter(a=>a.beat<beat).at(-1),after=points.find(a=>a.beat>beat);if(before&&after)return before.x+(after.x-before.x)*(beat-before.beat)/(after.beat-before.beat);return beat<=from?60:width-18;};
 for(const e of track.events){
  const at=points.find(a=>a.id===e.id&&Math.abs(a.beat-e.beat)<1e-6);
  if(at&&e.beat>=from&&e.beat<to){
   const y=Math.min(top,at.y)-12;
   if(e.dynamic)add('text',{x:at.x,y:dynamicY,'font-family':'serif','font-style':'italic','font-weight':'bold','font-size':17},e.dynamic);
   let ay=y;for(const a of e.articulations||[]){if(a==='staccato')add('circle',{cx:at.x+5,cy:ay,r:2,fill:'#111'});if(a==='accent')add('path',{d:`M${at.x-1} ${ay-4}l13 4-13 4`,fill:'none',stroke:'#111','stroke-width':1.7});if(a==='tenuto')add('path',{d:`M${at.x-1} ${ay}h13`,stroke:'#111','stroke-width':1.7});if(a==='breath')add('text',{x:at.x+18,y:top-10,'font-family':'serif','font-size':26},',');ay-=10;}
  }
  for(const key of ['hairpin','slur']){const s=e[key];if(!s||s.endBeat<from||e.beat>=to)continue;const a=xAt(Math.max(from,e.beat))+(e.beat>=from?22:0),b=xAt(Math.min(to,s.endBeat));if(b<=a+4)continue;
   if(key==='hairpin'){const y=dynamicY-5,closed=s.type==='crescendo',l=closed?0:5,r=closed?5:0;add('path',{d:`M${a} ${y-l}L${b} ${y-r}M${a} ${y+l}L${b} ${y+r}`,stroke:'#111',fill:'none','stroke-width':1.2});if(s.endBeat<to)add('text',{x:b+3,y:y+5,'font-family':'serif','font-style':'italic','font-size':15},s.target);}
   else{const phrasePoints=points.filter(a=>a.id&&a.beat>=Math.max(from,e.beat)&&a.beat<=Math.min(to,s.endBeat));const y=Math.min(top-20,...phrasePoints.map(a=>a.y-22));add('path',{d:`M${a} ${y}Q${(a+b)/2} ${y-25} ${b} ${y}`,stroke:'#111',fill:'none','stroke-width':1.4});}
  }
 }
 if(names&&!percussion)for(const a of anchors.filter(a=>a.id&&a.note!==undefined)){const label=(a.notes||[a.note]).map(note=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][(note+octave)%12]).join('–');add('text',{x:a.x,y:Math.max(bottom+14,(a.bottomY??a.y)+19),'text-anchor':a.notes?.length>1?'middle':'start','font-family':'Arial','font-size':10},label);}
}
