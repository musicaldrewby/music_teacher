'use strict';
const CONVERSATION_STYLES={friendly:{name:'Friendly',pose:'presenting',expression:'happy'},firm:{name:'Firm',pose:'handsOnHips',expression:'neutral'},defensive:{name:'Defensive',pose:'shrugging',expression:'worried'},excited:{name:'Excited',pose:'cheering',expression:'happy'},shy:{name:'Shy',pose:'thinking',expression:'worried'},thoughtful:{name:'Thoughtful',pose:'thinking',expression:'neutral'}};
function conversationAt(o,t,s){const clip=o.conversation?.clips?.find(c=>t>=c.start&&t<c.start+c.duration);if(!clip)return null;
 const style=CONVERSATION_STYLES[clip.style],saved=windows=>{const cue=windows?.find(w=>t>=w.start&&t<w.start+w.duration);return cue?{cue}:null;},line=talkActiveLine(o,t,s)||saved(clip.speechWindows),partner=s.items.find(p=>p.id===clip.partnerId),other=(partner&&talkActiveLine(partner,t,s))||saved(clip.partnerWindows),speaking=clip.syncSpeech?!!line:true,dt=t-(line?.cue.start??clip.start),edge=performanceEnvelope(clip,t),amount=clip.amount*edge,beat=(Math.sin(dt*2.7)+1)/2,gesture=speaking?performanceSmooth(Math.min(1,dt/.25))*(.3+.7*beat):0;
 const performance={headX:0,headY:0,headAngle:0,eyeX:0,eyeY:0,left:'relaxed',right:'relaxed'};
 if(partner){const dx=partner.x-o.x,dy=partner.y-o.y;performance.eyeX=Math.sign(dx)*3*amount;performance.eyeY=cinemaClamp(dy/80,-1,1)*2*amount;performance.headAngle=Math.sign(dx)*(speaking?1.8:3.5)*amount;}
 if(speaking){performance.headY=Math.sin(dt*4)*1.7*amount;performance.headAngle+=Math.sin(dt*2)*1.8*amount;if(clip.style==='defensive')performance.headX=Math.sin(dt*5)*2*amount;if(['friendly','excited','defensive'].includes(clip.style))performance.right='open';}
 else if(other){const phase=(t-other.cue.start)%3.2;performance.headY=(phase<.9?Math.sin(phase*Math.PI*4)*2.3:0)*amount;}
 return{clip,pose:speaking?style.pose:'standing',expression:speaking?style.expression:(clip.style==='firm'?'neutral':'happy'),amount:gesture*amount,performance};
}
function conversationApplyGeometry(o,k,t){const c=k.a.conversation;if(!c||!c.amount||o.acting?.freeze)return;const target=cinemaPuppetGeometry({...o,acting:{...k.a,pose:c.pose,conversation:null,performance:null,freeze:undefined}},t,true);for(const key of ['left','right','leftBend','rightBend'])k[key]+=(target[key]-k[key])*c.amount;}
function dialogueCameraPlan(s,options={},p=state){
 const a=s.items.find(o=>o.id===options.actorA&&o.type==='puppet'&&!o.hidden),b=s.items.find(o=>o.id===options.actorB&&o.type==='puppet'&&!o.hidden);if(!a||!b||a===b)throw Error('Choose two different visible characters.');
 const pacing=options.pacing||'balanced',minShot={gentle:4,balanced:2.8,lively:1.8}[pacing];if(!minShot)throw Error('Choose a camera pace.');
 const lines=storyLines(s).filter(r=>[a,b].includes(r.actor));if(!lines.length)throw Error('Add saved dialogue for these characters first.');
 const total=sceneSeconds(s,p),intro=Math.min(minShot,total),segments=[{start:0,actor:null,name:'Establish the space',text:'Show both characters and the setting.'}];
 const add=(start,actor,name,text)=>{start=Math.round(start*60)/60;if(start>=total-.2||start-segments.at(-1).start<minShot||segments.length>=95)return;segments.push({start,actor,name,text});};
 for(const row of lines){const start=row.cue.start,end=Math.min(total,start+row.cue.duration),overlap=lines.some(r=>r!==row&&r.actor!==row.actor&&r.cue.start<end&&r.cue.start+r.cue.duration>start),who=overlap?null:row.actor;
  if(end>Math.max(intro,start)+.2&&(who!==segments.at(-1).actor||segments.at(-1).start===0))add(Math.max(intro,start),who,overlap?'Shared exchange':row.actor.name+' speaks',row.line.text);
  const next=lines.find(r=>r.cue.start>=end-.001&&r!==row),gap=(next?.cue.start??total)-end;
  if(options.reactions!==false&&!overlap&&end-start>=minShot*2.2&&segments.at(-1).actor===row.actor)add(end-minShot,row.actor===a?b:a,'Listener reaction',row.line.text);
  else if(options.reactions!==false&&gap>=minShot+.2)add(end,row.actor===a?b:a,'A moment to react','Let the listener respond before the next line.');
 }
 if(total-segments.at(-1).start<Math.min(.7,minShot/2)&&segments.length>1)segments.pop();
 const prior=[directorRenderScene,directorRenderProject];directorRenderScene=s;directorRenderProject=p;
 try{return segments.map((row,i)=>{const end=segments[i+1]?.start??total,ids=row.actor?[row.actor.id]:[a.id,b.id],size=row.actor?(options.closeups===false?'medium':'close'):'full',from=studioFrame(s,ids,size,row.start,end,false),to={...from};if(row.actor){const partner=row.actor===a?b:a,at=cinemaVisualPose(row.actor,row.start,s),pt=cinemaVisualPose(partner,row.start,s);from.x+=Math.sign(pt.x-at.x)*W/(from.zoom*16);Object.assign(from,cameraClamp(from));Object.assign(to,cameraClamp({...from,zoom:Math.min(4,from.zoom*1.035)}));}
 return{id:id(),name:row.name.slice(0,80),duration:end-row.start,from,to,move:!!row.actor,easing:'cinematic',connection:options.transition==='dissolve'&&i?'dissolve':'cut',dissolve:.3,actionNote:row.text.slice(0,500),dialogueNote:row.text.slice(0,500),recipe:'dialogue-aware'};});}finally{[directorRenderScene,directorRenderProject]=prior;}
}

