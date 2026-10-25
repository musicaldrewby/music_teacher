#!/usr/bin/env python3
"""Rebuild the retail user guide and quick start. Requires reportlab and Pillow."""
from pathlib import Path
import sys
from xml.sax.saxutils import escape
from PIL import Image as PILImage
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'docs/manual'
OUT.mkdir(parents=True,exist_ok=True)
for n,f in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Italic','DejaVuSans.ttf')]:
    pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Italic',boldItalic='Bold')
INK=colors.HexColor('#203c34'); GOLD=colors.HexColor('#9b783c'); PALE=colors.HexColor('#eff3ee'); GRAY=colors.HexColor('#56615a')
W,H=612,792; WIDTH=516
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10,leading=13.5,spaceAfter=6,textColor=INK),
 'small':ParagraphStyle('small',fontName='Body',fontSize=8.3,leading=12,spaceAfter=6,textColor=GRAY),
 'h1':ParagraphStyle('h1',fontName='Bold',fontSize=24,leading=27,spaceAfter=10,textColor=INK),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=12,leading=15,spaceBefore=8,spaceAfter=5,textColor=INK),
 'lead':ParagraphStyle('lead',fontName='Body',fontSize=11,leading=15,spaceAfter=10,textColor=INK),
 'table':ParagraphStyle('table',fontName='Body',fontSize=9,leading=12,spaceAfter=0,textColor=INK),
 'eyebrow':ParagraphStyle('eyebrow',fontName='Bold',fontSize=9,leading=12,spaceAfter=10,textColor=GOLD),
}
P=lambda s,style='body':Paragraph(s,styles[style])
story=[]; titles=[]
def page(title,sub=None):
    if story: story.append(PageBreak())
    titles.append(title)
    story.extend([P('USER GUIDE  /  OCTOBER 24, 2026','eyebrow'),P(title,'h1')])
    if sub:story.append(P(sub,'lead'))
def para(s):story.append(P(s))
def head(s):story.append(P(s,'h2'))
def steps(items):
    for i,s in enumerate(items,1):story.append(P(f'<b>{i:02d}.</b>  {s}'))
def bullets(items):
    for s in items:story.append(P('•  '+s))
def box(title,s):
    t=Table([[P(title,'h2')],[P(s)]],colWidths=[WIDTH-24]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,0),0),('BOTTOMPADDING',(0,-1),(-1,-1),9)]));story.extend([Spacer(1,5),t,Spacer(1,8)])
def table(rows,widths=None):
    data=[[P(str(c),'table') for c in row] for row in rows]
    t=Table(data,colWidths=widths or [WIDTH*.3,WIDTH*.7],hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),PALE),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f7f8f5')]),('LINEBELOW',(0,0),(-1,0),.7,GOLD),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story.extend([t,Spacer(1,10)])
def screenshot(name,caption,maxh=275):
    p=ROOT/'docs/qa'/name
    im=PILImage.open(p); scale=min(WIDTH/im.width,maxh/im.height)
    story.extend([Image(str(p),width=im.width*scale,height=im.height*scale),Spacer(1,5),P(caption,'small'),Spacer(1,6)])

def footer(c,d):
    c.saveState();c.setStrokeColor(GOLD);c.setLineWidth(.6);c.line(48,45,564,45)
    c.setFont('Body',8);c.setFillColor(GRAY);c.drawString(48,30,'Mallet & Measure  •  User guide  •  October 24, 2026');c.drawRightString(564,30,str(d.page));c.restoreState()
def build(path,items):
    doc=SimpleDocTemplate(str(path),pagesize=(W,H),rightMargin=48,leftMargin=48,topMargin=43,bottomMargin=58,title='Mallet & Measure - '+('Start Here' if 'START' in path.name else 'User Manual'),author='Drew Wichman',subject='Full downloadable edition - October 24, 2026')
    doc.build(items,onFirstPage=footer,onLaterPages=footer)

page('Mallet &amp; Measure','The Orff Ensemble Studio<br/><b>User manual · Full downloadable edition</b>')
para('Create a melody. Build an accompaniment. Hear your ensemble.<br/>Students and teachers use the same tools to compose, listen, revise, and share music.')
screenshot('direct-console-20261024.jpg','The sequencer: instrument parts above, notes in the center, transport below. Example composition shown.',205)
para('<b>Created and developed by Drew Wichman</b><br/>Orff-Schulwerk certified music teacher')
head('Find what you need')
table([
 ['<b>Getting started</b>','<b>Composing and sharing</b>'],
 ['2  What’s new\n<br/>3  Install and update<br/>4  Find your way around<br/>5  Save and protect your work','6–7  Sequencer and note lengths<br/>8–9  Staff entry, chords, and selections<br/>10–11  Recording and MIDI<br/>12  Sections and song form'],
 ['18  A student’s first composition<br/>19  Troubleshooting and shortcuts<br/>20  Instrument reference','13–14  Notation, expression, and rehearsal<br/>15  Mix your ensemble<br/>16  Print scores and parts<br/>17  Export music and video']
],[WIDTH/2,WIDTH/2])
story.append(P('No MIDI keyboard is required. Begin with a mouse, a desktop or laptop, and speakers or headphones.','small'))

