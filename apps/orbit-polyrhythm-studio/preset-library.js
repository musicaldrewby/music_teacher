import {sanitize} from './rhythm.js';
const KEY='orbit-preset-library-v1',copy=v=>JSON.parse(JSON.stringify(v));
const uid=()=> 'personal-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const cleanName=v=>String(v||'').trim().slice(0,70),cleanCollection=v=>String(v||'').trim().slice(0,40);
export function createPresetLibrary(storage,factory){
 const factoryIds=new Set(factory.map(p=>p.id)),factoryNames=new Set(factory.map(p=>p.state.name.toLowerCase()));
 let data={version:1,presets:[],favorites:[]},warning='';
 function validate(input){
  if(!input||input.version!==1||!Array.isArray(input.presets)||!Array.isArray(input.favorites)||input.presets.length>200)throw Error('Choose an Orbit collection backup with up to 200 personal presets.');
  const ids=new Set(),names=new Set(factoryNames);
  const presets=input.presets.map(p=>{if(!p||!/^personal-[a-z0-9-]{8,80}$/i.test(p.id)||ids.has(p.id))throw Error('This collection contains an invalid or repeated preset ID.');const state=sanitize(p.state);state.name=cleanName(state.name);if(!state.name||names.has(state.name.toLowerCase()))throw Error('Each personal preset needs a unique name.');ids.add(p.id);names.add(state.name.toLowerCase());return {id:p.id,state,collection:cleanCollection(p.collection)};});
  return {version:1,presets,favorites:[...new Set(input.favorites.filter(id=>factoryIds.has(id)||ids.has(id)))].slice(0,400)};
 }
 try{const raw=storage.getItem(KEY);if(raw)data=validate(JSON.parse(raw));}catch{warning='Your collection could not be loaded. Import a backup to recover it; existing saved data has not been overwritten.';}
 function commit(next,recover=false){if(warning&&!recover)throw Error(warning);try{const json=JSON.stringify(next);if(json.length>8e6)throw Error('Collection too large');storage.setItem(KEY,json);}catch{throw Error('Browser storage could not save the collection. Free some site storage or use another browser.');}data=next;warning='';}
 function entries(){return data.presets.map(p=>({...copy(p),category:'My presets',description:`Your arrangement${p.collection?' · '+p.collection:''}. Includes your sound, mix, groove and evolving pattern settings.`,personal:true}));}
 return {
  entries,warning:()=>warning,has:id=>data.favorites.includes(id),export:()=>copy(data),
  toggle(id){if(!factoryIds.has(id)&&!data.presets.some(p=>p.id===id))throw Error('That preset is no longer available.');const next=copy(data);next.favorites=next.favorites.includes(id)?next.favorites.filter(x=>x!==id):[...next.favorites,id];commit(next);},
  save(state,name,collection=''){name=cleanName(name);if(!name)throw Error('Give this preset a name.');if(factoryNames.has(name.toLowerCase())||data.presets.some(p=>p.state.name.toLowerCase()===name.toLowerCase()))throw Error('That name is already in use. Choose a new name for this variation.');if(data.presets.length>=200)throw Error('Your collection holds up to 200 personal presets. Back it up and remove a preset before adding another.');const item={id:uid(),state:sanitize({...state,name}),collection:cleanCollection(collection)};commit({...copy(data),presets:[...data.presets,item]});return copy(item);},
  remove(id){if(!data.presets.some(p=>p.id===id))throw Error('Only personal presets can be removed.');commit({...copy(data),presets:data.presets.filter(p=>p.id!==id),favorites:data.favorites.filter(x=>x!==id)});},
  import(input){const incoming=validate(input),next=copy(data),mapping=new Map(),names=new Set([...factoryNames,...next.presets.map(p=>p.state.name.toLowerCase())]);let added=0;
   for(const p of incoming.presets){const existing=next.presets.find(x=>x.id===p.id);if(existing&&JSON.stringify(existing)===JSON.stringify(p)){mapping.set(p.id,p.id);continue;}const item=copy(p);if(existing)item.id=uid();const original=item.state.name;let n=2;while(names.has(item.state.name.toLowerCase()))item.state.name=original.slice(0,60)+' ('+(n++)+')';names.add(item.state.name.toLowerCase());mapping.set(p.id,item.id);next.presets.push(item);added++;}
   if(next.presets.length>200)throw Error('This import would exceed 200 personal presets. Your existing collection is unchanged.');next.favorites=[...new Set([...next.favorites,...incoming.favorites.map(id=>mapping.get(id)||id)])];commit(next,true);return added;
  }
 };
}
