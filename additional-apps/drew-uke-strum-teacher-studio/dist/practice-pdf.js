(function(root){
 'use strict';
 const countLabel=(meter,step)=>meter==='6/8'?String(step+1):step%2?'&':String(Math.floor(step/2)+1);
 // Keep each lyric phrase beneath its own measure range. No word timing is
 // inferred from phrase text; one- and two-measure phrases share a row.
 function phraseRows(song,withLyrics){
  const groups=[],rows=[];let i=0;
  while(i<song.measures.length){
   const m=song.measures[i];let end=i+1;
   if(!m.ending){
    const desired=withLyrics&&m.lyric?.trim()?i+Math.max(1,m.lyricSpan||1):i+4;
    while(end<song.measures.length&&end<desired&&!song.measures[end].ending&&!(withLyrics&&song.measures[end].lyric?.trim()))end++;
   }
   for(let start=i;start<end;start+=4){const length=Math.min(4,end-start);groups.push({start,length,units:Math.min(4,Math.max(2,length)),lyric:withLyrics&&!m.ending&&start===i?m.lyric?.trim()||'':'',continuedFrom:start>i&&withLyrics&&m.lyric?.trim()?i:null,ending:!!m.ending});}i=end;
  }
  for(const group of groups){const last=rows.at(-1);if(!group.ending&&last&&!last.some(g=>g.ending)&&last.reduce((n,g)=>n+g.units,0)+group.units<=4)last.push(group);else rows.push([group]);}
  return rows;
 }
 let fontBytesPromise;
 async function build(song,options,api){
  const P=root.PDFLib,doc=await P.PDFDocument.create();doc.registerFontkit(root.fontkit);
  if(!api.fontBytes&&!fontBytesPromise)fontBytesPromise=Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async name=>{const response=await fetch('assets/fonts/'+name);if(!response.ok)throw Error('The print fonts could not load. Please try again.');return new Uint8Array(await response.arrayBuffer());})).catch(e=>{fontBytesPromise=null;throw e;});
  const fontData=api.fontBytes||await fontBytesPromise,regular=await doc.embedFont(fontData[0],{subset:true}),bold=await doc.embedFont(fontData[1],{subset:true});
  const W=612,H=792,L=40,R=572,CW=532,limit=736,ink=options.ink?P.rgb(.12,.12,.12):P.rgb(.075,.21,.25),teal=options.ink?P.rgb(.1,.1,.1):P.rgb(.025,.43,.44),pale=options.ink?P.rgb(.965,.965,.965):P.rgb(.92,.967,.946),line=options.ink?P.rgb(.82,.82,.82):P.rgb(.79,.85,.84),muted=options.ink?P.rgb(.4,.4,.4):P.rgb(.33,.43,.45),white=P.rgb(1,1,1),jobs=[];
  let page,y=40;const pages=[],cfg=api.meters[song.meter],hasLyrics=options.lyrics&&song.measures.some(m=>m.lyric?.trim()&&!m.ending);
  const clean=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\u2011/g,'-');
  const measuring=api.createCanvas?api.createCanvas():root.document.createElement('canvas'),mc=measuring.getContext('2d');
  function width(value,size=11,strong=false){value=clean(value);try{return (strong?bold:regular).widthOfTextAtSize(value,size);}catch{mc.font=(strong?'700 ':'400 ')+size+'px Arial, sans-serif';return mc.measureText(value).width;}}
  function wrap(value,max,size=11,strong=false){const out=[];for(const para of clean(value).split('\n')){let current='';for(const word of para.split(/\s+/)){if(width(word,size,strong)>max){if(current){out.push(current);current='';}for(const char of word){if(width(current+char,size,strong)>max){out.push(current);current='';}current+=char;}continue;}const next=current?current+' '+word:word;if(current&&width(next,size,strong)>max){out.push(current);current=word;}else current=next;}out.push(current);}return out;}
  function text(value,x,top,size=11,strong=false,color=ink,align='left'){
   value=clean(value);const w=width(value,size,strong),xx=align==='center'?x-w/2:align==='right'?x-w:x,target=page;
   try{(strong?bold:regular).encodeText(value);target.drawText(value,{x:xx,y:H-top-size*.82,size,font:strong?bold:regular,color});}
   catch{jobs.push(async()=>{const canvas=api.createCanvas?api.createCanvas():root.document.createElement('canvas'),scale=4;canvas.width=Math.max(4,Math.ceil((w+4)*scale));canvas.height=Math.ceil(size*1.65*scale);const c=canvas.getContext('2d');c.scale(scale,scale);c.font=(strong?'700 ':'400 ')+size+'px Arial, sans-serif';c.fillStyle=`rgb(${Math.round(color.red*255)},${Math.round(color.green*255)},${Math.round(color.blue*255)})`;c.textBaseline='alphabetic';c.fillText(value,2,size*1.12);const img=await doc.embedPng(canvas.toDataURL('image/png'));target.drawImage(img,{x:xx-2,y:H-top-size*1.35,width:canvas.width/scale,height:canvas.height/scale});});}
  }
  function rect(x,top,w,h,fill=pale,border=null){page.drawRectangle({x,y:H-top-h,width:w,height:h,color:fill,borderColor:border||undefined,borderWidth:border?.6:0});}
  function rule(x1,top,x2,color=line,thickness=.7){page.drawLine({start:{x:x1,y:H-top},end:{x:x2,y:H-top},color,thickness});}
  function segment(x1,y1,x2,y2,color=ink,thickness=1){page.drawLine({start:{x:x1,y:H-y1},end:{x:x2,y:H-y2},color,thickness});}
  function circle(x,top,r,fill,border=null){page.drawCircle({x,y:H-top,size:r,color:fill||undefined,borderColor:border||undefined,borderWidth:border?1:0});}
  function newPage(first=false){page=doc.addPage([W,H]);pages.push(page);y=40;rect(0,0,W,6,teal);if(!first){text('MR. DREW’S UKE STRUM',L,30,8,true,teal);const titles=wrap(song.title,CW,17,true);for(const title of titles.slice(0,3)){text(title,L,y+8,17,true);y+=22;}text('PRACTICE SHEET / CONTINUED',L,y+10,8,false,muted);y+=35;rule(L,y-7,R);}}
  function ensure(h){if(y+h>limit)newPage();}
  function section(label){ensure(29);text(label,L,y,9,true,teal);y+=18;}
  const beat=step=>song.meter==='6/8'?String(step+1):`${Math.floor(step/2)+1}${step%2?' &':''}`;
  newPage(true);text('MR. DREW’S UKE STRUM',L,34,9,true,teal);text('TAKE-HOME PRACTICE',R,34,8,false,muted,'right');
  y=53;const titleSize=width(song.title,26,true)>CW*2?22:26;for(const l of wrap(song.title,CW,titleSize,true)){text(l,L,y,titleSize,true);y+=titleSize*1.18;}
  if(song.video?.composer){for(const l of wrap('Composed by '+song.video.composer,CW,10)){text(l,L,y+3,10,false,muted);y+=13;}y+=3;}
  y+=7;rect(L,y,CW,24,pale);text(`${song.meter} TIME`,L+10,y+8,8,true,teal);text(`${song.tempo} ${song.meter==='6/8'?'DOTTED-QUARTER ':''}BPM`,L+95,y+8,8,true,teal);text('G - C - E - A TUNING',R-10,y+8,8,false,muted,'right');y+=34;
  text('Name',L,y,9,false,muted);rule(L+34,y+10,380);text('Date',410,y,9,false,muted);rule(438,y+10,R);y+=26;
  const chords=[...new Set(song.measures.flatMap(m=>m.chords.map(c=>c.chord)).filter(c=>c!=='--'))];
  if(options.diagrams&&chords.length){section('01   FIND YOUR CHORDS');const perRow=Math.min(5,chords.length),cw=98,gap=10;
   for(let row=0;row<chords.length;row+=5){ensure(114);const list=chords.slice(row,row+5);list.forEach((name,i)=>{const x=L+i*(cw+gap),top=y,frets=api.fingerings[name],high=Math.max(...frets),first=high>4?Math.min(...frets.filter(f=>f>0)):1;rect(x,top,cw,102,pale);text(name,x+cw/2,top+10,17,true,teal,'center');const xx=x+26,yy=top+43,dx=15,dy=12;
    for(let j=0;j<4;j++){text('GCEA'[j],xx+j*dx,top+27,7,false,muted,'center');segment(xx+j*dx,yy,xx+j*dx,yy+4*dy,ink,.65);}
    for(let j=0;j<5;j++)segment(xx,yy+j*dy,xx+dx*3,yy+j*dy,ink,j===0&&first===1?2.3:.65);
    if(first>1)text(first+'fr',xx-5,yy+3,6,false,muted,'right');
    frets.forEach((f,j)=>{const cx=xx+j*dx;if(f===0)circle(cx,yy-7,2.2,null,teal);else if(f>0){const cy=yy+(f-first+.5)*dy;circle(cx,cy,5.1,teal);const finger=api.fingers[name]?.[j];if(finger)text(finger,cx,cy-3.2,7,true,white,'center');}});
   });if(list.length<=3&&row===0){const tx=L+list.length*(cw+gap)+8,tw=R-tx;const tip=wrap('Curve your fingers. Strum slowly. Let every string ring clearly.',tw,11);text('FINGERS READY?',tx,y+15,8,true,teal);tip.forEach((l,i)=>text(l,tx,y+36+i*16,11,false,muted));}y+=115;}
  }
  if(options.pattern){ensure(48);rect(L,y,CW,44,pale);text('YOUR STRUM',L+12,y+9,8,true,teal);text(api.pattern.name,L+12,y+25,9,false,muted);const pat=api.pattern.pattern,start=L+183,dx=Math.min(35,(CW-196)/pat.length);pat.forEach((p,i)=>{const x=start+i*dx,top=y+9;if(p.type==='D'||p.type==='U'){const up=p.type==='U',a=up?top+13:top,b=up?top:top+13;segment(x,a,x,b,teal,1.4);segment(x,b,x-3,b+(up?4:-4),teal,1.4);segment(x,b,x+3,b+(up?4:-4),teal,1.4);}else if(p.type==='X'){segment(x-4,top+2,x+4,top+11,teal,1.2);segment(x+4,top+2,x-4,top+11,teal,1.2);}else circle(x,top+7,1.4,muted);text(countLabel(song.meter,i),x,y+28,7,false,muted,'center');});y+=50;}
  section((options.diagrams&&chords.length?'02   ':'01   ')+(hasLyrics?'STRUM & SING':'FOLLOW THE CHORD CHANGES'));
  text(hasLyrics?'Sing the words beneath their matching measures.':'Each box is one measure. Change chords on the beat shown.',L,y-1,8.5,false,muted);y+=18;
  const musicRows=phraseRows(song,hasLyrics);
  for(let ri=0;ri<musicRows.length;ri++){
   const groups=musicRows[ri];
   if(groups.length===1&&groups[0].ending&&song.measures[groups[0].start].chords.length===1){
    ensure(29);rect(L,y,CW,23,pale);text('FINISH',L+10,y+8,8,true,teal);
    const change=song.measures[groups[0].start].chords[0],label=(change.chord==='--'?'Rest':change.chord)+' on '+(song.meter==='6/8'?'count ':'beat ')+beat(change.step);
    text(label,L+73,y+7,10,true,teal);text('One last strum. Let it ring.',R-10,y+8,8,false,muted,'right');y+=30;continue;
   }
   const units=groups.reduce((n,g)=>n+g.units,0),gap=12,space=CW-gap*(groups.length-1);
   const cards=groups.map(g=>{
    const w=space*g.units/units,bars=song.measures.slice(g.start,g.start+g.length),grids=[];
    for(let i=0;i<bars.length;i+=4){const part=bars.slice(i,i+4);grids.push({start:i,bars:part,h:20+26*Math.max(...part.map(m=>Math.ceil(m.chords.length/3)))});}
    const gridH=grids.reduce((n,r)=>n+r.h+5,0)-5;
    const lines=g.lyric?wrap(g.lyric,w-20,12):[];
    const m=bars[0],pickup=m.lyricPickup==null?(song.lyricPickup||0):m.lyricPickup,cues=[];
    if(g.lyric&&m.lyricStart)cues.push('Start on '+(song.meter==='6/8'?'count ':'beat ')+beat(m.lyricStart));
    if(g.lyric&&pickup)cues.push('Pickup: '+pickup+' beat'+(pickup===1?'':'s')+' early');
    if(g.continuedFrom!=null)cues.push('Continue the words from measure '+(g.continuedFrom+1)+'.');
    const cueLines=cues.length?wrap(cues.join(' · '),w-20,7.5):[];
    return {...g,w,bars,grids,gridH,lines,cueLines};
   });
   const gridH=Math.max(...cards.map(c=>c.gridH)),rowH=Math.max(...cards.map(c=>gridH+(c.lines.length||c.cueLines.length?10+c.lines.length*16+c.cueLines.length*11+9:0)))+12;
   const nextEnding=musicRows[ri+1]?.length===1&&musicRows[ri+1][0].ending&&song.measures[musicRows[ri+1][0].start].chords.length===1;
   const lastMusic=ri===musicRows.length-1||(nextEnding&&ri===musicRows.length-2);
   const tail=lastMusic?(nextEnding?30:0)+[options.goal,options.note].filter(Boolean).reduce((n,v)=>n+28+wrap(v,CW-24,10.5).length*14,0)+(options.checklist?32:0):0;
   ensure(rowH+tail<500?rowH+tail:rowH);
   let x=L;const top=y;
   for(const card of cards){
    let gy=top;
    for(const grid of card.grids){const cell=card.w/grid.bars.length;
     grid.bars.forEach((m,i)=>{
      const bx=x+i*cell;rect(bx,gy,cell-.5,grid.h,pale);text(m.ending?'FINAL STRUM':'MEASURE '+(card.start+grid.start+i+1),bx+9,gy+7,7,true,muted);
      const cols=Math.min(3,m.chords.length),colw=(cell-18)/cols;
      m.chords.forEach((change,j)=>{const xx=bx+9+(j%3)*colw,cy=gy+20+Math.floor(j/3)*26,name=change.chord==='--'?'Rest':change.chord;let size=15;while(width(name,size,true)>colw-3&&size>8)size--;text(name,xx,cy,size,true,teal);text((song.meter==='6/8'?'Count ':'Beat ')+beat(change.step),xx,cy+17,6.5,false,muted);});
     });gy+=grid.h+5;
    }
    let ly=top+gridH+10;
    for(const l of card.lines){text(l,x+9,ly,12);ly+=16;}
    if(card.cueLines.length)ly+=2;
    for(const l of card.cueLines){text(l,x+9,ly,7.5,false,muted);ly+=11;}
    if(card.lines.length)rule(x,top+rowH-12,x+card.w);
    x+=card.w+gap;
   }
   y=top+rowH;
  }
  const notes=[['MY GOAL',options.goal],['TEACHER’S NOTE',options.note]].filter(x=>x[1]);
  for(const [name,value]of notes){const ls=wrap(value,CW-24,10.5);ensure(Math.min(34+ls.length*14,500));section(name);for(const l of ls){ensure(17);text(l,L+10,y,10.5);y+=14;}y+=10;}
  if(options.checklist){
   const compact=limit-y<79&&limit-y>=32;ensure(compact?32:79);rule(L,y,R);y+=compact?5:12;
   text('A LITTLE PRACTICE, EVERY DAY',L,y,8.5,true,teal);text('5 minutes is a great start.',R,y,9,false,muted,'right');y+=compact?15:19;
   if(!compact){const routine=hasLyrics?'Find your chords. Practice the changes. Strum and sing.':'Find your chords. Practice the changes. Keep a steady beat.';text(routine,L,y,9.2,false,muted);y+=21;}
   ['MON','TUE','WED','THU','FRI'].forEach((d,i)=>{const x=L+i*CW/5;rect(x,y,11,11,white,muted);text(d,x+18,y+2,8,true,teal);});y+=15;
  }
  pages.forEach((p,i)=>{page=p;rule(L,756,R);text('Made with Mr. Drew’s Uke Strum',L,767,7,false,muted);text(`${i+1} / ${pages.length}`,R,767,7,false,muted,'right');});
  await Promise.all(jobs.map(j=>j()));doc.setTitle(song.title+' - Ukulele Practice');doc.setAuthor('Mr. Drew’s Uke Strum');doc.setSubject('Take-home ukulele practice with chord changes and lyrics');return doc.save();
 }
 root.UkePracticePDF={build,countLabel,phraseRows};if(typeof module!=='undefined'&&module.exports)module.exports=root.UkePracticePDF;
})(typeof window!=='undefined'?window:globalThis);
