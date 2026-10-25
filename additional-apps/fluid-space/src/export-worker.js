import {renderWave} from './export-render.js';
import {createExportPlan} from './export-plan.js';
self.onmessage=async({data:{project,catalog,options,baseUrl}})=>{
 try{
  createExportPlan(project,options);
  self.postMessage({type:'progress',stage:'Loading sound library',value:0});
  const bytes=new Uint8Array(catalog.bytes);let offset=0;
  for(const part of catalog.chunks){
   const response=await fetch(new URL(part.url,baseUrl),{cache:'force-cache'});
   if(!response.ok)throw Error('The sound library could not download. Please retry.');
   const reader=response.body.getReader();let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;if(size+value.length>part.bytes)throw Error('A sound-library download had an unexpected size.');bytes.set(value,offset);offset+=value.length;size+=value.length;self.postMessage({type:'progress',stage:'Loading sound library',value:offset/catalog.bytes})}
   if(size!==part.bytes)throw Error('A sound-library download was incomplete. Please retry.');
  }
  if(offset!==catalog.bytes)throw Error('The sound library is incomplete. Please retry.');
  self.postMessage({type:'progress',stage:'Preparing export',value:0});
  const plan=await renderWave(project,bytes.buffer,options,buffer=>self.postMessage({type:'chunk',buffer},[buffer]),value=>self.postMessage({type:'progress',stage:'Rendering audio',value}));
  self.postMessage({type:'done',bytes:plan.bytes});
 }catch(error){self.postMessage({type:'error',message:error.message||String(error)})}
};
