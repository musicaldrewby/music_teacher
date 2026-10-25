const fs=require('fs');
const actor=(id,asset,x,other,clips)=>({id,asset,name:asset.replace('cinema-','').replace(/^./,x=>x.toUpperCase()),x,y:495,w:437,h:475,acting:{expression:'happy',pose:'standing',talk:false,blink:true,cues:[]},performance:{gaze:{targetId:other,amount:.8},hands:{left:'relaxed',right:'relaxed'},clips}});
const react=(id,start,reaction,duration=2)=>({id,kind:'react',start,duration,reaction,amount:.75});
function scene(id,left,right,asset,title){return{id,name:title,bg:-1,bgColor:'#e8ddc6',duration:12,caption:'',pieces:[
 {id:id+'-label',type:'text',text:title,name:title,x:800,y:90,w:1200,h:90,bw:1200,bh:90,rotation:0,color:'#285b54',fiber:.6},
 {id:id+'-stand1',type:'shape',shape:'Rounded rectangle',name:'Felt display ledge',x:715,y:602,w:100,h:26,bw:100,bh:26,rotation:0,color:'#9d7053',fiber:.8},
 {id:id+'-stand2',type:'shape',shape:'Rounded rectangle',name:'Felt display ledge',x:805,y:602,w:100,h:26,bw:100,bh:26,rotation:0,color:'#9d7053',fiber:.8},
 actor(id+'-left','cinema-'+left,630,id+'-right',[react(id+'-nod',2.8,'nod',1),react(id+'-laugh',9.8,'laugh',1.5),{id:id+'-hands',kind:'hands',start:0,duration:.6,left:'open',right:'open'}]),
 actor(id+'-right','cinema-'+right,890,id+'-left',[react(id+'-listen',.5,'listen',2.7),react(id+'-surprise',3.3,'surprised',1.1),react(id+'-thanks',7,'nod',1)]),
 {id:id+'-prop',asset,name:asset.includes('letter')?'A letter for you':'The secret key',x:715,y:578,w:68,h:68,propActions:[{id:id+'-pick',kind:'pickup',actorId:id+'-left',hand:'rightHand',start:.7,duration:2},{id:id+'-give',kind:'give',actorId:id+'-right',hand:'leftHand',start:4,duration:2.5},{id:id+'-put',kind:'putdown',x:805,y:578,start:8,duration:2}]},
 {id:id+'-hint',type:'text',text:'Pick up · Give to · Put down',name:'Actions',x:800,y:810,w:1100,h:60,bw:1100,bh:60,rotation:0,color:'#54736b',fiber:.5}
]}}
const plan={format:'felt-director-plan',version:1,title:'A Little Exchange — Character Performance',canvas:{width:1600,height:900,fps:60},scenes:[scene('letter','maya','leo','cinema-manor-sealed-letter','A letter for you'),scene('key','asha','jun','cinema-manor-antique-key','The secret key')]};
fs.writeFileSync('public/examples/character-interactions.director.json',JSON.stringify(plan,null,2)+'\n');fs.writeFileSync('public/examples/character-interactions.js','window.FELT_PERFORMANCE_EXAMPLE='+JSON.stringify(plan)+';\n');