page('What’s new in this version','October 24, 2026 · A practical guide to the latest composing and workflow tools.')
head('Write and revise directly on the staff')
bullets(['Use <b>Notes</b>, <b>Rests</b>, and fixed note values. Each entry advances by its chosen length.', '<b>Add to chord</b> places two or more pitches at the same beat for borduns and harmonies.', 'Select notes to change their values, add dots or ties, delete a group, copy and paste phrases, or clear a measure without moving the next measure.'])
head('Shape a phrase and hear it immediately')
bullets(['Add dynamics, accents, staccato, tenuto, crescendos, and recorder phrasing in <b>Musical expression</b>.', '<b>Hear selection</b> and <b>Loop selection</b> audition the selected part. <b>Instrument + score</b> connects notation with its bars, playing strokes, or recorder fingering.', '<b>Focus</b> makes room for music. <b>Entry &amp; edit tools</b> opens the detailed controls when needed.'])
head('Edit comfortably in the sequencer')
bullets(['Separate <b>Write</b>, <b>Select</b>, and <b>Erase</b> tools; phrase selection, duplication, and transposition.', 'Drag a selected note’s right edge to change its duration. Use <b>Note details</b> to separate played length from written length.', 'The notes stay in a bounded workspace. Part switching remembers each part’s grid position during the session. <b>Section bars</b> and <b>Undo take</b> stay visible in the bottom console without opening a menu.'])
head('Arrange, save, and share')
bullets(['All parts share a section length. Repeat a pattern to fill a section, extend with a choice of repeated or empty measures, and arrange reusable sections.', '<b>Named versions</b> saves milestones in this browser. Download important versions for portable backups. If storage is blocked, the app still opens and score-view controls work for the session.', 'Preview real PDF pages, hide inactive ensemble staves, and choose line and page breaks. <b>Classroom package</b> gathers scores and rehearsal audio in one ZIP.', 'Preview the first four measures of a video and choose <b>Large notation</b> or <b>Large instrument</b>.'])
story.append(P('These instructions cover the current full edition, including recent recording, saving, notation, and workspace improvements.','small'))

page('Install, launch, and update','Keep the complete software folder together. The HTML launch file needs its accompanying files.')
head('First installation')
steps(['Download the buyer ZIP. On Windows, choose <b>Extract All</b>. On macOS, double-click the ZIP to extract it. Open the extracted folder, not a preview inside the ZIP.', 'Move the whole <b>Mallet-Measure</b> folder to a location you will keep, such as <b>Documents / Music Teaching / Mallet-Measure</b>. The Desktop is also fine if convenient.', 'Open <b>Software / Open-Mallet-Measure.html</b> in a desktop browser. If it opens as text, use <b>Open with</b> and select your browser.', 'Click to enter the studio and play an instrument. Browsers require a user action before starting sound.'])
head('What to keep together')
table([['<b>Item</b>','<b>Purpose</b>'],['Software','The working app, artwork, sounds, fonts, and supporting code. Keep all its contents together.'],['Examples','An editable copy of My Orf Assignment. The same demo is available inside the app.'],['Manual and START-HERE','User instructions. You may keep a separate reading copy.'],['Notices and Source','Third-party notices and supporting source files. You do not need to edit them to use the app.']])
head('Install an update without losing music')
steps(['In your current app, choose <b>Project → Download project</b> for each composition you want to keep.', 'Extract the new ZIP into a separate folder. Keep the old folder until you confirm the new copy works. Do not mix files from different releases.', 'Launch the new HTML file, then choose <b>Project → Open a project file…</b> and select your saved <b>.orff</b> file. Save a new backup after checking it.'])
box('Good folder habits','Keep compositions in a separate folder such as <b>Documents / Student Compositions</b>. Avoid running the app from inside a ZIP, a temporary Downloads cleanup location, or a cloud folder whose files are only online. School-managed devices may require technology staff to allow local HTML and JavaScript.')

page('Find your way around','Choose an activity at the top. The transport stays at the bottom.')
table([['<b>Workspace</b>','<b>Use it for</b>'],['Play','Browse the pictured instrument collection, audition sounds, and record a performance. Stars keep frequently used instruments in Favorites.'],['Compose → Sequencer','Place and edit notes on a pitch-and-time grid. Choose a part tab before writing.'],['Compose → Song Builder','Create sections and arrange them into a complete form.'],['Compose → Score','Write on the staff, revise rhythms, add expression, and prepare printed music.'],['Rehearse','Watch the ensemble or practice a selected part with its accompaniment.'],['Mixer','Balance instrument levels, pan, and effects in one view.'],['Project / Export','Save editable projects or create audio, sheet music, video, and classroom packages.']])
head('Read the transport')
para('<b>Play/Pause</b> starts or pauses; <b>Stop</b> ends playback; <b>Return to start</b> moves back to the beginning. <b>Record</b> captures notes into the selected part. The display shows the current measure and beat.')
para('<b>Section / Full song</b> chooses what you hear. <b>Tempo</b> sets quarter-note beats per minute, <b>Meter</b> sets the time signature, <b>Grid</b> opens recording settings, and <b>Click</b> toggles the metronome. <b>Section bars</b> and <b>Undo take</b> are always visible in the bottom console. Undo take becomes available after recording.')
para('<b>Open mixer</b> reveals a quick mixer over the workspace. Close it to uncover your music. <b>Full mixer</b> opens the complete mixing desk. The output control changes the overall level.')
box('Editing and playback can have different scopes','The section shown as <b>Editing</b> is where new notes and recordings go. Full-song playback may pass through other sections. Before recording, check both the active part and the section being edited.')
para('In a blank Sequencer or Score, choose <b>Add an instrument</b>, <b>+ Instrument</b>, or <b>Choose your first part</b>. The pictured chooser adds the selected instrument as a part and returns you to composing. Opening an instrument from Play is primarily for playing it.')

