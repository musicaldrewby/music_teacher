// Desktop mouse capture and shared world input. UI panels keep their own cursor.
const walkingKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ControlLeft','ControlRight']);
const directPointer = e => e.pointerType === 'touch' || e.pointerType === 'pen';
export function startsWithTouch(win) {
  const matches = query => !!win.matchMedia?.(query).matches;
  return matches('(pointer: coarse)') || (!!win.navigator?.maxTouchPoints && matches('(hover: none)'));
}
export class WorldControls {
  constructor(canvas, api, env = {}) {
    this.canvas = canvas;
    this.api = api;
    this.doc = env.document || document;
    this.win = env.window || window;
    this.now = env.now || (() => performance.now());
    this.coarse = env.coarse ?? startsWithTouch(this.win);
    this.keys = Object.create(null);
    this.dragMode = false;
    this.suspended = false;
    this.pending = false;
    this.waitingKeys = new Set();
    this.wasLocked = false;
    this.lastUnlock = -Infinity;
    this.lastSpace = -Infinity;
    this.contextBlockUntil = -Infinity;
    this.held = null;
    this.drag = null;
    this.stick = {forward:0, side:0};
    this.stickFinger = null;
    this.heldTouch = new Map();
    this.miningInputs = new Set();
    this.canvas.tabIndex = 0;
    this.bind();
  }
  get locked() { return this.doc.pointerLockElement === this.canvas; }
  get playing() { return this.api.isPlaying(); }
  canMove() { return this.playing && !this.suspended && (this.locked || this.dragMode || this.coarse); }
  get mining() { return this.canMove() && this.miningInputs.size > 0; }
  get rise() { return !!this.keys.Space || this.heldTouch.has('jump'); }
  get lower() { return this.heldTouch.has('lower'); }
  inputType(e) {
    if (!directPointer(e) && e.pointerType !== 'mouse') return;
    if (e.sourceCapabilities?.firesTouchEvents && e.pointerType === 'mouse') return;
    const touch = directPointer(e);
    if (touch === this.coarse) return;
    this.coarse = touch;
    this.clear();
    if (touch && this.locked) this.doc.exitPointerLock();
    this.api.pointerState(this.dragMode ? 'drag' : 'released');
  }
  bindStick(pad) {
    const thumb = pad.querySelector('.stick-thumb');
    const update = e => {
      if (this.stickFinger !== e.pointerId) return;
      const box = pad.getBoundingClientRect();
      const dx = e.clientX - box.left - box.width/2, dy = e.clientY - box.top - box.height/2;
      const radius = box.width * .32, distance = Math.hypot(dx,dy);
      const amount = Math.max(0,Math.min(1,(distance/radius-.14)/.86));
      this.stick.side = amount * dx / (distance || 1);
      this.stick.forward = -amount * dy / (distance || 1);
      const scale = Math.min(1,radius/(distance || 1));
      thumb.style.transform = `translate(${Math.round(dx*scale)}px,${Math.round(dy*scale)}px)`;
    };
    this.resetStick = () => {
      this.stickFinger = null; this.stick.forward = this.stick.side = 0;
      thumb.style.transform = ''; pad.classList.remove('pressed');
    };
    pad.addEventListener('pointerdown',e=>{
      if (!this.canMove() || !directPointer(e) || this.stickFinger !== null) return;
      e.preventDefault(); this.stickFinger = e.pointerId; pad.setPointerCapture(e.pointerId);
      pad.classList.add('pressed'); update(e);
    });
    pad.addEventListener('pointermove',update);
    pad.addEventListener('lostpointercapture',e=>{if(e.pointerId===this.stickFinger)this.resetStick();});
  }
  bindTouchAction(button,action) {
    const hold = action === 'jump' || action === 'lower';
    const act = () => {
      if (action === 'jump') this.jumpPress();
      else if (action !== 'lower') this.api.action(action);
    };
    button.addEventListener('pointerdown',e=>{
      if (!this.canMove() || !directPointer(e) || (hold && this.heldTouch.has(action))) return;
      e.preventDefault(); button.setPointerCapture(e.pointerId);
      if (hold) this.heldTouch.set(action,e.pointerId);
      act();
    });
    button.addEventListener('lostpointercapture',e=>{
      if (this.heldTouch.get(action) === e.pointerId) this.heldTouch.delete(action);
    });
    // Keyboard and assistive technology can also activate the labeled buttons.
    button.addEventListener('click',e=>{if(e.detail===0 && !e.pointerType && this.canMove())act();});
  }
  jumpPress() {
    const now = this.now();
    if (this.api.creative() && now - this.lastSpace <= 280) {
      this.lastSpace = -Infinity; this.api.action('flight');
    } else { this.lastSpace = now; this.api.action('jump'); }
  }
  releaseFinger(e) {
    if (this.stickFinger === e.pointerId) this.resetStick?.();
    if (this.drag?.id === e.pointerId) this.drag = null;
    for (const [action,id] of this.heldTouch) if (e.pointerId === id) this.heldTouch.delete(action);
    this.setMining(false,'pointer:'+e.pointerId);
  }
  setMining(active, source) {
    if (active && !this.canMove()) return;
    const before=this.miningInputs.size;
    if (active) this.miningInputs.add(source); else this.miningInputs.delete(source);
    if (!before && this.miningInputs.size) this.api.mine?.(true);
    else if (before && !this.miningInputs.size) this.api.mine?.(false);
  }
  stopMining() { const active=this.miningInputs.size>0;this.miningInputs.clear();if(active)this.api.mine?.(false); }
  bindMiningButton(button) {
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(!this.canMove())return;button.setPointerCapture?.(e.pointerId);this.setMining(true,'pointer:'+e.pointerId);});
    button.addEventListener('lostpointercapture',e=>this.setMining(false,'pointer:'+e.pointerId));
    button.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();if(!e.repeat)this.setMining(true,'button-key');}});
    button.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();this.setMining(false,'button-key');}});
    button.addEventListener('blur',()=>this.setMining(false,'button-key'));
  }
  clear() {
    this.stopMining();
    this.resetStick?.();
    this.heldTouch.clear();
    this.waitingKeys.clear();
    for (const key of Object.keys(this.keys)) delete this.keys[key];
    this.held = null;
    this.drag = null;
    this.lastSpace = -Infinity;
  }
  async requestLook() {
    if (!this.playing) return;
    this.suspended = false;
    if (this.coarse || this.dragMode) { this.api.pointerState(this.dragMode ? 'drag' : 'released'); return; }
    if (this.locked || this.pending) return;
    this.pending = true;
    this.api.pointerState('requesting');
    this.canvas.focus({ preventScroll: true });
    try {
      if (typeof this.canvas.requestPointerLock !== 'function') throw new Error('Pointer lock unavailable');
      // Run directly in the Enter / Resume click, before awaiting audio or other work.
      await this.canvas.requestPointerLock();
    } catch (error) {
      console.warn('Mouse capture unavailable:', error?.name, error?.message);
      this.pending = false;
      this.waitingKeys.clear();
      if (this.playing && !this.locked) this.api.pointerState('blocked');
    }
  }
  setDragMode(enabled) {
    this.dragMode = !!enabled;
    this.release();
    this.api.pointerState(this.dragMode ? 'drag' : 'released');
  }
  suspend() { this.suspended = true; this.release(); }
  release() {
    this.clear();
    if (this.locked) this.doc.exitPointerLock();
  }
  lockChanged() {
    const locked = this.locked, lost = this.wasLocked && !locked;
    const heldOnEntry=locked&&this.pending&&this.playing&&!this.suspended?[...this.waitingKeys]:[];
    this.wasLocked = locked;
    this.pending = false;
    if (!(lost && this.coarse)) this.clear();
    for(const key of heldOnEntry)this.keys[key]=true;
    if (lost) this.lastUnlock = this.now();
    if (locked && (!this.playing || this.suspended || this.coarse)) { this.release(); return; }
    this.api.pointerState(locked ? 'locked' : this.dragMode ? 'drag' : 'released');
    if (lost && this.playing && !this.dragMode && !this.suspended && !this.coarse) this.api.pause();
  }
  editable(target) { return target?.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target?.tagName || ''); }
  keyDown(e) {
    if (e.code === 'Escape') {
      if (e.repeat) return;
      e.preventDefault();
      if (this.locked) this.api.pause();
      else if (this.now() - this.lastUnlock > 180) this.api.escape();
      return;
    }
    if (this.editable(e.target)) return;
    if(this.pending&&this.playing&&!this.suspended&&walkingKeys.has(e.code)){
      e.preventDefault();this.waitingKeys.add(e.code);return;
    }
    if (!this.playing) {
      if(!e.repeat&&e.code==='KeyJ'&&this.api.panel()==='map-panel'){e.preventDefault();this.api.action('map');return;}
      if (!e.repeat && (e.code === 'KeyE' || e.code === 'KeyB') && this.api.panel() === 'inventory-panel') {
        e.preventDefault(); this.api.action('backpack');
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
      e.preventDefault(); if (!e.repeat) this.api.action('undo'); return;
    }
    if (['KeyE', 'KeyB', 'KeyM','KeyJ'].includes(e.code)) {
      e.preventDefault(); if (!e.repeat) this.api.action(e.code === 'KeyM' ? 'studio' : e.code === 'KeyJ' ? 'map' : 'backpack'); return;
    }
    if (!this.canMove()) return;
    const movement = ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    if (movement.includes(e.code)) e.preventDefault();
    this.keys[e.code] = true;
    if (e.code === 'KeyG' && !e.ctrlKey && !e.metaKey) { e.preventDefault();if(!e.repeat)this.setMining(true,'key-g');return; }
    if (e.repeat) return;
    if (e.code === 'Digit0') { e.preventDefault();this.api.action('hand'); }
    if (/^Digit[1-9]$/.test(e.code)) { e.preventDefault(); this.api.select(Number(e.code.slice(-1))-1); }
    if (e.code === 'Space') this.jumpPress();
    // Extra keyboard-only alternatives; mouse remains the primary building input.
    if (!e.ctrlKey && !e.metaKey) {
      const actions = {KeyR:'rotate',KeyV:'flight',KeyP:'place',KeyF:'use',KeyT:'torch',KeyN:'view'};
      if (actions[e.code]) { e.preventDefault(); this.api.action(actions[e.code]); }
    }
  }
  pointerDown(e) {
    if (!this.playing) return;
    if (this.suspended) { e.preventDefault(); if (e.button === 0) this.requestLook(); return; }
    if (e.button === 2) { e.preventDefault(); this.contextBlockUntil = this.now() + 1000; }
    if (directPointer(e)) {
      if (this.drag) return;
      this.drag = { id:e.pointerId, x:e.clientX, y:e.clientY };
      this.canvas.setPointerCapture?.(e.pointerId);
      return;
    }
    if (!this.locked && !this.dragMode) {
      // The capture click must never also remove or place a block.
      if (e.button === 0) { e.preventDefault(); this.requestLook(); }
      return;
    }
    if (this.dragMode && e.button === 0) {
      this.drag = { id:e.pointerId, x:e.clientX, y:e.clientY };
      this.canvas.setPointerCapture?.(e.pointerId); return;
    }
    e.preventDefault();
    if (e.button === 0) { this.held=null;this.setMining(true,'mouse'); }
    if (e.button === 2) {
      this.stopMining();
      const interacted = this.api.secondary();
      if (!interacted && this.playing) this.held = {button:2,next:this.now()+260};
    }
    if (e.button === 1) this.api.action('pick');
    if (!this.playing) this.held = null;
  }
  update(now) {
    if (!this.canMove()) { this.held = null; this.stopMining(); return; }
    if (!this.held || now < this.held.next) return;
    const button = this.held.button;
    this.held.next = now + 200;
    if (button === 2 && this.api.secondary()) this.held = null;
    if (!this.playing) this.held = null;
  }
  bind() {
    this.doc.addEventListener('pointerdown',e=>this.inputType(e),{capture:true});
    // Pointer lock can retarget events to the document. A use-click may also
    // open a panel before contextmenu arrives, so keep that click suppressed.
    this.doc.addEventListener('contextmenu', e => {
      if (this.playing || this.locked || e.target === this.canvas || this.now() < this.contextBlockUntil) {
        e.preventDefault(); e.stopPropagation();
      }
    }, {capture:true});
    this.doc.addEventListener('mousedown', e => {
      if (e.button === 2 && this.playing) { e.preventDefault(); this.contextBlockUntil = this.now() + 1000; }
    }, {capture:true});
    this.doc.addEventListener('pointerlockchange', () => this.lockChanged());
    this.doc.addEventListener('pointerlockerror', () => {
      this.pending = false;
      this.waitingKeys.clear();
      if (this.playing && !this.locked) this.api.pointerState('blocked');
    });
    // Mousemove on the document is the interoperable event during pointer lock.
    this.doc.addEventListener('mousemove', e => {
      if (this.locked && this.playing) this.api.look(e.movementX || 0, e.movementY || 0);
    });
    this.canvas.addEventListener('pointerdown', e => this.pointerDown(e));
    this.canvas.addEventListener('pointermove', e => {
      if (!this.playing || this.locked || this.drag?.id !== e.pointerId) return;
      this.api.look(e.clientX-this.drag.x,e.clientY-this.drag.y);
      this.drag.x=e.clientX; this.drag.y=e.clientY;
    });
    this.canvas.addEventListener('lostpointercapture',e=>{if(this.drag?.id===e.pointerId)this.drag=null;});
    this.doc.addEventListener('pointerup', e => {
      this.releaseFinger(e);
      if(directPointer(e))return;
      if(e.button===0)this.setMining(false,'mouse');
      if (this.held?.button === e.button) this.held = null;
    });
    this.doc.addEventListener('pointercancel', e => {
      if(e.pointerId===undefined){this.clear();return;}
      this.releaseFinger(e);
      if(e.pointerType==='mouse'){this.held=null;this.setMining(false,'mouse');}
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('auxclick', e => e.preventDefault());
    this.canvas.addEventListener('wheel', e => {
      if (!this.canMove()) return;
      e.preventDefault(); this.api.cycle(e.deltaY > 0 ? 1 : -1);
    }, { passive:false });
    this.doc.addEventListener('keydown', e => this.keyDown(e));
    this.doc.addEventListener('keyup', e => { delete this.keys[e.code];this.waitingKeys.delete(e.code);if(e.code==='KeyG')this.setMining(false,'key-g'); });
    this.win.addEventListener('blur', () => { this.clear(); if (this.playing && !this.coarse) this.api.pause(); });
    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.hidden) { this.clear(); if (this.playing) this.api.pause(); }
    });
  }
}
