'use strict';
// Original photographic assets generated with the built-in image tool.
// Photographic assets are served from this site without third-party dependencies.
const ASSETS={"landscape":"assets/landscape.webp","woodland":"assets/woodland.webp","foreground":"assets/foreground.webp","citysky":"assets/citysky.webp","citymid":"assets/citymid.webp","citynear":"assets/citynear.webp","cityrail":"assets/cityrail.webp","desertsky":"assets/desertsky.webp","desertmesa":"assets/desertmesa.webp","desertnear":"assets/desertnear.webp","desertgrass":"assets/desertgrass.webp","christmassky":"assets/christmassky.webp","christmasmid":"assets/christmasmid.webp","christmasnear":"assets/christmasnear.webp","christmasfront":"assets/christmasfront.webp","halloweensky":"assets/halloweensky.webp","halloweenmid":"assets/halloweenmid.webp","halloweennear":"assets/halloweennear.webp","halloweenfront":"assets/halloweenfront.webp","bayousky":"assets/bayousky.webp","bayoumid":"assets/bayoumid.webp","bayounear":"assets/bayounear.webp","bayoufront":"assets/bayoufront.webp","interior":"assets/interior.webp","window_commuter":"assets/window_commuter.webp","window_sleeper":"assets/window_sleeper.webp","window_panorama":"assets/window_panorama.webp","window_vintage":"assets/window_vintage.webp","window_luxury":"assets/window_luxury.webp","window_alpine":"assets/window_alpine.webp","window_retro":"assets/window_retro.webp","journey_atlas":"assets/journey_atlas_river.webp","cabin_curtain":"assets/cabin_curtain.webp","cabin_mug":"assets/cabin_mug.webp"};
const $=id=>document.getElementById(id), LOOP=300, TAU=Math.PI*2;
const GRAPHICS_KEY='train-window-graphics',STARTUP_KEY='train-window-starting';
const yieldToPage=()=>new Promise(resolve=>setTimeout(resolve,20));
let graphicsPreference='auto',activeGraphics='full';
try{graphicsPreference=new URLSearchParams(window.location.search).get('graphics')||localStorage.getItem(GRAPHICS_KEY)||'auto';}catch(e){}
if(!['auto','full','compatible'].includes(graphicsPreference))graphicsPreference='auto';
function setStartupStatus(message){$('loadStatus').textContent=message;}
function graphicsError(message,details=''){const error=new Error(message);error.details=details;return error;}
function showStartupError(error){
 state.playing=false;$('loading').style.display='grid';$('loadTitle').textContent='Your train could not start';
 setStartupStatus(error.message||'The graphics engine stopped. Try compatibility mode.');
 $('loadHint').textContent='Try compatibility mode below. If it still stops, send the message above and the startup details.';
 $('loadDiagnostics').hidden=false;$('loadDetails').textContent='Graphics: '+activeGraphics+'\n'+(error.details||error.message||String(error));
 console.error(error);
}
async function withDeadline(promise,ms,message){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]);}finally{clearTimeout(timer);}}
const SCENES={
 country:{number:'01',title:'The Twilight Line',label:'Twilight Countryside',description:'A quiet journey through the countryside.',near:'Nearby plants',filename:'Twilight_Countryside',value:0,textures:['landscape','woodland','foreground','foreground']},
 city:{number:'02',title:'Japan at Night',label:'Japan at Night',description:'Warm windows. Quiet rooftops. A city after dark.',near:'Trackside railing & poles',filename:'Japan_at_Night',value:1,textures:['citysky','citymid','citynear','cityrail']},
 desert:{number:'03',title:'Southwestern Sunset',label:'Southwestern Sunset',description:'Red-rock mesas. Golden grasses. The last light of day.',near:'Close desert grasses',filename:'Southwestern_Sunset',value:2,textures:['desertsky','desertmesa','desertnear','desertgrass']},
 christmas:{number:'04',title:'Christmas Town at Night',label:'Snowy Christmas Town',description:'Snow-covered porches. Warm windows. A quiet Christmas journey.',near:'Snowy fence & evergreens',filename:'Snowy_Christmas_Town',value:3,textures:['christmassky','christmasmid','christmasnear','christmasfront']},
 halloween:{number:'05',title:'Halloween Village at Dusk',label:'Halloween Village',description:'Glowing pumpkins. Victorian porches. The last violet light of October.',near:'Autumn fence & pumpkins',filename:'Halloween_Village',value:4,textures:['halloweensky','halloweenmid','halloweennear','halloweenfront']},
 bayou:{number:'06',title:'Louisiana Bayou',label:'Louisiana Bayou',description:'Spanish moss. Still water. Warm cabin lights in the evening mist.',near:'Close marsh reeds',filename:'Louisiana_Bayou',value:5,textures:['bayousky','bayoumid','bayounear','bayoufront']}
};
const WINDOWS={
 original:{reflectionIndex:0,label:'Original warm walnut',asset:'interior',warmth:1},
 commuter:{reflectionIndex:1,label:'Japanese commuter',asset:'window_commuter',warmth:.15},
 sleeper:{reflectionIndex:2,label:'Cozy sleeper cabin',asset:'window_sleeper',warmth:1},
 panorama:{reflectionIndex:3,label:'Modern panoramic',asset:'window_panorama',warmth:.25},
 vintage:{reflectionIndex:4,label:'Vintage railway',asset:'window_vintage',warmth:.9},
 luxury:{reflectionIndex:5,label:'Luxury night train',asset:'window_luxury',warmth:1},
 alpine:{reflectionIndex:6,label:'Alpine observation',asset:'window_alpine',warmth:.35},
 retro:{reflectionIndex:7,label:'Retro stainless steel',asset:'window_retro',warmth:.55}
};
const ASSET_NAMES=[...new Set([...Object.values(SCENES).flatMap(s=>s.textures),...Object.values(WINDOWS).map(w=>w.asset),'journey_atlas','cabin_curtain','cabin_mug'])];
const scenePositions=Object.fromEntries(Object.keys(SCENES).map(id=>[id,0]));
const sceneWeather=Object.fromEntries(Object.keys(SCENES).map(id=>[id,{rainAmount:0,snowAmount:id==='christmas'?.65:0}]));
const state={scene:'halloween',carriage:'original',time:0,audioTime:0,playing:true,speed:1,vibration:.3,reflection:.25,motionBlur:.70,windowDepth:.65,exposure:1,near:true,frame:true,lighting:.65,rainAmount:0,snowAmount:0,rainFocus:.65,condensation:.55,wind:-.40,gust:.55,exporting:false};
// Journey timing is a pure function of time and settings, shared by playback,
// scrubbing, offline audio, and video export. No random frame-to-frame state.
const EXPERIENCE_DEFAULTS={journey:false,route:['country','halloween','bayou'],tunnels:true,bridges:true,stations:false,weatherCycle:false,fogAmount:0,seatDistance:1,curtain:false,mug:false,readingLamp:.25,glassWear:.18};
Object.assign(state,EXPERIENCE_DEFAULTS,{route:[...EXPERIENCE_DEFAULTS.route]});
const clamp01=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp01(x);return x*x*(3-2*x)};
const wrap=(x,n)=>((x%n)+n)%n;
function routeFor(s){return s.journey&&Array.isArray(s.route)&&s.route.length===3?s.route.filter(x=>SCENES[x]):[s.scene];}
function cycleSeconds(s=state){return LOOP*routeFor(s).length;}
function rideName(s=state){return s.journey?'Connected Journey':SCENES[s.scene].label;}
function travelAt(t,stops){
 if(!stops)return {distance:t,velocity:1};
 // Ease down over 20 seconds, wait 16, ease away over 20. Integrating
 // velocity analytically gives a truly stationary view during the pause.
 const integral=u=>u*u*u-.5*u*u*u*u;
 let d,v;
 if(t<92){d=t;v=1;}
 else if(t<112){const u=(t-92)/20;d=92+20*(u-integral(u));v=1-smooth(u);}
 else if(t<128){d=102;v=0;}
 else if(t<148){const u=(t-128)/20;d=102+20*integral(u);v=smooth(u);}
 else{d=t-36;v=1;}
 return {distance:d*300/264,velocity:v*300/264};
}
function extendedDistance(t,stops){return Math.floor(t/LOOP)*LOOP+travelAt(wrap(t,LOOP),stops).distance;}
function routeBounds(local,start,end,stops,periodic=false){
 const d=travelAt(local,stops).distance,a=extendedDistance(start,stops),b=extendedDistance(end,stops),center=(a+b)/2;
 const offset=periodic?wrap(d-center+LOOP/2,LOOP)-LOOP/2:d-center;
 return [(a-center-offset)*1.28,(b-center-offset)*1.28];
}
// A river section is always bracketed by two physical tunnels. Both scene
// changes occur at tunnel midpoints, where the cylindrical lining fills the
// view. These portals are part of the crossing, independent of scenic tunnels.
const RIVER_CROSSING={entry:[188,202],waterStart:195,exit:[238,252],waterEnd:245,span:[190,250],preview:186};
function journeyFrame(time,s=state){
 const route=routeFor(s),duration=LOOP*route.length,t=wrap(time,duration),leg=Math.floor(t/LOOP),local=t%LOOP,scene=route[leg]||s.scene;
 const travel=travelAt(local,s.stations),stationCenter=travelAt(120,s.stations).distance;
 let tunnelBounds=s.tunnels?routeBounds(local,48,68,s.stations):[10000,10001];
 if(s.bridges&&local>=160&&local<270){
  const passage=local<220?RIVER_CROSSING.entry:RIVER_CROSSING.exit;
  tunnelBounds=routeBounds(local,...passage,s.stations);
 }
 if(s.journey&&(local<30||local>270)){
  const boundary=local>150?300:0;tunnelBounds=routeBounds(local,boundary-8,boundary+8,s.stations);
 }
 const tunnel=smooth((Math.min(-tunnelBounds[0],tunnelBounds[1])+2)/5);
 // Rain reaches the pane only outside the actual portal. The short approach
 // ramp softens the last impacts without admitting new water under cover.
 const rainExposure=smooth(-Math.min(-tunnelBounds[0],tunnelBounds[1])/.9);
 const bridgeActive=s.bridges&&local>=RIVER_CROSSING.waterStart&&local<RIVER_CROSSING.waterEnd?1:0;
 const bridgeBounds=s.bridges?routeBounds(local,...RIVER_CROSSING.span,s.stations,true):[10000,10001];
 const bridge=bridgeActive&&tunnel<.5?1:0;
 const weather=s.weatherCycle?Math.pow(.5-.5*Math.cos(TAU*local/LOOP),1.25):1;
 return {scene,leg,local,distance:travel.distance,velocity:travel.velocity,phase:travel.distance/LOOP,clockPhase:local/LOOP,tunnel,tunnelBounds,rainExposure,bridge,bridgeBounds,bridgeActive,stationX:s.stations?(travel.distance-stationCenter)*.055:100,weather,
  rainPeak:s.rainAmount,snow:s.journey?(scene==='christmas'?Math.max(.50,s.snowAmount):0):s.snowAmount,
  fog:(s.fogAmount||0)*(s.weatherCycle?(.35+.65*(1-weather)):1),status:tunnel>.5?'Through the tunnel':travel.velocity<.005?'At the station':s.stations&&local>92&&local<112?'Arriving at the station':s.stations&&local>=128&&local<148?'Leaving the station':bridge>.1?'Crossing the river':SCENES[scene].label};
}

