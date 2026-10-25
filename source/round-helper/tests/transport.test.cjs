const test = require('node:test');
const assert = require('node:assert/strict');
const { RoundTransport, normalizeConfig, timing, groupState } = require('../src/transport.js');
function rig(config = {}) {
  let now = 0, id = 0;
  const jobs = new Map(), notes = [];
  const later = (fn, seconds) => { const key = ++id; jobs.set(key, { at: now + seconds, fn }); return key; };
  const ctx = {
    state: 'running', get currentTime() { return now; }, destination: {}, resume: async () => { ctx.state = 'running'; }, close: () => {},
    createOscillator() {
      const note = { at: null, end: null, frequency: null };
      let ended;
      const osc = { type: '', connect() {}, disconnect() {}, frequency: { setValueAtTime(value) { note.frequency = value; } },
        start(at) { note.at = at; notes.push(note); },
        stop(at) { note.end = at; jobs.delete(ended); ended = later(() => osc.onended?.(), Math.max(0, at - now)); }
      };
      return osc;
    },
    createGain() { return { connect() {}, disconnect() {}, gain: { cancelScheduledValues() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  };
  const engine = new RoundTransport(config, { createAudioContext: () => ctx, setTimeout: (fn, ms) => later(fn, ms / 1000), clearTimeout: key => jobs.delete(key), requestAnimationFrame: fn => later(fn, 1 / 60), cancelAnimationFrame: key => jobs.delete(key) });
  const advance = seconds => {
    const target = now + seconds;
    let count = 0;
    while (true) {
      const next = [...jobs].filter(([, j]) => j.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      if (++count > 100000) throw new Error('Runaway timer');
      jobs.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = target;
  };
  return { engine, notes, ctx, advance, jobs, audible: () => notes.filter(n => n.end > n.at && n.at <= now), get now() { return now; } };
}
const near = (value, expected) => assert.ok(Math.abs(value - expected) < 1e-6, `${value} != ${expected}`);

test('invalid numbers cannot create zero-length rounds or unbounded groups', () => {
  const c = normalizeConfig({ bpm: 0, measures: '', repeats: Infinity, groupCount: 40, offsetValue: NaN });
  assert.equal(c.bpm, 40); assert.equal(c.measures, 8); assert.equal(c.repeats, 2); assert.equal(c.groupCount, 4); assert.equal(c.offsetValue, 2);
  assert.equal(normalizeConfig({ measures: 2.7 }).measures, 3);
});
test('6/8 uses two dotted-quarter pulses and staggered groups finish independently', () => {
  const c = normalizeConfig({ timeSignature: '6/8', measures: 4, groupCount: 3, repeats: 2, offsetValue: 2 });
  assert.deepEqual(timing(c), { beatsPerMeasure: 2, loop: 8, offset: 4, total: 24 });
  assert.equal(groupState(1, 3.99, c).status, 'waiting');
  assert.equal(groupState(1, 4, c).status, 'singing');
  assert.equal(groupState(0, 16, c).status, 'done');
  assert.equal(groupState(2, 24, c).status, 'done');
});
test('clicks start on scheduled audio times and finish without an extra beat', async () => {
  const r = rig({ bpm: 120, measures: 1, groupCount: 2, offsetValue: 1, repeats: 1 });
  await r.engine.start();
  near(r.notes[0].at, .06); assert.equal(r.audible().length, 0);
  r.advance(6.2);
  assert.equal(r.engine.status, 'complete'); near(r.engine.position, 8);
  assert.equal(r.audible().length, 12);
  r.audible().forEach((n, i) => near(n.at, .06 + i * .5));
  assert.equal(r.jobs.size, 0);
});
test('pause and resume retain the exact position within the final count-in beat', async () => {
  const r = rig({ bpm: 120 }); await r.engine.start(); r.advance(1.7); r.engine.pause();
  near(r.engine.position, -.72); const paused = r.engine.position;
  r.advance(5); near(r.engine.position, paused);
  const resumeTime = r.now; await r.engine.start(); near(r.engine.position, paused);
  r.advance(.5);
  const resumedNotes = r.audible().filter(n => n.at >= resumeTime);
  assert.equal(resumedNotes.length, 1); near(resumedNotes[0].at, resumeTime + .06 + .36);
});
test('live tempo changes keep the clock and next click aligned', async () => {
  const r = rig({ bpm: 120 }); await r.engine.start(); r.advance(.7); r.engine.update({ bpm: 60 });
  near(r.engine.position, -2.72);
  r.advance(.75); const next = r.audible().at(-1); near(next.at, 1.42);
  near(r.engine.clockPosition(), -1.97);
});
test('muting cancels upcoming clicks and restoring sound keeps the same beat phase', async () => {
  const r = rig({ bpm: 120 }); await r.engine.start(); r.advance(.49); r.engine.update({ soundEnabled: false });
  r.advance(.2); assert.equal(r.audible().length, 1);
  r.engine.update({ soundEnabled: true }); r.advance(.4);
  near(r.audible().at(-1).at, 1.06);
});
test('reset cancels scheduled sound and replay after completion includes a fresh count-in', async () => {
  const r = rig({ bpm: 200, measures: 1, timeSignature: '2/4', groupCount: 2, repeats: 1, offsetValue: 1 });
  await r.engine.start(); r.engine.reset(); r.advance(.2); assert.equal(r.audible().length, 0); assert.equal(r.engine.status, 'ready');
  await r.engine.start(); r.advance(2); assert.equal(r.engine.status, 'complete');
  await r.engine.start(); assert.equal(r.engine.status, 'playing'); near(r.engine.position, -2);
  r.engine.update({ measures: 2 }); assert.equal(r.engine.status, 'ready'); near(r.engine.position, -2);
});
