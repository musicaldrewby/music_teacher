export const SYLLABLES=['Low Ti','Do','Re','Mi','Fa','So','La'];
const concert=['A','B♭','C','D','E♭','F','G'];
export const INSTRUMENTS=[
 {id:'clarinet',name:'Clarinet',clef:'Treble',written:['B3','C4','D4','E4','F4','G4','A4'],midi:[57,58,60,62,63,65,67],vertical:true,
  captions:['Thumb + left 1–2–3 + right 2','Thumb + left 1–2–3','Thumb + left 1–2','Thumb + left 1','Thumb only','All holes open','A key only'],
  hints:['Right MIDDLE finger. Register key stays off.','Cover each hole completely.','Right-hand holes stay open.','Use the pad of your index finger.','Keep the left thumb hole covered.','Keep fingers close and relaxed.','Roll the left index onto the throat A key. Main holes and thumb stay open.']},
 {id:'flute',name:'Flute',clef:'Treble',written:['A4','B♭4','C5','D5','E♭5','F5','G5'],midi:[69,70,72,74,75,77,79],
  captions:['Thumb + left 1–2 + pinky','Thumb + left 1 + right 1 + pinky','Left 1 + right pinky','Thumb + left 2–3 + right 1–2–3','Thumb + left 2–3 + right 1–2–3 + pinky','Thumb + left 1–2–3 + right 1 + pinky','Thumb + left 1–2–3 + pinky'],
  hints:['Use the regular B-thumb key.','The chart uses the one-and-one B♭ fingering.','Both thumb keys are open.','Left index and right pinky are UP.','Add the right pinky to D.','Use the regular B-thumb key.','Right 1–2–3 are open; right pinky is down.']},
 {id:'sax',name:'Alto Sax',clef:'Treble',written:['F♯4','G4','A4','B4','C5','D5','E5'],midi:[57,58,60,62,63,65,67],vertical:true,
  captions:['Left 1–2–3 + right 2','Left 1–2–3','Left 1–2','Left 1','Left 2 only','Octave + left 1–2–3 + right 1–2–3','Octave + left 1–2–3 + right 1–2'],
  hints:['Right MIDDLE finger. Octave key off.','Octave key off.','Octave key off.','Octave key off.','Left middle finger. Octave key off.','Press the octave key with the left thumb.','Keep the octave key on; lift right finger 3.']},
 {id:'trumpet',name:'Trumpet',clef:'Treble',written:['B3','C4','D4','E4','F4','G4','A4'],midi:[57,58,60,62,63,65,67],
  captions:['Valve 2','Open — no valves','Valves 1 + 3','Valves 1 + 2','Valve 1','Open — no valves','Valves 1 + 2'],
  hints:['The middle valve.','Listen for low C.','Press both valves all the way down.','Keep the air moving.','Keep the other valves up.','Same valves as C, a higher note.','Same valves as E, a higher note.']},
 {id:'trombone',name:'Trombone',clef:'Bass',written:['A2','B♭2','C3','D3','E♭3','F3','G3'],midi:[45,46,48,50,51,53,55],
  captions:['2nd position','1st position','6th position','4th position','3rd position','1st position','4th position'],
  hints:['A little out from 1st.','Slide all the way in, gently.','Ask your teacher to help you find a comfortable reach.','Listen to place the slide accurately.','Bell landmarks are approximate; use your ears.','Same position as B♭, a higher note.','Same position as D, a higher note.']},
 {id:'euphonium',name:'Euphonium',clef:'Bass',written:['A2','B♭2','C3','D3','E♭3','F3','G3'],midi:[45,46,48,50,51,53,55],
  captions:['Valve 2','Open — no valves','Valves 1 + 3','Valves 1 + 2','Valve 1','Open — no valves','Valves 1 + 2'],
  hints:['The middle valve.','Bass-clef B♭.','Standard three-valve fingering.','Press both valves fully.','Keep the other valves up.','Same valves as B♭, a higher note.','Same valves as D, a higher note.']},
 {id:'bells',name:'Bell Kit',clef:'Treble',written:['A3','B♭3','C4','D4','E♭4','F4','G4'],midi:[81,82,84,86,87,89,91],
  captions:['A — front row','B♭ — back row','C — front row','D — front row','E♭ — back row','F — front row','G — front row'],
  hints:['The A directly below your starting B♭.','B♭ is also labeled A♯ on some kits.','Find the C next to the group of two raised bars.','Lift the mallet after you strike.','E♭ is also labeled D♯ on some kits.','Use the gold outline to find your bar.','The G directly above F.']}
].map(i=>({...i,concert}));