let renderer,images={},last=performance.now(),seekDragging=false,abortExport=false,videoURL=null;
const vertex=`attribute vec2 position; varying vec2 uv; void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
#ifdef COMPATIBILITY
#define BLUR_TAPS 3
#define BRIDGE_TAPS 3
#define GLASS_RADIUS 1
#define RECESS_STEPS 3
#else
#define BLUR_TAPS 11
#define BRIDGE_TAPS 7
#define GLASS_RADIUS 4
#define RECESS_STEPS 8
#endif
varying vec2 uv;uniform sampler2D landscape,woodland,foreground,detail,interior,waterMap,sceneMap,reflectionAtlas;
uniform float phase,movement,reflections,exposure,showNear,showFrame,scene,windowWarmth,lighting,rainAmount,condensation,renderStage,motionBlur,travelSpeed,windowDepth,reflectionIndex,snowAmount,windDirection,gustStrength,rainFocus;
uniform vec3 tileWidth,tileScale;
uniform float clockPhase,tunnelCoverage,bridgeActive,stationX,fogAmount,wetness,readingLamp,glassWear;
uniform vec2 tunnelBounds,bridgeBounds;
const float PI=3.141592653589793;
// Static repeat textures have one guard texel on each side. This is ordinary
// bilinear texture sampling across the wrap, with no scenery crossfade.
vec4 panorama(sampler2D tex,float x,float y,float width){
 return texture2D(tex,vec2((fract(x)*(width-2.)+1.)/width,clamp(y,0.,1.)));
}
vec3 over(vec3 b,vec4 a){return mix(b,a.rgb,clamp(a.a,0.,1.));}
vec4 band(sampler2D tex,vec2 p,float top,float height,float scale,float cycles,float offset,vec3 metric){
 // Across the river, the far shore is a small, slowly passing photographic
 // layer. Near trees, buildings and grass stay on the land side of the
 // tunnel, so no shoreline has to grow out of the moving foreground.
 bool overWater=bridgeActive>.5;
 if(overWater){
  if(cycles>5.)return vec4(0.);
  height*=.38;top=.554-height*.94;scale/=.38;cycles=3.;
 }
 float y=(p.y-top)/height;
 float x=p.x*scale*metric.y+phase*cycles+offset;
 vec4 c;
 if(motionBlur<.001){c=panorama(tex,x,y,metric.x);}else{
  // Integrate a short shutter exposure along this plane's actual velocity.
  // Premultiplied accumulation keeps thin plants and poles free of dark halos.
  float shutter=motionBlur*travelSpeed/45.;
  vec4 sum=vec4(0.);
  for(int i=0;i<BLUR_TAPS;i++){
   float dt=(float(i)/float(BLUR_TAPS-1)-.5)*shutter;
   vec4 tap=panorama(tex,x+dt*cycles/300.,y,metric.x);
   float weight=(i==0||i==BLUR_TAPS-1)?.5:1.;
   sum+=vec4(tap.rgb*tap.a,tap.a)*weight;
  }
  c=vec4(sum.rgb/max(sum.a,.00001),sum.a/float(BLUR_TAPS-1));
 }
 c.a*=step(0.,y);
 if(overWater)c.a*=1.-smoothstep(.552,.558,p.y);
 // The bayou photographs include a strip of still reflected water. Retain
 // the intact trees and their bases; let only their reflection tails soften
 // into the continuous moving river so no rectangular water cards remain.
 if(scene>4.5&&cycles<14.){
  float waterline=cycles<5.?.61:.70;
  c.a*=1.-smoothstep(waterline,waterline+.060,p.y);
 }
 return c;
}
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float softNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
float waterHeight(vec2 p){vec3 w=texture2D(waterMap,p).rgb;return max(0.,w.r+w.b*(1.-w.g)-(1.-wetness)*.72)*wetness;}
vec3 glassScene(vec2 p){return texture2D(sceneMap,vec2(clamp(p.x,0.,1.),1.-clamp(p.y,0.,1.))).rgb;}
vec3 wetGlass(vec2 p,vec2 q){
 vec3 w=texture2D(waterMap,q).rgb;
 vec2 texel=vec2(1./1280.,1./720.);
 float h=waterHeight(q);
 vec2 slope=vec2(waterHeight(q+vec2(texel.x,0.))-waterHeight(q-vec2(texel.x,0.)),waterHeight(q+vec2(0.,texel.y))-waterHeight(q-vec2(0.,texel.y)))*5.5;
 float cover=smoothstep(.007,.050,h);
 vec3 normal=normalize(vec3(-slope,1.));
 vec3 ray=refract(vec3(0.,0.,-1.),normal,1./1.333);
 // A curved drop magnifies a much wider part of the distant view than flat glass.
 vec2 offset=ray.xy*.12*cover;
 vec3 sharp=glassScene(p+offset);
 float edge=pow(clamp(length((q-.5)*vec2(1.25,1.45)),0.,1.),2.);
 float patch=softNoise(q*vec2(9.,6.))*.60+softNoise(q*vec2(24.,16.))*.40;
 float fog=condensation*sqrt(rainAmount)*(.22+.75*edge+.25*patch)*(1.-clamp(w.g*1.38,0.,1.));
 vec2 blur=vec2(1./1280.,1./720.)*(1.15+rainFocus*.85+condensation*.30);
 vec3 diffused=vec3(0.);float weights=0.;
 for(int x=-GLASS_RADIUS;x<=GLASS_RADIUS;x++)for(int y=-GLASS_RADIUS;y<=GLASS_RADIUS;y++){
  float weight=exp(-float(x*x+y*y)/8.);
  diffused+=glassScene(p+vec2(float(x),float(y))*blur*(4./float(GLASS_RADIUS)))*weight;weights+=weight;
 }
 diffused/=weights;
 float focus=rainFocus*smoothstep(0.,.25,rainAmount);
 float softness=1.-(1.-clamp(fog,0.,.82))*(1.-focus);
 vec3 mist=diffused*(1.-fog*.02)+vec3(.034,.037,.039)*fog;
 vec3 color=mix(sharp,mist,softness*(1.-cover*.83));
 // Schlick reflection grows on steep menisci. Dark carriage surfaces produce
 // the small asymmetric crescents in the reference; no drawn droplet outlines.
 float fresnel=.020+.980*pow(1.-normal.z,5.);
 vec3 reflected=reflect(vec3(0.,0.,-1.),normal);
 float skyFacing=smoothstep(-.4,.75,-reflected.y+reflected.x*.35);
 vec3 sky=glassScene(vec2(clamp(p.x+reflected.x*.20,0.,1.),.07));
 vec3 cabin=mix(vec3(.006,.009,.014),vec3(.020,.013,.007),windowWarmth);
 vec3 environment=mix(cabin,sky*.85+vec3(.04,.05,.06),skyFacing);
 float grazing=smoothstep(.72,2.0,length(slope));
 float reflection=clamp(fresnel+grazing*.34,0.,.78)*cover;
 color=mix(color,environment,reflection);
 float glint=pow(max(0.,dot(normal,normalize(vec3(-.45,-.60,1.)))),42.);
 color+=vec3(.68,.77,.86)*glint*.09*cover*min(1.,length(slope));
 return color;
}
vec3 snowfall(vec3 col,vec2 p,float depth){
 if(snowAmount<.001)return col;
 vec2 grid=floor(mix(vec2(76.,43.),vec2(24.,14.),depth/1.6));
 // Integer wind/fall cycles make even the nearest flakes close at the loop.
 float horizontal=floor(3.+depth*16.+windDirection*5.+.5);
 float vertical=floor(4.+depth*9.+.5);
 float a=clockPhase*2.*PI;
 vec2 at=(p+vec2(clockPhase*horizontal,-clockPhase*vertical))*grid;
 vec2 cell=floor(at),f=fract(at);float coverage=0.;
 vec2 velocity=normalize(vec2(-horizontal*1.77778,vertical));
 for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
  vec2 neighbor=vec2(float(i),float(j)),id=mod(cell+neighbor,grid);
  float seed=hash21(id+depth*57.31);
  if(seed>snowAmount*.68)continue;
  vec2 center=vec2(hash21(id+11.7),hash21(id+39.2))*.70+.15;
  center.x+=sin(a*(13.+floor(seed*9.))+seed*83.)*.12*gustStrength;
  center.y+=sin(a*(7.+floor(seed*5.))+seed*51.)*.055;
  vec2 delta=(neighbor+center-f)/grid*vec2(1.77778,1.);
  float radius=(.00024+depth*.00105)*(.55+hash21(id+92.)*.80);
  float trail=depth*.0007*motionBlur*travelSpeed;
  float along=max(0.,abs(dot(delta,velocity))-trail),across=dot(delta,vec2(-velocity.y,velocity.x));
  coverage+=exp(-(along*along+across*across)/(radius*radius)*1.8)*(.35+depth*.19);
 }
 vec3 snowColor=mix(vec3(.54,.65,.81),vec3(.88,.90,.93),depth/1.6);
 return mix(col,snowColor,clamp(coverage,0.,.8));
}

vec4 eventImage(float row,vec2 p,bool repeatX){
 float x=repeatX?(fract(p.x)*1534.+1.)/1536.:clamp(p.x,.0004,.9996);
 float y=(1728.+512.*row+clamp(p.y,.001,.999)*512.)/4032.;
 vec4 c=texture2D(reflectionAtlas,vec2(x*1536./2048.,y));
 c.a*=step(0.,p.y);if(!repeatX)c.a*=step(0.,p.x)*step(p.x,1.);return c;
}
// River coordinates are metres on a horizontal plane, not screen-space strips.
// Every spatial period divides 128 m; all temporal frequencies are integers.
// The complete wave field closes at 300 seconds without opacity fades.
float riverNoise(vec2 p,float period){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash21(mod(i,period)),hash21(mod(i+vec2(1.,0.),period)),f.x),
            mix(hash21(mod(i+vec2(0.,1.),period)),hash21(mod(i+1.,period)),f.x),f.y);
}
vec2 riverWave(vec2 world,vec2 frequency,float rate,float amplitude,float warp,float footprint){
 float wavelength=128./length(frequency);
 // Remove unresolved capillary waves at the far bank and during fast travel.
 float resolved=1.-smoothstep(wavelength*.18,wavelength*.58,footprint);
 float angle=2.*PI*(dot(world/128.,frequency)-fract(clockPhase)*rate);
 return normalize(frequency)*sin(angle+warp)*amplitude*resolved;
}
vec2 riverBackdrop(vec2 p,float bankY){
 // Keep each photographic landscape's proportions while putting its far bank
 // at a consistent height above the water for the bridge camera.
 float scale=bankY/.555;
 return vec2((p.x-.5)*.62*scale+.48,p.y*scale);
}
vec3 riverSurface(vec2 p,float shore,float bankY){
 const float eyeHeight=4.5;
 const float horizon=.535;
 float below=max(p.y-horizon,.012);
 float depth=eyeHeight/below;
 // A camera translation changes apparent speed continuously with depth.
 // 384 m is three complete spatial periods in the 300-second master cycle.
 vec2 world=vec2((p.x-.5)*1.777778*depth+fract(phase)*384.,depth);
 world=mod(world,128.);
 float footprint=depth*depth/(eyeHeight*720.)+motionBlur*travelSpeed*.013;
 float warp=(riverNoise(world/8.+vec2(fract(clockPhase)*16.,0.),16.)-.5)*2.6;
 // Four overlapping wave scales, each with three independent directions.
 // They occupy the same 3-D surface, so there are no horizontal layer joins.
 vec2 slope=riverWave(world,vec2(7.,18.),37.,.021,warp,footprint)
           +riverWave(world,vec2(-13.,23.),43.,.018,warp*.7,footprint)
           +riverWave(world,vec2(19.,8.),29.,.013,-warp,footprint);
 slope+=riverWave(world,vec2(31.,74.),137.,.030,warp,footprint)
       +riverWave(world,vec2(-43.,97.),163.,.025,-warp*.8,footprint)
       +riverWave(world,vec2(81.,39.),149.,.020,warp*.6,footprint);
 slope+=riverWave(world,vec2(89.,241.),353.,.030,-warp,footprint)
       +riverWave(world,vec2(-139.,303.),421.,.024,warp*.9,footprint)
       +riverWave(world,vec2(331.,116.),367.,.021,warp,footprint);
 slope+=riverWave(world,vec2(277.,691.),719.,.020,warp*.5,footprint)
       +riverWave(world,vec2(-477.,897.),997.,.017,-warp,footprint)
       +riverWave(world,vec2(1103.,431.),877.,.013,warp,footprint);
 vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
 vec3 view=normalize(vec3(-(p.x-.5)*1.777778*depth,eyeHeight,-depth));
 float fresnel=.020+.980*pow(1.-max(0.,dot(normal,view)),5.);
 // Mirror this scene's photographed sky/bank through the moving normal field.
 // Small multi-tap roughness keeps the reflection photographic, not chrome.
 vec2 mirror=riverBackdrop(vec2(p.x+slope.x*.56,
                  clamp(shore-(p.y-shore)*.94+slope.y*.72,.015,shore+.008)),bankY);
 vec2 rough=vec2(.0035,.0018)*(1.+below*2.);
 vec3 reflected=texture2D(landscape,mirror).rgb*.40;
 reflected+=(texture2D(landscape,mirror+rough).rgb+texture2D(landscape,mirror-rough).rgb
            +texture2D(landscape,mirror+vec2(rough.x,-rough.y)).rgb
            +texture2D(landscape,mirror+vec2(-rough.x,rough.y)).rgb)*.15;
 vec3 sky=texture2D(landscape,riverBackdrop(vec2(.5,.22),bankY)).rgb;
 vec3 body=mix(vec3(.021,.034,.040),sky*.19,.55);
 vec3 water=mix(body,reflected*.89,clamp(.16+fresnel*.84,0.,1.));
 float current=riverNoise(world/16.+vec2(0.,fract(clockPhase)*8.),8.);
 water*=.93+.14*current;
 // Atmospheric depth merges the remote water into the bank, without masking
 // moving detail or dissolving the near surface to hide repetition.
 vec3 haze=texture2D(landscape,riverBackdrop(vec2(p.x,shore-.012),bankY)).rgb;
 water=mix(water,haze,.12*exp(-(p.y-shore)*28.));
 return water;
}
vec4 bridgeStructure(vec2 p){
 vec2 at=vec2(p.x*.8+phase*43.,p.y*.75);
 if(motionBlur<.001)return eventImage(1.,at,true);
 vec4 sum=vec4(0.);
 for(int i=0;i<BRIDGE_TAPS;i++){
  float dt=(float(i)/float(BRIDGE_TAPS-1)-.5)*motionBlur*travelSpeed/45.;
  vec4 tap=eventImage(1.,at+vec2(dt*43./300.,0.),true);
  float weight=(i==0||i==BRIDGE_TAPS-1)?.5:1.;
  sum+=vec4(tap.rgb*tap.a,tap.a)*weight;
 }
 return vec4(sum.rgb/max(sum.a,.00001),sum.a/float(BRIDGE_TAPS-1));
}
float sceneBank(){return scene<.5?.61:scene<1.5?.66:scene<2.5?.65:scene<3.5?.72:scene<4.5?.71:.555;}
vec3 distantScenery(vec2 p){
 float shore=.555,bank=sceneBank();
 vec3 col=texture2D(landscape,riverBackdrop(p,bank)).rgb;
 // The whole foreground is already open water when the first tunnel ends.
 // There is no near bank, approach wall, or lateral land/water boundary.
 if((bridgeActive>.5||scene>4.5)&&p.y>shore-.003)
  col=mix(col,riverSurface(p,shore,bank),smoothstep(shore-.003,shore+.003,p.y));
 return col;
}
vec3 passingBridge(vec3 col,vec2 p){
 if(bridgeActive<.5)return col;
 // The steel span extends inside both tunnel mouths. Its start and end are
 // never exposed against grass, and it needs no masonry approach walls.
 const float depth=4.02;
 float x=(p.x-.5)*1.777778*depth;
 float structure=smoothstep(bridgeBounds.x-.008,bridgeBounds.x+.008,x)
                *(1.-smoothstep(bridgeBounds.y-.008,bridgeBounds.y+.008,x));
 vec4 steel=bridgeStructure(p);steel.a*=structure;
 return over(col,steel);
}
vec3 passingTunnel(vec3 outside,vec2 p){
 if(tunnelBounds.x>25.||tunnelBounds.y< -25.)return outside;
 // Side-looking ray through a cylindrical tunnel. The roof, wall and portal
 // occupy different depths: their curved silhouettes reveal the view by
 // physical occlusion, never by a full-height rectangular wipe.
 vec3 ray=vec3((p.x-.5)*1.777778,.51-p.y,1.);
 const float radius=.90;
 float wallT=radius/length(ray.yz);
 vec3 hit=ray*wallT;
 float aa=.012;
 float wall=smoothstep(tunnelBounds.x-aa,tunnelBounds.x+aa,hit.x)
            *(1.-smoothstep(tunnelBounds.y-aa,tunnelBounds.y+aa,hit.x));
 vec2 tex=vec2(phase*151.+hit.x*151./384.,.5-atan(hit.y,hit.z)*1.1);
 vec3 rock=eventImage(2.,tex,true).rgb;
 if(motionBlur>.001){
  float shutter=motionBlur*travelSpeed/45.*151./300.;
  rock=rock*.5+(eventImage(2.,tex+vec2(shutter*.5,0.),true).rgb
              +eventImage(2.,tex-vec2(shutter*.5,0.),true).rgb)*.25;
 }
 float daylight=exp(-max(0.,min(hit.x-tunnelBounds.x,tunnelBounds.y-hit.x))*.46);
 rock*=.22+.68*daylight;
 // A fully opaque lining must not depend on the hidden landscape at all,
 // including the exact frame where the land/water layout changes.
 if(wall>=1.)return rock;
 vec3 col=mix(outside,rock,wall);
 // Only the outward-facing portal masonry is visible. Once the camera
 // crosses its plane, the cylindrical lining occludes the back of the rim.
 for(int i=0;i<2;i++){
  float edge=i==0?tunnelBounds.x:tunnelBounds.y;
  float safeX=abs(ray.x)<.0001?.0001:ray.x;
  float portalT=edge/safeX;
  bool exteriorFace=i==0?edge>=0.:edge<=0.;
  if(exteriorFace&&portalT>0.&&portalT<wallT+.45){
   vec3 face=ray*portalT;
   float r=length(face.yz);
   float arch=smoothstep(radius-.012,radius+.012,r);
   float silhouette=1.-smoothstep(8.0,8.1,face.y);
   float rim=1.-smoothstep(radius+.12,radius+.65,r);
   vec3 masonry=eventImage(2.,vec2(face.z*.13,face.y*.12+.5),true).rgb;
   masonry=masonry*(.78+rim*.50)+vec3(.025,.022,.018)*rim;
   col=mix(col,masonry,arch*silhouette*(1.-wall));
  }
 }
 return col;
}
vec3 passingStation(vec3 col,vec2 p){
 if(abs(stationX)>3.)return col;
 // The platform's photographed base is at v=.84, not the bottom of its
 // transparent canvas. Anchor that base at ground level (y=.866) and retain
 // the photograph's 3:1 proportions in the 16:9 viewport.
 const float height=.90;
 const float top=.11;
 const float scale=.6584362;
 const float widthMetres=23.272727;
 float u=(p.x-.5)*scale+.5+stationX;
 float v=(p.y-top)/height;
 // A finite earth/gravel apron supports the entire platform, including both
 // end ramps. Its perspective coordinates share the station's track position;
 // it never scrolls out from beneath the building or drifts during a stop.
 if(p.y>.76){
  float z=2.8/max(p.y-.54,.01);
  float x=(p.x-.5)*1.777778*z+stationX*widthMetres;
  float edgeNoise=(softNoise(vec2(x*.7,z*.7))-.5)*.20;
  float across=abs(x)-widthMetres*.50-1.2;
  float apron=(1.-smoothstep(-.20,.20,across+edgeNoise))
              *(1.-smoothstep(11.7,12.0,z));
  vec3 soil=scene<.5?vec3(.24,.22,.18):scene<1.5?vec3(.16,.17,.19):
            scene<2.5?vec3(.33,.24,.16):scene<3.5?vec3(.32,.37,.44):
            scene<4.5?vec3(.23,.17,.12):vec3(.18,.18,.14);
  // Sample a square patch of photographed stone, then break up repetition
  // with isotropic aggregate. Never stretch a narrow strip of platform pixels
  // into long streaks on the ground.
  vec3 photographed=eventImage(0.,vec2(.405+fract(x*.42)*.009,.702+fract(z*.42)*.027),false).rgb;
  float broad=softNoise(vec2(x*2.2,z*2.2));
  float grain=softNoise(vec2(x*17.,z*17.));
  float fine=softNoise(vec2(x*43.,z*43.));
  vec3 ground=soil*(.74+broad*.18+grain*.12+fine*.055)
              +vec3(dot(photographed,vec3(.2126,.7152,.0722))*.022);
  float shoulder=1.-.22*smoothstep(-1.2,.1,across);
  ground*=shoulder;
  col=mix(col,ground,apron);
  // Follow the actual ramp profile, rather than casting a detached rectangular
  // shadow below the image canvas.
  float edge=min(u,1.-u);
  float foot=top+height*(.795+.045*smoothstep(0.,.12,edge));
  float footprint=smoothstep(.002,.015,u)*(1.-smoothstep(.985,.998,u));
  float contact=exp(-pow((p.y-foot-.003)/.009,2.))*footprint;
  col*=1.-contact*.40;
 }
 vec4 station=eventImage(0.,vec2(u,v),false);
 if(motionBlur>.001&&travelSpeed>.001){
  float shutter=motionBlur*travelSpeed/45.*.055;
  vec4 left=eventImage(0.,vec2(u-shutter*.5,v),false);
  vec4 right=eventImage(0.,vec2(u+shutter*.5,v),false);
  vec4 sum=vec4(station.rgb*station.a,station.a)*.5+
           (vec4(left.rgb*left.a,left.a)+vec4(right.rgb*right.a,right.a))*.25;
  station=vec4(sum.rgb/max(sum.a,.00001),sum.a);
 }
 return over(col,station);
}
vec3 scenery(vec2 p){
 vec3 col;
 if(scene<.5){
 // The sky and remote horizon stay fixed; nearer terrain supplies the parallax.
 col=distantScenery(p);
 // Atmospheric haze changes color, never the solidity of the terrain.
 vec4 distant=band(woodland,p,.53,.33,.83,5.,.27,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 distant.rgb=mix(distant.rgb,vec3(.25,.30,.37),.24);
 col=over(col,distant);
 // Rigid layers keep trees and ground intact as the train passes.
 vec4 trees=band(woodland,p,.55,.47,.68,13.,.08,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 trees.rgb*=.88;col=over(col,trees);
 // Two independent close vegetation planes create strong passing depth cues.
 vec4 shrubs=band(foreground,p,.66,.35,.62,29.,.34,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 shrubs.rgb*=.77;shrubs.a*=showNear;col=over(col,shrubs);
 col=passingStation(col,p);
 vec4 grass=band(foreground,p,.755,.25,.49,61.,.12,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 grass.rgb*=.61;grass.a*=showNear;col=over(col,grass);
 }else if(scene<1.5){
 // The city is a separate set of photographic planes, with rigid architecture.
 col=distantScenery(p);
 vec4 blocks=band(woodland,p,.27,.59,.95,5.,.42,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 blocks.rgb=mix(blocks.rgb,vec3(.055,.085,.14),.07);col=over(col,blocks);
 vec4 rooftops=band(foreground,p,.48,.50,.66,13.,.13,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 rooftops.rgb*=.93;col=over(col,rooftops);
 col=passingStation(col,p);
 // The pole traverses the scene much faster than any building layer.
 vec4 railway=band(detail,p,.12,.84,.62,67.,.15,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 railway.a*=showNear;railway.rgb*=.72;col=over(col,railway);
 }else if(scene<2.5){
 // Colorado Plateau: distant mesas drift, close scrub and grasses sweep past.
 col=distantScenery(p);
 vec4 farCliffs=band(woodland,p,.40,.43,.84,3.,.34,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 farCliffs.rgb=mix(farCliffs.rgb,vec3(.48,.31,.30),.14);col=over(col,farCliffs);
 vec4 foothills=band(woodland,p,.52,.43,.73,7.,.15,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 foothills.rgb*=.96;col=over(col,foothills);
 vec4 scrub=band(foreground,p,.61,.43,.65,17.,.41,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 col=over(col,scrub);
 vec4 grasses=band(detail,p,.63,.36,.59,31.,.18,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 grasses.a*=showNear;grasses.rgb*=.87;col=over(col,grasses);
 col=passingStation(col,p);
 vec4 closeGrass=band(detail,p,.755,.32,.49,67.,.52,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 closeGrass.a*=showNear;closeGrass.rgb*=.74;col=over(col,closeGrass);
 }else if(scene<3.5){
 col=distantScenery(p);
 col=snowfall(col,p,.25);
 vec4 town=band(woodland,p,.10,.62,.96,3.,.32,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 town.rgb=mix(town.rgb,vec3(.055,.088,.14),.11);col=over(col,town);
 col=snowfall(col,p,.60);
 vec4 houses=band(foreground,p,.26,.60,.98,11.,.17,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 col=over(col,houses);col=snowfall(col,p,1.0);
 vec4 fence=band(detail,p,.54,.34,1.20,29.,.42,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 fence.a*=showNear;fence.rgb*=.80;col=over(col,fence);
 col=passingStation(col,p);
 vec4 closeSnow=band(detail,p,.73,.25,.90,61.,.10,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 closeSnow.a*=showNear;closeSnow.rgb*=.72;col=over(col,closeSnow);
 col=snowfall(col,p,1.6);
 }else if(scene<4.5){
 // Intact photographic buildings on separate planes, never edge dissolves.
 col=distantScenery(p);
 vec4 village=band(woodland,p,.16,.51,.92,3.,.27,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 village.rgb=mix(village.rgb,vec3(.20,.15,.24),.13);col=over(col,village);
 vec4 porches=band(foreground,p,.27,.58,.89,11.,.10,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 col=over(col,porches);
 vec4 fence=band(detail,p,.48,.34,1.12,29.,.39,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 fence.a*=showNear;fence.rgb*=.83;col=over(col,fence);
 col=passingStation(col,p);
 vec4 leaves=band(detail,p,.795,.26,.80,61.,.64,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 leaves.a*=showNear;leaves.rgb*=.65;col=over(col,leaves);
 }else{
 // Water stays open between cypress groups; each shore has its own depth.
 float a=phase*2.*PI;
 vec2 lake=p;
 lake.x+=smoothstep(.54,.88,p.y)*(.0007*sin(p.y*173.+a*17.)+.00035*sin(p.y*311.-a*23.));
 col=distantScenery(p);
 vec2 shore=p;
 shore.x+=smoothstep(.61,.88,p.y)*.0008*sin(p.y*227.+a*19.);
 // Continue the photographed water beneath the shore without clamping its
 // final pixel row into vertical streaks; leave the trees perfectly rigid.
 shore.y=.61+min(p.y-.61,0.)+max(p.y-.61,0.)*.25;
 vec4 farBank=band(woodland,shore,.15,.59,1.0,3.,.35,vec3(tileWidth.x,tileScale.x,scene*3.+0.));
 farBank.rgb=mix(farBank.rgb,vec3(.18,.23,.27),.16);col=over(col,farBank);
 vec2 grove=p;
 grove.x+=smoothstep(.69,.88,p.y)*.0012*sin(p.y*263.-a*13.);
 grove.y=.69+min(p.y-.69,0.)+max(p.y-.69,0.)*.62;
 vec4 cypress=band(foreground,grove,.015,.86,.84,11.,.08,vec3(tileWidth.y,tileScale.y,scene*3.+1.));
 cypress.rgb*=.91;col=over(col,cypress);
 vec4 reeds=band(detail,p,.63,.30,.87,31.,.31,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 reeds.a*=showNear;reeds.rgb*=.73;col=over(col,reeds);
 col=passingStation(col,p);
 vec4 closeReeds=band(detail,p,.855,.22,.63,67.,.63,vec3(tileWidth.z,tileScale.z,scene*3.+2.));
 closeReeds.a*=showNear;closeReeds.rgb*=.61;col=over(col,closeReeds);
 }
 if(scene<2.5||scene>3.5)col=snowfall(snowfall(col,p,.55),p,1.6);
 if(fogAmount>.001){
  float wisp=softNoise(vec2(p.x*3.+sin(clockPhase*2.*PI),p.y*10.+cos(clockPhase*2.*PI)));
  float density=fogAmount*(.20+.65*exp(-pow((p.y-.58)*7.,2.)))*(.60+.40*wisp);
  col=mix(col,vec3(.49,.53,.56),density);
 }
 col=passingBridge(col,p);
 col=passingTunnel(col,p);
 return col;
}
vec4 carriageSurface(vec2 p){return texture2D(interior,clamp(p,vec2(.001),vec2(.999)));}
vec3 cabinReflection(vec2 p){
 vec2 cell=vec2(mod(reflectionIndex,2.),floor(reflectionIndex/2.));
 // Clamp inside each atlas tile: adjacent carriages can never bleed together.
 vec2 at=(cell+clamp(p,vec2(.006),vec2(.994)))/vec2(2.,4.);
 at.y*=1728./4032.;at.x*=1536./2048.;
 vec2 d=vec2(.0003375,.00025);
 return texture2D(reflectionAtlas,at).rgb*.40+
  (texture2D(reflectionAtlas,at+vec2(d.x,0.)).rgb+texture2D(reflectionAtlas,at-vec2(d.x,0.)).rgb+
   texture2D(reflectionAtlas,at+vec2(0.,d.y)).rgb+texture2D(reflectionAtlas,at-vec2(0.,d.y)).rgb)*.15;
}
void main(){
 float a=clockPhase*2.*PI;
 // Integer frequencies close the entire camera/carriage movement at 300 s.
 vec2 tremor=movement*vec2(.00065*sin(a*71.)+.00018*sin(a*1231.),.0010*sin(a*53.)+.00032*sin(a*1561.)+.00020*sin(a*2107.));
 vec2 head=movement*vec2(.010*sin(a*17.)+.003*sin(a*29.),.006*sin(a*13.)+.002*sin(a*37.));
 float roll=movement*(.0010*sin(a*41.)+.0003*sin(a*937.));
 vec2 rotated=mat2(cos(roll),-sin(roll),sin(roll),cos(roll))*(uv-.5)+.5;
 vec2 p=uv+tremor*.22+head*.12;
 // The glass and front rim are separated in depth; head motion creates parallax.
 vec2 q=rotated+tremor+head*.50;
 // One scenery call site avoids duplicating the entire world in drivers
 // which inline GLSL functions while compiling the two rain render passes.
 vec3 col;
 if(renderStage<.5||rainAmount<=.001)col=scenery(p);else col=wetGlass(uv,q);
 if(renderStage<.5){gl_FragColor=vec4(col,1.);return;}
 float vig=1.-.12*pow(length((uv-.5)*vec2(1.05,1.)),1.3);col*=vig*exposure;
 if(reflections>.001){
  vec2 reflected=(vec2(1.-q.x,q.y)-.5)/.90+.5-vec2(0.,.13)-head*.60;
  vec3 cabin=cabinReflection(reflected);
  float bounds=smoothstep(-.02,.02,reflected.y)*(1.-smoothstep(.98,1.02,reflected.y));
  float luminance=dot(col,vec3(.2126,.7152,.0722));
  float visibility=1.-.94*smoothstep(.08,.62,luminance);
  float fresnel=1.+.45*pow(length((q-.5)*vec2(1.1,1.)),2.);
  // Add reflected radiance in approximately linear light, preserving bright skies.
  float strength=reflections*.12*visibility*fresnel*bounds*(1.+tunnelCoverage*2.0);
  col=sqrt(max(vec3(0.),col*col*(1.-strength*.20)+cabin*cabin*strength));
 }
 if(glassWear>.001){
  // Fine arcs at the edges catch cabin light like handling marks on real glass.
  vec2 f=(q-vec2(.91,.70))*vec2(1.7778,1.);float r=length(f);
  float fingerprint=pow(.5+.5*sin(r*2400.),12.)*exp(-pow((r-.039)*48.,2.))*smoothstep(.01,.03,r);
  float scratch=pow(max(0.,1.-abs(q.y-(.19+q.x*.047))/.00020),2.)*smoothstep(.68,.84,q.x)*(1.-smoothstep(.91,.95,q.x));
  col+=vec3(.24,.20,.14)*(fingerprint*.075+scratch*.12)*glassWear*(.25+readingLamp);
 }
 // Overscan prevents camera movement from exposing outer image edges.
 vec2 frameUV=(rotated+tremor+head-.5)/1.022+.5;
 vec4 inside=carriageSurface(frameUV);
 if(showFrame>.5&&windowDepth>.001){
  // Extrude the actual photographed aperture, retaining each window's shape.
  // A recessed dark gasket, shaded reveal, and front sill occupy distinct planes.
  for(int i=RECESS_STEPS;i>=1;i--){
   float z=float(i)/float(RECESS_STEPS);
   vec2 backUV=frameUV+(frameUV-.5)*(.026*windowDepth*z)-head*(.55*windowDepth*z);
   vec4 edge=carriageSurface(backUV);
   vec3 material=mix(vec3(.075,.088,.095),vec3(.12,.086,.057),windowWarmth);
   vec3 reveal=edge.rgb*(.32+.27*(1.-z))+material*.25;
   if(z>=.875)reveal=material*(.40+.12*(1.-z));
   edge.rgb=reveal;edge.a*=showFrame;
   col=over(col,edge);
  }
 }
 // Moving illumination is applied to carriage material, never to the landscape alpha.
 float edgeLight=.40+.60*pow(abs(q.x-.5)*2.,1.3);
 vec3 lit=inside.rgb;
 if(scene>.5&&scene<1.5){
  float amber=pow(.5+.5*sin((q.x*.80+phase*13.+.13)*2.*PI),10.);
  float cool=pow(.5+.5*sin((q.x*.66+phase*5.+.42)*2.*PI),8.);
  lit=inside.rgb*(.69+amber*.34+cool*.20)+edgeLight*(vec3(1.,.52,.19)*amber*.105+vec3(.17,.56,.91)*cool*.073);
 }else if(scene>4.5){
  float shade=.5+.5*sin((q.x*.84+phase*11.+.08)*2.*PI);
  lit=inside.rgb*(.70+.13*shade)+edgeLight*vec3(.12,.24,.25)*.045;
 }else if(scene>3.5){
  float amber=pow(.5+.5*sin((q.x*.89+phase*11.+.10)*2.*PI),8.);
  lit=inside.rgb*(.76+.22*amber)+edgeLight*vec3(1.,.40,.12)*amber*.075;
 }else if(scene>2.5){
  float amber=pow(.5+.5*sin((q.x*.72+phase*11.+.17)*2.*PI),7.);
  lit=inside.rgb*(.72+.22*amber)+edgeLight*(vec3(.11,.22,.39)*.035+vec3(1.,.56,.23)*amber*.055);
 }else{
  float sweep=.5+.5*sin((q.x*.52+phase*11.)*2.*PI);
  float slow=.5+.5*sin(phase*2.*PI*3.);
  vec3 warm=scene>1.5?vec3(1.,.57,.25):vec3(1.,.76,.48);
  lit=inside.rgb*(.91+.10*sweep)+warm*(.022+.042*sweep+.013*slow)*edgeLight;
 }
 lit=mix(lit,inside.rgb*.58+vec3(.037,.022,.011),tunnelCoverage);
 inside.rgb=mix(inside.rgb,lit,lighting);
 float lampPool=exp(-dot((q-vec2(.83,.12))*vec2(1.3,1.),(q-vec2(.83,.12))*vec2(1.3,1.))*3.4);
 inside.rgb+=vec3(.20,.115,.040)*readingLamp*lampPool;
 inside.a*=showFrame;col=over(col,inside);
 gl_FragColor=vec4(col,1.);
}`;
// A reduced droplet model on a vertical 1.2 m × 0.675 m pane. Forces use SI
// units; pane positions and radii use millimetres. Gravity, surface pinning,
// air shear, viscous drag, accretion and mass-conserving coalescence are integrated.
// Each run ends off the glass, and its trail recovers before its next birth.
function createWetGlass(width=1280,height=720,canvasFactory=null){
 const make=(w,h)=>{const c=canvasFactory?canvasFactory(w,h):document.createElement('canvas');c.width=w;c.height=h;return c;};
 const canvas=make(width,height),ctx=canvas.getContext('2d',{alpha:false}),base=make(width,height),bg=base.getContext('2d',{alpha:false});
 const W=1200,H=675,px=width/W,dt=1/60,trailLife=7,cacheLimit=384;
 let key='',templates=[],stats={},lastTime=NaN,revision=0,cycle=300,environment,physics;
 const cache=new Map();
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),vol=r=>4/3*Math.PI*r*r*r;
 const stamp=(channel,variant)=>{
  const size=48,c=make(size,size),g=c.getContext('2d'),im=g.createImageData(size,size);
  const skew=(variant%3-1)*.09,tilt=(variant-3.5)*.07;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   let nx=(x-23.5)/23.5,ny=(y-23.5)/23.5;
   nx=(nx+tilt*ny)/(1.+skew*ny);ny/=(.88+(variant%4)*.07);
   const angle=Math.atan2(ny,nx),edge=1.+.055*Math.sin(angle*3.+variant)+.025*Math.sin(angle*5.+variant*2.);
   const r2=(nx*nx+ny*ny)/(edge*edge);
   if(r2<1.){const i=(y*size+x)*4;im.data[i+channel]=Math.round(255*Math.pow(1-r2,.42));im.data[i+3]=255;}
  }
  g.putImageData(im,0,0);return c;
 };
 const red=Array.from({length:8},(_,i)=>stamp(0,i)),blue=Array.from({length:8},(_,i)=>stamp(2,i));
 const drawCap=(g,images,x,y,r,amount=1,stretch=1,shape=null)=>{
  const radius=r*px,img=images[shape??(Math.abs(Math.floor(x*17+y*7))%images.length)];
  g.globalAlpha=clamp((.22+r*.48)*amount,0,.94);
  g.drawImage(img,x*px-radius,y*px-radius*stretch,radius*2,radius*2*stretch);
 };
 function build(settings){
  let seed=92741;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const rain=settings.rainAmount,speed=settings.speed,wind=settings.wind??-.40,gust=settings.gust??.55;
  cycle=300/speed;physics={rain,speed,wind,gust};templates=[];cache.clear();revision++;
  stats={runs:0,merged:0,maxRadius:0,rejected:0,sheltered:0};
  // Small periodic lookup table, shared by every droplet. The simulation uses
  // absolute journey time, so a drop can encounter a portal or station halfway
  // down the pane. Neither playback FPS nor the order of seeks affects it.
  const steps=2400,conditions=new Float32Array((steps+1)*2);
  for(let i=0;i<=steps;i++){const j=journeyFrame(i*300/steps,settings);conditions[i*2]=j.velocity;conditions[i*2+1]=j.rainExposure*j.weather;}
  environment=at=>{const f=wrap(at,cycle)/cycle*steps,i=Math.floor(f),u=f-i;return {velocity:conditions[i*2]+(conditions[(i+1)*2]-conditions[i*2])*u,arrival:conditions[i*2+1]+(conditions[(i+1)*2+1]-conditions[i*2+1])*u};};
  bg.globalCompositeOperation='source-over';bg.globalAlpha=1;bg.fillStyle='black';bg.fillRect(0,0,width,height);bg.globalCompositeOperation='lighter';
  const beadCount=Math.round(12500*rain);stats.beads=beadCount;
  for(let i=0;i<beadCount;i++){
   let x=rand(),y=rand();if(rand()<Math.abs(wind)*.75)x=wind<0?x*x:1.-x*x;
   const radius=.40+1.40*rand()**2.8;
   drawCap(bg,blue,x*W,y*H,radius);
  }
  // Sparse bigger pinned drops give the fine field a natural size distribution.
  for(let i=0;i<Math.round(80*rain);i++)drawCap(bg,blue,rand()*W,rand()*H,.95+rand()*.80);
  bg.globalAlpha=1;
  const count=Math.round(150*rain);
  for(let k=0;k<count;k++){
   const cycles=[6,8,10][Math.floor(rand()*3)],period=cycle/cycles,offset=rand()*period;
   const initial={x:rand()*W,y:rand()*(H-70)-20,r:.20+rand()*.25};
   const phase=rand()*Math.PI*2,hysteresis=.025+rand()*.035,drag=.00034+rand()*.00016,collect=.18+rain*.23+rand()*.20;
   templates.push({cycles,period,offset,initial,phase,hysteresis,drag,collect,shape:k%8,seed:Math.floor(rand()*4294967296)});
  }
  lastTime=NaN;
 }
 function eventRun(template,slot,id){
  const cacheKey=id+':'+slot;
  if(cache.has(cacheKey)){const run=cache.get(cacheKey);cache.delete(cacheKey);cache.set(cacheKey,run);return run;}
  let seed=(template.seed+Math.imul(slot+1,2654435761))>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const {period,offset,initial,phase,hysteresis,drag,collect,shape}=template,{speed,wind,gust}=physics;
  const birth=wrap(slot*period-offset,cycle),arrival=environment(birth).arrival;
  let run=null;
  if(arrival<=0||rand()>arrival)stats.sheltered++;
  else{
   function integrate(satellites){
    let x=initial.x,y=initial.y,V=vol(initial.r),vx=0,vy=0,moving=false,release=0;const points=[];let merged=0;
    for(let step=0;step*dt<period-trailLife-.2;step++){
     const age=step*dt,env=environment(birth+age);
     // Cover stops collection, not gravity. Existing beads keep their mass,
     // merge with water already on the glass and drain through condensation.
     if(step)V+=collect*dt*(moving?.16:1)*env.arrival;let radius=Math.cbrt(V*3/(4*Math.PI));
     for(const b of satellites)if(b.at===null&&(x-b.x)**2+(y-b.y)**2<(radius+b.r)**2){const old=V;V+=vol(b.r);vx*=old/V;vy*=old/V;radius=Math.cbrt(V*3/(4*Math.PI));b.at=age;merged++;}
     const mass=V*1e-6,rough=1+.30*Math.sin(y*.054+phase)+.12*Math.sin(x*.075-y*.032);
     const pin=.072*2*Math.PI*(radius/1000)*hysteresis*rough;
     const air=(wind*(5.5+7.0*speed)+gust*(3.0*Math.sin(age*1.31+phase)+1.7*Math.sin(age*2.77+phase*2)))*env.velocity;
     const fx=.5*1.2*air*Math.abs(air)*Math.PI*(radius/1000)**2*.24+mass*1.3*Math.sin(y*.061+phase)*Math.min(1,env.velocity);
     const fy=mass*9.81,force=Math.hypot(fx,fy);
     if(!moving&&force>pin){moving=true;release=age;}
     if(moving){
      const friction=pin*.24,damping=drag*Math.pow(radius,1.3),factor=Math.max(0,1-friction/force);
      const tx=fx*factor/damping,ty=fy*factor/damping,decay=Math.exp(-damping*dt/mass);
      vx=tx+(vx-tx)*decay;vy=ty+(vy-ty)*decay;
      x+=vx*1000*dt;y+=vy*1000*dt;
     }
     points.push(x,y,radius,Math.hypot(vx,vy));
     if(y>H+10||x< -10||x>W+10)return {points:new Float32Array(points),release,merged,end:age,exited:true};
    }
    return {points:new Float32Array(points),release,merged,end:(points.length/4-1)*dt,exited:false};
   }
   const preliminary=integrate([]),satellites=[];
   if(preliminary.exited){for(let i=0;i<5;i++){const age=preliminary.release+(preliminary.end-preliminary.release)*(.15+.7*rand()),p=sample(preliminary,age);satellites.push({x:p.x+(rand()-.5)*.24,y:p.y,r:.22+rand()*.30,at:null});}}
   const integrated=satellites.length?integrate(satellites):preliminary;
   // Finish each episode off the pane, leaving room for its cleared trail to
   // fade. Reject trapped candidates rather than popping a visible drop away.
   if(!integrated.exited)stats.rejected++;
   else{run={...integrated,satellites,period,offset,birth,shape};stats.runs++;stats.merged+=run.merged;for(let i=2;i<run.points.length;i+=4)stats.maxRadius=Math.max(stats.maxRadius,run.points[i]);}
  }
  cache.set(cacheKey,run);if(cache.size>cacheLimit)cache.delete(cache.keys().next().value);return run;
 }
 function sample(run,t){const f=clamp(t/dt,0,run.points.length/4-1),i=Math.floor(f),a=i*4,b=Math.min(i+1,run.points.length/4-1)*4,k=f-i,p=run.points;return {x:p[a]+(p[b]-p[a])*k,y:p[a+1]+(p[b+1]-p[a+1])*k,r:p[a+2]+(p[b+2]-p[a+2])*k,v:p[a+3]+(p[b+3]-p[a+3])*k};}
 function draw(time,settings){
  const newKey=[settings.rainAmount,settings.speed,settings.wind??-.4,settings.gust??.55,!!settings.stations,!!settings.tunnels,!!settings.bridges,!!settings.journey,!!settings.weatherCycle].join('|');
  if(key!==newKey){key=newKey;build(settings);}
  const t=(((time%300)+300)%300)/settings.speed;if(t===lastTime)return canvas;lastTime=t;
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(base,0,0);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
  for(let id=0;id<templates.length;id++){
   const template=templates[id],slot=Math.floor((t+template.offset)/template.period)%template.cycles,run=eventRun(template,slot,id);
   if(!run)continue;
   const age=(t+run.offset)%run.period;
   // Reconstruct clearance from the recent path. No accumulated-frame dependence:
   // scrubbing and offline video export have exactly the same wet glass.
   const from=Math.max(run.release,age-trailLife),to=Math.min(run.end,age);
   if(to>from){
    const mid=sample(run,(from+to)/2),a=sample(run,from),b=sample(run,to);
    const gradient=ctx.createLinearGradient(a.x*px,a.y*px,b.x*px,b.y*px);
    for(const f of [0,.5,1]){const fresh=clamp(1-(age-(from+(to-from)*f))/trailLife,0,1);gradient.addColorStop(f,'rgba(0,255,0,'+(fresh*fresh)+')');}
    ctx.globalAlpha=1;ctx.strokeStyle=gradient;ctx.lineWidth=(1.15+2.25*mid.r)*px;ctx.beginPath();ctx.moveTo(a.x*px,a.y*px);
    for(let at=from+.07;at<to;at+=.07){const p=sample(run,at);ctx.lineTo(p.x*px,p.y*px);}ctx.lineTo(b.x*px,b.y*px);ctx.stroke();
    const film=ctx.createLinearGradient(a.x*px,a.y*px,b.x*px,b.y*px);
    for(const f of [0,.5,1]){const fresh=clamp(1-(age-(from+(to-from)*f))/trailLife,0,1);film.addColorStop(f,'rgba(255,0,0,'+(.25*fresh*fresh)+')');}
    ctx.strokeStyle=film;ctx.lineWidth=(.65+mid.r*1.30)*px;ctx.stroke();
   }
   for(const b of run.satellites)if(b.at!==null&&age<b.at)drawCap(ctx,red,b.x,b.y,b.r,clamp(age/.7,0,1));
   if(age<run.end){const p=sample(run,age);drawCap(ctx,red,p.x,p.y,p.r,clamp(age/.7,0,1),1+Math.min(.18,p.v*1.7),run.shape);}
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';return canvas;
 }
 return {canvas,draw,get revision(){return revision;},get stats(){return {...stats,cached:cache.size,bytes:[...cache.values()].reduce((n,r)=>n+(r?r.points.byteLength:0),0)};},get runs(){return [...cache.values()].filter(Boolean);}};
}

