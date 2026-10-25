import {stationLayout, type Project} from './project';
export type Vec3 = [number,number,number];
export type Prop = {name:string;shape:'box'|'cone'|'cylinder'|'sphere'|'roof'|'triangle'|'star';position:Vec3;scale:Vec3;rotation:Vec3;color:string;glow:number;metal:number};
export const sceneryNames={theater:'Grand Clockwork Theater',studio:'Midnight studio',halloween:'Hollow Moon Courtyard',christmas:'Snowglobe Village'};
export const random=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453123;return n-Math.floor(n);};
export function sceneryManifest(p:Project){
 const theme=p.scenery.theme,layout=stationLayout(p);
 const left=Math.min(...layout.map((s,i)=>s.position[0]-(s.width/2+1)*p.tracks[i].scale)),right=Math.max(...layout.map((s,i)=>s.position[0]+(s.width/2+1)*p.tracks[i].scale));
 const back=Math.min(...layout.map((s,i)=>s.position[2]-(p.tracks[i].machine==='waterfall'||p.tracks[i].machine==='pipeworks'?5:3)*p.tracks[i].scale)),front=Math.max(...layout.map((s,i)=>s.position[2]+(p.tracks[i].machine==='waterfall'||p.tracks[i].machine==='pipeworks'?5:3)*p.tracks[i].scale));
 const cx=(left+right)/2,cz=(back+front)/2,rear=back-6,edgeLeft=left-3.5,edgeRight=right+3.5;
 const props:Prop[]=[];
 const add=(name:string,shape:Prop['shape'],position:Vec3,scale:Vec3,color:string,rotation:Vec3=[0,0,0],glow=0,metal=0)=>props.push({name,shape,position,scale,rotation,color,glow,metal});
 const box=(name:string,position:Vec3,scale:Vec3,color:string,rotation:Vec3=[0,0,0],glow=0)=>add(name,'box',position,scale,color,rotation,glow);
 const branch=(a:Vec3,b:Vec3,r:number)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=Math.hypot(dx,dy,dz);add('Crooked tree branch','cylinder',a.map((n,i)=>(n+b[i])/2) as Vec3,[r,length,r],'#29182c',[Math.atan2(dz,Math.hypot(dx,dy))*180/Math.PI,0,-Math.atan2(dx,dy)*180/Math.PI]);};
 const bareTree=(x:number,z:number,size=1)=>{const at=(a:number,b:number,c=0):Vec3=>[x+a*size,b*size,z+c*size];branch(at(0,0),at(.2,3.8),.24*size);branch(at(.2,3.8),at(-.2,6),.16*size);branch(at(-.2,6),at(.4,7),.07*size);for(const side of [-1,1]){branch(at(.1,2.8),at(side*1.5,4.1,side*.3),.13*size);branch(at(side*1.5,4.1,side*.3),at(side*2.2,5.9,side*.5),.075*size);branch(at(side*1.5,4.1,side*.3),at(side*2.8,4.5,side*.2),.06*size);branch(at(-.1,5),at(side*1.1,6,side*.4),.065*size);}};
 const pumpkin=(x:number,z:number,size:number,angle=0)=>{
   add('Jack-o-lantern pumpkin','sphere',[x,.85*size,z],[size,.82*size,.9*size],'#f26a09',[0,angle,0]);
   add('Pumpkin stem','cylinder',[x,1.7*size,z],[.13*size,.43*size,.13*size],'#3b7417',[0,0,-12]);
   const face=(dx:number,dy:number,sz:Vec3,shape:Prop['shape'])=>{const a=angle*Math.PI/180;add('Glowing carved pumpkin face',shape,[x+(dx*Math.cos(a)+.86*Math.sin(a))*size,dy*size,z+(.86*Math.cos(a)-dx*Math.sin(a))*size],sz.map(n=>n*size) as Vec3,'#ffca16',[0,angle,0],2.4);};
   face(-.3,1.03,[.35,.35,.035],'triangle');face(.3,1.03,[.35,.35,.035],'triangle');face(0,.73,[.16,.2,.04],'triangle');
   for(let i=0;i<5;i++)face((i-2)*.18,.46+Math.abs(i-2)*.045,[.17,.15,.035],'box');
 };
 const house=(x:number,z:number,size:number,spooky:boolean)=>{
   const wall=spooky?'#33305f':'#a8312b',roof=spooky?'#28123c':'#072f32',trim=spooky?'#211b32':'#f7e7bd';
   box(spooky?'Haunted house':'Village cottage',[x,2.3*size,z],[4.5*size,4.6*size,3.6*size],wall);
   add('Steep gabled roof','roof',[x,5.3*size,z],[5.3*size,2.3*size,4.4*size],roof);
   if(!spooky)add('Snow-covered roof','roof',[x,5.48*size,z],[5.5*size,2.25*size,4.55*size],'#e7f3ff');
   box('Front door',[x,1.1*size,z+1.82*size],[.95*size,2.2*size,.09*size],trim);
   box('Door inset',[x,1.1*size,z+1.89*size],[.72*size,1.94*size,.04*size],spooky?'#1a1125':'#2e5449');
   for(const xx of [-1.35,1.35])for(const yy of [1.6,3.5]){
     box('Window frame',[x+xx*size,yy*size,z+1.83*size],[1.02*size,1.15*size,.14*size],trim,[0,0,spooky?xx*4:0]);
     box('Warm glowing window',[x+xx*size,yy*size,z+1.92*size],[.8*size,.92*size,.05*size],'#ffb424',[0,0,spooky?xx*4:0],1.3);
     box('Window cross',[x+xx*size,yy*size,z+1.96*size],[.075*size,.92*size,.04*size],trim);box('Window cross',[x+xx*size,yy*size,z+1.96*size],[.8*size,.075*size,.04*size],trim);
   }
   box('Chimney',[x+1.45*size,6.4*size,z-.7*size],[.65*size,1.9*size,.7*size],spooky?'#452546':'#733024',[0,0,spooky?-8:0]);
   if(spooky){
     for(let j=0;j<18;j++)box('Painted timber siding',[x,(.22+j*.24)*size,z+1.82*size],[4.48*size,.025*size,.045*size],'#1f1931');
     for(const side of [-1,1])for(let j=0;j<10;j++)box('Weathered slate roof',[x+side*(j+.5)*.265*size,(6.45-(j+.5)*.23)*size,z],[.35*size,.075*size,4.45*size],j%2?'#272038':'#342641',[0,0,-side*41]);
     box('Stone porch step',[x,.17*size,z+2.65*size],[3.5*size,.34*size,1.7*size],'#4a4252');
     for(const side of [-1,1]){add('Porch column','cylinder',[x+side*1.45*size,1.7*size,z+3.1*size],[.09*size,3.1*size,.09*size],'#735b51');box('Porch column base',[x+side*1.45*size,.62*size,z+3.1*size],[.33*size,.6*size,.33*size],'#473d4c');}
     add('Porch gable','roof',[x,3.55*size,z+2.5*size],[3.7*size,.9*size,2*size],'#21142f');
   }
   if(spooky){box('Crooked attic tower',[x-1.6*size,6.2*size,z-.1*size],[1.7*size,3.4*size,2*size],'#3e3568',[0,0,-5]);add('Tower roof','cone',[x-1.8*size,8.7*size,z-.1*size],[1.7*size,2.4*size,1.7*size],'#391545',[0,25,-5]);add('Attic round window','sphere',[x-1.7*size,6.7*size,z+1.0*size],[.42*size,.42*size,.06*size],'#f79419',[0,0,0],1.8);}
 };
 const pine=(x:number,z:number,height:number,decorated=false)=>{
   add('Pine trunk','cylinder',[x,height*.17,z],[height*.055,height*.34,height*.055],'#633b25');
   for(let i=0;i<4;i++){const h=height*(.46-i*.065),r=height*(.28-i*.052),y=height*(.29+i*.17);add(decorated?'Christmas tree bough':'Pine bough','cone',[x,y,z],[r,h,r],i%2?'#086743':'#094d3c',[0,i*23,0]);if(!decorated)add('Pine snow cap','cone',[x,y+h*.09,z],[r*.87,h*.92,r*.87],'#e1f2ff',[0,i*23,0]);}
   if(decorated){for(let i=0;i<55;i++){const u=i/54,y=height*(.17+u*.72),r=height*(.29*(1-u)+.018),a=i*1.92;add(i%3?'Tree fairy light':'Christmas bauble','sphere',[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[i%3?.075:.16,i%3?.075:.16,i%3?.075:.16],['#ff2449','#ffcc19','#21ccff','#ffc125'][i%4],[0,0,0],i%3?2.3:0,i%3?0:.7);}add('Tree topper star','star',[x,height*1.04,z],[.7,.7,.23],'#ffd52b',[0,0,0],1.9);}
 };
 const present=(x:number,z:number,size:number,index:number)=>{const y=size*.5;box('Wrapped present',[x,y,z],[size,size,size],['#e51d45','#1266e4','#7046ce'][index%3]);box('Gold ribbon',[x,y,z+size*.505],[size*.18,size,.025],'#ffcb27');box('Gold ribbon',[x,size+.02,z],[size*.18,.045,size],'#ffcb27');box('Gold ribbon',[x,size+.03,z],[size,.045,size*.18],'#ffcb27');add('Ribbon bow','sphere',[x-.17*size,size+.14,z],[.25*size,.12*size,.16*size],'#ffcc21',[0,0,-25]);add('Ribbon bow','sphere',[x+.17*size,size+.14,z],[.25*size,.12*size,.16*size],'#ffcc21',[0,0,25]);};
 if(theme==='theater'){
   const w=Math.max(26,right-left+12),z=back-4;
   box('Theater back wall',[cx,7,z],[w,14,.5],'#172b50');
   for(let i=0;i<11;i++){const x=cx+(i-5)*w/11;box('Walnut wall panel',[x,3.5,z+.32],[w/11-.2,6.5,.15],'#49220e');box('Panel brass trim',[x,6.7,z+.46],[w/11-.4,.06,.05],'#c89c42');for(const side of [-1,1])box('Carved panel border',[x+side*(w/22-.2),3.5,z+.46],[.06,6.3,.06],'#9d6025');}
   for(const y of [.7,7,10.6])box('Theater walnut cornice',[cx,y,z+.5],[w,.23,.6],'#74411b');
   for(const side of [-1,1]){const x=cx+side*(w/2-.5);box('Side theater wall',[x,6,cz-1],[.5,12,Math.max(18,front-back+12)],'#172744');
     for(let i=0;i<9;i++)add('Crimson velvet curtain','cylinder',[x-side*.4+(i-4)*.24,6.5,back+2],[.23,13,.35],i%2?'#8d1027':'#bd1834');
     for(let j=0;j<4;j++){const zz=back-1+j*4;box('Side walnut panel',[x-side*.4,3,zz],[.18,5.7,3.7],'#46230f');box('Side brass cornice',[x-side*.55,5.8,zz],[.06,.08,3.5],'#dba741');box('Lantern glass',[x-side*.9,6.1,zz],[.48,.8,.48],'#ffb742',[0,0,0],2);add('Lantern cap','cone',[x-side*.9,6.65,zz],[.42,.4,.42],'#a87828');}
   }
   for(let row=0;row<16;row++)for(let col=0;col<10;col++)box('Polished oak floorboard',[cx+(col-4.5)*w/10,-.025,back-2+row*1.1],[w/10-.025,.12,1.08],['#683212','#7e401b','#583014'][(row+col)%3]);
   box('Crimson stage runner',[cx,.05,front+2],[7,.045,4.5],'#8c1127');for(const side of [-1,1])box('Runner gold border',[cx+side*3.35,.077,front+2],[.12,.01,4.5],'#c79a38');
 }
 if(theme==='halloween'){
   for(let row=0;row<10;row++)for(let col=0;col<16;col++){const x=cx+(col-7.5)*1.8+(row%2)*.8,z=rear+row*2;box('Courtyard stone paver',[x,-.035,z],[1.74,.13,1.94],['#302c3b','#3b3546','#292b38'][(row+col)%3],[0,(random(row*16+col)-.5)*1.5,0]);}
   for(const side of [-1,1]){const x=side<0?edgeLeft-1:edgeRight+1;for(const z of [front-1,back-2]){box('Carved stone lantern pedestal',[x,1.1,z],[.9,2.2,.9],'#373044');box('Stone pedestal cap',[x,2.22,z],[1.1,.2,1.1],'#514358');box('Lantern glass',[x,2.85,z],[.5,.9,.5],'#ffb82a',[0,0,0],2);add('Lantern cap','cone',[x,3.5,z],[.48,.4,.48],'#805225');}}
   house(cx-7,rear-2,1.25,true);bareTree(edgeLeft,rear+1,1.3);bareTree(edgeRight,rear-1,1.5);bareTree(edgeRight+3,cz+3,.8);
   add('Harvest moon','sphere',[cx+9,9.5,rear-19],[2.6,2.6,1.2],'#ffc665',[0,0,0],.8);
   for(let i=0;i<7;i++){const x=cx+1.6+i*1.6,z=rear+1.3+(i%2)*1.3;box('Gravestone',[x,.8,z],[.85,1.5,.3],i%2?'#64748d':'#7b7d9d',[0,(i%3-1)*12,(i%2?1:-1)*7]);add('Rounded gravestone top','sphere',[x,1.51,z],[.43,.36,.16],'#69778b');box('Gravestone carving',[x,1.08,z+.18],[.11,.5,.035],'#31364c');box('Gravestone carving',[x,1.17,z+.18],[.37,.1,.035],'#31364c');}
   for(const [x,z,r,a] of [[edgeLeft,front+1,1.25,18],[edgeLeft+1.7,front+.7,.7,0],[edgeRight,front+1.5,1.1,-18],[edgeRight+1.6,front,.75,-10],[cx-2,rear+1,.8,0]])pumpkin(x,z,r,a);
   for(let i=0;i<12;i++)box('Courtyard paving',[cx+(i%4-1.5)*2.4,-.015,front+1.5+Math.floor(i/4)*1.7],[2.2,.15,1.5],i%2?'#34354d':'#282b3e',[0,(random(i)-.5)*8,0]);
   for(const side of [-1,1]){const x=side<0?edgeLeft-1:edgeRight+1;for(let i=0;i<6;i++){box('Iron fence upright',[x,1.1,back+i*1.25],[.09,2.2,.09],'#191b35');add('Fence finial','cone',[x,2.33,back+i*1.25],[.16,.34,.16],'#4c3f63');}for(const y of [.6,1.5])box('Fence rail',[x,y,back+3.1],[.1,.12,6.5],'#232540');}
 } else if(theme==='christmas'){
   pine(cx,rear-1,10,true);house(cx-9,rear-3,.9,false);house(cx+9,rear-4,1.1,false);
   for(const [x,z,h] of [[edgeLeft,rear,7],[edgeRight,rear,8],[edgeLeft-3,cz-1,5.5],[edgeRight+3,cz-2,6],[cx-15,rear-9,9],[cx+16,rear-10,10]])pine(x,z,h);
   for(let i=0;i<7;i++)present(cx+(i-3)*1.05,rear+1.9+(i%2)*.7,.7+random(i)*.65,i);for(const side of [-1,1])for(let i=0;i<3;i++)present((side<0?edgeLeft:edgeRight)+side*(i%2)*1.1,front+1+i*.55,.75+random(i+90)*.65,i+(side<0?0:1));
   for(const side of [-1,1]){const x=side<0?edgeLeft+.5:edgeRight-.5;add('Village lamp post','cylinder',[x,2.1,front-1],[.09,4.2,.09],'#132d42');box('Lantern glow',[x,4.32,front-1],[.55,.75,.55],'#ffcb62',[0,0,0],1.7);add('Lantern roof','cone',[x,4.92,front-1],[.5,.4,.5],'#d82d45',[0,45,0]);for(const dx of [-.3,.3])box('Lantern frame',[x+dx,4.32,front-1],[.06,.85,.66],'#16263a');}
   for(let i=0;i<12;i++)add('Snow drift','sphere',[cx+(random(i+40)-.5)*(right-left+18),-.4,rear+(random(i+60)-.5)*8],[2+random(i)*3,.65+random(i+1)*.4,1.8],'#cce8ff');
   for(let i=0;i<22;i++){const x=cx-15+i*30/21,y=8.7+Math.pow((i-10.5)/10.5,2)*1.3;add('Festoon light','sphere',[x,y,rear-1],[.105,.105,.105],['#ff274a','#ffd027','#24c9ff'][i%3],[0,0,0],2);}
 }
 const snowCount=p.scenery.snow?Math.round(p.scenery.amount*560):0,width=Math.max(36,right-left+18),depth=Math.max(28,front-back+20),height=16;
 const snow=Array.from({length:snowCount},(_,i)=>({x:random(i*7+11)*width,y:random(i*7+12)*height,z:random(i*7+13)*depth,size:.025+random(i*7+14)*.045,rate:(.7+random(i*7+15)*.7)*p.scenery.snowSpeed,phase:random(i*7+16)*Math.PI*2}));
 return {theme,props,skyTop:theme==='halloween'?'#090624':theme==='christmas'?'#031533':'#030713',skyHorizon:theme==='halloween'?'#5f174c':theme==='christmas'?'#176b9d':'#030713',ground:theme==='halloween'?'#1e2336':theme==='christmas'?'#bbd9ef':'#070d1c',snow,snowBounds:{width,depth,height,cx,cz},wind:p.scenery.wind};
}
export type SceneryManifest=ReturnType<typeof sceneryManifest>;
export function snowPosition(s:SceneryManifest,i:number,time:number):Vec3{const n=s.snow[i],b=s.snowBounds,wrap=(a:number,m:number)=>((a%m)+m)%m;return [b.cx+wrap(n.x+s.wind*time+Math.sin(time*.6+n.phase)*.22,b.width)-b.width/2,wrap(n.y-n.rate*time,b.height),b.cz+wrap(n.z+Math.sin(time*.4+n.phase)*.28,b.depth)-b.depth/2];}
