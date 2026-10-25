import {suggestTempo} from './tempo-analysis.mjs';
self.onmessage=({data})=>{try{self.postMessage(suggestTempo(data.samples,data.rate,data.preferred));}catch(error){self.postMessage({error:error.message});}};
