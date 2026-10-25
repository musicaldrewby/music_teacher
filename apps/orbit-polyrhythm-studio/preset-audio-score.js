import {normalizeShow,makeCue} from './show-score.js';
import {sanitize} from './rhythm.js';
// One continuous cue preserves phase, swells, probability and reverb for the
// full render. The release tail is included in the requested file duration.
export function presetAudioScore(state,minutes=10){
 if(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<1||minutes>60)throw Error('Choose a duration from 1 to 60 minutes.');
 const seconds=Math.round(minutes*60),clean=sanitize(state),tail=3;
 if(!clean.master||!clean.tracks.some(t=>!t.mute&&t.volume>0&&t.probability>0&&(!clean.tracks.some(t=>t.solo)||t.solo)&&(t.phrase?t.phrase.some(p=>p.pattern.some(Boolean)):t.pattern.some(Boolean))))throw Error('Enable an audible track and raise the master volume before rendering.');
 const cue=makeCue(clean,{id:'current-preset',duration:seconds-tail,transition:0});cue.visual.world='Orbit Rings';
 return normalizeShow({type:'orbit-show',version:1,title:`${clean.name} — ${minutes} min`,artist:'Drew Wichman',seed:20261011,tailSeconds:tail,fadeIn:2,fadeOut:6,cues:[cue]});
}
export const presetAudioBytes=(minutes,format='wav')=>format==='mp3'?Math.round(minutes*60)*320000/8:44+Math.round(minutes*60)*48000*4;