page('Save and protect your work','An editable .orff file is the portable copy of your composition.')
head('Name the composition and composer')
para('Edit the session title in the sidebar. In <b>Compose → Score → Score appearance &amp; composer</b>, enter the composer’s name. New sessions begin with a blank composer field. The software credit identifies Drew Wichman as the developer; it does not make him the composer of your students’ music.')
head('Three ways to keep your work')
table([['<b>Method</b>','<b>What it does</b>'],['Automatic saving','Keeps the session in this browser on this device. Watch the save status. It is not a cloud account or a transferable backup.'],['Project → Download project','Downloads a .orff file containing editable music and mix settings. Use this to submit work, move devices, or keep a backup.'],['Project → Named versions','Saves named milestones in this browser, such as “First melody” or “After feedback.” Restore a version or download an important one.']])
head('A dependable classroom routine')
steps(['At the start, choose <b>Project → Open a project file…</b> if continuing saved work. Select the student’s .orff file.', 'Before a major revision, save a named version or download a copy with a meaningful filename.', 'At the end, choose <b>Download project</b>. Confirm that the file is in the browser’s download location, then move it to the student’s work folder.'])
para('<b>Named versions</b> keeps up to 20 milestones for a project in this browser. Restoring a milestone saves a before-restore copy first. A downloaded .orff file carries the composition, but not the browser’s entire milestone history.')
box('Do not rely on browser storage alone','Clearing browser data, private browsing, changing browsers, or moving the app can make local saves unavailable. If a storage warning appears, download the project immediately. <b>Project → Recover previous save</b> can recover the previous browser backup when one exists.')
head('Try the editable demo')
para('Choose <b>Project → Demo library → My Orf Assignment</b>. Open a fresh copy or download its .orff file. Full-song playback follows A–B–A and stops at Fine. Save your own project before opening a demo.')

page('Compose in the sequencer','Rows choose pitch or stroke. Columns choose when a note starts.')
steps(['Choose <b>Compose → Sequencer</b>. Add an instrument, then select its part tab.', 'Set <b>Meter</b> and <b>Tempo</b>. Use <b>Section bars</b> in the bottom console to choose the section length. All parts in this section use that length.', 'Select <b>Write</b>. Choose the <b>Grid</b> spacing and a <b>Note length</b>. Click the pitch row at the beat where you want a note.', 'Press Play to listen. Add another instrument with <b>+ Instrument</b>, then write its part. Use <b>Mute</b> and <b>Solo</b> to check how the parts fit.'])
screenshot('direct-console-20261024.jpg','The active part is Alto xylophone. Select tools stay above the note grid.',235)
table([['<b>Tool</b>','<b>Action</b>'],['Write','Place notes using the chosen note length. Grid controls where starts can land.'],['Select','Choose notes to inspect, move, duplicate, transpose, or resize.'],['Erase','Click a note’s start or its held portion to remove it. Undo restores a mistake.']])
para('Scroll inside the grid to reach another register or later measures. The workspace remembers each part’s grid position during the current session. On its first visit, a part brings its earliest notes into view.')

page('Select notes and edit lengths','Use a small selection for a detail, or a phrase selection for a larger change.')
head('Select and reshape a phrase')
para('Choose <b>Select</b> and click a note. <b>Shift-click</b> extends the range. <b>Ctrl-click</b> on Windows or <b>Command-click</b> on Mac adds notes; <b>Add to selection</b> is an on-screen alternative. Use <b>Select all</b> or <b>Deselect</b> when needed.')
para('The phrase toolbar can move notes by one grid step, transpose to another available pitch, duplicate the selection, or delete it. Check the available space before duplicating. Use Undo if the result is not what you intended.')
head('Drag a note longer or shorter')
steps(['Select one note, then drag its <b>right-edge handle</b> left or right.', 'The edge follows the current grid. Choose a finer grid when you need smaller adjustments.', 'Release to apply. Arrow keys on the focused handle also adjust length; Escape cancels a drag.'])
para('A resize stops at the next note in the same voice or the section boundary. This is why different notes may have different room to grow. It changes the played and written lengths together and does not push later notes forward.')
head('Use Note details for precise corrections')
table([['<b>Control</b>','<b>Meaning</b>'],['Played length','How long the performance holds a note. Most useful for recorder articulation and MIDI-held notes.'],['Written length','The rhythm used in the score. Set it independently to keep a short performance legible as a quarter note, for example.'],['Pitch / Beat','The selected note’s pitch or stroke and starting position.'],['Velocity','The note’s played strength. Softer values make a quieter event.']])
box('A short sound is not always a short written note','A recorder can articulate a notated quarter note with a small gap before the next beat. Preserve that performance with <b>Played length</b>, and use <b>Written length</b> for the intended rhythm. Sampled percussion may keep a natural ringing tail rather than stopping at the drawn edge.')
para('<b>Part actions → Clear part</b> removes this part’s notes. <b>Remove part</b> removes the instrument part itself after confirmation. Read the confirmation, especially in a multi-section song; it is not a mute command.')

