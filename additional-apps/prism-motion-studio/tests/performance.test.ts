import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  entranceEffects, exitEffects, holdEffects, reactionKinds, performancePresets,
  samplePerformance, sampleHold, sampleReaction, type PerformanceTransform,
} from '../lib/performance';

const rest = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 };
const near = (a: number, b: number, epsilon = 1e-9) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);
function valid(pose: PerformanceTransform) {
  assert.ok([...pose.position, ...pose.rotation, ...pose.scale, pose.opacity].every(Number.isFinite));
  assert.ok(pose.scale.every(n => n >= .001), `Invalid axis scale: ${pose.scale}`);
  assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
}
function restMatrix(pose: PerformanceTransform) {
  for (const value of pose.position) near(value, 0);
  for (const value of pose.rotation) { near(Math.sin(value), 0); near(Math.cos(value), 1); }
  for (const value of pose.scale) near(value, 1);
  near(pose.opacity, 1);
}

test('Every entrance lands exactly at rest and every exit starts there', () => {
  for (const amount of [0, .2, 1, 3]) for (const index of [0, 1, 19]) {
    for (const name of entranceEffects) {
      assert.deepEqual(samplePerformance(name, 1, index, amount), rest);
      assert.deepEqual(samplePerformance(name, 2, index, amount), rest);
      near(samplePerformance(name, 0, index, amount).opacity, 0);
    }
    for (const name of exitEffects) {
      assert.deepEqual(samplePerformance(name, 0, index, amount), rest);
      assert.deepEqual(samplePerformance(name, -1, index, amount), rest);
      near(samplePerformance(name, 1, index, amount).opacity, 0);
    }
  }
});

test('All effects stay finite, positively scaled, and bounded in opacity at maximum strength', () => {
  for (const name of [...entranceEffects, ...exitEffects]) for (const amount of [0, 1, 3]) {
    for (let frame = 0; frame <= 180; frame++) valid(samplePerformance(name, frame / 180, frame % 12, amount));
  }
  for (const name of holdEffects) for (let frame = 0; frame <= 600; frame++) valid(sampleHold(name, frame / 60, 10, 3));
  for (const name of reactionKinds) for (let frame = 0; frame <= 120; frame++) {
    const pose = sampleReaction(name, frame / 60, 2, 3);
    valid(pose);
    assert.ok(Number.isFinite(pose.emissive ?? 0));
  }
});

test('Scrubbing backward returns the same transforms, including independent letter paths', () => {
  for (const name of [...entranceEffects, ...exitEffects]) {
    const first = samplePerformance(name, .37, 6, 1.2);
    samplePerformance(name, .93, 2, 3);
    samplePerformance(name, .12, 6, 1.2);
    assert.deepEqual(samplePerformance(name, .37, 6, 1.2), first);
  }
  assert.notDeepEqual(samplePerformance('spiral', .4, 1, 1).position, samplePerformance('spiral', .4, 2, 1).position);
  assert.notDeepEqual(samplePerformance('burst', .7, 1, 1).position, samplePerformance('burst', .7, 2, 1).position);
  for (const name of holdEffects) {
    const first = sampleHold(name, 1.7, 4, 1);
    sampleHold(name, 3.8, 4, 3);
    assert.deepEqual(sampleHold(name, 1.7, 4, 1), first);
  }
  for (const name of reactionKinds) {
    const first = sampleReaction(name, .37, 1, 1);
    sampleReaction(name, 1.2, 1, 3);
    assert.deepEqual(sampleReaction(name, .37, 1, 1), first);
  }
});

test('The drop contacts the floor, compresses on impact, and rebounds with lower height', () => {
  const initial = samplePerformance('drop-bounce', 0, 0, 1);
  const contact = samplePerformance('drop-bounce', 1 / 2.75, 0, 1);
  const rebound = samplePerformance('drop-bounce', 1.5 / 2.75, 0, 1);
  near(contact.position[1], 0);
  assert.ok(contact.scale[1] < .9 && contact.scale[0] > 1);
  assert.ok(rebound.position[1] > 0 && rebound.position[1] < initial.position[1]);
});