async function prepareGraphicsProgram(gl,source,{timeout=25000,now=()=>performance.now(),pause=yieldToPage}={}){
 const shaders=[],program=gl.createProgram(),parallel=gl.getExtension('KHR_parallel_shader_compile');
 try{
  for(const [type,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,source]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  // Do not ask for COMPILE_STATUS, LINK_STATUS, logs or uniform locations
  // before this poll completes: those queries can block the browser thread.
  const started=now();
  if(parallel)while(!gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){
   if(gl.isContextLost())throw graphicsError('The graphics connection was lost while starting. Try compatibility mode.');
   if(now()-started>timeout)throw graphicsError('The graphics engine is taking too long to start. Try compatibility mode.','Shader compilation timeout');
   await pause();
  }
  if(gl.isContextLost())throw graphicsError('The graphics connection was lost while starting. Try compatibility mode.');
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw graphicsError('This browser could not prepare the train graphics. Try compatibility mode.',[gl.getProgramInfoLog(program),...shaders.map(s=>gl.getShaderInfoLog(s))].filter(Boolean).join('\n'));
  return program;
 }catch(error){gl.deleteProgram(program);throw error;}
 finally{for(const shader of shaders)gl.deleteShader(shader);}
}
async function makeWorldRenderer(canvas,mode=activeGraphics){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 if(!gl)throw graphicsError('This browser could not start WebGL graphics. Open the site directly in a browser with graphics acceleration available.','WebGL context unavailable. Compatibility mode also requires WebGL.');
 canvas.addEventListener('webglcontextlost',event=>event.preventDefault());
 try{
 const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE),units=gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
 if(maxTexture<4032||units<8)throw graphicsError('This browser’s graphics limits are too small for these scenes. Try another browser on this computer.','Maximum texture size: '+maxTexture+'; texture units: '+units+' (required: 4032 and 8).');
 const source=mode==='compatible'?'#define COMPATIBILITY\n'+fragment:fragment;
 const program=await prepareGraphicsProgram(gl,source);gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const slots=['landscape','woodland','foreground','detail','interior'];
 const textures=slots.map((name,i)=>{const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,name),i);return tex;});
 const loadedKeys=Array(slots.length).fill(null);
 const metrics={"christmasmid":[1674,1.299043062200957],"christmasnear":[1874,1.1602564102564104],"christmasfront":[1990,1.0925553319919517],"woodland":[1710,1.2716627634660422],"foreground":[2034,1.0688976377952757],"citymid":[2078,1.046242774566474],"citynear":[1714,1.2686915887850467],"cityrail":[1662,1.308433734939759],"desertmesa":[1862,1.167741935483871],"desertnear":[1778,1.222972972972973],"desertgrass":[1606,1.3541147132169575],"halloweenmid":[2106,1.032319391634981],"halloweennear":[1578,1.3781725888324874],"halloweenfront":[1774,1.2257336343115124],"bayoumid":[1818,1.196035242290749],"bayounear":[2082,1.0442307692307693],"bayoufront":[1590,1.3677581863979849]};
 function bindAssets(settings){const keys=[...SCENES[settings.scene].textures,WINDOWS[settings.carriage].asset];for(let i=0;i<keys.length;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);if(loadedKeys[i]!==keys[i]){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images[keys[i]]);loadedKeys[i]=keys[i];}}
 const m=keys.slice(1,4).map(k=>metrics[k]);
 gl.uniform3f(loc.tileWidth,m[0][0],m[1][0],m[2][0]);gl.uniform3f(loc.tileScale,m[0][1],m[1][1],m[2][1]);}

 const loc={};['phase','movement','reflections','exposure','showNear','showFrame','scene','windowWarmth','lighting','rainAmount','snowAmount','rainFocus','condensation','renderStage','motionBlur','travelSpeed','windowDepth','reflectionIndex','windDirection','gustStrength','tileWidth','tileScale','clockPhase','tunnelCoverage','tunnelBounds','bridgeActive','bridgeBounds','stationX','fogAmount','wetness','readingLamp','glassWear'].forEach(k=>loc[k]=gl.getUniformLocation(program,k));

 const wet=createWetGlass();let wetVersion=-1,targetWidth=0,targetHeight=0;
 function extraTexture(unit,name){const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.uniform1i(gl.getUniformLocation(program,name),unit);return texture;}
 const waterTexture=extraTexture(5,'waterMap'),sceneTexture=extraTexture(6,'sceneMap'),reflectionTexture=extraTexture(7,'reflectionAtlas'),framebuffer=gl.createFramebuffer();
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images.journey_atlas);
 function renderWet(time,settings){
  const map=wet.draw(time,settings);const cache=time+'|'+wet.revision;
  gl.activeTexture(gl.TEXTURE0+5);gl.bindTexture(gl.TEXTURE_2D,waterTexture);if(wetVersion!==cache){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,map);wetVersion=cache;}
  gl.activeTexture(gl.TEXTURE0+6);gl.bindTexture(gl.TEXTURE_2D,sceneTexture);
  gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
  if(targetWidth!==canvas.width||targetHeight!==canvas.height){targetWidth=canvas.width;targetHeight=canvas.height;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,targetWidth,targetHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,sceneTexture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Wet-glass rendering could not start. Try a smaller video size.');}
  // The render target must not also be bound to an active sampler in WebGL.
  gl.bindTexture(gl.TEXTURE_2D,textures[0]);gl.uniform1f(loc.renderStage,0);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,sceneTexture);
 }
 let firstDraw=true;
 return {gl,draw(time,settings=state){if(gl.isContextLost())throw graphicsError('The graphics connection stopped. Reopen in compatibility mode.');gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);const original=settings,j=journeyFrame(time,original);settings={...original,scene:j.scene,snowAmount:j.snow};bindAssets(settings);
 gl.uniform1f(loc.phase,j.phase);gl.uniform1f(loc.clockPhase,j.clockPhase);gl.uniform1f(loc.tunnelCoverage,j.tunnel);gl.uniform2f(loc.tunnelBounds,...j.tunnelBounds);gl.uniform1f(loc.bridgeActive,j.bridgeActive);gl.uniform2f(loc.bridgeBounds,...j.bridgeBounds);gl.uniform1f(loc.stationX,j.stationX);gl.uniform1f(loc.fogAmount,j.fog);gl.uniform1f(loc.wetness,j.weather);gl.uniform1f(loc.readingLamp,settings.readingLamp);gl.uniform1f(loc.glassWear,settings.glassWear);
 gl.uniform1f(loc.movement,settings.vibration*(.12+.88*Math.min(1,j.velocity)));gl.uniform1f(loc.reflections,settings.reflection);gl.uniform1f(loc.motionBlur,settings.motionBlur);gl.uniform1f(loc.travelSpeed,settings.speed*j.velocity);gl.uniform1f(loc.windowDepth,settings.windowDepth);gl.uniform1f(loc.reflectionIndex,WINDOWS[settings.carriage].reflectionIndex);gl.uniform1f(loc.exposure,settings.exposure);gl.uniform1f(loc.showNear,+settings.near);gl.uniform1f(loc.showFrame,+settings.frame);gl.uniform1f(loc.scene,SCENES[settings.scene].value);gl.uniform1f(loc.windowWarmth,WINDOWS[settings.carriage].warmth);gl.uniform1f(loc.lighting,settings.lighting);gl.uniform1f(loc.rainAmount,settings.rainAmount*j.weather);gl.uniform1f(loc.snowAmount,settings.snowAmount||0);gl.uniform1f(loc.rainFocus,settings.rainFocus??.65);gl.uniform1f(loc.windDirection,settings.wind);gl.uniform1f(loc.gustStrength,settings.gust);gl.uniform1f(loc.condensation,settings.condensation);if(settings.rainAmount*j.weather>.001)renderWet(j.local,settings);gl.uniform1f(loc.renderStage,1);gl.drawArrays(gl.TRIANGLES,0,6);
 if(firstDraw){firstDraw=false;const error=gl.getError();if(error!==gl.NO_ERROR||gl.isContextLost())throw graphicsError('The first train frame could not render. Try compatibility mode.','WebGL error: '+error);}
 },destroy(){gl.deleteTexture(reflectionTexture);gl.deleteTexture(waterTexture);gl.deleteTexture(sceneTexture);gl.deleteFramebuffer(framebuffer);textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }catch(error){gl.getExtension('WEBGL_lose_context')?.loseContext();throw error;}
}
async function makeRenderer(canvas,mode=activeGraphics){
 const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
 const world=await makeWorldRenderer(surface,mode),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx){world.destroy();throw Error('The video canvas could not start. Please reopen the app.');}
 const ledges={original:.925,commuter:.95,sleeper:.94,panorama:.965,vintage:.935,luxury:.93,alpine:.965,retro:.95};
 return {gl:world.gl,draw(time,settings=state){
  if(surface.width!==canvas.width||surface.height!==canvas.height){surface.width=canvas.width;surface.height=canvas.height;}
  world.draw(time,settings);const W=canvas.width,H=canvas.height,j=journeyFrame(time,settings),a=j.clockPhase*TAU;
  const zoom=1+(1-settings.seatDistance)*.68;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0b0e10';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);ctx.scale(zoom,zoom);ctx.translate(-W/2,-H/2);ctx.drawImage(surface,0,0,W,H);
  const movement=settings.vibration*(.12+.88*Math.min(1,j.velocity));
  const tx=movement*(.00065*Math.sin(a*71)+.00018*Math.sin(a*1231)+.010*Math.sin(a*17)+.003*Math.sin(a*29));
  const ty=movement*(.001*Math.sin(a*53)+.00032*Math.sin(a*1561)+.00020*Math.sin(a*2107)+.006*Math.sin(a*13)+.002*Math.sin(a*37));
  const roll=movement*(.001*Math.sin(a*41)+.0003*Math.sin(a*937));
  ctx.translate(W*(.5-tx),H*(.5-ty));ctx.rotate(-roll);ctx.scale(1.022,1.022);ctx.translate(-W/2,-H/2);
  if(settings.frame&&settings.curtain){
   const img=images.cabin_curtain,h=H*.97,w=h*img.width/img.height;
   for(let strip=0;strip<32;strip++){
    const f=strip/32,sy=img.height*f,sh=img.height/32,shift=Math.sin(a*13+f*2.2)*W*.003*Math.sin(f*Math.PI)*(.35+.65*j.velocity);
    ctx.drawImage(img,0,sy,img.width,sh,-w*.25+shift,H*.008+h*f,w,h/32+.5);
   }
  }
  if(settings.frame&&settings.mug){
   const img=images.cabin_mug,w=W*.12,h=w*img.height/img.width,x=W*.775,y=H*ledges[settings.carriage]-h;
   ctx.drawImage(img,x,y,w,h);
   ctx.save();ctx.beginPath();ctx.rect(x-w*.35,y-H*.18,w*1.7,H*.26);ctx.clip();
   for(let i=0;i<10;i++){
    const life=wrap(j.local/10+i/10,1),rise=life*H*.17,sway=Math.sin(a*17+i*.71)*W*.003;
    const alpha=Math.sin(life*Math.PI)*.035;
    ctx.strokeStyle='rgba(235,229,219,'+alpha+')';ctx.lineWidth=W*(.0008+life*.0012);ctx.shadowColor='rgba(230,222,210,.12)';ctx.shadowBlur=W*.004;
    ctx.beginPath();ctx.moveTo(x+w*.43+sway,y+h*.17-rise);ctx.bezierCurveTo(x+w*.33-sway,y+h*.13-rise-H*.025,x+w*.52+sway,y+h*.14-rise-H*.045,x+w*.42,y+h*.14-rise-H*.06);ctx.stroke();
   }ctx.restore();
  }
  ctx.restore();
 },destroy(){world.destroy();surface.width=surface.height=1;}};
}

