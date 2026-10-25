(() => {
 const scene=document.getElementById('roadScene'),canvas=document.createElement('canvas');canvas.className='scenery-canvas';scene.replaceChildren(canvas);const c=canvas.getContext('2d');let time=0,last=0,frame=0,loaded=false,gameStart=0,gameDuration=120,gameSeed=Math.floor(Math.random()*0xffffffff);
 function resize(){const r=scene.parentElement.getBoundingClientRect(),dpr=Math.min(Math.max(devicePixelRatio||1,1.25),2,2560/r.width,1440/r.height);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));if(loaded)draw();}
 function draw(){MovementScene.background(c,time,canvas.width,canvas.height,{time:time-gameStart,duration:gameDuration,seed:gameSeed});}
 function tick(now){const moving=!document.hidden&&!document.body.classList.contains('background-paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;if(last&&moving)time+=Math.min(.1,(now-last)/1000);last=now;if(loaded&&now-frame>33){draw();frame=now;}requestAnimationFrame(tick);}
 window.addEventListener('movementgamestart',e=>{gameStart=time;gameDuration=e.detail?.duration||120;gameSeed=e.detail?.seed||1;});
 new ResizeObserver(resize).observe(scene.parentElement);resize();MovementScene.ready().then(()=>{loaded=true;draw();requestAnimationFrame(tick);}).catch(()=>{scene.classList.add('scenery-fallback');});
})();