function conversationValidate(o,s){
 if(o.conversation!==undefined){if(o.type!=='puppet'||!o.conversation)throw Error('Conversation acting needs a rigged character.');conversationValidateClips(o.conversation.clips,'conversation',c=>{if(!Object.hasOwn(CONVERSATION_STYLES,c.style)||!Number.isFinite(c.amount)||c.amount<0||c.amount>1||typeof c.syncSpeech!=='boolean')throw Error('Invalid conversation performance.');for(const key of ['speechWindows','partnerWindows'])if(c[key]!==undefined){if(!Array.isArray(c[key])||c[key].length>100||c[key].some(w=>!Number.isFinite(w.start)||w.start<0||!Number.isFinite(w.duration)||w.duration<=0||w.start+w.duration>7200))throw Error('Invalid saved conversation timing.');}if(c.partnerId&&(!s.items.some(p=>p.id===c.partnerId&&p.type==='puppet')||c.partnerId===o.id))throw Error('Choose another character as the conversation partner.');});}
}
function conversationValidateClips(clips,label,check){if(!Array.isArray(clips)||clips.length>100)throw Error('Use up to 100 '+label+' clips.');const sorted=[...clips].sort((a,b)=>a.start-b.start),ids=new Set();for(const [i,c]of sorted.entries()){if(!c||typeof c.id!=='string'||ids.has(c.id)||!Number.isFinite(c.start)||c.start<0||!Number.isFinite(c.duration)||c.duration<.2||c.start+c.duration>7200)throw Error('Invalid '+label+' clip timing.');if(i&&c.start<sorted[i-1].start+sorted[i-1].duration-1e-7)throw Error('Move or shorten overlapping '+label+' clips.');ids.add(c.id);check(c);}}
