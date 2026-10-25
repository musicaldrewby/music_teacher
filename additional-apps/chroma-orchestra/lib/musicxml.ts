import {DOMParser, type Element as XmlElement} from '@xmldom/xmldom';
import {unzipSync} from 'fflate';
import {demoProject, projectSchema, type Project, type Track} from './project';

const MAX_XML = 4 * 1024 * 1024;
const children = (e: XmlElement, name?: string): XmlElement[] => Array.from(e.childNodes)
  .filter(n => n.nodeType === 1 && (!name || n.localName === name)) as XmlElement[];
const child = (e: XmlElement, name: string) => children(e, name)[0];
const value = (e: XmlElement, name: string, fallback = '') => child(e, name)?.textContent?.trim() || fallback;
const descendants = (e: XmlElement, name: string) => Array.from(e.getElementsByTagName(name));
const number = (s: string | null | undefined, fallback: number): number => {
  if (s === null || s === undefined || s.trim() === '') return fallback;
  const n = Number(s); if (!Number.isFinite(n)) throw Error('The score contains an invalid number.'); return n;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function xmlRoot(xml: string): XmlElement {
  if (xml.length > MAX_XML) throw Error('The expanded score must be smaller than 4 MB. Export a shorter selection.');
  // MusicXML public DOCTYPEs are common. No external resources are fetched; custom entities are forbidden.
  if (/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(xml)) throw Error('Custom XML entities are not supported. Export a standard MusicXML file.');
  const doc = new DOMParser({onError: (_level, message) => { throw Error(message); }}).parseFromString(xml, 'application/xml');
  if (!doc.documentElement) throw Error('This file does not contain an XML score.');
  return doc.documentElement;
}
function decode(bytes: Uint8Array) {
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  return new TextDecoder(encoding, {fatal: true}).decode(bytes);
}
export function readScoreFile(bytes: Uint8Array, filename: string): string {
  if (bytes.byteLength > MAX_XML) throw Error('Choose a MusicXML or MXL file smaller than 4 MB.');
  if (/\.mxl$/i.test(filename) || (bytes[0] === 80 && bytes[1] === 75)) {
    try {
      const containerFiles = unzipSync(bytes, {filter: f => {
        if (f.name !== 'META-INF/container.xml') return false;
        if (f.originalSize > 65536) throw Error('Invalid MXL container.'); return true;
      }});
      const manifest = containerFiles['META-INF/container.xml'];
      if (!manifest) throw Error('The MXL file has no META-INF/container.xml.');
      const roots = descendants(xmlRoot(decode(manifest)), 'rootfile');
      const root = roots.find(r => r.getAttribute('media-type') === 'application/vnd.recordare.musicxml+xml') || roots[0];
      const path = root?.getAttribute('full-path');
      if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) throw Error('Invalid score path in the MXL container.');
      const files = unzipSync(bytes, {filter: f => {
        if (f.name !== path) return false;
        if (f.originalSize > MAX_XML) throw Error('The expanded score exceeds 4 MB.'); return true;
      }});
      if (!files[path]) throw Error('The score named by the MXL container is missing.');
      return decode(files[path]);
    } catch (e) { throw Error(`Could not open MXL: ${(e as Error).message}`); }
  }
  return decode(bytes);
}

type BeatNote = {midi: number; beat: number; length: number; velocity: number; voice: string; startTie: boolean; stopTie: boolean};
type BeatController = {beat: number; number: number; value: number};
type Measure = {label: string; length: number; notes: BeatNote[]; tempos: {beat: number; bpm: number}[]; controllers: BeatController[]};
type Mark = {forward: boolean; backward: number; endings: number[]};
export type ScoreImport = {
  title: string; parts: Track[]; warnings: string[]; repeats: boolean;
  measures: {label: string; source: number; pass: number; start: number; end: number}[];
  tempos: {time: number; bpm: number}[]; duration: number; bpm: number;
};
export type ScoreSelection = {
  partIds?: string[]; fromMeasure?: number; toMeasure?: number; name?: string;
  assignments?: Record<string, Pick<Track, 'machine' | 'program' | 'percussion'>>;
};

