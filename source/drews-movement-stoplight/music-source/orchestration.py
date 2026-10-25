"""A new movement suite: independent tunes, natural registers and purposeful rhythm."""
BPM=100;BARS=4;BEATS=BARS*4;PPQ=480
TRACKS=[]
HARMONY=['G','Em','C','D']
VOICINGS={'G':[55,59,62],'Em':[55,59,64],'C':[55,60,64],'D':[54,57,62]}
ROOTS={'G':43,'Em':40,'C':36,'D':38}
SCALE=[0,2,4,5,7,9,11]
def pitch(degree,base=67):
 octave,index=divmod(degree,7)
 return base+12*octave+SCALE[index]
def part(name,program,channel,pan=64,volume=95,role='accompaniment'):
 return dict(name=name,program=program,channel=channel,pan=pan,volume=volume,role=role,notes=[])
def n(p,t,key,d=.3,v=70):
 if 0<=t<BEATS:p['notes'].append([round(t,5),key,round(min(d,BEATS-t),5),v])
def chord(p,t,keys,d=.5,v=58):
 for i,key in enumerate(keys):n(p,t+i*.009,key,d,v-[2,7,0,5][i%4])
def make(id,title,feel,parts):
 TRACKS.append(dict(id=id,title=title,feel=feel,bpm=BPM,bars=BARS,beats=BEATS,seconds=BEATS*60/BPM,key='G major',loop=True,parts=parts))
def phrase(p,bar,degrees,base=67,rhythm=None,duration=.62,velocity=75):
 rhythm=rhythm or list(range(len(degrees)))
 for i,(degree,at) in enumerate(zip(degrees,rhythm)):
  if degree is None:continue
  n(p,bar*4+at,pitch(degree,base),duration if isinstance(duration,(float,int)) else duration[i],velocity+[0,-6,-2,-8,1,-7,-3,-9][i%8])
def bass(p,bar,style='two'):
 root=ROOTS[HARMONY[bar]]
 if style=='long':n(p,bar*4,root,3.55,58);return
 if style=='march':
  for q in range(4):n(p,bar*4+q,root if q%2==0 else root-5,.58,68 if q%2==0 else 54)
  return
 for q in [0,2]:n(p,bar*4+q,root,1.15 if style=='two' else .52,66 if q==0 else 57)
 if style=='jog':
  for q in [1.5,3.5]:n(p,bar*4+q,root,.24,46)

# WALK: marimba and guitar with alternating high/low woodblock footsteps.
# Scale degrees: 3 2 1 2 | 3 5 4 3 | 4 5 6 4 | 2 4 3 2.
mel=[[2,1,0,1],[2,4,3,2],[3,4,5,3],[1,3,2,1]]
a=part('Strolling marimba',12,0,57,98,'melody');g=part('Fingerpicked nylon guitar',24,1,77,91);b=part('Warm upright bass',32,2,64,93,'bass')
w=part('High-low block footsteps',0,9,64,80,'percussion')
for bar,h in enumerate(HARMONY):
 degrees=mel[bar][:]
 phrase(a,bar,degrees,duration=.74)
 c=VOICINGS[h]
 for q,key in zip([0,1,2,3],[c[0],c[1],c[2],c[1]]):n(g,bar*4+q,key,.55,54 if q%2==0 else 43)
 bass(b,bar)
# GeneralUser GS high/low woodblocks (GM drum notes 76/77), one footfall per beat.
for beat in range(BEATS):n(w,beat,76 if beat%2==0 else 77,.14,[65,62,63,61][beat%4])
make('walk','Around the Block','Marimba, guitar and high-low woodblocks · steady walking footsteps',[a,g,b,w])

# JOG: a light steel-pan tune; the eighth-note guitar supplies quick footfalls.
# User notation: single digit = quarter, grouped digits = eighths;
# Z = quarter rest, c = eighth rest, | = measure boundary.
# Jog: 3 12 3 12 | 35686531 | 2 23 4 46 | 5654 3 2 |
jog_degrees=[3,1,2,3,1,2, 3,5,6,8,6,5,3,1, 2,2,3,4,4,6, 5,6,5,4,3,2]
jog_lengths=[1,.5,.5,1,.5,.5]+[.5]*8+[1,.5,.5,1,.5,.5]+[.5]*4+[1,1]
a=part('Bright steel-pan melody',114,0,55,94,'melody');g=part('Muted guitar footsteps',28,1,78,82);b=part('Rounded finger bass',33,2,64,96,'bass');d=part('Soft jogging kit',0,9,64,66,'percussion')
at=0
for degree,length in zip(jog_degrees,jog_lengths):
 n(a,at,pitch(degree-1),.31 if length==1 else .18,76 if length==1 else 66 if at%1==0 else 53)
 at+=length
