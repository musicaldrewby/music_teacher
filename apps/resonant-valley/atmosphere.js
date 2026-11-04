import {Noise} from './noise.js';

export const MOONS=['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
export const WEATHER=['auto','clear','cloudy','rain','mist','snow','storm'];
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const fixed={dawn:.23,day:.4,sunset:.705,night:.92};
const presets={clear:[.12,0,0,0,.1],cloudy:[.72,0,0,0,.35],rain:[.92,.8,0,.15,.55],mist:[.48,0,0,.85,.08],snow:[.8,0,.85,.22,.2],storm:[1,1,0,.3,1]};
export function automaticWeather(noise,slot,climate){
 const r=noise.random(slot,0,907),cold=climate.biome==='alpine'||climate.temperature<.27;
 if(climate.biome==='desert')return r<.79?'clear':r<.97?'cloudy':'rain';
 if(cold)return r<.45?'clear':r<.65?'cloudy':'snow';
 const wet=climate.biome==='wetland'||climate.moisture>.6;
 return r<.43?'clear':r<.64?'cloudy':r<(wet?.79:.74)?'mist':r<.97?'rain':'storm';
}
export class Atmosphere {
 constructor(seed,raw={}){
  this.noise=new Noise(seed);this.day=clamp(raw.day??.32,0,1e7);this.minutes=clamp(raw.minutes??24,4,120);
  this.mode=['cycle',...Object.keys(fixed)].includes(raw.mode)?raw.mode:'cycle';this.frozen=!!raw.frozen;
  this.weather=WEATHER.includes(raw.weather)?raw.weather:'auto';this.weatherVolume=clamp(raw.weatherVolume??.35);this.effectsVolume=clamp(raw.effectsVolume??.3);
  this.quietStudio=raw.quietStudio!==false;this.flashes=raw.flashes===true;this.age=clamp(raw.age??0,0,1e9);
  this.blend=Array.isArray(raw.blend)&&raw.blend.length===5?raw.blend.map(x=>clamp(x)):[...presets.clear];
  this.puddles=clamp(raw.puddles??0);this.snowpack=clamp(raw.snowpack??0);
  this.kind='clear';this.lastClimate={biome:'meadow',temperature:.5,moisture:.5};
 }
 get phase(){return this.mode==='cycle'?this.day%1:fixed[this.mode];}
 get moonIndex(){return Math.floor(this.day/2)%8;}
 get moonName(){return MOONS[this.moonIndex];}
 setMode(mode){if(mode==='cycle'&&this.mode!=='cycle')this.day=Math.floor(this.day)+this.phase;this.mode=mode in fixed||mode==='cycle'?mode:'cycle';}
 morning(){if(this.frozen||this.mode!=='cycle')return false;this.day=Math.floor(this.day)+1.26;return true;}
 step(dt,climate=this.lastClimate,active=true){
  dt=active?clamp(dt,0,1):0;this.lastClimate=climate;
  if(!this.frozen){if(this.mode==='cycle')this.day+=dt/(this.minutes*60);this.age+=dt;}
  this.kind=this.weather==='auto'?automaticWeather(this.noise,Math.floor(this.age/220),climate):this.weather;
  const target=presets[this.kind],blend=1-Math.exp(-dt/12);
  this.blend=this.blend.map((v,i)=>v+(target[i]-v)*blend);
  const [,rain,snow]=this.blend;
  this.puddles=clamp(this.puddles+dt*(rain*.064-(1-rain)*.009-snow*.025));
  this.snowpack=clamp(this.snowpack+dt*(snow*.052-(1-snow)*.004-rain*.022));
  return this.sample();
 }
 sample(){
  const phase=this.phase,elevation=Math.sin((phase-.22)*Math.PI*2),daylight=smooth(-.18,.28,elevation),night=1-smooth(-.2,.02,elevation);
  const [cloud,rain,snow,mist,wind]=this.blend,moon=(1-Math.cos(this.moonIndex/8*Math.PI*2))/2;
  const twilight=(1-smooth(.05,.38,Math.abs(elevation)))*(1-night*.8);
  const meteorWindow=this.age%300,meteor=night>.5&&cloud<.6&&meteorWindow>296?Math.sin((meteorWindow-296)/4*Math.PI):0;
  const aurora=night*(1-cloud)*((this.lastClimate.biome==='alpine'||this.lastClimate.biome==='taiga')&&this.noise.random(Math.floor(this.day),0,941)>.65?1:0);
  const pulse=this.age%19,flash=this.flashes&&this.kind==='storm'&&pulse<.12?Math.sin(pulse/.12*Math.PI)*.18:0;
  return {phase,elevation,daylight,night,twilight,moon,moonIndex:this.moonIndex,moonName:this.moonName,cloud,rain,snow,mist,wind,meteor,aurora,flash,wet:Math.max(rain,this.puddles*.65),puddles:this.puddles,snowpack:this.snowpack,kind:this.kind,day:Math.floor(this.day)+1};
 }
 label(){const h=Math.floor(this.phase*24),m=Math.floor(this.phase*1440)%60;return `Day ${Math.floor(this.day)+1} · ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
 serialize(){return Object.fromEntries(['day','minutes','mode','frozen','weather','weatherVolume','effectsVolume','quietStudio','flashes','age','blend','puddles','snowpack'].map(k=>[k,this[k]]));}
}

// Rain and snow stop at the actual highest occupied voxel, including player roofs.
export function roofHeight(world,x,z){
 if(world.outdoorSurface)return world.outdoorSurface(x,z);
 x=Math.floor(x);z=Math.floor(z);if(!world.isReady(x,z))return Infinity;
 for(let y=95;y>=-32;y--)if(world.get(x,y,z))return y+1;
 return -32;
}