test('The hinge follows a fixed top-corner pivot, with rotation expressed in radians', () => {
  const pose = samplePerformance('hinge', .3, 0, 1);
  const angle = pose.rotation[2], pivot = [.65, 1.1];
  near(pose.position[0] + Math.cos(angle) * pivot[0] - Math.sin(angle) * pivot[1], pivot[0]);
  near(pose.position[1] + Math.sin(angle) * pivot[0] + Math.cos(angle) * pivot[1], pivot[1]);
  assert.ok(Math.abs(angle) > .1 && Math.abs(angle) < Math.PI);
});

test('Hold and reaction boundaries leave no transform residue or emissive glow', () => {
  for (const name of holdEffects) for (const time of [-1, 0, 4, 5]) assert.deepEqual(sampleHold(name, time, 4, 1), rest);
  for (const name of reactionKinds) for (const time of [-1, 0, 2, 3]) {
    const pose = sampleReaction(name, time, 2, 1);
    restMatrix(pose);
    near(pose.emissive ?? 0, 0);
  }
  for (const name of holdEffects) assert.deepEqual(sampleHold(name, .5, 1, 0), rest);
  for (const name of reactionKinds) restMatrix(sampleReaction(name, .5, 1, 0));
});

test('Hop has anticipation, positive flight, and a landing squash; squash preserves volume', () => {
  const anticipation = sampleReaction('hop', .11, 1, 1);
  const flight = sampleReaction('hop', .5, 1, 1);
  const landing = sampleReaction('hop', .89, 1, 1);
  assert.ok(anticipation.position[1] < 0 && anticipation.scale[1] < 1);
  assert.ok(flight.position[1] > 1 && flight.scale[1] > 1);
  assert.ok(landing.position[1] < 0 && landing.scale[1] < 1);
  for (const name of ['hop', 'squash']) for (const p of [.1, .3, .5, .8]) {
    const scale = sampleReaction(name, p, 1, 3).scale;
    near(scale[0] * scale[1] * scale[2], 1);
  }
});

test('Spin completes an unwrapped revolution without a last-frame orientation jump', () => {
  for (const amount of [.2, 1, 3]) {
    near(sampleReaction('spin', .5, 1, amount).rotation[1], Math.PI);
    near(sampleReaction('spin', 1, 1, amount).rotation[1], Math.PI * 2);
    restMatrix(sampleReaction('spin', 1, 1, amount));
    const before = sampleReaction('spin', 1 - 1e-5, 1, amount);
    const after = sampleReaction('spin', 1 + 1e-5, 1, amount);
    near(Math.cos(before.rotation[1]), Math.cos(after.rotation[1]), 1e-8);
    near(Math.sin(before.rotation[1]), Math.sin(after.rotation[1]), 1e-8);
  }
});

test('Glow is additive, peaks during the reaction, and never fades text out', () => {
  const middle = sampleReaction('glow', .5, 1, 2);
  near(middle.emissive ?? 0, 5);
  near(middle.opacity, 1);
  assert.ok(middle.scale.every(n => n > 1));
});

test('Malformed or degenerate timing is harmless and callers cannot mutate later samples', () => {
  for (const amount of [NaN, Infinity, -2, 5]) valid(samplePerformance('elastic', .4, 0, amount));
  valid(samplePerformance('spiral', NaN, Infinity, 1));
  for (const duration of [0, -1, NaN, Infinity]) {
    assert.deepEqual(sampleHold('rock', .3, duration, 1), rest);
    restMatrix(sampleReaction('hop', .3, duration, 1));
  }
  assert.deepEqual(samplePerformance('unknown', .5, 0, 1), rest);
  assert.deepEqual(sampleHold('unknown', .5, 1, 1), rest);
  restMatrix(sampleReaction('unknown', .5, 1, 1));
  const changed = samplePerformance('hinge', 1, 0, 1);
  changed.position[0] = 100;
  changed.scale[1] = 0;
  assert.deepEqual(samplePerformance('hinge', 1, 0, 1), rest);
});

test('The six performance presets only name supported motion and grouping choices', () => {
  assert.deepEqual(performancePresets.map(p => p.id), ['metal', 'toy', 'magic', 'mechanical', 'christmas', 'halloween']);
  for (const preset of performancePresets) {
    assert.ok((entranceEffects as readonly string[]).includes(preset.entrance));
    assert.ok((exitEffects as readonly string[]).includes(preset.exit));
    assert.ok(['still', ...holdEffects].includes(preset.holdMotion));
    assert.ok(['object', 'word', 'letter'].includes(preset.unit));
    assert.ok(preset.amount > 0 && preset.amount <= 3);
  }
});
