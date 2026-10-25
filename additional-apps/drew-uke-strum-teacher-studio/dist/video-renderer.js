(function(root){
 'use strict';
 const M=root.UkeVideoModel,W=1920,H=1080,cream='#fff9e5',ink='#074c5b',gold='#ffe18d';
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
 function text(c,value,x,y,size=32,color=cream,align='left',weight=600){c.font=weight+' '+size+'px UkePrint, Arial, sans-serif';c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(value),x,y);}
 function lines(c,value,maxWidth,size){
  c.font='700 '+size+'px UkePrint, Arial, sans-serif';const result=[];let line='';
  for(const part of String(value).split(/\s+/)){if(c.measureText(part).width>maxWidth){if(line){result.push(line);line='';}let chunk='';for(const char of part){if(chunk&&c.measureText(chunk+char).width>maxWidth){result.push(chunk);chunk='';}chunk+=char;}line=chunk;continue;}const next=line?line+' '+part:part;if(line&&c.measureText(next).width>maxWidth){result.push(line);line=part;}else line=next;}
  if(line)result.push(line);return result;
 }
 function block(c,value,x,y,width,height,size,color=cream,align='center',maxSize=size){
  let list;size=maxSize;
  do{list=lines(c,value,width,size);if(list.length*size*1.22<=height)break;size-=2;}while(size>14);
  list.forEach((line,i)=>text(c,line,x,y+(i-(list.length-1)/2)*size*1.22,size,color,align,700));return {size,lines:list};
 }
 function cover(c,img,x,y,w,h){if(!img)return;const k=Math.max(w/img.width,h/img.height),iw=img.width*k,ih=img.height*k;c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);}
 function ocean(c,time,assets,theme='sunny',quiet=false){
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,theme==='moonlight'?'#132f60':theme==='sunset'?'#a15265':'#178ca9');g.addColorStop(1,'#064759');c.fillStyle=g;c.fillRect(0,0,W,H);
  if(assets.background){cover(c,assets.background,0,0,W,H);c.fillStyle=quiet?'#033c52c9':'#02485a66';c.fillRect(0,0,W,H);}
  for(let l=0;l<4;l++){const y=810+l*80;c.beginPath();c.moveTo(0,H);c.lineTo(0,y);for(let x=0;x<=W+40;x+=24)c.lineTo(x,y+Math.sin(x/230+time*.42+l)*22+Math.cos(x/540-time*.16)*20);c.lineTo(W,H);c.closePath();c.fillStyle=['#41d3c342','#1da5b17a','#137f9999','#07516dcc'][l];c.fill();}
  for(let i=0;i<16;i++){const x=(i*137+time*7)%W,y=70+(i*151)%900;c.beginPath();c.arc(x,y,2+(i%3),0,Math.PI*2);c.fillStyle='#fffbea40';c.fill();}
 }
 function title(c,time,p,s,assets,closing=false){
  ocean(c,time,assets,s.theme,false);round(c,175,220,1570,570,48,'#023d50c9','#b9fce750');
  const elapsed=closing?time-p.musicEnd-p.wave*.42:time,value=closing?p.options.ending||'Thanks for playing!':p.options.title||s.title;
  const box={x:245,y:296,w:1430,h:270,size:126};
  if(root.UkeIsland)root.UkeIsland.title(c,value,box,elapsed);else block(c,value,W/2,440,1370,235,100,cream);
  const creditIn=ease((elapsed-.72)/.6);c.save();c.globalAlpha=creditIn;c.translate(0,(1-creditIn)*18);
  if(closing){block(c,p.options.title||s.title,W/2,638,1300,80,36,gold);if(p.options.composer)block(c,'Composed by '+p.options.composer,W/2,716,1280,50,26,'#d0f5ec');}
  else{if(p.options.composer)block(c,'Composed by '+p.options.composer,W/2,640,1300,72,37,gold);if(p.options.performer)block(c,p.options.performer,W/2,717,1290,55,29,'#d0f5ec');}
  c.restore();
  // The closing message settles before its final fade to black.
  const opacity=closing?ease((time-(p.total-1.15))/1.15):1-ease(time/.5);
  if(opacity>0){c.fillStyle='rgba(2,29,42,'+opacity+')';c.fillRect(0,0,W,H);}
 }
 function chordDiagram(c,chord,x,y,scale,api){
  const frets=api.fingerings[chord];if(!frets)return;
  const high=Math.max(...frets),first=high>4?Math.min(...frets.filter(f=>f>0)):1;
  c.save();c.translate(x,y);c.scale(scale,scale);c.strokeStyle=ink;
  for(let i=0;i<4;i++){text(c,'GCEA'[i],30+i*36,0,17,ink,'center');c.beginPath();c.moveTo(30+i*36,44);c.lineTo(30+i*36,196);c.lineWidth=2;c.stroke();}
  for(let i=0;i<5;i++){c.beginPath();c.moveTo(30,44+i*38);c.lineTo(138,44+i*38);c.lineWidth=i===0&&first===1?6:2;c.stroke();}
  if(first>1)text(c,first+'fr',7,64,14,ink,'right');
  frets.forEach((f,i)=>{const xx=30+i*36;if(f===0){c.beginPath();c.arc(xx,24,6,0,Math.PI*2);c.lineWidth=2;c.stroke();}else if(f>0){const yy=63+(f-first)*38;c.beginPath();c.arc(xx,yy,13,0,Math.PI*2);c.fillStyle=ink;c.fill();const finger=api.fingers[chord]?.[i];if(finger)text(c,finger,xx,yy+1,16,'#fff','center',700);}});
  c.restore();
 }
 function hand(c,x,y,w,pose,assets){
  if(!assets.ukulele||!assets.hand)return;const h=w/2;c.save();c.translate(x,y);c.save();c.translate(w,0);c.scale(-1,1);c.drawImage(assets.ukulele,0,0,w,h);c.restore();
  const hw=w*.28,hh=hw*assets.hand.height/assets.hand.width,ox=hw*.2,oy=hh*.44;
  c.translate(w*.06+ox,h*.3+oy);c.rotate((-5+30*pose.position)*Math.PI/180);c.scale(1,-1);c.drawImage(assets.hand,-ox,-oy,hw,hh);c.restore();
 }
 function songScene(c,time,p,s,assets,api){
  ocean(c,time,assets,s.theme,true);const pos=M.position(time,p),ready=time<p.countStart,phase=pos.phase,tick=Math.floor(pos.tick),cfg=M.meters[s.meter];
  let chord=api.chord(tick),next=api.next(tick,phase),lyric=api.lyrics(phase,pos.counting),pose=api.pose(phase,pos.counting);
  if(root.UkeIsland)root.UkeIsland.title(c,p.options.title||s.title,{x:62,y:18,w:1320,h:110,size:49,align:'left'},10,false);else block(c,p.options.title||s.title,62,76,1320,110,46,cream,'left');
  text(c,s.meter+'  •  '+s.tempo+' BPM',W-64,48,25,cream,'right');text(c,'Play-through '+pos.pass+' of '+p.passes,W-64,94,26,gold,'right');
  round(c,56,166,460,653,28,'#fff6dfff');
  text(c,pos.ending?'FINAL CHORD':pos.counting?'FINGERS READY':'PLAY THIS CHORD',286,210,23,ink,'center',700);
  block(c,chord==='--'?'Rest':chord,286,300,385,112,102,ink);
  if(s.showDiagrams&&chord!=='--')chordDiagram(c,chord,175,397,1.3,api);
  else text(c,chord==='--'?'Listen and count':'Keep a steady strum',286,495,29,ink,'center');
  text(c,pos.ending?'Let it ring…':next?'Next: '+(next.chord==='--'?'Rest':next.chord):'Keep this chord',286,758,35,ink,'center',700);
  round(c,551,166,1313,653,28,'#023d50cc','#b8f7e74d');
  if(p.options.sheetMusic&&api.score?.prepared){
   const prepared=api.score.prepared,state=root.UkeScorePlayback.state(prepared,phase,p,0);
   round(c,563,178,1289,629,22,'#ffffff');
   const label=ready?'Find your first chord':state.counting?'Count in · '+api.countWord(Math.min(p.countSteps/cfg.beat,Math.max(1,Math.floor((phase+p.countSteps)/cfg.beat)+1))):state.ending?'Final chord · let it ring':'SING & STRUM · MEASURE '+(state.bar+1);
   text(c,label,589,205,25,ink,'left',700);
   const notationRect={x:578,y:228,w:1259,h:560};
   if(!prepared.hasLyrics&&s.showLyrics&&(lyric.current||lyric.next)){notationRect.h=486;block(c,(lyric.current||lyric.next).text,1207,767,1180,55,32,ink);}
   api.score.renderer.draw(c,prepared,state,notationRect,{layout:'stack',font:26,motion:api.score.motion});
  }
  else if(ready){text(c,'GET READY TO PLAY',1207,375,55,gold,'center',700);text(c,'Find your first chord',1207,463,37,cream,'center');}
  else if(pos.counting&&!lyric.current){const count=Math.min(p.countSteps/cfg.beat,Math.floor((phase+p.countSteps)/cfg.beat)+1);text(c,'COUNT IN',1207,291,30,'#b9ede4','center');text(c,api.countWord(Math.max(1,count)),1207,437,100,gold,'center',800);if(s.showLyrics&&lyric.next)block(c,lyric.next.text,1207,643,1190,150,43,cream);}
  else if(pos.ending){text(c,'ONE FINAL STRUM',1207,369,55,gold,'center',700);text(c,'Let it ring…',1207,493,70,cream,'center',700);}
  else if(s.showLyrics&&(lyric.current||lyric.next)){block(c,lyric.current?.text||'Listen to the band',1207,385,1195,285,72,gold);if(lyric.next)block(c,lyric.next.text,1207,646,1195,155,43,'#d1eee6');if(lyric.current){const f=Math.max(0,Math.min(1,(phase-lyric.current.start)/(lyric.current.end-lyric.current.start)));round(c,609,782,1198,5,2,'#ffffff26');round(c,609,782,Math.max(1,1198*f),5,2,gold);}}
  else{text(c,'STRUM TOGETHER',1207,388,64,gold,'center',700);text(c,'Listen. Feel the beat. Make music.',1207,500,37,cream,'center');}
  const beatCount=pos.counting?p.countSteps/cfg.beat:cfg.beats,currentBeat=pos.counting?Math.floor((phase+p.countSteps)/cfg.beat):Math.floor(pos.tick%cfg.steps/cfg.beat);
  text(c,pos.ending?'WELL PLAYED':ready?'GET READY':pos.counting?'COUNT IN':'FEEL THE BEAT',64,883,25,'#c9f3e9');
  for(let i=0;i<beatCount;i++){const xx=98+i*105,active=!ready&&i===currentBeat;c.beginPath();c.arc(xx,955,35,0,Math.PI*2);c.fillStyle=active?gold:'#ffffff20';c.fill();text(c,i+1,xx,957,33,active?ink:cream,'center',700);}
  if(s.showStrum){hand(c,598,815,410,pose,assets);text(c,pos.counting?'Get ready':pos.ending?'Let it ring':({D:'Down strum',U:'Up strum',X:'Mute','.':'Rest'}[pose.stroke]||'Strum'),812,1032,23,cream,'center');}
  const pat=api.pattern;const size=Math.min(74,690/pat.length),start=1120;
  pat.forEach((v,i)=>{const xx=start+i*size,active=!pos.counting&&!pos.ending&&i===tick%cfg.steps;if(active)round(c,xx-24,905,49,88,10,'#ffe18d');text(c,{D:'↓',U:'↑',X:'×','.':'·'}[v.type],xx,938,48,active?ink:cream,'center');text(c,s.meter==='6/8'?i+1:i%2?'&':i/2+1,xx,979,20,active?ink:'#c8e7df','center');});
  text(c,pos.ending?'A beautiful finish':ready?'Your band is ready':pos.counting?'Listen for the first chord':'Measure '+(Math.floor(pos.tick/cfg.steps)+1),W-64,1040,23,'#ceeee4','right');
 }
 function wave(c,progress,time){
  // Three foamy, curved fronts travel across the entire frame. At midpoint
  // the canvas is fully covered, so scene changes never show through the wipe.
  const q=ease(progress),front=-420+q*(W*2+1320);
  const tail=front-W-600;
  for(const [offset,color] of [[65,'#cafff0'],[15,'#69e2d2'],[-55,'#16b5c2'],[-155,'#0784ac']]){
   c.beginPath();c.moveTo(tail,0);c.lineTo(front+offset,0);
   for(let y=0;y<=H+30;y+=18)c.lineTo(front+offset+Math.sin(y/148-time*1.7)*72+Math.cos(y/270)*90,y);
   c.lineTo(tail,H);c.closePath();c.fillStyle=color;c.fill();
  }
  c.strokeStyle='#ffffffb0';c.lineWidth=9;c.beginPath();for(let y=0;y<H;y+=12){const x=front+60+Math.sin(y/148-time*1.7)*72+Math.cos(y/270)*90;if(y===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
 }
 function pageTurn(c,r,outgoing,incoming){
  incoming();const q=ease(r),edge=W*(1-q),fold=Math.sin(Math.PI*q)*230;
  c.save();c.beginPath();c.rect(0,0,edge,H);c.clip();outgoing();c.restore();
  if(r<=0||r>=1)return;
  // A cream reverse face curls off the picture; the shadow falls on the new scene.
  c.save();c.shadowColor='#012a4566';c.shadowBlur=35;c.shadowOffsetX=18;
  const g=c.createLinearGradient(edge,0,edge+Math.max(1,fold),0);g.addColorStop(0,'#fdf5df');g.addColorStop(.6,'#f0e4c7');g.addColorStop(1,'#fffaf0');
  c.beginPath();c.moveTo(edge,0);c.bezierCurveTo(edge+fold*.2,H*.2,edge+fold*.45,H*.08,edge+fold,H*.07);c.lineTo(edge+fold,H*.93);c.bezierCurveTo(edge+fold*.45,H*.92,edge+fold*.2,H*.8,edge,H);c.closePath();c.fillStyle=g;c.fill();c.restore();
 }
 function iris(c,r,outgoing,incoming){
  outgoing();if(r<=0)return;const radius=(Math.hypot(W/2,H/2)+36)*ease(r);
  c.save();c.beginPath();c.arc(W/2,H/2,radius,0,Math.PI*2);c.clip();incoming();c.restore();
  if(r<1){c.save();c.strokeStyle='#fff4d99c';c.lineWidth=8;c.shadowColor='#ffe9bf';c.shadowBlur=25;c.beginPath();c.arc(W/2,H/2,radius,0,Math.PI*2);c.stroke();c.restore();}
 }
 function frame(c,time,p,s,assets,api){
  c.save();c.setTransform(c.canvas.width/W,0,0,c.canvas.height/H,0,0);c.clearRect(0,0,W,H);const sc=M.scene(time,p);
  if(sc.name==='title')title(c,time,p,s,assets);
  else if(sc.name==='song')songScene(c,time,p,s,assets,api);
  else if(sc.name==='ending'||sc.name==='done')title(c,Math.min(time,p.total),p,s,assets,true);
  else{const intro=sc.name==='intro-wave',r=sc.progress;
   const outgoing=(target=c)=>intro?title(target,time,p,s,assets):songScene(target,p.musicEnd-.001,p,s,assets,api);
   const incoming=(target=c)=>intro?songScene(target,p.countStart-.001,p,s,assets,api):title(target,time,p,s,assets,true);
   if(root.UkeIsland&&['collage','surf','palms','sand'].includes(p.options.transition))root.UkeIsland.transition(c,p.options.transition,r,outgoing,incoming,{text:p.options.title||s.title,box:intro?{x:245,y:296,w:1430,h:270,size:126}:{x:62,y:18,w:1320,h:110,size:49,align:'left'}});
   else if(p.options.transition==='page')pageTurn(c,r,outgoing,incoming);
   else if(p.options.transition==='iris')iris(c,r,outgoing,incoming);
   else{
    if(r<.5)outgoing();else incoming();
    if(p.options.transition==='wave')wave(c,r,time);
    else{c.fillStyle='rgba(2,40,57,'+(1-Math.abs(r*2-1))+')';c.fillRect(0,0,W,H);}
   }
  }
  c.restore();
 }
 root.UkeVideoRenderer={frame,lines,block};if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeVideoRenderer;
})(typeof window!=='undefined'?window:globalThis);
