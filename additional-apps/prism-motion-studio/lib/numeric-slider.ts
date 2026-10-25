export function sliderPosition(value:number,min:number,max:number,log=false){
 if(!(max>min))return 0;const v=Math.max(min,Math.min(max,value));return log?Math.log1p(v-min)/Math.log1p(max-min):(v-min)/(max-min);
}
export function sliderNumber(position:number,min:number,max:number,step:number,log=false){
 const p=Math.max(0,Math.min(1,position));if(p===0)return min;if(p===1)return max;
 const raw=min+(log?Math.expm1(p*Math.log1p(max-min)):p*(max-min));
 return Number(Math.max(min,Math.min(max,min+Math.round((raw-min)/step)*step)).toFixed(6));
}
