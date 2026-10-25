// Build-time only. NODE_PATH must contain js-synthesizer@1.13.0; ffmpeg is required.
// Usage: node scripts/render-soundbank.cjs /path/to/GeneralUser.sf2
// Render the selected SoundFont presets through FluidSynth, preserving their
// envelopes, tuning, loops and velocity response. No synth library ships to clients.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const fluid=require('js-synthesizer/libfluidsynth'),JSSynth=require('js-synthesizer');
JSSynth.Synthesizer.initializeWithFluidSynthModule(fluid);
const source=process.argv[2];if(!source)throw Error('Supply the original GeneralUser GS 1.471 SF2.');
const bytes=fs.readFileSync(source),rate=32000,out=path.resolve(__dirname,'../dist/assets/audio');
const seq=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const specs=[
 {id:'uke',name:'Ukulele',bank:8,program:24,notes:seq(60,77),velocities:[56,88,118],hold:2.3,tail:.3},
 {id:'bass',name:'Acoustic Bass',bank:0,program:32,notes:seq(36,54),velocities:[100],hold:1.4,tail:.2},
 {id:'marimba',name:'Marimba',bank:0,program:12,notes:seq(60,83),velocities:[100],hold:1.5,tail:.35},
 {id:'bells',name:'Glockenspiel',bank:0,program:9,notes:seq(72,95),velocities:[100],hold:2.2,tail:.4},
 {id:'kick',name:'Standard kit kick',bank:128,program:0,notes:[36],velocities:[100],hold:.35,tail:.3},
 {id:'snare',name:'Standard kit snare',bank:128,program:0,notes:[38],velocities:[100],hold:.3,tail:.35},
 {id:'stick',name:'Side stick',bank:128,program:0,notes:[37],velocities:[100],hold:.25,tail:.2},
 {id:'clap',name:'Hand clap',bank:128,program:0,notes:[39],velocities:[100],hold:.25,tail:.25},
 {id:'hat',name:'Closed hi-hat',bank:128,program:0,notes:[42],velocities:[100],hold:.15,tail:.15},
 {id:'tambourine',name:'Tambourine',bank:128,program:0,notes:[54],velocities:[100],hold:.35,tail:.45},
 {id:'shaker',name:'Shaker',bank:128,program:0,notes:[82],velocities:[100],hold:.25,tail:.2},
 {id:'brush',name:'Brush snare',bank:128,program:40,notes:[38],velocities:[100],hold:.35,tail:.4},
 {id:'chuck',name:'String Slap',bank:2,program:120,notes:[60],velocities:[100],hold:.2,tail:.15}
];
function render(s,n){const channels=[new Float32Array(n),new Float32Array(n)];s.render(channels);return Float32Array.from(channels[0],(x,i)=>(x+channels[1][i])*.5);}
function comment(){for(let i=12;i+12<bytes.length;){const n=bytes.readUInt32LE(i+4);if(bytes.toString('ascii',i,i+4)==='LIST'&&bytes.toString('ascii',i+8,i+12)==='INFO'){for(let j=i+12;j<i+8+n;){const z=bytes.readUInt32LE(j+4);if(bytes.toString('ascii',j,j+4)==='ICMT')return bytes.toString('utf8',j+8,j+8+z).replace(/\0+$/,'');j+=8+z+(z%2);}}i+=8+n+(n%2);}throw Error('Missing embedded license');}
function measureEncoderDelay(){
 const impulse=new Float32Array(3200);impulse[0]=.7;
 const encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','f32le','-ar',String(rate),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','64k','-write_xing','0','-f','mp3','pipe:1'],{input:Buffer.from(impulse.buffer)});
 const decoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','mp3','-i','pipe:0','-f','f32le','-ar',String(rate),'-ac','1','pipe:1'],{input:encoded.stdout});
 if(encoded.status||decoded.status)throw Error('Could not calibrate MP3 latency');
 const pcm=new Float32Array(decoded.stdout.buffer.slice(decoded.stdout.byteOffset,decoded.stdout.byteOffset+decoded.stdout.byteLength));let peak=0,index=0;for(let i=0;i<pcm.length;i++)if(Math.abs(pcm[i])>peak){peak=Math.abs(pcm[i]);index=i;}if(index<700||index>1500)throw Error('Unexpected MP3 delay');return index;
}
const encoderDelay=measureEncoderDelay();
(async()=>{
 await JSSynth.waitForReady();const s=new JSSynth.Synthesizer();s.init(rate);s.setGain(.6);s.setReverbOn(false);s.setChorusOn(false);
 const sf=await s.loadSFont(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const bank={version:1,source:'GeneralUser GS 1.471',author:'S. Christian Collins',sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),renderer:'FluidSynth via js-synthesizer 1.13.0',license:comment(),sampleRate:rate,samples:[]};
 const report=[];fs.mkdirSync(out,{recursive:true});
 for(const spec of specs){const takes=[];let peak=0;const ch=spec.bank===128?9:0;
  for(const note of spec.notes)for(const velocity of spec.velocities){s.midiAllSoundsOff();render(s,256);s.midiProgramSelect(ch,sf,spec.bank,spec.program);s.midiControl(ch,7,100);s.midiControl(ch,10,64);s.midiNoteOn(ch,note,velocity);
   const a=render(s,Math.round(rate*spec.hold));s.midiNoteOff(ch,note);const b=render(s,Math.round(rate*spec.tail)),pcm=new Float32Array(a.length+b.length);pcm.set(a);pcm.set(b,a.length);
   let local=0;for(const v of pcm)local=Math.max(local,Math.abs(v));if(local<.0001)throw Error('Silent preset '+spec.id+' '+note);peak=Math.max(peak,local);takes.push({note,velocity,pcm});
  }
  // One gain per instrument keeps relative note and velocity dynamics intact.
  const scale=.64/peak;let totalBytes=0;
  for(const {note,velocity,pcm} of takes){for(let i=0;i<pcm.length;i++)pcm[i]*=scale*Math.min(1,(pcm.length-i)/(rate*.025));
   const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','f32le','-ar',String(rate),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','64k','-write_xing','0','-f','mp3','pipe:1'],{input:Buffer.from(pcm.buffer),maxBuffer:4e6});if(result.status)throw Error(result.stderr.toString());
   // LAME's encoder delay is constant for this encoding configuration. A
   // separate impulse probe avoids confusing a pitched period with latency.
   const offset=encoderDelay;
   bank.samples.push({instrument:spec.id,note,velocity,offset:offset/rate,duration:pcm.length/rate,audio:result.stdout.toString('base64')});totalBytes+=result.stdout.length;
  }
  report.push({instrument:spec.id,bank:spec.bank,program:spec.program,notes:spec.notes.length,velocities:spec.velocities,files:takes.length,mp3Bytes:totalBytes,renderPeak:peak});console.log(spec.id+': '+takes.length+' samples');
 }
 s.close();fs.writeFileSync(path.join(out,'classroom-band.json'),JSON.stringify(bank));fs.writeFileSync(path.join(out,'GeneralUser-LICENSE.txt'),'GeneralUser GS 1.471\nS. Christian Collins\nhttps://www.schristiancollins.com/\n\n'+comment());
 fs.writeFileSync(path.resolve(__dirname,'../checks/soundbank-report.json'),JSON.stringify({sourceSha256:bank.sourceSha256,bytes:fs.statSync(path.join(out,'classroom-band.json')).size,instruments:report},null,2)+'\n');console.log('Bank bytes: '+fs.statSync(path.join(out,'classroom-band.json')).size);
})().catch(e=>{console.error(e);process.exitCode=1});
