import {renderComposition} from './score-render.js';
self.onmessage=async({data})=>{try{const result=await renderComposition(data.project,data.bank,{onProgress:percent=>self.postMessage({type:'progress',percent})});self.postMessage({type:'done',...result},[result.buffer])}catch(e){self.postMessage({type:'error',message:e.message})}};
