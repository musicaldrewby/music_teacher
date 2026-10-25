// Presentation and music progression. Nothing here awards or spends currency.
export const SKILLS = [
 {level:0,name:'Finding the note',detail:'A borrowed guitar. A couple of brave notes.'},
 {level:1,name:'Clean notes',detail:'Steadier fingers. The melody is taking shape.'},
 {level:3,name:'First chords',detail:'Three notes together. Suddenly it sounds like a song.'},
 {level:6,name:'Pocket riff',detail:'A little syncopation. A riff worth playing twice.'},
 {level:10,name:'Confident lead',detail:'Your own lead line rises over the changes.'},
 {level:25,name:'Stage solo',detail:'The same little tune, with a proper guitar solo.'}
];
export function performanceProfile(s) {
 const lessons=s.gear.lessons;
 const tier=SKILLS.findLastIndex(x=>lessons>=x.level);
 return {tier,skill:SKILLS[tier],next:SKILLS[tier+1]||null,lessons,
  drums:s.owned[2]>0||s.owned[6]>0||s.gear.kit>0,
  bass:s.owned[6]>0,keys:s.gear.keys>0,fullKit:s.gear.kit>0,
  electric:s.gear.guitar>=10,amplified:s.gear.amp>0,
  stack:s.gear.amp>=10,pedals:s.gear.guitar>=25,
  guitar:s.gear.guitar>=10?'Cherry-red electric':s.gear.guitar>0?'Your first acoustic':'Borrowed strings',
  amp:s.gear.amp>=10?'Twin cabinet stack':s.gear.amp>0?'Practice amplifier':'Unplugged',
  award:s.venue>=25,chapter:Math.floor(s.venue/6)};
}
export function julesLine(s) {
 if(s.venue>=42)return '“The other me rushes the chorus. We are having words.”';
 if(s.venue>=30)return '“Three arms. Still cannot find a drummer. Interesting.”';
 if(s.venue>=26)return '“Lovely house. Which room has the best snare sound?”';
 if(s.venue>=18)return '“The van keys were in the hi-hat case. Obviously.”';
 if(s.venue>=12)return '“I asked for more kick in the monitor. They gave me a chair.”';
 if(s.venue>=6)return '“That person missed three buses to hear us. We are a band.”';
 return '“I brought a kit. The cymbal is borrowed. Indefinitely.”';
}
export const STORIES = [
 {id:'first-note',title:'The neighbor knows',speaker:'YOU',icon:'guitar',when:s=>s.clicks>0,teaser:'The first note travels through the wall.',text:'You find a note. It buzzes a little. Somewhere next door, someone taps the wall in time. Probably in time. You decide to take it as encouragement.',after:'Buy a Practice routine for $15 to start earning automatically.'},
 {id:'routine',title:'A promise to yourself',speaker:'YOU',icon:'lesson',when:s=>s.owned[0]>0,teaser:'Ten minutes, every day. Even the bad days.',text:'You write “play something” on a scrap of paper and stick it to the wall. No audition. No grand plan. Just tomorrow, and the day after. For the first time, the dream has a routine.',after:'Your routine earns cash and fans while you are away.'},
 {id:'lesson',title:'One clean note',speaker:'YOUR TEACHER',icon:'lesson',when:s=>s.gear.lessons>=1,teaser:'“Let the string do some of the work.”',text:'Your teacher moves your finger a fraction of an inch. The buzzing stops. One clean note hangs in the room. You play it again, just to check it was really you.',after:'Live Jam now plays clean notes. Three lessons unlock chords.'},
 {id:'guitar',title:'It belongs to you',speaker:'YOU',icon:'guitar',when:s=>s.gear.guitar>0,teaser:'The case smells like old wood and possibility.',text:'The shop owner says the scratches add character. You suspect they also lowered the price. Either way, this guitar is yours. You give it a place beside the one that got you started.',after:'Your acoustic appears on its stand. Guitar level 10 adds a cherry-red electric.'},
 {id:'chords',title:'That is a song',speaker:'YOUR TEACHER',icon:'guitar',when:s=>s.gear.lessons>=3,teaser:'Three notes find each other.',text:'Your fingers remember where to go before you tell them. The chord rings out. Your teacher nods once, very calmly, as if your entire world has not just changed shape.',after:'Chords join Live Jam. Six lessons unlock the pocket riff.'},
 {id:'demo',title:'Take seven was the one',speaker:'YOU',icon:'tape',when:s=>s.owned[1]>0,teaser:'You leave the little laugh at the end.',text:'The first six takes had problems. The seventh still has problems, but it also has something you cannot quite name. You make a copy. Then another. Someone you have never met asks for one.',after:'Your demos keep finding listeners automatically.'},
 {id:'jules',title:'Someone brought a drum kit',speaker:'JULES · YOUR FIRST BANDMATE',icon:'drums',when:s=>performanceProfile(s).drums,teaser:'“You are the guitar through the wall, right?”',text:'Jules arrives carrying a kick drum and a bag of questionable cables. They are the neighbor who kept tapping along. “I know the chorus,” they say. “I also know where it should end.” You make room. The bedroom suddenly feels like a rehearsal space.',after:'Jules joins your scene and adds drums to Live Jam. Weekend Sessions earns while you are away.'},
 {id:'riff',title:'One more time',speaker:'YOU',icon:'guitar',when:s=>s.gear.lessons>=6,teaser:'You catch yourself humming your own riff.',text:'It is only a handful of notes, but the space between them feels right. You stop playing. Your foot keeps going. Then you pick the guitar back up.',after:'The pocket riff is audible in Live Jam. Ten lessons unlock a lead part.'},
 {id:'amp',title:'The red light comes on',speaker:'YOU',icon:'amp',when:s=>s.gear.amp>0,teaser:'The volume knob has more room than the bedroom.',text:'The amplifier hums, clicks, and settles. Your little tune sounds bigger already. You carefully turn the knob one notch further. The neighbor taps the wall again. You choose the optimistic interpretation.',after:'A purchased amp appears onstage. Amp level 10 builds a twin cabinet stack.'},
 {id:'lead',title:'Something of your own',speaker:'YOUR TEACHER',icon:'guitar',when:s=>s.gear.lessons>=10,teaser:'“That last phrase. Keep that.”',text:'You stop copying the exercise for a moment and follow a note somewhere else. Your teacher looks up. You almost apologize. “That last phrase,” they say. “Keep that.”',after:'Your lead line now answers the chords in Live Jam.'},
 {id:'street',title:'Someone misses the bus',speaker:'YOUR FIRST REGULAR',icon:'case',when:s=>s.venue>=6,teaser:'A stranger stays until the last chord.',text:'They could have kept walking. Instead, they lean against the bus stop and listen. When the song ends, they drop a little change into the case. “Same time tomorrow?” they ask.',after:'You have reached the street chapter. The audience grows with your fans.'},
 {id:'electric',title:'Red paint, loud ideas',speaker:'YOU',icon:'guitar',when:s=>s.gear.guitar>=10,teaser:'You keep the acoustic. You never forget your first.',text:'You have looked at this guitar through the shop window so often that the owner has stopped asking if you need help. Today, you ask for the case.',after:'The cherry-red electric joins your equipment display and changes the Live Jam guitar tone.'},
 {id:'club',title:'Your name, spelled almost right',speaker:'JULES',icon:'ticket',when:s=>s.venue>=12&&performanceProfile(s).drums,teaser:'“They got most of the letters.”',text:'There is a soundcheck. There is a dressing room, technically. Outside, your name is on a poster. Jules takes a picture before anyone can correct the spelling. “First one,” they say. “We keep it.”',after:'Resident Band adds bass. Keyboard gear adds the keys layer.'},
 {id:'signal',title:'An extra listener',speaker:'YOU',icon:'radio',when:s=>s.venue>=29,teaser:'The unplugged amplifier applauds.',text:'The studio is empty. The amplifier is unplugged. From somewhere inside it comes the unmistakable sound of applause, followed by a request in a language your guitar seems to understand.',after:'Something beyond Earth has heard your music.'}
];
export function discoverStories(s) {
 const fresh=STORIES.filter(x=>!s.storyUnlocked.includes(x.id)&&x.when(s));
 s.storyUnlocked.push(...fresh.map(x=>x.id));
 return fresh;
}
