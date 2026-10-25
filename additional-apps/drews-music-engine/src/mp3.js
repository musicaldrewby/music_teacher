import lamejs from './lame-vendor.js';
export function encodeMP3(pcm,onProgress=()=>{}){
  const encoder=new lamejs.Mp3Encoder(2,pcm.sampleRate,192),chunks=[];let total=0;
  for(let pos=0;pos<pcm.left.length;pos+=1152){const n=Math.min(1152,pcm.left.length-pos),l=new Int16Array(n),r=new Int16Array(n);for(let j=0;j<n;j++){l[j]=Math.round(Math.max(-1,Math.min(1,pcm.left[pos+j]))*32767);r[j]=Math.round(Math.max(-1,Math.min(1,pcm.right[pos+j]))*32767);}const b=encoder.encodeBuffer(l,r);if(b.length){const c=new Uint8Array(b);chunks.push(c);total+=c.length;}if(pos%115200===0)onProgress(82+pos/pcm.left.length*17,'Encoding MP3');}
  const end=new Uint8Array(encoder.flush());chunks.push(end);total+=end.length;const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes.buffer;
}
