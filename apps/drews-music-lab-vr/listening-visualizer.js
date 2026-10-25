// A small canvas texture driven by the shared-song audio bus, not note events.
export class ListeningVisualizer{
 constructor(canvas){this.canvas=canvas;canvas.width=960;canvas.height=280;this.low=0;this.high=0;this.level=0;this.freq=null;this.wave=null;}
 draw(time,analyser,playing){
  const c=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height,t=time/1000;
  let low=0,high=0,level=0;
  if(playing&&analyser){
   if(this.freq?.length!==analyser.frequencyBinCount){this.freq=new Uint8Array(analyser.frequencyBinCount);this.wave=new Uint8Array(analyser.fftSize);}
   analyser.getByteFrequencyData(this.freq);analyser.getByteTimeDomainData(this.wave);
   const hz=analyser.context.sampleRate/analyser.fftSize;
   let nl=0,nh=0;for(let i=1;i<this.freq.length;i++){const f=i*hz,v=this.freq[i]/255;if(f<260){low+=v;nl++;}if(f>1800&&f<7000){high+=v;nh++;}}
   low/=Math.max(1,nl);high/=Math.max(1,nh);for(const v of this.wave)level+=((v-128)/128)**2;level=Math.min(1,Math.sqrt(level/this.wave.length)*3);
  }
  this.low+=(low-this.low)*.16;this.high+=(high-this.high)*.13;this.level+=(level-this.level)*.18;
  const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#071626');bg.addColorStop(.55,'#162348');bg.addColorStop(1,'#072e39');c.fillStyle=bg;c.fillRect(0,0,w,h);
  // Broad concentric ripples breathe with low-frequency energy.
  for(let i=0;i<4;i++){const radius=35+i*42+this.low*100;c.strokeStyle=`rgba(102,226,217,${.04+this.low*.17})`;c.lineWidth=1+this.low*2;c.beginPath();c.ellipse(w*.5,h*.5,radius*1.8,radius*.6,0,0,Math.PI*2);c.stroke();}
  for(let ribbon=0;ribbon<3;ribbon++){
   c.beginPath();for(let i=0;i<=120;i++){const x=i/120*w,u=i/120,envelope=Math.sin(u*Math.PI),sample=playing&&this.wave?((this.wave[Math.floor(u*(this.wave.length-1))]-128)/128):0;
    const y=h*.5+Math.sin(u*9+t*.35+ribbon*1.7)*envelope*(12+this.low*53)+Math.cos(u*15-t*.24+ribbon)*envelope*(6+this.level*24)+sample*envelope*(14+this.level*50)+(ribbon-1)*16;
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
   }
   c.strokeStyle=['#6be5dd','#b9a0ff','#f5ca79'][ribbon];c.lineJoin='round';c.lineCap='round';c.globalAlpha=.07;c.lineWidth=12+this.level*10;c.stroke();c.globalAlpha=.65+this.level*.3;c.lineWidth=2+this.level*3;c.stroke();
  }
  c.globalAlpha=1;for(let i=0;i<24;i++){const alpha=Math.max(0,this.high-.05)*(0.3+0.7*Math.sin(t*.6+i)**2);if(alpha<.01)continue;const x=(i*.618033%1)*w,y=h*.5+Math.sin(i*2.4+t*.13)*h*.36;c.fillStyle=`rgba(239,240,255,${alpha})`;c.beginPath();c.arc(x,y,1+this.high*2.5,0,Math.PI*2);c.fill();}
  if(!playing){c.fillStyle='#c8dce9';c.font='500 22px sans-serif';c.textAlign='center';c.fillText('Choose a song below · press Play to listen',w/2,h-24);}
 }
}