function repeatOrder(marks: Mark[], enabled: boolean, warn: (s: string) => void) {
  const written = marks.map((_, i) => ({index: i, pass: 1}));
  if (!enabled) { if (marks.some(m => m.forward || m.backward)) warn('Repeats are off: the score plays once in written order.'); return written; }
  const blocks = new Map<number, {end: number; times: number}>();
  let start = 0, open = false, previousEnd = -1, complex = false;
  marks.forEach((m, i) => {
    if (m.forward) { if (open) complex = true; start = i; open = true; }
    if (m.backward) {
      if (start <= previousEnd || m.backward > 8) complex = true;
      blocks.set(start, {end: i, times: m.backward}); previousEnd = i; open = false; start = 0;
    }
  });
  if (complex || open) { warn('Nested, overlapping, or incomplete repeats were found. This score plays in written order; export an unfolded score for the intended repeat sequence.'); return written; }
  const order: {index: number; pass: number}[] = [];
  let lastPass = 1;
  for (let i = 0; i < marks.length; i++) {
    const block = blocks.get(i);
    if (block) {
      for (let pass = 1; pass <= block.times; pass++) for (let j = i; j <= block.end; j++) {
        if (!marks[j].endings.length || marks[j].endings.includes(pass)) order.push({index: j, pass});
      }
      lastPass = block.times; i = block.end;
    } else if (!marks[i].endings.length || marks[i].endings.includes(lastPass)) order.push({index: i, pass: marks[i].endings.length ? lastPass : 1});
    if (order.length > 4000) throw Error('This score expands to too many measures. Export a shorter selection.');
  }
  return order;
}

