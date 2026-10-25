// Exact integration of step tempos and linear BPM ramps, shared by live/offline clocks.
export class TempoMap {
 constructor(tempo=100,changes=[]){
  const all=[{beat:0,tempo,curve:'step'},...changes].sort((a,b)=>a.beat-b.beat);this.points=[];
  for(const x of all){if(!Number.isFinite(x.beat)||!Number.isFinite(x.tempo)||x.tempo<=0||x.beat<0)throw Error('Invalid tempo map.');const p={beat:x.beat,tempo:x.tempo,curve:x.curve==='linear'?'linear':'step',seconds:0};if(this.points.at(-1)?.beat===x.beat)this.points.pop();this.points.push(p)}
  this.points.forEach((p,i)=>{const next=this.points[i+1];p.slope=p.curve==='linear'&&next?(next.tempo-p.tempo)/(next.beat-p.beat):0;if(next)next.seconds=p.seconds+this.integral(p,next.beat-p.beat)});
 }
 integral(p,beats){return Math.abs(p.slope)<1e-12?beats*60/p.tempo:60/p.slope*Math.log((p.tempo+p.slope*beats)/p.tempo)}
 point(value,key){let low=0,high=this.points.length;while(low+1<high){const mid=(low+high)>>>1;if(this.points[mid][key]<=value)low=mid;else high=mid}return this.points[low]}
 secondsAt(beat){const p=this.point(beat,'beat');return beat<0?beat*60/p.tempo:p.seconds+this.integral(p,beat-p.beat)}
 beatAt(seconds){const p=this.point(seconds,'seconds');return seconds<0?seconds*p.tempo/60:p.beat+(Math.abs(p.slope)<1e-12?(seconds-p.seconds)*p.tempo/60:p.tempo*Math.expm1((seconds-p.seconds)*p.slope/60)/p.slope)}
 tempoAt(beat){const p=this.point(beat,'beat');return p.tempo+p.slope*Math.max(0,beat-p.beat)}
}
export const projectTempoMap=p=>new TempoMap(p.tempo,p.tempoChanges);