export function asset(inst,note,part){
 if(part==='staff')return `assets/notation/${inst}-${note}-staff.svg`;
 let ext=(note===0||note===6)?'svg':'png';
 if(part==='fingers'&&inst==='bells')ext='svg';
 if(part==='fingers'&&note===6&&['trumpet','euphonium','trombone'].includes(inst))ext='png';
 return `assets/${inst}-${note}-${part}.${ext}`;
}
export function midiFrequency(midi){return 440*Math.pow(2,(midi-69)/12)}

export const FINGERING_SOURCES=[
 ['Woodwind Fingering Guide — clarinet','https://www.wfg.woodwind.org/clarinet/cl_bas_1.html'],
 ['Woodwind Fingering Guide — flute, first octave','https://www.wfg.woodwind.org/flute/fl_bas_1.html'],
 ['Woodwind Fingering Guide — flute, second octave','https://www.wfg.woodwind.org/flute/fl_bas_2.html'],
 ['Woodwind Fingering Guide — saxophone, first octave','https://www.wfg.woodwind.org/sax/sax_bas_1.html'],
 ['Woodwind Fingering Guide — saxophone, second octave','https://www.wfg.woodwind.org/sax/sax_bas_2.html'],
 ['Yamaha — trumpet fingering chart','https://www.yamaha.com/en/musical_instrument_guide/common/images/trumpet/fingering.pdf'],
 ['University of Mississippi — tenor trombone positions','https://www.olemiss.edu/lowbrass/studio/fingeringcharts/tenortromboneposition.pdf'],
 ['University of Mississippi — euphonium, bass clef','https://www.olemiss.edu/lowbrass/studio/fingeringcharts/euphbcfingering.pdf']
];
export const SOUND_SOURCES=[
  [
    "Yamaha / Don Stinson — First Steps for First-Year Winds",
    "https://hub.yamaha.com/music-educators/instruments/winds-instruments/first-steps-for-first-year-winds/"
  ],
  [
    "Yamaha / Aleah Fitzwater — First-Year Flutes",
    "https://hub.yamaha.com/music-educators/instruments/winds-instruments/first-year-flutes-success/"
  ],
  [
    "Yamaha — Saxophone Embouchure",
    "https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play005.html"
  ],
  [
    "Yamaha — Reed Placement and Ligature Position",
    "https://hub.yamaha.com/winds/wood/correct-reed-placement-and-ligature-positioning/"
  ],
  [
    "Yamaha / Jeff Conner — Trumpet Teaching Tips",
    "https://hub.yamaha.com/music-educators/instruments/winds-instruments/trumpet-pedagogy/"
  ],
  [
    "Yamaha / Domingo Pagliuca — Trombone Teaching Tips",
    "https://hub.yamaha.com/music-educators/instruments/winds-instruments/trombone-pedagogy/"
  ],
  [
    "Vic Firth — Two-Mallet Fundamentals",
    "https://vicfirth.com/blogs/two-mallet-fundamentals/2-mallet-fundamentals-chromatic-scale"
  ],
  [
    "Yamaha — Playing the Clarinet",
    "https://www.yamaha.com/en/musical_instrument_guide/clarinet/play/"
  ],
  [
    "Yamaha — Playing the Flute",
    "https://www.yamaha.com/en/musical_instrument_guide/flute/play/"
  ],
  [
    "Yamaha — Saxophone Playing Position",
    "https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/"
  ],
  [
    "J. D. Salas — Tuba & Euphonium Beginning Tips",
    "https://www.georgepalton.com/uploads/9/3/4/8/9348446/salas-_beginning_tips_for_tuba___euphonium.pdf"
  ],
  [
    "Brian N. Weidner — The Euphonium",
    "https://pressbooks.palni.org/brasstechniquesandpedagogy/chapter/the-euphonium/"
  ],
  [
    "Yamaha / Kyle Peters — Choosing Bell Mallets",
    "https://hub.yamaha.com/music-educators/instruments/perc/choose-the-right-mallet/"
  ],
  [
    "Yamaha / Allen Vizzutti — Airflow and Brass Teaching",
    "https://hub.yamaha.com/music-educators/learn-peers/profiles/allen-vizzutti/"
  ],
  [
    "Yamaha — Brass Valve Care",
    "https://hub.yamaha.com/winds/w-how-to/how-to-oil-brass-instrument-valves/"
  ],
  [
    "Michael Shirk / American Band College — Trumpet: Removing Water (p. 19)",
    "https://www.bandworld.org/pdfs/trumpetabc_shirk.pdf"
  ],
  [
    "Yamaha — Trumpet Moisture and Slide Care",
    "https://www.yamaha.com/en/musical_instrument_guide/trumpet/maintenance/"
  ],
  [
    "Yamaha — Trombone Daily Care",
    "https://www.yamaha.com/en/musical_instrument_guide/trombone/maintenance/"
  ],
  [
    "Yamaha — Euphonium / Low-Brass Owner’s Manual",
    "https://data.yamaha.com/files/download/other_assets/3/335943/altohorn_en_om_b0.pdf"
  ],
  [
    "Yamaha — Clarinet Moisture Care",
    "https://www.yamaha.com/en/musical_instrument_guide/clarinet/maintenance/maintenance002.html"
  ],
  [
    "Yamaha — Saxophone Moisture Care",
    "https://www.yamaha.com/en/musical_instrument_guide/saxophone/maintenance/maintenance002.html"
  ],
  [
    "Yamaha — Flute Moisture Care",
    "https://www.yamaha.com/en/musical_instrument_guide/flute/maintenance/"
  ]
];

