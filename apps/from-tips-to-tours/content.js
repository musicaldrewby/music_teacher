export const CHAPTERS = [
 {name:'Bedroom beginnings',short:'BEDROOM',art:0,tag:'EVERY LEGEND STARTS SOMEWHERE',color:'#ffc76a',venues:['Borrowed strings','The bedroom floor','After-school practice','The first recording','Open-window concert','Ready for the sidewalk'],story:'One borrowed guitar. One spectacularly unreasonable dream.'},
 {name:'Sidewalk sessions',short:'STREET',art:1,tag:'SMALL CHANGE. BIG DREAMS.',color:'#ffac77',venues:['The coffee-shop corner','Subway acoustics','Saturday market','The waterfront','Downtown after dark','The city festival'],story:'Someone stops to listen. Then another. Your guitar case finally has company.'},
 {name:'The local circuit',short:'CLUB',art:2,tag:'YOUR NAME ON THE MARQUEE',color:'#f4a2e4',venues:['The Velvet Note','A proper soundcheck','Friday night residency','The rooftop set','Sold out at home','The regional showcase'],story:'A real stage. A real band. A sound engineer who almost remembers your name.'},
 {name:'Life on the road',short:'TOUR',art:2,tag:'ONE MORE TOWN. ONE MORE SHOW.',color:'#a8b6ff',venues:['The borrowed van','Three cities, two beds','College radio favorite','The midnight drive','Festival season','The breakout single'],story:'The van smells like coffee and ambition. Mostly coffee.'},
 {name:'World headliner',short:'ARENA',art:3,tag:'THE WHOLE WORLD IS LISTENING',color:'#ffd06e',venues:['First arena show','The platinum wall','Your hillside home','A studio of your own','The world tour','An impossible radio signal'],story:'You made it. Nice house. Huge crowds. Why is your unplugged amplifier applauding?'},
 {name:'Unidentified fans',short:'ORBIT',art:4,tag:'APPARENTLY YOU ARE HUGE ON NEPTUNE',color:'#82e9ce',venues:['An alien booking agent','The lunar warm-up','Sold out on Saturn','The Neptune residency','First contact festival','A bus with a warp drive'],story:'The contract is in seventeen languages. One of them is a color.'},
 {name:'Galactic superstar',short:'GALAXY',art:4,tag:'TURN IT UP TO LIGHT SPEED',color:'#a1c8ff',venues:['The asteroid circuit','The solar stadium','A planetary choir','Event horizon encore','The Dyson-sphere tour','A chord outside of time'],story:'Your bass can bend light. The drummer still wants more of it in the monitor.'},
 {name:'Beyond the last note',short:'BEYOND',art:5,tag:'REALITY NEEDS A BETTER MIX',color:'#daa7ff',venues:['An audience of alternate yous','The sideways dimension','Yesterday’s sold-out show','The universal mixer','The first guitar returns','The infinite encore'],story:'Scientists date your first guitar. It is older than this universe. That explains the tuning.'}
];

const names=[
 ['Practice routine','A little discipline keeps the music moving.','lesson'],['Demo tapes','Your first recordings find their first listeners.','tape'],['Weekend sessions','Jules brings a borrowed drum kit. Adds drums to Live Jam.','guitar'],
 ['Street sets','The guitar case fills even while you take a break.','case'],['Coffee-shop gigs','A regular spot and a slightly less wobbly stool.','coffee'],['Homemade merch','They came for a song. They left with a T-shirt.','shirt'],
 ['Resident band','Good musicians turn a tune into a living thing.','drums'],['Club bookings','The calendar starts filling itself.','ticket'],['Independent releases','A little back catalog with a long future.','record'],
 ['Regional tours','Four musicians, one van, unlimited sandwiches.','van'],['Road crew','Someone else finally carries the heavy stuff.','case'],['Radio rotation','That is your song coming out of the dashboard.','radio'],
 ['Arena shows','The crowd sings the chorus back to you.','lights'],['Platinum catalog','Old recordings become very good investments.','record'],['Private studio','A room full of gear you once only dreamed about.','mixer'],
 ['Lunar residencies','One small gig for you. Very large speakers.','moon'],['Alien promoters','All three of their hands are shaking yours.','alien'],['Warp-drive tours','The van has evolved. The smell has not.','rocket'],
 ['Planetary choirs','Everyone on the planet gets a microphone.','planet'],['Solar stadiums','The lighting bill is one small star.','sun'],['Black-hole royalties','An income stream with an event horizon.','portal'],
 ['Alternate-self bands','You finally found musicians who agree with you. Mostly.','alien'],['Quantum recordings','Every take was the perfect take. Somewhere.','keys'],['Universe synthesizers','A new reality, in the key of you.','portal']
];