for bar,h in enumerate(HARMONY):
 for q in range(8):n(g,bar*4+q*.5,VOICINGS[h][1 if q%2 else 0]+12,.15,49 if q%2==0 else 35)
 bass(b,bar,'jog')
 for q in range(8):n(d,bar*4+q*.5,42,.06,35 if q%2==0 else 23)
 for q in [0,2]:n(d,bar*4+q,36,.10,61)
 for q in [1,3]:n(d,bar*4+q,37,.08,44)
# Add a four-measure (16-beat) running groove without changing the existing parts.
# Quiet sixteenth-note shaker, snare backbeats and a small turnaround on beat 16.
r=part('16-beat jogging groove',0,9,64,66,'percussion')
for step in range(64):n(r,step*.25,70,.06,[43,25,34,28][step%4])
for beat in [1,3,5,7,9,11,13,15]:n(r,beat,38,.10,56 if beat%4==3 else 51)
for beat in [2.75,6.5,10.75,14.5]:n(r,beat,36,.10,48)
for at,key,vel in [(15.5,45,48),(15.75,43,43)]:n(r,at,key,.10,vel)
make('jog','Little Lap','Steel pan, muted guitar and a 16-beat drum groove · quick, even jogging',[a,g,b,d,r])

# SKIP: high flute, long-short pairs and springy plucked strings.
# Scale degrees: 31358(10)9(10) | 86361368 | 654568(11)(10) | 98765432 |
# Parentheses group scale degrees 10 and above; every pair is dotted eighth / sixteenth.
mel=[[2, 0, 2, 4, 7, 9, 8, 9], [7, 5, 2, 5, 0, 2, 5, 7], [5, 4, 3, 4, 5, 7, 10, 9], [8, 7, 6, 5, 4, 3, 2, 1]]
a=part('Skipping flute',73,0,54,94,'melody');s=part('Pizzicato step-hop',45,1,76,85);b=part('Gentle upright bass',32,2,64,82,'bass')
for bar,h in enumerate(HARMONY):
 phrase(a,bar,mel[bar],base=79,rhythm=[0,.75,1,1.75,2,2.75,3,3.75],duration=[.54,.18]*4,velocity=74)
 for q in range(4):
  n(s,bar*4+q,VOICINGS[h][0],.18,54)
  n(s,bar*4+q+.75,VOICINGS[h][1],.11,37)
 bass(b,bar)
make('skip','Sunshine Step-Hop','High flute and pizzicato strings · cheerful long-short skips',[a,s,b])

# GALLOP: repeated xylophone dyads over a stable hoofbeat pattern.
# Repeat simultaneous scale-degree pairs: 3+5 | 3+6 | 4+6 | 5+7.
pairs=[(2,4),(2,5),(3,5),(4,6)]
a=part('Xylophone trail tune',13,0,55,91,'melody');g=part('Galloping guitar',24,1,73,90);b=part('Trail bass',32,2,64,88,'bass');w=part('Woodblock hooves',115,3,77,76,'percussion')
for bar,h in enumerate(HARMONY):
 # Both notes strike together on each dotted eighth and sixteenth.
 for q in range(4):
  for offset,duration,velocity in [(0,.42,66),(.75,.14,50)]:
   for degree in pairs[bar]:n(a,bar*4+q+offset,pitch(degree,79),duration,velocity+[0,-6,-2,-8][q])
 for q in range(4):
  n(g,bar*4+q,VOICINGS[h][0],.42,64);n(g,bar*4+q+.75,VOICINGS[h][1],.12,45)
  n(w,bar*4+q,72,.08,72 if q%2==0 else 61);n(w,bar*4+q+.75,76,.07,48)
 bass(b,bar)
make('gallop','Pony Trail','Xylophone, guitar and woodblock · tum-ka, tum-ka',[a,g,b,w])

# TIPTOE: high glockenspiel, quiet pizzicato chords, triangle on each downbeat.
# User notation: 5 8 7 8 | 3 4 5 3 | 4 9 8 9 | 7 6 5434 |
mel=[[4,7,6,7],[2,3,4,2],[3,8,7,8],[6,5,4,3,2,3]]
a=part('High glockenspiel steps',9,0,59,84,'melody');s=part('Quiet pizzicato chords',45,1,75,78);t=part('Soft downbeat triangle',0,9,68,64,'percussion')
b=part('Low pizzicato footsteps',45,2,64,88,'bass')
bass_degrees=[1,6,4,5] # Two strikes per measure, on beats 1 and 3.
for bar,harmony in enumerate(HARMONY):
 phrase(a,bar,mel[bar],base=91,rhythm=[0,1,2,2.5,3,3.5] if bar==3 else [0,1,2,3],duration=.13,velocity=46)
 for q in [0,2]:
  n(b,bar*4+q,pitch(bass_degrees[bar]-1,43),.45,54 if q==0 else 46)
  for key in VOICINGS[harmony]:n(s,bar*4+q,key+12,.32,42 if q==0 else 34)
 n(t,bar*4,81,1.5,35) # General MIDI open triangle, once per measure.
