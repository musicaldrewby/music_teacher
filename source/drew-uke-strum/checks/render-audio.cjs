// Actual sample decoding and Web Audio rendering, without a browser or device.
// NODE_PATH must contain node-web-audio-api@1.0.7.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {OfflineAudioContext}=require('node-web-audio-api');
const root=path.resolve(__dirname,'..'),bank=JSON.parse(fs.readFileSync(path.join(root,'dist/assets/audio/classroom-band.json')));
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{value:id==='volume'?'65':'',textContent:'',hidden:false});return elements.get(id);};
const c={console,URL,URLSearchParams,Map,Set,Math,JSON,Float32Array,Uint8Array,AbortController,location:new URL('https://test.example/'),document:{getElementById:el},setTimeout(){return 1},clearTimeout(){},performance:{now:()=>0},EMBEDDED_SOUNDBANK:bank,atob:x=>Buffer.from(x,'base64').toString('binary')};c.window=c;vm.createContext(c);
const run=s=>vm.runInContext(s,c);
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');run(app.slice(0,app.indexOf("$('chordPalette').innerHTML=")));
for(const name of ['arrangements.js','classroom.js','soundfont.js'])run(fs.readFileSync(path.join(root,'dist',name),'utf8'));
(async()=>{
 // Decode once using the real MP3 decoder, then reuse the AudioBuffers across contexts.
 c.testContext=new OfflineAudioContext(2,32000,32000);run('ctx=testContext;');await run('loadSampledSounds()');assert.equal(run('soundState'),'ready');
 const decoded=run('[...sampledInstruments.values()].flat()');
 assert.equal(decoded.length,130);for(const take of decoded){const d=take.buffer.getChannelData(0);let peak=0;for(const x of d){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));}assert(peak>.002&&peak<1,take.instrument+' '+take.note+' '+peak);assert(take.offset<.06);}
 const results=[];
 for(let i=0;i<run('STARTERS.length');i++){
  run(`song=normalizeSong(STARTERS[${i}]);activeRange=null;`);const seconds=run('totalSteps()*duration()'),count=run('countInSteps()*duration()'),length=Math.ceil((seconds+count+1)*32000);c.testContext=new OfflineAudioContext(2,length,32000);
  run('ctx=testContext;master=ctx.createGain();master.gain.value=.8;master.connect(ctx.destination);makeGate();');
  // The production scheduler uses exactly these events at AudioContext times.
  run(`for(let step=-countInSteps();step<totalSteps();step++){const time=.05+(step+countInSteps())*duration();if(step<0){const elapsed=step+countInSteps();if(elapsed%countStepSize()===0)click(time,song.meter==='6/8'?elapsed%3===0:elapsed===0);continue;}scheduleSongStep(step,time);}gate.gain.setValueAtTime(1,.05+(countInSteps()+totalSteps())*duration());gate.gain.linearRampToValueAtTime(0,.075+(countInSteps()+totalSteps())*duration());`);
  const rendered=await c.testContext.startRendering(),data=rendered.getChannelData(0);let peak=0,energy=0;for(const v of data){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}
  const rms=Math.sqrt(energy/data.length);assert(peak<.98&&rms>.002,`Bad audio: ${i} peak ${peak} rms ${rms}`);
  let tail=0;for(let n=Math.ceil((count+seconds+.3)*32000);n<data.length;n++)tail=Math.max(tail,Math.abs(data[n]));assert(tail<.00001,'Cutoff did not silence '+i);
  results.push({title:run('song.title'),seconds:Math.round(seconds*100)/100,countInSeconds:Math.round(count*100)/100,peak:+peak.toFixed(4),rms:+rms.toFixed(4),silentAfterCutoff:true});console.log(results.at(-1));
 }
 fs.writeFileSync(path.join(root,'checks/audio-results.json'),JSON.stringify({method:'Actual MP3 decode and OfflineAudioContext rendering using node-web-audio-api 1.0.7; no listening or browser test',decodedSamples:decoded.length,songs:results},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
