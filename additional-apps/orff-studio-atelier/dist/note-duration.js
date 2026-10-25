import {totalBeats} from './catalog.js';
import {removeRestsInSpan} from './score-entry.js';
const EPS=1e-7;
export function availableNoteLength(project,track,event){
 const next=track.events.filter(n=>n.id!==event.id&&n.beat>event.beat+EPS).reduce((end,n)=>Math.min(end,n.beat),totalBeats(project));
 return Math.max(0,next-event.beat);
}
export function resizeNote(project,track,id,duration,{soundOnly=false}={}){
 const event=track.events.find(n=>n.id===id);
 if(!event)throw Error('Select a note first.');
 if(!Number.isFinite(duration)||duration<(soundOnly ? .03 : .25)-EPS||(!soundOnly&&Math.abs(duration*4-Math.round(duration*4))>EPS))throw Error('Choose a length of at least one sixteenth note.');
 if(event.beat+duration>totalBeats(project)+EPS)throw Error('Add another measure, or choose a shorter length.');
 if(duration>availableNoteLength(project,track,event)+EPS)throw Error('That length reaches the next note. Choose a shorter value or move the next note first.');
 event.duration=duration;
 if(soundOnly)return event;
 event.writtenDuration=duration;
 delete event.writtenDurationAuto;delete event.score;
 if(event.tieBreaks){event.tieBreaks=event.tieBreaks.filter(b=>b<duration-EPS);if(!event.tieBreaks.length)delete event.tieBreaks;}
 removeRestsInSpan(track,event.beat,event.beat+duration);
 return event;
}
