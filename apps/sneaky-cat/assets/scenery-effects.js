'use strict';
window.SneakyCatScenery=(()=>{
 let mist;
 function puff(ctx,x,y,w,h,alpha){
  if(!mist){mist=document.createElement('canvas');mist.width=192;mist.height=96;const q=mist.getContext('2d');q.scale(2,1);const g=q.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,'rgba(242,248,241,.7)');g.addColorStop(.45,'rgba(242,248,241,.28)');g.addColorStop(1,'rgba(242,248,241,0)');q.fillStyle=g;q.fillRect(0,0,96,96)}
  ctx.globalAlpha=alpha;ctx.drawImage(mist,x-w/2,y-h/2,w,h);
 }
 function draw(ctx,id,t,level){
  ctx.save();
  if(id==='yellowstone'){
   for(let i=0;i<5;i++){const u=(t/14+i/5)%1;puff(ctx,570+u*65+Math.sin(i*2)*24,405-u*280,100+u*95,70+u*65,level*.16*Math.sin(Math.PI*u))}
  }else if(id==='rainforest'){
   for(let i=0;i<3;i++){const u=(t/23+i/3)%1;puff(ctx,1000+u*100,458-u*30,210,65,level*.15*Math.sin(Math.PI*u))}
   for(let i=0;i<7;i++){const alpha=Math.pow((1+Math.sin(t*.7+i*2.3))/2,5);ctx.globalAlpha=level*.48*alpha;ctx.fillStyle='#e6f5a0';ctx.beginPath();ctx.arc(210+(i*211)%1150+Math.sin(t*.3+i)*9,340+(i*47)%210+Math.cos(t*.4+i)*7,1.8,0,Math.PI*2);ctx.fill()}
  }else if(id==='death-star'){
   const u=(t/36)%1;ctx.globalAlpha=level*.55*Math.min(1,u*8,(1-u)*8);ctx.translate(850+u*430,218-u*30);ctx.scale(.7,.7);ctx.fillStyle='#a6bed1';ctx.fillRect(-12,-7,3,14);ctx.fillRect(9,-7,3,14);ctx.fillRect(-10,-1,20,2);ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 return {draw};
})();
