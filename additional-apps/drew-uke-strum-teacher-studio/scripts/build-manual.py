"""Create the customer-facing Pro manual from the shipped controls and behavior."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/help/Teacher-Studio-Manual.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
for name,file in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(ROOT/'dist/assets/fonts'/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Body',boldItalic='Bold')
INK=HexColor('#173f49'); TEAL=HexColor('#087f85'); PALE=HexColor('#e8f5ef'); MUTED=HexColor('#526f77'); GOLD=HexColor('#e9b952')
C=canvas.Canvas(str(OUT),pagesize=(612,792))
C.setTitle("Mr. Drew's Uke Strum - Teacher Studio Pro Manual")
C.setAuthor('Drew Wichman')
C.setSubject('Song creation, notation, classroom playback, PDF printing, video export, and backups')
Y=0; PAGE=0
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.6,leading=15.5,textColor=INK,spaceAfter=0),
 'small':ParagraphStyle('small',fontName='Body',fontSize=9,leading=13,textColor=MUTED),
 'table':ParagraphStyle('table',fontName='Body',fontSize=9.6,leading=14,textColor=INK),
}
def p(text,style='body',gap=9,x=46,w=520):
    global Y
    q=Paragraph(text,styles[style]);_,h=q.wrap(w,700)
    if Y-h<53: raise ValueError(f'Page {PAGE} overflows: {text[:70]} at {Y-h}')
    q.drawOn(C,x,Y-h);Y-=h+gap
def h(text):
    global Y
    Y-=5;C.setFillColor(TEAL);C.setFont('Bold',12.7);C.drawString(46,Y-14,text);Y-=24
def box(text):
    global Y
    q=Paragraph(text,styles['body']);_,height=q.wrap(488,700)
    if Y-height-25<53: raise ValueError(f'Page {PAGE}: box overflow')
    C.setFillColor(PALE);C.roundRect(46,Y-height-23,520,height+23,9,fill=1,stroke=0)
    q.drawOn(C,62,Y-height-11);Y-=height+35
def table(rows,widths=(147,373)):
    global Y
    data=[[Paragraph(str(cell),styles['table']) for cell in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),PALE),('LINEBELOW',(0,0),(-1,0),.7,TEAL),('LINEBELOW',(0,1),(-1,-1),.4,HexColor('#cddedb')),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    _,height=t.wrap(520,700)
    if Y-height<53:raise ValueError(f'Page {PAGE}: table overflow')
    t.drawOn(C,46,Y-height);Y-=height+13
def start(title,subtitle=''):
    global Y,PAGE
    if PAGE:C.showPage()
    PAGE+=1;C.bookmarkPage('p'+str(PAGE));C.addOutlineEntry(title,'p'+str(PAGE),0)
    C.setFillColor(TEAL);C.rect(0,784,612,8,fill=1,stroke=0)
    C.setFillColor(MUTED);C.setFont('Bold',8);C.drawString(46,754,'MR. DREW\'S UKE STRUM  /  TEACHER STUDIO PRO')
    C.setFont('Bold',25);C.setFillColor(INK);C.drawString(46,713,title)
    Y=689
    if subtitle:p(subtitle,'small',gap=19)
    C.setStrokeColor(HexColor('#cadcda'));C.line(46,40,566,40)
    C.setFont('Body',8);C.setFillColor(MUTED);C.drawString(46,25,'Created by Drew Wichman  |  October 2026');C.drawRightString(566,25,str(PAGE))

start('Make a song. Share the music.','Your practical guide to Teacher Studio Pro - professional edition')
C.drawImage(str(ROOT/'dist/assets/collage/uke-strum-logo.png'),415,525,width=150,height=150,preserveAspectRatio=True,anchor='c',mask='auto')
p('Ukulele chords, a classroom band, a simple melody score, student practice sheets, and composition videos.',w=347)
p('<b>Created by Drew Wichman</b>',gap=25,w=347)
h('Open the downloaded edition')
p('Extract the whole ZIP folder first. Open <b>Open-Uke-Strum-Pro.html</b> in your desktop web browser. Keep the <b>help</b> folder beside it so the manual links work. Press the welcome button, then Play to enable sound.',w=350,gap=16)
box('<b>Your first five minutes:</b> Choose a starter on <b>Play</b> → lower the tempo → press <b>Let’s Play!</b> → try a chord edit in <b>Chords</b> → choose <b>Save song</b>. Use <b>Practice sheet</b> for a take-home PDF.')
h('Find what you need')
table([
 ['<b>Page</b>','<b>Task</b>'],
 ['2','Build chord changes and lyric phrases'],['3','Enter and edit melody notes'],['4','Add syllables, chord symbols, and swing'],['5','Present the song and adjust the band'],['6','Teach, rehearse, save, and share'],['7','Print practice sheets and melody scores'],['8','Design the opening, ending, and transitions'],['9','Render and download a video'],['10','Solve common problems and use shortcuts'],
],(65,455))

start('Build your arrangement','A chord arrangement is the accompaniment your students strum and sing with.')
h('1. Choose a starting point')
p('Use the <b>Play</b> tab to choose a starter, or select <b>New Song</b>. Enter a name, meter, tempo, number of measures, starting chord, and optional lyrics pickup. Select <b>Create song</b>. New songs begin with your chosen chord in every measure.')
h('2. Change the chords')
p('Open <b>Chords</b> and select a measure. In its edit panel, choose the chord at the start. Add changes at a beat or an “and” as needed. <b>Rest</b> means silence. A chord stays in effect until the next change. Use the displayed diagram for standard high-G G-C-E-A tuning.')
p('Use <b>+ Measure</b>, <b>Duplicate selected</b>, or <b>Copy last 4</b> to extend the arrangement. <b>Undo edit</b> reverses the last arrangement or melody edit. Song sections can organize verses and choruses; see page 6.')
h('3. Place singing phrases')
p('Type a phrase in the selected measure’s lyric field. Choose its starting beat and how many measures it lasts. For several phrases, select <b>Add lyric lines</b>, put one phrase on each line, and choose <b>Measures per line</b>. This replaces cues in the affected area, so use Undo if needed.')
p('<b>Lyrics pickup</b> starts the words before their selected beat. Choose None, half a beat, one beat, or two beats early. Individual phrases can override the song setting. Pickups move the words; they do not move the chords or count-in.')
h('4. Set the musical feel')
p('Choose a strumming pattern that fits the meter, set the tempo, and choose a straight or swung <b>Feel</b>. The main arrangement feel controls the band. Melody has its own feel slider until you use <b>Use score &amp; present</b>.')
box('<b>Counting:</b> 2/4 starts with four beats. In 6/8, tempo uses dotted-quarter beats and the count-in says “1, 2, Ready, Sing” (or “Play” without lyrics). Ordinary eighth-note subdivisions read 1 &amp; 2 &amp; 3 &amp; 4 &amp;.')
p('Select <b>Save song</b> when you want to keep a named version in My songs. Export JSON for a backup outside the browser (page 6).','small')

start('Write the melody','A single treble line helps students remember the tune and sing while they strum.')
h('1. Add notes without precise horizontal aiming')
p('Open <b>Melody</b>. Choose <b>Add notes</b> and a note length. Tap a pitch anywhere on the staff, or choose an octave and press a large <b>C D E F G A B</b> button. Notes are placed next in the measure, in order. A hover guide shows the pitch before you click.')
p('Use <b>+ Rest</b> for a rest of the selected length. Toggle <b>Dotted</b> to add half of the note’s value. Choose an accidental when needed. Whole, half, quarter, eighth, and sixteenth notes and rests are available; there is no thirty-second-note entry button.')
C.drawImage(str(ROOT/'docs/manual-figures/melody.png'),46,Y-177,width=520,height=177,mask='auto');Y-=187
p('Example: eight eighth notes fill one 4/4 measure. Chords appear above; syllables sit below their notes.','small',gap=10)
h('2. Change a note')
p('Select <b>Edit notes</b>, then click anywhere in a note’s column. Use the pitch buttons or the inspector to change pitch, accidental, length, dot, or lyric. Arrow Up/Down adjusts a selected pitch one staff step. <b>Delete note</b> removes it. Switch back to Add notes to keep composing.')
h('3. Move around the score')
p('Use the measure arrows or numbered measure strip. <b>+ Measure</b>, <b>Duplicate measure</b>, and <b>Delete measure</b> change the score. The editor starts at 110% zoom; use <b>+</b> and <b>-</b> for comfort. Undo and redo restore melody and linked chords together.')
box('<b>Measure fit:</b> Notes cannot overfill a measure. Empty space displays and prints as rests. When a measure is full, adding the next note advances to the next measure. The score supports up to 128 written measures. Existing short notes in older files are preserved.')

start('Words, chords, and swing','Keep the melody readable and the accompaniment connected.')
h('Put syllables under notes')
p('In Edit notes, select a note and enter a word or syllable in <b>Lyric / syllable</b>. Press Enter to move to the next melody note. For a whole line, open <b>Lyrics for this melody</b>, paste your words, and choose <b>Place lyrics from selected note</b>. Spaces move to the next note; hyphens split syllables, as in “Twink-le”. Rests are skipped.')
h('Edit the chord symbols')
p('Open <b>Ukulele chord symbols</b>. Choose a chord and position, then <b>Set chord</b>. Click a chord chip to remove that change. Changes use beats and “ands”. In band-supported meters, edits in Melody or Chords update the accompaniment, presentation, and newly generated PDFs and videos.')
p('If you remove a change, the previous harmony may continue. Use Rest when you want silence. Already downloaded PDFs and videos are finished files: export them again after changing the song.')
h('Choose score options')
table([
 ['<b>Setting</b>','<b>What it does</b>'],
 ['Meter','2/4, 3/4, 4/4, 6/8, and cut time (2/2) work with the band. 5/4 and 7/8 support notation, Listen, and score PDFs.'],
 ['Key signature','Sets default sharps/flats. Explicit accidentals override them for the measure.'],
 ['Tempo','Uses the labeled beat unit. Cut time with the band: half note = 40-100.'],
 ['Composer / numbers','Optional composer credit and printed measure numbers.'],
 ])
h('Add swing without rewriting the notes')
p('Write ordinary eighth notes, then move <b>Melody feel</b> from Straight toward Swing or Strong. Listen to the result. Dotted rhythms and sixteenth notes remain as written. Compound/odd eighth-note meters keep their written feel.')
p('<b>Listen</b> previews the melody by itself. <b>Use score &amp; present</b> applies the score’s meter, tempo, swing, measure count, and syllable-derived lyric cues to the accompaniment, adds a final strum, and opens the stage. This action can be undone.','small')

start('Present and play','Keep the class looking ahead while you control the music.')
h('Open the classroom stage')
p('On Play, choose <b>Let’s Play!</b>, or use <b>Classroom view</b>. The stage shows the current chord, next chord with its filling bar, words or sheet music, beat cues, and the strumming hand. Lower the tempo before starting a difficult change.')
p('Choose <b>Play once</b>, <b>Play twice</b>, or <b>Loop</b> in More options or on the stage. Play once is the default. Play twice means two total performances. The count-in happens once. A final chord rings at the end; looping returns to the song body until you turn looping off.')
h('Read the melody while strumming')
p('In Melody, enter notes and use <b>Use score &amp; present</b>. Enable <b>Sheet music in presentation</b> to show the score. The active note and syllable highlight with the music. Two fixed lines alternate: while one plays, the other prepares the next measure. Read the Playing and Up next labels.')
p('<b>Hear melody guide</b> adds a quiet guide sound. Turn it off when students should sing the tune independently. Notes must be entered first; starter songs do not automatically contain transcribed melodies.')
h('Adjust the backing band')
p('Open <b>Band</b> / <b>Build your band</b>. Select an arrangement or a simpler style. Adjust ukulele, bass, drums, shaker, and mallet levels. Turning Band off leaves ukulele accompaniment. Try a gentle mix while teaching, then bring the band back for the performance.')
h('Choose a scene or second display')
p('Open <b>Stage</b> for Sunny Beach, Sunset Stage, or Moonlight Lagoon. <b>Open student display</b> opens a separate window. Move it to your projector and use Full screen there. Press Play in the original teacher window; controls and sound stay with the teacher.')
box('<b>Downloaded app:</b> Some browsers restrict communication between local-file windows. If the separate display waits for the teacher, present Classroom view in the main window instead. This also avoids popup blockers.')
p('Space pauses/resumes; Left/Right moves by a measure on the stage; Esc exits. Restart returns to the beginning. More options controls lyrics, diagrams, the strumming hand, metronome, background motion, volume, and optional MIDI output.','small')

start('Teach, rehearse, and save','Build a repeatable lesson and keep copies of your work.')
h('Practice before performing')
p('The <b>Teach</b> tab offers <b>Teach this song</b>, a guided progression through chords, changes, strumming, and performance. <b>Chord challenge</b> lets you award class stars as students succeed. These are teacher-led tools; they do not listen to or grade student playing.')
p('In Chords, expand <b>Practice a passage</b>. Set From measure and Through, choose Repeat passage if wanted, and press Practice. Choose <b>Whole song</b> to leave the passage. Use <b>Arrange sections</b> to label, copy, and reorder verses or choruses; linked melody measures follow their arrangement positions.')
h('Build a class setlist')
p('Open <b>Class setlists</b> in Teach to collect songs for a lesson. Add the current song and arrange the order. Setlists have their own export/import controls. A setlist is a lesson sequence; song JSON is an editable song backup.')
h('Save a named song')
p('Select <b>Save song</b>, give it a name, and confirm. Find it under <b>My songs</b>. The app also remembers a working draft, but a draft is not a separate permanent copy. Save again after making edits. Export a JSON backup before editing when you want to keep an earlier version.')
h('Make a backup you can move')
table([
 ['<b>Control</b>','<b>Result</b>'],
 ['Export current song','One editable JSON file with the song, notation, and settings.'],
 ['Export my songs','A JSON collection of named songs saved in this browser.'],
 ['Import song file','Adds imported songs to My songs. Select an imported song to open it.'],
 ],(151,369))
p('Find these under <b>More options → Import &amp; export</b>. Export before switching browsers/computers, moving the downloaded HTML, clearing browser data, or installing an updated copy. JSON files are editable backups, not printable music or playable videos.')
p('<b>Share song:</b> Preview links need access to the hosted Site. A <b>Portable song player</b> is a separate single-song classroom player with artwork and instruments; it does not include the Pro editor/export tools. Share JSON for editing, PDF for printing, and video for watching.','small')

start('Print music for students','Choose the sheet that matches the assignment.')
table([
 ['<b>Practice sheet</b>','<b>Melody score</b>'],
 ['Chord changes, finger diagrams, phrase-level lyrics, strumming reminders, and a weekly routine.','Treble-clef notation, syllables aligned under notes, ukulele chord symbols, and optional measure numbers.'],
 ['Open the Practice sheet button in the Teacher Studio toolbar.','Open Melody → Preview / print score.'],
 ],(260,260))
h('Create a take-home practice sheet')
p('<b>1.</b> Open the song, then select <b>Practice sheet</b>.<br/><b>2.</b> Choose Lyrics, Chord diagrams, Strumming pattern, and Practice checklist as needed.<br/><b>3.</b> Add a practice goal and teacher note. Choose <b>Ink-saver edition</b> for grayscale.<br/><b>4.</b> Select <b>Preview PDF</b> to inspect the page, or <b>Download PDF</b>.<br/><b>5.</b> Use the downloaded file or <b>Open / print PDF</b> to print.')
p('Every chord change retains its beat position. Phrase lyrics sit beneath their matching measures. The practice sheet does not guess which individual word belongs to each chord; use the melody score when exact syllable-to-note alignment is needed.')
h('Create a notation score')
p('<b>1.</b> Enter the melody and place syllables under its notes.<br/><b>2.</b> Check chord symbols and Score options. Add the composer and choose Print measure numbers.<br/><b>3.</b> Select <b>Preview / print score</b>.<br/><b>4.</b> Inspect each page, then <b>Download PDF</b> or <b>Open / print PDF</b>.')
p('Empty beats print as rests. Longer scores continue onto additional pages. Chord symbols and notation reflect the current score at the moment the PDF is generated. Swing is identified in the score when applicable.')
box('<b>Before sending home:</b> Check chord changes, lyric spelling, and page breaks. Print one test sheet. Give a specific goal, such as “Change from C to F without stopping.”')
h('If the preview is blank')
p('Try Download or Open / print in a separate tab or PDF viewer. Allow downloads if asked. Long scores may take a moment. Regenerate the PDF after changing the song.','small')

start('Give the video its own style','Your song title and credits belong in the video. The app adds no watermark.')
h('Open Video studio')
p('Choose the song, check its tempo and mix, then select <b>Video studio</b>. Enter a <b>Video title</b>, optional <b>Composed by</b> and <b>Performed by</b> credits, and a <b>Closing message</b>. Use students’ preferred display names if they are sharing compositions.')
p('The opening and ending use ocean-colored display lettering with animated words. Choose how many seconds the title and ending stay on screen. The three storyboard buttons preview the opening, song, and ending; <b>Preview full video</b> plays the complete sequence with sound.')
h('Choose a transition')
table([
 ['<b>Effect</b>','<b>What you will see</b>'],
 ['Paper collage','Pieces of the outgoing scene lift and rotate away.'],
 ['Curling surf wave','A curling turquoise crest and foam sweep across the screen.'],
 ['Palm-leaf curtain','Layered palm fronds close, then reveal the next scene.'],
 ['Sand lettering','The title breaks into drifting grains as the next scene appears.'],
 ['Ocean wave','A broad ocean wipe.'],
 ['Gentle fade','A soft dark transition between scenes.'],
 ['Page turn','A shaded page curls away.'],
 ['Soft iris reveal','A circular opening reveals the next scene.'],
 ],(163,357))
h('Choose what students see and hear')
p('Set <b>Play-throughs</b>: 1 plays once, 2 plays twice, and so on. The count-in happens only before the first pass, and the final chord happens after the last pass. Enable <b>Include backing band</b> for the full mix or leave it off for ukulele accompaniment.')
p('<b>Show sheet music</b> uses your entered melody. <b>Include melody guide sound</b> adds a guide independently of the displayed score. <b>Adjust the band mix</b> opens the mixer before export. External MIDI is replaced by the built-in instruments for rendering.','small')

start('Render and download the video','Wait for the completed download link; preview playback does not save a file.')
h('Fast MP4 render')
p('<b>1.</b> Choose <b>Quality</b>: 1080p for Full HD, or 720p for a smaller export.<br/><b>2.</b> Choose <b>Motion quality</b>: 60 fps is the default; 30 fps is available.<br/><b>3.</b> Leave <b>Export method</b> on Fast MP4 render.<br/><b>4.</b> Select <b>Export video</b> and watch the progress and rendering-speed display.<br/><b>5.</b> When <b>Download video</b> appears, watch the result, then download it.')
p('Fast rendering creates frames without waiting for the song to play in real time. Speed depends on your device, video length, and browser encoder support. The output is MP4 with H.264 video and AAC audio. The app checks the file’s dimensions, codecs, and duration before offering it.')
box('<b>Play-throughs are total performances.</b> For a song that should play once with no repeat, choose 1. Long arrangements with many passes can become large; the app limits fast exports to 15 minutes and approximately 450 MiB.')
h('If fast MP4 is unavailable')
p('Read the displayed message first. Try 720p, fewer play-throughs, or 30 fps if resources are limited. If the browser cannot encode the needed format, choose <b>Live recording</b>. This fallback takes the full video length. Keep the tab visible and the computer awake until it finishes.')
p('Live recording may offer MP4 or WebM depending on browser support. If the result is WebM, it is not an MP4: renaming the extension does not convert it. Choose actual MP4 output for destinations that require it. Upload acceptance is ultimately controlled by the receiving service.')
h('Check your finished composition')
p('Play the downloaded file from beginning to end. Check the title, credits, count-in, repeat count, guide sound, chord/lyric alignment, transition, and ending. A file already downloaded does not update when you edit the song. Render a new copy after changes.')
h('Cancel or recover')
p('<b>Cancel</b> discards an unfinished export and restores editing. If export fails, keep the error message, make a smaller test video, and export your song JSON before refreshing. Live recording can stop if its tab becomes hidden or audio is interrupted.')
p('The PDF manual, artwork, samples, fonts, and export libraries are included with the download. Actual encoding support and achieved speed still depend on the browser and hardware.','small')

start('Quick fixes and shortcuts','Start with the symptom, then try the smallest useful change.')
table([
 ['<b>What happened?</b>','<b>Try this</b>'],
 ['No sound','Click Play to enable audio. Check device/browser volume and the band sliders. If sampled sounds failed, open Band and use Retry. Disconnect unwanted MIDI output or choose Built-in ukulele.'],
 ['Notes are hard to add','Use Add notes and the letter buttons. Switch to Edit notes only to change an existing note. Increase zoom; select the octave before adding.'],
 ['The measure will not accept a note','Check the beats remaining and selected length/dot. Shorten the note or move to another measure. Full bars advance on the next added note.'],
 ['Chords or timing disagree','Use a supported band meter and beat/eighth-note chord positions. Chords sync automatically; Use score &amp; present applies melody tempo/swing. Regenerate old PDF/video exports.'],
 ['No sheet music in the video','Enter melody notes, use Use score &amp; present, then enable Show sheet music in Video studio. Starter chords do not create a melody automatically.'],
 ['A saved song is missing','Check My songs in the same browser and app location. Import a JSON backup if you changed computers, cleared browser data, or moved the downloaded app.'],
 ['The manual will not open','Extract the ZIP and keep help/Teacher-Studio-Manual.pdf next to the app in its help folder. Open that PDF directly if the in-app link is blocked.'],
 ['The app opens as text or ZIP contents','Extract first. Open the .html file in a web browser, not a text editor or the ZIP preview.'],
 ],(164,356))
h('Keyboard reminders')
p('<b>Playback:</b> Space = play/pause; Left/Right = previous/next measure on the stage; Esc = exit the stage.<br/><b>Melody staff focused:</b> A-G = pitch; R = rest; Up/Down = adjust a selected pitch; Delete/Backspace = delete the selected note.<br/><b>Lyric box:</b> Enter moves to the next melody note.','small',gap=8)
p('<b>Keep a JSON backup.</b> Browser-local saving is convenient, but exported song files are the way to preserve work outside that browser. The included third-party-notices folder retains the font, sound, and library licenses.','small')
C.save()
print(f'{OUT} | {PAGE} pages | {OUT.stat().st_size:,} bytes')