export function parseMusicXml(xml: string, filename = 'Imported score', repeats = true): ScoreImport {
  const root = xmlRoot(xml);
  if (root.localName === 'score-timewise') throw Error('Please export partwise MusicXML from your notation app. Timewise scores are not supported yet.');
  if (root.localName !== 'score-partwise') throw Error('Choose a MusicXML score (.musicxml, .xml, or .mxl). PDF and photo recognition are not available yet.');
  const warnings = new Set<string>(), warn = (s: string) => { warnings.add(s); };
  const title = (value(root, 'movement-title') || (child(root, 'work') && value(child(root, 'work')!, 'work-title')) || filename.replace(/\.(musicxml|xml|mxl)$/i, '')).slice(0, 100);
  const partList = child(root, 'part-list');
  const definitions = new Map((partList ? children(partList, 'score-part') : []).map(p => [p.getAttribute('id'), p]));
  const scoreParts = children(root, 'part');
  if (!scoreParts.length || scoreParts.length > 64) throw Error('Choose a score with between 1 and 64 written parts; select up to 16 at import.');
  const ids = scoreParts.map(p => p.getAttribute('id'));
  if (new Set(ids).size !== ids.length) throw Error('The score contains duplicate part IDs. Export it again from your notation app.');
  const maxMeasures = Math.max(...scoreParts.map(p => children(p, 'measure').length));
  if (!maxMeasures || maxMeasures > 2000) throw Error('Choose a score with 1–2,000 measures.');
  const marks: Mark[] = Array.from({length: maxMeasures}, () => ({forward: false, backward: 0, endings: []}));
  const lengths = Array(maxMeasures).fill(0) as number[], labels = Array(maxMeasures).fill('') as string[];
  let rawNotes = 0;
  const parsed = scoreParts.map((part, pi) => {
    const def = definitions.get(part.getAttribute('id'));
    const midi = def ? children(def, 'midi-instrument') : [];
    const first = midi[0];
    const percussion = midi.some(m => !!child(m, 'midi-unpitched') || value(m, 'midi-channel') === '10');
    const programs = new Set(midi.map(m => value(m, 'midi-program', '1')));
    if (programs.size > 1) warn('A part specifies multiple MIDI programs. Its notes remain together using its first sound; split that part in your notation app to use multiple sounds.');
    const unpitched = new Map(midi.map(m => [m.getAttribute('id'), number(value(m, 'midi-unpitched'), 61) - 1]));
    const color = ['#00d9ff', '#ff2389', '#ffb62e', '#a56bff', '#00efaa', '#ff542b'][pi % 6];
    const track: Track = {
      id: `score-${pi + 1}`, name: (def ? value(def, 'part-name', `Part ${pi + 1}`) : `Part ${pi + 1}`).slice(0, 80),
      machine: percussion ? 'drums' : pi % 3 === 1 ? 'bells' : 'marimba',
      program: clamp(first ? number(value(first, 'midi-program'), 1) - 1 : 12, 0, 127),
      bank: clamp(first ? number(value(first, 'midi-bank'), 1) - 1 : 0, 0, 16383), percussion, color,
      gain: .8, pan: scoreParts.length === 1 ? 0 : -.65 + 1.3 * pi / (scoreParts.length - 1),
      mute: false, solo: false, offset: [0, 0, 0], yaw: 0, scale: 1, notes: [], controllers: [], bends: [],
    };
    let divisions = 1, meter = 4, velocity = .72;
    const transposes = new Map<string, number>();
    let activeEndings: number[] = [];
    const measures = children(part, 'measure').map((el, mi): Measure => {
      const measure: Measure = {label: el.getAttribute('number') || String(mi + 1), length: 0, notes: [], tempos: [], controllers: []};
      labels[mi] ||= measure.label;
      let cursor = 0, lastOnset = 0, extent = 0, endEnding = false;
      // Read start/end markers before notes so a right-bar ending covers this measure.
      for (const bar of children(el, 'barline')) {
        const ending = child(bar, 'ending');
        if (ending?.getAttribute('type') === 'start') {
          activeEndings = (ending.getAttribute('number') || '').split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0);
          if (!activeEndings.length) warn('An unnumbered ending could not be interpreted. Check the performed measure sequence.');
        }
        if (ending && ['stop', 'discontinue'].includes(ending.getAttribute('type') || '')) endEnding = true;
        const repeat = child(bar, 'repeat');
        if (repeat?.getAttribute('direction') === 'forward') marks[mi].forward = true;
        if (repeat?.getAttribute('direction') === 'backward') marks[mi].backward = Math.max(marks[mi].backward, Math.floor(number(repeat.getAttribute('times'), 2)));
      }
      if (activeEndings.length) marks[mi].endings = [...activeEndings];
      if (endEnding) activeEndings = [];
      for (const item of children(el)) {
        const tag = item.localName;
        if (tag === 'attributes') {
          if (child(item, 'divisions')) { divisions = number(value(item, 'divisions'), 1); if (divisions <= 0) throw Error('Score divisions must be positive.'); }
          const time = child(item, 'time');
          if (time && !child(time, 'senza-misura')) {
            const beats = children(time, 'beats'), units = children(time, 'beat-type');
            meter = beats.reduce((sum, b, i) => sum + (b.textContent || '4').split('+').reduce((a, n) => a + number(n, 0), 0) * 4 / number(units[i]?.textContent, 4), 0);
            if (!(meter > 0 && meter <= 256)) throw Error('The score contains an invalid time signature.');
          }
          for (const transpose of children(item, 'transpose')) transposes.set(transpose.getAttribute('number') || '*', number(value(transpose, 'chromatic'), 0) + 12 * number(value(transpose, 'octave-change'), 0));
          if (descendants(item, 'measure-repeat').length) warn('Measure-repeat symbols are not expanded. Export an unfolded score to include the repeated notes.');
        } else if (tag === 'backup' || tag === 'forward') {
          const amount = number(value(item, 'duration'), 0) / divisions;
          if (amount < 0) throw Error('The score contains a negative rhythmic duration.');
          cursor += tag === 'backup' ? -amount : amount;
          if (cursor < -1e-6) throw Error(`Part ${track.name}, measure ${measure.label}: a voice moves before the start of the measure.`);
          cursor = Math.max(0, cursor); lastOnset = cursor; extent = Math.max(extent, cursor);
        } else if (tag === 'direction' || tag === 'sound') {
          const beat = Math.max(0, cursor + number(value(item, 'offset'), 0) / divisions);
          const sounds = tag === 'sound' ? [item] : descendants(item, 'sound');
          let hasTempo = false;
          for (const sound of sounds) {
            if (sound.hasAttribute('tempo')) { const bpm = number(sound.getAttribute('tempo'), 120); if (bpm < 10 || bpm > 400) throw Error('Tempo markings must be between 10 and 400 quarter notes per minute.'); measure.tempos.push({beat, bpm}); hasTempo = true; }
            if (sound.hasAttribute('dynamics')) velocity = clamp(number(sound.getAttribute('dynamics'), 100) * .9 / 127, .01, 1);
            for (const marker of ['dacapo', 'dalsegno', 'tocoda', 'fine']) if (sound.hasAttribute(marker)) warn('D.C., D.S., coda, or fine navigation is not followed. Export an unfolded score for these jumps.');
          }
          const metronome = descendants(item, 'metronome')[0];
          if (!hasTempo && metronome && child(metronome, 'per-minute')) {
            const unit = ({whole: 4, half: 2, quarter: 1, eighth: .5, '16th': .25, '32nd': .125} as Record<string, number>)[value(metronome, 'beat-unit')];
            const dots = children(metronome, 'beat-unit-dot').length;
            const bpm = number(value(metronome, 'per-minute'), 120) * (unit || 1) * (2 - 2 ** -dots);
            if (unit && bpm >= 10 && bpm <= 400) measure.tempos.push({beat, bpm}); else warn('A complex metronome marking was not interpreted; check the opening tempo.');
          }
          const dynamics = descendants(item, 'dynamics')[0];
          if (dynamics && !sounds.some(s => s.hasAttribute('dynamics'))) {
            const dynamic = children(dynamics)[0]?.localName || '';
            const velocities: Record<string, number> = {ppp: .24, pp: .33, p: .43, mp: .54, mf: .65, f: .78, ff: .9, fff: 1, sf: .9, sfz: .9, fp: .65};
            if (velocities[dynamic]) velocity = velocities[dynamic];
          }
          for (const pedal of descendants(item, 'pedal')) {
            const type = pedal.getAttribute('type');
            if (type === 'change') measure.controllers.push({beat: Math.max(0, beat - .001), number: 64, value: 0});
            if (['start', 'resume', 'change', 'sostenuto'].includes(type || '')) measure.controllers.push({beat, number: 64, value: 1});
            if (['stop', 'discontinue'].includes(type || '')) measure.controllers.push({beat, number: 64, value: 0});
          }
          if (descendants(item, 'wedge').length) warn('Hairpin crescendos and diminuendos are not automated; written dynamic levels are used.');
          if (descendants(item, 'octave-shift').length) warn('Ottava display lines do not add a second transposition; encoded MusicXML pitches are used.');
        } else if (tag === 'note') {
          if (child(item, 'grace')) { warn('Grace notes are omitted. Export a performance MIDI if you want your notation app’s grace-note timing.'); continue; }
          const length = number(value(item, 'duration'), child(item, 'rest')?.getAttribute('measure') === 'yes' ? meter * divisions : 0) / divisions;
          if (!(length > 0 && length <= 1024)) throw Error(`Part ${track.name}, measure ${measure.label}: a note is missing a valid duration.`);
          const chord = !!child(item, 'chord'), beat = chord ? lastOnset : cursor;
          if (!chord) { lastOnset = cursor; cursor += length; }
          extent = Math.max(extent, beat + length);
          if (child(item, 'rest')) continue;
          const pitch = child(item, 'pitch'), unpitchedNote = child(item, 'unpitched');
          let note: number;
          const staff = value(item, 'staff', '1');
          if (pitch) {
            const steps: Record<string, number> = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
            const step = steps[value(pitch, 'step')];
            if (step === undefined) throw Error('The score contains an invalid pitch step.');
            note = (number(value(pitch, 'octave'), 4) + 1) * 12 + step + number(value(pitch, 'alter'), 0) + (transposes.get(staff) ?? transposes.get('*') ?? 0);
          } else if (unpitchedNote) {
            const instrument = child(item, 'instrument')?.getAttribute('id');
            note = unpitched.get(instrument || first?.getAttribute('id') || '') ?? 60;
            if (!midi.some(m => child(m, 'midi-unpitched'))) warn('Unpitched notes without a MIDI drum mapping use GM high bongo (60). Choose a mapping in your notation app for exact percussion.');
            track.percussion = true; track.machine = 'drums';
          } else throw Error('A score note has neither a pitch nor a percussion mapping.');
          if (note !== Math.round(note)) warn('Microtonal pitches are rounded to the nearest semitone.');
          note = Math.round(note);
          if (note < 0 || note > 127) throw Error('The score contains pitches outside the MIDI range (0–127).');
          const ties = [...children(item, 'tie'), ...descendants(item, 'tied')].map(t => t.getAttribute('type'));
          measure.notes.push({midi: note, beat, length, velocity: item.hasAttribute('dynamics') ? clamp(number(item.getAttribute('dynamics'), 100) * .9 / 127, .01, 1) : velocity, voice: `${staff}:${value(item, 'voice', '1')}`, startTie: ties.includes('start'), stopTie: ties.includes('stop')});
          if (++rawNotes > 50000) throw Error('Choose a score with fewer than 50,000 notes, then select up to 12,000 for a performance.');
          if (descendants(item, 'ornaments').length || descendants(item, 'fermata').length || descendants(item, 'articulations').length) warn('Ornaments, fermatas, and articulation-dependent timing use the encoded note durations. Export performance MIDI for your notation app’s expressive playback.');
        }
      }
      measure.length = extent || meter;
      lengths[mi] = Math.max(lengths[mi], measure.length);
      return measure;
    });
    if (measures.length !== maxMeasures) warn('Parts have different measure counts. They are aligned by measure position; check your score before importing.');
    return {track, measures};
  });
  const order = repeatOrder(marks, repeats, warn);
  const starts: number[] = []; let totalBeats = 0;
  const tempoEvents: {beat: number; bpm: number}[] = [];
  const sourceTempos = lengths.map((_, mi) => {
    const map = new Map<number, number>();
    for (const part of parsed) for (const t of part.measures[mi]?.tempos || []) {
      if (map.has(t.beat) && map.get(t.beat) !== t.bpm) warn('Parts contain conflicting tempo markings; the first part’s marking takes priority.');
      else map.set(t.beat, t.bpm);
    }
    return [...map].map(([beat, bpm]) => ({beat, bpm})).sort((a, b) => a.beat - b.beat);
  });
  const writtenTempos: number[] = []; let writtenTempo = 120;
  sourceTempos.forEach((events, i) => { writtenTempos[i] = writtenTempo; for (const t of events) writtenTempo = t.bpm; });
  if (!sourceTempos.some(ts => ts.length)) warn('No numeric tempo was found. Playback defaults to 120 BPM.');
  order.forEach((entry, oi) => {
    starts.push(totalBeats);
    if (oi === 0 || entry.index <= order[oi - 1].index) tempoEvents.push({beat: totalBeats, bpm: writtenTempos[entry.index]});
    for (const t of sourceTempos[entry.index]) tempoEvents.push({beat: totalBeats + t.beat, bpm: t.bpm});
    totalBeats += lengths[entry.index];
  });
  const tempoByBeat = new Map<number, number>([[0, 120]]);
  for (const t of tempoEvents) tempoByBeat.set(t.beat, t.bpm);
  const segments = [...tempoByBeat].sort((a, b) => a[0] - b[0]).map(([beat, bpm]) => ({beat, bpm, time: 0}));
  for (let i = 1; i < segments.length; i++) segments[i].time = segments[i - 1].time + (segments[i].beat - segments[i - 1].beat) * 60 / segments[i - 1].bpm;
  const seconds = (beat: number) => {
    let lo = 0, hi = segments.length - 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (segments[mid].beat <= beat) lo = mid; else hi = mid - 1; }
    const t = segments[lo]; return t.time + (beat - t.beat) * 60 / t.bpm;
  };
  let expandedNotes = 0;
  const parts = parsed.map(({track, measures}) => {
    const merged: BeatNote[] = [], ties = new Map<string, BeatNote>();
    order.forEach((entry, oi) => {
      const measure = measures[entry.index]; if (!measure) return;
      for (const cc of measure.controllers) track.controllers.push({time: seconds(starts[oi] + cc.beat), number: cc.number, value: cc.value});
      for (const n of [...measure.notes].sort((a, b) => a.beat - b.beat)) {
        const next = {...n, beat: starts[oi] + n.beat}, key = `${n.voice}:${n.midi}`;
        const previous = ties.get(key);
        if (n.stopTie && previous && Math.abs(previous.beat + previous.length - next.beat) < 1e-6) {
          previous.length += n.length; if (!n.startTie) ties.delete(key);
        } else {
          if (n.stopTie) warn('Some tie continuations had no adjacent starting note; they play as separate attacks.');
          merged.push(next); ties.delete(key); if (n.startTie) ties.set(key, next);
        }
      }
    });
    track.notes = merged.map(n => ({midi: n.midi, time: seconds(n.beat), duration: seconds(n.beat + n.length) - seconds(n.beat), velocity: n.velocity})).sort((a, b) => a.time - b.time || a.midi - b.midi);
    expandedNotes += track.notes.length;
    if (expandedNotes > 150000) throw Error('Repeats expand to too many notes. Export a shorter score.');
    return track;
  });
  if (!parts.some(p => p.notes.length)) throw Error('The score contains no playable notes.');
  return {title, parts, warnings: [...warnings], repeats, bpm: segments[0].bpm, duration: seconds(totalBeats), tempos: segments.map(t => ({time: t.time, bpm: t.bpm})), measures: order.map((o, i) => ({label: labels[o.index], source: o.index + 1, pass: o.pass, start: seconds(starts[i]), end: seconds(starts[i] + lengths[o.index])}))};
}

