export const tau=Math.PI*2;
export const fract=(n:number)=>n-Math.floor(n);
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(a:number,b:number,n:number)=>{const x=clamp((n-a)/(b-a));return x*x*(3-2*x);};
export function random(seed:number){let a=seed|0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function hash(x:number,y:number,seed=0){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed|0,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
export function noise(x:number,y:number,seed=0,period=0){const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=(n:number)=>period?((n%period)+period)%period:n,h=(a:number,b:number)=>hash(w(a),w(b),seed);return (h(ix,iy)*(1-u)+h(ix+1,iy)*u)*(1-v)+(h(ix,iy+1)*(1-u)+h(ix+1,iy+1)*u)*v;}
export function fbm(x:number,y:number,seed=0,octaves=4,period=0){let sum=0,weight=0,amp=1;for(let i=0;i<octaves;i++){sum+=noise(x,y,seed+i*73,period)*amp;weight+=amp;x*=2;y*=2;period*=2;amp*=.5;}return sum/weight;}
