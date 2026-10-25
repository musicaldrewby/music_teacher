// Shared musical state: no DOM or audio device dependencies.
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Different fingers, MIDI ports and demos can own the same voice. Releasing one
// source must never release a note still owned by another source.
export class VoiceLedger {
  constructor(on, off) { this.on = on; this.off = off; this.owners = new Map(); this.notes = new Map(); }
  press(owner, channel, note, velocity) {
    this.release(owner);
    if (!Number.isInteger(note) || note < 0 || note > 127) return;
    const key = `${channel}:${note}`;
    let voice = this.notes.get(key);
    if (!voice) {
      voice = { channel, note, owners: new Set() };
      this.notes.set(key, voice);
      this.on(channel, note, clamp(Math.round(velocity), 1, 127));
    }
    voice.owners.add(owner); this.owners.set(owner, key);
  }
  release(owner) {
    const key = this.owners.get(owner);
    if (key === undefined) return;
    this.owners.delete(owner);
    const voice = this.notes.get(key);
    voice.owners.delete(owner);
    if (!voice.owners.size) { this.notes.delete(key); this.off(voice.channel, voice.note); }
  }
  clear() { for (const owner of [...this.owners.keys()]) this.release(owner); }
}

export function decodeMIDI(data) {
  if (!data || data.length < 2 || data[0] < 0x80 || data[0] >= 0xf0) return null;
  const type = data[0] & 0xf0, channel = data[0] & 0x0f;
  const a = data[1], b = data[2];
  if (a > 127 || (b !== undefined && b > 127)) return null;
  if (type === 0x90 && data.length >= 3) return { type: b ? 'on' : 'off', channel, note: a, velocity: b };
  if (type === 0x80 && data.length >= 3) return { type: 'off', channel, note: a };
  if (type === 0xb0 && data.length >= 3) return { type: 'cc', channel, controller: a, value: b };
  if (type === 0xe0 && data.length >= 3) return { type: 'bend', channel, value: a | (b << 7) };
  if (type === 0xd0) return { type: 'pressure', channel, value: a };
  return null;
}
