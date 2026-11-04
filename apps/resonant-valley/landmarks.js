export const LANDMARK_NAMES={arch:'Stone arch',workshop:'Old workshop',tree:'Great copper tree',garden:'Wildflower hollow',cascade:'Spring cascade'};
export function landmarkAt(generator,gx,gz){
 if(!generator.landmarksVersion)return null;
 const n=generator.noise;if(n.random(gx,gz,1001)>.78)return null;
 const x=gx*128+24+Math.floor(n.random(gx,gz,1003)*80),z=gz*128+24+Math.floor(n.random(gx,gz,1009)*80),c=generator.column(x,z);
 if(c.h<4||c.h>64||Math.max(Math.abs(x-generator.home.x),Math.abs(z-generator.home.z))<48||generator.legacy&&Math.max(Math.abs(x),Math.abs(z))<80)return null;
 for(let bx=Math.floor((x-50)/32);bx<=Math.floor((x+50)/32);bx++)for(let bz=Math.floor((z-50)/32);bz<=Math.floor((z+50)/32);bz++)if(generator.protectedRegions?.has(`${bx},${bz}`))return null;
 const slope=Math.max(Math.abs(c.h-generator.column(x+6,z).h),Math.abs(c.h-generator.column(x-6,z).h),Math.abs(c.h-generator.column(x,z+6).h));
 const types=c.biome==='desert'?['arch','workshop']:c.biome==='alpine'?['arch','cascade']:['arch','workshop','tree','garden','cascade'];
 let type=types[Math.floor(n.random(gx,gz,1013)*types.length)];if(slope>5&&['workshop','garden'].includes(type))type='arch';
 return {id:`landmark:1:${gx}:${gz}`,type,name:LANDMARK_NAMES[type],x,z,y:c.h+1,biome:c.biome};
}
export function nearbyLandmarks(generator,x,z,radius=40){const out=[];for(let gx=Math.floor((x-radius)/128);gx<=Math.floor((x+radius)/128);gx++)for(let gz=Math.floor((z-radius)/128);gz<=Math.floor((z+radius)/128);gz++){const site=landmarkAt(generator,gx,gz);if(site&&Math.hypot(site.x-x,site.z-z)<=radius)out.push(site);}return out;}
export function populateLandmarks(generator,cx,cz,put,decor){
 for(let gx=Math.floor((cx*16-14)/128);gx<=Math.floor((cx*16+30)/128);gx++)for(let gz=Math.floor((cz*16-14)/128);gz<=Math.floor((cz*16+30)/128);gz++){
  const s=landmarkAt(generator,gx,gz);if(!s)continue;const {x,z,y,type}=s;
  const p=(dx,dy,dz,id)=>put(x+dx,y+dy,z+dz,id);
  if(type==='arch')for(let dx=-6;dx<=6;dx++){const top=Math.round(Math.sqrt(Math.max(0,36-dx*dx)))+2;for(let dz=-1;dz<=1;dz++)for(let dy=Math.abs(dx)>=5?-5:top;dy<=top+1;dy++)p(dx,dy,dz,s.biome==='desert'?23:19);}
  if(type==='workshop'){
   for(let dx=-4;dx<=4;dx++)for(let dz=-3;dz<=3;dz++){for(let dy=-5;dy<0;dy++)p(dx,dy,dz,19);p(dx,0,dz,6);for(let dy=1;dy<=4;dy++)p(dx,dy,dz,0);if(Math.abs(dx)===4||Math.abs(dz)===3)for(let dy=1;dy<=3;dy++)if(!(dz===3&&Math.abs(dx)<2))p(dx,dy,dz,dy===2&&Math.abs(dx)<2?8:6);if(dx<1)p(dx,4,dz,13);}
   for(let dx=-2;dx<=1;dx++)p(dx,1,-2,20);p(-2,2,-2,6);p(1,2,-2,6);
  }
  if(type==='tree'){
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)for(let dy=0;dy<12;dy++)p(dx,dy,dz,15);
   for(let dx=-6;dx<=7;dx++)for(let dz=-6;dz<=7;dz++)for(let dy=7;dy<=15;dy++)if((dx-.5)**2+(dz-.5)**2+(dy-11)**2*1.6<43)p(dx,dy,dz,12);
   for(let dy=8;dy<12;dy++)p(0,dy,0,15);
  }
  if(type==='garden')for(let dx=-8;dx<=8;dx++)for(let dz=-8;dz<=8;dz++)if(dx*dx+dz*dz<64){const wx=x+dx,wz=z+dz,h=generator.column(wx,wz).h;put(wx,h,wz,1);put(wx,h+1,wz,0);if(Math.floor(wx/16)===cx&&Math.floor(wz/16)===cz&&generator.noise.random(wx,wz,1021)>.28)decor.push({x:wx+.5,y:h+1,z:wz+.5,flower:true,color:Math.floor(generator.noise.random(wx,wz,1027)*4)});}
  if(type==='cascade'){
   for(let dx=-3;dx<=3;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=-4;dy<=7;dy++)if(dz<0||Math.abs(dx)===3)p(dx,dy,dz,19);
   for(let dx=-1;dx<=1;dx++){for(let dy=0;dy<=7;dy++)p(dx,dy,1,255);for(let dz=1;dz<=5;dz++){p(dx,-1,dz,3);p(dx,0,dz,255);}}
   for(let dx=-1;dx<=1;dx++)p(dx,7,0,255);
  }
 }
}
export function protectExisting(data){
 const regions=new Set();for(const [key] of data?.edits||[]){const [x,,z]=String(key).split(',').map(Number);if(Number.isFinite(x)&&Number.isFinite(z))regions.add(`${Math.floor(x/32)},${Math.floor(z/32)}`);}
 for(const e of data?.entities||[])if(Number.isFinite(e.x)&&Number.isFinite(e.z))regions.add(`${Math.floor(e.x/32)},${Math.floor(e.z/32)}`);
 return [...regions].map(k=>k.split(',').map(Number));
}
