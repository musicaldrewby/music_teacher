// Stateless, sample-clock scenes shared by the browser and the film renderer.
// No feedback buffers: seeking/resuming reproduces every particle and light trail.
export const WORLDS=['Auto','Event Horizon','Aurora Veils','Prism Garden','Liquid Echoes','Resonance Field','Wave Cathedral','Orbit Rings'];
export const CAMERAS=['Drift','Orbit','Still'];
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const color=(h,a,l=65)=>`hsla(${h},78%,${l}%,${clamp(a)})`;
export function worldFor(state,world='Auto'){
 if(world!=='Auto')return world;
 const active=state.tracks.filter(t=>!t.mute&&(!state.tracks.some(t=>t.solo)||t.solo));
 if(active.filter(t=>t.bank!==128&&t.program>=8&&t.program<=15).length>=2)return 'Prism Garden';
 if(/aurora|veil|dawn|exosphere|light beyond|homeward|nebula/i.test(state.name))return 'Aurora Veils';
 return 'Event Horizon';
}
export function musicalLight(state,hits,seconds,calm=false){
 const solo=state.tracks.some(t=>t.solo),room=state.ambient?.enabled?(state.ambient.mix/100):0;
 return state.tracks.map((t,i)=>{
  const active=!t.mute&&(!solo||t.solo),pad=t.bank!==128&&t.program>=88&&t.program<=103,mallet=t.bank!==128&&t.program>=8&&t.program<=15,drum=t.bank===128;
  const hit=hits?.[i],age=hit?Math.max(0,seconds-hit.time/1000):Infinity;
  const life=drum?.24:pad?2.6:mallet?.85:1.2;
  const pulses=active&&!calm?(hit?.history||(hit?[hit]:[])).filter(h=>h.time<=seconds*1000).map(h=>{
   const age=(seconds-h.time/1000),velocity=(h.velocity==null?(h.accent?1:.7):clamp(h.velocity/115))*Math.sqrt(t.volume/100);
   // A short eased attack and overlapping tails remove the hard per-note reset.
   const rise=clamp(age/(pad?.13:.055)),attack=rise*rise*(3-2*rise);
   return {age,strike:attack*Math.exp(-age/life)*velocity,trail:attack*Math.exp(-age/(life+room*(state.ambient?.decay||1)*.22))*velocity};
  }):[];
  const strike=Math.max(0,...pulses.map(p=>p.strike)),trail=Math.max(0,...pulses.map(p=>p.trail));
  return {active,pad,mallet,drum,strike,trail,pulses,age,step:hit?.step||0,weight:active?t.volume/100:0};
 });
}
function glow(g,x,y,r,hue,alpha){if(r<=0||alpha<=0)return;const p=g.createRadialGradient(x,y,0,x,y,r);p.addColorStop(0,color(hue,alpha));p.addColorStop(.25,color(hue,alpha*.35,48));p.addColorStop(1,color(hue,0,12));g.fillStyle=p;g.fillRect(x-r,y-r,r*2,r*2)}
function line(g,points,stroke,width=1){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
function polygon(g,points,fill,stroke){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=.7;g.stroke()}}
export function cameraPose(seconds,visual,motionTime){
 const t=motionTime??seconds*(visual.speed??.5),mode=visual.camera??'Drift';
 if(mode==='Still'||(!visual.speed&&motionTime==null))return {x:0,y:0,rotation:0,zoom:visual.zoom??1};
 return {x:Math.sin(t*.057)*.018,y:Math.cos(t*.043)*.012,rotation:Math.sin(t*.024)*(mode==='Orbit'?.09:.015),zoom:(visual.zoom??1)*(1+Math.sin(t*.033)*.025)};
}
export function drawWorld(g,w,h,{state,visual,hits,seconds,motionTime,palette,level=0}){
 const calm=visual.speed===0,t=motionTime??(calm?0:seconds*visual.speed),lights=musicalLight(state,hits,seconds,calm),world=worldFor(state,visual.world),dim=visual.glow/100,u=Math.min(w,h),pose=cameraPose(seconds,visual,motionTime);
 g.fillStyle='#03060e';g.fillRect(0,0,w,h);
 // Overscan prevents exposed borders during the camera drift.
 g.save();g.translate(w/2+pose.x*w,h/2+pose.y*h);g.rotate(pose.rotation);g.scale(pose.zoom,pose.zoom);g.translate(-w/2,-h/2);
 const energy=calm?0:Math.min(.8,level),a=lights.reduce((n,l)=>n+l.trail,0)/8;
 glow(g,w*.46,h*.52,w*.65,palette.hues[0],dim*(.14+energy*.14));
 glow(g,w*.79,h*.25,w*.38,palette.hues[1],dim*.07);
 for(let i=0;i<160;i++){
  const depth=.3+noise(i+300)*.7,x=(noise(i+2)*1.3-.15)*w+Math.sin(t*.025+i)*depth*5,y=(noise(i+901)*1.3-.15)*h+Math.cos(t*.02+i)*depth*4;
  g.fillStyle=color(palette.hues[i%3],dim*(.12+noise(i+400)*.34),80);g.beginPath();g.arc(x,y,(i%17===0?1.2:.5)*u/720,0,TAU);g.fill();
 }
 const data={t,seconds,lights,dim,u,palette,energy,a,calm,state};
 const scenes={'Aurora Veils':aurora,'Prism Garden':prisms,'Liquid Echoes':liquid,'Resonance Field':resonance,'Wave Cathedral':cathedral};
 (scenes[world]||horizon)(g,w,h,data);
 g.restore();
 // Subtle photographic falloff, without hiding the outer scene.
 const vignette=g.createRadialGradient(w/2,h*.48,u*.23,w/2,h*.48,Math.max(w,h)*.66);vignette.addColorStop(0,'#01030a00');vignette.addColorStop(1,'#01030ac9');g.fillStyle=vignette;g.fillRect(0,0,w,h);
}
function horizon(g,w,h,{t,lights,dim,u,palette,energy,a}){
 const cx=w*.5,cy=h*.51,r=u*.188;
 glow(g,cx,cy,u*.54,palette.hues[1],dim*(.25+a*.3));
 glow(g,cx,cy,u*.28,palette.hues[0],dim*.18);
 g.save();g.translate(cx,cy);g.rotate(-.16+Math.sin(t*.03)*.025);
 // Light bent above the event horizon, layered into a fine lens.
 for(let k=18;k>=0;k--){const rr=r*(1.026+k*.004);g.beginPath();g.ellipse(0,-r*.006,rr,rr*1.015,0,0,TAU);g.lineWidth=(k?2:1.1)*u/720;g.strokeStyle=color(palette.hues[k%3],dim*(k?.012:.55),k?58:83);g.stroke()}
 // The far side of the accretion disc disappears behind the sphere.
 const disc=front=>{
  for(let k=0;k<58;k++){
   const rr=r*(1.06+k*.027),hue=palette.hues[k%3]+Math.sin(k*.5)*12;
   g.beginPath();g.ellipse(0,0,rr,rr*.255,0,front?0:Math.PI,front?Math.PI:TAU);g.strokeStyle=color(hue,dim*(.09+.12*Math.sin(k*.28)**2+a*.22),58+k%5*4);g.lineWidth=(k%9===0?2.4:.8)*u/720;g.stroke();
  }
  for(let k=0;k<4;k++){const rr=r*(1.09+k*.024);g.beginPath();g.ellipse(0,0,rr,rr*.255,0,front?0:Math.PI,front?Math.PI:TAU);g.strokeStyle=color(palette.hues[0],dim*(k===1?.65:.12),84);g.lineWidth=(k===1?1.2:3)*u/720;g.stroke()}
 };
 disc(false);
 const sphere=g.createRadialGradient(-r*.3,-r*.3,0,0,0,r);sphere.addColorStop(0,'#02030a');sphere.addColorStop(.9,'#010208');sphere.addColorStop(1,'#060b17');g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle=sphere;g.fill();
 // Thin upper rim, never a flashing full-screen wash.
 g.beginPath();g.arc(0,0,r*1.005,Math.PI*.94,TAU*1.01);g.strokeStyle=color(palette.hues[0],dim*.85,86);g.lineWidth=1.2*u/720;g.stroke();
 disc(true);
 for(let i=0;i<8;i++){
  const l=lights[i],rr=r*(1.35+i*.115),phase=t*(.065+i*.003)+i*2.399;
  for(let j=0;j<28;j++){
   const angle=phase-j*.008,x=Math.cos(angle)*rr,y=Math.sin(angle)*rr*.255;
   if(y<0&&x*x+y*y<r*r)continue;
   g.fillStyle=color(palette.hues[i%3],dim*(.025+l.trail*.65)*(1-j/28),j<3?88:65);g.beginPath();g.arc(x,y,(j<2?1.7:.8)*u/720,0,TAU);g.fill();
  }
  if(l.strike>.025){const x=Math.cos(phase)*rr,y=Math.sin(phase)*rr*.255;if(!(y<0&&x*x+y*y<r*r))glow(g,x,y,u*(.015+l.strike*.025),palette.hues[i%3],dim*l.strike*.55)}
 }
 // Distant orbital dust spans the full widescreen composition.
 for(let i=0;i<120;i++){
  const rr=u*(.29+noise(i+511)*.48),ang=noise(i+702)*TAU+t*(.009+noise(i)*.008),x=Math.cos(ang)*rr,y=Math.sin(ang)*rr*.29;
  if(y<0&&x*x+y*y<r*r)continue;
  g.fillStyle=color(palette.hues[i%3],dim*(.12+noise(i+81)*.32),72);g.fillRect(x,y,u/800,u/800);
 }
 g.restore();
 // Atmospheric reverb light stays around the ring, leaving its center black.
 glow(g,cx-r*1.75,cy+r*.25,u*.2,palette.hues[0],dim*(.09+energy*.12));
}
function aurora(g,w,h,{t,lights,dim,u,palette,a}){
 glow(g,w*.52,h*.65,w*.65,palette.hues[1],dim*.16);
 const ground=g.createLinearGradient(0,h*.64,0,h);ground.addColorStop(0,'#01071500');ground.addColorStop(1,'#02040cf0');
 // Several depth planes of silk-like light: long voices breathe; strikes ripple.
 for(let k=0;k<7;k++){
  const l=lights[k],hue=palette.hues[k%2],strength=dim*(.19+l.trail*.32),points=[],bottom=[],N=88;
  for(let j=0;j<=N;j++){
   const f=j/N,x=(-.16+f*1.32)*w;
   const wave=Math.sin(f*6.1+t*.11+k*.59)*.11+Math.sin(f*12.7-t*.063+k*1.2)*.028;
   const y=h*(.23+k*.043+wave)+Math.sin(f*23-t*.4+k)*l.strike*h*.006;
   const length=h*(.14+.19*(.5+.5*Math.sin(f*5+k*.8)))*(1+l.trail*.12);
   points.push([x,y]);bottom.push([x,y+length]);
  }
  for(let band=0;band<22;band++){
   const f=band/22,next=(band+1)/22;
   const edge=f=>points.map(([x,y],j)=>[x+Math.sin(j*.09+k+t*.07)*w*.01*f,y+(bottom[j][1]-y)*f]);
   polygon(g,[...edge(f),...edge(next).reverse()],color(hue,strength*Math.exp(-f*5)*.82,64));
  }
  line(g,points,color(hue,dim*(.24+l.strike*.32),83),u/750);
  for(let j=0;j<points.length;j++){const [x,y]=points[j],end=bottom[j],sway=Math.sin(t*.1+j*.15)*w*.018;const grad=g.createLinearGradient(x,y,x,end[1]);grad.addColorStop(0,color(hue,strength*.23,78));grad.addColorStop(1,color(hue,0));line(g,[[x,y],[x+sway*.25,y+(end[1]-y)*.35],[x+sway,end[1]]],grad,u*(.0005+noise(k*90+j)*.0008))}
 }
 g.fillStyle=ground;g.fillRect(0,h*.64,w,h*.36);
 // Restrained reflected light over a quiet lower horizon.
 for(let i=0;i<14;i++){const yy=h*(.79+i*.014),span=w*(.14+i*.038);g.beginPath();g.ellipse(w/2,yy,span,u*.003*(i+1),0,0,TAU);g.strokeStyle=color(palette.hues[i%3],dim*(.035+a*.045)*(1-i/15));g.lineWidth=u/900;g.stroke()}
 for(let i=0;i<48;i++){const x=noise(i+551)*w,y=h*(.17+noise(i+198)*.52)+Math.sin(t*.045+i)*h*.012;glow(g,x,y,u*(i%9===0?.008:.003),palette.hues[i%3],dim*(.12+lights[i%8].trail*.13))}
}
function prisms(g,w,h,{t,seconds,lights,dim,u,palette}){
 glow(g,w*.5,h*.59,w*.52,palette.hues[1],dim*.18);
 // Perspective guides almost disappear beneath the glass garden.
 const vy=h*.48;
 for(let i=-7;i<=7;i++)line(g,[[w*.5+i*w*.013,vy],[w*.5+i*w*.13,h*1.1]],color(palette.hues[0],dim*.045),u/1000);
 for(let i=0;i<9;i++){const y=vy+(i/8)**2*h*.6;line(g,[[0,y],[w,y]],color(palette.hues[0],dim*.035),u/1000)}
 const gems=Array.from({length:35},(_,i)=>{const row=Math.floor(i/7),depth=row/4;return {i,depth,x:w*(.12+(i%7)/6*.76)+(noise(i+4)-.5)*w*.043,y:h*(.55+depth*.36)+(noise(i+99)-.5)*h*.025}});
 for(const gem of gems){
  const {i,depth}=gem,l=lights[i%8],hue=palette.hues[i%3],x=gem.x+Math.sin(t*.025+i)*u*.006,y=gem.y;
  const width=u*(.015+depth*.024),height=u*(.12+noise(i+931)*.26)*( .6+depth*.6),top=y-height,lean=Math.sin(t*.04+i)*width*.15;
  const e=l.strike*(i%3===l.step%3?1:.48),trail=l.trail,alpha=dim*(.42+depth*.25+trail*.23);
  const A=[x+lean,top],B=[x-width,top+width*.6],C=[x+width,top+width*.9],D=[x-width,y-width*.3],E=[x,y+width*.35],F=[x+width,y-width*.2];
  // Echoes on the floor follow the same decaying note impulses as the facets.
  glow(g,x,y,width*4,hue,dim*(.07+trail*.24));
  g.save();g.translate(0,y);g.scale(1,-.38);g.translate(0,-y);
  polygon(g,[A,B,D,E,F,C],color(hue,alpha*.055));g.restore();
  const face=g.createLinearGradient(x-width,top,x+width,y);face.addColorStop(0,color(hue,alpha*.32,77));face.addColorStop(.48,color(hue,alpha*.07,40));face.addColorStop(1,color(hue,alpha*.26,55));
  polygon(g,[A,B,D,E],face,color(hue,alpha*.44,73));
  polygon(g,[A,C,F,E],color(hue+25,alpha*(.12+e*.22),52),color(hue,alpha*.58,78));
  polygon(g,[A,B,[x,top+width*1.5],C],color(hue,alpha*(.2+e*.4),82),color(hue,alpha*.65,86));
  line(g,[A,E],color(hue,dim*(.25+trail*.72),86),u/800);
  if(e>.01){glow(g,x+lean,top,width*(2+e),hue,dim*e*.65);g.beginPath();g.ellipse(x,y,width*(1+(1-e)*4),width*(.3+(1-e)*.8),0,0,TAU);g.strokeStyle=color(hue,dim*e*.36,78);g.lineWidth=u/750;g.stroke()}
 }
}