page('Write directly on the staff','Compose → Score · View: Part · compose · Music: Current section')
steps(['Choose the <b>Part</b> and the section you want to write. If viewing a full ensemble or song, use <b>Write selected part</b> to return to editing.', 'Choose <b>Notes</b> and a value: whole, half, quarter, eighth, or sixteenth. Choose <b>Dot</b> for a dotted value.', 'Set the starting <b>Measure</b> and <b>Beat</b> in <b>Entry &amp; edit tools</b> when needed.', 'Click a pitch on the staff or type <b>A–G</b>. The note is entered at the cursor, and the cursor advances by that note’s length.', 'Choose <b>Rests</b> to enter an intentional rest. Continue with Notes afterward. Use <b>+ Measure</b> if you need more space.'])
box('The chosen value controls the spacing','If Quarter is selected, each new note advances one quarter-note beat. Clicking close to the previous note does not turn the next note into an eighth note. Use the position fields or Shift-click to deliberately reposition the entry cursor.')
head('Useful entry shortcuts')
table([['<b>Key</b>','<b>Action in the score composer</b>'],['N / V / H','Notes / Select / Add to chord'],['2 / 3 / 4 / 5 / 6','Sixteenth / eighth / quarter / half / whole'],['A–G / Enter','Enter a pitch by letter / place the chosen pitch'],['0 / . / T','Enter a rest / toggle a dot / tie next'],['Arrow keys','Move the entry cursor or change pitch as indicated by the score’s keyboard guide.']])
head('Change an existing note value')
para('Switch to <b>Select</b>, click a note, and choose its new note value. Use <b>Dot</b> for a dotted rhythm. This changes its sounding and written length; surrounding rests adjust while later notes stay in place. A longer note cannot simply overwrite the next note. Edit that note or the surrounding space first.')
para('For notation-only correction, use <b>Written length</b> in the note details. Open the on-screen <b>Mouse &amp; keyboard guide</b> for context-specific controls.')

page('Chords, rests, and selections','A bordun is two pitches at the same time. Add to chord keeps the entry cursor on that beat.')
head('Enter a C–G bordun')
steps(['Choose an alto xylophone part, select <b>Notes</b>, choose Quarter, and enter C.', 'Select that C, or use the note just entered. Choose <b>Add to chord</b> or press <b>H</b>.', 'Click G on the staff or type G. The added pitch shares the first note’s start and length. Add further pitches if desired.', 'Choose <b>Next position</b> to continue after the chord. Switch back to Notes for single-note entry.'])
head('Choose silence deliberately')
para('Short recorder releases can be shown with readable note values rather than many tiny rests. When silence is part of your intended rhythm, enter an <b>explicit rest</b> in the score. For example, enter a quarter note, a quarter rest, and two more quarter notes in 4/4.')
para('A <b>tie</b> joins consecutive notes of the same pitch into one sustained note; it does not mean two separate attacks. Use <b>Tie next</b> while entering, and <b>Untie</b> when the selected tie is no longer wanted.')
head('Select more than one thing')
bullets(['In <b>Select</b>, click a note, rest, or measure number. Shift-click extends a range; Ctrl/Command-click adds to the selection. Drag a selection box when helpful.', 'Use <b>Copy</b>, <b>Cut</b>, and <b>Paste</b> for phrases. Set the destination cursor before pasting and check that the phrase fits.', '<b>Delete selected</b> removes selected notes. The following music stays at its existing times.', '<b>Clear measure</b> removes its contents and leaves its duration in place. <b>Remove measure space</b> shortens the section for all parts and shifts later music; use it only when you intend that structural change.'])
box('Listen before you move on','Use <b>Hear selection</b> to check the chosen notes or measures in this part alone. <b>Loop selection</b> repeats them while you assess the phrase. Stop ends the preview without changing your saved mix.')
para('The same notes are shared by Score, Sequencer, and playback. You can write a rhythm on the staff, adjust its performance in the sequencer, and return to the score.')

page('Record a performance','Recording adds notes to the selected instrument part in the section being edited.')
steps(['Choose the instrument part. Set the section length, meter, and tempo before recording.', 'Open <b>Grid</b> in the bottom transport, or <b>Section tools → Recording options</b> in the sequencer.', 'Choose quarter-, eighth-, or sixteenth-note starts. Set the tap/percussion note length and enable the <b>One-measure count-in</b> if desired.', 'Press <b>Record</b> or <b>R</b>. Wait for the count-in, then play with the on-screen instrument, the labeled computer keys, or a connected MIDI keyboard.', 'Press Stop. Listen back, then correct notes in Sequencer or Score. Use <b>Undo take</b> in the bottom console to remove the last recording pass.'])
head('Quantization and articulation are different')
table([['<b>Setting</b>','<b>What it changes</b>'],['Quantize note starts','Snaps the start of each recorded note to the chosen grid. This edition offers quarter, eighth, and sixteenth grids; it does not offer an unquantized start mode.'],['Quantize held note lengths','When on, held lengths also follow the grid. Leave it off to preserve shorter or longer recorder and MIDI releases.'],['Tap / percussion note length','The length assigned to tapped notes. A percussion sample may still ring with its natural decay.'],['Written length','Controls notation separately after recording, so a short performance can still read as a clear musical rhythm.']])
head('Layer parts without losing your place')
para('Select the next part deliberately and check the active section before recording again. Recording layers notes into existing music. It does not replace a previous take automatically, so recording the same phrase again can create doubled notes.')
para('Notes played up to a quarter-second before the first beat are retained on beat 1. Earlier count-in notes are ignored. Use the count-in for a clear start rather than depending on this small allowance.')
box('Settings that are remembered','Grid, tap note length, count-in, and metronome volume are remembered in this browser. The held-length quantization choice belongs to the project. In 6/8, tempo is still quarter notes per minute and the metronome clicks eighth notes.')

