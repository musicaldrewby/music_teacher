import test from 'node:test';
import assert from 'node:assert/strict';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine} from '../dist/engine.js';
globalThis.fetch=async()=>new Response('{}');
async function render(stop){
 const e=new AudioEngine(),ctx=new OfflineAudioContext(1,44100,44100);e.ctx=ctx;e.mix={master:ctx.createGain()};e.mix.master.connect(ctx.destination);
 e.click(.15,true);e.click(.4,false);assert.equal(e.clicks.size,2);
 if(stop==='all'){e.stop();assert.equal(e.clicks.size,0);}
 if(stop==='part'){e.stop('bass-part');assert.equal(e.clicks.size,2);}
 const output=await ctx.startRendering();return output.getChannelData(0);
}
test('Stop cancels already queued metronome audio before it can sound',async()=>{
 const normal=await render(),stopped=await render('all');
 assert.ok(normal.some(n=>Math.abs(n)>.01));assert.ok(stopped.every(n=>n===0));
});
test('damping one instrument preserves the ensemble metronome',async()=>{
 const output=await render('part');assert.ok(output.some(n=>Math.abs(n)>.01));
});
