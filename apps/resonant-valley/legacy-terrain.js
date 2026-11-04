// The original valley is retained exactly when opening a version-1 save.
// It becomes a preserved central region inside the streamed world.
const key=(x,y,z)=>`${x},${y},${z}`;
const rand=(x,z,s=0)=>{const v=Math.sin(x*127.1+z*311.7+s*74.3)*43758.5453;return v-Math.floor(v);};
class LegacyValley {
 constructor(){this.blocks=new Map();this.heightMap=new Map();this.entities=[];this.generate();}
 get(x,y,z){return this.blocks.get(key(x,y,z))||0;}
 put(x,y,z,id){if(id)this.blocks.set(key(x,y,z),id);else this.blocks.delete(key(x,y,z));}
 height(x,z){return this.heightMap.get(`${x},${z}`)??3;}
 addEntity(e){this.entities.push({...e});}
 generate(){
  for(let x=-48;x<48;x++)for(let z=-48;z<48;z++){
   let h=Math.floor(3.5+Math.sin(x*.11)*1.5+Math.cos(z*.13)*1.2+Math.sin((x+z)*.09));
   if(x>23)h+=Math.floor((x-23)*.29+Math.sin(z*.21)*1.4);
   if(z< -27)h+=Math.floor((-z-27)*.15);
   const lake=((x+17)/12.6)**2+((z+9)/18)**2;
   if(lake<1)h=lake<.72?0:1;else if(lake<1.2)h=2;
   if(x>=-2&&x<=19&&z>=-17&&z<=17)h=3;
   h=Math.max(0,h);this.heightMap.set(`${x},${z}`,h);
   for(let y=-3;y<=h;y++){let id=y===h?(lake<1.2?10:1):y>h-3?2:3;if(x>22&&y===h&&h>7)id=3;if(lake>1&&lake<1.5&&rand(x,z)> .55&&y===h)id=14;this.put(x,y,z,id);}
   if(x>29&&x<40&&z>7&&z<13)for(let y=4;y<7;y++)this.put(x,y,z,0);
   if(x>1&&x<4&&z>-3&&z<28)this.put(x,h,z,18);
  }
  for(let x=-43;x<44;x+=5)for(let z=-43;z<44;z+=5){const tx=x+Math.floor(rand(x,z)*4),tz=z+Math.floor(rand(z,x,2)*4),h=this.height(tx,tz);if(rand(x,z,4)>.52||this.get(tx,h,tz)!==1||(tx>-7&&tx<24&&tz>-22&&tz<23))continue;this.tree(tx,h+1,tz,rand(tx,tz,3)>.55);}
  this.cabin();
 }
 tree(x,y,z,autumn=false){const h=4+(rand(x,z)*2|0);for(let k=0;k<h;k++)this.put(x,y+k,z,autumn?15:4);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<3;dy++){if(Math.abs(dx)+Math.abs(dz)>3||(dy===2&&Math.abs(dx)+Math.abs(dz)>2))continue;this.put(x+dx,y+h-2+dy,z+dz,autumn?12:5);}this.put(x,y+h+1,z,autumn?12:5);}
 cabin(){
  for(let x=3;x<=13;x++)for(let z=-14;z<=1;z++)this.put(x,3,z,6);
  for(let x=5;x<=13;x++)for(let z=-14;z<=-5;z++)for(let y=4;y<=7;y++){
   if(x!==5&&x!==13&&z!==-14&&z!==-5)continue;
   let id=(x===5||x===13)&&(z===-14||z===-5)?4:6;
   if(z===-5&&x>=8&&x<=9&&y<=6)continue;
   if((x===5||x===13)&&z>=-11&&z<=-8&&(y===5||y===6))id=8;
   if(z===-5&&(x===6||x===11||x===12)&&y===5)id=8;
   if(z===-14&&x>7&&x<11&&y===5)id=8;this.put(x,y,z,id);
  }
  for(let x=4;x<=14;x++){const roofY=8+Math.floor(Math.min(x-4,14-x)*.6);for(let z=-15;z<=-4;z++)this.put(x,roofY,z,9);if(x>5&&x<13){for(let y=8;y<roofY;y++){this.put(x,y,-14,6);this.put(x,y,-5,6);}}}
  for(let x=4;x<=14;x++)for(let z=-3;z<=1;z++)this.put(x,3,z,6);
  this.addEntity({id:'home-record',type:'record',x:5,y:4,z:-2,r:0});
  this.addEntity({id:'home-piano',type:'piano',x:11,y:4,z:-12,r:0});
  this.addEntity({id:'home-marimba',type:'marimba',x:11,y:4,z:-1,r:0});
  this.addEntity({id:'home-bench',type:'bench',x:7,y:4,z:0,r:0});
  this.addEntity({id:'home-desk',type:'desk',x:7,y:4,z:-12,r:0});
  this.addEntity({id:'home-craft',type:'workbench',x:15,y:4,z:-3,r:0});
  this.addEntity({id:'home-lantern',type:'lantern',x:4,y:4,z:0,r:0});
  this.addEntity({id:'home-flower',type:'planter',x:12,y:4,z:1,r:0});
  for(let x=-24;x<=-4;x++)for(let z=2;z<=4;z++)this.put(x,3,z,6);
  for(let x=-24;x<=-4;x+=4)for(let z of [2,4]){this.put(x,4,z,4);this.put(x,5,z,4);}
  for(let x=-24;x<=-4;x++)for(let z of [2,4])this.put(x,5,z,6);
  this.tree(-2,4,-18,true);this.tree(21,this.height(21,-15)+1,-15,false);this.tree(23,this.height(23,9)+1,9,true);
 }
}
export const makeLegacyValley=()=>new LegacyValley();
