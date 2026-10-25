import {createScorePages,scorePDF,printSettings} from './score-pages.js';
import {wavBytes} from './engine.js';import {totalBeats} from './catalog.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeFilename=s=>String(s).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,75)||'music';
export function rehearsalMix(project,omit=[]){return {...structuredClone(project),tracks:project.tracks.map(t=>({...structuredClone(t),solo:false,muted:omit.includes(t.id)}))};}
export function classroomPlan(project,{parts=[],score=true,partPDFs=true,fullAudio=true,accompaniments=false}){
 if(parts.some(id=>!project.tracks.some(t=>t.id===id)))throw Error('Choose existing instrument parts.');
 const tasks=[];if(score)tasks.push({type:'pdf',name:'Scores/Teacher-score.pdf',part:null});
 for(const [i,id]of parts.entries()){const t=project.tracks.find(t=>t.id===id),name=String(i+1).padStart(2,'0')+'-'+safeFilename(t.name);if(partPDFs)tasks.push({type:'pdf',name:'Student-parts/'+name+'.pdf',part:id});if(accompaniments)tasks.push({type:'audio',name:'Practice-audio/Without-'+name+'.wav',omit:[id]});}
 if(fullAudio)tasks.push({type:'audio',name:'Practice-audio/Full-ensemble.wav',omit:[]});
 if(!tasks.length)throw Error('Choose at least one item for your classroom package.');
 const renders=tasks.filter(t=>t.type==='audio').length,estimated=(totalBeats(project)*60/project.bpm+40)*44100*4*renders;
 if(estimated>250*1024*1024)throw Error('This audio package is large. Select fewer accompaniment tracks, export one section, or make a scores-only package.');
 return tasks;
}
export function showClassroomDialog({project,modal,download,audio}){
 modal('Classroom package',`<div class="classroom-options"><p><strong>${esc(project.title)}</strong> · ${project.bars} measures. Create one ZIP for your ensemble.</p><fieldset><legend>Include</legend><label><input type="checkbox" id="pack-score" checked>Teacher score PDF</label><label><input type="checkbox" id="pack-parts" checked>Selected student part PDFs</label><label><input type="checkbox" id="pack-audio" checked>Full ensemble WAV</label><label><input type="checkbox" id="pack-accompaniment">A practice WAV without each selected part</label></fieldset><fieldset><legend>Student parts</legend><div class="pack-part-grid">${project.tracks.map(t=>`<label><input type="checkbox" data-pack-part="${t.id}" checked>${esc(t.name)}</label>`).join('')}</div><button class="quiet" id="pack-all">Select all</button><button class="quiet" id="pack-none">Deselect all</button></fieldset><p>PDFs use your saved print settings. Student parts retain rests. Audio includes all instruments at their mixer levels, with effects and expression; temporary Mute and Solo choices are ignored. Each accompaniment leaves out just its named part.</p><progress id="pack-progress" value="0" max="1" hidden></progress><p id="pack-status" role="status" aria-live="polite"></p><div class="dialog-actions"><button class="outline" id="pack-cancel" hidden>Cancel</button><button class="brass" id="pack-create">Create & download ZIP</button></div></div>`);
 const root=document.querySelector('.classroom-options'),$=s=>root.querySelector(s);let cancelled=false,running=false;
 const options=()=>({parts:[...root.querySelectorAll('[data-pack-part]:checked')].map(e=>e.dataset.packPart),score:$('#pack-score').checked,partPDFs:$('#pack-parts').checked,fullAudio:$('#pack-audio').checked,accompaniments:$('#pack-accompaniment').checked});
 const preview=()=>{if(running)return;try{const tasks=classroomPlan(project,options());const pdfs=tasks.filter(t=>t.type==='pdf').length,audios=tasks.filter(t=>t.type==='audio').length;$('#pack-status').textContent=pdfs+' PDF'+(pdfs===1?'':'s')+' · '+audios+' audio file'+(audios===1?'':'s')+'.';$('#pack-create').disabled=false;}catch(e){$('#pack-status').textContent=e.message;$('#pack-create').disabled=true;}};
 $('#pack-all').onclick=()=>{root.querySelectorAll('[data-pack-part]').forEach(e=>e.checked=true);preview();};$('#pack-none').onclick=()=>{root.querySelectorAll('[data-pack-part]').forEach(e=>e.checked=false);preview();};root.querySelectorAll('input').forEach(e=>e.onchange=preview);
 $('#pack-cancel').onclick=()=>{cancelled=true;$('#pack-status').textContent='Cancelling after the current file…';};
 const dialog=document.querySelector('#modal'),onClose=()=>{cancelled=true;dialog.removeEventListener('close',onClose);};dialog.addEventListener('close',onClose);
 $('#pack-create').onclick=async()=>{if(running)return;let tasks;try{tasks=classroomPlan(project,options());}catch(e){$('#pack-status').textContent=e.message;return;}running=true;cancelled=false;root.querySelectorAll('input,button').forEach(e=>e.disabled=true);$('#pack-cancel').disabled=false;$('#pack-cancel').hidden=false;$('#pack-progress').hidden=false;
 try{
  const {zipSync,strToU8}=await import('./vendor/document-tools.js'),files={};const warnings=new Set();
  for(const [index,task]of tasks.entries()){
   if(cancelled)return;$('#pack-status').textContent=`Preparing ${index+1} of ${tasks.length}: ${task.name.split('/').at(-1)}`;await new Promise(resolve=>setTimeout(resolve,0));
   if(task.type==='pdf'){const layout=createScorePages(project,{part:task.part,settings:printSettings(project)});layout.warnings.forEach(w=>warnings.add(w));const pdf=await scorePDF(layout);files[task.name]=new Uint8Array(await pdf.arrayBuffer());}
   else{const buffer=await audio.render(rehearsalMix(project,task.omit));files[task.name]=new Uint8Array(wavBytes(buffer));}
   $('#pack-progress').value=(index+1)/tasks.length;
  }
  if(cancelled)return;
  files['START-HERE.txt']=strToU8(`${project.title}\n${project.composer?'Composer: '+project.composer+'\n':''}Created with Mallet & Measure\n\nOpen the PDFs to print the teacher score and student parts. Print at actual size.\nFull-ensemble.wav contains all instruments. Each Without file omits only its named instrument. All audio begins at the same musical position, with natural instrument tails. Tempo: ${project.bpm} BPM; meter: ${project.meter}.\n\n${[...warnings].join('\n')}`);
  $('#pack-status').textContent='Packing your classroom ZIP…';await new Promise(resolve=>setTimeout(resolve,0));if(cancelled)return;
  download(new Blob([zipSync(files,{level:0})],{type:'application/zip'}),safeFilename(project.title)+'-Classroom-Package.zip');$('#pack-status').textContent='Classroom package downloaded.'+(warnings.size?' Check START-HERE.txt for print layout suggestions.':'');
 }catch(e){$('#pack-status').textContent='Package could not be completed: '+e.message;}
 finally{running=false;root.querySelectorAll('input,button').forEach(e=>e.disabled=false);$('#pack-cancel').hidden=true;if(cancelled)$('#pack-status').textContent='Export cancelled. Your composition is unchanged.';}
 };
 preview();
}