export const PRODUCERS=names.map(([name,description,icon],i)=>({id:`p${i}`,name,description,icon,unlock:Math.floor(i/3)*6+(i%3)*2,cost:15*16**i,rate:(15*16**i)/(i<3?150*1.6**i:300*(i+1)**3),fans:.0015*1.35**i,growth:1.16}));
export const MILESTONES=[10,25,50,100,150,200,300,500];
export const GEAR=[
 {id:'lessons',name:'Guitar lessons',icon:'lesson',unlock:0,cost:20,growth:1.38,description:'Stronger clicks and new Live Jam parts at lessons 1, 3, 6, 10 and 25. Every 10 lessons adds 3% to the shared income bonus.',effect:'click'},
 {id:'guitar',name:'Your signature guitar',icon:'guitar',unlock:1,cost:100,growth:1.47,description:'+5% to all income per level. Acoustic at level 1, electric at 10, pedalboard at 25.',effect:'income'},
 {id:'amp',name:'Amplifier stack',icon:'amp',unlock:4,cost:800,growth:1.48,description:'+6% to all income per level. A practice amp at level 1 becomes a cabinet stack at 10.',effect:'income'},
 {id:'keys',name:'Keyboard rig',icon:'keys',unlock:8,cost:25000,growth:1.48,description:'+4% fan growth per level. More keys, more possibilities.',effect:'fans'},
 {id:'kit',name:'Drum setup',icon:'drums',unlock:12,cost:8e6,growth:1.47,description:'+7% to automatic income per level. The groove keeps going.',effect:'idle'},
 {id:'lights',name:'Stage lighting',icon:'lights',unlock:16,cost:5e8,growth:1.47,description:'+5% fan growth per level. Give them a show to remember.',effect:'fans'},
 {id:'mixer',name:'Mixing desk',icon:'mixer',unlock:22,cost:8e11,growth:1.48,description:'+8% to all income per level. Find the sweet spot.',effect:'income'},
 {id:'crew',name:'Tour logistics',icon:'van',unlock:18,cost:5e9,growth:1.8,description:'Adds 4 hours to your 24-hour offline earnings allowance per level, up to 96 hours.',effect:'offline',max:18}
];

const fans=[0,75,2000,25000,250000,2500000,25000000,250000000,2500000000];
const money=[0,1e5,1e9,1e13,1e17,1e21,1e25,1e29,1e33];
export const VENUES=CHAPTERS.flatMap((c,ch)=>c.venues.map((name,j)=>({
 id:ch*6+j,name,chapter:ch,
 fans:ch===0?[0,1,4,12,28,48][j]:Math.round(fans[ch]*(fans[ch+1]/fans[ch])**(j/6)),
 money:ch===0?[0,50,250,1500,8000,30000][j]:money[ch]*(money[ch+1]/money[ch])**(j/6)
})));

