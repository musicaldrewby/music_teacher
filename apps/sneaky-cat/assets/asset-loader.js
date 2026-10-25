'use strict';
window.SneakyCatAssets=Object.create(null);
window.sneakyCatLoadError=function(){
 const summary=document.getElementById('soundSummary');
 if(summary)summary.textContent='Some game files could not load. Check your connection and reload the page.';
 const veil=document.getElementById('bootVeil');if(veil)veil.hidden=true;
};
