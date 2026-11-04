import {recordSharingEnabled} from './record-sharing.js';
import {signData} from './cabin-parts.js';
import {SLEEVE_PALETTE,SLEEVE_SIZE,makeSleeve,sleeveFor,drawSleeve,crateContents} from './record-sleeve.js';

const byId=id=>document.getElementById(id);
const show=(id,visible)=>byId(id).classList.toggle('hidden',!visible);
const bounded=value=>Math.max(0,Math.min(SLEEVE_SIZE-1,value));

export class RecordCrateUI {
  constructor(actions){
    this.actions=actions;this.context={};this.selected=null;
    this.draft=null;this.undo=[];this.ink=9;this.cursor=[0,0];this.stroke=null;
    byId('album-prev').onclick=()=>this.flip(-1);
    byId('album-next').onclick=()=>this.flip(1);
    byId('album-play').onclick=()=>{
      const record=this.selection();if(!record)return;
      if(this.actions.playing()===record.id)this.actions.stop();
      else this.actions.play(record,this.player());
    };
    byId('album-edit').onclick=()=>{const record=this.selection();if(record)this.actions.editMusic(record);};
    byId('album-paint').onclick=()=>this.editSleeve();
    byId('crate-add').onclick=()=>this.file(byId('crate-add-choice').value);
    byId('crate-remove').onclick=()=>this.unfile();
    byId('station-enabled').onchange=()=>{const record=this.selection(),player=this.context.player;if(player&&record)this.actions.stationChanged(player,byId('station-enabled').checked?record.id:null);};
    this.bindPainting();
  }
  records(){return this.actions.records();}
  albums(){
    const crate=this.context.crate;
    if(!crate)return this.records();
    const catalog=new Map(this.records().map(r=>[r.id,r]));
    return crateContents(crate,catalog).map(id=>catalog.get(id));
  }
  selection(){return this.albums().find(r=>r.id===this.selected);}
  player(){return this.context.player??this.actions.findPlayer(this.context.crate);}
  open(context={}){
    this.context=context??{};this.draft=null;this.stroke=null;this.undo=[];
    if(this.context.sign){
      const sign=this.context.sign;this.draft=signData(sign).art.split('');this.cursor=[0,0];byId('sign-caption').value=signData(sign).caption;
      byId('sleeve-edit-title').textContent='Paint your sign';this.refresh();this.repaint();byId('sleeve-pixels').focus({preventScroll:true});return;
    }
    const albums=this.albums(),featured=this.context.selected??this.context.crate?.recordId??this.context.player?.recordId??this.selected;
    this.selected=albums.some(r=>r.id===featured)?featured:albums.at(-1)?.id;
    this.refresh();byId('records-panel').scrollTop=0;
  }
  flip(delta){
    const albums=this.albums(),i=albums.findIndex(r=>r.id===this.selected);
    if(albums.length)this.choose(albums[(i+delta+albums.length)%albums.length].id);
  }
  choose(id){
    this.selected=id;
    if(this.context.crate){this.context.crate.recordId=id;this.actions.crateChanged(this.context.crate);}
    this.refresh();
    byId('record-list').querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  file(id){
    const crate=this.context.crate;
    if(!crate||!this.records().some(r=>r.id===id)||crate.recordIds.includes(id))return;
    crate.recordIds=[...crate.recordIds,id];this.choose(id);
  }
  unfile(){
    const crate=this.context.crate;if(!crate||!this.selected)return;
    const i=crate.recordIds.indexOf(this.selected);
    crate.recordIds=crate.recordIds.filter(id=>id!==this.selected);
    this.choose(crate.recordIds[Math.min(i,crate.recordIds.length-1)]??null);
  }
  refresh(){
    const crate=this.context.crate,albums=this.albums();
    if(!albums.some(r=>r.id===this.selected))this.selected=albums.at(-1)?.id;
    const index=albums.findIndex(r=>r.id===this.selected),record=albums[index];
    const sign=this.context.sign;byId('records-panel').setAttribute('aria-label',sign?'Sign painter':'Records');byId('records-panel').querySelector('[data-close]').setAttribute('aria-label',sign?'Close sign painter':'Close records');show('sign-caption-wrap',!!sign);byId('sleeve-save').textContent=sign?'Save sign':'Save sleeve';
    byId('sleeve-pixels').setAttribute('aria-label',sign?'Sign drawing grid. Use arrow keys to move and Space to paint.':'Sleeve drawing grid. Use arrow keys to move and Space to paint.');
    byId('crate-heading').textContent=sign?'Sign painter':crate?'Record crate':this.context.player?'Record player':'Record shelf';
    show('crate-browse',!this.draft);show('sleeve-editor',!!this.draft);
    if(this.draft)return;
    show('album-edit',!record?.edition);show('album-paint',!record?.edition);
    byId('album-share').hidden=!recordSharingEnabled||!!record?.edition;
    show('station-option',!!this.context.player&&!!record);
    byId('station-enabled').checked=!!record&&this.context.player?.stationRecordId===record.id;
    byId('station-enabled').disabled=!record||!this.actions.canHear(record);
    show('crate-empty',!record);show('crate-album',!!record);show('crate-options',!!record);
    byId('crate-empty-title').textContent=crate?'An empty crate':'Your first record goes here';
    byId('crate-empty-note').textContent=crate&&this.records().length?'Choose a record from your shelf below.':'Save a piece in the music studio to give it a sleeve.';
    const player=this.player(),missingPlayer=!!crate&&!player,needsSound=!!record&&!this.actions.canHear(record);
    byId('crate-player-note').textContent=needsSound?'Discover the instruments on this record to hear it.':missingPlayer?'Place a record player within 8 blocks to play from this crate.':'';
    if(record){
      drawSleeve(byId('featured-sleeve'),sleeveFor(record));
      byId('featured-sleeve').setAttribute('aria-label','Cover of '+record.song.title);
      byId('album-title').textContent=record.song.title;
      const {bpm,tracks,bars}=record.song;
      byId('album-meta').textContent=(record.edition?'Listening copy · '+record.artist+' · ':'')+bpm+' BPM · '+tracks.length+(tracks.length===1?' track':' tracks')+' · '+bars+(bars===1?' bar':' bars');
      const playing=this.actions.playing()===record.id;
      const loading=this.actions.preparing()===record.id;
      byId('album-play').textContent=loading?'Loading sounds…':playing?'Stop record':'Play record';
      byId('album-play').disabled=loading||!playing&&(missingPlayer||needsSound);byId('album-play').setAttribute('aria-busy',String(loading));
      byId('album-counter').textContent=(index+1)+' / '+albums.length;
      byId('album-prev').disabled=byId('album-next').disabled=albums.length<2;
    }
    const list=byId('record-list'),fingerprint=JSON.stringify(albums.map(r=>[r.id,r.sleeve,r.song.title]));
    if(this.fingerprint!==fingerprint){
      this.fingerprint=fingerprint;list.replaceChildren();
      for(const album of albums){
        const btn=document.createElement('button');btn.type='button';btn.className='crate-thumb';btn.dataset.id=album.id;
        btn.setAttribute('aria-label','Select '+album.song.title);btn.title=album.song.title;
        const cover=document.createElement('canvas');cover.setAttribute('aria-hidden','true');drawSleeve(cover,sleeveFor(album));
        btn.append(cover);btn.onclick=()=>this.choose(album.id);list.append(btn);
      }
    }
    for(const btn of list.children)btn.setAttribute('aria-pressed',String(btn.dataset.id===this.selected));
    show('crate-filing',!!crate);
    if(crate){
      const available=this.records().filter(r=>!crate.recordIds.includes(r.id)),select=byId('crate-add-choice');
      select.replaceChildren(...available.map(r=>new Option(r.song.title,r.id)));
      if(!available.length)select.add(new Option('No records to file',''));
      select.disabled=byId('crate-add').disabled=!available.length;show('crate-remove',!!record);
    }
  }
  editSleeve(){
    const record=this.selection();if(!record||record.edition)return;
    this.draft=sleeveFor(record).split('');this.undo=[];this.stroke=null;this.cursor=[0,0];
    byId('sleeve-edit-title').textContent='Design sleeve · '+record.song.title;
    this.refresh();this.repaint();byId('sleeve-pixels').focus({preventScroll:true});
  }
  cancelEditor(){
    if(!this.draft)return false;
    if(this.context.sign){this.draft=null;this.actions.closeSign();return true;}
    this.draft=null;this.stroke=null;this.refresh();byId('album-paint').focus({preventScroll:true});return true;
  }
  snapshot(){this.undo.push(this.draft.join(''));if(this.undo.length>24)this.undo.shift();}
  repaint(){
    drawSleeve(byId('sleeve-pixels'),this.draft.join(''));
    const [x,y]=this.cursor,indicator=byId('sleeve-cursor');
    indicator.style.left=(x*100/SLEEVE_SIZE)+'%';indicator.style.top=(y*100/SLEEVE_SIZE)+'%';
    byId('sleeve-undo').disabled=!this.undo.length;
  }
  paintLine(from,to){
    const dx=to[0]-from[0],dy=to[1]-from[1],steps=Math.max(1,Math.abs(dx),Math.abs(dy));
    for(let i=0;i<=steps;i++){
      const x=Math.round(from[0]+dx*i/steps),y=Math.round(from[1]+dy*i/steps);
      this.draft[y*SLEEVE_SIZE+x]=this.ink.toString(16);
    }
    this.cursor=to;this.repaint();
  }
  bindPainting(){
    const canvas=byId('sleeve-pixels'),palette=byId('sleeve-palette');
    SLEEVE_PALETTE.forEach(([name,color],i)=>{
      const b=document.createElement('button');b.type='button';b.style.setProperty('--ink-color',color);
      b.title=name;b.setAttribute('aria-label',name+' ink');b.setAttribute('aria-pressed',String(this.ink===i));
      b.onclick=()=>{this.ink=i;[...palette.children].forEach((swatch,j)=>swatch.setAttribute('aria-pressed',String(i===j)));};palette.append(b);
    });
    const cell=e=>{const r=canvas.getBoundingClientRect();return [bounded(Math.floor((e.clientX-r.left)*16/r.width)),bounded(Math.floor((e.clientY-r.top)*16/r.height))];};
    canvas.onpointerdown=e=>{
      if(!this.draft||e.button!==0||!e.isPrimary)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
      this.snapshot();const at=cell(e);this.stroke=e.pointerId;this.paintLine(at,at);
    };
    canvas.onpointermove=e=>{if(this.draft&&this.stroke===e.pointerId)this.paintLine(this.cursor,cell(e));};
    canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{this.stroke=null;};
    canvas.onkeydown=e=>{
      if(!this.draft)return;
      if(['Space','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();if(!e.repeat){this.snapshot();this.paintLine(this.cursor,this.cursor);}return;}
      const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.code];if(!move)return;
      e.preventDefault();e.stopPropagation();this.cursor=this.cursor.map((n,i)=>bounded(n+move[i]));this.repaint();
    };
    byId('sleeve-apply').onclick=()=>{if(!this.draft)return;this.snapshot();const index=byId('sleeve-design').selectedIndex;this.draft=index===3?Array(256).fill('a'):makeSleeve(this.selected,index).split('');this.repaint();};
    byId('sleeve-undo').onclick=()=>{if(this.undo.length){this.draft=this.undo.pop().split('');this.repaint();}};
    byId('sleeve-cancel').onclick=()=>this.cancelEditor();
    byId('sleeve-save').onclick=()=>{
      const sign=this.context.sign;
      if(sign&&this.draft){Object.assign(sign,signData({art:this.draft.join(''),caption:byId('sign-caption').value}));this.actions.signChanged(sign);this.draft=null;this.actions.closeSign();return;}
      const record=this.selection();if(!record||!this.draft)return;
      record.sleeve=this.draft.join('');this.actions.coverChanged(record);
      this.draft=null;this.stroke=null;this.refresh();byId('album-paint').focus({preventScroll:true});
    };
  }
}
