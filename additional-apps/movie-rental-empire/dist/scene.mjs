import {drawRewards} from './expansion-ui.mjs';
import * as X from './expansion.mjs';
import {MOVIES,REGULARS,CANDIDATES} from './data.mjs';
import {cameraFit,screenPoint,worldPoint} from './camera.mjs';
const XB=[0,189,376,562,749,935,1122],YB=[0,281,559,842,1101,1402];
export function crop(i){const x=i%6,y=Math.floor(i/6);return [XB[x]+3,YB[y]+3,XB[x+1]-XB[x]-6,YB[y+1]-YB[y]-6];}
export class StoreScene{
 constructor(canvas,onStation){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onStation=onStation;this.people=new Map();this.last=0;this.t=0;this.camera={zoom:1,panX:0,panY:0,overview:false};this.pointers=new Map();this.targetNodes=new Map();this.targetLayer=globalThis.document?.getElementById?.("sceneTargets");this.hotspots=[];this.hover=null;this.backdrop=new Image();this.backdrop.src='./assets/store-pixel.png';this.art=new Image();this.art.src='./assets/movie-atlas.png';this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.addEventListener('pointerdown',e=>{this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.pointerStart={x:e.clientX,y:e.clientY};this.dragged=false;this.lastPinch=this.pinchDistance();canvas.setPointerCapture?.(e.pointerId);},{passive:true});
  canvas.addEventListener('pointermove',e=>{const old=this.pointers.get(e.pointerId);if(old){this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size>1){const dist=this.pinchDistance();if(this.lastPinch)this.camera.zoom=Math.max(1,Math.min(1.8,this.camera.zoom*dist/this.lastPinch));this.lastPinch=dist;this.dragged=true;}else if(this.dragged||Math.hypot(e.clientX-this.pointerStart.x,e.clientY-this.pointerStart.y)>9){this.camera.panX+=e.clientX-old.x;this.camera.panY+=e.clientY-old.y;this.dragged=true;}}const p=this.pointer(e);this.hover=this.hit(p);canvas.style.cursor=this.dragged?'grabbing':this.hover?'pointer':'grab';},{passive:true});
  canvas.addEventListener('pointerup',e=>{this.pointers.delete(e.pointerId);this.lastPinch=0;});
  canvas.addEventListener('pointercancel',e=>{this.pointers.delete(e.pointerId);this.dragged=true;this.lastPinch=0;});
  canvas.addEventListener('click',e=>{if(this.dragged)return;const h=this.hit(this.pointer(e));if(h)this.onStation(h.id,h.customer);});
 }
 pinchDistance(){const a=[...this.pointers.values()];return a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
 fit(){return cameraFit(this.canvas.clientWidth||1300,this.canvas.clientHeight||850,this.camera);}
 pointer(e){const r=this.canvas.getBoundingClientRect();return worldPoint({x:e.clientX-r.left,y:e.clientY-r.top},this.fit());}
 hit(p){return [...this.hotspots].reverse().find(h=>Math.hypot(h.x-p.x,h.y-p.y)<h.r||(h.customer&&Math.abs(h.x-p.x)<22&&p.y>h.y&&p.y<h.y+85));}
 resetCamera(overview=false){this.camera={zoom:1,panX:0,panY:0,overview};}
 syncTargets(fit){if(!this.targetLayer)return;const keep=new Set();for(const h of this.hotspots){const key=h.customer?'customer-'+h.customer:h.id;keep.add(key);let b=this.targetNodes.get(key);if(!b){b=document.createElement('button');b.className='room-target';b.onclick=()=>this.onStation(b.dataset.station,b.dataset.customer?Number(b.dataset.customer):undefined);this.targetLayer.appendChild(b);this.targetNodes.set(key,b);}const q=screenPoint(h,fit);b.style.left=q.x+'px';b.style.top=q.y+'px';b.dataset.station=h.id;b.dataset.customer=h.customer||'';const label=h.label||h.id;if(b.textContent!==label)b.textContent=label;b.classList.toggle('needs-you',!!h.urgent);b.setAttribute('aria-label',h.aria||label);b.hidden=q.x<22||q.x>(this.canvas.clientWidth||1300)-22||q.y<30||q.y>(this.canvas.clientHeight||850)-22;}for(const [key,b] of this.targetNodes)if(!keep.has(key)){b.remove();this.targetNodes.delete(key);}}

 p(x,y,z=0){return {x:610+(x-y)*46,y:190+(x+y)*23-z*46};}
 path(points,color,stroke){const c=this.ctx;c.beginPath();points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 plane(x,y,w,d,z,color){this.path([this.p(x,y,z),this.p(x+w,y,z),this.p(x+w,y+d,z),this.p(x,y+d,z)],color);}
 box(x,y,w,d,h,top='#a67b51',front='#634c3a',side='#7e5e43',base=0){this.path([this.p(x,y+d,base),this.p(x+w,y+d,base),this.p(x+w,y+d,h+base),this.p(x,y+d,h+base)],front);this.path([this.p(x+w,y,base),this.p(x+w,y+d,base),this.p(x+w,y+d,h+base),this.p(x+w,y,h+base)],side);this.plane(x,y,w,d,h+base,top);}
 text(txt,x,y,size=14,color='#f4d6a8',font='DM Sans',align='center'){const c=this.ctx;c.font=`${size}px "${font}", sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(txt,x,y);}
 round(x,y,w,h,r,fill,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 line(x1,y1,x2,y2,color,width=1){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
 ellipse(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 drawPoster(i,x,y,w=43,h=65){const c=this.ctx;this.round(x-3,y-3,w+6,h+6,2,'#3c2b32','#c19a69');if(this.art.complete&&this.art.naturalWidth)c.drawImage(this.art,...crop(i),x,y,w,h);else this.round(x,y,w,h,0,['#ba6b4b','#797255','#8676a2'][i%3]);if(w<43)return;const m=MOVIES[i];const words=m.title.split(' ');this.round(x,y+h-21,w,21,0,'#171425dc');this.text(words.slice(0,2).join(' '),x+w/2,y+h-11,6.7,'#f8e1a9');this.text(words.slice(2,5).join(' '),x+w/2,y+h-3,6,'#f8e1a9');}
 shelf(x,y,w,genre,index,s){
  this.box(x,y,w,.55,1.72,'#a07b51','#453c37','#71543c');
  for(let row=0;row<3;row++){
   for(let j=0;j<Math.floor(w*8);j++){const ix=(index*5+j+row*7)%30, st=s.stock[ix];if((j+row)%7===0&&!st.ready)continue;const pos=this.p(x+.08+j*.12,y+.57,1.48-row*.43);const c=this.ctx;c.save();c.transform(1,.5,0,1,pos.x,pos.y);const col=['#d59464','#63a69d','#c7758c','#899d63','#9d8cb4','#cdba78','#6c8ca5'][ix%7];c.fillStyle=col;c.fillRect(0,0,4.8,13);c.fillStyle='#eedabd';c.fillRect(.7,2,3,2);c.fillStyle='#312836';c.fillRect(.5,9,3.5,2);c.restore();}
   const a=this.p(x,y+.59,1.15-row*.43),b=this.p(x+w,y+.59,1.15-row*.43);this.line(a.x,a.y,b.x,b.y,'#b18a58',3);
  }
  const p=this.p(x+w/2,y+.55,1.95);const c=this.ctx;c.save();c.translate(p.x,p.y);c.transform(1,.5,0,1,0,0);this.round(-w*20,-12,w*40,20,2,'#382d38','#ba915d');this.text(genre.toUpperCase(),0,2,11,'#edce92','Barlow Condensed');c.restore();
 }
 person(x,y,look,walk=0,staff=false,bubble=null){
  const c=this.ctx,p=this.p(x,y),skin=look.skin||'#ddb18d',hair=look.hair||'#483137',shirt=look.color||'#6b9698',step=Math.round(Math.sin(walk)*3);c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(1.25,1.25);
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};rect(-11,0,24,4,'#10132566');rect(-8,-19,7,20+step,'#252738');rect(3,-19,7,20-step,'#303044');rect(-10,step,10,4,'#c6b299');rect(3,-step,11,4,'#c6b299');rect(-11,-39,23,23,shirt);rect(-15,-35,5,16,shirt);rect(12,-35,5,16,shirt);rect(-15,-20,5,6,skin);rect(12,-20,5,6,skin);if(staff){rect(-6,-35,14,18,'#403452');rect(3,-33,4,3,'#ffe5b2');}rect(-3,-43,7,5,skin);rect(-9,-59,19,17,skin);rect(-11,-60,22,6,hair);rect(-11,-56,4,12,hair);rect(-6,-64,14,5,hair);rect(-5,-51,2,3,'#352b38');rect(5,-51,2,3,'#352b38');rect(0,-45,4,2,'#a36762');
  if(bubble){this.round(-18,-88,39,20,2,'#f5dfb2','#a98971');this.text(bubble,1,-74,10,'#46313b','monospace');}c.restore();
 }

 counter(s){
  this.box(1.8,6.6,3.5,1.1,1.05,'#bd8d5c','#704d3d','#845b40');
  this.box(1.9,6.65,3.3,.95,.10,'#d3a76e','#9b714c','#9b714c',1.05);
  const c=this.ctx;let p=this.p(3.2,6.7,1.18);this.round(p.x-19,p.y-41,40,32,4,'#b5b2a0','#d3c9ac');this.round(p.x-14,p.y-36,29,22,3,'#18312d');this.text('RENTAL',p.x+.5,p.y-26,6,'#8adab2');this.text('READY_',p.x+.5,p.y-18,5,'#8adab2');this.round(p.x-4,p.y-9,12,9,2,'#8d8c80');this.round(p.x-16,p.y+2,36,9,2,'#a5a28e');for(let i=0;i<6;i++)this.line(p.x-12+i*5,p.y+4,p.x-12+i*5,p.y+8,'#565852',1);
  p=this.p(4.5,6.8,1.2);this.round(p.x-8,p.y-11,22,14,3,'#393039');this.round(p.x-10,p.y-14,26,5,3,'#b98666');this.line(p.x+10,p.y-6,p.x+14,p.y+5,'#3c2934',2);
  const a=this.p(3.5,7.71,.75);c.save();c.translate(a.x,a.y);c.transform(1,.5,0,1,0,0);this.round(-69,-18,138,30,4,'#342c38','#b18a65');this.text('REWIND & DANDY',0,0,16,'#efc892','Barlow Condensed');this.text('GOOD MOVIES. GREAT NIGHTS.',0,9,5.6,'#cda888');c.restore();
  this.box(5.65,7.3,.8,.75,.8,'#302936','#96633d','#73492e');p=this.p(6,8.05,.57);this.text('RETURNS',p.x,p.y,8,'#f6dba7');
  const count=Math.min(5,s.stock.reduce((a,v)=>a+v.dirty,0));for(let i=0;i<count;i++)this.box(5.72+i*.035,7.42,.6,.36,.065,'#565159','#211f2a','#33303a',.83+i*.09);
 }
 rewindDesk(s){
  this.box(.3,4.3,1.7,.65,.95,'#ac8056','#624337','#775139');
  for(let i=0;i<1+(s.upgrades.rewinders||0);i++){const p=this.p(.55+i*.85,4.5,1.03);this.round(p.x-15,p.y-12,29,15,2,'#535157','#999186');this.round(p.x-12,p.y-9,22,7,1,'#151a23');const job=s.rewinding[i];this.ellipse(p.x-7,p.y-5,3,3,job?'#c5c1ad':'#6c6b64');this.ellipse(p.x+5,p.y-5,3,3,job?'#c5c1ad':'#6c6b64');this.ellipse(p.x+10,p.y+1,1.5,1.5,job?'#83dfb6':'#ae4b5e');if(job){this.line(p.x-8,p.y-5,p.x-6+Math.sin(this.t*15)*2,p.y-3,'#34404a',1);}}
 }
 snackRack(s){
  this.box(6.3,7.6,1.3,.55,1.4,'#9f6c4b','#583c3d','#6e4440');for(let r=0;r<3;r++)for(let j=0;j<7;j++){const p=this.p(6.4+j*.16,8.16,1.29-r*.35);this.round(p.x-2,p.y,6,10,1,['#d79b53','#ce6179','#7da796'][r]);}const p=this.p(6.95,8.13,1.68);this.round(p.x-28,p.y-13,56,19,3,'#c1694e');this.text('SNACKS',p.x,p.y+1,13,'#fff0c4','Barlow Condensed');
 }
 draw(s,time){
  const c=this.ctx;this.t=time/1000;const dt=Math.min(.1,(time-this.last)/1000||.016);this.last=time;
  const touch=matchMedia('(any-pointer: coarse), (max-width: 1024px)').matches;
  const dpr=Math.min(touch?1.5:2,globalThis.devicePixelRatio||1),w=this.canvas.clientWidth||1300,h=this.canvas.clientHeight||850;if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
  const fit=cameraFit(w,h,this.camera);this.camera.panX=fit.panX;this.camera.panY=fit.panY;c.setTransform(1,0,0,1,0,0);c.fillStyle='#171726';c.fillRect(0,0,this.canvas.width,this.canvas.height);c.setTransform(fit.scale*dpr,0,0,fit.scale*dpr,fit.x*dpr,fit.y*dpr);c.save();
  const grad=c.createLinearGradient(0,0,0,850);grad.addColorStop(0,'#171726');grad.addColorStop(.65,'#262338');grad.addColorStop(1,'#171927');c.fillStyle=grad;c.fillRect(0,0,1300,850);
  for(let i=0;i<20;i++){const bx=(i*157)%1300,by=30+(i*79)%260;c.fillStyle=i%2?'#292638':'#24212f';c.fillRect(bx,by,80,300-by);for(let j=0;j<4;j++){c.fillStyle=(i+j)%3?'#b9875344':'#86a2a326';c.fillRect(bx+10+(j%2)*35,by+20+Math.floor(j/2)*40,17,23);}}
  c.save();this.hotspots=[];
  const detailed=this.backdrop.complete&&this.backdrop.naturalWidth;
  if(detailed){c.imageSmoothingEnabled=false;c.drawImage(this.backdrop,0,0,1300,850);}else{
  this.plane(-2,-2,16,14,-.25,'#32313d');for(let i=-2;i<15;i++){let a=this.p(i,-2,-.24),b=this.p(i,12,-.24);this.line(a.x,a.y,b.x,b.y,'#77717c15',1);}for(let j=-2;j<13;j++){let a=this.p(-2,j,-.24),b=this.p(14,j,-.24);this.line(a.x,a.y,b.x,b.y,'#8a7d8b15',1);}
  this.box(0,0,12,9,.35,'#635044','#25202d','#3b2b36',-.35);
  for(let x=0;x<12;x++)for(let y=0;y<9;y++){this.plane(x,y,1,1,.005,(x+y)%2?'#514352':'#554554');const p=this.p(x+.3,y+.5,.01);this.line(p.x,p.y,p.x+6,p.y-3,['#ad8b682b','#be6e8b30','#7aafab30'][(x*7+y)%3],1.5);}
  this.path([this.p(0,0),this.p(0,9),this.p(0,9,3.2),this.p(0,0,3.2)],'#6f5155');this.path([this.p(0,0),this.p(12,0),this.p(12,0,3.2),this.p(0,0,3.2)],'#7a5b52');
  this.path([this.p(0,0),this.p(0,9),this.p(0,9,.9),this.p(0,0,.9)],'#493941');this.path([this.p(0,0),this.p(12,0),this.p(12,0,.9),this.p(0,0,.9)],'#534038');
  for(let i=0;i<9;i++){const a=this.p(0,i,.02),b=this.p(0,i,.9);this.line(a.x,a.y,b.x,b.y,'#9b795448',2);}for(let i=0;i<12;i++){const a=this.p(i,0,.02),b=this.p(i,0,.9);this.line(a.x,a.y,b.x,b.y,'#9b795448',2);}
  for(let i=0;i<12;i++){const p=this.p(i,0,3.1),q=this.p(i,0,.05);this.line(p.x,p.y,q.x,q.y,'#412d3730',1);}this.line(...Object.values(this.p(0,9,.12)),...Object.values(this.p(0,0,.12)),'#342b35',7);this.line(...Object.values(this.p(0,0,.12)),...Object.values(this.p(12,0,.12)),'#3e2d35',7);
  this.path([this.p(0,5.4,.65),this.p(0,8.5,.65),this.p(0,8.5,2.9),this.p(0,5.4,2.9)],'#1b283e');
  for(let i=0;i<4;i++){const a=this.p(0,5.4+i*1.02,.65),b=this.p(0,5.4+i*1.02,2.9);this.line(a.x,a.y,b.x,b.y,'#a2867e',4);}let a=this.p(0,5.4,.65),b=this.p(0,8.5,.65);this.line(a.x,a.y,b.x,b.y,'#a2867e',5);a=this.p(0,5.4,2.9);b=this.p(0,8.5,2.9);this.line(a.x,a.y,b.x,b.y,'#b89d85',5);
  c.save();const np=this.p(0,6.95,2.5);c.translate(np.x,np.y);c.transform(1,-.5,0,1,0,0);c.shadowColor='#ee72ad';c.shadowBlur=15;this.text('REWIND',0,0,24,'#ff9cca','Barlow Condensed');this.text('& DANDY',0,24,22,'#ffacd3','Barlow Condensed');c.shadowColor='#73cbd6';this.text('V I D E O',0,45,12,'#8acdd6');c.restore();
  for(let i=0;i<4;i++){const pos=this.p(3+i*2.2,.04,2.75);c.save();c.translate(pos.x,pos.y);c.transform(1,.5,0,1,0,0);this.drawPoster([0,3,10,6][i],-23,-20,47,64);c.restore();}
  for(const [wx,wy] of [[0,3.2],[5.2,0],[10.8,0]]){const p=this.p(wx,wy,2.3);const glow=c.createRadialGradient(p.x,p.y,2,p.x,p.y,115);glow.addColorStop(0,'#ffc47344');glow.addColorStop(1,'#ffc47300');c.fillStyle=glow;c.fillRect(p.x-115,p.y-115,230,230);this.line(p.x,p.y-14,p.x,p.y+16,'#c3935e',4);this.path([{x:p.x-16,y:p.y-17},{x:p.x+16,y:p.y-17},{x:p.x+10,y:p.y-34},{x:p.x-10,y:p.y-34}],'#e7c080');this.ellipse(p.x,p.y-16,16,4,'#ffdc90');}
  const tv=this.p(.2,1,2.6);this.round(tv.x-38,tv.y-42,70,49,5,'#39323a','#b99b77');this.round(tv.x-32,tv.y-36,53,36,7,'#2e4d57');c.save();c.beginPath();c.roundRect(tv.x-32,tv.y-36,53,36,7);c.clip();const slide=Math.floor(this.t/8)%4;this.drawPoster(slide,tv.x-32,tv.y-46,53,70);c.fillStyle='#1f21276a';c.fillRect(tv.x-32,tv.y-36,53,36);for(let i=0;i<12;i++)this.line(tv.x-32,tv.y-35+i*3,tv.x+21,tv.y-35+i*3,'#a8bccc22');c.restore();this.text('COMING SOON',tv.x-7,tv.y-5,6,'#f7e9c5');
  this.shelf(2,.3,4.1,'New releases',0,s);this.shelf(7,.3,4.3,'Staff picks',3,s);
  }
  const objs=[];
  if(!detailed){objs.push({depth:13,fn:()=>this.counter(s)},{depth:7,fn:()=>this.rewindDesk(s)},{depth:16,fn:()=>this.snackRack(s)});[[5.9,2.2,3.4,'ACTION',0],[5.9,4.6,3.4,'COMEDY',1],[9.9,2.4,1.5,'HORROR',2],[9.9,5.2,1.5,'FAMILY',3]].forEach(([x,y,w,g,i])=>objs.push({depth:x+y+w/2+.5,fn:()=>this.shelf(x,y,w,g,i,s)}));}
  for(let i=0;i<(s.upgrades.shelves||0);i++)objs.push({depth:5.7+i*1.5,fn:()=>this.shelf(2.3,1.8+i*1.5,2,['CULT CLASSICS','ROMANCE','SCI-FI'][i],4+i,s)});
  const decor=s.decor||{};const neon={rose:'#ffa1d1',mint:'#8fffe0',gold:'#ffe195'}[decor.sign]||'#ffa1d1';
  c.save();c.translate(278,270);c.transform(1,-.48,0,1,0,0);c.shadowColor=neon;c.shadowBlur=10;this.text(decor.name||'Rewind & Dandy',0,0,Math.min(20,230/Math.max(10,(decor.name||'Rewind & Dandy').length)*1.5),neon,'monospace');this.text('V I D E O',0,23,10,neon,'monospace');c.restore();
  if(decor.rug){this.plane(2.1,3.1,2.4,2,.02,'#a15770');this.plane(2.3,3.3,2,1.6,.03,'#d0a166');this.plane(2.45,3.45,1.7,1.3,.04,'#735479');}
  if(decor.plants)for(const [x,y] of [[.4,8.3],[3.1,8.5]])objs.push({depth:x+y,fn:()=>{this.box(x,y,.45,.45,.5,'#bd805f','#79513f','#9e684d');const p=this.p(x+.2,y+.2,.6);for(let i=0;i<7;i++){c.fillStyle=i%2?'#89b46a':'#487b58';c.fillRect(p.x-15+(i*7)%25,p.y-25+(i*11)%22,10,13);}}});
  if(decor.arcade)objs.push({depth:3.7,fn:()=>{this.box(1.6,1.2,.7,.7,1.8,'#d88d9f','#57416a','#302b50');const p=this.p(2,1.95,1.5);this.round(p.x-12,p.y-8,25,23,0,'#78d9bb');this.text('★',p.x,p.y+9,15,'#38365e');}});
  if(s.upgrades.store){const p=this.p(7.3,0,3.05);this.text('THE FLAGSHIP COLLECTION',p.x,p.y-18,17,'#f4cc82','Barlow Condensed');}
  if(s.upgrades.cozy)objs.push({depth:11,fn:()=>{this.box(.4,8,1.5,.6,.45,'#bc8c66','#886448','#a87853');this.box(.4,8.5,1.5,.15,.75,'#d3a97d','#a77b58','#8a654b');}});
  if(!detailed)objs.push({depth:12.7,fn:()=>{const p=this.p(11.5,1.2);this.box(11.25,.95,.5,.5,.55,'#8d684d','#715440','#a37a54');for(let i=0;i<9;i++){const dx=Math.sin(i*2.4)*18,dy=Math.cos(i*2.4)*13;this.line(p.x,p.y-20,p.x+dx,p.y-39+dy,'#77996b',2);this.ellipse(p.x+dx,p.y-40+dy,7,3,'#64835a');}}});
  objs.push({depth:9.5,fn:()=>this.person(1.7,4.65,{name:'You',color:'#ab8dbc',hair:'#6a4130',skin:'#d4a47e'},0,true)});
  const current=new Set(s.customers.map(v=>v.id));let qi=0,hi=0;
  for(const cust of s.customers){const reg=REGULARS[cust.regular];let target=cust.stage==='checkout'?{x:5.3+qi*.6,y:7.7+qi++*.05}:{x:10.7+(hi%2)*.9,y:8.1-Math.floor(hi++/2)*.75};let v=this.people.get(cust.id);if(!v){v={x:1,y:8.7,reg,walk:0};this.people.set(cust.id,v);}v.target=target;v.c=cust;v.leaving=false;}
  for(const [id,v] of this.people){if(!current.has(id)){v.target={x:.3,y:8.8};v.leaving=true;}
   const dx=v.target.x-v.x,dy=v.target.y-v.y,dist=Math.hypot(dx,dy),moving=dist>.08;const step=Math.min(dist,dt*2.2);if(dist){v.x+=dx/dist*step;v.y+=dy/dist*step;}if(moving&&!this.reduced)v.walk+=dt*10;else v.walk=0;if(v.leaving&&dist<.15){this.people.delete(id);continue;}const bub=this.targetLayer?null:v.leaving?null:v.c?.stage==='help'?'?':v.c?.wait>90?'…':'VHS';objs.push({depth:v.x+v.y,fn:()=>this.person(v.x,v.y,v.reg,v.walk,false,bub)});
  }
  s.staff.filter(e=>e.active||s.phase!=='open').forEach((e,i)=>{const cand=CANDIDATES[e.id];const loc=e.assignment==='checkout'?[2.3,5.1]:e.assignment==='returns'?[1.6,3.7]:[9.2,8.5+i*.2];objs.push({depth:loc[0]+loc[1],fn:()=>this.person(...loc,{name:cand.name,color:cand.color,hair:i%2?'#b5a38e':'#3d2834',skin:i%2?'#d9a582':'#a26e50'},0,true)});});
  objs.sort((a,b)=>a.depth-b.depth).forEach(o=>o.fn());
  // Small room props give management actions a physical home.
  this.round(525,343,34,16,2,'#46314a','#b4a095');this.round(522,339,39,7,2,'#9f8592');for(let row=0;row<2;row++)for(let col=0;col<3;col++){c.fillStyle='#e0c8ad';c.fillRect(535+col*5,348+row*4,3,2);}
  this.round(594,207,32,40,1,'#9a7048','#d3ac72');this.round(598,212,24,29,0,'#e8d4ab');for(let i=0;i<4;i++)this.line(602,218+i*5,618,218+i*5,'#745b57',2);
  this.box(10.8,1.2,.7,.7,.55,'#a98762','#765745','#c09a6f');const plan=this.p(11.15,1.5,.6);this.round(plan.x-14,plan.y-10,27,18,1,'#568ca4');this.line(plan.x-9,plan.y-5,plan.x+8,plan.y-5,'#d4e8dc',1);this.line(plan.x-9,plan.y+1,plan.x+2,plan.y+1,'#d4e8dc',1);
  drawRewards(this,s);
  const dirty=s.stock.reduce((n,v)=>n+v.dirty+v.shelve,0),queue=s.customers.filter(c=>c.stage==='checkout').length;
  const locations=[['counter',450,370,queue?'Checkout · '+queue:'Register',!!queue],['returns',470,258,dirty?'Rewind · '+dirty:'Rewinder',!!dirty],['phone',545,340,'Phone',false],['catalog',865,350,'Movies',false],['snacks',580,500,'Snacks',false],['decor',278,270,'Store sign',false],['crew',610,220,'Staff',false],['upgrades',1050,450,'Improve',false]];
  locations.push(['neighborhood',685,195,'Neighbors',X.ensure(s).stories.some((r,i)=>X.readyStory(s,i))]);if(X.ensure(s).guest&&!s.expansion.guest.resolved&&s.phase==='open')locations.push(['visitor',320,375,'Visitor',true]);if(X.ensure(s).milestones.includes('annex'))locations.push(['collections',280,565,'Annex',false]);
  for(const [id,x,y,label,urgent] of locations){this.hotspots.push({id,x,y,r:Math.max(24/fit.scale,30),label,urgent});if(!this.targetLayer){this.round(x-40,y-13,80,26,4,'#211c2bdd','#b69a7955');this.text(label,x,y+4,12,'#f1d8af');}}
  for(const [id,v] of this.people){if(v.leaving)continue;const pos=this.p(v.x,v.y);this.hotspots.push({id:v.c.stage==='help'?'floor':'counter',customer:id,x:pos.x,y:pos.y-85,r:28/fit.scale,label:v.c.stage==='help'?'?':'▤',aria:v.c.name+(v.c.stage==='help'?' needs a recommendation':' is ready to check out'),urgent:true});}
  this.syncTargets(fit);

  if(s.upgrades.sign){let p=this.p(-.5,9.8);this.round(p.x-23,p.y-40,46,42,4,'#3f2939','#c4799b');this.text('MOVIES',p.x,p.y-23,10,'#efa3c2');this.text('TONIGHT',p.x,p.y-9,8,'#eacb97');}
  const gl=c.createRadialGradient(660,390,130,660,400,560);gl.addColorStop(0,'#ffc77b08');gl.addColorStop(1,'#0e102554');c.fillStyle=gl;c.fillRect(0,0,1300,850);c.restore();
  if(!this.reduced)for(let i=0;i<70;i++){const x=(i*71+this.t*43)%1300,y=(i*97+this.t*150)%850;if(y<100||x<130||x>1190||y>735)this.line(x,y,x-3,y+10,'#a1b8cc22',1);}
  c.restore();
 }
}
