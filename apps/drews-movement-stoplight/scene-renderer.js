// Shared painted scene for live background and exported frames.
(function(){
 const W=1920,H=1080,images={},foregroundLayers=new WeakMap();let readyPromise;
 function smooth(c){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';}
 function surface(width,height){const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
 // Only the current sign is cached. Supersample its edges once per cue, not every frame.
 function smoothForeground(c,width,height,current,selected,data){
  const key=[width,height,current,...selected].join(':');let cached=foregroundLayers.get(c);
  if(!cached||cached.key!==key){const layer=surface(Math.round(width*1.5),Math.round(height*1.5)),ctx=layer.getContext('2d');smooth(ctx);ctx.scale(layer.width/W,layer.height/H);foreground(ctx,current,selected,data);cached={key,layer};foregroundLayers.set(c,cached);}
  smooth(c);c.drawImage(cached.layer,0,0,W,H);
 }
 const cloudSVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 105"><path d="M25 91C-1 88-1 57 21 49 14 21 52 5 72 27 85-8 132-3 145 22 171 5 201 21 204 43 233 29 262 49 253 72 278 81 264 101 240 99H32z" fill="#fff9e9"/><path d="M25 91C4 90 2 73 11 63q6 21 30 14c19 10 29 10 42 1 14 10 37 11 54 0 21 13 37 12 52 1q34 19 64-7c23 9 12 28-11 27H32z" fill="#c4e9f5"/></svg>';
 const load=(src,decode=false)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=async()=>{try{if(decode&&typeof image.decode==='function')await image.decode();resolve(image);}catch{reject(Error('Could not prepare the cartoon scenery. Please reload and try again.'));}};image.onerror=()=>reject(Error('Could not load the cartoon scenery. Please reload and try again.'));image.src=src;});
 // Each silhouette has its own transparent file; sampling can never pick up a neighboring car.
 // Bounds and wheel centers are native image pixels. All bodies face right before mirroring.
 const fleet=[
  {file:'blue-compact',crop:[26,161,1487,704],wheels:[[326,724,99,103],[1270,724,99,103]]},
  {file:'red-sedan',crop:[14,254,1516,516],wheels:[[389,663,72,75],[1261,657,77,81]]},
  {file:'green-pickup',crop:[12,183,1513,660],wheels:[[347,708,88,93],[1268,708,88,93]]},
  {file:'yellow-taxi',crop:[0,222,1536,565],wheels:[[333,670,77,80],[1238,670,77,80]]},
  {file:'purple-minivan',crop:[6,192,1526,652],wheels:[[302,716,89,94],[1268,716,89,94]]},
  {file:'orange-van',crop:[12,161,1513,707],wheels:[[342,735,91,96],[1249,735,91,96]]},
  {file:'olive-clunker',crop:[19,192,1500,668],wheels:[[321,713,103,105],[1300,714,103,105]]},
  {file:'pink-buggy-driver',crop:[16,122,1507,798],wheels:[[275,699,186,186],[1248,709,186,186]]},
  {file:'motorcycle-rider',crop:[62,14,1419,993],scale:.75,rimOnly:true,wheels:[[300,789,172,172],[1270,792,170,170]]},
  {file:'hot-dog-car',crop:[23,180,1497,685],scale:1.1,wheels:[[369,726,94,101],[1235,735,88,93]]},
  {file:'delorean',crop:[7,192,1759,554],wheels:[[367,589,112,114],[1375,606,112,112]]},
  {file:'stretch-limousine',crop:[7,286,1760,353],scale:2.25,wheels:[[268,558,47,50],[1554,558,47,50]]},
  {file:'dog-grooming-van',crop:[22,74,1504,816],scale:1.2,wheels:[[327,777,60,63],[1207,778,60,63]]},
  {file:'peewee-bicycle',crop:[6,8,1242,1206],scale:.72,pace:.82,rimOnly:true,pedaling:true,wheels:[[264,974,204,204],[1037,975,194,194]]},
  {file:'woodie-wagon',crop:[12,83,1754,742],scale:1.08,wheels:[[428,695,70,73],[1511,695,71,73]]},
  {file:'purple-convertible-driver',crop:[5,137,1766,629],wheels:[[369,607,86,88],[1414,613,88,88]]},
  {file:'ice-cream-truck',crop:[25,1,1486,1009],scale:1.12,wheels:[[297,879,69,73],[1241,879,70,73]]},
  {file:'tour-bus',crop:[32,35,1727,818],scale:1.55,waving:true,wheels:[[354,748,57,60],[1286,748,56,60]]},
  {file:'surf-camper',crop:[20,97,1494,833],scale:1.15,wheels:[[346,803,77,79],[1128,803,77,79]]},
  {file:'vintage-fire-engine',crop:[14,165,1508,689],scale:1.35,wheels:[[414,724,72,74],[1258,728,71,74]]},
  {file:'bubble-microcar',crop:[42,93,1452,846],scale:.76,wheels:[[330,788,81,83],[1190,790,81,83]]},
  {file:'orange-tow-truck',crop:[15,100,1515,795],scale:1.2,wheels:[[464,748,80,82],[1295,752,80,82]]},
  {file:'pumpkin-pickup',crop:[18,154,1505,720],scale:1.1,wheels:[[374,747,71,73],[1286,748,71,73]]},
  {file:'lime-lowrider',crop:[12,221,1750,472],scale:1.12,wheels:[[456,575,45,45],[1454,581,73,73]]},
  {file:'red-race-car',crop:[34,204,1619,553],wheels:[[348,588,82,86],[1266,614,81,84]],left:{file:'red-race-car-left',crop:[17,202,1619,557],wheels:[[407,615,82,85],[1324,588,82,85]]}},
  {file:'pizza-hatchback',crop:[33,18,1471,957],scale:.96,wheels:[[265,839,82,84],[1200,839,82,84]]},
  {file:'mail-van',crop:[31,138,1479,798],scale:1.08,wheels:[[327,793,80,83],[1217,793,80,83]]},
  {file:'jurassic-jeep',crop:[25,114,1501,799],scale:1.08,wheels:[[335,750,91,93],[1306,750,91,93]],left:{file:'jurassic-jeep-left',crop:[4,110,1504,811],wheels:[[226,752,91,93],[1196,752,91,93]]}},
  {file:'mystery-machine',crop:[10,72,1516,882],scale:1.12,wheels:[[364,819,79,82],[1181,819,79,82]],left:{file:'mystery-machine-left',crop:[14,68,1504,890],wheels:[[355,821,79,82],[1158,821,79,82]]}},
  {file:'orange-beetle',crop:[24,194,1488,637],wheels:[[348,689,85,85],[1238,692,85,85]]},
  {file:'banana-car',crop:[29,50,1721,799],scale:1.12,wheels:[[464,690,85,85],[1418,704,85,85]]},
  {file:'blue-cement-mixer',crop:[30,118,1490,807],scale:1.2,wheels:[[395,778,80,80],[1262,782,80,80]]},
  {file:'purple-taco-truck',crop:[28,30,1482,953],scale:1.12,wheels:[[362,867,75,75],[1245,867,75,75]]},
  {file:'art-deco-coupe',crop:[18,160,1739,590],scale:1.12,wheels:[[426,601,91,91],[1383,606,91,91]]},
  {file:'green-recycling-truck',crop:[29,142,1488,765],scale:1.2,wheels:[[452,783,72,72],[1168,781,72,72]]}
 ];
 function ready(){return readyPromise??=Promise.all([load('assets/cartoon-city-layer.png'),Promise.all(fleet.map(v=>load('assets/vehicles-v2/'+v.file+'.png'))),load('assets/perspective-road.png'),load('assets/vehicles-v2/school-bus.png'),load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(cloudSVG),true),typeof document!=='undefined'?document.fonts?.load('700 188px Fredoka').catch(()=>[]):null,Promise.all(fleet.map(v=>v.left?load('assets/vehicles-v2/'+v.left.file+'.png'):null)),load('assets/vehicles-v2/tony-hawk-torso.png'),load('assets/vehicles-v2/dog-walker-torso.png'),load('assets/vehicles-v2/walking-dog-body.png')]).then(([city,cars,road,bus,cloud,font,carsLeft,tony,owner,dog])=>{
  Object.assign(images,{city,cars,road,bus,cloud,carsLeft,tony,owner,dog});return images;
 }).catch(e=>{readyPromise=null;throw e;});}
 function round(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
 function puff(c,x,y,r,alpha=1){c.save();c.globalAlpha=alpha;c.translate(x,y);c.scale(r,r);c.fillStyle='#eef0e4';c.strokeStyle='#d2dfd9';c.lineWidth=.006;c.beginPath();c.moveTo(-.9,.25);c.bezierCurveTo(-1.3,.1,-1.15,-.45,-.72,-.45);c.bezierCurveTo(-.82,-.95,-.2,-1.04,.02,-.65);c.bezierCurveTo(.35,-1.03,.88,-.78,.8,-.38);c.bezierCurveTo(1.35,-.4,1.42,.28,.93,.43);c.bezierCurveTo(1.05,.93,.38,1.03,.13,.69);c.bezierCurveTo(-.25,1.08,-.82,.88,-.77,.48);c.bezierCurveTo(-1.03,.57,-1.15,.37,-.9,.25);c.closePath();c.fill();c.stroke();c.restore();}
 // Rotate the wheel faces in their own image coordinates, without moving the fenders.
 // The buggy includes most of each tire so its chunky treads move along with its spokes.
 function rollingWheels(c,index,crop,width,height,travel,variant=fleet[index],picture=images.cars[index]){
  const scale=width/crop[2];
  for(const [x,y,rx,ry]of variant.wheels){
   c.save();c.translate(-width/2+(x-crop[0])*scale,-height+(y-crop[1])*scale);c.scale(rx*scale,ry*scale);
   if(variant.rimOnly){
    // Highlight the moving rim without rotating the rider, fork, brake or exhaust over the wheels.
    c.beginPath();c.arc(0,0,.98,0,Math.PI*2);c.arc(0,0,.87,0,Math.PI*2,true);c.clip();c.rotate(travel/(ry*scale));c.strokeStyle='#e9eff4';c.lineWidth=.035;
    for(let spoke=0;spoke<8;spoke++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(.85,0);c.lineTo(1,0);c.stroke();}c.restore();continue;
   }
   c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.clip();c.rotate(travel/(ry*scale));
   c.drawImage(picture,x-rx,y-ry,rx*2,ry*2,-1,-1,2,2);c.restore();
  }
 }
 function pedalLeg(c,phase,front){
  const hx=front?461:439,hy=590,cx=593,cy=1008,radius=83;
  const px=cx+Math.cos(phase)*radius,py=cy+Math.sin(phase)*radius,fx=px-5,fy=py-27;
  const dx=fx-hx,dy=fy-hy,d=Math.max(1,Math.hypot(dx,dy)),upper=260,lower=270;
  const bend=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
  const angle=Math.atan2(dy,dx)-bend,kx=hx+Math.cos(angle)*upper,ky=hy+Math.sin(angle)*upper;
  c.save();c.lineCap='round';c.lineJoin='round';
  c.strokeStyle='#24262a';c.lineWidth=12;c.beginPath();c.moveTo(cx,cy);c.lineTo(px,py);c.stroke();c.strokeStyle='#c6ccd0';c.lineWidth=6;c.stroke();
  c.beginPath();c.moveTo(hx,hy);c.lineTo(kx,ky);c.lineTo(fx,fy);c.strokeStyle='#303034';c.lineWidth=79;c.stroke();
  const cloth=c.createLinearGradient(hx-25,hy,kx+45,ky);cloth.addColorStop(0,front?'#a7a09b':'#807b7b');cloth.addColorStop(.5,front?'#918b88':'#6f6a6c');cloth.addColorStop(1,front?'#797578':'#59595d');
  c.strokeStyle=cloth;c.lineWidth=70;c.stroke();
  c.beginPath();c.moveTo(hx+8,hy+10);c.lineTo(kx+7,ky);c.lineTo(fx+6,fy-15);c.strokeStyle=front?'#b4aca7':'#8b8585';c.lineWidth=3;c.stroke();
  c.fillStyle='#eee9df';c.fillRect(fx-24,fy-6,48,23);
  c.beginPath();c.moveTo(fx-33,fy+8);c.quadraticCurveTo(fx-5,fy+5,fx+18,fy+17);c.quadraticCurveTo(fx+66,fy+17,fx+69,fy+40);c.lineTo(fx-34,fy+40);c.closePath();c.fillStyle='#242328';c.fill();c.strokeStyle='#111419';c.lineWidth=5;c.stroke();
  c.beginPath();c.moveTo(fx-15,fy+17);c.lineTo(fx+25,fy+25);c.strokeStyle='#69686c';c.lineWidth=5;c.stroke();
  c.fillStyle='#31383a';c.fillRect(px-32,py+8,69,12);c.restore();
 }
 function bicycleLeg(c,crop,width,height,travel,front){
  const scale=width/crop[2],phase=travel/(width*.12)*1.25+(front?0:Math.PI);
  c.save();c.translate(-width/2-crop[0]*scale,-height-crop[1]*scale);c.scale(scale,scale);
  // Tuck the animated trouser legs beneath the fixed jacket hem.
  c.beginPath();c.rect(0,600,1300,650);c.clip();pedalLeg(c,phase,front);c.restore();
 }
 // Painted forearms and hands wave from the elbow, with the rest of each tourist fixed.
 const touristHands=[
  {pivot:[229,181],points:[[137,35],[217,35],[222,105],[248,171],[238,194],[217,196],[183,137],[137,91]]},
  {pivot:[617,210],points:[[628,106],[695,106],[695,148],[630,223],[610,225],[599,202],[635,164],[628,145]]},
  {pivot:[767,190],points:[[690,71],[770,71],[770,129],[789,180],[782,205],[758,210],[728,176],[690,114]]},
  {pivot:[1135,208],points:[[1150,81],[1220,81],[1220,128],[1156,224],[1128,224],[1118,201],[1163,145],[1150,124]]},
  {pivot:[1429,223],points:[[1406,78],[1478,78],[1478,126],[1468,232],[1438,244],[1414,234],[1407,207],[1425,159],[1406,129]]}
 ];
 function handPath(c,hand){c.moveTo(...hand.points[0]);for(const p of hand.points.slice(1))c.lineTo(...p);c.closePath();}
 function touristBus(c,index,crop,width,height,travel){
  const scale=width/crop[2],picture=images.cars[index];
  c.save();c.translate(-width/2-crop[0]*scale,-height-crop[1]*scale);c.scale(scale,scale);
  c.save();c.beginPath();c.rect(0,0,picture.width,picture.height);for(const hand of touristHands)handPath(c,hand);c.clip('evenodd');c.drawImage(picture,0,0);c.restore();
  touristHands.forEach((hand,n)=>{const [x,y]=hand.pivot;
   // Retain a small elbow overlap beneath the moving hand to keep the joint seamless.
   c.save();c.beginPath();c.arc(x,y,24,0,Math.PI*2);c.clip();c.drawImage(picture,0,0);c.restore();
   c.save();c.translate(x,y);c.rotate(Math.sin(travel/45+n*1.7)*.23);c.translate(-x,-y);c.beginPath();handPath(c,hand);c.clip();c.drawImage(picture,0,0);c.restore();});
  c.restore();
 }
 function car(c,index,x,y,width,flip=false,smoke=0,travel=0,laneSlope=0){
  const left=flip&&fleet[index].left,variant=left||fleet[index],picture=left?images.carsLeft[index]:images.cars[index],crop=variant.crop,height=width*crop[3]/crop[2];c.save();smooth(c);c.translate(x,y);
  // Side elevations mirror cleanly. Turn the whole vehicle to follow the lane, with no body shear.
  c.rotate(Math.atan(laneSlope||0));if(flip&&!left)c.scale(-1,1);
  c.save();c.fillStyle='rgba(24,37,39,.16)';c.beginPath();c.ellipse(0,-3,width*.43,width*.022,0,0,Math.PI*2);c.fill();c.restore();
  if(index===6&&smoke)for(let p=0;p<3;p++){const age=(smoke*.8+p*.33)%1;puff(c,-width*.46-age*width*.5,-height*.16-age*height*.5,width*(.035+.08*age),(.7-age*.7)*.8);}
  if(fleet[index].pedaling)bicycleLeg(c,crop,width,height,travel,false);
  if(fleet[index].waving)touristBus(c,index,crop,width,height,travel);
  else c.drawImage(picture,...crop,-width/2,-height,width,height);
  rollingWheels(c,index,crop,width,height,left?-travel:travel,variant,picture);
  if(fleet[index].pedaling)bicycleLeg(c,crop,width,height,travel,true);
  c.restore();
 }
 // Coordinates are deterministic so preview and exported frames contain the same traffic.
 const TRAFFIC_SPEED=1.08,TRAFFIC_SIZE=1.12,PASS=22/TRAFFIC_SPEED;
 // Long vehicles enter and exit completely offscreen at the same road speed.
 function journey(index){const margin=Math.max(370,430*TRAFFIC_SIZE*(fleet[index].scale||1)/2+45),span=W+margin*2;return{margin,span,seconds:span/(2660/PASS*(fleet[index].pace||1))};}
 // Every vehicle gets one turn in each randomly ordered bag. No special rarity weights.
 // A small seed cache keeps live, replay, seeking and video rendering deterministic and cheap.
 const trafficSchedules=new Map(),ENTRY_SECONDS=5/(.95*.95),DRIVE_STEP=.1;
 function roadPosition(entry,time){
  const age=Math.max(0,time-entry.at),n=Math.floor(age/DRIVE_STEP),points=entry.path;
  if(n>=points.length-1)return points.at(-1)+(age-(points.length-1)*DRIVE_STEP)*entry.exitSpeed;
  return points[n]+(points[n+1]-points[n])*(age/DRIVE_STEP-n);
 }
 function planDrive(entry,leader,random){
  const route=journey(entry.i),width=430*TRAFFIC_SIZE*(fleet[entry.i].scale||1);
  entry.speed=2660/PASS*(fleet[entry.i].pace||1)*(.9+random()*.2);
  // Conservative full-size bounds include perspective, rotation and a generous bumper gap.
  const gap=leader?(width+430*TRAFFIC_SIZE*(fleet[leader.i].scale||1))/2+250:0;
  const start=leader?Math.min(-route.margin,roadPosition(leader,entry.at)-gap):-route.margin;
  entry.path=[start];entry.exitSpeed=entry.speed;
  for(let n=1;n<=1200;n++){
   const t=entry.at+n*DRIVE_STEP,desired=entry.path.at(-1)+entry.speed*DRIVE_STEP;
   const q=leader?Math.min(desired,roadPosition(leader,t)-gap):desired;
   entry.exitSpeed=(q-entry.path.at(-1))/DRIVE_STEP;entry.path.push(q);
   if(q>=W+route.margin)break;
  }
  entry.seconds=(entry.path.length-1)*DRIVE_STEP;
 }
 function scheduleFor(seed,lastSlot){
  seed=(seed??1)>>>0;let schedule=trafficSchedules.get(seed);
  if(!schedule){
   let state=seed;
   const random=()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};
   schedule={entries:[],pool:[],random,firstFlip:random()<.5};trafficSchedules.set(seed,schedule);
   if(trafficSchedules.size>8)trafficSchedules.delete(trafficSchedules.keys().next().value);
  }
  const {entries,pool,random}=schedule;
  while(entries.length<=lastSlot){
   const at=entries.length*ENTRY_SECONDS,last=entries.at(-1);
   if(!pool.length)pool.push(...fleet.map((_,i)=>i));
   const active=new Set(entries.slice(-24).filter(e=>e.at+e.seconds>=at).map(e=>e.i));
   const eligible=pool.filter(i=>i!==last?.i&&!active.has(i));
   // The fleet is much larger than the maximum simultaneous traffic, so a choice exists.
   const i=eligible[Math.floor(random()*eligible.length)];pool.splice(pool.indexOf(i),1);
   const entry={i,at,flip:(entries.length+(schedule.firstFlip?1:0))%2===1};
   const leader=entries.at(-2);planDrive(entry,leader&&leader.at+leader.seconds>at?leader:null,random);entries.push(entry);
  }
  return entries;
 }
 function trafficAt(time,session={time,seed:1}){
  const t=Number.isFinite(session.time)?session.time:time;
  if(t<0)return [];
  // Start with an empty road: no arrivals are scheduled before game time zero.
  // One integer slot drives generation and lookup, including fractional frame boundaries.
  const latest=Math.floor(t/ENTRY_SECONDS+1e-9),entries=scheduleFor(session.seed,latest),traffic=[];
  for(let n=Math.max(0,latest-24);n<=latest;n++){
   const e=entries[n],age=t-e.at,route=journey(e.i);if(age<0||age>e.seconds)continue;
   const q=roadPosition(e,t),x=e.flip?W-q:q,u=Math.max(0,Math.min(1,(x+route.margin)/route.span));
   const size=(e.flip?265-u*15:300+u*130)*TRAFFIC_SIZE*(fleet[e.i].scale||1);
   traffic.push({i:e.i,x,y:e.flip?592+u*15:705+u*190,size,flip:e.flip,travel:q-e.path[0],slope:(e.flip?15:190)/route.span});
  }
  return traffic.sort((a,b)=>a.y-b.y);
 }
 // The far lane moves left. Tony moves right along the raised sidewalk behind it.
 function skaterAt(time,session={}){
  if(session.hideTraffic)return null;
  const t=Number.isFinite(session.time)?session.time:time,seed=(session.seed??1)>>>0;
  const first=8+(Math.imul(seed^0x45d9f3b,2654435761)>>>0)%13;
  if(t<first)return null;
  const age=(t-first)%120;if(age>24)return null;
  const u=age/24,x=-100+u*(W+200);
  // The side-street mouth sits behind the central game sign. Never draw him on that road.
  if(x>910&&x<1400)return null;
  return{x,y:505+u*7,scale:.95,age};
 }
 function skatingPose(age){
  const p=((age%4.6)+4.6)%4.6;
  let foot=[-18,-11];
  if(p<.55){const u=p/.55;foot=[-18+26*u,-11+10*u-8*Math.sin(u*Math.PI)];}
  else if(p<1.6){const u=(p-.55)/1.05;foot=[8-52*u,-1];}
  else if(p<2.3){const u=(p-1.6)/.7;foot=[-44+26*u,-1-10*u-14*Math.sin(u*Math.PI)];}
  return{hip:[0,-64+2*Math.sin(age*2)],backFoot:foot,frontFoot:[21,-11],lean:p<2.3?.04*Math.sin(p/2.3*Math.PI):0};
 }
 function skateLeg(c,hip,foot,front){
  const hx=hip[0]+(front?4:-6),hy=hip[1],dx=foot[0]-hx,dy=foot[1]-6-hy,d=Math.max(.001,Math.hypot(dx,dy));
  const upper=34,lower=35,bend=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d)))),angle=Math.atan2(dy,dx)-bend;
  const kx=hx+Math.cos(angle)*upper,ky=hy+Math.sin(angle)*upper;
  c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(hx,hy);c.lineTo(kx,ky);c.lineTo(foot[0],foot[1]-6);
  c.strokeStyle='#11151b';c.lineWidth=14;c.stroke();c.strokeStyle=front?'#343844':'#262a34';c.lineWidth=10;c.stroke();
  c.beginPath();c.moveTo(hx+2,hy+4);c.lineTo(kx+2,ky);c.lineTo(foot[0]+2,foot[1]-5);c.strokeStyle=front?'#555866':'#3b404b';c.lineWidth=1.2;c.stroke();
  c.fillStyle=front?'#434b57':'#303741';c.strokeStyle='#171b22';c.lineWidth=1;c.beginPath();c.ellipse(kx,ky,4.7,5.8,-.3,0,Math.PI*2);c.fill();c.stroke();
  const [x,y]=foot;c.beginPath();c.moveTo(x-6,y-7);c.lineTo(x+2,y-6);c.quadraticCurveTo(x+9,y-2,x+13,y-2);c.lineTo(x+13,y+1);c.lineTo(x-7,y+1);c.closePath();c.fillStyle='#22252c';c.fill();c.stroke();
  c.beginPath();c.moveTo(x-7,y+1);c.lineTo(x+13,y+1);c.strokeStyle='#e8e4d5';c.lineWidth=2;c.stroke();c.restore();
 }
 function skateboarder(c,state){
  if(!state)return;const {x,y,scale,age}=state,pose=skatingPose(age);
  c.save();smooth(c);c.translate(x,y);c.scale(scale,scale);
  c.fillStyle='rgba(28,43,44,.15)';c.beginPath();c.ellipse(0,1,44,4,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#8c999a';c.lineWidth=3;for(const x of [-25,25]){c.beginPath();c.moveTo(x,-8);c.lineTo(x, -3);c.stroke();c.fillStyle='#ebe2ba';c.beginPath();c.arc(x,-3,3,0,Math.PI*2);c.fill();c.strokeStyle='#353940';c.lineWidth=1;c.stroke();c.strokeStyle='#8c999a';c.lineWidth=3;}
  c.beginPath();c.moveTo(-41,-13);c.quadraticCurveTo(-34,-8,-25,-8);c.lineTo(25,-8);c.quadraticCurveTo(34,-8,41,-13);c.lineTo(40,-10);c.quadraticCurveTo(33,-5,25,-5);c.lineTo(-25,-5);c.quadraticCurveTo(-34,-5,-40,-10);c.closePath();c.fillStyle='#bc8051';c.fill();c.strokeStyle='#21272d';c.lineWidth=1.5;c.stroke();
  skateLeg(c,pose.hip,pose.backFoot,false);skateLeg(c,pose.hip,pose.frontFoot,true);
  c.save();c.translate(...pose.hip);c.rotate(pose.lean);const artScale=.065;c.drawImage(images.tony,-520*artScale,-1030*artScale,1254*artScale,1254*artScale);c.restore();c.restore();
 }
 // Sidewalk visitors have separate, non-overlapping windows in each two-minute cycle.
 function walkerAt(time,session={}){
  if(session.hideTraffic)return null;
  const t=Number.isFinite(session.time)?session.time:time,seed=(session.seed??1)>>>0;
  const first=53+(Math.imul(seed^0x45d9f3b,2654435761)>>>0)%13;
  if(t<first)return null;const age=(t-first)%120;if(age>40)return null;
  const u=age/40,x=-160+u*(W+320);
  if(x>810&&x<1430)return null;
  return{x,y:505+u*7,scale:.95,age};
 }
 function walkingPose(age){
  // Travel is rightward: planted feet sweep backward; lifted feet recover forward.
  const phase=-age*Math.PI*2/1.18;
  const feet=[0,Math.PI].map(p=>({x:Math.cos(phase+p)*17,y:-Math.max(0,Math.sin(phase+p))*10}));
  const dogFeet=[0,Math.PI,Math.PI*.65,Math.PI*1.65].map(p=>({x:Math.cos(phase*1.3+p)*8,y:-Math.max(0,Math.sin(phase*1.3+p))*5}));
  return{feet,dogFeet,bob:Math.cos(phase*2)*1.2,arm:Math.sin(phase)*9,tail:Math.sin(age*9)*.3};
 }
 function paintedLimb(c,points,width,color){
  c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);
  c.strokeStyle='#382c29';c.lineWidth=width+2;c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke();
 }
 function dogWalker(c,state){
  if(!state)return;const {x,y,scale,age}=state,p=walkingPose(age);
  c.save();smooth(c);c.translate(x,y);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';
  c.fillStyle='rgba(28,43,44,.14)';for(const [sx,rx]of [[0,22],[85,40]]){c.beginPath();c.ellipse(sx,2,rx,3,0,0,Math.PI*2);c.fill();}
  // Two articulated legs, with lifted recovery feet and planted stance feet.
  for(const n of [1,0]){const foot=p.feet[n],hip=[n?5:-5,-53+p.bob],knee=[foot.x*.45+5,-27+p.bob],ankle=[foot.x,foot.y-5];
   paintedLimb(c,[hip,knee,ankle],10,n?'#25475a':'#34657b');
   c.fillStyle='#f7ece1';c.strokeStyle='#382c29';c.lineWidth=1.4;c.beginPath();c.roundRect(foot.x-6,foot.y-6,18,7,3);c.fill();c.stroke();
  }
  const hand=[21+p.arm*.22,-65+p.bob];
  paintedLimb(c,[[11,-84+p.bob],[20,-73+p.bob],hand],6,'#d89260');
  // The tether sags naturally and moves with the hand and the dog's collar.
  c.strokeStyle='#8d363e';c.lineWidth=1.5;c.beginPath();c.moveTo(...hand);c.bezierCurveTo(42,-42+p.bob,66,-28+p.bob,103,-38+p.bob*.6);c.stroke();
  // Painted torso overlaps hip and shoulder joints, leaving moving limbs underneath.
  c.drawImage(images.owner,298,31,660,1192,-21,-121+p.bob,39,70.5);
  paintedLimb(c,[[-14,-72+p.bob],[-16-p.arm*.4,-60+p.bob],[-12-p.arm,-49+p.bob]],6,'#e6a574');
  c.fillStyle='#efb17f';c.beginPath();c.ellipse(-12-p.arm,-48+p.bob,3.5,4.5,-.2,0,Math.PI*2);c.fill();
  // Four offset leg cycles produce a walk; the far pair is painted darker.
  function dogLeg(n){const rear=n<2,hx=rear?62:100,f=p.dogFeet[n];
   paintedLimb(c,[[hx,-24+p.bob*.6],[hx+f.x*.5+(rear?-3:2),-13],[hx+f.x,f.y-3]],5,n%2?'#b87c35':'#e8a953');
   c.fillStyle=n%2?'#bc823a':'#eeb663';c.beginPath();c.ellipse(hx+f.x+2,f.y-2,5,3,0,0,Math.PI*2);c.fill();
  }
  dogLeg(1);dogLeg(3);
  c.save();c.translate(53,-32+p.bob*.6);c.rotate(p.tail);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-12,-3,-19,-18,-26,-22);c.bezierCurveTo(-29,-26,-29,-30,-25,-29);c.bezierCurveTo(-14,-25,-8,-14,3,-8);c.closePath();c.fillStyle='#dda04b';c.strokeStyle='#694220';c.lineWidth=1.2;c.fill();c.stroke();c.restore();
  c.drawImage(images.dog,39,28,1594,883,47,-62+p.bob*.6,81,44.9);
  dogLeg(0);dogLeg(2);c.restore();
 }
 // Each cloud wraps using its own full width, with padding beyond both viewport edges.
 function cloudAt(time,index){
  const width=[360,260,435,310,220][index],padding=64,span=W+width+padding*2;
  const distance=time*(7+index*1.4)+index*441;
  return{x:((distance%span)+span)%span-width-padding,y:[35,170,80,235,20][index],width,height:width*105/270};
 }
 function background(c,time,width=W,height=H,session){c.save();smooth(c);const scale=Math.max(width/W,height/H);c.translate((width-W*scale)/2,(height-H*scale)/2);c.scale(scale,scale);const sky=c.createLinearGradient(0,0,0,700);sky.addColorStop(0,'#36aff2');sky.addColorStop(1,'#c5f3ff');c.fillStyle=sky;c.fillRect(0,0,W,H);
  for(let i=0;i<5;i++){const cloud=cloudAt(time,i);c.drawImage(images.cloud,cloud.x,cloud.y,cloud.width,cloud.height);}
  c.fillStyle='#e7d5b8';c.fillRect(0,480,W,H-480);
  const ch=420,cityWidth=ch*images.city.width/images.city.height;for(let x=(W-cityWidth)/2-cityWidth;x<W;x+=cityWidth)c.drawImage(images.city,x,90,cityWidth,ch);
  c.drawImage(images.road,0,0,W,H);
  skateboarder(c,skaterAt(time,session));dogWalker(c,walkerAt(time,session));
  // The two paths follow the painted curb perspective, with size changing with depth.
  if(!session?.hideTraffic)for(const v of trafficAt(time,session))car(c,v.i,v.x,v.y,v.size,v.flip,time+v.i,v.travel,v.slope);

  c.restore();
 }
 function icon(c,move,x,y,size){c.save();c.translate(x-size*32/72,y-size/2);c.scale(size/72,size/72);c.fillStyle=move.color;c.strokeStyle=move.color;c.lineWidth=7.5;c.lineCap='round';c.lineJoin='round';c.shadowColor=move.color;c.shadowBlur=14;
  if(move.id==='stop')c.fill(new Path2D('M18 47 10 36c-3-4 2-8 5-5l8 8V16c0-5 7-5 7 0v17V9c0-5 7-5 7 0v24V13c0-5 7-5 7 0v22V20c0-5 7-5 7 0v26c0 14-7 21-18 21-8 0-11-9-15-20Z'));
  else if(move.id==='ready'){for(const x of [14,32,50]){c.beginPath();c.arc(x,36,6,0,Math.PI*2);c.fill();}}
  else{c.beginPath();c.arc(...move.head,7,0,Math.PI*2);c.fill();c.lineWidth=6;c.stroke(new Path2D(move.pose));c.lineWidth=2.2;c.stroke(new Path2D(move.detail));}c.restore();
 }
 function textFit(c,text,x,y,maxWidth,size,font='Barlow Condensed'){c.font=`700 ${size}px "${font}", Arial, sans-serif`;while(c.measureText(text).width>maxWidth&&size>16){size-=2;c.font=`700 ${size}px "${font}", Arial, sans-serif`;}c.fillText(text,x,y);}
 function foreground(c,current,selected,data){const moves=[data.STOP,...data.MOVES.filter(m=>selected.includes(m.id))],active=current==='ready'?{id:'ready',cue:'READY',hint:'Get ready to move.',color:'#ffd000'}:data.MOVES.find(m=>m.id===current)||data.STOP;
  const lamp=Math.min(142,790/moves.length-14),boxH=moves.length*(lamp+14)+26,top=(H-boxH)/2-15,x=155,boxW=350;
  c.save();c.fillStyle='#7e9496';c.strokeStyle='#334b53';c.lineWidth=7;c.fillRect(x+75,top+boxH,45,H);c.strokeRect(x+75,top+boxH,45,H);const gold=c.createLinearGradient(x,0,x+boxW,0);gold.addColorStop(0,'#f0b329');gold.addColorStop(.16,'#ffe293');gold.addColorStop(.8,'#daa022');gold.addColorStop(1,'#986313');round(c,x,top,boxW,boxH,24);c.fillStyle=gold;c.fill();c.strokeStyle='#654715';c.lineWidth=8;c.stroke();
  moves.forEach((m,i)=>{const cy=top+22+i*(lamp+14)+lamp/2,cx=x+27+lamp/2,on=m.id===current;c.fillStyle='#152328';c.beginPath();c.arc(cx,cy,lamp/2+6,0,Math.PI*2);c.fill();c.save();if(on){c.shadowColor=m.color;c.shadowBlur=30;}const lens=c.createRadialGradient(cx-lamp*.12,cy-lamp*.12,2,cx,cy,lamp*.47);lens.addColorStop(0,on?m.color:'#233843');lens.addColorStop(1,on?m.color:'#0b181d');c.fillStyle=lens;c.beginPath();c.arc(cx,cy,lamp*.43,0,Math.PI*2);c.fill();c.restore();if(on){c.save();icon(c,{...m,color:'#f4fff2'},cx,cy,lamp*.64);c.restore();}else{c.save();c.globalAlpha=.35;icon(c,m,cx,cy,lamp*.6);c.restore();}c.fillStyle='#1c2c22';c.textAlign='left';textFit(c,m.cue.toUpperCase(),x+lamp+45,cy+lamp*.1,boxW-lamp-57,Math.min(35,lamp*.38));});
  const sx=675,sy=235,sw=1080,sh=610;c.fillStyle='#a1b5b2';c.strokeStyle='#354e53';c.fillRect(sx+sw/2-27,sy+sh,54,H);c.strokeRect(sx+sw/2-27,sy+sh,54,H);c.fillStyle='#144e37';round(c,sx+8,sy+10,sw,sh,29);c.fill();const green=c.createLinearGradient(sx,sy,sx+sw,sy+sh);green.addColorStop(0,'#188454');green.addColorStop(1,'#095d39');round(c,sx,sy,sw,sh,25);c.fillStyle=green;c.fill();c.strokeStyle='#123e2b';c.lineWidth=8;c.stroke();round(c,sx+15,sy+15,sw-30,sh-30,16);c.strokeStyle='#f0f6df';c.lineWidth=6;c.stroke();icon(c,active,sx+sw/2,sy+170,235);c.textAlign='center';c.fillStyle='#fffced';c.shadowColor='#083c29';c.shadowBlur=0;c.shadowOffsetY=4;textFit(c,active.cue.toUpperCase(),sx+sw/2,sy+423,sw-90,190);c.shadowOffsetY=0;textFit(c,active.hint,sx+sw/2,sy+515,sw-100,38,'DM Sans');c.restore();
 }
 function smokeBillow(t,row,col){
  // Expansion and drift only move forward; clearing changes opacity, never scale.
  const delay=.2+col*.18+(2-row)*.22;
  const growth=Math.max(0,Math.min(1,(t-delay)/(2.35-delay)));
  const clearing=Math.max(0,Math.min(1,(t-2.35)/1.65));
  return{x:col*470+(row%2)*130-80+Math.max(0,t-1)*90,y:row*470+50-t*35,
   radius:(growth+Math.max(0,t-2.35)*.13)*1000*(.8+((row+col)%3)*.1),
   alpha:Math.min(1,growth*2.5)*(1-clearing*clearing*(3-2*clearing))};
 }
 function transition(c,t,ending,duration=4){
  t=t*4/duration;
  // A clunker leads the wipe; its cloud grows to cover every edge before the scene switches.
  const progress=Math.max(0,Math.min(1,ending?(t-.45)/2:t/2.6)),x=ending?-750+progress*3450:-360+progress*3060;
  if(t>=(ending ? .45 : 0)&&t<2.6)car(c,6,x,1050,950,false,0,progress*(ending?3450:3060));
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){const b=smokeBillow(t,row,col);if(b.alpha>0)puff(c,b.x,b.y,b.radius,b.alpha);}
 }
 function busWipe(c,t,ending,duration){
  const p=Math.max(0,Math.min(1,t/duration)),crop=[8,230,1527,567],width=4900,height=width*crop[3]/crop[2];
  const x=-width*.55+p*(W+width*1.1),y=1550,scale=width/crop[2];
  c.save();smooth(c);c.translate(x,y);c.drawImage(images.bus,...crop,-width/2,-height,width,height);
  for(const [wx,wy,rx,ry]of [[346,691,67,75],[1278,711,67,75]]){c.save();c.translate(-width/2+(wx-crop[0])*scale,-height+(wy-crop[1])*scale);c.scale(rx*scale,ry*scale);c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.clip();c.rotate(p*(W+width*1.1)/(ry*scale));c.drawImage(images.bus,wx-rx,wy-ry,rx*2,ry*2,-1,-1,2,2);c.restore();}c.restore();
 }
 function endCard(c,width=W,height=H){
  c.save();c.scale(width/W,height/H);
  const sky=c.createRadialGradient(960,410,50,960,540,1150);sky.addColorStop(0,'#247a75');sky.addColorStop(1,'#092d3c');c.fillStyle=sky;c.fillRect(0,0,W,H);
  // A clean traffic-sign finish with rounded, playful lettering.
  c.fillStyle='#0a3b40';round(c,160,182,1600,746,65);c.fill();
  c.strokeStyle='#f9de83';c.lineWidth=9;round(c,148,166,1624,746,65);c.stroke();
  c.strokeStyle='#66b6a0';c.lineWidth=2;round(c,169,187,1582,704,47);c.stroke();
  round(c,778,225,364,116,58);c.fillStyle='#102d36';c.fill();
  ['#ff4161','#ffd44f','#71f589'].forEach((color,i)=>{c.save();c.fillStyle=color;c.shadowColor=color;c.shadowBlur=25;c.beginPath();c.arc(850+i*110,283,33,0,Math.PI*2);c.fill();c.restore();});
  c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';
  for(const [text,y,size,color]of [['Thank you',535,174,'#fff8dc'],['for playing!',738,188,'#ffda64']]){
   c.font=`700 ${size}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
   c.strokeStyle='#082e38';c.lineWidth=16;c.strokeText(text,960,y+8,1400);c.fillStyle=color;c.fillText(text,960,y,1400);
  }
  for(const [x,y,r]of [[267,363,20],[1609,380,24],[302,747,15],[1588,749,17]]){c.save();c.translate(x,y);c.fillStyle='#ffda64';c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rad=i%2?r*.28:r;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}c.closePath();c.fill();c.restore();}
  c.restore();
 }
 function rulesCard(c){
  c.save();const sky=c.createRadialGradient(960,360,80,960,540,1200);sky.addColorStop(0,'#237c73');sky.addColorStop(1,'#092d3c');c.fillStyle=sky;c.fillRect(0,0,W,H);
  round(c,112,84,1696,912,54);c.fillStyle='#0b3d43';c.fill();c.strokeStyle='#ffdf85';c.lineWidth=8;c.stroke();
  c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#fff8dc';textFit(c,'Movement Stoplight',960,247,1500,124,'Fredoka');
  c.fillStyle='#ffda64';textFit(c,'How to Play',960,355,1400,79,'Fredoka');
  const rules=[['#6df58b','Watch the sign. Move with the music.'],['#ffda64','Leave room around you as you travel.'],['#ff526c','When you see STOP, freeze!']];
  rules.forEach(([color,text],i)=>{const y=521+i*147;c.fillStyle=color;c.beginPath();c.arc(285,y+5,36,0,Math.PI*2);c.fill();c.fillStyle='#123e40';c.textAlign='center';textFit(c,String(i+1),285,y+20,50,45,'Fredoka');c.textAlign='left';c.fillStyle='#fff8dc';textFit(c,text,361,y+24,1250,60,'Fredoka');});
  c.restore();
 }
 function contentFrame(c,width,height,time,plan,config,data){
  c.save();smooth(c);c.scale(width/W,height/H);
  const styles=window.MovementVideoPlan.transitions(config),outroAt=plan.intro+plan.gameDuration,opening=time<plan.intro,ending=time>=outroAt&&plan.outro>0;
  const rules=plan.rulesDuration??0;
  if(opening&&time<rules){rulesCard(c);c.restore();return;}
  const type=opening?(plan.opening||styles.opening):ending?(plan.ending||styles.ending):'none';
  const duration=opening?(plan.openingDuration??plan.intro-rules):(plan.closing??styles.closing),t=ending?time-outroAt:opening?time-rules:time;
  if(ending&&t>=duration){endCard(c);c.restore();return;}
  const switchAt=type==='smoke'?duration*2.35/4:duration*.5;
  const destination=(opening||ending)&&t>=switchAt;
  const showGame=opening?destination:ending?!destination:true;
  if(showGame){
   const trafficTime=config.trafficTime??time;
   background(c,config.motion===false?0:trafficTime,W,H,{hideTraffic:opening,time:config.motion===false?-1:trafficTime-plan.intro,duration:plan.gameDuration,seed:plan.seed});
   const current=opening?'ready':window.MovementVideoPlan.at(plan,time).id;
   smoothForeground(c,width,height,current,config.moves.filter(m=>m.weight>0).map(m=>m.id),data);
  }else if(opening)rulesCard(c);else endCard(c);
  if(t<duration){
  if(type==='smoke')transition(c,t,ending,duration);
  else if(type==='bus')busWipe(c,t,ending,duration);
  else if(type==='fade'){const opacity=1-Math.abs(2*t/duration-1);c.fillStyle=`rgba(0,0,0,${opacity})`;c.fillRect(0,0,W,H);}
  }
  c.restore();
 }
 // Add short bookend fades without borrowing any time from the game or end card.
 function frame(c,width,height,time,plan,config,data){
  const fadeIn=plan.fadeIn||0,fadeOut=plan.fadeOut||0;
  const content={...plan,intro:plan.intro-fadeIn,outro:plan.outro-fadeOut,total:plan.total-fadeIn-fadeOut};
  const localTime=Math.max(0,Math.min(content.total,time-fadeIn));
  const cfg={...config,trafficTime:Math.max(0,(config.trafficTime??time)-fadeIn)};
  contentFrame(c,width,height,localTime,content,cfg,data);
  const opacity=Math.max(fadeIn?1-time/fadeIn:0,fadeOut?(time-(plan.total-fadeOut))/fadeOut:0);
  if(opacity>0){c.save();c.fillStyle=`rgba(0,0,0,${Math.min(1,opacity)})`;c.fillRect(0,0,width,height);c.restore();}
 }
 function liveFrame(c,width,height,time,current,prefs,data){
  c.save();smooth(c);c.scale(width/W,height/H);background(c,time);
  smoothForeground(c,width,height,current,prefs.selected,data);c.restore();
 }
 window.MovementScene={ready,background,cloudAt,trafficAt,skaterAt,skatingPose,skateboarder,walkerAt,walkingPose,dogWalker,fleet,frame,liveFrame,car,foreground,endCard,rulesCard,smokeBillow,icon,images};
})();
