(function(root){
 'use strict';
 const density=(m,font)=>m.notes.reduce((n,v)=>n+Math.max(32,(v.lyric||'').length*font*.6+18),180);
 function create(options={}){
  let current=null,cache=new Map();const makeCanvas=options.createCanvas||(()=>document.createElement('canvas'));
  function ready(prepared){if(current!==prepared){current=prepared;cache.clear();}}
  function measure(prepared,index,width,font,lyrics){
   ready(prepared);const key=[index,width,font,lyrics].join(':');if(cache.has(key))return cache.get(key);
   // The fixed slot heading owns the measure number, even when the staff pans.
   const score={...prepared.score,measureNumbers:false,measures:lyrics?prepared.score.measures:prepared.score.measures.map(m=>({...m,notes:m.notes.map(n=>({...n,lyric:''}))}))};
   const natural=Math.max(width,density(score.measures[index],font)),canvas=makeCanvas();
   const geometry=root.UkeMelodyRenderer.measure(canvas,score,index,{width:natural,scale:2,lyricFont:font,chordFont:font+2,showTime:index===0,last:index===score.measures.length-1});
   const value={canvas,geometry};cache.set(key,value);while(cache.size>6)cache.delete(cache.keys().next().value);return value;
  }
  function layout(prepared,state,rect,options={}){
   ready(prepared);
   // Count performed measures, not just written bar numbers: an odd-length
   // repeat must continue alternating slots without moving the upcoming bar.
   const ordinal=state.ordinal??state.bar-(state.first||0),activeSlot=ordinal%2,next=state.nextBar??null;
   const previous=ordinal>0?(state.bar===state.first?state.last:state.bar-1):null;
   const elapsed=Math.max(0,(state.tick-state.bar*prepared.cfg.steps)*prepared.second),duration=Math.min(.32,prepared.cfg.steps*prepared.second*.2);
   const changing=options.motion!==false&&!state.counting&&!state.ending&&previous!==null&&previous!==next&&elapsed<duration;
   const progress=changing?Math.min(1,elapsed/duration):1;
   const slots=[0,1].map(slot=>({slot,bar:slot===activeSlot?state.bar:next,active:slot===activeSlot,previous:slot!==activeSlot&&changing?previous:null}));
   return {slots,activeSlot,progress,changing,font:options.font||22};
  }
  function draw(ctx,prepared,state,rect,options={}){
   const page=layout(prepared,state,rect,options),font=page.font,lyrics=prepared.showLyrics,result=[],cellH=rect.h/2;
   ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();ctx.fillStyle='#ffffff';ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
   function drawBar(bar,slot,isCurrent,alpha=1,outgoing=false){
    if(alpha<=0)return;
    const x=rect.x,y=rect.y+slot*cellH,staffY=y+24,scale=Math.min(1.1,(cellH-24)/256),logicalWidth=rect.w/scale;
    ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.rect(x,y,rect.w,cellH);ctx.clip();
    if(bar===null){
     ctx.fillStyle='#668681';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 '+Math.max(15,font*.8)+'px UkePrint, Arial';ctx.fillText(state.ending?'Let it ring…':'Final chord next',x+rect.w/2,y+cellH/2);ctx.restore();return;
    }
    const item=measure(prepared,bar,logicalWidth,font,lyrics),g=item.geometry,active=isCurrent?state.active:null,point=active?g.positions.find(p=>!p.event.generated&&p.event.index===active.index):null;
    let cursor=point?.x??g.noteStart;
    if(point){const next=g.positions.find(p=>p.event.at>point.event.at),endX=next?next.x:Math.max(cursor+25,g.width-28);cursor+=(endX-cursor)*state.progress;}
    else if(isCurrent){const local=Math.max(0,state.tick-bar*prepared.cfg.steps)*8,left=g.positions.filter(p=>p.event.at<=local).at(-1),right=g.positions.find(p=>p.event.at>local);if(left){const end=right?.event.at??root.UkeMelody.capacity(prepared.score.meter),f=Math.max(0,Math.min(1,(local-left.event.at)/(end-left.event.at||1)));cursor=left.x+((right?.x??g.width-28)-left.x)*f;}}
    const maxPan=Math.max(0,g.width-logicalWidth),target=isCurrent?cursor+5:outgoing?g.width:0,pan=Math.max(0,Math.min(maxPan,target-logicalWidth*.62));
    ctx.drawImage(item.canvas,pan*2,0,logicalWidth*2,560,x,staffY,rect.w,280*scale);
    const playing=isCurrent&&!state.counting&&!state.ending;
    if(playing){
     ctx.strokeStyle='#0e837e';ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,rect.w-4,cellH-4);
     const cx=x+(cursor+5-pan)*scale;ctx.fillStyle='#eaba2833';ctx.fillRect(cx-10*scale,staffY+66*scale,20*scale,170*scale);ctx.strokeStyle='#0e837e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,staffY+76*scale);ctx.lineTo(cx,staffY+238*scale);ctx.stroke();
     if(point&&!active.rest){ctx.beginPath();ctx.arc(x+(point.x+5-pan)*scale,staffY+point.y*scale,13*scale,0,Math.PI*2);ctx.fillStyle='#ffc93566';ctx.fill();}
     if(point?.event.lyric&&lyrics){ctx.font=font*scale+'px UkePrint, Arial';ctx.textAlign='center';ctx.textBaseline='alphabetic';const lx=x+(point.x+5-pan)*scale,ly=staffY+224*scale,w=ctx.measureText(point.event.lyric).width;ctx.fillStyle='#ffe28c';ctx.fillRect(lx-w/2-5,ly-font*scale-2,w+10,font*scale+8);ctx.fillStyle='#064c56';ctx.fillText(point.event.lyric,lx,ly);}
    }
    ctx.font='700 '+Math.max(12,16*scale)+'px UkePrint, Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=playing?'#08766f':'#58756e';
    const label=outgoing?'':isCurrent?(state.counting?'GET READY':state.ending?'FINISH':'PLAYING'):'UP NEXT';ctx.fillText('MEASURE '+(bar+1)+(label?' · '+label:''),x+14,y+14);
    ctx.restore();
    if(!outgoing)result.push({bar,slot,x,y,width:rect.w,height:cellH,active:isCurrent,pan,opacity:alpha});
   }
   for(const slot of page.slots){
    if(slot.previous!==null){
     // Fade through white instead of overlaying two different sets of notes.
     drawBar(slot.previous,slot.slot,false,Math.max(0,1-page.progress*2),true);
     drawBar(slot.bar,slot.slot,false,Math.max(0,page.progress*2-1));
    }else drawBar(slot.bar,slot.slot,slot.active);
   }
   ctx.strokeStyle='#d9e7e1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(rect.x+12,rect.y+cellH);ctx.lineTo(rect.x+rect.w-12,rect.y+cellH);ctx.stroke();
   ctx.restore();return result;
  }
  return {draw,layout,clear(){current=null;cache.clear();}};
 }
 root.UkeScoreRenderer={create};if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeScoreRenderer;
})(typeof window!=='undefined'?window:globalThis);
