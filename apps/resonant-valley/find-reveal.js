import {sound} from './catalog.js';
import {soundArt} from './item-art.js';
import {upgradeArt} from './upgrade-art.js';
import {RARITY_COLORS} from './collection.js';

const rarityRank={common:0,uncommon:1,rare:2,legendary:3};
const upgrades={mixer:'Channel volume and pan',expansion:'An extra studio track',reverb:'Space and reflections',delay:'Repeating echoes',credits:'Collection currency'};
const $=id=>document.getElementById(id);
const node=(tag,style,text)=>{const n=document.createElement(tag);if(style)n.className=style;if(text!==undefined)n.textContent=text;return n;};
function art(reward){
 if(reward.kind==='sound')return soundArt(sound(reward.id));
 return upgradeArt(reward.kind);
}
function picture(markup,className){
 const n=node('span',className);n.setAttribute('aria-hidden','true');n.innerHTML=markup;return n;
}
const caption=r=>r.duplicate?'Already collected · converts to credits':r.kind==='sound'?(sound(r.id).kit?sound(r.id).kit+' kit · '+sound(r.id).family:sound(r.id).family):upgrades[r.kind];
const kindLabel=r=>r.kind==='sound'?(sound(r.id).kind==='drum'?'Drum sound':'Instrument'):['reverb','delay'].includes(r.kind)?'Effect':'Studio feature';
export function newDiscoveries(rewards,firstSound){
 return rewards.filter(r=>!r.duplicate&&r.kind!=='credits').sort((a,b)=>Number(b.id===firstSound&&!!firstSound)-Number(a.id===firstSound&&!!firstSound)||rarityRank[b.rarity]-rarityRank[a.rarity]);
}

export class FindReveal {
 constructor({cue,itemIcon,itemName,audition}){
  this.cue=cue;this.itemIcon=itemIcon;this.itemName=itemName;this.audition=audition;this.pickups=new Map();this.treasureTimer=null;this.end();
 }
 clear(){
  clearTimeout(this.treasureTimer);$('treasure-find').replaceChildren();
  for(const p of this.pickups.values())clearTimeout(p.timer);
  this.pickups.clear();$('gather-finds').replaceChildren();
 }
 end(){this.pages=[];this.index=0;this.origin=null;this.details=null;}
 get featured(){return this.pages[this.index];}
 showCase(site,result,firstSound){
  const source=site.starter?'Brass case':site.buried?'Buried case':'Field case';
  const pages=newDiscoveries(result.rewards,firstSound);
  if(!pages.length){
   const r=result.rewards[0];if(!r)return false;
   this.cue('plucks');
   const host=$('treasure-find'),card=node('div','find-banner'),details=node('div','find-banner-copy');
   card.style.setProperty('--find-rarity',RARITY_COLORS[r.rarity]);
   details.append(node('small','find-kicker',source),node('strong','',r.name),
    node('span','find-detail',[caption(r),result.credits?'+'+result.credits+' credits':''].filter(Boolean).join(' · ')));
   card.append(picture(art(r),'find-medallion'),details);
   clearTimeout(this.treasureTimer);host.replaceChildren(card);this.treasureTimer=setTimeout(()=>host.replaceChildren(),4500);
   return false;
  }
  const converted=result.rewards.filter(r=>r.duplicate).map(r=>r.name);
  this.begin(pages,{source,stamp:'No. '+String(result.profile.claimed.length).padStart(3,'0'),capacity:result.profile.capacity,
   credits:result.credits,converted,firstSound});return true;
 }
 showExpansion(craft,capacity){
  this.begin([{kind:'expansion',name:'Track expansion',rarity:'uncommon'}],{
   source:craft?'Crafted module':'Purchased module',stamp:'Track '+String(capacity).padStart(2,'0'),capacity,
   origin:craft?'craft-expansion':'buy-expansion'});
 }
 begin(pages,details){
  this.end();this.pages=pages;this.details=details;this.origin=details.origin||null;
  clearTimeout(this.treasureTimer);$('treasure-find').replaceChildren();this.showPage();
 }
 next(){
  if(this.index+1>=this.pages.length)return;
  this.index++;this.showPage();$('discovery-title').focus({preventScroll:true});
 }
 showPage(){
  const r=this.featured,d=this.details,kind=kindLabel(r),more=this.index+1<this.pages.length;
  const heading=d.firstSound&&r.id===d.firstSound?'Your first '+kind.toLowerCase():
   kind==='Instrument'||kind==='Drum sound'?kind+' discovered':kind+' unlocked';
  const panel=$('discovery-panel');panel.style.setProperty('--find-rarity',RARITY_COLORS[r.rarity]);
  $('discovery-title').textContent=heading;$('find-number').textContent=d.stamp;$('find-source').textContent=d.source;
  // Replacing the sprite restarts the short arrival animation on bonus pages.
  $('find-emblem').replaceChildren(picture(art(r),'treasure-sprite'));
  $('find-rarity').textContent=r.rarity+(r.bonus?' · Collection bonus':'');$('find-name').textContent=r.name;$('find-family').textContent=caption(r);
  const listen=$('find-listen');listen.replaceChildren();if(r.kind==='sound')listen.append(this.listen(r));
  $('discovery-credits').textContent=[d.credits?'+'+d.credits+' credits':'',d.capacity+(d.capacity===1?' studio track':' studio tracks'),
   d.converted?.length?'Duplicate credit for '+d.converted.join(', '):''].filter(Boolean).join(' · ');
  $('find-page').textContent=this.pages.length>1?'Find '+(this.index+1)+' of '+this.pages.length:'';
  $('find-next').hidden=!more;$('discovery-studio').hidden=more;$('find-return').hidden=more;
  $('discovery-studio').textContent=r.kind==='sound'?'Try in the studio':'Open studio';
  $('find-return').textContent=this.origin?'Back to collection':'Keep exploring';this.cue('gliss');
 }
 listen(reward){
  const b=node('button','find-audition','Hear this sound');b.type='button';b.setAttribute('aria-label','Hear '+reward.name);
  b.onclick=async()=>{b.disabled=true;try{await this.audition(sound(reward.id));}finally{b.disabled=false;}};return b;
 }
 pickup(id,count=1,place=''){
  const key=String(id);let p=this.pickups.get(key);
  if(!p){
   if(this.pickups.size>=3){this.removePickup(this.pickups.keys().next().value);}
   const row=node('div','find-pickup'),copy=node('span','find-pickup-copy'),quantity=node('b','find-quantity');
   const label=node('small','',place||'Gathered');
   copy.append(label,node('strong','',this.itemName(id)));row.append(picture(this.itemIcon(id),'find-medallion'),copy,quantity);
   p={row,quantity,label,count:0,timer:null};this.pickups.set(key,p);$('gather-finds').append(row);this.cue('plucks');
  }
  if(place)p.label.textContent=place;
  p.count+=count;p.quantity.textContent='+'+p.count;clearTimeout(p.timer);
  p.timer=setTimeout(()=>this.removePickup(key),2700);
 }
 removePickup(key){const p=this.pickups.get(key);if(!p)return;clearTimeout(p.timer);p.row.remove();this.pickups.delete(key);}
}
