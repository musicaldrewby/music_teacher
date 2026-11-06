// Visual note gates use the audible song (with discovery/mixer rules applied).
// Key lights represent note lengths; track meters separately include release tails.
export function playingPitches(song,index,position,secondsPerStep){
 const pitches=new Set(),track=song?.tracks[index];
 if(!track||!Number.isFinite(position)||position<0||!track.instrument||track.mute||track.volume<=0||song.tracks.some(t=>t.solo)&&!track.solo)return pitches;
 const end=song.bars*16;
 for(const n of track.notes){
  const duration=track.instrument==='drums'?Math.min(n.d,.16/secondsPerStep):n.d;
  if(n.v>0&&position>=n.s&&position<Math.min(end,n.s+duration))pitches.add(n.p);
 }
 return pitches;
}

// Ten pixel segments across a useful -48 dB to 0 dB display range.
export function meterLevel(peak){return peak>0?Math.max(0,Math.min(10,(20*Math.log10(peak)+48)/4.8)):0;}
