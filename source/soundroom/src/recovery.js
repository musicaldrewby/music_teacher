export const RECOVERY_KEY='soundroom-recovery-v1';
export const PREVIOUS_KEY='soundroom-recovery-previous-v1';
export function readRecovery(storage,key=RECOVERY_KEY){
 const value=storage.getItem(key);if(!value)return null;
 const entry=JSON.parse(value);if(entry?.format!=='soundroom-recovery'||!entry.project)throw new Error('Recovery data is unreadable.');return entry;
}
export function writeRecovery(storage,project){
 const prior=storage.getItem(RECOVERY_KEY),body=JSON.stringify(project);
 if(prior){try{if(JSON.stringify(JSON.parse(prior).project)===body)return false}catch{}}
 storage.setItem(RECOVERY_KEY,JSON.stringify({format:'soundroom-recovery',savedAt:new Date().toISOString(),project}));return true;
}
export function retainRecovery(storage){const prior=storage.getItem(RECOVERY_KEY);if(prior)storage.setItem(PREVIOUS_KEY,prior)}
