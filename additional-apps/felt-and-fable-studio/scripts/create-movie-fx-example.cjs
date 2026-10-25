'use strict';
const fs=require('fs'),path=require('path');const {run,ready,context}=require('./app-harness.cjs');
(async()=>{await ready;
const plan={format:'felt-director-plan',version:1,title:'Light, Focus & a Little Magic',exportFps:60,scenes:[
 {id:'library',name:'A clue in the library',bg:68,bgColor:'#5d5146',duration:6,camera:{x:780,y:450,zoom:1.25},items:[{id:'maya',asset:'cinema-maya',x:580,y:625,w:440,performance:{gaze:{targetId:'letter',amount:.6}}},{id:'stand',type:'shape',shape:'Rounded rectangle',name:'Small display table',x:1020,y:725,w:250,h:65,bw:250,bh:65,color:'#704d33',fiber:.7,rotation:0},{id:'letter',asset:'cinema-manor-sealed-letter',x:1020,y:660,w:150}],cinema:{transition:{kind:'fade',duration:.5}}},
 {id:'stage',name:'A little stage magic',bg:59,bgColor:'#563039',duration:6,items:[{id:'asha',asset:'cinema-asha',x:580,y:640,w:480,acting:{expression:'happy',pose:'pointing',talk:false,blink:true,cues:[]}},{id:'jun',asset:'cinema-jun',x:1060,y:640,w:480,performance:{clips:[{id:'surprise',kind:'react',reaction:'surprised',amount:.65,start:2.5,duration:2.5}]}}],cinema:{transition:{kind:'dissolve',duration:.5}}},
 {id:'beach',name:'A moonlit goodbye',bg:92,bgColor:'#4b7482',duration:6,camera:{x:880,y:500,zoom:1.65},items:[{id:'leo',asset:'cinema-leo',x:880,y:640,w:430,acting:{expression:'happy',pose:'waving',talk:false,blink:true,cues:[]}}],cinema:{transition:{kind:'dissolve',duration:.65},grade:{preset:'moon',strength:.6}}}
]};context.plan=plan;run('globalThis.example=directorImportPlan(plan)');
function add(sceneIndex,kind,preset,fields){context.fxFields=fields;context.fxKind=kind;context.fxPreset=preset;context.fxSceneIndex=sceneIndex;run("{const s=example.scenes[fxSceneIndex];s.cinema??={};s.cinema.clips??=[];s.cinema.clips.push({...movieNewClip(fxKind,fxPreset,0,s),...fxFields,id:'technique-'+fxSceneIndex+'-'+s.cinema.clips.length})}");}
add(0,'camera','push',{duration:6,strength:.25,targetId:'letter',from:{x:780,y:480,zoom:1.25}});
add(0,'light','window',{duration:6,fadeIn:.8,fadeOut:0,strength:.35,x:200,y:80,endX:200,endY:80,angle:35,endAngle:35,radius:1000,spread:45,color:'#d9e6ff'});
add(0,'focus','rack',{start:1.2,duration:2.8,strength:.42,fromTargetId:'maya',targetId:'letter'});
add(0,'particle','dust',{duration:6,fadeOut:.7,strength:.22,x:550,y:400,endX:580,endY:360,radius:330,color:'#f1e1c3'});
add(0,'shadow','ground',{duration:6,fadeIn:0,fadeOut:0,targetId:'maya',strength:.25,radius:170});
add(1,'camera','push',{duration:6,strength:.18,from:{x:800,y:490,zoom:1.1},endX:930,endY:540});
add(1,'light','spot',{duration:6,strength:.62,targetId:'asha',anchor:'center',radius:330,color:'#ffd39c',fadeIn:.7,fadeOut:.6});
add(1,'light','spot',{start:1,duration:5,strength:.55,targetId:'jun',radius:350,color:'#c2d9ff',fadeIn:1.2,fadeOut:.6});
add(1,'particle','sparkle',{start:2.3,duration:2.7,strength:.8,x:850,y:455,endX:850,endY:375,radius:130,color:'#ffe79d'});
add(1,'shadow','ground',{duration:6,fadeIn:0,fadeOut:0,targetId:'asha',strength:.3,radius:180});
add(1,'shadow','ground',{duration:6,fadeIn:0,fadeOut:0,targetId:'jun',strength:.3,radius:180});
add(2,'camera','pull',{duration:6,strength:.5,from:{x:880,y:500,zoom:1.65},endX:800,endY:450});
add(2,'light','night',{duration:6,strength:.32,fadeIn:0,fadeOut:0});
add(2,'particle','dust',{duration:6,strength:.2,x:900,y:380,endX:860,endY:320,radius:450,color:'#cad7ed'});
add(2,'shadow','stretch',{duration:6,fadeIn:0,fadeOut:0,targetId:'leo',strength:.25,radius:140,angle:0,endAngle:-12});
run('validateProject(example)');const final=run('directorExportPlan(example)');const dir=path.resolve(__dirname,'../public/examples');fs.writeFileSync(path.join(dir,'cinematic-techniques.director.json'),JSON.stringify(final,null,2)+'\n');fs.writeFileSync(path.join(dir,'cinematic-techniques.js'),'window.FELT_MOVIE_FX_EXAMPLE='+JSON.stringify(final)+';\n');console.log('Created three-scene cinematic techniques example (18 seconds).');
})().catch(e=>{console.error(e);process.exit(1)});
