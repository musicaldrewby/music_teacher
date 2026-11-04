async function activeWorker(registration){
 if(registration.active)return registration.active;
 const worker=registration.installing||registration.waiting;
 if(!worker)throw Error('Could not start offline storage. Try again.');
 await new Promise((resolve,reject)=>{
  function changed(){
   if(worker.state!=='activated'&&worker.state!=='redundant')return;
   worker.removeEventListener('statechange',changed);
   if(worker.state==='activated')resolve();else reject(Error('Could not start offline storage. Try again.'));
  }
  worker.addEventListener('statechange',changed);changed();
 });
 return worker;
}

export async function keepOffline(report){
 if(!('serviceWorker' in navigator))throw Error('Open the game in a browser tab to keep an offline copy.');
 const base=new URL('./',import.meta.url);
 const registration=await navigator.serviceWorker.register(new URL('valley-offline.js',base).href,{scope:base.href});
 const worker=await activeWorker(registration);
 await new Promise((resolve,reject)=>{
  const port=new MessageChannel();port.port1.onmessage=e=>{
   if(e.data.error){port.port1.close();reject(Error(e.data.error));}
   else if(e.data.done){port.port1.close();resolve();}
   else report('Saving game and instruments · '+e.data.count+' / '+e.data.total);
  };
  worker.postMessage('keep-valley',[port.port2]);
 });
 report('Ready offline on this device. Open this same game link to play.');
}
