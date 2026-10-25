// Optional settings keep older projects and all factory preset data unchanged.
const clamp=(v,a,b,f)=>Number.isFinite(+v)?Math.max(a,Math.min(b,+v)):f;
export const EVOLUTION_DEFAULT={enabled:false,amount:35,seed:1};
export const GROOVE_DEFAULT={feel:'straight',amount:60,humanize:0,seed:1};
export function sanitizeEvolution(value={}){const v=value||{};return {enabled:!!v.enabled,amount:clamp(v.amount,0,100,35),seed:Math.round(clamp(v.seed,1,2147483646,1))};}
export function sanitizeGroove(value={}){const v=value||{};return {feel:['straight','swing','shuffle','laidback'].includes(v.feel)?v.feel:'straight',amount:clamp(v.amount,0,100,60),humanize:clamp(v.humanize,0,100,0),seed:Math.round(clamp(v.seed,1,2147483646,1))};}
