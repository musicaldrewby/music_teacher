export const TRACK_COLORS=['#63b8e8','#e7b56b','#bc94e4','#69cbb7','#e98e9f','#adc56b','#91a7eb','#d4a181'];
export const trackColor=index=>TRACK_COLORS[index]||TRACK_COLORS[0];
export const soundKey=p=>[p.isGMGSDrum?1:0,p.bankMSB,p.bankLSB,p.program].join(':');

export function createSoundShortcuts(storage){
 const key='soundroom-sound-shortcuts-v1';let favorites=[],recent=[];
 try{const data=JSON.parse(storage?.getItem(key)||'null');if(data){favorites=[...new Set(Array.isArray(data.favorites)?data.favorites.filter(x=>typeof x==='string'):[])].slice(0,512);recent=[...new Set(Array.isArray(data.recent)?data.recent.filter(x=>typeof x==='string'):[])].slice(0,24)}}catch{}
 function save(){try{storage?.setItem(key,JSON.stringify({favorites,recent}))}catch{}}
 return {
  favorite:p=>favorites.includes(soundKey(p)),
  toggle(p){const id=soundKey(p);favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save()},
  used(p){const id=soundKey(p);recent=[id,...recent.filter(x=>x!==id)].slice(0,24);save()},
  list(presets,kind){return kind==='recent'?recent.map(id=>presets.find(p=>soundKey(p)===id)).filter(Boolean):kind==='favorites'?presets.filter(p=>favorites.includes(soundKey(p))):presets},
  get recent(){return [...recent]}
 };
}
