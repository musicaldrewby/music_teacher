export const SIMPLE_ENVELOPES={
 Pluck:{attack:.005,decay:.20,sustain:.08,release:.14},
 Hold:{attack:.02,decay:.12,sustain:.85,release:.25},
 Swell:{attack:1,decay:.5,sustain:.75,release:2.2}
};
export function waveValue(wave,phase){const x=((phase%1)+1)%1;return wave==='sine'?Math.sin(phase*Math.PI*2):wave==='triangle'?1-4*Math.abs(x-.5):wave==='square'?(x<.5?1:-1):2*x-1;}
function graph(canvas,points){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.fillStyle='#102438';c.fillRect(0,0,w,h);c.strokeStyle='#2e495f';c.lineWidth=1;c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();c.strokeStyle='#8cf4df';c.lineWidth=Math.max(2,w/180);c.lineJoin='round';c.beginPath();for(const [i,[x,y]]of points.entries())i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h);c.stroke();}
export function drawWaveform(canvas,wave){const points=[];for(let i=0;i<=256;i++)points.push([i/256,.5-waveValue(wave,i/128)*.36]);graph(canvas,points);}
export function envelopePoints(p){const total=p.attack+p.decay+1+p.release,k=.92/total;return[[.04,.88],[.04+p.attack*k,.12],[.04+(p.attack+p.decay)*k,.88-p.sustain*.76],[.04+(p.attack+p.decay+1)*k,.88-p.sustain*.76],[.96,.88]];}
export function drawEnvelope(canvas,patch){graph(canvas,envelopePoints(patch));}
