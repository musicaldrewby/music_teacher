export const GENRES=['Action','Comedy','Horror','Family','Romance','Sci-Fi'];
const rows=[
['Lawn Enforcement','Action','This summer, crime gets trimmed.','A suburban gardener takes on the mob, one hedge at a time.',28,95],
['The Mummy Owes Me Twenty Bucks','Comedy','Some debts are eternal.','An ancient curse meets a waitress who keeps excellent records.',23,83],
['My Stepdad Is a Fog Machine','Family','Blended families. Reduced visibility.','A very ordinary dad has a very theatrical secret.',25,90],
['Night of the Living Leftovers','Horror','Best before yesterday.','Nobody remembers putting that casserole in the fridge.',20,88],
['Love at First Fright','Romance','Till death brought them together.','Two ghosts accidentally haunt the same rent-controlled apartment.',21,74],
['The President Is Three Raccoons','Comedy','A new kind of trash politics.','An election victory. A long coat. A concerning number of paws.',24,85],
['Space Accountant II: Audit the Moon','Sci-Fi','In space, nobody can itemize.','One accountant. Nine moons. A very suspicious receipt.',26,79],
['Much Ado About Mutton','Romance','All the world’s a pasture.','A theatrical sheep falls for the shepherd’s understudy.',18,48],
['Crosswalk Ninja','Action','Look left. Look right. Strike.','A crossing guard protects the most dangerous intersection in town.',24,82],
['The Spin Cycle','Horror','Your whites will never be the same.','A midnight laundromat has an extra, unmarked wash setting.',20,75],
['Discosaurus','Family','Extinction can wait until Monday.','A dinosaur discovers platform shoes and a reason to dance.',23,87],
['Thirty Minutes or It’s Earth','Sci-Fi','Extra cheese. Extra terrestrial.','An alien delivery driver gets one final chance to keep his job.',24,80],
['The Pirate and the Librarian','Romance','He stole her heart. She charged a fine.','A bookish romance on the very quiet seas.',25,81],
['Hamsterageddon','Action','He’s out of his wheel.','A science-fair hamster develops a taste for suspension bridges.',29,92],
['Grandma Took the Harley','Comedy','Bingo is cancelled.','Three grandmothers, one motorcycle, and a deeply worried sheriff.',24,86],
['A Fistful of Fillings','Action','Open wide, partner.','The fastest dentist in the West settles one last score.',25,79],
['The Lobster Wore a Wire','Comedy','Something smells fishy.','A hard-boiled crustacean investigates the waterfront.',21,71],
['Dust Commander','Family','No crumb left behind.','A little robot vacuum accidentally saves the neighborhood.',24,82],
['Gutterballs from the Grave','Horror','Three strikes. You’re dead.','The bowling league learns why lane thirteen stays closed.',22,85],
['Objection, Your Penguin','Family','Justice on thin ice.','A rookie penguin lawyer defends the aquarium’s greatest thief.',22,77],
['The Wizard of Oddly Specific Barbecues','Comedy','You shall not overcook.','A suburban wizard insists every hot dog fulfills a prophecy.',25,84],
['License to Coo','Action','One bird. No breadcrumbs.','The world’s finest spy pigeon must go undercover in a park.',28,89],
['The Last Diner Before Jupiter','Romance','Love takes the scenic route.','Two strangers meet at the only diner on a passing comet.',27,82],
['Waffle House of Horrors','Horror','Breakfast bites back.','A cursed waffle iron grants wishes with terrible toppings.',25,89],
['Houston, We Have a Plumber','Sci-Fi','A leak of cosmic proportions.','Earth’s last plumber answers a call from a distant space station.',27,85],
['Monster Prom Committee','Family','Every ghoul deserves a slow dance.','A werewolf and a shy swamp creature plan the perfect evening.',26,88],
['The Last Snow Samurai','Action','Revenge is best served frozen.','A snowman must face the returning army of spring.',30,91],
['Captain Whiskers: Lost in Space','Sci-Fi','Nine lives. Infinite possibilities.','A cat astronaut refuses to abandon the galaxy’s last cardboard box.',28,93],
['Our Minivan Is Haunted','Horror','Are we dead yet?','A family road trip takes the scenic route through the afterlife.',25,87],
['Lawn Enforcement 2: Hedge of Tomorrow','Action','This time, it’s perennial.','The gardener returns. The hedges have learned his name.',35,100]
];
export const MOVIES=rows.map((r,id)=>({id,title:r[0],genre:r[1],tagline:r[2],synopsis:r[3],cost:r[4],demand:r[5],unlock:id<12?1:id<20?2:id<29?4:7}));
export const REGULARS=[
{name:'Marge',label:'Horror grandma',genre:'Horror',color:'#a578c5',hair:'#d6d2c7',skin:'#edbb95',quote:'Something terrifying, dear. The last one barely disturbed my knitting.'},
{name:'Gary',label:'Forgetful regular',genre:'Comedy',color:'#d5a74f',hair:'#65442e',skin:'#dca879',quote:'I definitely returned it. Unless it’s in the car. Or the other car.'},
{name:'Denise',label:'Friday-night mom',genre:'Family',color:'#61aaa0',hair:'#473027',skin:'#b67653',quote:'Something everyone can agree on. I understand that’s a big ask.'},
{name:'Trent',label:'Movie snob',genre:'Romance',color:'#797bb7',hair:'#2d2634',skin:'#e5b994',quote:'Something with artistic integrity. And perhaps a helicopter.'},
{name:'Eddie',label:'Sequel enthusiast',genre:'Sci-Fi',color:'#dc7b60',hair:'#713f27',skin:'#f2c9a0',quote:'Did they ever explain what happened in Space Accountant ONE?'},
{name:'Roxie',label:'Action loyalist',genre:'Action',color:'#ce6995',hair:'#292c35',skin:'#9f6648',quote:'Explosions, please. Ideally before the opening credits.'},
{name:'Al',label:'The spoiler guy',genre:'Horror',color:'#7da265',hair:'#7a6e58',skin:'#d9a57c',quote:'Have you seen the one where the—oh, right. No spoilers.'},
{name:'June',label:'Neighborhood night owl',genre:'Comedy',color:'#5e9bc8',hair:'#a25035',skin:'#edc6a3',quote:'I need a movie that understands I’ve had a very long Tuesday.'}
];
export const CANDIDATES=[
{id:0,name:'Jamie',role:'Quick on the register',trait:'Fast hands, warm welcome.',expected:6,speed:1.2,best:'checkout',color:'#dc9c67'},
{id:1,name:'Bea',role:'Walking movie encyclopedia',trait:'Knows just what every customer needs.',expected:7,speed:1.1,best:'floor',color:'#c98fd0'},
{id:2,name:'Luis',role:'The rewind whisperer',trait:'Returns never pile up on his watch.',expected:6,speed:1.3,best:'returns',color:'#6baead'},
{id:3,name:'Tasha',role:'Experienced shift manager',trait:'Keeps an eye on every department.',expected:9,speed:1.35,best:'all',color:'#e2be68'},
{id:4,name:'Owen',role:'Enthusiastic new hire',trait:'Every recommendation starts with space.',expected:5,speed:.9,best:'floor',color:'#8ba2d9'},
{id:5,name:'Val',role:'Retail veteran',trait:'Nothing surprises her. Not even the mummy.',expected:8,speed:1.3,best:'checkout',color:'#cf7b8f'}
];
export const SNACKS=[{id:'popcorn',name:'Popcorn',cost:6,price:1.5,icon:'🍿'},{id:'soda',name:'Soda',cost:7,price:1.75,icon:'🥤'},{id:'candy',name:'Candy',cost:5,price:1.25,icon:'🍬'}];
export const UPGRADES=[
{id:'rewinders',title:'Second rewinder',cost:100,desc:'Rewind two tapes at once.',max:1},
{id:'turbo',title:'Turbo rewind deck',cost:165,desc:'Every rewinder finishes in half the time.',max:1},
{id:'shelves',title:'Another movie aisle',cost:180,desc:'Room for 25 more copies and more browsers.',max:3},
{id:'sign',title:'Neon sidewalk sign',cost:140,desc:'Attract 15% more customers.',max:1},
{id:'cozy',title:'The comfy corner',cost:110,desc:'Customers wait 25% longer.',max:1},
{id:'dropbox',title:'After-hours drop box',cost:220,desc:'More renters return on time; some tapes arrive rewound.',max:1},
{id:'store',title:'The flagship renovation',cost:650,desc:'Add a new section, 35-copy capacity, and room for six workers.',max:1},
{id:'branch',title:'Open a neighborhood branch',cost:1400,desc:'Unlock after the renovation. Earn $95/day; pay $45/day operating costs.',max:3}
];
export const EVENTS=[
{title:'Opening week',text:'The neighborhood is curious. Family films are getting attention.',genre:'Family'},
{title:'Cult comedy night',text:'The campus radio DJ mentioned our weird comedies.',genre:'Comedy'},
{title:'A storm is rolling in',text:'Perfect weather for a scary movie and popcorn.',genre:'Horror'},
{title:'Date-night specials',text:'Romance rentals are the talk of the town.',genre:'Romance'},
{title:'Friday night rush',text:'Everyone wants action. Get those tapes ready.',genre:'Action'},
{title:'Out-of-this-world weekend',text:'A meteor shower has everyone in a sci-fi mood.',genre:'Sci-Fi'},
{title:'The sequel has landed',text:'Lawn Enforcement 2 arrives. Stock the original, too!',genre:'Action'}
];
