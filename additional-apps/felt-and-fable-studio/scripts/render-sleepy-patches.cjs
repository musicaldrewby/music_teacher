// Re-render only changed scenes with the production canvas renderer. Static spans
// are reused only when five full-resolution rendered probes are byte-identical.
const fs=require('fs'),path=require('path'),assert=require('assert'),{spawn}=require('child_process'),{once}=require('events'),crypto=require('crypto');
const args=process.argv.slice(2),get=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1]},dir=get('--dir');if(!dir)throw Error('--dir required');
const input=path.resolve('public/examples/sleepy-hollow.felt.json'),before=path.join(dir,'before.felt.json'),mapFile=path.join(dir,'patch-map.json');
function visual(s){const c=JSON.parse(JSON.stringify(s));for(const k of ['id','name','notes','director'])delete c[k];delete c.phrase.direction;for(const o of c.items){delete o.characterScale;delete o.id;delete o.name;if(o.illustration){const used=new Set([o.illustration.defaultPose,...o.illustration.changes.map(x=>x.poseId)]);o.illustration.poses=o.illustration.poses.filter(x=>used.has(x.id));for(const q of o.illustration.changes)delete q.id;}}for(const q of c.cinema?.shots||[]){delete q.id;delete q.name;delete q.notes;}return JSON.stringify(c);}
if(args.includes('--prepare')){
 const old=JSON.parse(fs.readFileSync(before)),p=JSON.parse(fs.readFileSync(input));assert.deepStrictEqual(p.audioAssets,old.audioAssets);assert.deepStrictEqual(p.phraseShow.timing,old.phraseShow.timing);assert.deepStrictEqual(p.scenes.map(s=>s.id),old.scenes.map(s=>s.id));
 let n=0;const rows=[];for(let i=0;i<p.scenes.length;i++)if(visual(old.scenes[i])!==visual(p.scenes[i])){const a=Math.round(p.phraseShow.timing.starts[i]*30),b=Math.round((p.phraseShow.timing.starts[i+1]??p.phraseShow.timing.end)*30);rows.push({id:p.scenes[i].id,index:i,globalStart:a,globalEnd:b,patchStart:n,patchEnd:n+b-a});n+=b-a;}
 fs.writeFileSync(mapFile,JSON.stringify({fps:30,frames:n,total:Math.ceil(p.phraseShow.timing.end*30),rows},null,2));console.log(JSON.stringify({changed:rows.map(x=>x.id),frames:n,seconds:n/30}));process.exit();
}
(async()=>{
 const h=require('./app-harness.cjs');await h.ready;h.context.input=JSON.parse(fs.readFileSync(input));h.run('state=validateProject(input)');await h.run('directorPrepareArtwork(state).then(m=>{for(const [k,v]of m)imageMap.set(k,v)})');
 const m=JSON.parse(fs.readFileSync(mapFile)),worker=Number(get('--worker','0')),workers=Number(get('--workers','2')),first=Math.floor(m.rows.length*worker/workers),last=Math.floor(m.rows.length*(worker+1)/workers),rows=m.rows.slice(first,last),out=path.join(dir,'patch-'+worker+'.mp4');
 const ff=spawn('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});let error;ff.stdin.on('error',e=>error=e);const done=once(ff,'close');h.run('globalThis.c=makeCanvas(1920,1080);globalThis.tl=storyTimeline(state,30)');
 function render(frame){h.context.frame=frame;return Buffer.from(h.run("paintVideoFrame(c.getContext('2d'),state,tl,frame,30);c.getContext('2d').getImageData(0,0,1920,1080).data"));}
 async function write(buf){if(error)throw error;if(!ff.stdin.write(buf))await once(ff.stdin,'drain');}
 let made=0,reused=0;
 for(const row of rows){
  const s=h.run('state.scenes['+row.index+']'),duration=(row.globalEnd-row.globalStart)/30,edges=new Set([0,row.globalEnd-row.globalStart]),edge=t=>{const f=Math.ceil(t*30-1e-7);for(const j of [f-1,f,f+1])if(j>0&&j<row.globalEnd-row.globalStart)edges.add(j);};
  edge(s.phrase.holdAt);let t=0;for(const shot of s.cinema?.shots||[]){edge(t);edge(t+shot.duration);t+=shot.duration;}
  for(const o of s.items){for(const k of o.keyframes||[])edge(k.t);for(const q of o.illustration?.changes||[])for(const dt of [-.3,0,.3])edge(q.time+dt);}
  for(const q of s.cinema?.titles||[]){edge(q.start);edge(q.start+q.duration);}
  const dynamic=!!s.cinema?.look?.weather&&s.cinema.look.weather!=='none'||!!s.cinema?.foregroundReveal||s.items.some(o=>o.choreography?.length||o.motion||o.animation)||h.run('!!state.filmFinish?.grain');
  const list=[...edges].sort((a,b)=>a-b);for(let j=0;j<list.length-1;j++){
   const a=row.globalStart+list[j],b=row.globalStart+list[j+1];let frozen=null;
   if(!dynamic&&b-a>6){const probes=[a,a+Math.floor((b-a)*.23),a+Math.floor((b-a)*.5),a+Math.floor((b-a)*.77),b-1];const bytes=render(a);made++;let equal=true;for(const f of probes.slice(1)){const x=render(f);made++;if(!bytes.equals(x)){equal=false;break;}}if(equal)frozen=bytes;}
   for(let f=a;f<b;f++){const rgba=frozen||render(f);if(frozen)reused++;else made++;await write(rgba);}
  }
  console.log(JSON.stringify({worker,scene:row.id,finished:row.patchEnd,rendered:made,reused}));global.gc?.();
 }
 ff.stdin.end();const [code]=await done;if(code)throw Error('ffmpeg exit '+code);fs.writeFileSync(path.join(dir,'patch-'+worker+'.json'),JSON.stringify({first:rows[0].patchStart,last:rows.at(-1).patchEnd,frames:rows.at(-1).patchEnd-rows[0].patchStart,out}));console.log('DONE '+out);
})().catch(e=>{console.error(e);process.exitCode=1});