export const HELP={
  "clarinet": [
    {
      "title": "I only hear air.",
      "steps": [
        "Check that your reed is straight and undamaged. Moisten a cane reed before playing.",
        "Cushion your lower teeth with a little lower lip; rest your top teeth on the mouthpiece.",
        "Close your lips around the mouthpiece and send a steady stream of air."
      ],
      "teacher": "Check reed strength and alignment, mouthpiece depth, and whether the jaw is clamping the reed. A brief mouthpiece-and-barrel check can help locate the problem; it does not rule out a leak in the assembled clarinet.",
      "sources": [
        7,
        3,
        0
      ]
    },
    {
      "title": "My clarinet squeaks.",
      "steps": [
        "Cover every needed hole completely with your finger pads.",
        "Check that your thumb is not bumping the register key.",
        "Let your teacher check your reed and how much mouthpiece is in your mouth."
      ],
      "teacher": "Look for small leaks before changing the embouchure. A chipped or poorly aligned reed, accidental register-key contact, or excessive mouthpiece can contribute. Change one thing at a time.",
      "sources": [
        0,
        3,
        7
      ]
    },
    {
      "title": "My sound is fuzzy or pinched.",
      "steps": [
        "Keep your corners steady and your chin smooth.",
        "Let the reed vibrate—avoid clamping it with your jaw.",
        "Hold one comfortable note with a steady stream of air."
      ],
      "teacher": "Use a mirror. Check the lower-lip cushion and a stable seal, then compare a known good reed. A reed that is too hard or poorly matched may prevent an easy response.",
      "sources": [
        7,
        3
      ]
    },
    {
      "title": "The note sounds wrong.",
      "steps": [
        "Check the note and every filled circle on the chart.",
        "For low Ti, use your RIGHT MIDDLE finger.",
        "For La, use the A key and keep the main holes open."
      ],
      "teacher": "Low B3 is T + LH123 + RH2. Throat A4 uses the A key only. Have the student finger silently, then play; listen for a register jump rather than assuming every wrong pitch is a fingering error.",
      "sources": [],
      "fingerings": [
        0
      ]
    },
    {
      "title": "My sound is bubbly, or a key feels wet.",
      "steps": [
        "Moisture can collect inside while you play. Tell your teacher if the sound changes.",
        "Swab with the correct clarinet swab using the routine you learned. Stop if it catches.",
        "Ask your teacher to check the reed, mouthpiece, and damp pads.",
        "After playing, remove the reed and dry and store the parts as taught."
      ],
      "teacher": "Moisture can interrupt a tone hole or collect around the reed. Use the correct separate swab size for the body and mouthpiece; protect the reed tip. Blot damp pads with proper cleaning paper, releasing the key before removing it. Do not poke into tone holes or pull hard on a trapped swab.",
      "sources": [
        19
      ]
    }
  ],
  "flute": [
    {
      "title": "I only hear air.",
      "steps": [
        "Try the headjoint with your teacher.",
        "Make a small lip opening and direct the air across and slightly down toward the far edge of the hole.",
        "Try tiny changes in air direction until a clear tone starts."
      ],
      "teacher": "Start with the lower lip covering roughly one-quarter to one-third of the embouchure hole. Check alignment and avoid excessive inward rolling. Individual lip shapes need individual adjustments.",
      "sources": [
        0,
        1,
        8
      ]
    },
    {
      "title": "My sound is airy.",
      "steps": [
        "Keep your lip opening small and comfortable, with a focused air stream.",
        "Try tiny changes in where you aim the air.",
        "When you find a clear sound, hold it gently and steadily."
      ],
      "teacher": "Return to headjoint work if the full flute distracts from tone production. Check the lip-plate position and instrument balance before asking for more air.",
      "sources": [
        1,
        8
      ]
    },
    {
      "title": "The note jumps too high.",
      "steps": [
        "Check the chart’s fingering, then listen to the note you want.",
        "If you are in a higher octave, try slightly slower air while keeping it moving.",
        "Ask your teacher to help adjust your lip opening and air direction."
      ],
      "teacher": "First confirm the intended written note and fingering. An unwanted higher harmonic can respond to a small change in air speed, direction, or aperture. Keep a supported stream; simply playing weaker is not a reliable fix. Avoid large headjoint rolls.",
      "sources": [
        1,
        8
      ]
    },
    {
      "title": "My fingers feel mixed up.",
      "steps": [
        "Keep your fingers curved and close to the keys.",
        "For the D5 shown in this app, lift your LEFT index and RIGHT pinky.",
        "For the E♭5 shown here, add your right pinky."
      ],
      "teacher": "The source chart uses the regular B-thumb key plus LH1/RH1 for B♭. For A and G, preserve the regular thumb key and right D♯ pinky. Check balance so the student is not squeezing to hold the flute.",
      "sources": [
        0
      ],
      "fingerings": [
        1,
        2
      ]
    },
    {
      "title": "There is water inside, or a pad feels sticky.",
      "steps": [
        "Your warm breath leaves moisture inside the flute. Tell your teacher if a note suddenly changes.",
        "Dry the inside using your flute cleaning cloth and rod or suitable flute swab, just as you learned.",
        "Ask your teacher to check damp pads. Do not press harder or poke underneath them.",
        "Dry the flute after playing, then put it away."
      ],
      "teacher": "Cover the cleaning rod’s tip fully with the cloth and use the taught routine without pushing against the headjoint stopper. Blot wet pads with appropriate cleaning paper; lift the key before removing it. The flute has no brass-style water key. Persistent sticking or a leak needs assessment.",
      "sources": [
        21
      ]
    }
  ],
  "sax": [
    {
      "title": "I only hear air.",
      "steps": [
        "Check that your reed is straight and undamaged. Moisten a cane reed before playing.",
        "Cushion the reed with a little lower lip over your lower teeth; rest your upper teeth on the mouthpiece.",
        "Keep a firm lip seal and blow steadily without biting."
      ],
      "teacher": "Check reed condition, ligature placement, mouthpiece depth, and the lower-lip cushion. A short mouthpiece-and-neck check may help isolate the problem. Have the teacher check for pad leaks if the full saxophone remains difficult to play.",
      "sources": [
        2,
        3,
        9
      ]
    },
    {
      "title": "My sax squeaks.",
      "steps": [
        "Ease any biting while keeping your lip seal and corners steady.",
        "Check that the octave key is down only when the chart shows it.",
        "Ask your teacher to check the reed and mouthpiece."
      ],
      "teacher": "Check biting, reed damage, mouthpiece movement, unintended octave-key contact, and leaking keys. Ease excess jaw pressure without letting the embouchure collapse. Adjust the strap so the mouthpiece stays stable.",
      "sources": [
        0,
        2,
        3
      ]
    },
    {
      "title": "I have to reach for the mouthpiece.",
      "steps": [
        "Sit tall and let the neck strap hold the sax.",
        "Adjust the strap so the mouthpiece comes to you.",
        "Keep your head balanced and your shoulders relaxed."
      ],
      "teacher": "For many seated beginners, the alto is most comfortable outside the right leg. Adjust strap length, neck position, and mouthpiece rotation to the student’s size so the head stays balanced. The strap carries most of the weight; the right thumb helps stabilize the instrument.",
      "sources": [
        0,
        9
      ]
    },
    {
      "title": "The note sounds wrong.",
      "steps": [
        "Low Ti is F♯: left 1–2–3 and RIGHT MIDDLE finger.",
        "Do through Fa use no octave key.",
        "For So and La, add the octave key."
      ],
      "teacher": "Written D5 and E5 need the octave key. Check that the left thumb releases it for G4, A4, B4, C5, and F♯4. Keep air steady while crossing C to D.",
      "sources": [],
      "fingerings": [
        3
      ]
    },
    {
      "title": "My sound is bubbly, or a key feels wet.",
      "steps": [
        "Moisture collects in the mouthpiece, neck, and body. Ask your teacher to help find it.",
        "Use the correct swab for each part, following the routine you learned. Stop if it catches.",
        "Have your teacher check the reed and any damp pads.",
        "After playing, remove the reed and dry and store the parts as taught."
      ],
      "teacher": "Remove the reed before swabbing the mouthpiece; protect its tip. Use a neck-sized swab for the neck and an alto-sized swab for the body. Blot damp pads with proper cleaning paper, lifting the key before taking the paper out. Leave octave-vent inspection and persistent leaks to the teacher or technician.",
      "sources": [
        20
      ]
    }
  ],
  "trumpet": [
    {
      "title": "I only hear air.",
      "steps": [
        "Say “mmm” to bring your lips together gently.",
        "Keep your lip corners steady and blow through the middle.",
        "Listen to your teacher model an easy sound, then try it."
      ],
      "teacher": "Check a comfortable mouthpiece seal and steady corners with a freely vibrating lip center. Keep attempts short and avoid extra pressure. Mouthpiece-only practice is one teacher-guided option; do not force a buzz or treat it as a test every student must pass first.",
      "sources": [
        4,
        13
      ]
    },
    {
      "title": "My sound is thin or tight.",
      "steps": [
        "Ease extra mouthpiece pressure while keeping a comfortable seal.",
        "Keep your corners steady without stretching into a smile.",
        "Play one comfortable note with smooth, steady air."
      ],
      "teacher": "Have the left hand support the instrument and keep the valve hand relaxed. A mirror can reveal a bunched chin or a stretched embouchure. Use short attempts with rests.",
      "sources": [
        4,
        0
      ]
    },
    {
      "title": "Right valves, wrong note.",
      "steps": [
        "Listen to the note and sing it first.",
        "Keep the correct valves down.",
        "Try a small change in your air and lip opening until the pitch matches."
      ],
      "teacher": "The same valve combination produces multiple partials: C4 and G4 are both open; E4 and A4 both use 1–2. Model the target register. Do not solve a partial problem with extra mouthpiece pressure.",
      "sources": [
        4
      ],
      "fingerings": [
        4
      ]
    },
    {
      "title": "A note will not speak clearly.",
      "steps": [
        "Press each needed valve all the way down.",
        "Keep your air moving while your fingers change.",
        "If the horn feels blocked, ask your teacher to check it."
      ],
      "teacher": "Check for a valve that is not fully seated or correctly aligned, and for excess water. Mechanical checks belong to the teacher. Work slowly when fingering concentration interrupts the airflow.",
      "sources": [
        4,
        14
      ]
    },
    {
      "title": "My sound is gurgly. Is it spit?",
      "steps": [
        "People call it “spit,” but much of it is water from warm breath cooling inside the horn.",
        "Use the main water key as your teacher showed you. Point its opening down and use gentle air without buzzing.",
        "If your trumpet has a water key on the third-valve slide: hold down the third finger valve, open that water key, and gently blow.",
        "Let the water drain into your class’s designated spot, away from people. Close the water key before playing again."
      ],
      "teacher": "The finger valves route air; the water keys provide the drain openings. Pressing valve 3 connects its slide to the airflow. Show the student the correct angle and water key on their model. A trumpet without a third-slide water key needs a different draining routine. Teach any slide removal first, holding its matching piston down; never force a slide.",
      "sources": [
        15,
        16
      ]
    }
  ],
  "trombone": [
    {
      "title": "I only hear air.",
      "steps": [
        "Bring your lips together gently, ready to vibrate.",
        "Take an easy breath and send a steady stream through the mouthpiece.",
        "Listen to your teacher model an easy sound, then try it."
      ],
      "teacher": "Stabilize the instrument and check a comfortable mouthpiece seal and flowing air. Model an easy register. If mouthpiece-only work helps, keep it brief and teacher-guided; avoid clamping or pressing harder to force a buzz.",
      "sources": [
        5,
        0
      ]
    },
    {
      "title": "My note is close, but not right.",
      "steps": [
        "Listen to the target note, then sing it.",
        "Put your slide in the shown position.",
        "Make a tiny slide adjustment while you listen."
      ],
      "teacher": "Bell landmarks are approximate. Positions vary with register and instrument, so use a reference pitch and ear training. Help small students reach safely without losing the mouthpiece position.",
      "sources": [
        5,
        0
      ],
      "fingerings": [
        5
      ]
    },
    {
      "title": "My sound breaks when I move.",
      "steps": [
        "Hold the trombone steady with your left hand.",
        "Move the slide smoothly and promptly to the next position.",
        "Keep the air flowing through the change."
      ],
      "teacher": "Keep the horn still and the air continuous while the slide moves promptly. Practice between close positions at a slow tempo, keeping each slide motion quick and relaxed. Coordinate the tongue with the slide arrival; slow practice does not mean dragging the slide slowly.",
      "sources": [
        5
      ]
    },
    {
      "title": "Right position, wrong note.",
      "steps": [
        "Hear the note first and sing it.",
        "Keep the slide in place and try a small change in air and lips.",
        "Remember: Do and So both use 1st position."
      ],
      "teacher": "B♭2 and F3 share first position. D3 and G3 share fourth. Teach the target partial by listening and singing before adjusting the embouchure or slide.",
      "sources": [
        5
      ],
      "fingerings": [
        5
      ]
    },
    {
      "title": "My sound is watery or bubbly.",
      "steps": [
        "Water can collect while you play. The “spit valve” is called a water key.",
        "Keep both slide sections supported. Open the water key and angle it down as your teacher showed you.",
        "Let the moisture drain; use gentle air without buzzing if needed. Drain in the class’s designated spot.",
        "Close the water key, then try the note again."
      ],
      "teacher": "Much of the moisture is condensation from warm breath. Demonstrate a secure hold so the outer slide cannot fall. Attachment tubing may need a separate draining routine. If gurgling remains, check for trapped moisture before changing the student’s embouchure.",
      "sources": [
        17,
        15
      ]
    }
  ],
  "euphonium": [
    {
      "title": "I only hear air.",
      "steps": [
        "Bring the mouthpiece to your lips without bending toward it.",
        "Keep your lip corners steady and let moving air vibrate the middle.",
        "Ask your teacher to help you find an easy, comfortable sound."
      ],
      "teacher": "Check instrument height, a complete mouthpiece seal, and steady air. Fit the mouthpiece position to the individual student rather than enforcing an exact lip ratio. Keep the vibrating center flexible and avoid pinching or excess pressure.",
      "sources": [
        10,
        11
      ]
    },
    {
      "title": "I have to hunch over.",
      "steps": [
        "Sit tall with relaxed shoulders.",
        "Raise the euphonium so the mouthpiece meets you.",
        "Let your supporting arm hold it; keep your valve hand relaxed."
      ],
      "teacher": "Use an appropriate cushion, rolled towel, or support if needed. Check that the student can breathe freely and reach the valves without bending the wrist sharply.",
      "sources": [
        0,
        11
      ]
    },
    {
      "title": "Right valves, wrong note.",
      "steps": [
        "Listen, sing, then play the note.",
        "Keep the valves shown on the chart.",
        "Try a small change in air and lip opening."
      ],
      "teacher": "B♭2 and F3 are both open. D3 and G3 both use 1–2. Match the intended partial with a model pitch; avoid excessive mouthpiece pressure.",
      "sources": [
        10,
        11
      ],
      "fingerings": [
        6
      ]
    },
    {
      "title": "My sound is stuffy or uneven.",
      "steps": [
        "Press the valves completely down.",
        "Keep your air smooth while your fingers move.",
        "Ask your teacher to check the horn if it feels blocked."
      ],
      "teacher": "Check water, valve alignment, and instrument support. Model a comfortable connected tone, then change only one variable. Use the standard three-valve fingerings shown; a fourth valve is not required here.",
      "sources": [
        11,
        14
      ]
    },
    {
      "title": "My sound is gurgly or full of water.",
      "steps": [
        "Playing leaves moisture inside the horn. “Spit” is often water from warm breath cooling.",
        "Use the water key and gentle tilt your teacher demonstrated for your euphonium.",
        "Drain into the class’s designated spot. Use gentle air without buzzing if your teacher shows you.",
        "Close the water key and try again. Still bubbly? Ask your teacher to check the other slides."
      ],
      "teacher": "Water-key locations and tubing differ across three-valve, four-valve, and compensating models. Teach the matching valve, water-key, and tilt routine for this instrument; do not prescribe a universal valve combination. Demonstrate any slide removal with its matching piston depressed and support the instrument throughout.",
      "sources": [
        18,
        15
      ]
    }
  ],
  "bells": [
    {
      "title": "My note sounds choked.",
      "steps": [
        "Tap near the center of the bar, then lift the mallet right away.",
        "Let the bar ring freely.",
        "Keep your other hand and mallet off the ringing bar."
      ],
      "teacher": "Let the mallet return above the bar immediately after contact. A mallet or hand left touching the bar stops its ring. Check that the bar and its mounting can vibrate freely; strike away from mounting pins and supports.",
      "sources": [
        6
      ]
    },
    {
      "title": "My sound is harsh or uneven.",
      "steps": [
        "Use the bell mallets your teacher selected.",
        "Hold the handles gently with relaxed fingers.",
        "Use a small, controlled stroke and lift back up."
      ],
      "teacher": "Choose mallets suited to the actual bell kit; head material and hardness change attack and tone. Use a relaxed grip and an easy lifting stroke. Start near each bar’s center and avoid mounting points. The teacher can demonstrate other striking spots when reach or passagework requires them.",
      "sources": [
        6,
        12
      ]
    },
    {
      "title": "I keep hitting the wrong bar.",
      "steps": [
        "Find the gold outline in the picture.",
        "Move the mallet over your bar before you play.",
        "Look, strike, then lift."
      ],
      "teacher": "Use the keyboard’s two/three raised-bar groups as landmarks. Keep mallets close enough for control, then slowly practice moving between two notes. The chart follows the same shape layout as the supplied PDF.",
      "sources": [
        6
      ]
    },
    {
      "title": "Where are the flat notes?",
      "steps": [
        "B♭ is on the raised back row; it may say A♯.",
        "E♭ is also on the back row; it may say D♯.",
        "Low Ti is A, and La is G, both on the front row."
      ],
      "teacher": "Use the appropriate register around the starting B♭. The letter names repeat across the instrument. Demonstrate the correct bars on the student’s actual kit, whose labeling and range may vary.",
      "sources": []
    }
  ]
};