function liquid(g,w,h,{t,lights,dim,u,palette,a}){
 // A continuous illuminated surface. Each track sends a travelling disturbance
 // across its own part of the water; reverb keeps the wake alive after the strike.
 glow(g,w*.5,h*.55,w*.52,palette.hues[0],dim*(.22+a*.15));
 const sources=lights.map((l,i)=>({l,x:.16+(i%4)*.225,y:.16+Math.floor(i/4)*.54}));
 for(let row=0;row<48;row++){
  const z=row/47,depth=.3+z*.7,points=[];
  for(let j=0;j<=112;j++){
   const x=j/112,xx=(x-.5)*1.35,yy=z-.5;
   let wave=Math.sin(x*10+t*.24+z*5)*.018+Math.sin(x*21-z*8-t*.19)*.009;
   for(const s of sources){if(s.l.trail<.005)continue;const d=Math.hypot((x-s.x)*1.15,(z-s.y)*.85);wave+=Math.sin(d*35-t*1.5+s.x*7)*Math.exp(-d*2.6)*s.l.trail*.021;}
   points.push([w*(.5+xx*(.68+z*.65)),h*(.38+z*.5)+wave*u*depth]);
  }
  const hue=palette.hues[row%3],alpha=dim*(.28+depth*.42+a*.22);
  if(row%4===0)line(g,points,color(hue,alpha*.09,60),u*.005);
  line(g,points,color(hue,alpha,74+row%4*4),u/700);
 }
 for(let i=0;i<sources.length;i++){
  const {l,x,y}=sources[i];if(l.trail<.008)continue;
  const cx=w*(.5+(x-.5)*1.35*(.68+y*.65)),cy=h*(.38+y*.5),hue=palette.hues[i%3];
  glow(g,cx,cy,u*(.028+l.trail*.05),hue,dim*l.trail*.65);
  // Bounded, analytic rings fade out naturally, with no modulo wrap or buffer.
  for(const pulse of l.pulses){if(pulse.trail<.008)continue;for(let k=0;k<2;k++){const rr=u*(.006+pulse.age*.018+k*.012);if(rr>u*.28)continue;g.beginPath();g.ellipse(cx,cy,rr,rr*.26,0,0,TAU);g.lineWidth=u/950;g.strokeStyle=color(hue,dim*pulse.trail*(.2-k*.07),86);g.stroke();}}
 }
 // Long horizontal reflections anchor the fluid in a quiet, dark space.
 for(let i=0;i<5;i++){const y=h*(.88+i*.015);line(g,[[w*.17,y],[w*.83,y]],color(palette.hues[i%3],dim*.035),u/850);}
}

