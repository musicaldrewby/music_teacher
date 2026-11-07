// IndexedDB commits off the rendering path. Older localStorage saves remain
// readable and are migrated on the next successful save, without deleting them.
export class WorldSaveStore {
 constructor(storage=globalThis.indexedDB,legacy=globalThis.localStorage){this.storage=storage;this.legacy=legacy;}
 open(){
  if(!this.storage)return Promise.resolve(null);
  if(!this.opening)this.opening=new Promise((resolve,reject)=>{
   const request=this.storage.open('resonant-valley-saves',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('worlds');
   request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(Error('Close another valley tab to finish opening saved worlds.'));
   request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();this.opening=null;};resolve(request.result);};
  });
  return this.opening;
 }
 async read(key){
  const db=await this.open();
  if(db){const value=await new Promise((resolve,reject)=>{const tx=db.transaction('worlds'),request=tx.objectStore('worlds').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});if(value!==undefined)return value;}
  const old=this.legacy?.getItem(key);return old?JSON.parse(old):null;
 }
 async write(key,data){
  const db=await this.open();
  if(!db){this.legacy.setItem(key,JSON.stringify(data));return;}
  await new Promise((resolve,reject)=>{const tx=db.transaction('worlds','readwrite');tx.objectStore('worlds').put(data,key);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('World save was interrupted.'));tx.onerror=()=>reject(tx.error);});
 }
}
