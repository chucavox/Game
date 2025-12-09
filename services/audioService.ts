export class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  // Resume context if suspended (browser policy requires user interaction)
  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playShoot(power: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      this.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      // Pitch sweeps down
      osc.frequency.setValueAtTime(150 + power * 10, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio context might fail in some restricted environments
    }
  }

  public playWallHit(impactSpeed: number, type: 'wood' | 'stone') {
    if (this.isMuted || impactSpeed < 1.0) return;
    try {
      const ctx = this.getContext();
      this.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'wood') {
        osc.type = 'square';
        // Dull wood sound
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(Math.min(impactSpeed * 0.05, 0.2), ctx.currentTime);
      } else {
        // Sharp stone sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(Math.min(impactSpeed * 0.05, 0.15), ctx.currentTime);
      }

      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  }

  public playSandEnter() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      this.resume();

      const bufferSize = ctx.sampleRate * 0.2; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      
      // Simple Lowpass via Biquad
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {}
  }

  public playHoleIn() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      this.resume();
      const now = ctx.currentTime;
      
      // Cheerful major arpeggio
      [440, 554.37, 659.25, 880].forEach((freq, i) => { 
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const start = now + i * 0.08;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {}
  }
}

export const audioManager = new AudioService();
