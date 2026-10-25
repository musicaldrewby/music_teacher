import {STRINGS} from './music.js';
import {getPreset} from './presets.js';

// Only the selected sound is downloaded. Keep two decoded instruments in memory.
export class PresetBank{
  constructor(decode,fetcher=url=>fetch(url),limit=2){this.decode=decode;this.fetcher=fetcher;this.limit=limit;this.cache=new Map();this.pending=new Map();}
  async load(id,onProgress=()=>{}){
    if(!getPreset(id))throw new Error('Unknown instrument sound.');
    if(this.cache.has(id)){const buffers=this.cache.get(id);this.cache.delete(id);this.cache.set(id,buffers);onProgress(36,36);return buffers;}
    if(this.pending.has(id))return this.pending.get(id);
    const task=(async()=>{
      const buffers=new Array(STRINGS.length);let cursor=0,done=0;
      const results=await Promise.allSettled(Array.from({length:6},async()=>{
        while(cursor<STRINGS.length){const i=cursor++;
          const response=await this.fetcher(`audio/presets-v1/${id}/${STRINGS[i]}.mp3`);
          if(!response.ok)throw new Error('This sound could not load. Check your connection and try again.');
          buffers[i]=await this.decode(await response.arrayBuffer());onProgress(++done,STRINGS.length);
        }
      }));
      const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
      this.cache.set(id,buffers);
      while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);
      return buffers;
    })();this.pending.set(id,task);
    try{return await task;}finally{this.pending.delete(id);}
  }
}
