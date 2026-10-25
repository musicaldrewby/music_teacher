// Portable game data. No video, binary audio or DOM state is stored in a game file.
(function(root){
 'use strict';
 const TYPE='movement-stoplight-game',VERSION=1,BAR=2.4,IDS=['stop','walk','jog','skip','gallop','tiptoe','march','hop','jump','slide'];
 const clone=o=>JSON.parse(JSON.stringify(o));
 function validate(input){
  if(!input||input.type!==TYPE||input.version!==VERSION||input.bpm!==100)throw Error('Choose a Movement Stoplight game file (version 1, 100 BPM).');
  if(!Array.isArray(input.blocks)||!input.blocks.length||input.blocks.length>2000)throw Error('A game needs 1–2,000 movement blocks.');
  let total=0;const blocks=input.blocks.map(b=>{if(!b||!IDS.includes(b.id)||typeof b.duration!=='number'||!Number.isFinite(b.duration)||b.duration<.01||b.duration>3600)throw Error('A movement or its duration is invalid.');total+=b.duration;return{id:b.id,duration:b.duration,...(b.silent===true?{silent:true}:{})};});
  if(total>3600)throw Error('Keep a saved game within 60 minutes.');
  return{type:TYPE,version:VERSION,bpm:100,id:typeof input.id==='string'?input.id.slice(0,100):'',repeats:input.repeats==='forever'?'forever':String([1,2,3,5,10].includes(Number(input.repeats))?Number(input.repeats):1),name:typeof input.name==='string'?input.name.trim().slice(0,100)||'Untitled game':'Untitled game',seed:Number.isInteger(input.seed)?input.seed>>>0:1,selected:[...new Set([...(Array.isArray(input.selected)?input.selected.filter(id=>IDS.includes(id)&&id!=='stop'):[]),...blocks.filter(b=>b.id!=='stop').map(b=>b.id)])],blocks};
 }
 function create(name,selected,seed,blocks){return validate({type:TYPE,version:VERSION,bpm:100,name,selected,seed,blocks});}
 function total(game){return game.blocks.reduce((sum,b)=>sum+b.duration,0);}
 function fromActions(name,selected,seed,actions,end){
  if(!actions.length)throw Error('Choose at least one movement before finishing.');
  const start=actions[0].time,blocks=[];
  for(let i=0;i<actions.length;i++){const duration=Math.max(0,(i+1<actions.length?actions[i+1].time:end)-actions[i].time);if(duration>=.01)blocks.push({id:actions[i].id,duration,...(actions[i].silent?{silent:true}:{})});}
  return create(name,selected,seed,blocks);
 }
 function segments(game,repeats=1){
  game=validate(game);const count=Math.max(1,Math.min(20,Math.floor(Number(repeats)||1)));let start=0;const result=[];
  for(let n=0;n<count;n++)game.blocks.forEach((b,i)=>{result.push({...b,start,...(i===0?{restart:true}:{})});start+=b.duration;});return result;
 }
 root.MovementSequence={TYPE,VERSION,BAR,IDS,clone,validate,create,total,fromActions,segments};
 if(typeof module!=='undefined')module.exports=root.MovementSequence;
})(typeof window==='undefined'?globalThis:window);