page('Use a MIDI keyboard','MIDI is optional. It provides performance input; it is not MIDI-file import or export.')
steps(['Connect the controller to the computer. In the sidebar choose <b>MIDI keyboard → Connect</b>, then allow MIDI access if your browser asks.', 'Choose the correct input and channel in the MIDI panel. If the device is missing, reconnect it and reopen the panel.', 'Enable <b>Automatic instrument octave</b>. Set <b>home C</b> by playing a C in a comfortable keyboard register.', 'Choose an instrument part. The same controller register now maps into that instrument’s own range as you switch between soprano, alto, and bass instruments.', 'Adjust touch response, play a few test notes, and then record.'])
head('Make velocity feel natural')
para('Choose <b>Light</b>, <b>Normal</b>, <b>Firm</b>, or <b>Fixed</b> response and set the strength range. The <b>Keyboard → Played</b> meter shows how incoming strength becomes played strength. Use a gentler curve if comfortable playing sounds too quiet; use Fixed if you want a consistent level.')
para('<b>Dynamic tone</b> darkens softer MIDI strikes as well as changing loudness. At 0%, the usual tone is retained. This is a filter-based response, not a guarantee of separately recorded velocity layers. Recorded notes keep the played strength and tone for playback and audio export.')
head('Instrument behavior')
bullets(['Barred instruments honor their available bars. Notes outside a recorder’s range are not treated as extra pitches.', 'Unpitched percussion strokes map to white keys from home C. The instrument’s labels identify which stroke each key plays.', 'Hold recorder notes and release to end them. A sustain pedal can hold recorder notes.', '<b>Panic</b> stops sounding notes if a controller leaves one hanging.'])
box('If MIDI is unavailable','Use a desktop browser that supports Web MIDI; Chrome or Edge are common choices. Browser support, permissions, operating-system settings, and school policies can restrict it. The app remains usable with its mouse and computer-keyboard controls. Tablet and mobile operation are not promised for this edition.')
para('Before a class recording, test the specific computer, browser, controller, and connection you will use.')

page('Build sections and song form','A section is a shared span of measures. Song Builder decides how those sections appear in the piece.')
head('Make the section the right length')
para('Use <b>Section bars</b> in the bottom console. Every part in the section shares this length, so a two-measure accompaniment and four-measure melody do not silently become different section lengths. When extending, choose which parts to repeat and which added measures to leave empty.')
para('For one accompaniment, use <b>Part actions → Repeat to fill section</b>. Choose the source measure range and review whether later music will be replaced. In Score, selecting measure numbers first provides that range. <b>Section tools → Double section</b> repeats the whole section. Undo reverses the operation.')
head('Create an A–B–A–B form')
steps(['Write your A section. Open <b>Compose → Song Builder</b>.', 'Create B and give it a useful name. Compose its music, or make an independent variation from A and revise it.', 'Add appearances of A, B, A, and B to the song form. Drag the handles or use the arrows to put them in order.', 'Set each appearance’s number of plays and instrument entrances. An instrument can play in A and be silent in B.', 'Select <b>Full song</b> in the transport to hear the complete form. Choose Full song again in the output controls before exporting the whole piece.'])
table([['<b>Choice</b>','<b>Result</b>'],['Reuse section A','Every appearance points to the same music. Editing A updates all its appearances.'],['Create a variation','Makes independent music that you can revise without changing the source section.'],['Instrument entrances','Controls which parts play in a particular appearance; useful for building an ensemble gradually.']])
box('Watch the section you are editing','Selecting full-song playback does not redirect recording into whichever section happens to be sounding. Recording goes into the section being edited. Check its name and the selected part before starting a take.')
para('Current limits are 64 measures per section, 32 sections, 64 form entries, and 512 measures in the expanded song. Work in shorter sections when that makes the piece easier to teach and edit.')

page('Make the notation musical','Write the intended rhythm, then shape how the phrase sounds.')
head('Readable lengths and intentional gaps')
para('Open <b>Score appearance &amp; composer → Rhythm</b>. <b>As entered</b> follows the entered values; <b>Readable note lengths</b> simplifies suitable gaps in the written rhythm. Explicit rests still represent intentional silence.')
para('If a recorded recorder phrase sounds right but shows unnecessarily short notes, edit <b>Written length</b> while keeping its played articulation. <b>Automatic lengths · this part</b> resets written-length overrides for that part; use it deliberately and listen afterward.')
head('Add expression')
steps(['Choose <b>Select</b> and select the notes or phrase you want to shape.', 'Open <b>Musical expression</b> in the score tools.', 'Choose a dynamic such as p or f, an accent, staccato, or tenuto. For suitable recorder phrasing, use breath marks or a slur.', 'For a crescendo or diminuendo, select the phrase and set the desired change. Listen to the result and adjust its ending dynamic when needed.'])
para('Expression is shared with playback and supported exports, including the printed score and MusicXML. A slur shapes a phrase; a tie connects the same pitch into one sustained note. They have different jobs.')
head('Pitch, clefs, and percussion')
para('The score uses instrument-specific written registers and clefs for the classroom. The sounding octave can differ from the written octave on an octave-transposing instrument. Use the part name and instrument display to check the intended instrument, rather than assuming the same written note means the same sounding register everywhere.')
para('For percussion with alternate strokes, choose the labeled row or stroke: for example <b>Open / Muted</b> cowbell, <b>Low / High</b> agogô, or <b>Short scrape / Long scrape</b> güiro. Check the part’s printed stroke labels and legend before handing it to students.')
box('Review a finished score as a performer','Read through one part while listening. Check rests, ties, chord lengths, instrument entrances, and page turns. If the page is crowded, adjust staff size or measures per line in Print / PDF rather than squeezing the notes into an unreadable page.')

