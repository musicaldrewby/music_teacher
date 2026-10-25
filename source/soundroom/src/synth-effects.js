import { clamp } from './performance-engine.js';

// GS effect messages stay inside the software synth; nothing is sent to MIDI hardware.
export function effectMessage(address, value) {
  value = clamp(Math.round(value), 0, 127);
  const checksum = (128 - ((0x40 + 0x01 + address + value) % 128)) % 128;
  return [0xf0, 0x41, 0x10, 0x42, 0x12, 0x40, 0x01, address, value, checksum, 0xf7];
}

const delaySegments = [
  [1, 20, .1, .1], [20, 35, 2, .2], [35, 45, 5, .5], [45, 55, 10, 1],
  [55, 70, 20, 2], [70, 80, 50, 5], [80, 90, 100, 10], [90, 105, 200, 20], [105, 116, 500, 50]
];
export function delayMilliseconds(value) {
  const segment = delaySegments.find(([start, end]) => value >= start && value < end);
  return segment ? segment[2] + (value - segment[0]) * segment[3] : .1;
}
export function delayValue(milliseconds) {
  let closest = 1, distance = Infinity;
  for (let value = 1; value <= 115; value++) {
    const delta = Math.abs(delayMilliseconds(value) - milliseconds);
    if (delta < distance) { closest = value; distance = delta; }
  }
  return closest;
}

export class SynthEffects {
  constructor(synth, channels) { this.synth = synth; this.channels = channels; this.previous = new Map(); }
  set(address, value) {
    if (this.previous.get(address) === value) return;
    this.synth.sendMessage(effectMessage(address, value)); this.previous.set(address, value);
  }
  apply(settings) {
    const s = this.synth;
    this.set(0x31, settings.reverbType); this.set(0x32, settings.reverbDamping);
    this.set(0x33, 64); this.set(0x34, settings.reverbDecay); this.set(0x37, settings.reverbPredelay);
    this.set(0x51, settings.delayDamping); this.set(0x52, settings.delayTime);
    this.set(0x53, 18); this.set(0x54, 30);
    this.set(0x55, settings.delayStereo ? 64 : 127);
    this.set(0x56, settings.delayStereo ? 88 : 0); this.set(0x57, settings.delayStereo ? 88 : 0);
    this.set(0x58, 64); this.set(0x59, 64 + Math.round(clamp(settings.delayFeedback, 0, 75) / 100 * 66));
    this.set(0x5a, 0);
    // Fixed sends, continuously variable wet gains. Dry sound remains intact.
    for (const channel of this.channels) {
      s.controllerChange(channel, 91, settings.reverbEnabled ? 80 : 0);
      s.controllerChange(channel, 94, settings.delayEnabled ? 100 : 0);
      s.controllerChange(channel, 93, 0);
    }
    s.setSystemParameter('reverbGain', settings.reverbEnabled ? settings.reverbMix / 100 : 0);
    s.setSystemParameter('delayGain', settings.delayEnabled ? settings.delayMix / 100 : 0);
    s.setSystemParameter('chorusGain', 0);
  }
}
