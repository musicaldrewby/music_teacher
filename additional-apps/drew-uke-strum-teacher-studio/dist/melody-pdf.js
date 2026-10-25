(function(root){
 'use strict';let fonts;
 async function build(score,title,api={}){
  const P=root.PDFLib,doc=await P.PDFDocument.create();doc.registerFontkit(root.fontkit);
  if(!api.fontBytes&&!fonts)fonts=Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async n=>{const r=await fetch('assets/fonts/'+n);if(!r.ok)throw Error('The print fonts could not load.');return new Uint8Array(await r.arrayBuffer());})).catch(e=>{fonts=null;throw e;});
  const bytes=api.fontBytes||await fonts,regular=await doc.embedFont(bytes[0],{subset:true}),bold=await doc.embedFont(bytes[1],{subset:true});
  if(root.document?.fonts)await root.document.fonts.load('15px UkePrint');
  const ink=P.rgb(.08,.21,.25),teal=P.rgb(.025,.43,.44),pages=[];let page,y;
  const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ');
  function draw(text,x,top,size=10,font=regular){page.drawText(clean(text),{x,y:792-top-size,font,size,color:ink});}
  function wrap(s,size,max,font=regular){let lines=[],line='';for(const word of clean(s).split(/\s+/)){if(font.widthOfTextAtSize(word,size)>max){if(line){lines.push(line);line='';}for(const c of word){if(font.widthOfTextAtSize(line+c,size)>max){lines.push(line);line='';}line+=c;}continue;}if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
  function newPage(){page=doc.addPage([612,792]);pages.push(page);page.drawRectangle({x:0,y:786,width:612,height:6,color:teal});y=30;draw('MR. DREW’S UKE STRUM  /  MELODY SCORE',42,y,8,bold);y+=23;for(const l of wrap(title,pages.length===1?23:16,528,bold)){draw(l,42,y,pages.length===1?23:16,bold);y+=pages.length===1?28:20;}
   if(pages.length===1){if(score.composer){for(const l of wrap('Composed by '+score.composer,10,528)){draw(l,42,y+3);y+=14;}}draw(score.meter+' time   ·   '+score.key+'   ·   '+score.tempo+' BPM ('+root.UkeMelody.meters[score.meter].label.toLowerCase()+')',42,y+7,9);y+=35;const feel=root.UkeMelody.feelMark(score);if(feel){draw(feel,42,y,10,bold);y+=20;}}else y+=12;
  }
  newPage();const makeCanvas=api.createCanvas||(()=>root.document.createElement('canvas'));
  for(let i=0;i<score.measures.length;){
   const density=m=>m.notes.reduce((n,e)=>n+Math.max(28,(e.lyric||'').length*9+12),150);
   const count=i+1<score.measures.length&&density(score.measures[i])<=470&&density(score.measures[i+1])<=470?2:1;
   const width=count===2?510:Math.max(1040,density(score.measures[i])),pdfWidth=528/count,height=280*pdfWidth/(width-36),rowHeight=height+7;
   if(y+rowHeight>735)newPage();
   for(let j=0;j<count;j++){
    const canvas=makeCanvas();root.UkeMelodyRenderer.measure(canvas,score,i+j,{width,scale:3,showClef:j===0,showTime:i+j===0,last:i+j===score.measures.length-1});
    const strip=makeCanvas();strip.width=canvas.width-108;strip.height=canvas.height;strip.getContext('2d').drawImage(canvas,54,0,strip.width,strip.height,0,0,strip.width,strip.height);
    const png=await doc.embedPng(strip.toDataURL('image/png'));page.drawImage(png,{x:42+j*pdfWidth,y:792-y-height,width:pdfWidth,height});
   }
   y+=rowHeight;i+=count;
  }
  pages.forEach((p,i)=>{page=p;page.drawLine({start:{x:42,y:35},end:{x:570,y:35},thickness:.5,color:P.rgb(.76,.83,.81)});draw('Made with Mr. Drew’s Uke Strum',42,764,7);draw((i+1)+' / '+pages.length,540,764,7);});
  doc.setTitle(title+' - Melody Score');doc.setAuthor(score.composer||'Mr. Drew’s Uke Strum');return doc.save();
 }
 root.UkeMelodyPDF={build};if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeMelodyPDF;
})(typeof window!=='undefined'?window:globalThis);
