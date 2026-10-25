export const THEMES={
 space:{name:'Space Mission',short:'Space',accent:'#b84c35',word:'Hey!'},
 jungle:{name:'Jungle Jam',short:'Jungle',accent:'#3e7458',word:'Roar!'},
 monsters:{name:'Monster Mash',short:'Monsters',accent:'#78528f',word:'Boo!'},
 ocean:{name:'Ocean Groove',short:'Ocean',accent:'#276e83',word:'Splash!'},
 desert:{name:'Desert Road',short:'Desert',accent:'#ac5934',word:'Howdy!'},
 candy:{name:'Candy Carnival',short:'Candy',accent:'#ae4671',word:'Pop!'},
 disco:{name:'Disco Party',short:'Disco',accent:'#765198',word:'Hey!'},
 garden:{name:'Watercolor Garden',short:'Garden',accent:'#687953',word:'Bloom!'},
 city:{name:'Paper City',short:'City',accent:'#b45e40',word:'Hey!'},
 mountains:{name:'Mountain Print',short:'Mountains',accent:'#416952',word:'Yo!'},
 woodland:{name:'Woodland Wonder',short:'Woodland',accent:'#677651',word:'Hello!'},
 arcade:{name:'Arcade Pop',short:'Arcade',accent:'#9d498b',word:'Pop!'},
 'pixel-meadow':{name:'8-bit Meadow',short:'8-bit Meadow',accent:'#30784d',word:'Hey!',pixelated:true},
 'pixel-cosmos':{name:'8-bit Cosmos',short:'8-bit Cosmos',accent:'#6553a3',word:'Zoom!',pixelated:true},
 'pixel-city':{name:'8-bit Neon City',short:'8-bit City',accent:'#974786',word:'Hey!',pixelated:true},
 'pixel-castle':{name:'8-bit Castle',short:'8-bit Castle',accent:'#5d648e',word:'Hooray!',pixelated:true},
 'clay-garden':{name:'Claymation Garden',short:'Clay Garden',accent:'#687b50',word:'Bloom!'},
 'clay-seaside':{name:'Claymation Seaside',short:'Clay Seaside',accent:'#327d81',word:'Splash!'},
 'clay-moon':{name:'Claymation Moon',short:'Clay Moon',accent:'#78618f',word:'Zoom!'},
 'brick-city':{name:'Brick City',short:'Brick City',accent:'#b06436',word:'Hey!'},
 'brick-space':{name:'Brick Space',short:'Brick Space',accent:'#427c87',word:'Zoom!'}
};


// Selected atlas windows avoid neighboring edge marks while retaining full gestures.
const NEW_ART_WINDOWS=[20,465,915,1330,20,465,895,1330].map((x,i)=>[x/1774,Math.floor(i/4)*.5,443/1774,.5]);
export const ART_STYLES={
 kids:{name:'Storybook kids',short:'Kids',asset:'movements',url:'./assets/art/movements.png'},
 icons:{name:'Bold painted icons',short:'Painted',asset:'icons',padding:.1,url:'./assets/art/movements-icons.png'},
 paper:{name:'Paper cutouts',short:'Paper',asset:'paper',padding:.1,url:'./assets/art/movements-paper.png'},
 watercolor:{name:'Watercolor',short:'Watercolor',asset:'watercolor',frames:NEW_ART_WINDOWS,url:'./assets/art/movements-watercolor.png'},
 comic:{name:'Comic Print',short:'Comic',asset:'comic',frames:NEW_ART_WINDOWS,url:'./assets/art/movements-comic.png'},
 chalk:{name:'Chalk & Pastel',short:'Chalk',asset:'chalk',frames:NEW_ART_WINDOWS.map((r,i)=>i===1?[475/1774,...r.slice(1)]:r),url:'./assets/art/movements-chalk.png'},
 felt:{name:'Stitched Felt',short:'Felt',asset:'felt',url:'./assets/art/movements-felt.png'},
 clay:{name:'Handmade Clay',short:'Clay',asset:'clay',frames:NEW_ART_WINDOWS,url:'./assets/art/movements-clay.png'},
 pixel:{name:'8-bit Pixel',short:'8-bit Pixel',asset:'pixel',url:'./assets/art/movements-pixel.png',pixelated:true},
 claymation:{name:'Claymation Puppets',short:'Claymation',asset:'claymation',frames:NEW_ART_WINDOWS,url:'./assets/art/movements-claymation.png'},
 bricks:{name:'LEGO-style Bricks',short:'Bricks',asset:'bricks',frames:NEW_ART_WINDOWS.map((r,i)=>i===4?[5/1774,.5,475/1774,.5]:i===5?[480/1774,.5,443/1774,.5]:r),url:'./assets/art/movements-bricks.png'}
};
export const ACTIONS={pat:{name:'Pat',detail:'Pat your thighs',color:'#a8d9fa',short:'PAT'},clap:{name:'Clap',detail:'Clap your hands',color:'#f2ce83',short:'CLAP'},stomp:{name:'Stomp',detail:'Stamp one foot',color:'#edaaa1',short:'STOMP'},snap:{name:'Snap',detail:'Snap your fingers',color:'#c9b4ee',short:'SNAP'},say:{name:'Say a word',detail:'Say the word on the beat',color:'#abe5b4',short:'SAY'},tap:{name:'Tap',detail:'Tap your shoulders',color:'#97dad4',short:'TAP'},wave:{name:'Wave',detail:'Wave both hands',color:'#e8b7d6',short:'WAVE'},freeze:{name:'Freeze',detail:'Hold your pose',color:'#d2dbe5',short:'FREEZE'},rest:{name:'Rest',detail:'Listen to the beat',color:'#8c98ac',short:'REST'}};
