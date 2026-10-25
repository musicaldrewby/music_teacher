export const RECORDING_STORAGE='mallet-measure-free-recording-v1';
export const RECORDING_DEFAULTS=Object.freeze({grid:.5,duration:.5,countIn:true,metroVolume:.5});
export function recordingPreferences(value){
 const v=value&&typeof value==='object'?value:{};
 return {
  grid:[1,.5,.25].includes(v.grid)?v.grid:.5,
  duration:[4,3,2,1.5,1,.75,.5,.25].includes(v.duration)?v.duration:.5,
  countIn:typeof v.countIn==='boolean'?v.countIn:true,
  metroVolume:Number.isFinite(v.metroVolume)&&v.metroVolume>=0&&v.metroVolume<=1?v.metroVolume:.5
 };
}
export function loadRecordingPreferences(storage){
 try{return recordingPreferences(JSON.parse(storage.getItem(RECORDING_STORAGE)));}catch{return {...RECORDING_DEFAULTS};}
}
export function storeRecordingPreferences(storage,value){storage.setItem(RECORDING_STORAGE,JSON.stringify(recordingPreferences(value)));}