const AUDIO_DATA="assets/rain.ogg";
const mixer={enabled:false,master:.65,rumble:.55,wheels:.35,rainVolume:0,music:.75,musicLoop:true};
const AUDIO_RATE=48000;
function loopAudio(channels,sr,seconds,fadeSeconds){
 const n=Math.min(Math.round(seconds*sr),channels[0].length-Math.round(fadeSeconds*sr)),fade=Math.min(Math.round(fadeSeconds*sr),Math.floor(n/4));
 return {sampleRate:sr,length:n,channels:channels.map(source=>{const d=new Float32Array(n);d.set(source.subarray(0,n));for(let i=0;i<fade;i++){const a=i/fade*Math.PI/2;d[i]=source[n+i]*Math.cos(a)+source[i]*Math.sin(a);}return d;})};
}
function generateTrainAudio(kind,sr=AUDIO_RATE){
 const seconds=14,n=Math.round(seconds*sr),channels=[];let seed=kind==='rumble'?7813:2197;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 for(let ch=0;ch<2;ch++){
  const d=new Float32Array(n);let low=0,bass=0,metal=0;
  for(let i=0;i<n;i++){
   const t=i/sr,noise=random();low=.960*low+.040*noise;bass=.996*bass+.004*noise;metal=.50*metal+.50*noise;
   if(kind==='rumble')d[i]=(low*1.5+bass*3.0+Math.sin(TAU*42*t+ch*.15)*.020+Math.sin(TAU*84*t+ch*.11)*.010)*(.83+.10*Math.sin(TAU*t/12)+.07*Math.sin(TAU*t/3));
   else{const beat=((t+ch*.007)%.6),b2=(beat+.37)%.6;const hit=x=>Math.exp(-x*53)*(.48*Math.sin(TAU*95*x)+metal*.70)+Math.exp(-x*160)*noise*.13;d[i]=hit(beat)*.32+hit(b2)*.23;}
  }
  channels.push(d);
 }
 return loopAudio(channels,sr,12,2);
}
function readSample(b,t,ch,loop=true){
 if(!b)return 0;let x=t*b.sampleRate,n=b.length;if(loop)x=((x%n)+n)%n;else if(x<0||x>=n)return 0;
 const i=Math.floor(x),f=x-i,d=b.channels[Math.min(ch,b.channels.length-1)],j=loop?(i+1)%n:Math.min(i+1,n-1);return d[i]+(d[j]-d[i])*f;
}
function mixSamples(bank,levels,start,count,speed,sceneOrigin=0,fullDuration=0,audioOrigin=sceneOrigin/speed,settings=state){
 const result=new Float32Array(count*2),musicBuffer=levels.musicLoop?bank.musicLoop:bank.music;
 const j0=journeyFrame(sceneOrigin+start/AUDIO_RATE*speed,settings),j1=journeyFrame(sceneOrigin+(start+count)/AUDIO_RATE*speed,settings);
 const d0=j0.leg*LOOP+j0.distance;let d1=j1.leg*LOOP+j1.distance;if(d1<d0-.001)d1+=cycleSeconds(settings);
 for(let i=0;i<count;i++){
  const t=(start+i)/AUDIO_RATE,absolute=audioOrigin+t,sceneTime=d0+(d1-d0)*i/count,velocity=j0.velocity+(j1.velocity-j0.velocity)*i/count,tunnel=j0.tunnel+(j1.tunnel-j0.tunnel)*i/count,weather=j0.weather+(j1.weather-j0.weather)*i/count,rainExposure=j0.rainExposure+(j1.rainExposure-j0.rainExposure)*i/count;
  for(let ch=0;ch<2;ch++){
   let music=readSample(musicBuffer,absolute,ch,levels.musicLoop);
   // Close the soundtrack at the same point as a full scenic export, without
   // changing the duration or playback rate of the imported music.
   if(fullDuration&&t<1.5&&musicBuffer){const a=t/1.5*Math.PI/2;music=readSample(musicBuffer,absolute+fullDuration,ch,levels.musicLoop)*Math.cos(a)+music*Math.sin(a);}
   const train=at=>readSample(bank.rumble,at,ch)*levels.rumble*Math.sqrt(Math.max(0,velocity))+readSample(bank.wheels,at,ch)*levels.wheels*Math.min(1,velocity);
   const sum=train(sceneTime)+tunnel*(train(sceneTime-.12*speed)*.22+train(sceneTime-.24*speed)*.09)+readSample(bank.rain,absolute,ch)*levels.rainVolume*.60*rainExposure*(settings.weatherCycle?weather:1)+music*levels.music;
   result[ch*count+i]=Math.tanh(sum*levels.master*.80);
  }
 }
 return result;
}
function createAudioEngine(){
 let ctx=null,preparing=null,master=null,limiter=null,sources=[],musicToken=0,echoSend=null,lastTick=0;const bank={},gains={};
 const asBuffer=spec=>{const b=ctx.createBuffer(spec.channels.length,spec.length,spec.sampleRate);spec.channels.forEach((v,i)=>b.copyToChannel(v,i));return b;};
 const fromBuffer=b=>({sampleRate:b.sampleRate,length:b.length,channels:Array.from({length:Math.min(2,b.numberOfChannels)},(_,i)=>new Float32Array(b.getChannelData(i)))});
 async function prepare(){
  if(preparing)return preparing;
  preparing=(async()=>{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio is unavailable in this browser. The scenic ride still works.');
   if(!ctx){ctx=new Audio({sampleRate:AUDIO_RATE});master=ctx.createGain();master.gain.value=0;limiter=ctx.createWaveShaper();const curve=new Float32Array(65537);for(let i=0;i<curve.length;i++)curve[i]=Math.tanh((i/(curve.length-1)*2-1)*4);limiter.curve=curve;limiter.oversample='2x';master.connect(limiter);limiter.connect(ctx.destination);
    for(const key of ['rumble','wheels','rain','music']){gains[key]=ctx.createGain();gains[key].connect(master);}
    echoSend=ctx.createGain();echoSend.gain.value=0;const delay=ctx.createDelay(.5),feedback=ctx.createGain();delay.delayTime.value=.12;feedback.gain.value=.40;gains.rumble.connect(echoSend);gains.wheels.connect(echoSend);echoSend.connect(delay);delay.connect(master);delay.connect(feedback);feedback.connect(delay);
   }
   bank.rumble=generateTrainAudio('rumble');bank.wheels=generateTrainAudio('wheels');
   const response=await fetch(AUDIO_DATA||'assets/rain.ogg');if(!response.ok)throw Error('The rain recording could not be loaded. Reload this page and try again.');
   const decoded=await ctx.decodeAudioData(await response.arrayBuffer());const rain=fromBuffer(decoded);bank.rain=loopAudio(rain.channels,rain.sampleRate,20,2);
   for(const key of ['rumble','wheels','rain'])bank[key].playbackBuffer=asBuffer(bank[key]);
   updateGains();return bank;
  })().catch(e=>{preparing=null;throw e;});return preparing;
 }
 function stop(){if(!ctx)return;for(const {source,voice} of sources){voice.gain.cancelScheduledValues(ctx.currentTime);voice.gain.setTargetAtTime(0,ctx.currentTime,.010);try{source.stop(ctx.currentTime+.060);}catch(e){}source.onended=()=>{source.disconnect();voice.disconnect();};}sources=[];master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(0,ctx.currentTime,.012);}
 function updateGains(){if(!ctx)return;const now=ctx.currentTime,j=journeyFrame(state.time,state);for(const [key,v] of Object.entries({rumble:mixer.rumble*Math.sqrt(j.velocity),wheels:mixer.wheels*Math.min(1,j.velocity),rain:mixer.rainVolume*.60*j.rainExposure*(state.weatherCycle?j.weather:1),music:mixer.music}))gains[key].gain.setTargetAtTime(v,now,.045);if(echoSend)echoSend.gain.setTargetAtTime(j.tunnel*.22,now,.10);for(const item of sources)if(item.train)item.source.playbackRate.setTargetAtTime(Math.max(.001,state.speed*j.velocity),now,.035);master.gain.setTargetAtTime(mixer.enabled&&state.playing&&!state.exporting&&!document.hidden?mixer.master*.20:0,now,.035);}
 function tick(now){if(now-lastTick>90){lastTick=now;updateGains();}}
 function sync(){
  stop();if(!ctx||!bank.rain||!mixer.enabled||!state.playing||state.exporting||document.hidden)return;
  const now=ctx.currentTime+.055;
  for(const key of ['rumble','wheels','rain','music']){
   const b=key==='music'?(mixer.musicLoop?bank.musicLoop:bank.music):bank[key];if(!b)continue;
   const source=ctx.createBufferSource();source.buffer=b.playbackBuffer;source.loop=key!=='music'||mixer.musicLoop;
   const train=key==='rumble'||key==='wheels',j=journeyFrame(state.time,state),position=train?j.leg*LOOP+j.distance:state.audioTime;
   const seconds=b.length/b.sampleRate;if(!source.loop&&position>=seconds)continue;
   source.playbackRate.value=train?state.speed:1;const voice=ctx.createGain();voice.gain.setValueAtTime(0,now);voice.gain.linearRampToValueAtTime(1,now+.035);source.connect(voice);voice.connect(gains[key]);source.start(now,source.loop?position%seconds:position);sources.push({source,voice,train});
  }
  updateGains();
 }
 async function toggle(){
  if(state.exporting)return;
  if(mixer.enabled){mixer.enabled=false;stop();refreshAudioUI();return;}
  $('audioStatus').textContent='Preparing the soundtrack…';$('sound').disabled=true;$('enableAudio').disabled=true;
  try{const p=prepare();if(ctx)await ctx.resume();await p;mixer.enabled=true;sync();refreshAudioUI();}
  catch(e){$('audioStatus').textContent=e.message;}
  finally{$('sound').disabled=false;$('enableAudio').disabled=false;}
 }
 async function loadMusic(file){
  const token=++musicToken;if(!file)return;if(file.size>200*1024*1024){$('audioStatus').textContent='Choose an audio file under 200 MB; MP3 keeps long tracks smaller.';return;}
  $('musicName').textContent='Loading '+file.name+'…';$('musicFile').disabled=true;$('export').disabled=true;
  try{await prepare();const decoded=await ctx.decodeAudioData(await file.arrayBuffer());if(token!==musicToken)return;
   bank.music=fromBuffer(decoded);bank.music.playbackBuffer=asBuffer(bank.music);const duration=decoded.duration,fade=Math.min(1.5,duration/8);
   bank.musicLoop=loopAudio(bank.music.channels,bank.music.sampleRate,duration-fade,fade);bank.musicLoop.playbackBuffer=asBuffer(bank.musicLoop);
   $('musicName').textContent=file.name+' · '+fmt(duration);$('removeMusic').hidden=false;state.audioTime=0;sync();$('audioStatus').textContent=mixer.enabled?'Sound on · your track is in the mix.':'Track ready. Enable sound to listen.';
  }catch(e){$('musicName').textContent=bank.music?'Previous track kept.':'No music loaded.';$('audioStatus').textContent='That audio file could not be decoded. Try MP3, WAV, M4A, or OGG.';}
  finally{if(token===musicToken){$('musicFile').disabled=false;$('export').disabled=false;}}
 }
 function removeMusic(){musicToken++;delete bank.music;delete bank.musicLoop;$('musicFile').value='';$('musicFile').disabled=false;$('export').disabled=false;$('musicName').textContent='No music loaded · choose an MP3, WAV, M4A, or OGG.';$('removeMusic').hidden=true;sync();}
 return {prepare,sync,stop,updateGains,tick,toggle,loadMusic,removeMusic,get bank(){return bank;}};
}
const audioEngine=createAudioEngine();
function refreshAudioUI(){$('sound').textContent=mixer.enabled?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',mixer.enabled);$('enableAudio').textContent=mixer.enabled?'Mute preview sound':'Enable sound';$('audioStatus').textContent=mixer.enabled?'Sound on · follows pause, seek, and travel speed.':'Preview muted. Export audio uses the mixer levels.';}
$('sound').onclick=()=>audioEngine.toggle();$('enableAudio').onclick=()=>audioEngine.toggle();
for(const key of ['master','rumble','wheels','rainVolume','music'])$(key).oninput=e=>{if(state.exporting)return;mixer[key]=+e.target.value/100;$(key+'Value').textContent=e.target.value+'%';audioEngine.updateGains();};
$('musicFile').onchange=e=>audioEngine.loadMusic(e.target.files?.[0]);$('removeMusic').onclick=()=>audioEngine.removeMusic();$('musicLoop').onchange=e=>{mixer.musicLoop=e.target.checked;audioEngine.sync();};
function updateWeatherUI(){for(const [name,v] of Object.entries({clear:0,drizzle:.35,rain:.75}))$('weather-'+name).setAttribute('aria-pressed',Math.abs(state.rainAmount-v)<.005);}
for(const [name,value] of Object.entries({clear:0,drizzle:.35,rain:.75}))$('weather-'+name).onclick=()=>{if(state.exporting)return;state.rainAmount=value;$('rainAmount').value=value*100;$('rainAmountValue').textContent=Math.round(value*100)+'%';updateWeatherUI();renderer?.draw(state.time);};

function updateSceneUI(){
 const s=SCENES[state.scene];$('sceneTitle').textContent=state.journey?'Your Connected Journey':s.title;$('sceneDescription').textContent=state.journey?state.route.map(x=>SCENES[x].label).join(' → '):s.description;$('sceneNumber').textContent=state.journey?'TRAIN WINDOW STUDIO · THREE-STOP JOURNEY':'TRAIN WINDOW STUDIO · SCENE '+s.number;$('sceneLabel').textContent=s.label.toUpperCase();$('nearLabel').textContent=state.journey?'Nearby scenery':s.near;$('view').setAttribute('aria-label','Animated train-window view: '+s.label);$('scenePanel').setAttribute('aria-labelledby','tab-'+state.scene);
 $('carriage').value=state.carriage;for(const id of Object.keys(SCENES)){const tab=$('tab-'+id);tab.setAttribute('aria-selected',id===state.scene);tab.tabIndex=id===state.scene?0:-1;}
}
function setScene(id){if(!SCENES[id]||state.exporting)return;if(!state.journey)scenePositions[state.scene]=state.time;state.journey=false;$('journey').checked=false;$('routeControls').hidden=true;sceneWeather[state.scene]={rainAmount:state.rainAmount,snowAmount:state.snowAmount};state.scene=id;state.time=scenePositions[id];Object.assign(state,sceneWeather[id]);for(const key of ['rainAmount','snowAmount']){$(key).value=state[key]*100;$(key+'Value').textContent=Math.round(state[key]*100)+'%';}updateWeatherUI();audioEngine.sync();updateSceneUI();renderer?.draw(state.time);updateUI();}
$('carriage').value=state.carriage;for(const id of Object.keys(SCENES)){const tab=$('tab-'+id);tab.onclick=()=>setScene(id);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const ids=Object.keys(SCENES),i=ids.indexOf(id);const next=e.key==='Home'?ids[0]:e.key==='End'?ids[ids.length-1]:ids[(i+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length];setScene(next);$('tab-'+next).focus();}};}
function setCarriage(id){if(!WINDOWS[id]||state.exporting)return;state.carriage=id;state.frame=true;$('frame').checked=true;$('carriage').value=id;renderer?.draw(state.time);}
$('carriage').onchange=e=>setCarriage(e.target.value);
function cycleCarriage(step){const ids=Object.keys(WINDOWS);setCarriage(ids[(ids.indexOf(state.carriage)+step+ids.length)%ids.length]);}
$('previousCarriage').onclick=()=>cycleCarriage(-1);$('nextCarriage').onclick=()=>cycleCarriage(1);
function lockPresetControls(locked){for(const id of Object.keys(SCENES))$('tab-'+id).disabled=locked;for(const id of ['carriage','previousCarriage','nextCarriage','vibration','reflection','motionBlur','windowDepth','exposure','lighting','rainAmount','snowAmount','rainFocus','condensation','wind','gust','weather-clear','weather-drizzle','weather-rain','near','frame','speed','seek','sound','enableAudio','master','rumble','wheels','rainVolume','music','musicFile','removeMusic','musicLoop','resolution','fps','length','exportAudio','videoSettings','graphicsMode',...EXTRA_CONTROLS])$(id).disabled=locked;}