export const ACHIEVEMENTS=[
 {id:'first',title:'The first note',text:'Perform your first click.',icon:'guitar',test:s=>s.clicks>=1},
 {id:'routine',title:'It plays itself',text:'Buy your first source of idle income.',icon:'lesson',test:s=>s.owned.some(v=>v>0)},
 {id:'hundred',title:'Calluses',text:'Perform 100 times.',icon:'guitar',test:s=>s.clicks>=100},
 {id:'thousand',title:'One more chorus',text:'Perform 1,000 times.',icon:'guitar',test:s=>s.clicks>=1000},
 {id:'ten',title:'Finding the groove',text:'Get an income source to level 10.',icon:'drums',test:s=>Math.max(...s.owned)>=10},
 {id:'fifty',title:'A proper operation',text:'Get an income source to level 50.',icon:'mixer',test:s=>Math.max(...s.owned)>=50},
 {id:'twohundred',title:'Built to last',text:'Get an income source to level 200.',icon:'amp',test:s=>Math.max(...s.owned)>=200},
 {id:'street',title:'Take it outside',text:'Reach the street chapter.',icon:'case',test:s=>s.venue>=6},
 {id:'band',title:'We are a band',text:'Reach the local circuit.',icon:'drums',test:s=>s.venue>=12},
 {id:'road',title:'Are we there yet?',text:'Begin life on the road.',icon:'van',test:s=>s.venue>=18},
 {id:'arena',title:'Look at that crowd',text:'Become a world headliner.',icon:'lights',test:s=>s.venue>=24},
 {id:'home',title:'A place of your own',text:'Reach your hillside home.',icon:'home',test:s=>s.venue>=26},
 {id:'space',title:'Unidentified fans',text:'Play beyond Earth.',icon:'alien',test:s=>s.venue>=30},
 {id:'galaxy',title:'Touring at light speed',text:'Reach galactic stardom.',icon:'planet',test:s=>s.venue>=36},
 {id:'beyond',title:'A little beyond loud',text:'Enter another dimension.',icon:'portal',test:s=>s.venue>=42},
 {id:'all',title:'The infinite encore',text:'Reach the last known venue.',icon:'portal',test:s=>s.venue>=47},
 {id:'return',title:'The music never stopped',text:'Collect an offline earnings report.',icon:'tape',test:s=>s.offlineReturns>=1},
 {id:'encore',title:'Once more, with feeling',text:'Begin an Encore tour.',icon:'ticket',test:s=>s.encores>=1},
 {id:'legend',title:'A name worth remembering',text:'Earn 25 Legend stars.',icon:'sun',test:s=>s.legend>=25},
 {id:'legacy',title:'A different kind of universe',text:'Begin a Big Encore.',icon:'portal',test:s=>s.universes>=1}
];

export const TRACKS=[
 {id:'garage',title:'Pocket Change Parade',artist:'Original placeholder soundtrack',src:'assets/audio/01-Pocket-Change-Parade-LOOP.wav',chapters:[0,1],bpm:128},
 {id:'headliner',title:'Neon Headliner',artist:'Original placeholder soundtrack',src:'assets/audio/02-Neon-Headliner-LOOP.wav',chapters:[2,3,4],bpm:144},
 {id:'cosmic',title:'Encore at the Event Horizon',artist:'Original placeholder soundtrack',src:'assets/audio/03-Encore-at-the-Event-Horizon-LOOP.wav',chapters:[5,6,7],bpm:136}
];

// Environment selection is shared by the live scene and career thumbnails.
export function environment(venue) {
 const chapter=Math.floor(venue/6),cell=CHAPTERS[chapter].art;
 let extra=null;
 if(chapter===3)extra={cell:0,floor:285};
 if(venue===26)extra={cell:1,floor:345,private:true};
 if(venue===27)extra={cell:3,floor:345,private:true};
 if(venue===30||venue===31)extra={cell:2,floor:299};
 if(extra)return {src:'assets/art/encore-atlas.png',columns:2,rows:2,...extra};
 return {src:'assets/art/career-atlas.png',columns:3,rows:2,cell,floor:[346,326,310,306,311,312][cell],private:cell===0};
}
export function environmentStyle(venue) {
 const e=environment(venue);
 return `background-image:url('${e.src}');background-size:${e.columns*100}% ${e.rows*100}%;background-position:${e.cell%e.columns/(e.columns-1)*100}% ${Math.floor(e.cell/e.columns)/(e.rows-1)*100}%`;
}
