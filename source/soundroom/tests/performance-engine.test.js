import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceLedger, decodeMIDI } from '../src/performance-engine.js';

test('overlapping touch and MIDI ownership cannot cut each other off', () => {
  const events = [];
  const v = new VoiceLedger((...args) => events.push(['on', ...args]), (...args) => events.push(['off', ...args]));
  v.press('touch', 0, 60, 100); v.press('midi', 0, 60, 80); v.press('second-note', 0, 65, 80);
  v.release('touch');
  assert.equal(events.filter(e => e[0] === 'off').length, 0);
  v.release('midi');
  assert.deepEqual(events.at(-1), ['off', 0, 60]);
  assert.equal(v.notes.size, 1);
  v.press('outside', 0, 128, 80);
  assert.equal(v.notes.size, 1);
  v.clear(); assert.equal(v.owners.size, 0); assert.equal(v.notes.size, 0);
  assert.deepEqual(events.at(-1), ['off', 0, 65]);
});

test('MIDI parser handles velocity zero, channels, full pitch wheel range and malformed data', () => {
  assert.deepEqual(decodeMIDI([0x92, 60, 0]), { type: 'off', channel: 2, note: 60, velocity: 0 });
  assert.deepEqual(decodeMIDI([0xb0, 64, 127]), { type: 'cc', channel: 0, controller: 64, value: 127 });
  assert.equal(decodeMIDI([0xe0, 0, 64]).value, 8192);
  assert.equal(decodeMIDI([0xe0, 127, 127]).value, 16383);
  assert.equal(decodeMIDI([0x90, 60]), null);
  assert.equal(decodeMIDI([0xf8]), null);
  assert.equal(decodeMIDI([0x90, 200, 30]), null);
});
