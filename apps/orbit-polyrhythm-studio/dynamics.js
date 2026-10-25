// Beat-synchronous strike dynamics. Zero depth preserves the original velocities exactly.
export function noteVelocity(track, hit, beat, index=0) {
 const base=hit===2?115:87, depth=(track.swell||0)/100;
 if(!depth)return base;
 const bars=track.swellBars||4;
 // Independent phases let parts trade prominence; the lead begins softly.
 const wave=.5-.5*Math.cos(2*Math.PI*beat/(bars*4)+index*.9);
 return Math.max(1,Math.min(127,Math.round(base*(1-depth*.78*(1-wave)))));
}