function fmt(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function updateUI(){ const j=journeyFrame(state.time,state);$('journeyStatus').textContent=j.status+(state.journey?' · stop '+(j.leg+1)+' of 3':'');$('sceneLabel').textContent=(state.journey?'JOURNEY · ':'')+j.status.toUpperCase();$('seek').max=cycleSeconds();$('clock').textContent=fmt(state.time/state.speed);$('duration').textContent=fmt(cycleSeconds()/state.speed);if(!seekDragging)$('seek').value=state.time;$('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'Pause':'Play');$('cycleText').textContent=fmt(cycleSeconds()/state.speed)+' at this speed';}
let lastPreviewPaint=0;
function animate(now){if(activeGraphics==='compatible'&&now-lastPreviewPaint<1000/30){requestAnimationFrame(animate);return;}lastPreviewPaint=now;try{const dt=Math.min((now-last)/1000,.1);last=now;if(!state.exporting){if(state.playing){state.time=(state.time+dt*state.speed)%cycleSeconds();state.audioTime+=dt;}renderer.draw(state.time);audioEngine.tick(now);updateUI();}requestAnimationFrame(animate);}catch(error){audioEngine.stop();showStartupError(error);}}
function togglePlay(){if(state.exporting)return;state.playing=!state.playing;audioEngine.sync();updateUI();}
$('play').onclick=togglePlay;
$('seek').onpointerdown=()=>seekDragging=true;window.addEventListener('pointerup',()=>seekDragging=false);
$('seek').oninput=e=>{if(state.exporting)return;state.time=+e.target.value;state.audioTime=state.time/state.speed;audioEngine.sync();renderer.draw(state.time);updateUI();};
$('speed').onchange=e=>{if(state.exporting)return;state.speed=+e.target.value;audioEngine.sync();updateUI();};
for(const key of ['vibration','reflection','motionBlur','windowDepth','exposure','lighting','rainAmount','snowAmount','rainFocus','condensation','wind','gust'])$(key).oninput=e=>{if(state.exporting)return;state[key]=+e.target.value/100;$(key+'Value').textContent=e.target.value+'%';if(key==='rainAmount')updateWeatherUI();};
for(const key of ['near','frame'])$(key).onchange=e=>state[key]=e.target.checked;
function setSettingsOpen(open){
 $('panel').hidden=!open;document.body.classList.toggle('settings-open',open);
 $('settings').setAttribute('aria-expanded',String(open));
}
$('settings').onclick=()=>setSettingsOpen($('panel').hidden);
$('closeSettings').onclick=()=>{setSettingsOpen(false);$('settings').focus();};
$('videoSettings').onclick=()=>{if(state.exporting)return;$('exportModal').hidden=true;setSettingsOpen(true);$('videoOptions').open=true;$('videoOptions').querySelector('summary').focus();};
function cinema(){const active=document.body.classList.toggle('cinema');$('cinema').setAttribute('aria-pressed',String(active));if(active)$('show').focus();else $('cinema').focus();}
$('cinema').onclick=cinema;$('show').onclick=cinema;
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){$('fullscreen').title='Fullscreen is unavailable here. Open this site in a full browser tab.';}}
$('fullscreen').onclick=fullscreen;
window.addEventListener('keydown',e=>{if(e.key!=='Escape'&&(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||(document.activeElement.tagName==='BUTTON'&&e.code==='Space')))return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key.toLowerCase()==='h')cinema();if(e.key.toLowerCase()==='f')fullscreen();if(e.key==='Escape'){if(document.body.classList.contains('cinema')){document.body.classList.remove('cinema');$('cinema').setAttribute('aria-pressed','false');$('cinema').focus();}else if(!$('exportModal').hidden&&!state.exporting){$('exportModal').hidden=true;$('export').focus();}else if(!$('panel').hidden){setSettingsOpen(false);$('settings').focus();}}});
document.addEventListener('visibilitychange',()=>{last=performance.now();audioEngine.sync();});

