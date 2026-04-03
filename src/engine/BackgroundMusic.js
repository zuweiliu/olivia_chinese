/**
 * BackgroundMusic - Procedural Web Audio API music system
 * Dreamy pentatonic melody (Song Dynasty + teen-friendly sparkle)
 */
class BackgroundMusic {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this._started = false;

        // Scheduler state
        this._nextBeatTime = 0;
        this._beatIndex = 0;
        this._timer = null;

        // Tempo: 76 BPM — relaxed but upbeat
        this._bps = 76 / 60;          // beats per second
        this._beat = 1 / this._bps;   // seconds per beat
    }

    // Call once — audio starts on first user gesture (browser policy)
    init() {
        const start = () => {
            if (this._started) return;
            this._started = true;
            this._boot();
        };
        document.addEventListener('keydown',     start, { once: true });
        document.addEventListener('pointerdown', start, { once: true });
        document.addEventListener('click',       start, { once: true });
    }

    _boot() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Master output
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.28;
        this.masterGain.connect(this.ctx.destination);

        // Reverb send
        const reverb = this._makeReverb(2.8);
        const reverbGain = this.ctx.createGain();
        reverbGain.gain.value = 0.38;
        reverb.connect(reverbGain);
        reverbGain.connect(this.ctx.destination);
        this._reverb = reverb;

        // Ambient pad (gentle drone — C2/G2/E3 sine waves)
        this._startPad();

        // Start melody scheduler
        this._nextBeatTime = this.ctx.currentTime + 0.6;
        this._scheduleTick();
    }

    // ── Reverb (synthetic impulse response) ──────────────────────────────────

    _makeReverb(seconds) {
        const rate   = this.ctx.sampleRate;
        const len    = Math.floor(rate * seconds);
        const buf    = this.ctx.createBuffer(2, len, rate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
            }
        }
        const conv = this.ctx.createConvolver();
        conv.buffer = buf;
        return conv;
    }

    // ── Ambient pad ──────────────────────────────────────────────────────────

    _startPad() {
        // C2, G2, E3 — soft undertone
        const freqs  = [65.41, 98.00, 164.81];
        const vols   = [0.030, 0.022, 0.016];
        freqs.forEach((f, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type            = 'sine';
            osc.frequency.value = f;
            gain.gain.value     = vols[i];
            osc.connect(gain);
            gain.connect(this.masterGain);
            gain.connect(this._reverb);
            osc.start();
        });
    }

    // ── Pentatonic melody pattern ─────────────────────────────────────────────
    //
    //  Scale: C pentatonic  →  C D E G A  (sparkly / East-Asian feel)
    //  Two-octave register, 32-beat loop split into:
    //    • phrase A (bars 1-2): rising, playful
    //    • phrase B (bars 3-4): descending, dreamy
    //    • phrase C (bars 5-6): variation
    //    • phrase D (bars 7-8): cadence back to root

    _pattern() {
        const _ = 0; // rest
        const C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00;
        const C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00;
        const C6=1046.50;

        // Each element is [melodic freq OR 0, sparkle freq OR 0, duration-in-beats]
        // Sparkle layer plays a 5th above or an octave above for shimmer
        return [
            // Phrase A — rising
            [E4,  E5,   1], [_, _,       0.5], [G4,  G5,   0.5],
            [A4,  A5,   1], [C5, C6,     0.5], [_,   _,    0.5],
            [D5,  D5,   1], [E5, _,      1  ],

            // Phrase B — dreamy descent
            [E5,  _,    0.5], [D5, _,    0.5], [C5, C6,    1  ],
            [A4,  A5,   1  ], [G4, G5,   0.5], [E4, E5,    0.5],
            [_,   _,    0.5], [C4, _,    1.5],

            // Phrase C — variation / sparkle
            [G4,  G5,   0.5], [A4, A5,   0.5], [C5, C6,   0.5], [D5, _,  0.5],
            [E5,  _,    1  ], [D5, D5*2, 0.5], [C5, _,    0.5],
            [A4,  A5,   1  ], [_,  _,    1  ],

            // Phrase D — cadence
            [E5,  _,    0.5], [C5, _,    0.5], [A4, A5,   1  ],
            [G4,  G5,   0.5], [E4, E5,   0.5], [D4, _,    1  ],
            [C4,  _,    2  ],
        ];
    }

    // ── Scheduler ─────────────────────────────────────────────────────────────

    _scheduleTick() {
        if (!this.ctx) return;
        const pattern = this._pattern();
        const lookahead = 0.12; // seconds ahead to schedule

        while (this._nextBeatTime < this.ctx.currentTime + lookahead) {
            const entry = pattern[this._beatIndex % pattern.length];
            const [melFreq, sparkFreq, beats] = entry;
            const dur = beats * this._beat;

            if (!this.isMuted) {
                if (melFreq)   this._bell(melFreq,   this._nextBeatTime, dur * 0.88, 0.13, false);
                if (sparkFreq) this._bell(sparkFreq, this._nextBeatTime, dur * 0.55, 0.05, true);
            }

            this._nextBeatTime += dur;
            this._beatIndex = (this._beatIndex + 1) % pattern.length;
        }

        this._timer = setTimeout(() => this._scheduleTick(), 30);
    }

    // ── Bell synthesiser ──────────────────────────────────────────────────────
    //  Two detuned sines + a triangle for the soft attack click

    _bell(freq, time, dur, vol, isSparkle) {
        const ctx = this.ctx;

        // Fundamental + slight harmonic (slightly detuned for warmth)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * (isSparkle ? 2.005 : 1.004); // shimmer detune

        // Click transient
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.value = freq * 3;

        // Envelope
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(vol, time + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0, time);
        env2.gain.linearRampToValueAtTime(vol * 0.4, time + 0.008);
        env2.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.6);

        const clickEnv = ctx.createGain();
        clickEnv.gain.setValueAtTime(0, time);
        clickEnv.gain.linearRampToValueAtTime(vol * 0.25, time + 0.006);
        clickEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

        osc1.connect(env);
        osc2.connect(env2);
        click.connect(clickEnv);

        env.connect(this.masterGain);
        env2.connect(this.masterGain);
        clickEnv.connect(this.masterGain);

        // Send melody notes to reverb (not sparkle, to keep it crisp)
        if (!isSparkle) {
            env.connect(this._reverb);
        } else {
            env.connect(this._reverb);  // sparkle benefits from reverb too
        }

        const end = time + dur + 0.1;
        osc1.start(time); osc1.stop(end);
        osc2.start(time); osc2.stop(end);
        click.start(time); click.stop(time + 0.05);
    }

    // ── Public controls ───────────────────────────────────────────────────────

    toggle() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.isMuted ? 0 : 0.28,
                this.ctx.currentTime, 0.4
            );
        }
        return this.isMuted;
    }

    setVolume(v) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
        }
    }

    // Short celebratory arpeggio — call on correct answer
    // Big triumphant fanfare — played when a kingdom is conquered
    playConquestFanfare() {
        if (!this.ctx || this.isMuted) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Trumpet-like sawtooth chord: G4 B4 D5 G5
        const chordFreqs = [392.00, 493.88, 587.33, 783.99];
        chordFreqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = 2200;
            const env = ctx.createGain();
            const t = now + i * 0.04;
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.18, t + 0.025);
            env.gain.setValueAtTime(0.18, t + 0.55);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
            osc.connect(filt); filt.connect(env);
            env.connect(this.masterGain);
            if (this._reverb) env.connect(this._reverb);
            osc.start(t); osc.stop(t + 1.0);
        });

        // Rising run: C5 E5 G5 C6 E6 — staggered 80ms
        const runFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        runFreqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const env = ctx.createGain();
            const t = now + 0.55 + i * 0.08;
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.24, t + 0.01);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
            osc.connect(env);
            env.connect(this.masterGain);
            osc.start(t); osc.stop(t + 0.3);
        });

        // Bass boom on beat 1
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = 65.41;
        const bassEnv = ctx.createGain();
        bassEnv.gain.setValueAtTime(0, now);
        bassEnv.gain.linearRampToValueAtTime(0.5, now + 0.02);
        bassEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        bass.connect(bassEnv);
        bassEnv.connect(this.masterGain);
        bass.start(now); bass.stop(now + 0.65);
    }

    playCheer() {
        if (!this.ctx || this.isMuted) return;

        // Ascending C pentatonic: C5 E5 G5 C6 — each 90ms apart
        const freqs  = [523.25, 659.25, 783.99, 1046.50];
        const delays = [0,      0.09,   0.18,   0.27   ];

        freqs.forEach((freq, i) => {
            const t = this.ctx.currentTime + delays[i];

            // Bright sine + triangle harmonic
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.value = freq;
            osc2.frequency.value = freq * 2;

            const env = this.ctx.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.22, t + 0.012);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

            const env2 = this.ctx.createGain();
            env2.gain.setValueAtTime(0, t);
            env2.gain.linearRampToValueAtTime(0.08, t + 0.008);
            env2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

            osc1.connect(env);
            osc2.connect(env2);
            env.connect(this.masterGain);
            env2.connect(this.masterGain);
            if (this._reverb) {
                env.connect(this._reverb);
            }

            osc1.start(t); osc1.stop(t + 0.4);
            osc2.start(t); osc2.stop(t + 0.2);
        });
    }
}
