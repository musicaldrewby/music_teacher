// Rebuild: node scripts/render-marimba.mjs /path/to/spessasynth_core/dist/index.js [original.sf2]
// Uses spessasynth_core 4.3.22 only at authoring time; no synthesizer library ships to the browser.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const { SoundBankLoader, SpessaSynthProcessor, SpessaLog } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
SpessaLog.setLogLevel(false, false, false);
const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/assets/audio');
const sf2 = fs.readFileSync(path.join(folder, 'marimba.sf2'));
const original = process.argv[3] ? fs.readFileSync(process.argv[3]) : null;
const sampleRate = 44100, velocity = 96;
async function render(bankBytes, midi) {
  // Each processor owns its bank data; never reuse a destroyed bank.
  const bank = SoundBankLoader.fromArrayBuffer(bankBytes.buffer.slice(bankBytes.byteOffset, bankBytes.byteOffset + bankBytes.byteLength));
  const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false, effectsEnabled: false });
  synth.soundBankManager.addSoundBank(bank, 'marimba');
  await synth.processorInitialized;
  synth.programChange(0, 12);
  synth.noteOn(0, midi, velocity);
  const left = new Float32Array(sampleRate * 12), right = new Float32Array(left.length);
  for (let start = 0; start < left.length; start += 128) synth.process(left, right, start, Math.min(128, left.length - start));
  synth.destroySynthProcessor();
  return left.map((v, i) => (v + right[i]) / 2);
}
const chunks = [], notes = [];
let offset = 0, peak = 0;
for (let midi = 36; midi <= 105; midi++) {
  const raw = await render(sf2, midi);
  if (original) {
    const reference = await render(original, midi);
    if (!raw.every((sample, i) => sample === reference[i])) throw new Error(`Subset differs from original: ${midi}`);
  }
  let end = 0, localPeak = 0;
  for (let i = 0; i < raw.length; i++) {
    localPeak = Math.max(localPeak, Math.abs(raw[i]));
    if (Math.abs(raw[i]) > 0.00004) end = i + 1;
  }
  if (localPeak < .001 || end < sampleRate / 5) throw new Error(`Silent or truncated note: ${midi}`);
  const fade = Math.round(sampleRate * .03);
  end = Math.min(raw.length, end + fade);
  const pcm = Buffer.alloc(end * 2);
  for (let i = 0; i < end; i++) {
    const value = raw[i] * 2 * Math.min(1, (end - 1 - i) / fade);
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) >= 1) throw new Error('Clipped audio');
    pcm.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  notes.push({ midi, offset: offset / sampleRate, duration: end / sampleRate });
  chunks.push(pcm); offset += end;
}
const pcm = Buffer.concat(chunks), header = Buffer.alloc(44);
header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
const wav = path.join(folder, 'marimba-notes-v1.wav');
fs.writeFileSync(wav, Buffer.concat([header, pcm]));
execFileSync('ffmpeg', ['-v','error','-y','-i',wav,'-c:a','flac','-compression_level','8',path.join(folder,'marimba-notes-v1.flac')]);
const manifest = { version: 1, sampleRate, instrument: 'GeneralUser GS 1.471 Marimba', velocity,
  soundfontSHA256: createHash('sha256').update(sf2).digest('hex'),
  renderer: 'spessasynth_core 4.3.22', effects: false, gain: 2, notes };
fs.writeFileSync(path.join(folder, 'marimba-notes-v1.json'), JSON.stringify(manifest));
console.log(JSON.stringify({ notes: notes.length, peak, wavBytes: fs.statSync(wav).size,
  flacBytes: fs.statSync(path.join(folder,'marimba-notes-v1.flac')).size,
  matchedOriginal: !!original, totalDuration: offset / sampleRate }));
