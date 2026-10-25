import {audible} from './score-model.js';
// Dedicated channels 16–47 avoid changing the scene workstation's live/sequence parts.
export function prepareComposition(synth,p){
 while(synth.midiChannels.length<16+p.tracks.length)synth.createMIDIChannel();
 synth.setSystemParameter('voiceCap',256);
 p.tracks.forEach((t,i)=>{const ch=16+i;synth.midiChannels[ch].stopAllNotes(true);synth.controllerChange(ch,121,0);synth.midiChannels[ch].setDrums(t.patch.isGMGSDrum);synth.controllerChange(ch,0,t.patch.bankMSB);synth.controllerChange(ch,32,t.patch.bankLSB);synth.programChange(ch,t.patch.program);synth.midiChannels[ch].setSystemParameter('gain',audible(p,i)?.8:0);for(const [cc,v] of [[7,t.volume],[10,t.pan],[11,127],[64,0],[91,t.reverb],[94,0]])synth.controllerChange(ch,cc,v)});
}
export function stopComposition(synth){for(let ch=16;ch<synth.midiChannels.length;ch++){synth.controllerChange(ch,64,0);synth.midiChannels[ch].stopAllNotes(true)}}
