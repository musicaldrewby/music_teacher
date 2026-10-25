'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Headphones, Square, Check, Music2} from 'lucide-react';
import {buildScoreProject, type ScoreImport, type ScoreSelection} from '../lib/musicxml';
import {programs, drumPrograms, type Project} from '../lib/project';
import {renderAudio, toBuffer} from '../lib/audio';

export function ScoreReview({score, repeatChange, apply}: {score: ScoreImport; repeatChange: (enabled: boolean) => void; apply: (p: Project) => void}) {
  const [ids, setIds] = useState(score.parts.filter(p => p.notes.length).slice(0,16).map(p => p.id));
  const [from, setFrom] = useState(1), [to, setTo] = useState(Math.max(1, score.measures.filter(m => m.end <= 180).length));
  const [name, setName] = useState(score.title), [assignments, setAssignments] = useState<NonNullable<ScoreSelection['assignments']>>({});
  const [listening, setListening] = useState(false), [preparing, setPreparing] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
  const context = useRef<AudioContext | null>(null), node = useRef<AudioBufferSourceNode | null>(null), abort = useRef<AbortController | null>(null);
  const result = useMemo(() => {try {return {project: buildScoreProject(score, {partIds: ids, fromMeasure: from, toMeasure: to, name, assignments}), error: ''};} catch(e) {return {project: null, error: (e as Error).message};}}, [score, ids, from, to, name, assignments]);
  const stop = () => {abort.current?.abort(); if(node.current) {node.current.onended = null; try {node.current.stop();} catch {} node.current = null;} setListening(false); setPreparing(false);};
  useEffect(() => {stop();}, [result]);
  useEffect(() => () => {abort.current?.abort(); try {node.current?.stop();} catch {} context.current?.close();}, []);
  async function listen() {
    if (listening || preparing) {stop(); return;} if (!result.project) return;
    const controller = new AbortController(); abort.current = controller; setPreparing(true); setProgress(0); setError('');
    try {
      context.current ||= new AudioContext(); await context.current.resume();
      const preview = {...result.project, tracks: result.project.tracks.map(t => ({...t, notes: t.notes.filter(n => n.time < 12).map(n => ({...n, duration: Math.min(n.duration, 12 - n.time)})), controllers: t.controllers.filter(c => c.time <= 12)}))};
      const pcm = await renderAudio(preview, setProgress, controller.signal);
      if(controller.signal.aborted) return;
      const source = context.current.createBufferSource(); source.buffer = toBuffer(pcm, context.current); source.connect(context.current.destination);
      node.current = source; source.onended = () => {setListening(false); node.current = null;}; source.start(); setListening(true);
    } catch(e) {if(!controller.signal.aborted) setError((e as Error).message);} finally {if(abort.current === controller) setPreparing(false);}
  }
  const first = score.measures[from - 1], last = score.measures[to - 1];
  return <div className="score-review">
    <span className="section-label">SHEET MUSIC → YOUR ORCHESTRA</span><h2>Give every part a machine.</h2>
    <p className="score-intro">Review the parts and performed measure range before importing. Each written part keeps its own notes.</p>
    <label className="field-label">PERFORMANCE NAME<input maxLength={100} value={name} onChange={e => setName(e.target.value)}/></label>
    <div className="score-summary"><span><Music2 size={16}/>{score.parts.length} written parts</span><span>{score.measures.length} performed measures</span><span>{score.bpm} BPM opening</span></div>
    <label className="check-row"><input type="checkbox" checked={score.repeats} onChange={e => {stop();repeatChange(e.target.checked);}}/>Play simple repeats and numbered endings</label>
    <div className="score-range"><label className="field-label">FROM PERFORMED MEASURE<input type="number" min={1} max={score.measures.length} value={from} onChange={e => setFrom(+e.target.value)}/></label><label className="field-label">THROUGH MEASURE<input type="number" min={from} max={score.measures.length} value={to} onChange={e => setTo(+e.target.value)}/></label></div>
    <p className="score-range-note">{first && last ? `Written measure ${first.label} (pass ${first.pass}) → ${last.label} (pass ${last.pass}) · ${(last.end-first.start).toFixed(1)} seconds of music` : 'Choose a valid measure range.'}</p>
    <div className="score-part-heading"><strong>{ids.length} / 16 parts selected</strong><button onClick={() => setIds(score.parts.filter(p => p.notes.length).slice(0,16).map(p => p.id))}>Select first 16</button><button onClick={() => setIds([])}>Clear</button></div>
    <div className="score-parts">{score.parts.map(part => {
      const a = assignments[part.id] || {machine: part.machine, program: part.program, percussion: part.percussion};
      const patch = (fields: Partial<typeof a>) => setAssignments(prev => ({...prev, [part.id]: {...a, ...fields}}));
      return <div className={'score-part ' + (!ids.includes(part.id) ? 'excluded' : '')} key={part.id}>
        <label className="score-part-name"><input type="checkbox" checked={ids.includes(part.id)} onChange={e => setIds(e.target.checked ? [...ids, part.id] : ids.filter(id => id !== part.id))}/><span><strong style={{color: part.color}}>{part.name}</strong><small>{part.notes.length.toLocaleString()} notes in full score</small></span></label>
        <label className="field-label">MACHINE<select value={a.machine} onChange={e => patch({machine: e.target.value as typeof a.machine})}><option value="marimba">Marble marimba</option><option value="bells">Bell garden</option><option value="drums">Drum factory</option></select></label>
        <label className="field-label">SOUND<select value={a.program} onChange={e => patch({program: +e.target.value})}>{Array.from({length:128},(_,i) => <option key={i} value={i}>{a.percussion ? drumPrograms.find(p => p.id === i)?.name || `Kit ${i + 1}` : programs[i].name}</option>)}</select></label>
        <label className="check-row"><input type="checkbox" checked={a.percussion} onChange={e => patch({percussion: e.target.checked})}/>Drum bank</label>
      </div>;
    })}</div>
    {score.warnings.length > 0 && <details className="score-warnings" open><summary>{score.warnings.length} score playback {score.warnings.length === 1 ? 'note' : 'notes'}</summary><ul>{score.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    <p className="fine-print">Import supports 16 parts, 12,000 notes, and 3 minutes. Ties, chords, encoded rhythms, tempo changes, and transposition are retained. PDFs and photos need conversion to MusicXML first.</p>
    {(result.error || error) && <p role="alert" className="error-text">{result.error || error}</p>}
    <div className="score-actions"><button disabled={!result.project} onClick={listen}>{listening || preparing ? <Square size={16}/> : <Headphones size={16}/>} {preparing ? `Preparing ${Math.round(progress*100)}% · cancel` : listening ? 'Stop listening' : 'Listen · first 12 seconds'}</button><button className="primary" disabled={!result.project || preparing} onClick={() => {stop(); if(result.project) apply(result.project);}}><Check size={16}/>Create orchestra{result.project ? ` · ${result.project.tracks.reduce((n,t)=>n+t.notes.length,0).toLocaleString()} notes` : ''}</button></div>
  </div>;
}