const EXPERIENCE_NUMBERS=['seatDistance','readingLamp','glassWear','fogAmount'];
const EXPERIENCE_BOOLS=['journey','tunnels','bridges','stations','weatherCycle','curtain','mug'];
const SETTING_NUMBERS=['speed','vibration','reflection','motionBlur','windowDepth','exposure','lighting','rainAmount','snowAmount','rainFocus','condensation','wind','gust',...EXPERIENCE_NUMBERS];
const SETTING_BOOLS=['near','frame',...EXPERIENCE_BOOLS];
const EXTRA_CONTROLS=[...EXPERIENCE_NUMBERS,...EXPERIENCE_BOOLS,'route0','route1','route2','favoriteName','favorites','saveFavorite','updateFavorite','loadFavorite','deleteFavorite','backupFavorites','restoreFavorites','favoriteFile','queueAdd','runQueue','clearQueue','previewTunnel','previewBridge','previewStation'];
const FAVORITES_KEY='train-window-studio-favorites-v1';let favorites=[],exportQueue=[],batchResume=null;
function cleanSettings(value={}){
 const out={scene:Object.hasOwn(SCENES,value.scene)?value.scene:'halloween',carriage:Object.hasOwn(WINDOWS,value.carriage)?value.carriage:'original',time:0,audioTime:0};
 for(const k of SETTING_NUMBERS){const fallback=k in EXPERIENCE_DEFAULTS?EXPERIENCE_DEFAULTS[k]:state[k];let v=Number(value[k]);if(!Number.isFinite(v))v=fallback;
  out[k]=k==='speed'?([.75,1,1.5].includes(v)?v:1):k==='exposure'?Math.max(.65,Math.min(1.4,v)):k==='wind'?Math.max(-1,Math.min(1,v)):clamp01(v);}
 for(const k of SETTING_BOOLS)out[k]=typeof value[k]==='boolean'?value[k]:(k in EXPERIENCE_DEFAULTS?EXPERIENCE_DEFAULTS[k]:true);
 out.route=Array.isArray(value.route)&&value.route.length===3&&value.route.every(x=>Object.hasOwn(SCENES,x))?[...value.route]:[...EXPERIENCE_DEFAULTS.route];return out;
}
function cleanLevels(v={}){const x={enabled:false,musicLoop:v.musicLoop!==false};for(const k of ['master','rumble','wheels','rainVolume','music'])x[k]=Number.isFinite(+v[k])?clamp01(+v[k]):mixer[k];return x;}
function exportOptions(){return {fps:+$('fps').value,height:+$('resolution').value,length:$('length').value,audio:$('exportAudio').checked};}
function cleanOptions(v={}){return {fps:v.fps===60?60:30,height:v.height===720?720:1080,length:['20','loop','600','720','900','1200'].includes(v.length)?v.length:'900',audio:v.audio!==false};}
function snapshot(){return {settings:cleanSettings(state),levels:cleanLevels(mixer),options:cleanOptions(exportOptions())};}
function syncExperienceUI(){
 for(const k of SETTING_NUMBERS){const el=$(k);if(el)el.value=k==='speed'?state[k]:Math.round(state[k]*100);if($(k+'Value'))$(k+'Value').textContent=k==='seatDistance'?(state[k]<.05?'Close':state[k]>.95?'Roomier':Math.round(state[k]*100)+'%'):Math.round(state[k]*100)+'%';}
 for(const k of SETTING_BOOLS)if($(k))$(k).checked=state[k];
 for(let i=0;i<3;i++)$('route'+i).value=state.route[i];$('routeControls').hidden=!state.journey;
 for(const k of ['master','rumble','wheels','rainVolume','music']){$(k).value=Math.round(mixer[k]*100);$(k+'Value').textContent=Math.round(mixer[k]*100)+'%';}
 $('musicLoop').checked=mixer.musicLoop;updateWeatherUI();updateSceneUI();updateUI();
}
for(let i=0;i<3;i++){for(const [id,scene] of Object.entries(SCENES)){const option=document.createElement('option');option.value=id;option.textContent=scene.label;$('route'+i).appendChild(option);}$('route'+i).value=state.route[i];$('route'+i).onchange=()=>{if(state.exporting)return;state.route=[0,1,2].map(i=>$('route'+i).value);state.time=0;audioEngine.sync();syncExperienceUI();};}
for(const k of EXPERIENCE_NUMBERS)$(k).oninput=e=>{if(state.exporting)return;state[k]=+e.target.value/100;$(k+'Value').textContent=k==='seatDistance'?(state[k]===1?'Roomier':state[k]===0?'Close':e.target.value+'%'):e.target.value+'%';};
for(const k of EXPERIENCE_BOOLS)$(k).onchange=e=>{if(state.exporting)return;state[k]=e.target.checked;if(k==='journey')state.time=0;if(k==='weatherCycle'&&state.weatherCycle&&state.rainAmount===0)state.rainAmount=.60;audioEngine.sync();syncExperienceUI();};
for(const [id,key,time] of [['previewTunnel','tunnels',46],['previewStation','stations',87],['previewBridge','bridges',RIVER_CROSSING.preview]])$(id).onclick=()=>{if(state.exporting)return;state[key]=true;state.time=Math.floor(state.time/LOOP)*LOOP+time;state.audioTime=state.time/state.speed;state.playing=true;last=performance.now();audioEngine.sync();syncExperienceUI();renderer?.draw(state.time);updateUI();};
function storeFavorites(){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify({version:1,favorites}));return true;}catch(e){$('favoriteStatus').textContent='Saved for this session. This browser could not store favorites; use Back up favorites to keep them.';return false;}}
function renderFavorites(selected=''){$('favorites').replaceChildren();const option=document.createElement('option');option.value='';option.textContent='Choose a favorite…';$('favorites').appendChild(option);for(const f of favorites){const o=document.createElement('option');o.value=f.id;o.textContent=f.name;$('favorites').appendChild(o);}$('favorites').value=selected;}
function parseFavorites(data){if(data?.version!==1||!Array.isArray(data.favorites)||data.favorites.length>48)throw Error('Choose a Train Window Studio favorites backup with up to 48 favorites.');const ids=new Set();return data.favorites.map((f,i)=>{const id=typeof f.id==='string'&&f.id.length<100&&!ids.has(f.id)?f.id:'import-'+Date.now()+'-'+i;ids.add(id);return {id,name:String(f.name||'Window seat').slice(0,80),settings:cleanSettings(f.settings),levels:cleanLevels(f.levels),options:cleanOptions(f.options)};});}
try{const stored=localStorage.getItem(FAVORITES_KEY);if(stored)favorites=parseFavorites(JSON.parse(stored));}catch(e){$('favoriteStatus').textContent='Favorites could not be loaded. You can import a backup or save a new favorite.';}
renderFavorites();
function saveFavorite(update){if(state.exporting)return;const id=$('favorites').value,index=favorites.findIndex(x=>x.id===id),name=$('favoriteName').value.trim().slice(0,80)||rideName();if(update&&index<0){$('favoriteStatus').textContent='Choose a saved favorite to update.';return;}if(!update&&favorites.length>=48){$('favoriteStatus').textContent='You have 48 favorites. Update or remove one before adding another.';return;}const item={id:update?id:'seat-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),name,...snapshot()};if(update)favorites[index]=item;else favorites.push(item);renderFavorites(item.id);if(storeFavorites())$('favoriteStatus').textContent='Saved “'+name+'”. Music files remain in this session.';}
$('saveFavorite').onclick=()=>saveFavorite(false);$('updateFavorite').onclick=()=>saveFavorite(true);
$('loadFavorite').onclick=()=>{if(state.exporting)return;const f=favorites.find(x=>x.id===$('favorites').value);if(!f)return;Object.assign(state,cleanSettings(f.settings));const enabled=mixer.enabled;Object.assign(mixer,cleanLevels(f.levels),{enabled});const o=cleanOptions(f.options);$('fps').value=o.fps;$('resolution').value=o.height;$('length').value=o.length;$('exportAudio').checked=o.audio;$('favoriteName').value=f.name;audioEngine.sync();syncExperienceUI();renderer?.draw(0);$('favoriteStatus').textContent='Loaded “'+f.name+'”. Your current music file is kept.';};
$('deleteFavorite').onclick=()=>{if(state.exporting)return;const id=$('favorites').value;favorites=favorites.filter(x=>x.id!==id);renderFavorites();storeFavorites();};
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('backupFavorites').onclick=()=>downloadBlob(new Blob([JSON.stringify({version:1,favorites},null,2)],{type:'application/json'}),'Train_Window_Favorites.json');
$('restoreFavorites').onclick=()=>$('favoriteFile').click();$('favoriteFile').onchange=async e=>{if(state.exporting)return;const file=e.target.files?.[0];if(!file)return;try{if(file.size>2000000)throw Error('Choose a favorites JSON file under 2 MB.');const imported=parseFavorites(JSON.parse(await file.text()));const merged=[...favorites];for(const f of imported){const at=merged.findIndex(x=>x.id===f.id);if(at>=0)merged[at]=f;else merged.push(f);}if(merged.length>48)throw Error('Import would exceed 48 favorites. Remove some favorites first.');favorites=merged;renderFavorites();storeFavorites();$('favoriteStatus').textContent='Imported '+imported.length+' favorites.';}catch(e){$('favoriteStatus').textContent=e.message;}finally{$('favoriteFile').value='';}};
function renderQueue(){const list=$('queueList');list.replaceChildren();for(const [i,job] of exportQueue.entries()){const li=document.createElement('li');li.textContent=job.name+' · '+(job.options.length==='loop'?'full loop':job.options.length==='20'?'20 sec':(+job.options.length/60)+' min')+' · '+job.options.fps+' FPS'+(job.status?' · '+job.status:'');const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Remove '+job.name);remove.disabled=state.exporting;remove.onclick=()=>{if(state.exporting)return;exportQueue.splice(i,1);renderQueue();};li.appendChild(remove);list.appendChild(li);}$('queueStatus').textContent=exportQueue.length?exportQueue.length+' video'+(exportQueue.length===1?'':'s')+' queued.':'Queue is empty.';$('runQueue').disabled=state.exporting||!exportQueue.length;}
$('queueAdd').onclick=()=>{if(state.exporting)return;if(exportQueue.length>=12){$('queueStatus').textContent='Render or remove some items before adding more (12 maximum).';return;}const item=snapshot();item.settings.time=state.time;item.settings.audioTime=state.audioTime;exportQueue.push({...item,name:$('favoriteName').value.trim().slice(0,80)||rideName(),music:{music:audioEngine.bank.music||null,musicLoop:audioEngine.bank.musicLoop||null},status:'waiting'});renderQueue();};
$('clearQueue').onclick=()=>{if(!state.exporting){exportQueue=[];renderQueue();}};

// Minimal WebM container. Frames are encoded at explicit timestamps, independent
// of render speed. Long videos repeat an independently encoded scenic cycle.
// Blob-backed packets are shared across repeats instead of copying their bytes.
const bytes=(...v)=>new Uint8Array(v.flat());
function concat(parts){let n=parts.reduce((s,a)=>s+a.length,0),out=new Uint8Array(n),p=0;for(const a of parts){out.set(a,p);p+=a.length;}return out;}
function vint(n){let l=1;while(n>=Math.pow(2,7*l)-1)l++;let a=new Uint8Array(l);for(let i=l-1;i>=0;i--){a[i]=n%256;n=Math.floor(n/256);}a[0]|=1<<(8-l);return a;}
function uint(n){let a=[];do{a.unshift(n%256);n=Math.floor(n/256);}while(n);return new Uint8Array(a);}
function element(id,data){return concat([new Uint8Array(id),vint(data.length),data]);}
function num(id,n){return element(id,uint(n));}function str(id,s){return element(id,new TextEncoder().encode(s));}
function double(id,n){let b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,n);return element(id,b);}
function partSize(part){return part instanceof Blob?part.size:part.byteLength;}
function elementHeader(id,size){return concat([new Uint8Array(id),vint(size)]);}
function blobElement(id,parts){const size=parts.reduce((n,p)=>n+partSize(p),0);return new Blob([elementHeader(id,size),...parts]);}
function repeatEncodedVideo(chunks,cycleFrames,totalFrames,fps){
 if(chunks.length!==cycleFrames||!chunks[0]?.key)throw Error('The scenic cycle did not encode completely. Please try again.');
 const packets=[];
 for(let i=0;i<totalFrames;i++){
  const source=chunks[i%cycleFrames];
  packets.push({data:source.data,timestamp:Math.round(i*1e6/fps),key:source.key});
 }
 return packets;
}
function webm(chunks,width,height,fps,duration,codec,audio=null){
 const header=element([0x1a,0x45,0xdf,0xa3],concat([num([0x42,0x86],1),num([0x42,0xf7],1),num([0x42,0xf2],4),num([0x42,0xf3],8),str([0x42,0x82],'webm'),num([0x42,0x87],4),num([0x42,0x85],2)]));
 const info=element([0x15,0x49,0xa9,0x66],concat([num([0x2a,0xd7,0xb1],1000000),double([0x44,0x89],duration*1000),str([0x4d,0x80],'Train Window Studio'),str([0x57,0x41],'Train Window Studio')]));
 const video=element([0xe0],concat([num([0xb0],width),num([0xba],height)]));
 const entries=[element([0xae],concat([num([0xd7],1),num([0x73,0xc5],1),num([0x83],1),num([0x23,0xe3,0x83],Math.round(1e9/fps)),str([0x86],codec==='vp8'?'V_VP8':'V_VP9'),video]))];
 let audioSkip=0;
 if(audio){
  if(audio.description.length<19||new TextDecoder().decode(audio.description.subarray(0,8))!=='OpusHead')throw Error('The audio encoder returned an invalid Opus header.');
  audioSkip=audio.description[10]+audio.description[11]*256;
  entries.push(element([0xae],concat([num([0xd7],2),num([0x73,0xc5],2),num([0x83],2),str([0x86],'A_OPUS'),element([0x63,0xa2],audio.description),num([0x56,0xaa],Math.round(audioSkip/AUDIO_RATE*1e9)),num([0x56,0xbb],80000000),element([0xe1],concat([double([0xb5],AUDIO_RATE),num([0x9f],2)]))])));
 }
 const tracks=element([0x16,0x54,0xae,0x6b],concat(entries)),payload=[info,tracks],cues=[];let offset=info.length+tracks.length,cluster=[],start=-1,cue=false;
 const flush=()=>{if(cluster.length){const block=blobElement([0x1f,0x43,0xb6,0x75],[num([0xe7],start),...cluster]);if(cue)cues.push(element([0xbb],concat([num([0xb3],start),element([0xb7],concat([num([0xf7],1),num([0xf1],offset)]))])));payload.push(block);offset+=block.size;}cluster=[];cue=false;};
 const packets=chunks.map(c=>({...c,track:1,ms:Math.round(c.timestamp/1000)}));
 if(audio){const first=audio.chunks[0].timestamp;const tail=audio.chunks.at(-1),totalEncoded=(tail.timestamp-first+(tail.duration||20000))/1e6;const discard=Math.max(0,Math.round((totalEncoded-audioSkip/AUDIO_RATE-duration)*1e9));audio.chunks.forEach((c,i)=>packets.push({...c,track:2,ms:Math.max(0,Math.round((c.timestamp-first)/1000)),discard:i===audio.chunks.length-1?discard:0}));}
 packets.sort((a,b)=>a.ms-b.ms||a.track-b.track);
 for(const c of packets){
  if(start<0||c.ms-start>=2000||(c.track===1&&c.key&&c.ms>start)){flush();start=c.ms;}
  const rel=c.ms-start,prefix=bytes(0x80|c.track,(rel>>8)&255,rel&255,c.discard?0:(c.key?0x80:0));
  const size=prefix.length+partSize(c.data);if(c.track===1&&c.key)cue=true;
  if(c.discard){
   let padding=uint(c.discard);if(padding[0]&128)padding=concat([bytes(0),padding]);
   const blockHead=elementHeader([0xa1],size),tail=element([0x75,0xa2],padding);
   cluster.push(elementHeader([0xa0],blockHead.length+size+tail.length),blockHead,prefix,c.data,tail);
  }else cluster.push(elementHeader([0xa3],size),prefix,c.data);
 }
 flush();if(cues.length)payload.push(element([0x1c,0x53,0xbb,0x6b],concat(cues)));
 return new Blob([header,bytes(0x18,0x53,0x80,0x67,0x01,0xff,0xff,0xff,0xff,0xff,0xff,0xff),...payload],{type:'video/webm'});
}

async function mixerEncoderConfig(){
 const base={codec:'opus',sampleRate:AUDIO_RATE,numberOfChannels:2,bitrate:160000};
 // WebM takes Opus packets. The optional Ogg mode is rejected by Chromium.
 // Plain configuration also defaults to Opus packets with 20 ms frames.
 for(const config of [{...base,opus:{format:'opus',frameDuration:20000}},base]){
  try{if((await AudioEncoder.isConfigSupported(config)).supported)return config;}
  catch(e){/* Some browsers reject codec-specific dictionaries; try defaults. */}
 }
 throw Error('This browser cannot encode the soundtrack. Try Chrome or Edge, or turn off “Include mixer audio in video” for a silent export.');
}
async function encodeMixerAudio(settings,levels,duration,origin,full,audioOrigin=full?0:settings.audioTime,musicSnapshot=null){
 if(!window.AudioEncoder||!window.AudioData)throw Error('Audio export is unavailable in this browser. Open the app in Chrome or Edge, or turn off “Include mixer audio in video”.');
 const config=await mixerEncoderConfig();
 const bank={...await audioEngine.prepare(),...(musicSnapshot||{})},chunks=[];let description=null,failure=null;
 const encoder=new AudioEncoder({output:(chunk,meta)=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);chunks.push({data:new Blob([data]),timestamp:chunk.timestamp,duration:chunk.duration||20000,key:true});if(meta?.decoderConfig?.description){const x=meta.decoderConfig.description;description=ArrayBuffer.isView(x)?new Uint8Array(x.buffer,x.byteOffset,x.byteLength).slice():new Uint8Array(x).slice();}},error:e=>failure=e});
 try{
  encoder.configure(config);const total=Math.round(duration*AUDIO_RATE),block=960;
  for(let start=0;start<total;start+=block){
   if(abortExport)throw Error('Export canceled.');if(failure)throw failure;
   const n=Math.min(block,total-start),samples=mixSamples(bank,levels,start,n,settings.speed,origin,full?duration:0,audioOrigin,settings);
   const frame=new AudioData({format:'f32-planar',sampleRate:AUDIO_RATE,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(start/AUDIO_RATE*1e6),data:samples});encoder.encode(frame);frame.close();
   while(encoder.encodeQueueSize>60&&!failure){if(abortExport)throw Error('Export canceled.');await new Promise(r=>setTimeout(r,1));}
   if(start%(block*100)===0){$('progressFill').style.width=(start/total*12)+'%';$('progressText').textContent='Mixing soundtrack · '+Math.floor(start/total*100)+'%';await new Promise(r=>setTimeout(r,0));}
  }
  await encoder.flush();if(failure)throw failure;if(abortExport)throw Error('Export canceled.');chunks.sort((a,b)=>a.timestamp-b.timestamp);if(!chunks.length)throw Error('The audio encoder returned no sound.');
  if(!description){const preSkip=Math.max(0,Math.round(-chunks[0].timestamp*AUDIO_RATE/1e6));description=new Uint8Array(19);description.set(new TextEncoder().encode('OpusHead'));description[8]=1;description[9]=2;new DataView(description.buffer).setUint16(10,preSkip,true);new DataView(description.buffer).setUint32(12,AUDIO_RATE,true);}
  return {chunks,description};
 }finally{try{encoder.close();}catch(e){}}
}

function exportPlan(settings=state,options=exportOptions()){
 const fps=options.fps===60?60:30,height=options.height===720?720:1080,mode=options.length;
 const oneLoop=mode==='loop',preview=mode==='20';if(!oneLoop&&!['20','600','720','900','1200'].includes(mode))throw Error('Choose a video length.');
 const duration=oneLoop?cycleSeconds(settings)/settings.speed:+mode,cycleFrames=Math.round(cycleSeconds(settings)/settings.speed*fps),count=Math.round(duration*fps),renderCount=Math.min(count,cycleFrames),seamless=count%cycleFrames===0;
 return {fps,height,width:height*16/9,duration,count,renderCount,cycleFrames,seamless,oneLoop,preview,origin:preview?settings.time:0,audioOrigin:preview?settings.audioTime:0,bitrate:Math.round((height===1080?10000000:5500000)*(fps===60?1.45:1)),filename:oneLoop?'Loop':preview?'Preview':duration/60+'min'};
}
function openExport(){
 if(state.exporting)return;const plan=exportPlan(),size=plan.bitrate*plan.duration/8/1048576;
 $('exportCopy').textContent=rideName()+' · '+WINDOWS[state.carriage].label+': '+fmt(plan.duration)+' at '+plan.height+'p / '+plan.fps+' FPS. '+($('exportAudio').checked?'Mixer audio included. ':'Silent video. ')+(plan.seamless?'This duration closes the complete scenic loop. ':'This exact duration ends partway through the scenic loop. ')+(state.journey?'Connected route: '+state.route.map(x=>SCENES[x].label).join(' → ')+'. ':'')+'Estimated size: '+(size>=1024?(size/1024).toFixed(1)+' GB':Math.round(size)+' MB')+'. Keep this tab open while it renders.';
 $('batchProgress').hidden=true;$('continueBatch').hidden=true;$('progressBox').hidden=true;$('downloadVideo').hidden=true;$('startExport').hidden=false;$('startExport').disabled=false;$('closeExport').textContent='Close';$('exportModal').hidden=false;$('startExport').focus();
}
function beginExport(){if(!window.VideoEncoder||!window.VideoFrame)throw Error('Video export needs WebCodecs. Open this site in Chrome or Edge.');state.exporting=true;abortExport=false;audioEngine.stop();lockPresetControls(true);$('startExport').disabled=true;$('progressBox').hidden=false;$('downloadVideo').hidden=true;$('closeExport').textContent='Cancel';$('progressFill').style.width='0%';$('progressText').textContent='Preparing encoder…';}
function endExport(){state.exporting=false;lockPresetControls(false);$('closeExport').disabled=false;$('closeExport').textContent='Close';$('continueBatch').hidden=true;batchResume=null;last=performance.now();audioEngine.sync();renderQueue();}
async function renderVideoJob(job){
 const settings=job.settings,levels=job.levels,withAudio=job.options.audio,plan=exportPlan(settings,job.options),{height,width,fps,duration,count,renderCount,origin}=plan,chunks=[];let encoder=null,er=null;
 try{
  let config={codec:'vp09.00.41.08',width,height,bitrate:plan.bitrate,framerate:fps};let supported=await VideoEncoder.isConfigSupported(config);if(!supported.supported){config.codec='vp8';supported=await VideoEncoder.isConfigSupported(config);}if(!supported.supported)throw Error('No supported video encoder was found. Try Chrome or Edge.');
  const off=document.createElement('canvas');off.width=width;off.height=height;er=await makeRenderer(off);let failure=null;
  encoder=new VideoEncoder({output:c=>{const data=new Uint8Array(c.byteLength);c.copyTo(data);chunks.push({data:new Blob([data]),timestamp:c.timestamp,key:c.type==='key'});},error:e=>failure=e});encoder.configure(config);
  const soundtrack=withAudio?await encodeMixerAudio(settings,levels,duration,origin,plan.seamless,plan.audioOrigin,job.music):null;
  for(let i=0;i<renderCount;i++){
   if(abortExport)throw Error('Export canceled.');if(failure)throw failure;
   er.draw(origin+i/fps*settings.speed,settings);const frame=new VideoFrame(off,{timestamp:Math.round(i*1e6/fps),duration:Math.round((i+1)*1e6/fps)-Math.round(i*1e6/fps)});encoder.encode(frame,{keyFrame:i%(fps*2)===0});frame.close();
   while(encoder.encodeQueueSize>6){if(abortExport)throw Error('Export canceled.');if(failure)throw failure;await new Promise(r=>setTimeout(r,1));}
   if(i%Math.max(6,fps/5)===0){$('progressFill').style.width=((withAudio?12:0)+i/renderCount*(withAudio?85:97))+'%';$('progressText').textContent='Rendering scenery '+Math.floor(i/renderCount*100)+'% · '+fmt(i/fps)+' / '+fmt(renderCount/fps)+' · final video '+fmt(duration);await new Promise(r=>setTimeout(r,0));}
  }
  await encoder.flush();if(failure)throw failure;if(abortExport)throw Error('Export canceled.');chunks.sort((a,b)=>a.timestamp-b.timestamp);if(chunks.length!==renderCount)throw Error('The encoder did not return every frame. No incomplete video was saved.');
  $('progressFill').style.width='98%';$('progressText').textContent='Building '+fmt(duration)+' video…';await new Promise(r=>setTimeout(r,0));if(abortExport)throw Error('Export canceled.');
  const blob=webm(repeatEncodedVideo(chunks,renderCount,count,fps),width,height,fps,count/fps,config.codec,soundtrack),filename=(settings.journey?'Connected_Journey':SCENES[settings.scene].filename)+'_'+settings.carriage+'_'+plan.filename+'_'+height+'p_'+fps+'fps.webm';
  $('progressFill').style.width='100%';$('progressText').textContent='Ready · '+count.toLocaleString()+' frames · '+fmt(duration)+' · '+fps+' FPS';return {blob,filename};
 }finally{try{encoder?.close();}catch(e){}er?.destroy();}
}
function showVideo(result,automatic=false){if(videoURL)URL.revokeObjectURL(videoURL);videoURL=URL.createObjectURL(result.blob);const link=$('downloadVideo');link.href=videoURL;link.download=result.filename;link.textContent='Download video · '+(result.blob.size/1048576).toFixed(1)+' MB';link.hidden=false;if(automatic)link.click();}
$('export').onclick=openExport;
$('closeExport').onclick=()=>{if(state.exporting){abortExport=true;$('closeExport').disabled=true;if(batchResume)batchResume(false);}else{$('exportModal').hidden=true;$('export').focus();}};
$('startExport').onclick=async()=>{if(state.exporting)return;try{beginExport();const item=snapshot();item.settings.time=state.time;item.settings.audioTime=state.audioTime;item.music={music:audioEngine.bank.music||null,musicLoop:audioEngine.bank.musicLoop||null};showVideo(await renderVideoJob(item),true);$('startExport').hidden=true;}catch(e){$('progressText').textContent=e.message;$('startExport').disabled=false;$('progressBox').hidden=false;}finally{endExport();}};
$('continueBatch').onclick=()=>{if(!batchResume)return;$('downloadVideo').click();batchResume(true);};
$('runQueue').onclick=async()=>{
 if(state.exporting||!exportQueue.length)return;let directory=null;
 if(window.showDirectoryPicker){try{directory=await window.showDirectoryPicker({mode:'readwrite'});}catch(e){if(e.name==='AbortError')return;}}
 $('exportModal').hidden=false;$('startExport').hidden=true;$('batchProgress').hidden=false;$('exportCopy').textContent=directory?'Videos will be saved one at a time into your chosen folder.':'This browser needs a download click between videos. Each completed file stays available until you continue.';
 try{beginExport();const stamp=new Date().toISOString().replace(/[:.]/g,'-');for(let i=0;i<exportQueue.length;i++){
  if(abortExport)throw Error('Export canceled.');const job=exportQueue[i];job.status='rendering';renderQueue();$('batchProgress').textContent='Video '+(i+1)+' of '+exportQueue.length+' · '+job.name;$('downloadVideo').hidden=true;
  const result=await renderVideoJob(job);if(abortExport)throw Error('Export canceled.');let saved=false;
  if(directory){try{const file=await directory.getFileHandle(stamp+'_'+String(i+1).padStart(2,'0')+'_'+result.filename,{create:true}),writer=await file.createWritable();try{await writer.write(result.blob);await writer.close();saved=true;}catch(e){try{await writer.abort();}catch(ignore){}throw e;}}catch(e){$('exportCopy').textContent='The folder could not be written. Download this completed video to continue.';directory=null;}}
  if(!saved){showVideo(result);$('continueBatch').textContent=i===exportQueue.length-1?'Save video & finish':'Save video & continue';$('continueBatch').hidden=false;const ok=await new Promise(resolve=>{batchResume=resolve;});batchResume=null;$('continueBatch').hidden=true;if(!ok||abortExport)throw Error('Export canceled.');URL.revokeObjectURL(videoURL);videoURL=null;$('downloadVideo').hidden=true;}
  job.status='completed';renderQueue();
 }$('progressText').textContent='All '+exportQueue.length+' videos completed.';
 }catch(e){const current=exportQueue.find(x=>x.status==='rendering');if(current)current.status=abortExport?'canceled':'failed';$('progressBox').hidden=false;$('progressText').textContent=e.message;}finally{endExport();}
};

$('graphicsMode').value=graphicsPreference;
$('graphicsMode').onchange=event=>{
 if(state.exporting)return;
 const mode=event.target.value;
 try{localStorage.setItem(GRAPHICS_KEY,mode);}catch(e){}
 const url=new URL(window.location.href);url.searchParams.set('graphics',mode);window.location.assign(url.href);
};
$('loadRetry').onclick=()=>window.location.reload();
async function startTrainRenderer(mode){
 activeGraphics=mode;
 try{sessionStorage.setItem(STARTUP_KEY,JSON.stringify({mode,time:Date.now()}));}catch(e){}
 setStartupStatus(mode==='compatible'?'Starting lighter train graphics…':'Preparing train graphics…');
 $('loadHint').textContent=mode==='compatible'?'Same destinations and windows, with a lighter preview.':'If this step stalls on your computer, use compatibility mode below.';
 const height=mode==='compatible'?540:graphicsPreference==='full'?1080:720;
 $('view').height=height;$('view').width=height*16/9;
 await yieldToPage();
 try{
  renderer=await makeRenderer($('view'),mode);
  setStartupStatus('Drawing your first train view…');await yieldToPage();
  renderer.draw(0);
 }catch(error){renderer?.destroy();renderer=null;throw error;}
}
async function init(){try{
 let loaded=0,nextAsset=0,loadFailed=false;
 async function loadImages(){while(!loadFailed&&nextAsset<ASSET_NAMES.length){
  const name=ASSET_NAMES[nextAsset++],img=new Image();img.src=ASSETS[name]||'assets/'+name+'.webp';
  try{await withDeadline(img.decode(),45000,'The scenery download timed out. Check your connection and try again.');}
  catch(error){loadFailed=true;throw graphicsError('A scenery image could not load. Check your connection and retry.','Image: '+name+'; '+error.message);}
  if(loadFailed)return;
  images[name]=img;loaded++;setStartupStatus('Loading scenery… '+loaded+' / '+ASSET_NAMES.length);
 }}
 await Promise.all(Array.from({length:Math.min(3,ASSET_NAMES.length)},loadImages));
 let previousAttempt=null;try{previousAttempt=JSON.parse(sessionStorage.getItem(STARTUP_KEY)||'null');}catch(e){}
 const recovering=graphicsPreference==='auto'&&previousAttempt?.mode==='full'&&Date.now()-previousAttempt.time<3600000;
 const firstMode=graphicsPreference==='compatible'||recovering?'compatible':'full';
 try{await startTrainRenderer(firstMode);}
 catch(error){
  if(firstMode==='compatible')throw error;
  console.warn('Full graphics startup failed; trying compatibility mode.',error);
  await startTrainRenderer('compatible');
 }
 try{sessionStorage.removeItem(STARTUP_KEY);}catch(e){}
 // Keep a working recovery mode on this browser, rather than retrying the
 // expensive program on every visit after it has already failed here.
 if(activeGraphics==='compatible'){
  try{localStorage.setItem(GRAPHICS_KEY,'compatible');}catch(e){}
  $('graphicsMode').value='compatible';
 }
 $('graphicsStatus').textContent=activeGraphics==='compatible'?'Compatibility mode · lighter 540p / 30 FPS preview. Export keeps your selected size and frame rate.':'Full effects · '+$('view').height+'p preview. Export keeps your selected size and frame rate.';
 syncExperienceUI();renderQueue();$('loading').style.display='none';
 window.demo={state,setScene,setCarriage,renderAt(t){state.playing=false;state.time=wrap(t,cycleSeconds());renderer.draw(t);updateUI();},getRenderer:()=>renderer,makeRenderer,webm,mixer,audioEngine,mixSamples,journeyFrame,cycleSeconds,exportPlan,graphics:activeGraphics,ready:true};
 last=performance.now();requestAnimationFrame(animate);
}catch(error){showStartupError(error);}}
init();
