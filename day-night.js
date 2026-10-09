(() => {
 'use strict';
 const room=document.querySelector('.room');
 if(!room)return;
 // The existing animation control and visibility listener pause the whole scene.
 document.documentElement.classList.toggle('page-hidden',document.hidden);
 const ready=src=>new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>{
   if(typeof image.decode==='function')image.decode().then(resolve,reject);
   else resolve();
  };
  image.onerror=reject;
  image.src=src;
 });
 // Start both synchronized animations only after both layers can paint.
 Promise.all([ready('assets/boardwalk.webp'),ready('assets/boardwalk-night.webp')])
  .then(()=>room.classList.add('day-night-ready'))
  .catch(()=>{/* Keep the original sunset if the night image is unavailable. */});
})();
