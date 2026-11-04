const base=new URL(self.registration.scope),namespace='resonant-valley:'+base.pathname+':';
const prefix=namespace+'pack:',control=namespace+'state',marker=new URL('__valley_offline_pack',base).href;
const index=new URL('index.html',base).href;
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
let activePack;
async function current(){
 if(activePack)return activePack;
 const saved=await (await caches.open(control)).match(marker);
 if(saved)activePack=await saved.text();
 return activePack;
}
function localURL(path){
 const url=new URL(path,base);
 if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw Error('Invalid offline asset.');
 return url;
}
self.addEventListener('message',e=>{
 if(e.data!=='keep-valley'||!e.ports[0])return;
 const port=e.ports[0];e.waitUntil((async()=>{
  const response=await fetch(localURL('offline-manifest.json').href,{cache:'no-store'});
  if(!response.ok)throw Error('Could not read the offline list.');
  const manifest=await response.json(),name=prefix+manifest.version,cache=await caches.open(name);
  for(let i=0;i<manifest.files.length;i+=4){
   await Promise.all(manifest.files.slice(i,i+4).map(async path=>{
    const url=localURL(path).href;
    const r=await fetch(url,{credentials:'same-origin'});if(!r.ok||r.redirected)throw Error('Could not save the complete game.');
    await cache.put(url,r);
   }));
   port.postMessage({count:Math.min(i+4,manifest.files.length),total:manifest.files.length});
  }
  await (await caches.open(control)).put(marker,new Response(name));activePack=name;
  for(const k of await caches.keys())if(k.startsWith(prefix)&&k!==name)await caches.delete(k);
  port.postMessage({done:true});
 })().catch(()=>port.postMessage({error:'Offline copy could not finish. Check your connection and available storage, then try again.'})));
});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const entry=url.pathname===base.pathname||url.origin+url.pathname===index;
 if(!entry&&url.search)return;
 const fallback=async original=>{
  const name=await current(),hit=name&&await (await caches.open(name)).match(entry?index:e.request);
  return hit||original||Response.error();
 };
 e.respondWith(fetch(e.request).then(r=>r.status>=500?fallback(r):r).catch(()=>fallback()));
});