function resonance(g,w,h,{t,lights,dim,u,palette,a}){
 // Eight braided particle streams form a rotating, dimensional magnetic field.
 // Every stream belongs to one musical layer; quiet parts retain only a dim trace.
 const cx=w*.5,cy=h*.5,rotation=t*.065;
 glow(g,cx,cy,u*.53,palette.hues[1],dim*(.2+a*.16));
 const particles=[];
 for(let band=0;band<8;band++){
  const l=lights[band],hue=palette.hues[band%3];
  for(let j=0;j<144;j++){
   const theta=j/144*TAU,phi=band/8*TAU+theta*3+t*.075;
   const rr=u*(.26+.064*Math.cos(phi)+.012*Math.sin(theta*5-t*.11));
   const x=Math.cos(theta)*rr,y=Math.sin(phi)*u*.135,z=Math.sin(theta)*rr;
   const xx=x*Math.cos(rotation)+z*Math.sin(rotation),zz=z*Math.cos(rotation)-x*Math.sin(rotation);
   const perspective=1/(1-zz/(u*1.4)),ripple=l.trail*(.4+.6*(.5+.5*Math.cos(theta*5-t*1.4+band*.7)));
   particles.push({x:cx+xx*perspective,y:cy+(y+zz*.36)*perspective,z:zz,size:(.7+perspective*.65+noise(j+band*181)*.6)*u/720,hue,alpha:dim*(.22+ripple*.75)*perspective,l,j,band});
  }
 }
 for(let band=0;band<8;band++){const points=particles.filter(p=>p.band===band).map(p=>[p.x,p.y]);points.push(points[0]);const hue=palette.hues[band%3];line(g,points,color(hue,dim*(.07+lights[band].trail*.13),76),u/1000);}
 particles.sort((a,b)=>a.z-b.z);
 for(const p of particles){
  if(p.j%18===0&&p.l.trail>.025)glow(g,p.x,p.y,p.size*(5+p.l.strike*4),p.hue,dim*p.l.trail*.25);
  g.fillStyle=color(p.hue,p.alpha,p.z>0?84:66);g.beginPath();g.arc(p.x,p.y,p.size,0,TAU);g.fill();
 }
 // Distant filaments provide a sense of scale without a flashing screen wash.
 for(let i=0;i<3;i++){g.beginPath();g.ellipse(cx,cy,u*(.38+i*.032),u*(.13+i*.007),-.27,0,TAU);g.strokeStyle=color(palette.hues[i],dim*(.045+a*.05),65);g.lineWidth=u/1100;g.stroke();}
}

