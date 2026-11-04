import {SoundFontRack} from './soundfont-rack.js';
self.onmessage=({data:{bytes,song,rate}})=>{try{
 const rack=new SoundFontRack(bytes,rate);rack.configure(song.tracks);
 const sec=60/song.bpm/4,steps=song.bars*16,frames=Math.ceil((steps*sec+(song.delay>0?10:4))*rate);
 for(let i=0;i<song.tracks.length;i++)for(const n of song.tracks[i].notes)if(n.s<steps)rack.note({track:i,pitch:n.p,velocity:n.v,frame:Math.round((.03+n.s*sec)*rate),duration:Math.min(n.d,steps-n.s)*sec});
 const left=new Float32Array(frames),right=new Float32Array(frames),a=new Float32Array(128),b=new Float32Array(128);
 for(let frame=0;frame<frames;frame+=128){a.fill(0);b.fill(0);const size=Math.min(128,frames-frame);rack.render(a,b,frame,size);left.set(a.subarray(0,size),frame);right.set(b.subarray(0,size),frame);}
 self.postMessage({left,right,rate},[left.buffer,right.buffer]);
}catch(error){self.postMessage({error:error.message});}};
