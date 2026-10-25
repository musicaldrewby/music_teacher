// Save the current composition independently of its best-effort recovery copy.
export function writeProject(storage,key,serialized,validate){
 let previous=null;
 try{previous=storage.getItem(key);}catch{}
 storage.setItem(key,serialized);
 if(previous&&previous!==serialized){
  try{validate(JSON.parse(previous));storage.setItem(key+'-backup',previous);}catch{}
 }
}

export function storageMessage(error){
 if(error?.name==='QuotaExceededError'||error?.name==='NS_ERROR_DOM_QUOTA_REACHED')return 'Browser storage is full. Download your project from the Project menu to keep your changes.';
 if(error?.name==='SecurityError'||error?.name==='NotAllowedError')return 'This browser is blocking storage. Download your project from the Project menu to keep your changes.';
 return 'This browser could not save your changes. Download your project from the Project menu to keep them.';
}
