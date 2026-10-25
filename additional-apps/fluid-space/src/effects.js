import {DEFAULT_FX,clone,clamp} from './model.js';
class Line{constructor(n){this.b=new Float32Array(n);this.p=0}read(delay){let x=this.p-clamp(delay,1,this.b.length-2);if(x<0)x+=this.b.length;const i=Math.floor(x),f=x-i;return this.b[i]*(1-f)+this.b[(i+1)%this.b.length]*f}put(x){this.b[this.p]=x;this.p=(this.p+1)%this.b.length}clear(){this.b.fill(0)}}
class Allpass{constructor(n){this.d=new Line(n+4);this.n=n}run(x,g){const z=this.d.read(this.n),y=z-g*x;this.d.put(x+g*y);return y}}
const coeff=(hz,sr)=>1-Math.exp(-2*Math.PI*clamp(hz,10,sr*.45)/sr);
const limit=x=>Math.abs(x)<.85?x:Math.sign(x)*(.85+.15*Math.tanh((Math.abs(x)-.85)/.15));
const LEFT_WEIGHTS=[1,1,-1,1,-1,-1,1,-1],RIGHT_WEIGHTS=[1,-1,1,1,-1,1,-1,-1];
export class SpaceEffects{
 constructor(sr){this.sr=sr;this.fx=clone(DEFAULT_FX);this.delay=[new Line(Math.ceil(sr*8)+4),new Line(Math.ceil(sr*8)+4)];this.pre=new Line(Math.ceil(sr*2.5)+4);this.lines=[.0297,.0371,.0411,.0437,.0531,.0617,.0719,.0793].map(t=>new Line(Math.ceil(sr*.4)+4));this.base=[.0297,.0371,.0411,.0437,.0531,.0617,.0719,.0793];this.ap=[.0047,.0071,.0113,.0137].map(t=>new Allpass(Math.round(sr*t)));this.da=[new Allpass(Math.round(sr*.013)),new Allpass(Math.round(sr*.019))];this.dlo=[0,0];this.dhi=[0,0];this.rlo=new Float64Array(8);this.rhi=new Float64Array(8);this.v=new Float64Array(8);this.times=new Float64Array(8);this.g=new Float64Array(8);this.gl=new Float64Array(8);this.phase=0;this.rphase=0;this.envD=0;this.envR=0;this.inLow=0;this.inHigh=0;this.master=.72;this.dtime=[sr*.5,sr*.5];this.update(this.fx,90)}
 update(fx,tempo){this.fx=clone(fx);const d=this.fx.delay,r=this.fx.reverb;
  d.feedback=clamp(d.feedback,0,.95);d.cross=clamp(d.cross,0,1);r.decay=clamp(r.decay,.2,60);r.size=clamp(r.size,.1,1);r.bass=clamp(r.bass,.25,2);r.depth=clamp(r.depth,0,8);
  this.targetD=[clamp(d.sync?60/tempo*d.left:d.timeL/1000,.01,7.8)*this.sr,clamp(d.sync?60/tempo*(d.link?d.left:d.right):(d.link?d.timeL:d.timeR)/1000,.01,7.8)*this.sr];if(!this.processed)this.dtime=[...this.targetD];this.dlc=coeff(d.low,this.sr);this.dhc=coeff(Math.min(d.high,d.mode==='analog'?4500:20000),this.sr);this.rlc=coeff(r.low,this.sr);this.rhc=coeff(r.high,this.sr);this.damp=coeff(r.damping,this.sr);this.bassC=coeff(250,this.sr);
  for(let i=0;i<8;i++){this.times[i]=this.base[i]*(.4+1.9*r.size)*(r.mode==='plate'?.7:r.mode==='hall'?.9:1)*this.sr;this.g[i]=Math.exp(-6.9078*this.times[i]/this.sr/r.decay);this.gl[i]=Math.exp(-6.9078*this.times[i]/this.sr/(r.decay*r.bass))}
  this.de=Math.exp(-1/(this.sr*Math.max(.05,d.recovery)));this.re=Math.exp(-1/(this.sr*Math.max(.05,r.recovery)));this.dp=2*Math.PI*clamp(d.rate,.01,5)/this.sr;this.rp=2*Math.PI*clamp(r.rate,.01,5)/this.sr;
 }
 clear(){for(const d of [...this.delay,this.pre,...this.lines,...this.ap.map(x=>x.d),...this.da.map(x=>x.d)])d.clear();this.rlo.fill(0);this.rhi.fill(0);this.dlo.fill(0);this.dhi.fill(0);this.inLow=this.inHigh=0}
 process(dryL,dryR,dl,dr,rl,rr,outL,outR,master){this.processed=true;const d=this.fx.delay,r=this.fx.reverb,sr=this.sr;
  const echoes=this.echoes||(this.echoes=new Float64Array(2));const pd=Math.max(1,r.predelay*sr/1000),diff=.1+.68*clamp(r.diffusion,0,1);
  for(let n=0;n<outL.length;n++){
   const env=Math.max(Math.abs(dryL[n]),Math.abs(dryR[n]));this.envD=Math.max(env,this.envD*this.de);this.envR=Math.max(env,this.envR*this.re);
   this.phase+=this.dp;this.rphase+=this.rp;
   for(let k=0;k<2;k++){this.dtime[k]+=(this.targetD[k]-this.dtime[k])*.0003;const mod=(Math.sin(this.phase+k*1.57)*d.depth+Math.sin(this.phase*.31)*d.wow+Math.sin(this.phase*19.7)*d.flutter)*sr/1000;let v=this.delay[k].read(this.dtime[k]+mod);this.dlo[k]+=(v-this.dlo[k])*this.dlc;v-=this.dlo[k];this.dhi[k]+=(v-this.dhi[k])*this.dhc;echoes[k]=this.dhi[k]}
   for(let k=0;k<2;k++){let fb=echoes[k]*(1-d.cross)+echoes[1-k]*d.cross;let input=d.enabled?(k===0?dl[n]:dr[n]):0;let x=input+fb*d.feedback;if(d.mode!=='digital'||d.drive>0){const drive=1+d.drive*5;x=Math.tanh(x*drive)/drive}this.delay[k].put(x)}
   const delayDuck=1/(1+this.envD*d.duck*16);let el=echoes[0],er=echoes[1];if(d.diffusion>0){el=el*(1-d.diffusion)+this.da[0].run(el,.65)*d.diffusion;er=er*(1-d.diffusion)+this.da[1].run(er,.65)*d.diffusion}const dm=(el+er)*.5,ds=(el-er)*.5*d.width;el=(dm+ds)*delayDuck;er=(dm-ds)*delayDuck;
   let input=r.enabled&&!r.freeze?((rl[n]+rr[n])*.5+(d.enabled?(el+er)*.5*d.toReverb:0)):0;this.inLow+=(input-this.inLow)*this.rlc;input-=this.inLow;this.inHigh+=(input-this.inHigh)*this.rhc;this.pre.put(this.inHigh);
   let early=0;for(let t=0;t<4;t++)early+=this.pre.read(pd+sr*(.011+t*.017)*r.size)*(t%2?-.18:.26);
   let x=0;for(let t=0;t<4;t++)x+=this.pre.read(pd+sr*r.attack/1000*(t+1)/4)*.25;for(let i=0;i<4;i++)x=this.ap[i].run(x,diff);x*=.55;
   let sum=0;for(let i=0;i<8;i++){const motion=r.freeze?0:Math.sin(this.rphase*(1+i*.13)+i*1.7)*r.depth*sr/1000;let v=this.lines[i].read(this.times[i]+motion);this.rhi[i]+=(v-this.rhi[i])*this.damp;this.rlo[i]+=(this.rhi[i]-this.rlo[i])*this.bassC;v=r.freeze?v:(this.rhi[i]-this.rlo[i])*this.g[i]+this.rlo[i]*this.gl[i];this.v[i]=v;sum+=v}
   let revL=0,revR=0;for(let i=0;i<8;i++){const inject=(i<4?1:-1)*x*(i%2?1:r.density);let feedback=sum*.25-this.v[i];this.lines[i].put(clamp((r.freeze?0:inject)+feedback,-4,4));revL+=this.v[i]*LEFT_WEIGHTS[i];revR+=this.v[i]*RIGHT_WEIGHTS[i]}
   const rd=1/(1+this.envR*r.duck*16);revL=(revL*.3*r.late+early*r.early)*rd;revR=(revR*.3*r.late-early*r.early*.8)*rd;const rm=(revL+revR)*.5,rs=(revL-revR)*.5*r.width;this.master+=(master-this.master)*.001;
   outL[n]=limit((dryL[n]+(d.enabled?el*d.level:0)+(r.enabled?(rm+rs)*r.level:0))*this.master);outR[n]=limit((dryR[n]+(d.enabled?er*d.level:0)+(r.enabled?(rm-rs)*r.level:0))*this.master);
  }
 }
}
