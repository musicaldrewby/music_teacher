// Transactional IndexedDB boundary fixture; exercises persistence and failure paths.
module.exports=function memoryIDB(){
 const stores=new Map(),opened=new Set();let failWrites=false;
 const clone=x=>x===undefined?undefined:structuredClone(x);
 const db={objectStoreNames:{contains:n=>stores.has(n)},createObjectStore(n){stores.set(n,new Map())},close(){},transaction(names,mode){
  if(typeof names==='string')names=[names];const local=new Map(names.map(n=>[n,new Map(stores.get(n))]));let tasks=0,done=false;
  const tx={error:null};
  function finish(){if(done||tasks)return;done=true;if(mode==='readwrite'&&failWrites){tx.error=Error('QuotaExceededError');tx.onabort?.();return}if(mode==='readwrite')for(const [n,m] of local)stores.set(n,m);tx.oncomplete?.()}
  function request(fn){tasks++;const r={};setImmediate(()=>{try{r.result=clone(fn());r.onsuccess?.()}catch(e){r.error=e;r.onerror?.()}tasks--;setImmediate(finish)});return r}
  tx.objectStore=n=>({put:o=>request(()=>local.get(n).set(o.id,clone(o))),delete:id=>request(()=>local.get(n).delete(id)),get:id=>request(()=>local.get(n).get(id)),getAll:()=>request(()=>[...local.get(n).values()])});setImmediate(finish);return tx;
 }};
 return {stores,setFailWrites(v){failWrites=v},open(name='default'){const fresh=!opened.has(name);opened.add(name);const r={};setImmediate(()=>{r.result=db;if(fresh)r.onupgradeneeded?.();r.onsuccess?.()});return r}};
};
