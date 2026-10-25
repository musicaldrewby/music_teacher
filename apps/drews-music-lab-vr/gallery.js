import {validateSong} from './recorder.js?v=30';
export const GALLERY_PAGE_SIZE=6;
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export class SongGallery {
 constructor(api){
  this.api=api;this.rows=[];this.index=0;this.offset=0;this.tab='all';this.sort='newest';this.total=0;this.more=false;this.busy=false;this.loaded=false;this.message='Choose a song to listen.';this.current=null;this.owner=false;this.manage=false;this.request=0;this.playRequest=0;
  const receipts=read('music-gallery-receipts',{});this.receipts=Object.fromEntries(Object.entries(receipts&&typeof receipts==='object'?receipts:{}).filter(([id,token])=>validId(id)&&/^[a-f0-9]{64}$/.test(token)));
  const recent=read('music-gallery-history',[]);this.history=Array.isArray(recent)?recent.filter(item=>validId(item?.id)&&Number.isFinite(item.playedAt)).slice(0,60):[];
  try{this.device=localStorage.getItem('music-gallery-device')||crypto.randomUUID();localStorage.setItem('music-gallery-device',this.device);}catch{this.device=crypto.randomUUID();}
 }
 async fetch(path='',options={}){const response=await fetch('https://drews-music-lab-vr.musicaldrewby.chatgpt.site/api/gallery'+path,{...options,headers:{'Content-Type':'application/json','X-Gallery-Device':this.device,...options.headers}});let data;try{data=await response.json();}catch{throw Error('The listening room is unavailable. Try again shortly.');}if(!response.ok)throw Error(data.error||'Please try again.');return data;}
 changed(){this.api.changed?.();}
 get page(){return Math.floor(this.offset/GALLERY_PAGE_SIZE)+1;}
 get pages(){return Math.max(1,Math.ceil(this.total/GALLERY_PAGE_SIZE));}
 get pageLabel(){return this.total?`Page ${this.page} of ${this.pages} · ${this.total} song${this.total===1?'':'s'}`:'No songs yet';}
 emptyMessage(){return this.tab==='recent'?'Songs you listen to will appear here on this device.':this.tab==='mine'?'No shared songs from this device yet. Choose Share a Song.':'No shared songs yet. Share one of your saved songs to get started.';}
 async load(tab=this.tab,offset=0){
  const request=++this.request;this.tab=['recent','mine'].includes(tab)?tab:'all';this.offset=Math.max(0,Math.floor(offset/GALLERY_PAGE_SIZE)*GALLERY_PAGE_SIZE);this.rows=[];this.total=0;this.more=false;this.busy=true;this.message='Loading songs…';this.changed();
  try{
   let rows,total,at=this.offset;
   if(this.tab==='all'){const data=await this.fetch('?sort=newest&size=6&offset='+at+(this.manage?'&manage=1':''));rows=data.songs;total=data.total;at=data.offset;}
   else{
    const ids=this.tab==='recent'?this.history.map(item=>item.id):Object.keys(this.receipts),found=new Map();
    for(let i=0;i<ids.length;i+=80){const data=await this.fetch('/lookup',{method:'POST',body:JSON.stringify({ids:ids.slice(i,i+80)})});if(request!==this.request)return;for(const row of data.songs)found.set(row.id,row);}
    let available=ids.map(id=>found.get(id)).filter(Boolean);if(this.tab==='mine')available.sort((a,b)=>b.created-a.created||b.id.localeCompare(a.id));
    total=available.length;at=Math.min(at,Math.max(0,Math.ceil(total/GALLERY_PAGE_SIZE)-1)*GALLERY_PAGE_SIZE);rows=available.slice(at,at+GALLERY_PAGE_SIZE);
   }
   if(request!==this.request)return;this.rows=rows;this.total=total;this.offset=at;this.more=at+GALLERY_PAGE_SIZE<total;this.index=0;this.loaded=true;this.message=rows.length?(this.tab==='all'?'All shared songs · newest first':'Saved on this device')+' · Choose a title to play.':this.emptyMessage();
  }catch(e){if(request===this.request)this.message=e.message;}
  finally{if(request===this.request){this.busy=false;this.changed();}}
 }
 selected(){return this.rows[this.index];}
 pageBy(direction){if(this.busy||direction<0&&this.offset===0||direction>0&&!this.more)return;return this.load(this.tab,this.offset+direction*GALLERY_PAGE_SIZE);}
 async play(row=this.selected()){
  if(!row||this.api.taking()){this.message=row?'Stop recording before listening.':'Choose a song first.';this.changed();return;}
  const request=++this.playRequest;this.loadingId=row.id;this.message='Loading '+row.title+'…';this.changed();
  try{const {song}=await this.fetch('/'+row.id);if(request!==this.playRequest)return;await this.api.play(song,()=>request===this.playRequest&&!this.api.taking());if(request!==this.playRequest)return;if(this.api.taking())throw Error('Stop recording before listening.');
   this.current={...row,title:song.title};if(this.lastShared?.id===row.id)this.sharedNotice=false;this.message='Playing · '+song.title;this.history=[{id:row.id,playedAt:Date.now()},...this.history.filter(item=>item.id!==row.id)].slice(0,60);write('music-gallery-history',this.history);
  }catch(e){if(request===this.playRequest)this.message=e.message;}
  finally{if(request===this.playRequest){this.loadingId=null;this.changed();}}
 }
 playPause(){if(this.api.state?.()==='playing'||this.api.state?.()==='paused')this.pause();else return this.play(this.current||this.selected());}
 pause(){if(!this.current||this.api.state?.()==='stopped'){this.message='Choose a song to start.';this.changed();return;}this.api.pause();this.message=(this.api.paused()?'Paused · ':'Playing · ')+this.current.title;this.changed();}
 stop(){this.playRequest++;this.loadingId=null;this.api.stop();this.message='Stopped';this.changed();}
 async share(song){
  if(this.sharing)return false;this.sharing=true;this.message='Sharing your song…';this.changed();
  try{song=validateSong({...song,title:'Shared song'});const fingerprint=JSON.stringify(song);if(this.pending?.fingerprint!==fingerprint)this.pending={fingerprint,id:crypto.randomUUID(),deleteToken:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('')};
   const {id,deleteToken}=this.pending,data=await this.fetch('',{method:'POST',body:JSON.stringify({id,deleteToken,song})});this.receipts[data.id]=deleteToken;write('music-gallery-receipts',this.receipts);this.pending=null;this.sharedNotice=true;this.lastShared={...data,bpm:song.bpm,bars:song.bars,created:Date.now()};await this.load('mine');this.message='Your song is shared! '+data.title;this.api.notice(this.message);return true;
  }catch(e){this.message=e.message;this.api.notice(e.message);return false;}finally{this.sharing=false;this.changed();}
 }
 async report(row=this.selected()){if(!row)return;try{await this.fetch('/'+row.id+'/report',{method:'POST',body:'{}'});this.message='Reported. Thank you.';}catch(e){this.message=e.message;}this.changed();}
 canRemove(row){return row&&(this.owner||!!this.receipts[row.id]);}
 async remove(row=this.selected()){if(!this.canRemove(row))return;try{await this.fetch('/'+row.id,{method:'DELETE',body:JSON.stringify({deleteToken:this.receipts[row.id]||''})});if(this.current?.id===row.id){this.stop();this.current=null;}this.history=this.history.filter(item=>item.id!==row.id);write('music-gallery-history',this.history);await this.load(this.tab,this.offset);this.message='Song removed.';}catch(e){this.message=e.message;}this.changed();}
 async checkOwner(){try{this.owner=(await this.fetch('/session')).owner;this.changed();}catch{}}
}
