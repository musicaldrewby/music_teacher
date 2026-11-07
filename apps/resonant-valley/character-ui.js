import {SKINS,SKIN_TONES,characterSettings,paintCharacterPortrait} from './character-style.js';
export class CharacterUI{
 constructor({get,change}){
  this.get=get;this.change=change;this.back=false;
  const $=id=>document.getElementById(id);this.$=$;
  this.cards=SKINS.map(s=>{
   const button=document.createElement('button');button.type='button';button.className='skin-card';button.setAttribute('aria-label',s.name);button.dataset.skin=s.id;
   const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent=s.name;
   const selected=document.createElement('span');selected.className='skin-selected';selected.textContent='Selected';button.append(canvas,title,selected);
   button.onclick=()=>this.select({skin:s.id});$('character-skins').append(button);return {button,canvas,skin:s.id};
  });
  this.tones=SKIN_TONES.map(t=>{
   const b=document.createElement('button');b.type='button';b.className='skin-tone';b.style.setProperty('--tone',t.color);b.setAttribute('aria-label',t.name+' skin tone');b.title=t.name;b.onclick=()=>this.select({tone:t.id});$('character-tones').append(b);return {button:b,tone:t.id};
  });
  $('character-view').onchange=e=>this.select({view:e.target.value});
  $('character-turn').onclick=()=>{this.back=!this.back;this.render();};
  this.render();
 }
 select(patch){this.change(characterSettings({...this.get(),...patch}));this.render();}
 render(){
  const state=characterSettings(this.get()),skin=SKINS.find(s=>s.id===state.skin),$=this.$;
  for(const {button,canvas,skin:id} of this.cards){const chosen=id===state.skin;button.setAttribute('aria-pressed',String(chosen));paintCharacterPortrait(canvas,{...state,skin:id});}
  for(const {button,tone} of this.tones)button.setAttribute('aria-pressed',String(tone===state.tone));
  paintCharacterPortrait($('character-preview'),state,{back:this.back});$('character-name').textContent=skin.name;$('character-description').textContent=skin.note;
  $('character-turn').textContent=this.back?'Show front':'Show back';$('character-view').value=state.view;
  $('character-summary').textContent=skin.name+' · '+(state.view==='third'?'Third person':'First person');
  $('view-toggle').innerHTML=(state.view==='third'?'Third person':'First person')+' <kbd>N</kbd>';$('view-toggle').setAttribute('aria-label','Switch to '+(state.view==='third'?'first':'third')+' person');$('view-toggle').setAttribute('aria-pressed',String(state.view==='third'));
 }
}