page('Focus, listen, and rehearse','Use the same composition as a workspace, a listening activity, and an accompaniment.')
head('Keep the score in view')
para('In <b>Score → Part · compose → Current section</b>, choose <b>Focus</b> to hide the collection and secondary controls. The note-value toolbar stays available while scrolling. <b>Entry &amp; edit tools</b> opens the detailed controls over the music; close it when finished.')
head('Connect notation to the instrument')
para('<b>Instrument + score</b> shows the selected part’s bars, percussion strokes, or recorder fingering. Selecting notes highlights that part’s pitches. Clicking the instrument auditions a sound without writing a new note. Recorder diagrams offer Baroque / English fingerings, including double holes and thumb venting where appropriate.')
head('Listen to a small passage')
steps(['Select notes or measure numbers in one part.', 'Choose <b>Hear selection</b> for one pass or <b>Loop selection</b> to repeat.', 'Press <b>Stop</b> when finished. The preview leaves your main song position and mixer settings intact.'])
head('Practice a part in context')
para('Open <b>Rehearse → My Part</b>. Choose the part to practice and listen to the ensemble, the part alone, or the accompaniment without that part. This is useful for learning a recorder melody or checking an ostinato against the other instruments.')
para('Use <b>Playback tools</b> in the sequencer for seeking and practice controls. Choose a measure or practice range, slow the playback, and enable a repeated count-in if helpful. A gradual tempo increase can move a repeated passage toward a target tempo.')
box('A suggested rehearsal sequence','Listen once with the full ensemble. Loop the difficult measures with the part audible. Play along at a slower speed. Finally, switch to accompaniment without your part and perform it yourself. Practice speed changes do not rewrite the score’s tempo marking.')
para('Focus and the instrument-view preference are remembered in the browser. Part-specific note highlighting belongs to the selected part, even when another instrument can play the same pitches.')

page('Balance the ensemble','Start with a clear musical balance, then add effects sparingly enough to hear the rhythm.')
head('Quick adjustments while composing')
para('Choose <b>Open mixer</b> in the bottom console. Its level, pan, mute, and solo controls appear over your workspace. Closing the mixer uncovers the music without changing the grid position. Choose <b>Full mixer</b> or the top-level <b>Mixer</b> for the complete desk.')
table([['<b>Control</b>','<b>Use it to</b>'],['Part level','Set the balance of each instrument against the others.'],['Pan','Place a part toward the left or right of the stereo image.'],['Mute / Solo','Temporarily remove a part or isolate it for listening.'],['Reverb send','Choose how much of a part enters the shared reverb.'],['Reverb return / space','Set the overall room effect and its character or decay.'],['Delay','Add repeats where they serve the piece.'],['Master / Output','Control the overall listening and output level.']])
head('A quick mixing routine')
steps(['Play a busy section. Bring the melody forward enough to hear clearly.', 'Lower accompaniments that cover the melody. Add the bass and percussion until the beat is clear.', 'Use a little pan to separate parts. Check that the balance still makes sense through your classroom speakers.', 'Add reverb and delay, then lower them if notes become indistinct. Watch the actual audio meters and reduce levels if the mix overloads or sounds distorted.'])
para('Knob controls respond to dragging up or right to increase a value. Keyboard arrow keys adjust a focused knob. Mute and Solo are listening tools; remember to check them before a normal audio export.')
box('Exports and the mix','Normal WAV, MP3, and video exports use your project’s mix and effects. <b>Classroom package</b> deliberately produces its full-ensemble and minus-one files independently of temporary mute/solo choices, so those rehearsal files have predictable instrumentation.')
para('Download the project after a mix you want to keep. Its .orff file saves the mix with the composition.')

page('Print teacher scores and parts','Preview the actual pages before downloading the PDF.')
steps(['Open <b>Compose → Score</b>. Set <b>Music</b> to Current section or Full song.', 'Choose <b>Print / PDF</b>. In the print panel, choose <b>Full ensemble score</b> or an individual instrument part.', 'Choose US Letter or A4, staff size, measures per line, and whether to show note names.', 'Review every page in the preview. Choose <b>Download PDF</b>, then open the downloaded PDF to print at actual size.'])
head('Keep a teacher score compact')
para('Start with <b>Four measures per line</b> and Standard or Compact staff size. Dense rhythms or many simultaneous parts may need Automatic spacing or fewer measures per line. Use the preview and any density warnings to find a readable balance.')
para('<b>Hide inactive ensemble staves</b> removes a part when it rests throughout a line. Sections begin on new lines and returning instruments receive their labels and clefs. Thus, a hand-drum staff can be absent during a xylophone-only A section and return in B. Turn the option off when you want every staff visible throughout.')
head('Prepare student parts')
para('Choose one instrument in the print panel. Use larger staff sizes or note names when appropriate for the class. Individual parts keep their silent measures so students can count accurately through entrances.')
head('Control page turns and part order')
para('Under <b>Line &amp; page breaks</b>, enter measure numbers separated by commas, such as <b>5, 9, 13</b>. These numbers refer to the music selected for that preview. A page break starts a new page at that measure. Choose <b>Update preview</b> after changes if needed.')
para('Use <b>Score appearance &amp; composer → Part order</b> to review or change the ensemble order. Check the composer name before printing. Software attribution and the composition’s author are separate.')
box('Before handing out the music','Confirm the title, composer, correct section or full song, instrument names, percussion stroke meanings, first entrance, final bar, and page count. Listen while following the PDF once. A larger student part can coexist with a compact teacher score.')

