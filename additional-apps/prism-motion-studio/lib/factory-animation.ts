import * as T from 'three';
import {factoryCrane,factoryBeltTravel,phase,toyPartDrop,parcelFinish} from './factory-timing';

/** All motion is evaluated from absolute time, including reverse seeking and two-camera dissolves. */
export function animateFactorySet(root:T.Group,time:number){
 const crane=factoryCrane(time),travel=factoryBeltTravel(time);
 root.traverse(node=>{const kind=node.userData.factoryPart;if(!kind)return;node.userData.factoryRestRotation??=node.rotation.toArray().slice(0,3);node.userData.factoryRestPosition??=node.position.toArray();const base=node.userData.factoryRestRotation as number[],p=node.userData.factoryRestPosition as number[];
  if(kind==='gear'||kind==='roller'){const axis=(node.userData.axis||'z') as 'x'|'y'|'z';node.rotation.set(base[0],base[1],base[2]);node.rotation[axis]+=kind==='roller'?-travel/.14:time*(node.userData.speed??.6);}
  if(kind==='belt-slat'){const start=node.userData.beltStart??-14,length=node.userData.beltLength??26,baseX=node.userData.baseX??p[0];node.position.x=start+((baseX-start+travel)%length+length)%length;}
  if(kind==='wrapper-ring'){node.rotation.set(base[0],base[1],base[2]);node.rotation.x+=phase(time,16.5,18.8)*Math.PI*6;}
  if(kind==='assembly-head'){node.position.set(p[0],p[1],p[2]);node.position.y-=time<5.8?Math.sin(time*Math.PI*2)**2*.35:0;}
  if(kind==='crane-trolley')node.position.z=crane.z;
  if(kind==='crane-cable')node.scale.y=Math.max(.05,crane.cable);
  if(kind==='crane-grip'){node.position.y=-crane.cable;node.children.forEach(c=>{if(c.userData.factoryFinger){c.userData.factoryRestX??=c.position.x;const x=c.userData.factoryRestX;c.position.x=x+(crane.closed?0:Math.sign(x)*.3);}});}
 });
}
export function animateFactoryParcel(root:T.Group,time:number,enabled=true){
 const finish=parcelFinish(enabled?time:42);
 root.traverse(node=>{const kind=node.userData.factoryPart;
  if(typeof node.userData.factoryToyPart==='number'){const index=node.userData.factoryToyPart;node.userData.factoryRestPosition??=node.position.toArray();node.userData.factoryRestRotation??=node.rotation.toArray().slice(0,3);const p=node.userData.restPosition||node.userData.factoryRestPosition,r=node.userData.restRotation||node.userData.factoryRestRotation,drop=toyPartDrop(index,enabled?time:42);node.position.set(p[0]+drop.drift,p[1]+drop.height,p[2]);node.rotation.set(r[0],r[1],r[2]+drop.rotation);node.visible=drop.visible;}
  if(kind==='toy')node.visible=!finish.finished; // Hidden only once the solid lid and wrapping have closed.
  if(kind==='paper')node.visible=finish.paper;
  if(typeof node.userData.factoryPanel==='number'){const index=node.userData.factoryPanel,axis=index<2?'x':'z',sign=[1,-1,-1,1][index];node.rotation[axis]=(1-finish.fold)*sign*Math.PI/2;}
  if(kind==='lid'){node.visible=finish.lid>0;node.userData.factoryRestPosition??=node.position.toArray();const p=node.userData.restPosition||node.userData.factoryRestPosition;node.position.set(p[0],p[1]+(1-finish.lid)*1.6,p[2]);}
  if(kind==='ribbon'){node.visible=finish.ribbon>0;node.scale.setScalar(Math.max(.001,finish.ribbon));}
  if(kind==='bow'){node.visible=finish.bow>0;const u=finish.bow;node.scale.setScalar(Math.max(.001,u+Math.sin(u*Math.PI)*.12));}
 });
}
