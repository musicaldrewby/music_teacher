
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();

        // --- DISTORTION FIX ---
        // 1. Master Gain to lower overall volume before hitting speakers
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.4; 

        // 2. Hard Limiter (Compressor)
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -3; 
        limiter.knee.value = 0;       
        limiter.ratio.value = 20;     
        limiter.attack.value = 0.001; 
        limiter.release.value = 0.1;

        // Chain: Source -> MasterGain -> Limiter -> Speakers
        masterGain.connect(limiter);
        limiter.connect(ctx.destination);

        let isDamperActive = false;
        let currentInstrumentId = null;
        let cleanupInstrument = () => {};

        const notes = {
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00, 'B6': 1975.53,
            'C7': 2093.00, 'D7': 2349.32, 'E7': 2637.02, 'F7': 2793.83, 'G7': 3135.96, 'A7': 3520.00
        };

        function checkOrientation() {
            if (!currentInstrumentId || currentInstrumentId.startsWith('perc_')) {
                document.getElementById('rotate-overlay').style.display = 'none';
                document.getElementById('instrument-view').style.visibility = 'visible';
                return;
            }
            if (window.innerHeight > window.innerWidth) {
                document.getElementById('rotate-overlay').style.display = 'flex';
                document.getElementById('instrument-view').style.visibility = 'hidden';
            } else {
                document.getElementById('rotate-overlay').style.display = 'none';
                document.getElementById('instrument-view').style.visibility = 'visible';
            }
        }
        window.addEventListener('resize', checkOrientation);

        function playTone(freq, type) {
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Connect to MASTER GAIN instead of destination
            osc.connect(gain);
            gain.connect(masterGain); 
            
            osc.frequency.value = freq;
            
            if (type === 'wood') {
                osc.type = 'sine';
                const harmOsc = ctx.createOscillator();
                const harmGain = ctx.createGain();
                harmOsc.type = 'sine';
                harmOsc.frequency.value = freq * 3; 
                harmOsc.connect(harmGain);
                harmGain.connect(masterGain);

                const attackOsc = ctx.createOscillator();
                const attackGain = ctx.createGain();
                attackOsc.type = 'sine'; 
                attackOsc.frequency.value = freq; 
                attackOsc.connect(attackGain);
                attackGain.connect(masterGain);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.6, t + 0.005); 
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1); 

                harmGain.gain.setValueAtTime(0, t);
                harmGain.gain.linearRampToValueAtTime(0.2, t + 0.005); 
                harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

                attackGain.gain.setValueAtTime(0, t);
                attackGain.gain.linearRampToValueAtTime(0.4, t + 0.002);
                attackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
                
                osc.start(t); osc.stop(t + 1.2);
                harmOsc.start(t); harmOsc.stop(t + 0.9);
                attackOsc.start(t); attackOsc.stop(t + 0.1);

            } else if (type === 'metal') {
                osc.type = 'sine';
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.value = freq * 2.99;
                osc2.connect(gain2);
                gain2.connect(masterGain);

                const decay = isDamperActive ? 0.2 : 3.0;
                
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
                
                gain2.gain.setValueAtTime(0, t);
                gain2.gain.linearRampToValueAtTime(0.05, t + 0.01);
                gain2.gain.exponentialRampToValueAtTime(0.001, t + (decay * 0.5));
                
                osc.start(t); osc.stop(t + decay + 0.1);
                osc2.start(t); osc2.stop(t + decay + 0.1);

            } else if (type === 'glock') {
                osc.type = 'sine';
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.002); 
                gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
                osc.start(t); osc.stop(t + 2.1);
            }
        }

        function playGuiroScrape() {
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            const freq = 1200 + Math.random() * 800; 
            const bufferSize = ctx.sampleRate * 0.05; 
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 5;
            const gain = ctx.createGain();
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain); 
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
            noise.start(t);
        }

        function playPercussion(type) {
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            if (type === 'claves') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);
                osc.type = 'sine';
                osc.frequency.value = 2300;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.6, t + 0.001);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                osc.start(t); osc.stop(t+0.2);
            } else if (type === 'triangle') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);
                osc.type = 'triangle';
                osc.frequency.value = 6000;
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(masterGain);
                osc2.frequency.value = 9000;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
                gain2.gain.setValueAtTime(0, t);
                gain2.gain.linearRampToValueAtTime(0.08, t + 0.01);
                gain2.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
                osc.start(t); osc.stop(t+3);
                osc2.start(t); osc2.stop(t+3);
            }
        }

        const rangeBass = ['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4'];
        const rangeAlto = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5'];
        const rangeSop =  ['C5','D5','E5','F5','G5','A5','B5','C6','D6','E6','F6','G6','A6'];
        const rangeGlock =['C6','D6','E6','F6','G6','A6','B6','C7','D7','E7','F7','G7','A7'];

        const instrumentConfig = {
            'xylo_bass': { type: 'wood', range: rangeBass, mat: 'mat-wood', title: 'Bass Xylophone' },
            'xylo_alto': { type: 'wood', range: rangeAlto, mat: 'mat-wood', title: 'Alto Xylophone' },
            'xylo_sop':  { type: 'wood', range: rangeSop, mat: 'mat-wood', title: 'Soprano Xylophone' },
            /* Metallophones now use 'mat-silver' */
            'met_bass':  { type: 'metal', range: rangeBass, mat: 'mat-silver', title: 'Bass Metallophone', damper: true },
            'met_alto':  { type: 'metal', range: rangeAlto, mat: 'mat-silver', title: 'Alto Metallophone', damper: true },
            'met_sop':   { type: 'metal', range: rangeSop, mat: 'mat-silver', title: 'Soprano Metallophone', damper: true },
            'glock':     { type: 'glock', range: rangeGlock, mat: 'mat-silver', title: 'Glockenspiel' }
        };


        function resumeAudio() {
            if (ctx.state !== 'running') ctx.resume().catch(() => {});
        }

        function freshContainer() {
            cleanupInstrument();
            cleanupInstrument = () => {};
            const old = document.getElementById('instrument-container');
            const next = old.cloneNode(false);
            old.replaceWith(next);
            return next;
        }

        function goHome() {
            cleanupInstrument();
            currentInstrumentId = null;
            document.getElementById('rotate-overlay').style.display = 'none';
            document.getElementById('instrument-view').style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
        }

        function toggleDamper() {
            isDamperActive = !isDamperActive;
            const btn = document.getElementById('damper-btn');
            btn.classList.toggle('active', isDamperActive);
            btn.setAttribute('aria-pressed', String(isDamperActive));
        }

        function flash(element) {
            element.classList.add('hit');
            setTimeout(() => element.classList.remove('hit'), 100);
        }

        function loadInstrument(id) {
            if (!instrumentConfig[id] && !['perc_triangle', 'perc_guiro', 'perc_claves'].includes(id)) return;
            resumeAudio();
            currentInstrumentId = id;
            const container = freshContainer();
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('instrument-view').style.display = 'flex';
            checkOrientation();
            const damperBtn = document.getElementById('damper-btn');
            isDamperActive = false;
            damperBtn.classList.remove('active');
            damperBtn.setAttribute('aria-pressed', 'false');
            if (id.startsWith('perc_')) {
                damperBtn.style.display = 'none';
                loadPercussion(id, container);
                return;
            }
            const config = instrumentConfig[id];
            document.getElementById('inst-title').innerText = config.title;
            damperBtn.style.display = config.damper ? 'block' : 'none';
            document.getElementById('playing-hint').textContent = 'Tap or slide to play • Hold the bottom of a bar to remove or restore it';
            const frame = document.createElement('div');
            frame.className = 'instrument-frame';
            const strike = bar => {
                if (!bar || bar.classList.contains('disabled')) return;
                resumeAudio();
                flash(bar);
                playTone(notes[bar.dataset.note], config.type);
            };
            const toggleBar = bar => {
                const removed = bar.classList.toggle('disabled');
                bar.setAttribute('aria-label', bar.dataset.note + (removed ? ', removed. Hold bottom or press Delete to restore.' : '. Hold bottom or press Delete to remove.'));
            };
            config.range.forEach((note, index) => {
                const bar = document.createElement('button');
                bar.type = 'button';
                bar.className = `bar ${config.mat}`;
                bar.dataset.note = note;
                bar.setAttribute('aria-label', note + '. Hold bottom or press Delete to remove.');
                bar.style.height = `${95 - index * 2.5}%`;
                const label = document.createElement('span');
                label.className = 'note-label';
                label.textContent = note.slice(0, -1);
                const bottom = document.createElement('span');
                bottom.className = 'bar-bottom-trigger';
                bottom.setAttribute('aria-hidden', 'true');
                bar.append(label, bottom);
                bar.addEventListener('click', e => { if (e.detail === 0) strike(bar); });
                bar.addEventListener('keydown', e => {
                    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); toggleBar(bar); }
                });
                frame.appendChild(bar);
            });
            container.appendChild(frame);

            const pointers = new Map();
            const barAt = e => document.elementFromPoint(e.clientX, e.clientY)?.closest('.bar');
            const cancelHold = pointer => { clearTimeout(pointer.timer); pointer.timer = null; };
            container.addEventListener('pointerdown', e => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                const bar = barAt(e);
                if (!bar || !container.contains(bar)) return;
                e.preventDefault();
                container.setPointerCapture(e.pointerId);
                const pointer = { bar, last: bar, x: e.clientX, y: e.clientY, timer: null };
                pointers.set(e.pointerId, pointer);
                strike(bar);
                const rect = bar.getBoundingClientRect();
                if (e.clientY >= rect.top + rect.height * .75) {
                    pointer.timer = setTimeout(() => { toggleBar(bar); pointer.timer = null; }, 1500);
                }
            });
            container.addEventListener('pointermove', e => {
                const pointer = pointers.get(e.pointerId);
                if (!pointer) return;
                e.preventDefault();
                const bar = barAt(e);
                if (bar !== pointer.bar || Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 10) cancelHold(pointer);
                const current = bar && container.contains(bar) ? bar : null;
                if (current !== pointer.last) { pointer.last = current; strike(current); }
            });
            const release = e => {
                const pointer = pointers.get(e.pointerId);
                if (pointer) cancelHold(pointer);
                pointers.delete(e.pointerId);
            };
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => container.addEventListener(type, release));
            const clearPointers = () => { pointers.forEach(cancelHold); pointers.clear(); };
            window.addEventListener('blur', clearPointers);
            cleanupInstrument = () => { clearPointers(); window.removeEventListener('blur', clearPointers); };
        }

        function loadPercussion(id, container) {
            const title = { perc_triangle: 'Triangle', perc_guiro: 'Güiro', perc_claves: 'Claves' }[id];
            document.getElementById('inst-title').textContent = title;
            document.getElementById('playing-hint').textContent = id === 'perc_guiro' ? 'Drag up and down to scrape the güiro' : 'Tap to play';
            if (id === 'perc_guiro') {
                const guiro = document.createElement('div');
                guiro.className = 'perc-guiro-large';
                guiro.tabIndex = 0;
                guiro.setAttribute('role', 'button');
                guiro.setAttribute('aria-label', 'Güiro: drag up and down, or press Space to scrape');
                const ridges = document.createElement('div');
                ridges.className = 'guiro-ridges';
                guiro.appendChild(ridges);
                const pointers = new Map();
                guiro.addEventListener('pointerdown', e => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    e.preventDefault(); resumeAudio();
                    guiro.setPointerCapture(e.pointerId);
                    pointers.set(e.pointerId, { lastY: e.clientY, accumulated: 0 });
                });
                guiro.addEventListener('pointermove', e => {
                    const pointer = pointers.get(e.pointerId);
                    if (!pointer) return;
                    e.preventDefault();
                    pointer.accumulated += Math.abs(e.clientY - pointer.lastY);
                    pointer.lastY = e.clientY;
                    if (pointer.accumulated > 10) { playGuiroScrape(); pointer.accumulated = 0; }
                });
                ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => guiro.addEventListener(type, e => pointers.delete(e.pointerId)));
                guiro.addEventListener('keydown', e => {
                    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); resumeAudio(); playGuiroScrape(); }
                });
                const clearPointers = () => pointers.clear();
                window.addEventListener('blur', clearPointers);
                cleanupInstrument = () => { clearPointers(); window.removeEventListener('blur', clearPointers); };
                container.appendChild(guiro);
                return;
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'perc-display';
            btn.setAttribute('aria-label', 'Play ' + title);
            const type = id === 'perc_triangle' ? 'triangle' : 'claves';
            btn.innerHTML = type === 'triangle' ? '<span class="perc-triangle" aria-hidden="true"></span>' : '<span style="font-size:3rem;" aria-hidden="true">X X</span>';
            const hit = () => {
                resumeAudio();
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = 'scale(1)', 100);
                playPercussion(type);
            };
            btn.addEventListener('pointerdown', e => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                e.preventDefault(); hit();
            });
            btn.addEventListener('click', e => { if (e.detail === 0) hit(); });
            container.appendChild(btn);
        }