page('Export audio, video, and class files','Use Export after choosing whether you want the current section or the full song.')
table([['<b>Output</b>','<b>Best use</b>'],['WAV','High-quality stereo audio: 44.1 kHz, 16-bit. Good for playback, editing, or archiving.'],['MP3','Smaller stereo audio at 192 kbps for convenient sharing.'],['Sheet music','Opens the score workflow. Download teacher or student PDFs from Print / PDF.'],['MusicXML','Take the notation to compatible notation software for further work. Check the imported layout there.'],['Video','A scrolling student play-along or full-ensemble view, using the app’s instrument playback.'],['Classroom package','One ZIP containing selected PDFs and rehearsal WAV files.']])
head('Make a play-along video')
steps(['Choose <b>Export → Video</b>. Select Student play-along or Full ensemble.', 'For a student video, choose the part, <b>Large notation</b> or <b>Large instrument</b>, and full mix, part only, or accompaniment without that part.', 'Choose title card, count-in, frame rate, and an available format. Use <b>Preview first four measures</b> and play the preview.', 'If the preview is right, choose <b>Render &amp; download video</b>. Keep the tab open until it finishes.'])
para('Student notation scrolls continuously. MP4 depends on the browser’s encoders; WebM may be available when MP4 is not. Video supports up to five minutes of music. In the ensemble view, choose up to 12 visible parts; other audible parts still remain in the audio.')
head('Prepare a classroom package')
para('Choose <b>Export → Classroom package</b>. Select the teacher score, student parts, full-ensemble audio, and minus-one rehearsal files you need. Review the estimated size and create the ZIP. If the package is too large, export fewer parts or one section at a time.')
box('Keep the editable original too','PDF, audio, and video are sharing formats, not a substitute for your editable <b>.orff</b> file. This edition does not import or export MIDI files. Normal audio rendering includes the mix, effects, and natural instrument tails.')

page('A student’s first composition','Challenge: make a short piece with a melody, a bordun, and a contrasting section.')
steps(['<b>Give the piece an idea.</b> Choose a mood or story, such as a quiet walk followed by a rainstorm. Name the project.', '<b>Set up A.</b> Start a new session, choose 4/4, and set four section measures. Add an alto xylophone.', '<b>Write a melody.</b> Use Score or Sequencer. Try C, D, E, G, and A. Make a two-measure question and a two-measure answer. End the answer on C.', '<b>Add a bordun.</b> Add a bass xylophone. In Score, enter C and use Add to chord for G. Make a short repeating pattern that supports the melody.', '<b>Add rhythm.</b> Add hand drums or claves. Leave some space so the percussion does not cover the melody.', '<b>Make B different.</b> In Song Builder, create a new section or an independent variation. Change the rhythm, instrument entrances, or melodic direction.', '<b>Build the form.</b> Arrange A–B–A–B, choose Full song, and listen. Does the return of A feel clear?', '<b>Revise one thing.</b> Improve a rhythm, change a note, add a dynamic, or balance the instruments. Compare before and after.', '<b>Share it.</b> Enter the student composer’s name. Download the .orff project, make a PDF, and export a recording.'])
head('Three more composing prompts')
bullets(['<b>Question and answer:</b> two students write one phrase each. Agree on the meter, length, and available pitches before combining them.', '<b>A sound story:</b> choose four instruments to represent characters or places. Use dynamics and silence to make the story clear.', '<b>One pattern, many versions:</b> save a named version, then change only one musical element. Discuss how that change affects the listener.'])
box('For teachers','Model the process once, then let students make musical decisions. Begin with two instruments and a short section before adding complexity. Students can compose independently or take turns at one computer. A MIDI keyboard is optional for every activity on this page.')

page('Troubleshooting and shortcuts','Start with the active part, section, playback scope, and save status.')
table([['<b>Problem</b>','<b>Try this</b>'],['No sound','Click in the app, then play. Check the device volume, output level, part level, Mute, and Solo. For a stuck MIDI note, use Panic.'],['The first recording note is missing','Enable the one-measure count-in and begin on beat 1. Confirm that recording is armed and the expected part is selected.'],['A recorded note appears twice','Recording overdubs existing notes. Use Undo take or select and delete the duplicate; then listen again.'],['Notes look too short','Check Written length and Readable note lengths. Keep explicit rests for deliberate spaces.'],['A note will not stretch farther','Check the grid, next note in the same voice, and section boundary. Use Note details for a precise edit.'],['The wrong section plays or exports','Check Section / Full song in the transport and Current section / Full song in output settings.'],['My project is not in the new app','Open the .orff file you downloaded from the previous copy. Browser autosaves may not follow the app’s new location.'],['The downloaded app is blank','Extract the entire ZIP again. Open the HTML launch file in Software, with all accompanying files present. Check school restrictions.'],['Video format is unavailable','Choose a supported format or another desktop browser. Use audio export if the device has no supported video encoder.']])
head('Everyday shortcuts')
table([['<b>Shortcut</b>','<b>Action</b>'],['Space / Escape / R','Play or pause / stop / record'],['Ctrl or Command + S','Download an editable project'],['Ctrl or Command + Z','Undo; add Shift for redo, or use Ctrl/Command + Y'],['Ctrl or Command + C / X / V','Copy / cut / paste in the score selection workflow']])
para('Shortcuts depend on context and do not replace typing inside text fields. Tab moves between controls; arrow keys adjust focused sliders and knobs. See the score’s on-screen keyboard guide for note-entry shortcuts.')

