// Staging edition 3. Physical size ratios are shared across ensemble shots.
const fs=require('fs'),path=require('path'),{Image,createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../story-source/sleepy-hollow');
module.exports=async function fix(target){
 const p=JSON.parse(fs.readFileSync(target)),meta=JSON.parse(fs.readFileSync(root+'/asset-metadata.json'));let seq=0;
 const id=()=>`sleepy-continuity-${++seq}`,aid=k=>'import-sleepy-'+k;
 const find=c=>p.scenes.find(s=>s.id==='sleepy-'+c),who=o=>o.illustration?.poses[0]?.asset.replace('import-sleepy-','').replace(/-stand$/,'');
 const duration=s=>{const i=p.scenes.indexOf(s),t=p.phraseShow.timing;return (t.starts[i+1]??t.end)-t.starts[i]};
 const cam=(x=800,y=450,zoom=1)=>({x,y,zoom});
 function cuts(s,rows){s.cinema.shots=rows.map(([time,view,name],i)=>({id:id(),name,duration:(rows[i+1]?.[0]??duration(s))-time,from:view,to:view,move:false,easing:'cinematic',connection:'cut',path:{holdStart:0,holdEnd:0,bend:0}}));s.camera=rows[0][1];s.phrase.holdAt=duration(s);s.duration=Math.max(s.duration,duration(s));}
 const size={ichabod:640,brom:704,katrina:576},ground=815;
 const layout={
  '01B':{brom:830},'02A':{brom:950,katrina:550},'05A':{ichabod:700,brom:1100},
  '07A':{brom:800,katrina:1190},'10B':{brom:1160,ichabod:490,katrina:800},
  '11A':{ichabod:500,brom:850,katrina:1220},'11B':{ichabod:760,brom:1180},
  '23A':{brom:610,katrina:1080},'23B':{brom:610,katrina:1080},'24A':{brom:650,katrina:1100}
 };
 for(const [code,positions]of Object.entries(layout)){
  const s=find(code);s.items=s.items.filter(o=>o.name!=='Contact shadow');
  for(const o of s.items){const character=who(o);if(!(character in positions))continue;
   const h=code==='10B'&&character==='brom'?620:size[character];
   o.x=positions[character];o.h=h;o.w=h*o.bw/o.bh;o.y=ground-h*(508/520-.5);delete o.keyframes;
   o.characterScale={character,standingHeight:size[character],groundPlane:ground,posture:code==='10B'&&character==='brom'?'seated':'standing'};
  }
  s.director.notes+='\nCONTINUITY: Brom uses the shared broad adult scale (110% of Ichabod; Katrina 90%). Ensemble actors share one floor plane; close-ups change camera, never body ratios.';
 }
 cuts(find('02A'),[[0,cam(),'Brom and his listeners'],[6,cam(950,340,1.5),'Brom describes the rider'],[11,cam(550,360,1.5),'Katrina listens']]);
 cuts(find('05A'),[[0,cam(),'Company by the hearth'],[5.8,cam(700,340,1.5),'Ichabod listens']]);
 cuts(find('07A'),[[0,cam(),'Brom and Katrina'],[8,cam(800,330,1.5),'A big confident rival'],[16,cam(1030,360,1.25),'He loves an audience']]);
 cuts(find('10B'),[[0,cam(1160,430,1.55),'Brom watches from his chair'],[6.7,cam(),'The dancers and their rival']]);
 cuts(find('11A'),[[0,cam(),'Guests listen together'],[5,cam(850,330,1.5),'Brom tells his tale'],[13,cam(500,350,1.6),'Ichabod believes him'],[17,cam(),'The whole gathering']]);
 cuts(find('11B'),[[0,cam(760,350,1.6),'Remember the bridge'],[6.7,cam(),'Safe inside together']]);
 cuts(find('23A'),[[0,cam(840,420,1.15),'Two views of the mystery']]);
 cuts(find('23B'),[[0,cam(),'Neighbors hear the news'],[8,cam(610,330,1.5),'A new life elsewhere'],[15,cam(1080,360,1.5),'The neighbors wonder']]);
 cuts(find('24A'),[[0,cam(),'Brom and Katrina'],[5,cam(650,330,1.55),'A knowing look'],[11.9,cam(650,330,1.65),'His laugh at the pumpkin']]);
 for(const key of ['dining-feast','dining-empty','dining-dream']){
  const a=new Image();a.src='data:image/png;base64,'+fs.readFileSync(root+'/art-source/'+key+'.png').toString('base64');await a.decode();
  const c=createCanvas(1600,900);c.getContext('2d').drawImage(a,0,0,1600,900);const b=c.toBuffer('image/webp',80);fs.writeFileSync(root+'/art/'+key+'.webp',b);p.imports[aid(key)]='data:image/webp;base64,'+b.toString('base64');meta[key]=[1600,900];
 }
 const backdrop=key=>({id:id(),type:'asset',asset:aid(key),name:'Complete seated composition · '+key,x:800,y:450,w:1600,h:900,bw:1600,bh:900,rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle',depthContact:'ground',locked:true});
 const visible=(o,time)=>{const b={x:o.x,y:o.y,w:o.w,h:o.h,rotation:0,opacity:0};o.keyframes=[{t:0,ease:'linear',pose:b},{t:time-.001,ease:'linear',pose:b},{t:time,ease:'linear',pose:{...b,opacity:1}}];};
 let s=find('04B');s.items=[backdrop('dining-empty')];cuts(s,[[0,cam(),'His supper is finished'],[5.8,cam(800,465,1.1),'The empty plate belongs to Ichabod']]);delete s.cinema.grade;
 s=find('06B');s.items=[backdrop('dining-dream')];cuts(s,[[0,cam(),'A shared table in his daydream'],[6,cam(800,480,1.08),'Plenty of pie']]);s.cinema.grade={preset:'dream',strength:.22};
 s=find('09A');s.items=[s.items[0],backdrop('dining-feast')];visible(s.items[1],3.236);cuts(s,[[0,cam(),'Welcoming windows'],[3.236,cam(),'Inside: supper is served']]);
 s=find('09B');s.items=[backdrop('dining-feast')];cuts(s,[[0,cam(),'Ichabod enjoys his supper'],[5,cam(800,570,1.15),'A plate full of food'],[9,cam(800,400,1.15),'A comfortable life'],[13,cam(),'A cheerful shared meal']]);
 for(const code of ['04B','06B','09A','09B'])find(code).director.notes+='\nDINING CONTINUITY: complete seated artwork, one coherent table and character perspective; no foreground crop or floating torsos. Empty plate occurs only after supper; dream features pie; feast plates are full.';
 const used=new Set(p.scenes.flatMap(s=>s.items.flatMap(o=>[o.asset,...(o.illustration?.poses||[]).map(q=>q.asset)])));for(const k of Object.keys(p.imports))if(!used.has(k))delete p.imports[k];
 p.sleepyStagingEdition=3;p.filmBrief.notes+=' Staging edition 3: consistent Brom/Ichabod/Katrina scale, shared ensemble floor plane and complete seated supper/daydream/empty-plate compositions.';
 fs.writeFileSync(root+'/asset-metadata.json',JSON.stringify(meta,null,2));fs.writeFileSync(target,JSON.stringify(p));console.log('Scale and dining corrected; '+fs.statSync(target).size+' bytes.');
};
if(require.main===module)module.exports(process.argv[2]||'public/examples/sleepy-hollow.felt.json').catch(e=>{console.error(e);process.exitCode=1});
