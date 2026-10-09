/**
 * Web Audio API Synthesizer - Âm thanh chuông báo động tiêu chuẩn y tế
 * Không cần tải file MP3, hoàn toàn tự tạo âm thanh mượt mà trên trình duyệt.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Phát âm thanh chuông cảnh báo
  play(type: 'danger' | 'warning' | 'success' | 'imbalance'): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'danger') {
        // Chuông khẩn cấp: 2 hồi âm cao (880Hz -> 660Hz)
        this.playTone(ctx, 880, now, 0.25, 'triangle');
        this.playTone(ctx, 660, now + 0.15, 0.35, 'triangle');
      } else if (type === 'warning' || type === 'imbalance') {
        // Chuông cảnh báo nhẹ: Ting - Tong (G4 -> C5: 392Hz -> 523Hz)
        this.playTone(ctx, 523.25, now, 0.3, 'sine');
        this.playTone(ctx, 659.25, now + 0.18, 0.4, 'sine');
      } else if (type === 'success') {
        // Chuông quầy mới mở: Hợp âm vui vẻ (C5 -> E5 -> G5)
        this.playTone(ctx, 523.25, now, 0.15, 'sine');
        this.playTone(ctx, 659.25, now + 0.12, 0.18, 'sine');
        this.playTone(ctx, 783.99, now + 0.24, 0.35, 'sine');
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundManager = new SoundSynthesizer();
