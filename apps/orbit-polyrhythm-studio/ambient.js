// Stereo feedback-delay reverb. Orthogonal mixing keeps the feedback network stable.
export const AMBIENT_DEFAULT={enabled:false,decay:8,mix:35,predelay:35,tone:6000,width:100,lowcut:180};
export const AMBIENT_PRESETS={Room:{decay:2,mix:20,predelay:10,tone:9000,width:80,lowcut:120},Hall:{decay:8,mix:35,predelay:35,tone:6000,width:100,lowcut:180},'Deep Space':{decay:20,mix:50,predelay:80,tone:3500,width:100,lowcut:220}};
export function sanitizeAmbient(a={}){if(!a||typeof a!=='object')a={};const out={enabled:a.enabled===true};for(const [k,min,max] of [['decay',1,30],['mix',0,100],['predelay',0,250],['tone',1000,14000],['width',0,100],['lowcut',40,600]])out[k]=Number.isFinite(+a[k])?Math.min(max,Math.max(min,+a[k])):AMBIENT_DEFAULT[k];return out}
class Allpass{constructor(length){this.buffer=new Float32Array(length);this.index=0}tick(x){let z=this.buffer[this.index],y=z-.65*x;this.buffer[this.index]=x+.65*y;if(++this.index===this.buffer.length)this.index=0;return y}clear(){this.buffer.fill(0);this.index=0}}
export class AmbientReverb{
 constructor(rate){this.rate=rate;this.lengths=[1499,1747,1999,2269,2539,2801,3163,3527].map(n=>Math.round(n*rate/44100));this.lines=this.lengths.map(n=>new Float32Array(n));this.indices=new Int32Array(8);this.damped=new Float64Array(8);this.values=new Float64Array(8);this.gains=new Float64Array(8);this.pre=[new Float32Array(Math.ceil(rate*.251)+2),new Float32Array(Math.ceil(rate*.251)+2)];this.preIndex=0;this.hp=[0,0];this.diffusers=[[.0047,.0113],[.0061,.0137]].map(pair=>pair.map(t=>new Allpass(Math.round(t*rate))));this.wet=0;this.sleeping=true;this.set(AMBIENT_DEFAULT);this.current={...this.target};}
 set(a){this.target=sanitizeAmbient(a)}
 clear(){this.lines.forEach(b=>b.fill(0));this.pre.forEach(b=>b.fill(0));this.damped.fill(0);this.indices.fill(0);this.hp.fill(0);this.preIndex=0;this.diffusers.flat().forEach(a=>a.clear())}
 process(left,right,start=0,count=left.length-start){const target=this.target,mix=target.enabled?target.mix/100:0;if(!target.enabled&&this.wet<1e-6){if(!this.sleeping){this.clear();this.sleeping=true}this.wet=0;return}this.sleeping=false;
  const blockSmooth=1-Math.exp(-count/(this.rate*.06));for(const k of ['decay','tone','lowcut','predelay','width'])this.current[k]+=(target[k]-this.current[k])*blockSmooth;
  const s=this.current,lowA=1-Math.exp(-2*Math.PI*Math.min(s.tone,this.rate*.45)/this.rate),hpA=1-Math.exp(-2*Math.PI*s.lowcut/this.rate),smooth=1-Math.exp(-1/(this.rate*.025)),delay=s.predelay*this.rate/1000,norm=1/Math.sqrt(8);
  for(let j=0;j<8;j++)this.gains[j]=Math.pow(10,-3*this.lengths[j]/this.rate/s.decay);
  for(let k=start;k<start+count;k++){
   const dryL=left[k],dryR=right[k];this.hp[0]+=hpA*(dryL-this.hp[0]);this.hp[1]+=hpA*(dryR-this.hp[1]);this.pre[0][this.preIndex]=dryL-this.hp[0];this.pre[1][this.preIndex]=dryR-this.hp[1];let read=(this.preIndex-delay+this.pre[0].length)%this.pre[0].length,ri=Math.floor(read),rf=read-ri,ri2=(ri+1)%this.pre[0].length;let inL=this.pre[0][ri]*(1-rf)+this.pre[0][ri2]*rf,inR=this.pre[1][ri]*(1-rf)+this.pre[1][ri2]*rf;if(++this.preIndex===this.pre[0].length)this.preIndex=0;
   for(const ap of this.diffusers[0])inL=ap.tick(inL);for(const ap of this.diffusers[1])inR=ap.tick(inR);
   let wetL=0,wetR=0;for(let j=0;j<8;j++){let v=this.lines[j][this.indices[j]];this.damped[j]+=lowA*(v-this.damped[j]);this.values[j]=this.damped[j];wetL+=v*(j%2?1:-1)*norm;wetR+=v*(j%4<2?1:-1)*norm;}
   // In-place normalized Hadamard transform: energy-preserving diffusion.
   for(let stride=1;stride<8;stride*=2)for(let base=0;base<8;base+=stride*2)for(let j=base;j<base+stride;j++){let a=this.values[j],b=this.values[j+stride];this.values[j]=a+b;this.values[j+stride]=a-b;}
   for(let j=0;j<8;j++){const input=(inL*(j%2?1:-1)+inR*(j%4<2?1:-1))*.16;this.lines[j][this.indices[j]]=input+this.values[j]*norm*this.gains[j];if(++this.indices[j]===this.lines[j].length)this.indices[j]=0;}
   const mid=(wetL+wetR)*.5,side=(wetL-wetR)*.5*s.width/100;this.wet+=(mix-this.wet)*smooth;const dry=Math.cos(this.wet*Math.PI*.5),wet=Math.sin(this.wet*Math.PI*.5);left[k]=dryL*dry+(mid+side)*wet;right[k]=dryR*dry+(mid-side)*wet;
  }
 }
}