make('tiptoe','Moonlit Mouse','High glockenspiel, pizzicato chords and bass, triangle · tiny quiet steps',[a,s,t,b])

# MARCH: a singable brass call and a deliberately independent oom-pah bass.
# User notation: 5 3 1 3 | 6 67 8 6 | 6 4 1 6 | 7 78 9 7 |
mel=[[4,2,0,2],[5,5,6,7,5],[5,3,0,5],[6,6,7,8,6]]
a=part('Trumpet parade tune',56,0,53,79,'melody');b=part('Tuba left-right',58,1,76,100,'bass');d=part('Parade snare',0,9,64,71,'percussion')
for bar,h in enumerate(HARMONY):
 phrase(a,bar,mel[bar],rhythm=[0,1,1.5,2,3] if bar in [1,3] else [0,1,2,3],duration=[.62,.31,.31,.62,.62] if bar in [1,3] else .62,velocity=77)
 bass(b,bar,'march')
 for q in range(4):n(d,bar*4+q,36 if q%2==0 else 38,.1,65 if q%2==0 else 57)
 if bar%4==3:
  for q,v in [(3.5,36),(3.75,31)]:n(d,bar*4+q,38,.06,v)
make('march','Pocket Parade','Trumpet, tuba and snare · a clear left-right march',[a,b,d])

# HOP: marimba alone under the live random jaw-harp boings.
# Hold the first inversion twice, then lower the top note by one octave
# at each following beat: only neighboring downward inversions within each bar.
# Each new harmony returns to the same comfortable upper-hand register.
hop_voicings={'G':[71,74,79],'Em':[71,76,79],'C':[72,76,79],'D':[69,74,78]}
a=part('Marimba descending chords',12,0,58,90,'chords');b=part('Marimba steady bass',12,1,68,94,'bass')
for bar,harmony in enumerate(HARMONY):
 keys=hop_voicings[harmony][:]
 for q in range(4):
  if q>=2:keys=sorted([keys[-1]-12,*keys[:-1]])
  for i,key in enumerate(keys):n(a,bar*4+q,key,.30,60+[0,-5,-2,-6][q]-[2,4,0][i])
  n(b,bar*4+q,ROOTS[harmony]+12,.38,65 if q%2==0 else 57)
make('hop','One-Foot Bounce','Marimba chords, steady bass and random boings · springy hops',[a,b])

# JUMP: grounded two-foot landings, answered by a little wooden melody.
mel=[[2,4],[5,4],[3,2],[1,-1]]
a=part('Marimba jumping tune',12,0,56,98,'melody');b=part('Low pizzicato landings',45,1,75,96,'bass');d=part('Landing drum and vibraslap',0,9,64,82,'percussion')
for bar,h in enumerate(HARMONY):
 phrase(a,bar,mel[bar],base=67,rhythm=[0,2],duration=.55,velocity=85)
 for q in [0,2]:
  n(b,bar*4+q,ROOTS[h],.44,77 if q==0 else 67);n(d,bar*4+q,36,.15,73)
  n(d,bar*4+q,58,1.4,63 if q==0 else 57) # GM percussion: vibraslap, beats 1 and 3.
make('jump','Two Feet Together','Marimba, plucked strings and vibraslap · jump, land, reset',[a,b,d])

# SLIDE: connected flute phrases over smooth strings, with a quiet side-together pulse.
# G: D C B A | Em: G A B D | C: E D C B | D: A B C E.
# All four measures share the same side-together rhythm; final notes are 2–3–4–6.
mel=[[4,3,2,1],[0,1,2,4],[5,4,3,2],[1,2,3,5]]
a=part('Gliding flute',73,0,53,88,'melody');s=part('Soft bowed strings',48,1,77,71);b=part('Sustained low bass',43,2,64,74,'bass');d=part('Gentle cabasa',0,9,71,53,'percussion')
for bar,h in enumerate(HARMONY):
 phrase(a,bar,mel[bar],base=79,rhythm=[0,1.25,2,3.25],duration=[1.18,.68,1.18,.65],velocity=67)
 chord(s,bar*4,[k+12 for k in VOICINGS[h]],3.75,48);bass(b,bar,'long')
 for q in [0,2]:n(d,bar*4+q,69,.09,38);n(d,bar*4+q+1,69,.07,24)
make('slide','Silk Ribbon','High flute and bowed strings · smooth side-together phrases',[a,s,b,d])

# STOP is a single G6/9 vibraphone chord, never a repeating movement loop.
v=part('Freeze vibraphone chord',11,0,64,92,'chord')
for key,velocity in [(55,58),(59,62),(64,56),(69,65)]:n(v,0,key,2.4,velocity)
TRACKS.append(dict(id='stop',title='Freeze & Shimmer',feel='One warm G6/9 vibraphone chord · let it fade, then freeze',bpm=BPM,bars=2,beats=8,seconds=4.8,key='G major',loop=False,parts=[v]))
