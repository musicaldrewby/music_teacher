/* Exact vector flag artwork, drawn locally at high resolution. No external assets. */
(function(global){
  'use strict';
  const ratios={us:1.9,nm:1.5};
  function star(ctx,x,y,r){
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.38196601125:r;
      const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    ctx.closePath();ctx.fill();
  }
  function paint(ctx,type,w,h){
    ctx.clearRect(0,0,w,h);ctx.save();ctx.scale(w/(ratios[type]*1000),h/1000);
    if(type==='us'){
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1900,1000);
      ctx.fillStyle='#b31942';
      for(let row=0;row<13;row+=2)ctx.fillRect(0,row*1000/13,1900,1000/13);
      const cw=760,ch=7000/13;
      ctx.fillStyle='#0a3161';ctx.fillRect(0,0,cw,ch);ctx.fillStyle='#fff';
      for(let row=0;row<9;row++)for(let col=0;col<(row%2?5:6);col++)star(ctx,(2*col+(row%2?2:1))*cw/12,(row+1)*ch/10,30.8);
    }else{
      ctx.fillStyle='#ffd700';ctx.fillRect(0,0,1500,1000);
      ctx.translate(750,500);ctx.strokeStyle='#bf0a30';ctx.lineWidth=14;ctx.lineCap='butt';
      const radius=500/6;
      ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
      for(let group=0;group<4;group++){
        ctx.save();ctx.rotate(group*Math.PI/2);
        [-45,-15,15,45].forEach((offset,i)=>{
          const start=Math.sqrt(radius*radius-offset*offset)-3;
          const innerEnd=250-7;
          const end=(i===1||i===2)?innerEnd:start+(innerEnd-start)/1.2;
          ctx.beginPath();ctx.moveTo(offset,-start);ctx.lineTo(offset,-end);ctx.stroke();
        });ctx.restore();
      }
    }
    ctx.restore();
  }
  function texture(type){
    const c=document.createElement('canvas');c.width=ratios[type]*1000;c.height=1000;
    const ctx=c.getContext('2d');paint(ctx,type,c.width,c.height);
    // Subtle seam and fine weave, kept well below the flag's graphic contrast.
    ctx.save();ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;
    ctx.setLineDash([4,4]);ctx.strokeRect(8,8,c.width-16,c.height-16);ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,.018)';for(let x=0;x<c.width;x+=3)ctx.fillRect(x,0,1,c.height);
    ctx.fillStyle='rgba(0,0,0,.018)';for(let y=0;y<c.height;y+=3)ctx.fillRect(0,y,c.width,1);
    ctx.restore();return c;
  }
  function shape(u,t,h){
    const p=u*8.8-t;
    const secondary=u*15.7-t*1.32;
    return {
      dy:h*(.032*u*Math.sin(p)+.012*u*Math.sin(secondary)+.014*u),
      scale:1+.019*u*Math.sin(p-.8)+.007*u*Math.sin(secondary+.4),
      light:.65*Math.cos(p)+.28*Math.cos(secondary)+.07*Math.sin(u*29-t)
    };
  }
  class WavingFlag{
    constructor(canvas,type){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.type=type;
      this.textures={us:texture('us'),nm:texture('nm')};this.time=0;this.running=false;this.frameId=0;this.last=0;
      this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(canvas);
      this.draw();
    }
    setType(type){this.type=type;this.draw()}
    setRunning(running){
      this.running=running;cancelAnimationFrame(this.frameId);this.last=0;
      if(running)this.frameId=requestAnimationFrame(t=>this.tick(t));else this.draw();
    }
    tick(now){
      if(!this.running)return;
      if(this.last)this.time+=Math.min((now-this.last)/1000,.05)*.85;
      this.last=now;this.draw();this.frameId=requestAnimationFrame(t=>this.tick(t));
    }
    draw(){
      const canvas=this.canvas,ctx=this.ctx,rect=canvas.getBoundingClientRect();
      const w=rect.width,h=rect.height;if(!w||!h)return;
      const dpr=Math.min(global.devicePixelRatio||1,2);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const ratio=ratios[this.type],fw=Math.min(w*.916,h*.82*ratio),fh=fw/ratio;
      const left=(w-fw)/2+3,top=(h-fh)/2-8;
      // Brushed metal pole, attached along the flag's fixed hoist.
      const poleWidth=Math.max(3.5,w*.008),poleX=left-poleWidth*.9;
      const poleTop=Math.max(8,top-21),poleBottom=Math.min(h-7,top+fh+40);
      const metal=ctx.createLinearGradient(poleX,0,poleX+poleWidth,0);
      metal.addColorStop(0,'#727a7f');metal.addColorStop(.4,'#e1d8bf');metal.addColorStop(.65,'#afb0a8');metal.addColorStop(1,'#545e68');
      ctx.fillStyle=metal;ctx.fillRect(poleX,poleTop,poleWidth,poleBottom-poleTop);
      const finial=ctx.createRadialGradient(poleX+poleWidth*.3,poleTop-4,0,poleX+poleWidth/2,poleTop-3,poleWidth*1.4);
      finial.addColorStop(0,'#f8e6ba');finial.addColorStop(.4,'#cfb16f');finial.addColorStop(1,'#897343');
      ctx.fillStyle=finial;ctx.beginPath();ctx.arc(poleX+poleWidth/2,poleTop-4,poleWidth*1.15,0,Math.PI*2);ctx.fill();
      const tex=this.textures[this.type];
      const strips=Math.ceil(fw/1.5),sw=tex.width/strips;
      for(let i=0;i<strips;i++){
        const u=i/strips,un=(i+1)/strips,s=shape(u,this.time,fh);
        const x=left+fw*(u-.012*u*u+.003*u*Math.sin(u*8.8-this.time));
        const nx=left+fw*(un-.012*un*un+.003*un*Math.sin(un*8.8-this.time));
        const stripWidth=nx-x+.65,y=top+s.dy,stripHeight=fh*s.scale;
        ctx.drawImage(tex,i*sw,0,sw,tex.height,x,y,stripWidth,stripHeight);
        ctx.fillStyle=s.light>0?'rgba(255,255,255,'+(s.light*.105)+')':'rgba(4,13,29,'+(-s.light*.22)+')';
        ctx.fillRect(x,y,stripWidth,stripHeight);
      }
      // Narrow hoist seam remains fixed as the free end ripples.
      ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(left,top,1.2,fh);
    }
  }
  global.FlagArt={paint,ratios,shape,WavingFlag};
})(window);
