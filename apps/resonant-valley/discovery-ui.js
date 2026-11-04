import {firstCaseHint} from './discovery-sites.js';
import {soundArt} from './item-art.js';
import {SOUNDS,sound,soundId} from './catalog.js';
import {hasSound,capacity,trackPrice,expansionCost,RARITY_COLORS} from './collection.js';
import {ITEMS} from './data.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class DiscoveryUI {
 constructor(callbacks){this.c=callbacks;this.filter='owned';this.kind='all';this.page=0;
  $('collection-search').oninput=()=>{this.page=0;this.renderList();};
  $('collection-filter').onchange=e=>{this.filter=e.target.value;this.page=0;this.renderList();};
  $('collection-kind').onchange=e=>{this.kind=e.target.value;this.page=0;this.renderList();};
  $('collection-prev').onclick=()=>{this.page=Math.max(0,this.page-1);this.renderList();};
  $('collection-next').onclick=()=>{this.page++;this.renderList();};
  $('buy-expansion').onclick=()=>this.expand(false);$('craft-expansion').onclick=()=>this.expand(true);
  $('sell-stone').onclick=()=>this.sell(3,8,12);$('sell-logs').onclick=()=>this.sell(4,4,12);
 }
 render(){const {profile:p,mode,world}=this.c.state(),free=mode==='creative';
  $('collection-summary').textContent=`${p.owned.length} ${p.owned.length===1?'discovery':'discoveries'} · ${capacity(p)} track${capacity(p)===1?'':'s'} · ${p.credits} credits`;
  $('collection-route').textContent=!p.starter?firstCaseHint(world.generator):'Look for unopened cases and dig out violet inlays with a stone pickaxe. Woodlands favor reeds and flutes, and highlands favor mallets and strings.';
  $('collection-tools').innerHTML=[['mixer','Mixer · volume & pan'],['reverb','Reverb'],['delay','Echo']].map(([key,name])=>`<span class="upgrade-tag ${p[key]?'ready':''}">${name} · ${p[key]?'ready':'undiscovered'}</span>`).join('');
  const cost=expansionCost(p.capacity);$('expansion-detail').textContent=p.capacity>=16?'Your studio has all 16 tracks.':`Next: track ${p.capacity+1} · ${trackPrice(p.capacity)} credits`;
  $('expansion-recipe').textContent=Object.entries(cost).map(([id,n])=>`${n} ${ITEMS[id].name.toLowerCase()}`).join(' + ');
  $('buy-expansion').disabled=free||p.capacity>=16||p.credits<trackPrice(p.capacity);
  $('craft-expansion').disabled=free||p.capacity>=16||!Object.entries(cost).every(([id,n])=>(this.c.state().inventory[id]||0)>=n);
  $('sell-stone').disabled=free||(this.c.state().inventory[3]||0)<8;$('sell-logs').disabled=free||(this.c.state().inventory[4]||0)<4;
  const shelf=$('recent-finds');shelf.replaceChildren();$('recent-shelf').classList.toggle('hidden',!p.recent.length);for(const id of p.recent.slice(0,6)){const piece=sound(id);if(!piece)continue;const b=document.createElement('button');b.innerHTML=soundArt(piece)+esc(piece.name);b.setAttribute('aria-label','Listen to recent find '+piece.name);b.onclick=()=>this.c.listen(piece).catch(e=>this.c.toast(e.message));shelf.append(b);}
  this.renderList();
 }
 renderList(){const {profile}=this.c.state(),query=$('collection-search').value.trim().toLowerCase();
  const pool=SOUNDS.filter(s=>(this.kind==='all'||s.kind===this.kind)&&(this.filter!=='owned'||hasSound(profile,s.id))&&`${s.name} ${s.family}`.toLowerCase().includes(query));
  const pages=Math.max(1,Math.ceil(pool.length/36));this.page=Math.max(0,Math.min(this.page,pages-1));
  $('collection-page').textContent=`${pool.length} sounds · ${this.page+1} / ${pages}`;$('collection-prev').disabled=!this.page;$('collection-next').disabled=this.page>=pages-1;
  const grid=$('sound-collection');grid.innerHTML=pool.slice(this.page*36,this.page*36+36).map(s=>{const owned=hasSound(profile,s.id);return `<article class="sound-card ${owned?'':'locked'}" style="--rarity:${RARITY_COLORS[s.rarity]}"><small>${s.family} · ${s.rarity}</small><div class="sound-heading">${soundArt(s)}<strong>${esc(s.name)}</strong></div><div>${owned?`<button data-listen="${s.id}" aria-label="Listen to ${esc(s.name)}">Listen</button><button data-use="${s.id}">Use</button>`:'<span>Undiscovered</span>'}</div></article>`;}).join('')||(this.filter==='owned'&&!profile.owned.length?'<p>Your first find will appear here.</p>':'<p>No sounds match this search.</p>');
  grid.querySelectorAll('[data-listen]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await this.c.listen(sound(b.dataset.listen));}catch(e){this.c.toast(e.message);}finally{b.disabled=false;}});
  grid.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>this.c.use(sound(b.dataset.use)));
 }
 expand(craft){const {profile:p,mode,inventory}=this.c.state();if(mode==='creative'||p.capacity>=16)return;
  const cost=expansionCost(p.capacity),price=trackPrice(p.capacity);
  if(craft){if(!Object.entries(cost).every(([id,n])=>(inventory[id]||0)>=n))return;for(const [id,n] of Object.entries(cost))inventory[id]-=n;}
  else {if(p.credits<price)return;p.credits-=price;}
  p.capacity++;this.c.changed();this.render();this.c.expanded(craft,p.capacity);
 }
 sell(id,count,credits){const {profile,mode,inventory}=this.c.state();if(mode==='creative'||(inventory[id]||0)<count)return;inventory[id]-=count;profile.credits+=credits;this.c.changed();this.render();}
}
