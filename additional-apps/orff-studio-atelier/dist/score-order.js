// Orff score order: Hepburn, AOSA-approved Hawai‘i Level I (2023), p. 15.
// Percussion sits between alto and bass barred instruments. This is score-only.
export const ORFF_SCORE_ORDER=[
 'sopranino-recorder','soprano-recorder','alto-recorder','tenor-recorder','bass-recorder',
 'soprano-glockenspiel','alto-glockenspiel','soprano-xylophone','soprano-metallophone','alto-xylophone','alto-metallophone',
 'triangle','finger-cymbals','sleigh-bells','wind-chimes','agogo-bells','cowbell',
 'woodblock','claves','castanets','maracas','shakers','cabasa','vibraslap','guiro','slapstick','temple-blocks',
 'hand-drums','tambourine','bongos','tubanos','side-drum','suspended-cymbal','gong',
 'bass-xylophone','bass-metallophone','timpani','bass-bars'
];
const ranks=new Map(ORFF_SCORE_ORDER.map((id,n)=>[id,n]));
export const SCORE_ABBREVIATIONS={
 'sopranino-recorder':'SoR','soprano-recorder':'SR','alto-recorder':'AR','tenor-recorder':'TR','bass-recorder':'BR',
 'soprano-glockenspiel':'SG','alto-glockenspiel':'AG','soprano-xylophone':'SX','soprano-metallophone':'SM',
 'alto-xylophone':'AX','alto-metallophone':'AM','bass-xylophone':'BX','bass-metallophone':'BM','bass-bars':'CBB'
};
export function scoreTracks(project){
 const defaults=project.tracks.slice().sort((a,b)=>(ranks.get(a.instrument)??999)-(ranks.get(b.instrument)??999));
 const custom=Array.isArray(project.notation?.partOrder)?project.notation.partOrder:[];
 const positions=new Map(custom.map((id,n)=>[id,n]));
 return defaults.sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity));
}
export function scorePartLabel(track,instrument,{abbreviate=false}={}){
 const name=track.name||instrument.name;
 // Keep teacher-assigned names and duplicate parts distinguishable.
 const abbreviation=name===instrument.name?SCORE_ABBREVIATIONS[instrument.id]:null;
 return abbreviation?(abbreviate?abbreviation:`${name} (${abbreviation})`):name;
}
