import {THEMES,ART_STYLES,ACTIONS,frameAt,showTiming,clamp,activeEvents} from './project.mjs';
export const SCENE_ASSET_URLS={...Object.fromEntries(Object.values(ART_STYLES).map(s=>[s.asset,s.url])),...Object.fromEntries(Object.keys(THEMES).map(k=>[k,'./assets/art/'+k+'.png']))};
const assets={},jobs=new Map();export const setSceneAssets=images=>Object.assign(assets,images);
export function loadSceneAssets(p){return Promise.all([p.theme,ART_STYLES[p.artStyle].asset].map(key=>{if(assets[key])return assets[key];if(jobs.has(key))return jobs.get(key);const job=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{assets[key]=img;resolve(img);};img.onerror=()=>{jobs.delete(key);reject(new Error('Artwork could not load. Try again before exporting.'));};img.src=new URL(SCENE_ASSET_URLS[key],import.meta.url).href;});jobs.set(key,job);return job;}));}
const W=1920,H=1080,INK='#263330',MUTED='#68736b',PAPER='#fffdf5',ORDER=['pat','clap','stomp','snap','say','tap','wave','freeze'];
const ease=n=>1-Math.pow(1-clamp(n,0,1),3),smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
function box(c,x,y,w,h,r,fill,stroke,width=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function text(c,s,x,y,size=28,color=INK,align='left',weight='normal'){c.font=weight+' '+size+'px "Studio Sans",sans-serif';c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(s),x,y);}
function fitted(c,s,x,y,max,size,color=INK,align='left',weight='bold'){s=String(s);while(size>18){c.font=weight+' '+size+'px "Studio Sans",sans-serif';if(c.measureText(s).width<=max)break;size-=2;}text(c,s,x,y,size,color,align,weight);}
function wrapped(c,s,x,y,max,size,lineHeight,maxLines=3,color=INK,align='left'){
 let lines=[];for(let current=size;current>=24;current-=3){c.font='bold '+current+'px "Studio Sans"';lines=[''];for(const word of String(s).trim().split(/\s+/)){const i=lines.length-1,next=lines[i]?lines[i]+' '+word:word;if(c.measureText(next).width>max&&lines[i])lines.push(word);else lines[i]=next;}if(lines.length<=maxLines){size=current;break;}}
 lines.slice(0,maxLines).forEach((line,i)=>fitted(c,line,x,y+i*lineHeight,max,size,color,align));return Math.min(lines.length,maxLines)*lineHeight;
}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function background(c,p,sec,motion){c.fillStyle='#f6f0df';c.fillRect(0,0,W,H);const img=assets[p.theme];if(img){const pixel=THEMES[p.theme].pixelated,z=pixel?1:motion?1.028+Math.sin(sec*.085)*.012:1.02;c.save();if(pixel)c.imageSmoothingEnabled=false;c.translate(W/2,H/2);c.scale(z,z);c.drawImage(img,-W/2,-H/2,W,H);c.restore();}const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#14292318');shade.addColorStop(.5,'#ffffff00');shade.addColorStop(1,'#152d2628');c.fillStyle=shade;c.fillRect(0,0,W,H);}
export function drawMovement(c,key,x,y,size,p,phase=1,live=false){
 if(key==='rest'){c.lineWidth=7;c.strokeStyle='#8b978d';c.lineCap='round';c.beginPath();c.moveTo(x-size*.14,y);c.lineTo(x+size*.14,y);c.stroke();return;}
 const art=ART_STYLES[p.artStyle],img=assets[art.asset],i=ORDER.indexOf(key);if(!img||i<0){circle(c,x,y,size*.22,ACTIONS[key]?.color||'#deded0');return;}
 const hit=live&&!p.reducedMotion?Math.exp(-Math.max(0,phase)*10):0;c.save();if(art.pixelated)c.imageSmoothingEnabled=false;c.translate(x,y);if(key==='wave')c.rotate(Math.sin(phase*17)*hit*.18);else if(key==='stomp'||key==='pat'||key==='tap')c.translate(0,-hit*17);else c.scale(1+hit*.08,1+hit*.08);
 const sw=img.width/4,sh=img.height/2,pad=art.padding||0,inset=art.asset==='movements'&&i===1?28:0;
 if(art.frames){const [sx,sy,fw,fh]=art.frames[i];c.drawImage(img,sx*img.width,sy*img.height,fw*img.width,fh*img.height,-size/2,-size/2,size,size);}
 else c.drawImage(img,(i%4+pad)*sw+inset,(Math.floor(i/4)+pad)*sh,sw*(1-2*pad)-inset,sh*(1-2*pad),-size/2,-size/2,size,size);c.restore();
}
function panel(c){box(c,148,158,1624,768,38,'#1c302325');box(c,138,144,1644,768,34,'#fffdf4f2','#ffffffe0',2);}
function cueName(e,p){const name=e?.action==='say'?e.word||p.word:ACTIONS[e?.action]?.name||'';return e?.hits>1?Array(e.hits).fill(name).join(' · '):name;}
function movelist(p){return [...new Set(activeEvents(p).map(e=>e.action).filter(a=>a!=='rest'))].slice(0,6);}
function card(c,p,e,x,y,w,h,active,elapsed,selection,motion,hit=0){
 const accent=THEMES[p.theme].accent,label=p.showLabels&&!p.textFree;
 box(c,x+3,y+10,w,h,23,'#243b2725');box(c,x,y,w,h,22,active?'#fff5c7':'#fffdf5f2',active?accent:selection?'#e1ab63':'#ffffffb0',active?7:selection?4:2);
 if(e){
  box(c,x+12,y+12,w-24,h-24,15,ACTIONS[e.action].color+(active?'77':'25'));
  if(e.hits>1||e.rhythm==='compound'){
   const compound=e.rhythm==='compound',count=compound?3:e.hits,cell=(w-34)/count;
   for(let part=0;part<count;part++){
    const index=compound?e.slots.indexOf(part):part,cx=x+17+cell*(part+.5),cy=y+h*(label?.43:.46),hot=active&&index>=0&&hit===index;
    if(hot)box(c,x+17+part*cell,y+26,cell-3,h-(label?97:55),16,'#fffcecb0',accent,3);
    drawMovement(c,index<0?'rest':e.action,cx,cy,cell*.98,p,elapsed,hot&&motion);circle(c,cx,y+h*(label?.75:.83),hot?7:5,hot?accent:'#84908070');
   }
  }else drawMovement(c,e.action,x+w/2,y+h*(label?.44:.50),label?h*.72:h*.83,p,elapsed,active&&hit>=0&&motion);
  if(label)fitted(c,cueName(e,p),x+w/2,y+h-39,w-35,e.hits>2?24:e.hits>1?29:37,INK,'center');
 }
 else{c.save();c.globalAlpha=.28;circle(c,x+w/2,y+h/2,6,'#627165');c.restore();}
 if(active){circle(c,x+w-26,y+28,7,accent);box(c,x+17,y+h-11,w-34,4,2,accent);}
}
export function cueCardRects(p){const labels=p.showLabels&&!p.textFree,h=labels?355:422;return Array.from({length:8},(_,i)=>({x:127+(i%4)*424,y:(labels?169:72)+Math.floor(i/4)*(h+27),w:394,h}));}
export function hitTestCue(p,seconds,x,y,width=1920,height=1080){const f=frameAt(p,seconds);if(f.phase!=='activity'||width<=0||height<=0)return null;const scale=Math.min(width/W,height/H);x=(x-(width-W*scale)/2)/scale;y=(y-(height-H*scale)/2)/scale;const i=cueCardRects(p).findIndex(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);return i<0?null:f.events[i]||null;}
function activity(c,p,f,opts){
 const labels=p.showLabels&&!p.textFree,rects=cueCardRects(p);
 if(labels){box(c,127,48,1666,94,22,'#fffdf4ed');fitted(c,p.title,157,94,1290,42);text(c,String(f.page+1).padStart(2,'0')+' / '+String(f.pages).padStart(2,'0'),1755,95,22,MUTED,'right');}
 const first=f.events[0],pageAge=first?f.song-first.at:99;
 for(let i=0;i<8;i++){const {x,y,w,h}=rects[i],hot=f.active===i,e=f.events[i];c.save();
  if(opts.motion&&!hot&&p.show.pageTransition==='flow'&&f.page>0){const appear=ease((pageAge-i*.018)/.32);c.globalAlpha=.76+.24*appear;c.translate(0,(1-appear)*18);}
  card(c,p,e,x,y,w,h,hot,f.elapsed,e?.id===opts.selection,opts.motion,f.hit);c.restore();
 }
 box(c,127,1013,1666,5,2,'#fffdf590');if(f.progress)box(c,127,1013,1666*f.progress,5,2,THEMES[p.theme].accent);
 if(!p.events.length&&!p.textFree){box(c,579,473,762,122,20,'#fffaf4f2');text(c,'Your movements go here',960,515,35,INK,'center','bold');text(c,'Load a song, then tap the movement pads.',960,561,25,MUTED,'center');}
}
function slide(c,p,phase,sec,opts){
 const s=p.show,free=p.textFree,motion=opts.motion,accent=THEMES[p.theme].accent;panel(c);
 if(phase==='title'){
  if(!free){box(c,208,217,251,38,19,accent);text(c,'MOVEMENT PLAY-ALONG',334,237,16,'#fffdf5','center','bold');
   const used=wrapped(c,p.title,208,356,1020,94,104,3);wrapped(c,s.subtitle,211,Math.max(520,356+used+20),1000,33,44,2,MUTED);
   if(s.credit)fitted(c,s.credit,211,826,1180,24,MUTED,'left','normal');}
  const keys=movelist(p).slice(0,3);if(!keys.length)keys.push('pat','clap','stomp');
  keys.forEach((key,i)=>{const x=free?590+i*370:1455+(i===1?96:-35),y=free?526:315+i*195; c.save();c.translate(x,y+(motion?Math.sin(sec*1.4+i)*9:0));c.rotate((i-1)*.055);box(c,-129,-117,258,234,29,ACTIONS[key].color+'ab');drawMovement(c,key,0,0,212,p);c.restore();});
 }else if(phase==='instructions'){
  if(!free){text(c,'HERE’S HOW WE PLAY',960,226,18,accent,'center','bold');wrapped(c,s.instructions,960,315,1350,47,61,3,INK,'center');}
  const keys=movelist(p);if(!keys.length)keys.push('pat','clap','stomp');const spacing=Math.min(252,1360/keys.length),start=960-(keys.length-1)*spacing/2;
  keys.forEach((key,i)=>{const x=start+i*spacing,y=free?505:628;box(c,x-spacing*.45,y-128,spacing*.9,267,24,ACTIONS[key].color+'65');drawMovement(c,key,x,y-10,Math.min(194,spacing*.8),p);if(!free)fitted(c,key==='say'?p.word:ACTIONS[key].name,x,y+107,spacing*.8,24,INK,'center');});
  const timing=showTiming(p),remaining=timing.lead-sec;
  if(s.countdown&&remaining<=3&&remaining>0){const pulse=motion?1+(1-remaining%1)*.04:1;circle(c,960,846,40*pulse,accent);if(!free)text(c,Math.ceil(remaining),960,847,38,'#fffdf5','center','bold');else for(let i=0;i<Math.ceil(remaining);i++)circle(c,944+i*16-(Math.ceil(remaining)-1)*8+16,846,5,'#fffdf5');}
 }else{
  if(motion)for(let i=0;i<28;i++){const x=190+(i*173.7)%1550,y=190+((i*79+sec*23)%635);c.save();c.translate(x,y);c.rotate(i+sec*.18);c.fillStyle=[accent,'#e5b850','#719584','#d4877d'][i%4]+'80';c.fillRect(-4,-9,8,18);c.restore();}
  if(!free){text(c,'THAT’S A WRAP',960,254,18,accent,'center','bold');wrapped(c,s.endTitle,960,375,1370,96,106,2,INK,'center');fitted(c,s.endSubtitle,960,558,1370,34,MUTED,'center','normal');}
  for(const [i,key]of ['clap','wave'].entries())drawMovement(c,key,760+i*400,free?530:735,free?340:218,p,Math.max(0,sec-showTiming(p).audioEnd),motion);
 }
}
function phaseScene(c,p,phase,sec,opts){background(c,p,sec,opts.motion);if(phase==='activity'){const frame=frameAt(p,sec);if(opts.preRoll)frame.active=-1;activity(c,p,frame,opts);}else slide(c,p,phase,sec,opts);}
function reveal(c,type,q){
 if(type==='dissolve'){c.globalAlpha=q;return;}
 if(type==='zoom'){c.globalAlpha=q;const z=.94+.06*ease(q);c.translate(W/2,H/2);c.scale(z,z);c.translate(-W/2,-H/2);return;}
 c.beginPath();
 if(type==='iris'){c.arc(W/2,H/2,Math.hypot(W,H)/2*ease(q),0,Math.PI*2);}
 else if(type==='curtain'){const w=W*ease(q);c.rect((W-w)/2,0,w,H);}
 else {const edge=(W+380)*ease(q)-190;c.moveTo(0,0);c.lineTo(edge+190,0);c.lineTo(edge-190,H);c.lineTo(0,H);c.closePath();}
 c.clip();
}
export function drawScene(c,p,seconds=0,options={}){
 const f=frameAt(p,seconds),width=options.width||c.canvas.width,height=options.height||c.canvas.height,opts={...options,motion:!!(options.playing||options.exporting)&&!p.reducedMotion};
 c.save();c.setTransform(width/W,0,0,height/H,0,0);c.clearRect(0,0,W,H);
 const stages=[...(f.title?['title']:[]),...(f.instructions?['instructions']:[]),'activity',...(f.outro?['ending']:[])],index=stages.indexOf(f.phase),transition=p.reducedMotion?'dissolve':p.show.transition,length=Math.min(p.show.transitionSeconds,Math.max(.1,(f.end-f.start)/2)),q=clamp(f.local/length,0,1),animate=!!(options.playing||options.exporting)&&transition!=='none'&&q<1&&f.phase!=='activity';
 const beforeSong=!!(options.playing||options.exporting)&&transition!=='none'&&stages[index+1]==='activity'&&seconds>=f.end-length;
 if(beforeSong){phaseScene(c,p,f.phase,seconds,opts);c.save();reveal(c,transition,clamp((seconds-f.end+length)/length,0,1));phaseScene(c,p,'activity',f.end,{...opts,preRoll:true});c.restore();}
 else if(animate){if(index>0)phaseScene(c,p,stages[index-1],Math.max(0,f.start-.001),{...opts,motion:false});else{c.fillStyle='#14211f';c.fillRect(0,0,W,H);}c.save();reveal(c,transition,q);phaseScene(c,p,f.phase,seconds,opts);c.restore();
  if(transition==='sweep'&&q>0&&q<1){const edge=(W+380)*ease(q)-190;c.save();c.strokeStyle='#fff9df80';c.lineWidth=10;c.beginPath();c.moveTo(edge+190,0);c.lineTo(edge-190,H);c.stroke();c.restore();}
 }else phaseScene(c,p,f.phase,seconds,opts);
 if((options.playing||options.exporting)&&f.total>0){const fade=smooth((seconds-(f.total-.65))/.65);if(fade>0){c.fillStyle='#101816';c.globalAlpha=fade;c.fillRect(0,0,W,H);}}
 c.restore();return f;
}
