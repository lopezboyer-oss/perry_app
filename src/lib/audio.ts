/**
 * Utility to synthesize a premium success double-beep sound natively
 * using the browser's Web Audio API.
 */
export function playSuccessSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // First Note: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    
    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 0.15);
    
    // Second Note: E5 (659.25 Hz) - Played slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
    
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Web Audio synthesis failed:', e);
  }
}
