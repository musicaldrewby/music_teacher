(function(root){
 'use strict';
 function measure(canvas,score,index,options={}){
  const V=root.Vex?.Flow||root.Vex||root.VexFlow,M=root.UkeMelody,w=options.width||720,h=280,scale=options.scale||1,bar=score.measures[index];
  canvas.width=Math.ceil(w*scale);canvas.height=Math.ceil(h*scale);const raw=canvas.getContext('2d');raw.scale(scale,scale);raw.fillStyle='#ffffff';raw.fillRect(0,0,w,h);raw.fillStyle='#17383d';raw.strokeStyle='#17383d';
  const ctx=new V.CanvasContext(raw),stave=new V.Stave(18,58,w-36,{spacing_between_lines_px:12});
  if(options.showClef!==false){stave.addClef('treble');if(score.key!=='C'&&score.key!=='Am')stave.addKeySignature(score.key);}if(options.showTime!==false)stave.addTimeSignature(score.meter==='2/2'?'C|':score.meter);
  if(options.last)stave.setEndBarType(V.Barline.type.END);
  stave.setContext(ctx).draw();
  raw.font='600 '+(options.measureFont||12)+'px UkePrint, Arial';raw.fillStyle='#527076';if(score.measureNumbers)raw.fillText(String(index+1),21,21);
  const events=[...M.resolved(score,index),...M.rests(score,index)],notes=events.map(n=>{
   const vf=new V.StaveNote({clef:'treble',keys:[n.rest?(n.duration==='w'?'d/5':'b/4'):n.vexKey],duration:n.duration+(n.dotted?'d':'')+(n.rest?'r':''),auto_stem:true,align_center:!!n.barRest});
   if(n.dotted)V.Dot.buildAndAttach([vf]);
   if(n.generated&&options.editable)vf.setStyle({fillStyle:'#a9babc',strokeStyle:'#a9babc'});
   if(n.index===options.selected&&!n.generated)vf.setStyle({fillStyle:'#087f86',strokeStyle:'#087f86'});
   if(n.lyric){const a=new V.Annotation(n.lyric).setFont('UkePrint, Arial',options.lyricFont||15).setVerticalJustification(V.Annotation.VerticalJustify.BOTTOM);a.draw=function(){return this;};vf.addModifier(a,0);}
   return vf;
  });
  const time=M.meters[score.meter],voice=new V.Voice({num_beats:time.n,beat_value:time.d}).setMode(V.Voice.Mode.SOFT).addTickables(notes);
  V.Accidental.applyAccidentals([voice],score.key);
  const formatter=new V.Formatter().joinVoices([voice]);formatter.formatToStave([voice],stave,{align_rests:true});
  const groups=score.meter==='6/8'?[new V.Fraction(3,8)]:score.meter==='7/8'?[new V.Fraction(2,8),new V.Fraction(2,8),new V.Fraction(3,8)]:score.meter==='2/2'?[new V.Fraction(1,2)]:[new V.Fraction(1,4)];
  const beams=V.Beam.generateBeams(notes,{groups});ctx.setFillStyle('#17383d');ctx.setStrokeStyle('#17383d');voice.draw(ctx,stave);beams.forEach(b=>b.setContext(ctx).draw());
  const positions=notes.map((n,i)=>({event:events[i],x:n.getAbsoluteX(),y:n.getYs()[0],box:n.getBoundingBox()}));
  raw.font=(options.lyricFont||15)+'px UkePrint, Arial';raw.fillStyle='#17383d';raw.textAlign='center';for(const p of positions)if(p.event.lyric)raw.fillText(p.event.lyric,p.x+5,224);raw.textAlign='left';
  function atX(at){const exact=positions.find(p=>p.event.at===at);if(exact&&!exact.event.barRest)return exact.x+5;const left=positions.filter(p=>p.event.at<at).at(-1),right=positions.find(p=>p.event.at>at);if(left&&right)return left.x+5+(right.x-left.x)*(at-left.event.at)/(right.event.at-left.event.at);return stave.getNoteStartX()+((w-36)-stave.getNoteStartX())*at/M.capacity(score.meter);}
  raw.font='bold '+(options.chordFont||17)+'px UkePrint, Arial';raw.fillStyle='#096d76';raw.textAlign='left';const chordRows=[-Infinity,-Infinity,-Infinity];
  for(const chord of bar.chords){let x=Math.min(w-raw.measureText(chord.name).width-18,Math.max(stave.getNoteStartX(),atX(chord.at)));let row=chordRows.findIndex(end=>end+7<x);if(row<0)row=2;raw.fillText(chord.name,x,40+row*18);chordRows[row]=x+raw.measureText(chord.name).width;}
  if(options.editable){raw.font='13px UkePrint, Arial';raw.fillStyle='#668286';raw.fillText(options.entryMode==='edit'?'Tap a note’s column to select it. Use the pitch buttons or arrow keys to adjust it.':'Tap a pitch to add the next note. Notes are placed in order for you.',20,h-15);}
  const bottom=stave.getYForLine(4),spacing=stave.getSpacingBetweenLines();
  return {width:w,height:h,positions,bottom,spacing,noteStart:stave.getNoteStartX(),pitchAt(y){const step=Math.round((bottom-y)/(spacing/2))+30;const bounded=Math.min(48,Math.max(21,step));return 'cdefgab'[bounded%7]+'/'+Math.floor(bounded/7);}};
 }
 root.UkeMelodyRenderer={measure};if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeMelodyRenderer;
})(typeof window!=='undefined'?window:globalThis);
