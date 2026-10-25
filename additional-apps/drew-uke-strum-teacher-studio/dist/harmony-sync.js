'use strict';
// The Pro song has one chord arrangement. Both editing surfaces commit to it.
const harmonyBaseNormalize=normalizeSong;
normalizeSong=function(raw){return UkeHarmony.load(harmonyBaseNormalize(raw),raw,CHORD_FINGERINGS,STRUM_PATTERNS);};
const harmonyBaseMutate=mutate;
mutate=function(fn,redraw=true){
 const before=clone(song),history=undoStack.slice();
 try{return harmonyBaseMutate(()=>{fn();UkeHarmony.fromArrangement(song);melodyRedo=[];melodyUndo=[];},redraw);}
 catch(e){song=before;undoStack=history;$('undoBtn').disabled=!undoStack.length;renderAll();toast(e.message);}
};
