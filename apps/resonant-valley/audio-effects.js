const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
export function echoSeconds(bpm){return 60/clamp(bpm,40,220);}
function impulse(ctx){const b=ctx.createBuffer(2,ctx.sampleRate*1.7,ctx.sampleRate);for(let c=0;c<2;c++){const a=b.getChannelData(c);let seed=8731+c;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;const t=i/a.length;a[i]=(seed/4294967296*2-1)*Math.pow(1-t,3.7)*.42;}}return b;}
// Shared by live playback and offline WAV export.
export function effectsGraph(ctx,volume=.65,room=0,echo=0,bpm=96){
 const input=ctx.createGain(),master=ctx.createGain(),comp=ctx.createDynamicsCompressor(),wet=ctx.createGain(),rev=ctx.createConvolver(),hp=ctx.createBiquadFilter();
 comp.threshold.value=-12;comp.knee.value=15;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.16;
 master.gain.value=volume*1.1;wet.gain.value=clamp(room,0,.6);rev.buffer=impulse(ctx);hp.type='highpass';hp.frequency.value=250;
 input.connect(comp);input.connect(hp);hp.connect(rev);rev.connect(wet);wet.connect(comp);comp.connect(master);master.connect(ctx.destination);
 const delay=ctx.createDelay(2),echoWet=ctx.createGain(),feedback=ctx.createGain(),echoFilter=ctx.createBiquadFilter();
 delay.delayTime.value=echoSeconds(bpm);echoWet.gain.value=clamp(echo,0,.5);feedback.gain.value=.32;echoFilter.type='lowpass';echoFilter.frequency.value=4200;
 input.connect(delay);delay.connect(echoFilter);echoFilter.connect(echoWet);echoWet.connect(comp);echoFilter.connect(feedback);feedback.connect(delay);
 return {input,master,wet,comp,delay,echoWet};
}
