// Serialize jobs: the phonemizer and local model each own mutable working memory.
let classic=null,neural=null,queue=Promise.resolve(),currentId=null;
const progress=(message,value)=>self.postMessage({id:currentId,progress:{message,value}});
async function generate(data){currentId=data.id;try{
 let engine;
 if(data.settings?.engine==='neural'){
  neural??=import('./neural-engine.mjs').then(m=>m.createNeuralEngine({progress})).catch(e=>{neural=null;throw e});engine=await neural;
 }else{classic??=import('./speech-engine.mjs').then(m=>m.createSpeechEngine()).catch(e=>{classic=null;throw e});engine=await classic}
 const result=await engine.synthesize(data.text,data.settings);self.postMessage({id:data.id,...result},[result.samples.buffer]);
 }catch(error){self.postMessage({id:data.id,error:error.message||'Could not generate speech.'})}}
self.onmessage=({data})=>{queue=queue.catch(()=>{}).then(()=>generate(data))};