export function buildScoreProject(score: ScoreImport, options: ScoreSelection = {}): Project {
  const from = options.fromMeasure ?? 1, to = options.toMeasure ?? score.measures.length;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > score.measures.length) throw Error('Choose a valid first and last performed measure.');
  const start = score.measures[from - 1].start, end = score.measures[to - 1].end;
  if (end - start > 180 + 1e-8) throw Error('This section is longer than 3 minutes. Choose a shorter measure range.');
  const selected = score.parts.filter(p => !options.partIds || options.partIds.includes(p.id));
  if (!selected.length || selected.length > 16) throw Error('Select between 1 and 16 parts.');
  const tracks = selected.map(t => {
    const priorPedal = t.controllers.filter(cc => cc.time < start && cc.number === 64).at(-1);
    const assignment = options.assignments?.[t.id];
    return {...t, ...assignment, bank: assignment && assignment.program !== t.program ? 0 : t.bank,
      notes: t.notes.filter(n => n.time < end - 1e-8 && n.time + n.duration > start + 1e-8).map(n => {
        const time = Math.max(0, n.time - start), ending = Math.min(end - start, n.time + n.duration - start, 180);
        return {...n, time, duration: ending - time};
      }).filter(n => n.duration >= .005),
      controllers: [...(priorPedal ? [{...priorPedal, time: 0}] : []), ...t.controllers.filter(cc => cc.time >= start && cc.time < end).map(cc => ({...cc, time: cc.time - start}))],
    };
  });
  const count = tracks.reduce((n, t) => n + t.notes.length, 0);
  if (!count) throw Error('The selected parts and measures contain no notes.');
  if (count > 12000) throw Error('This section has more than 12,000 notes. Select fewer parts or measures.');
  const opening = [...score.tempos].reverse().find(t => t.time <= start + 1e-8)?.bpm || score.bpm;
  return projectSchema.parse({...demoProject(), name: (options.name?.trim() || score.title).slice(0, 100), bpm: opening, tracks});
}