function cathedral(g,w,h,{t,lights,dim,u,palette,a,state}){
 // A continuous nave of geometric light. Overlapping phase waves follow each
 // track's own step count, while actual note envelopes illuminate its ribs.
 const cx=w*.5,cy=h*.59;
 glow(g,cx,h*.44,u*.52,palette.hues[1],dim*(.22+a*.13));
 for(let rib=43;rib>=0;rib--){
  const depth=rib/43,scale=Math.exp(-depth*2.4),l=lights[rib%8],hue=palette.hues[rib%3],points=[];
  const spread=u*(.58+Math.sin(t*.07)*.025)*scale,height=u*.79*scale;
  for(let j=0;j<=84;j++){
   const angle=Math.PI*j/84,x=-Math.cos(angle),arch=Math.sin(angle);
   const wave=Math.sin(angle*(3+state.tracks[rib%8].steps%5)-t*.24+rib*.18);
   points.push([cx+x*spread*(1+wave*.018+l.trail*.018),cy-height*arch*(1+wave*.022)+u*.045*(1-scale)]);
  }
  const alpha=dim*(.24+(1-depth)*.38+l.trail*.35);
  if(rib%5===0)line(g,points,color(hue,alpha*.1),u*.006*scale);
  line(g,points,color(hue,alpha,73+8*(1-depth)),Math.max(.7,u*.0019*scale));
  // Reflected vault, darker than the upper architecture.
  const reflection=points.map(([x,y])=>[x,cy+(cy-y)*.24]);
  line(g,reflection,color(hue,alpha*.13,58),u/1250);
  if(rib%6===0&&l.trail>.015){const peak=points[42];glow(g,peak[0],peak[1],u*.025*scale,hue,dim*l.trail*.37);}
 }
 // Slow note-lit perspective rays converge at the distant inner sanctum.
 for(let i=0;i<8;i++){
  const l=lights[i],x=w*(.08+i*.12),hue=palette.hues[i%3];
  line(g,[[cx,cy+u*.045],[x,h*1.08]],color(hue,dim*(.045+l.trail*.08),72),u/1150);
 }
}
