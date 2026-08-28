// Web Audio API Sound Effects Synthesizer for Imagem & Ação

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Play a soft button click
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio error safely ignored
    }
  }

  // Realistic rolling dice sound (tumbling clicks)
  public playDiceRoll() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const numClicks = 14;

      for (let i = 0; i < numClicks; i++) {
        // Decelerating click pattern
        const timeOffset = Math.pow(i / numClicks, 1.4) * 1.3;
        const clickTime = now + timeOffset;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Vary frequencies for realistic wooden dice impact
        const baseFreq = 220 + Math.random() * 260 + (i % 2 === 0 ? 100 : 0);
        osc.type = i % 3 === 0 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(baseFreq, clickTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, clickTime + 0.04);

        const clickVol = (0.15 + (1 - i / numClicks) * 0.15) * this.volume;
        gain.gain.setValueAtTime(clickVol, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(clickTime);
        osc.stop(clickTime + 0.05);
      }
    } catch {
      // Audio error safely ignored
    }
  }

  // Fanfare / chime when dice settles on letter
  public playLetterChime() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.25 * this.volume, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.4);
      });
    } catch {
      // Audio error safely ignored
    }
  }

  // Normal timer tick
  public playTimerTick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);

      gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio error safely ignored
    }
  }

  // Urgent timer tick in final 10 seconds
  public playUrgentTick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1174.66, now); // D6
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now); // A6

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.09);
      osc2.stop(now + 0.09);
    } catch {
      // Audio error safely ignored
    }
  }

  // Buzzer / Referee Whistle when time runs out (0:00)
  public playTimeoutAlarm() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-energy 3-burst whistle/buzzer alarm
      for (let burst = 0; burst < 3; burst++) {
        const burstStart = now + burst * 0.35;
        const osc = ctx.createOscillator();
        const modOsc = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        // Whistle trill modulation
        modOsc.type = 'sine';
        modOsc.frequency.setValueAtTime(28, burstStart);

        modGain.gain.setValueAtTime(60, burstStart);
        modOsc.connect(modGain);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, burstStart);
        modGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.4 * this.volume, burstStart);
        gain.gain.setValueAtTime(0.4 * this.volume, burstStart + 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, burstStart + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        modOsc.start(burstStart);
        osc.start(burstStart);
        modOsc.stop(burstStart + 0.28);
        osc.stop(burstStart + 0.28);
      }
    } catch {
      // Audio error safely ignored
    }
  }

  // Victory celebration fanfare on ACERTOU!
  public playSuccessFanfare() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Major fanfare arpeggio: C5 -> E5 -> G5 -> C6 -> E6
      const melody = [
        { freq: 523.25, start: 0, dur: 0.12 },
        { freq: 659.25, start: 0.12, dur: 0.12 },
        { freq: 783.99, start: 0.24, dur: 0.14 },
        { freq: 1046.5, start: 0.38, dur: 0.22 },
        { freq: 1318.51, start: 0.60, dur: 0.55 },
      ];

      melody.forEach((note) => {
        const noteStart = now + note.start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, noteStart);

        gain.gain.setValueAtTime(0.35 * this.volume, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + note.dur);
      });
    } catch {
      // Audio error safely ignored
    }
  }
}

export const soundManager = new SoundManager();
