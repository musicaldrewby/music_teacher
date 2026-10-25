// Lightweight tempo suggestions, not meter/swing or downbeat detection.
// Onset-envelope autocorrelation follows the general approach described by
// Ellis (2007): https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf
// This implementation uses three energy bands, not his Mel spectral front end.
export function suggestTempo(samples,rate,preferred=120){
 const hop=Math.max(1,Math.round(rate/100)),fps=rate/hop,n=Math.floor(samples.length/hop);if(n<400)return {candidates:[],reason:'Analyze at least four seconds of music.'};
 const env=new Float64Array(n),a=1-Math.exp(-2*Math.PI*180/rate),b=1-Math.exp(-2*Math.PI*1800/rate);let lo=0,mid=0,prior=[0,0,0],energy=0;
 for(let i=0;i<n;i++){const sum=[0,0,0];for(let j=0;j<hop;j++){const x=samples[i*hop+j];lo+=a*(x-lo);mid+=b*(x-mid);sum[0]+=lo*lo;sum[1]+=(mid-lo)**2;sum[2]+=(x-mid)**2;energy+=x*x;}let onset=0;for(let k=0;k<3;k++){const value=Math.log1p(1000*sum[k]/hop);onset+=Math.max(0,value-prior[k]);prior[k]=value;}env[i]=onset;}
 if(energy/samples.length<1e-9)return {candidates:[],reason:'No clear pulse found. Use Tap tempo or enter the tempo.'};
 // Subtract a short local mean so sustained sounds do not dominate the pulse.
 const prefix=new Float64Array(n+1);for(let i=0;i<n;i++)prefix[i+1]=prefix[i]+env[i];for(let i=0;i<n;i++)env[i]=Math.max(0,env[i]-(prefix[Math.min(n,i+16)]-prefix[Math.max(0,i-15)])/(Math.min(n,i+16)-Math.max(0,i-15)));
 const corr=new Float64Array(Math.ceil(fps*2)+2);for(let lag=Math.floor(fps*.2);lag<corr.length;lag++){let xy=0,xx=0,yy=0;for(let i=lag;i<n;i++){const x=env[i],y=env[i-lag];xy+=x*y;xx+=x*x;yy+=y*y;}corr[lag]=xy/Math.sqrt(xx*yy||1);}
 const peaks=[];for(let lag=Math.ceil(fps*.2);lag<=Math.floor(fps*2);lag++){if(corr[lag]<corr[lag-1]||corr[lag]<corr[lag+1]||corr[lag]<.08)continue;const y0=corr[lag-1],y1=corr[lag],y2=corr[lag+1],den=y0-2*y1+y2,delta=den?Math.max(-.5,Math.min(.5,.5*(y0-y2)/den)):0,bpm=60*fps/(lag+delta);if(bpm<30||bpm>300)continue;const priorWeight=.85+.15*Math.exp(-.5*(Math.log2(bpm/preferred)/.8)**2);peaks.push({bpm:Math.round(bpm*10)/10,strength:y1,score:y1*priorWeight});}
 peaks.sort((a,b)=>b.score-a.score);const candidates=[];for(const p of peaks){if(candidates.every(c=>Math.abs(Math.log2(c.bpm/p.bpm))>.065))candidates.push(p);if(candidates.length===3)break;}
 return {candidates,reason:candidates.length?'Suggestions only. Choose the pulse you hear, then set beat 1.':'No clear repeating pulse found. Try Tap tempo.'};
}
