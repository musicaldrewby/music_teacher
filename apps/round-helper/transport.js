(function (root) {
  'use strict';
  const DEFAULTS = { bpm: 100, measures: 8, timeSignature: '4/4', groupCount: 3, offsetValue: 2, offsetUnit: 'measures', repeats: 2, soundEnabled: true, metronomeStyle: 'accent', highPitchAccent: true };
  const integer = (value, min, max, fallback) => Number.isFinite(Number(value)) && String(value).trim() !== '' ? Math.max(min, Math.min(max, Math.round(Number(value)))) : fallback;
  function normalizeConfig(input = {}) {
    const c = { ...DEFAULTS, ...input };
    return { ...c, bpm: integer(c.bpm, 40, 200, 100), measures: integer(c.measures, 1, 32, 8), groupCount: integer(c.groupCount, 2, 4, 3), repeats: integer(c.repeats, 1, 32, 2), offsetValue: integer(c.offsetValue, 1, 128, 2), timeSignature: ['2/4', '3/4', '4/4', '6/8'].includes(c.timeSignature) ? c.timeSignature : '4/4', offsetUnit: c.offsetUnit === 'beats' ? 'beats' : 'measures' };
  }
  function timing(config) {
    const c = normalizeConfig(config);
    const beatsPerMeasure = c.timeSignature === '6/8' ? 2 : Number(c.timeSignature[0]);
    const loop = c.measures * beatsPerMeasure;
    const offset = c.offsetValue * (c.offsetUnit === 'measures' ? beatsPerMeasure : 1);
    return { beatsPerMeasure, loop, offset, total: (c.groupCount - 1) * offset + loop * c.repeats };
  }
  function groupState(index, position, config) {
    const t = timing(config);
    const start = index * t.offset, length = t.loop * config.repeats;
    const elapsed = Math.max(0, Math.min(length, position - start));
    const status = position < start ? 'waiting' : position >= start + length ? 'done' : 'singing';
    return { status, start, end: start + length, progress: elapsed / length, repetition: status === 'done' ? config.repeats : Math.floor(elapsed / t.loop) + 1, inLoop: elapsed % t.loop };
  }
  class RoundTransport {
    constructor(config, environment = {}) {
      this.config = normalizeConfig(config);
      this.env = { createAudioContext: () => new (window.AudioContext || window.webkitAudioContext)(), setTimeout: (fn, delay) => setTimeout(fn, delay), clearTimeout: id => clearTimeout(id), requestAnimationFrame: fn => requestAnimationFrame(fn), cancelAnimationFrame: id => cancelAnimationFrame(id), ...environment };
      this.ctx = null;
      this.listeners = new Set();
      this.nodes = new Set();
      this.status = 'ready';
      this.position = -timing(this.config).beatsPerMeasure;
      this.anchorPosition = this.position;
      this.anchorTime = 0;
      this.lastAudibleBeat = this.position - 1;
      this.nextBeat = this.position;
      this.generation = 0;
      this.error = '';
    }
    subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
    snapshot() { return { position: this.position, beat: Math.floor(this.position + 1e-7), status: this.status, error: this.error }; }
    emit() { const s = this.snapshot(); this.listeners.forEach(fn => fn(s)); }
    clockPosition() { return this.status === 'playing' ? Math.min(timing(this.config).total, this.anchorPosition + Math.max(0, this.ctx.currentTime - this.anchorTime) * this.config.bpm / 60) : this.position; }
    markAudible() { if (!this.ctx) return; for (const item of this.nodes) if (item.at <= this.ctx.currentTime) this.lastAudibleBeat = Math.max(this.lastAudibleBeat, item.beat); }
    clearTimers() { this.env.clearTimeout(this.timer); this.env.cancelAnimationFrame(this.frame); this.timer = this.frame = null; }
    cancelNotes(futureOnly = false) {
      if (!this.ctx) return;
      for (const item of [...this.nodes]) {
        if (futureOnly && item.at <= this.ctx.currentTime) continue;
        try { item.gain.gain.cancelScheduledValues(this.ctx.currentTime); item.gain.gain.setValueAtTime(0, this.ctx.currentTime); item.osc.stop(this.ctx.currentTime); } catch (_) { /* Already ended. */ }
        item.osc.disconnect(); item.gain.disconnect(); this.nodes.delete(item);
      }
    }
    click(beat, at) {
      const ctx = this.ctx, c = this.config, t = timing(c);
      if (!c.soundEnabled) return;
      const downbeat = beat % t.beatsPerMeasure === 0;
      const loopStart = beat >= 0 && beat % t.loop === 0;
      const frequency = c.metronomeStyle === 'flat' ? 1000 : beat < 0 ? (downbeat ? 880 : 660) : c.highPitchAccent && loopStart ? 1046.5 : c.highPitchAccent && downbeat ? 880 : 440;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.13, at + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.065);
      osc.connect(gain); gain.connect(ctx.destination);
      const item = { osc, gain, at, beat };
      this.nodes.add(item);
      osc.onended = () => { this.nodes.delete(item); osc.disconnect(); gain.disconnect(); };
      osc.start(at); osc.stop(at + 0.07);
    }
    schedule() {
      if (this.status !== 'playing') return;
      this.markAudible();
      const now = this.ctx.currentTime, t = timing(this.config);
      const position = this.clockPosition();
      // Never burst through missed clicks after the browser has been busy.
      while (this.nextBeat < t.total) {
        const at = this.anchorTime + (this.nextBeat - this.anchorPosition) * 60 / this.config.bpm;
        if (at > now + 0.1) break;
        if (at >= now - 0.02) this.click(this.nextBeat, Math.max(now, at));
        this.nextBeat++;
        if (this.nextBeat < position - 1) this.nextBeat = Math.ceil(position);
      }
      this.timer = this.env.setTimeout(() => this.schedule(), 25);
    }
    animate() {
      if (this.status !== 'playing') return;
      this.markAudible();
      this.position = this.clockPosition();
      if (this.position >= timing(this.config).total) {
        this.status = 'complete'; this.clearTimers(); this.cancelNotes(); this.emit(); return;
      }
      this.emit();
      this.frame = this.env.requestAnimationFrame(() => this.animate());
    }
    async start() {
      if (this.status === 'playing' || this.status === 'starting') return;
      if (this.status === 'complete') this.reset();
      const previous = this.status;
      const token = ++this.generation;
      this.status = 'starting'; this.error = ''; this.emit();
      try {
        if (!this.ctx || this.ctx.state === 'closed') this.ctx = this.env.createAudioContext();
        if (this.ctx.state !== 'running') await this.ctx.resume();
        if (this.ctx.state !== 'running') throw new Error('Audio is not ready. Tap Play again.');
        if (token !== this.generation) return;
        this.anchorPosition = this.position;
        this.anchorTime = this.ctx.currentTime + 0.06;
        this.nextBeat = Math.max(Math.ceil(this.position - 1e-7), this.lastAudibleBeat + 1);
        this.status = 'playing'; this.schedule(); this.animate();
      } catch (_) {
        if (token !== this.generation) return;
        this.status = previous; this.error = 'Audio could not start. Please tap Play to try again.'; this.emit();
      }
    }
    pause() {
      if (this.status !== 'playing' && this.status !== 'starting') return;
      ++this.generation;
      if (this.status === 'playing') { this.markAudible(); this.position = this.clockPosition(); }
      this.status = 'paused'; this.clearTimers(); this.cancelNotes(); this.emit();
    }
    reset() {
      ++this.generation; this.clearTimers(); this.cancelNotes();
      this.status = 'ready'; this.error = '';
      this.position = -timing(this.config).beatsPerMeasure;
      this.lastAudibleBeat = this.position - 1;
      this.emit();
    }
    update(patch) {
      const before = this.config, next = normalizeConfig({ ...before, ...patch });
      if (Object.keys(next).every(key => next[key] === before[key])) return;
      const structural = ['measures', 'timeSignature', 'groupCount', 'offsetValue', 'offsetUnit', 'repeats'].some(key => before[key] !== next[key]);
      const playing = this.status === 'playing';
      if (playing) { this.markAudible(); this.position = this.clockPosition(); }
      this.config = next;
      if (structural) { this.reset(); return; }
      if (playing) {
        const now = this.ctx.currentTime;
        const remainingLead = Math.max(0, this.anchorTime - now);
        this.clearTimers(); this.cancelNotes(true);
        this.anchorTime = now + remainingLead; this.anchorPosition = this.position;
        this.nextBeat = Math.max(Math.ceil(this.position - 1e-7), this.lastAudibleBeat + 1);
        this.schedule(); this.animate();
      } else this.emit();
    }
    destroy() { ++this.generation; this.clearTimers(); this.cancelNotes(); this.listeners.clear(); if (this.ctx) this.ctx.close(); }
  }
  const api = { DEFAULTS, integer, normalizeConfig, timing, groupState, RoundTransport };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RoundHelper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
