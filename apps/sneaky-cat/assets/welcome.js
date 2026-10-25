'use strict';
(()=>{
 const game=document.getElementById('game'),welcome=document.getElementById('welcome'),enter=document.getElementById('welcomeEnter'),about=document.getElementById('aboutSupportBtn');
 let closing=false,exitTimer=null;
 const setBackgroundInert=value=>{for(const child of game.children)if(child!==welcome)child.inert=value};
 function showWelcome(){if(closing)return;clearTimeout(exitTimer);welcome.hidden=false;welcome.classList.remove('is-leaving');game.dataset.welcome='true';setBackgroundInert(true);enter.focus({preventScroll:true})}
 function enterGame(){if(closing||welcome.hidden)return;closing=true;welcome.classList.add('is-leaving');game.dataset.welcome='false';
  const finish=()=>{welcome.hidden=true;setBackgroundInert(false);closing=false;const start=document.getElementById('startBtn');(start.disabled?document.getElementById('nextLevelBtn'):start).focus({preventScroll:true})};
  exitTimer=setTimeout(finish,matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);
 }
 enter.addEventListener('click',enterGame);about.addEventListener('click',showWelcome);
 welcome.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();enterGame();return}
  if(e.key==='Tab'){const last=welcome.querySelector('.coffee-link');if(e.shiftKey&&document.activeElement===enter){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();enter.focus()}}
 });
 setBackgroundInert(true);enter.focus({preventScroll:true});
})();