page('Your instrument collection','38 instrument choices · Select the pictured instrument, then use its labeled pitches or strokes.')
table([['<b>Family</b>','<b>Instruments and playing choices</b>'],['Xylophones','Soprano, alto, bass: 13 bars each.'],['Contrabass bars','One eight-bar set.'],['Metallophones','Soprano, alto, bass: 13 bars each.'],['Glockenspiels','Soprano and alto: 13 bars each.'],['Recorders','Sopranino, soprano, alto, tenor, bass. Each covers a two-octave chromatic range.'],['Drums and blocks','Five hand drums; three tubanos; two bongos; timpani; side drum; five temple blocks.'],['Small percussion','Castanets, tambourine, shakers, maracas, sleigh bells, cabasa, triangle, crash cymbal, gong, wind chimes, finger cymbals, agogô bells, cowbell, güiro, claves, woodblock, slapstick, vibraslap.']])
head('Different strokes make different gestures')
para('Wind chimes offer five sweeps: down brisk/slow and up brisk/medium/slow. Triangle and cowbell offer open and muted strokes. Tambourine and sleigh bells offer hit and shake. Temple blocks have five individual voices from low to high. Select the labeled gesture rather than treating these as interchangeable pitches.')
head('What you hear')
para('Playback and rendering use the app’s instrument sound engine and its included sounds. Some instruments use acoustic recordings and others use SoundFont-based approximations. The sopranino recorder is a transposed soprano-recording approximation; contrabass bars use adapted low marimba recordings. Detailed credits are included with the software.')
head('Know the file types')
para('<b>.orff</b> keeps your editable composition. <b>.pdf</b> is sheet music. <b>.wav / .mp3</b> are audio. <b>.musicxml</b> transfers notation. <b>.mp4 / .webm</b> are video. Keep these student-created files separate from the app’s working folders.')
box('This edition’s scope','Designed for desktop or laptop browser use. No student accounts, live online collaboration, or assignment portal are included. Mobile and tablet compatibility is not promised. MIDI and video depend on the browser, operating system, device, and school policies.')

assert len(titles)==20,len(titles)
build(OUT/'Mallet-Measure-User-Manual.pdf',story)

# Compact companion guide: two pages, deliberately independent of the manual.
story=[];titles=[]
page('Start here','Mallet &amp; Measure · Full downloadable edition · October 24, 2026')
para('<b>Created and developed by Drew Wichman</b><br/>Orff-Schulwerk certified music teacher')
head('Open the studio in four steps')
steps(['<b>Extract the entire ZIP.</b> Windows: Extract All. Mac: double-click the ZIP. Do not launch from inside a ZIP preview.', '<b>Keep the folder together.</b> Move Mallet-Measure to Documents / Music Teaching, or another permanent folder you can write to.', '<b>Open the app.</b> Inside Software, open <b>Open-Mallet-Measure.html</b> in your desktop browser.', '<b>Begin composing.</b> Choose Compose → Sequencer or Score, then add an instrument. Click Play after entering a few notes.'])
head('Choose your starting point')
table([['<b>I want to…</b>','<b>Go to…</b>'],['Write with a grid','Compose → Sequencer'],['Write on the staff','Compose → Score → Part · compose'],['Record notes','Choose a part, set Grid/count-in, and press Record'],['Try an example','Project → Demo library → My Orf Assignment'],['Save editable music','Project → Download project'],['Print or share','Score → Print / PDF, or Export']])
box('Keep your music','Download an <b>.orff</b> file at the end of every session. Autosave and named versions belong to this browser and are not cloud backups. Save student work in its own folder, separate from Software.')
para('Read <b>Mallet-Measure-User-Manual.pdf</b> for the complete guide. Page 2 explains what is new; page 18 walks a student through a first composition.')
page('Updating and folder care','Keep this page handy when installing a later release.')
steps(['In the old app, download each composition you want to keep with Project → Download project.', 'Extract the updated buyer ZIP into a new folder. Keep your previous copy until you have checked the update.', 'Open Software / Open-Mallet-Measure.html from the new folder.', 'Use Project → Open a project file… to load your saved .orff file. Listen and check its parts, then download a backup.'])
head('Leave these files together')
para('The HTML file is a launcher, not the entire application. It needs the accompanying packed files, code, fonts, sounds, artwork, and notices. Do not move the HTML file alone, rename internal folders, or delete unfamiliar files. A shortcut to the launch file is fine; leave the real file in Software.')
head('Good places to install')
para('A permanent folder under <b>Documents</b> is a simple choice. A Desktop folder also works. Avoid protected system folders, temporary download locations, and cloud-only files that are not stored on the computer. Keep the previous release separate instead of replacing a few files at a time.')
head('Device and school requirements')
para('Use a desktop or laptop browser with speakers or headphones. A mouse and computer keyboard are enough. MIDI and video support vary by browser, operating system, and school policy; MP4 is not available on every device. Mobile and tablet use is not promised. School-managed computers may block local HTML or JavaScript: ask your technology staff if the extracted app will not open.')
box('The app is for students and teachers','Students can compose, record, revise, and share using the same tools as the teacher. There are no student accounts or online submission portal in this edition. Use your school’s existing method to collect downloaded .orff files, PDFs, or audio.')
para('For practical help, use the <b>?</b> button in the studio or the troubleshooting page in the manual. Third-party credits and licenses are included in the package; no setup changes are needed to read them.')
build(OUT/'START-HERE.pdf',story)
print('Created manual (20 planned pages) and START-HERE (2 planned pages) in',OUT)
