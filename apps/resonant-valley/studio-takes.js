import {normalizeSong} from './data.js';
export function phraseRange(song,range){
 const bars=song.bars,start=Math.max(0,Math.min(bars-1,Math.floor((Number(range?.start)||0)/16)))*16;
 const end=Math.max(start+16,Math.min(bars*16,Math.ceil((Number(range?.end)||bars*16)/16)*16));return {start,end};
}
export function repeatPhrase(song,trackIndex,range){
 const {start,end}=phraseRange(song,range),length=end-start,track=song.tracks[trackIndex];
 if(!track||end+length>128)return {error:'There is no room after this phrase. Select fewer bars or an earlier phrase.'};
 const notes=track.notes.filter(n=>n.s<end&&n.s+n.d>start).map(n=>{const at=Math.max(start,n.s);return {...n,s:end+at-start,d:Math.min(end,n.s+n.d)-at};});
 if(!notes.length)return {error:'Add or record a few notes in the selected bars first.'};
 if(track.notes.length+notes.length>4096)return {error:'This track is full. Make another record for the next section.'};
 const next=structuredClone(song);next.bars=[1,2,4,8].find(b=>b*16>=Math.max(song.bars*16,end+length));next.tracks[trackIndex].notes.push(...notes);
 return {song:next,range:{start:end,end:end+length},count:notes.length};
}
export function restoreTake(raw,song){
 if(!raw||raw.version!==1||!Number.isInteger(raw.track)||raw.track<0||raw.track>=song.tracks.length)return null;
 try{const before=normalizeSong(raw.before);if(before.id!==song.id||before.tracks.length!==song.tracks.length)return null;return {version:1,before,track:raw.track,range:phraseRange(song,raw.range)};}catch{return null;}
}
