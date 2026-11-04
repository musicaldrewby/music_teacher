import {skylineSites} from './skyline.js';
import {ExplorerMap,compass} from './exploration.js';
import {MOONS} from './atmosphere.js';
const $=id=>document.getElementById(id),title=s=>s[0].toUpperCase()+s.slice(1);
const mix=(a,b,t)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')})`;
function drawAlmanac(canvas,a){
 const s=a.sample(),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.imageSmoothingEnabled=false;
 const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,mix([17,24,59],[67,156,219],s.daylight*(1-s.cloud*.4)));grad.addColorStop(1,s.twilight>.3?'#f4a393':mix([59,70,114],[161,217,240],s.daylight));c.fillStyle=grad;c.fillRect(0,0,w,h);
 c.globalAlpha=s.night*(1-s.cloud);c.fillStyle='#ecf3ff';for(let i=0;i<85;i++)c.fillRect(Math.floor(a.noise.random(i,2)*w),Math.floor(a.noise.random(i,3)*h*.78),i%9===0?2:1,1);c.globalAlpha=1;
 const orb=(x,y,r,moon)=>{for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){const rr=dx*dx+dy*dy;if(rr>r*r)continue;let lit=true;if(moon){const theta=s.moonIndex/8*Math.PI*2;lit=dx/r*Math.sin(theta)-Math.sqrt(1-rr/(r*r))*Math.cos(theta)>0;}c.fillStyle=moon?(lit?'#e2e9fa':'#445276'):'#ffe2a0';c.fillRect(x+dx,y+dy,1,1);}};
 const theta=(s.phase-.22)*Math.PI*2;const body=(angle,moon)=>{if(Math.sin(angle)>-.08)orb(Math.round(w/2-Math.cos(angle)*w*.4),Math.round(h*.74-Math.max(0,Math.sin(angle))*h*.53),moon?7:8,moon);};body(theta,false);if(s.moon>.01)body(theta-s.moonIndex/8*Math.PI*2,true);
 c.fillStyle=mix([62,73,104],[214,226,233],s.daylight);c.globalAlpha=.4+s.cloud*.5;for(let i=0;i<2+Math.floor(s.cloud*8);i++){const x=(a.noise.random(i,9)*w+a.age*.18)%w,y=9+a.noise.random(i,11)*27;c.fillRect(x,y,24,4);c.fillRect(x+5,y-3,12,4);}c.globalAlpha=1;
 for(let layer=0;layer<3;layer++){c.fillStyle=[mix([42,50,85],[89,134,159],s.daylight),mix([27,41,64],[65,103,113],s.daylight),mix([17,31,49],[43,77,78],s.daylight)][layer];for(let x=0;x<w;x+=2){const y=Math.floor(h*(.56+layer*.13)+(Math.sin(x/(36-layer*6)+layer*5)*5+Math.sin(x/15+layer)*3));c.fillRect(x,y,2,h-y);}}
 if(s.rain+s.snow>.1){c.fillStyle=s.snow>s.rain?'#eef4ff':'#adc5df';for(let i=0;i<Math.floor((s.rain+s.snow)*65);i++){const x=a.noise.random(i,21)*w,y=(a.noise.random(i,19)*h+a.age*(s.snow>s.rain?6:25))%h;c.fillRect(x|0,y|0,1,s.rain>s.snow?3:1);}}
}
export class FieldUI {
 constructor(c){this.c=c;this.lastVisit=-1;this.lastHUD=-1;this.map=new ExplorerMap($('valley-map'),{world:c.world,state:()=>c.world().exploration,select:p=>{$('pin-position').textContent=`At ${p.x}, ${p.z}`;},notice:c.toast});
  $('map-open').onclick=()=>c.open('map-panel');$('sky-open').onclick=()=>c.open('sky-panel');$('sky-from-map').onclick=()=>c.open('sky-panel');
  $('map-zoom').onchange=e=>{this.map.range=Number(e.target.value);this.map.render();};$('map-here').onclick=()=>{this.map.selected=null;this.map.center=null;this.renderMap();};
  $('pin-add').onclick=()=>{const world=c.world(),pos=this.map.selected||world.camera.position,p=world.exploration.add($('pin-name').value,pos.x,pos.z);if(!p){$('pin-status').textContent='Mark an explored tile (up to 60 pins).';return;}$('pin-status').textContent=`Marked ${p.name}.`;$('pin-name').value='';this.map.selected=null;c.save();this.renderMap();};
  $('daylight').onchange=e=>{c.world().setTime(e.target.value);c.save();this.renderSky();};
  for(const [id,key] of [['cycle-length','minutes'],['weather-choice','weather'],['weather-volume','weatherVolume'],['effects-volume','effectsVolume'],['freeze-clock','frozen'],['quiet-weather','quietStudio'],['storm-flashes','flashes']]){const input=$(id);input.addEventListener(input.type==='range'?'input':'change',()=>{const a=c.world().atmosphere;a[key]=input.type==='checkbox'?input.checked:id==='weather-choice'?input.value:Number(input.value);c.save();this.renderSky();});}
 }
 renderSky(){const a=this.c.world().atmosphere;$('daylight').value=a.mode;$('cycle-length').value=a.minutes;$('weather-choice').value=a.weather;$('weather-volume').value=a.weatherVolume;$('effects-volume').value=a.effectsVolume;$('freeze-clock').checked=a.frozen;$('quiet-weather').checked=a.quietStudio;$('storm-flashes').checked=a.flashes;this.skyReadout();}
 skyReadout(){const a=this.c.world().atmosphere;$('sky-clock').textContent=a.label();$('sky-moon').textContent=a.moonName;$('sky-weather').textContent=title(a.kind);if(this.lastMoonIndex!==a.moonIndex){this.lastMoonIndex=a.moonIndex;$('lunar-strip').replaceChildren(...MOONS.map((name,i)=>{const el=document.createElement('span');el.className='moon-tile'+(a.moonIndex===i?' current':'');el.title=name;el.setAttribute('aria-label',name);const cv=document.createElement('canvas');cv.width=cv.height=18;const ctx=cv.getContext('2d'),ang=i/8*Math.PI*2;for(let x=-7;x<=7;x++)for(let y=-7;y<=7;y++){const r=x*x+y*y;if(r>49)continue;ctx.fillStyle=x/7*Math.sin(ang)-Math.sqrt(1-r/49)*Math.cos(ang)>0?'#dde7ff':'#384a72';ctx.fillRect(x+9,y+9,1,1);}el.append(cv);return el;}));}drawAlmanac($('sky-almanac'),a);}
 survey(){
  const w=this.c.world(),v=w.exploration.visit(w);
  if(v.newly.length){for(const site of v.newly)this.c.keepsake(site);this.c.toast('Mapped '+v.newly[0].name);}
  if(v.changed)this.c.save();
 }
 renderMap(){const w=this.c.world(),s=w.exploration;this.survey();this.map.render();
  const h=w.generator.home,places=skylineSites(w.generator,h.x,h.z,140).filter(s=>s.id.includes(':home:'));
  $('map-sightlines').classList.toggle('hidden',!places.length);$('skyline-bearings').replaceChildren(...places.map(s=>{const row=document.createElement('span'),b=document.createElement('b');b.textContent=compass(Math.atan2(h.x-s.x,h.z-s.z));row.append(b,document.createTextNode(s.name));return row;}));
  $('map-location').textContent=`${w.biome(w.camera.position.x,w.camera.position.z)} · ${Math.floor(w.camera.position.x)}, ${Math.floor(w.camera.position.z)}`;$('map-summary').textContent=`${s.visited.size} terrain squares explored · ${s.found.length} landmark${s.found.length===1?'':'s'}`;
  const pos=this.map.selected||w.camera.position;$('pin-position').textContent=`${this.map.selected?'At':'Here'} ${Math.floor(pos.x)}, ${Math.floor(pos.z)}`;
  const list=$('map-places');list.replaceChildren();for(const mark of s.points(w.generator.home)){const row=document.createElement('div');row.className='place-row';const label=document.createElement('strong');label.textContent=mark.name;const detail=document.createElement('small');detail.textContent=`${mark.x}, ${mark.z} · ${Math.round(Math.hypot(mark.x-w.camera.position.x,mark.z-w.camera.position.z))} blocks`;const track=document.createElement('button');track.textContent=s.tracked===mark.id?'Tracking':'Track';track.disabled=s.tracked===mark.id;track.onclick=()=>{s.tracked=mark.id;this.map.center={x:mark.x,z:mark.z};this.c.save();this.renderMap();};const desc=document.createElement('div');desc.append(label,detail);row.append(desc,track);if(mark.id.startsWith('pin-')){const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Remove '+mark.name);remove.onclick=()=>{s.remove(mark.id);this.c.save();this.renderMap();};row.append(remove);}list.append(row);}
 }
 opened(panel){if(panel==='map-panel'){this.map.selected=null;this.map.center=null;$('pin-status').textContent='';this.renderMap();}if(panel==='sky-panel')this.renderSky();}
 frame(now,started,panel){const w=this.c.world();if(!started||!w.exploration||!w.atmosphere)return;if(now-this.lastVisit>1200){this.lastVisit=now;this.survey();}
  if(now-this.lastHUD<600)return;this.lastHUD=now;const p=w.camera.position,mark=w.exploration.points(w.generator.home).find(m=>m.id===w.exploration.tracked);$('field-bearing').textContent=compass(w.camera.rotation.y);$('field-clock').textContent=w.atmosphere.label();$('field-weather').textContent=title(w.atmosphere.kind);
  $('field-track').textContent=mark?`${mark.name} · ${compass(Math.atan2(-(mark.x-p.x),-(mark.z-p.z)))} ${Math.round(Math.hypot(mark.x-p.x,mark.z-p.z))} blocks`:'';if(panel==='sky-panel')this.skyReadout();
 }
}
