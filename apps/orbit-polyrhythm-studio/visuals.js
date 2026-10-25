import {GROOVE_TRIO_PALETTES} from './groove-trio-presets.js';
import {BERLIN_PALETTES} from './berlin-presets.js';
import {BACKGROUND_PALETTES} from './background-presets.js';
// Lighting is presentation-only; it never changes the audio or project data.
const palettes = {
 ...GROOVE_TRIO_PALETTES,
 ...BERLIN_PALETTES,
 ...BACKGROUND_PALETTES,
 'Mercury Courtyard':[184,45,276], 'Silver Current':[204,165,300], 'Chromium Rain':[196,290,43], 'Molten Blue':[214,32,174], 'Bell Foundry':[34,197,283], 'Lunar Alloy':[245,195,28],
 'Neon Switchyard':[173,322,252], 'Blacktop Sequence':[28,234,345], 'Ghost Train Relay':[270,174,38], 'Circuit Breakwater':[152,205,34], 'Afterimage Drive':[318,183,46], 'Zero Hour Signals':[235,358,176],
 'Paper Lantern Steps':[36,160,340], 'Reed & River':[166,39,215], 'Courtyard Fireflies':[90,181,315], 'Cedar Footprints':[25,153,220], 'Silk Thread Compass':[340,36,183], 'Rain Between Leaves':[156,220,52],
 'Orbiting Hands':[38,173,350], 'Basalt Procession':[18,274,198], 'Satellite Breaks':[288,178,50], 'Woodblock Paradox':[42,204,332], 'Tin Roof Ritual':[189,152,27], 'Zero-G Drumline':[8,213,48],
 'Velvet Sidewalk':[320,35,207], 'Amber Booth':[36,330,183], 'Plum Neon':[294,187,42], 'Raincheck Lounge':[225,34,317], 'Blue Velvet Elevator':[213,315,38], 'Last Table by the Window':[32,245,337],
 'The First Spark':[207,270,38], 'Ember Halo':[33,321,197], 'Black Sun Bloom':[273,15,199], 'Violet Accretion':[278,166,218], 'A Thousand Quiet Suns':[44,201,284], 'Home Beyond the Redshift':[354,227,34],
 'Obsidian Steps':[22,260,175], 'Prism Dance':[165,320,45], 'Temple Circuit':[28,190,345], 'Glass Canopy':[175,235,320], 'Gravity Garden':[270,155,40],
 'Wood & Stars':[210,275,35], 'Mallet Riot':[345,180,55], 'Quicksilver Eleven':[195,290,150], 'Ember Relay':[18,42,215], 'Tidal Machinery':[220,165,305],
 'Beyond the Horizon':[208,268,178], 'Dark Matter':[258,310,195], 'The Quiet Singularity':[230,280,170], 'Redshift Cathedral':[355,25,250],
 'Photon Rail':[188,275,35], 'Tachyon Bloom':[165,305,225], 'Gravity Engine':[15,255,200], 'Midnight Transmission':[240,335,180],
 'First Light Beyond':[42,205,290], 'Opal Exosphere':[182,315,235], 'Solar Veil':[35,325,175], 'Homeward Through Stars':[215,40,280],
 'Glass Orbits':[168,260,210], 'Desert Afterglow':[32,350,275], 'Midnight Engine':[205,280,165], 'Floating Bells':[190,255,325],
 'Clockwork Courtyard':[40,170,210], 'Obsidian Drum Circle':[12,285,38], 'Brushwork After Dark':[225,320,40], '808 Constellation':[285,185,330], 'Foundry in Seven':[24,5,200], 'Rain on Tin':[192,225,155],
 'Event Horizon':[205,265,185], 'Blue Hour Suspension':[222,190,275], 'Aurora Cathedral':[155,285,205], 'Slow Tides of Titan':[32,200,260], 'Velvet Nebula':[285,335,245], 'Weightless Dawn':[38,335,185],
 'Tangerine Transit':[28,345,190], 'Submerged Funk':[172,215,290], 'Neon Side Street':[325,195,270], 'Pocket Satellite':[180,40,250], 'Low Gravity Dub':[145,205,32], 'Copper Coil':[24,42,180],
 'Glasshouse After Rain':[165,220,300], 'Koto Moon Garden':[335,175,260], 'Marimba Mobius':[38,165,310], 'Electric Jellyfish':[280,185,325], 'Celestial Music Box':[230,295,45], 'Desert Radio':[35,10,215],
 'Alien Teahouse':[105,280,175], 'Clockwork Aquarium':[185,245,35], 'Magnetic Fireflies':[85,175,295], 'Lunar Gong Room':[235,45,190], 'Ghosts in the Switchboard':[155,275,210], 'Dreams of a Broken Carousel':[330,35,255]
};
export const LIGHTING_LOOKS={Ice:[200,260,170],Velvet:[285,335,245],Ember:[25,350,45],Aurora:[155,285,205]};
function fromHues(hues){return {hues,colors:[hues[0],hues[1],hues[2],hues[0]+24,hues[1]+24,hues[2]+24,hues[0]-24,hues[1]-24].map((h,i)=>`hsl(${(h+360)%360} 78% ${i<3?72:65}%)`),accent:`hsl(${hues[0]} 78% 72%)`,secondary:`hsl(${hues[1]} 70% 67%)`};}
export function paletteFor(name,look='Auto'){return fromHues(LIGHTING_LOOKS[look]||palettes[name]||[168,260,210]);}
export function blendPalette(current,target,amount){return fromHues(current.hues.map((h,i)=>(h+(((target.hues[i]-h+540)%360)-180)*amount+360)%360));}
export function dialStyle(value,min,max){const f=Math.max(0,Math.min(1,(value-min)/(max-min)));return `--turn:${-135+f*270}deg;--sweep:${f*270}deg`;}
export class OrbitLights{
 constructor(){this.hits=Array(8).fill(null);this.stars=Array.from({length:75},(_,i)=>({x:((i*73+17)%211)/211,y:((i*127+13)%223)/223,r:i%7===0?1.15:.55}));}
 hit(events,now){for(const event of events||[])if(event.track>=0&&event.track<8)this.hits[event.track]={...event,time:now};}
 clear(){this.hits.fill(null);}
 energy(i,now,track){const h=this.hits[i];if(!h)return 0;const life=track.bank===128?.2:track.program>=88&&track.program<=95?1.8:.65;return Math.exp(-(now-h.time)/1000/life)*(h.accent?1:.7);}
 draw(g,w,h,{beat,running,tracks,bars,selected,palette,level,dim,calm,now}){
  g.clearRect(0,0,w,h);if(w<1||h<1)return;
  const cx=w/2,cy=h/2,maxR=Math.max(22,Math.min(w,h)/2-35),inner=Math.min(64,maxR*.38),spacing=(maxR-inner)/7,solo=tracks.some(t=>t.solo),time=calm?0:now/1000,core=inner*.75;
  const ink=(hue,alpha,light=65)=>`hsl(${hue} 75% ${light}% / ${Math.max(0,Math.min(1,alpha))})`;
  g.save();
  // Broad atmospheric light stays behind the precisely placed rhythm markers.
  for(let n=0;n<2;n++){
   const x=cx+Math.cos(time*.045+n*2.4)*maxR*.28,y=cy+Math.sin(time*.035+n*2)*maxR*.15;
   const glow=g.createRadialGradient(x,y,core*.5,x,y,maxR*1.65);
   glow.addColorStop(0,ink(palette.hues[n],dim*(.13+level*.24),40));glow.addColorStop(.45,ink(palette.hues[n],dim*.06,30));glow.addColorStop(1,'transparent');g.fillStyle=glow;g.fillRect(0,0,w,h);
  }
  // Star positions are fixed, so idle motion is smooth and reduced motion is still.
  g.fillStyle='#d4ecff';for(const s of this.stars){g.globalAlpha=dim*(.13+(s.r>1?.15:0));g.beginPath();g.arc(s.x*w,s.y*h,s.r*.75,0,Math.PI*2);g.fill();}g.globalAlpha=1;
  const beam=g.createLinearGradient(0,cy,w,cy);beam.addColorStop(0,'transparent');beam.addColorStop(.36,ink(palette.hues[0],dim*.14));beam.addColorStop(.5,ink(palette.hues[0],dim*(.35+level*.25)));beam.addColorStop(.64,ink(palette.hues[1],dim*.14));beam.addColorStop(1,'transparent');g.fillStyle=beam;g.fillRect(0,cy-.5,w,1);
  // An inclined accretion disc creates the Horizon silhouette without blur filters.
  g.save();g.translate(cx,cy);g.rotate(-.22);
  for(let k=0;k<4;k++){g.strokeStyle=ink(palette.hues[k%2],dim*[.025,.045,.11,.3][k]);g.lineWidth=[19,9,3,1][k];g.beginPath();g.ellipse(0,0,maxR*1.13,maxR*.18,0,0,Math.PI*2);g.stroke();}g.restore();
  g.strokeStyle='#82aec91d';g.lineWidth=.7;g.beginPath();g.arc(cx,cy,maxR+17,0,Math.PI*2);g.stroke();
  for(let k=0;k<80;k++){const a=k*Math.PI/40,major=k%10===0;g.strokeStyle=major?'#98c3dd5c':'#779cb52b';g.beginPath();g.moveTo(cx+Math.cos(a)*(maxR+21),cy+Math.sin(a)*(maxR+21));g.lineTo(cx+Math.cos(a)*(maxR+(major?27:24)),cy+Math.sin(a)*(maxR+(major?27:24)));g.stroke();}
  tracks.forEach((t,i)=>{
   const r=maxR-i*spacing,active=!t.mute&&(!solo||t.solo),period=t.mode==='poly'?bars*4:t.steps*.25,fraction=(beat/period)%1,color=palette.colors[i],energy=active?this.energy(i,now,t):0;
   g.globalAlpha=active?(i===selected?.38:.18):.045;g.strokeStyle=color;g.lineWidth=i===selected?1.3:.7;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();
   // Short illuminated arcs make the selected lane easy to follow in standby.
   if(active&&i===selected){g.globalAlpha=dim*.45;g.lineWidth=2;g.beginPath();g.arc(cx,cy,r,-Math.PI*.62,-Math.PI*.42);g.stroke();}
   const last=this.hits[i];
   for(let j=0;j<t.steps;j++){
    const a=j/t.steps*Math.PI*2-Math.PI/2,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r,v=t.pattern[j],e=last?.step===j?energy*dim:0;
    g.globalAlpha=active?(v?.72:.14):.10;g.fillStyle=v?color:'#96afc2';g.beginPath();g.arc(x,y,v===2?3.5:v?2.35:1,0,Math.PI*2);g.fill();
    if(e>.015&&!calm){const halo=g.createRadialGradient(x,y,0,x,y,12+e*6);halo.addColorStop(0,ink(palette.hues[i%3],e*.45,76));halo.addColorStop(1,'transparent');g.globalAlpha=1;g.fillStyle=halo;g.fillRect(x-18,y-18,36,36);g.globalAlpha=e;g.fillStyle='#f3fcff';g.beginPath();g.arc(x,y,2.8+e,0,Math.PI*2);g.fill();}
   }
   if(running&&active&&!calm){const a=fraction*Math.PI*2-Math.PI/2;g.lineWidth=1.8;g.strokeStyle=color;for(let s=0;s<18;s++){g.globalAlpha=dim*(1-s/18)*.75;g.beginPath();g.arc(cx,cy,r,a-(s+1)*.025,a-s*.025);g.stroke();}g.globalAlpha=.6+dim*.4;g.fillStyle='#edfbff';g.beginPath();g.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2.5,0,Math.PI*2);g.fill();}
  });
  // A dark core and restrained photon ring leave space for the live ratio label.
  g.globalAlpha=1;const aura=g.createRadialGradient(cx,cy,core*.85,cx,cy,core*1.65);aura.addColorStop(0,ink(palette.hues[0],dim*(.22+level*.3),62));aura.addColorStop(.45,ink(palette.hues[1],dim*.13,48));aura.addColorStop(1,'transparent');g.fillStyle=aura;g.beginPath();g.arc(cx,cy,core*1.65,0,Math.PI*2);g.fill();
  const sphere=g.createRadialGradient(cx+core*.3,cy-core*.5,0,cx,cy,core);sphere.addColorStop(0,'#102335');sphere.addColorStop(.55,'#07111d');sphere.addColorStop(1,'#02070d');g.fillStyle=sphere;g.beginPath();g.arc(cx,cy,core,0,Math.PI*2);g.fill();
  const rim=g.createLinearGradient(cx-core,cy-core,cx+core,cy+core);rim.addColorStop(0,ink(palette.hues[0],dim*.9,86));rim.addColorStop(.42,ink(palette.hues[0],dim*.28));rim.addColorStop(1,ink(palette.hues[1],dim*.55));g.strokeStyle=rim;g.lineWidth=1.3;g.beginPath();g.arc(cx,cy,core,0,Math.PI*2);g.stroke();
  g.restore();
 }
}
