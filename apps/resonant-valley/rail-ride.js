import {cartPose} from './railway.js';
export class RailRide{
 constructor(world,changed,notify){this.world=world;this.changed=changed;this.notify=notify;this.cart=null;this.speed=0;this.message='';}
 show(text){if(this.message!==text){this.message=text;this.changed(!!this.cart,text);}}
 board(cart){
  const w=this.world,tile=w.railway.at(cart.x,cart.y,cart.z),p=cartPose(w.railway,cart);
  if(!p){this.notify('Place this cart on a connected track first.');return false;}
  if(w.cartClear(p,tile,cart)!==true){this.notify('Give the cart two clear blocks of headroom.');return false;}
  this.cart=cart;this.speed=0;this.show('W / S to ride · Release to brake · F to get out');
  w.camera.position.set(p.x,p.y+1.30,p.z);
  // Face the track on boarding. Free look stays available throughout the ride.
  this.heading=Math.atan2(-p.dx,-p.dz);w.camera.rotation.y=this.heading;w.camera.rotation.x=-.08;return true;
 }
 reset(){this.cart=null;this.speed=0;this.message='';this.changed(false,'');}
 step(dt,keys,forward=Number(!!keys.KeyW)-Number(!!keys.KeyS)){
  const w=this.world,c=this.cart;if(!c)return;
  const input=forward,target=input*7.2;
  const diff=target-this.speed;this.speed+=Math.sign(diff)*Math.min(Math.abs(diff),dt*(input?10:19));
  const result=w.railway.advance(c,this.speed*dt,(p,t)=>w.cartClear(p,t,c));
  if(result)this.speed=0;
  const p=w.positionCart(c);
  if(!p){this.leave();return;}
  const heading=Math.atan2(-p.dx,-p.dz),turn=heading-this.heading;w.camera.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn));this.heading=heading;
  w.camera.position.set(p.x,p.y+1.30,p.z);
  this.show(result?result+' · Reverse or press F to get out':'W / S to ride · Release to brake · F to get out');
 }
 leave(){
  const w=this.world,c=this.cart;if(!c)return;
  const p=cartPose(w.railway,c)||w.camera.position,dx=p.dz||0,dz=-(p.dx||0);
  for(const [x,z] of [[p.x+dx*.92,p.z+dz*.92],[p.x-dx*.92,p.z-dz*.92],[p.x,p.z]]){
   for(let y=Math.ceil(p.y+.1);y>=Math.floor(p.y)-2;y--){
    if(w.collides(x,y,z)||!w.collides(x,y-.16,z))continue;
    w.camera.position.set(x,y+1.66,z);this.reset();return;
   }
  }
  // If both shoulders are a drop, the parked rail position is the safe fallback.
  w.camera.position.set(p.x,p.y+1.66,p.z);w.ensureStandingSpace();this.reset();
 }
}
