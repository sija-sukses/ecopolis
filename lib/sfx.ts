/**
 * Efek suara dibangkitkan lewat Web Audio, bukan berkas audio.
 * Nol dependensi, nol permintaan jaringan, dan nol lisensi yang perlu diurus.
 *
 * AudioContext dibuat malas pada bunyi pertama, karena peramban memblokir
 * pembuatannya sebelum ada interaksi pengguna.
 */

type Sound = 'click' | 'drop' | 'construct' | 'ceremony' | 'done' | 'stamp';

/** Nada dalam Hz, dan panjangnya dalam detik. */
const NOTES: Record<Sound, { freq: number[]; dur: number; type: OscillatorType }> = {
  click: { freq: [660], dur: 0.06, type: 'triangle' },
  drop: { freq: [240, 150], dur: 0.17, type: 'sine' },
  construct: { freq: [330, 440, 392], dur: 0.24, type: 'triangle' },
  ceremony: { freq: [523, 659, 784, 1046], dur: 0.48, type: 'triangle' },
  done: { freq: [523, 659, 784], dur: 0.42, type: 'triangle' },
  stamp: { freq: [180, 110, 75], dur: 0.16, type: 'triangle' },
};

let ctx: AudioContext | null = null;

export function play(sound: Sound, muted: boolean): void {
  if (muted || typeof window === 'undefined') return;

  try {
    const audioCtx = (ctx ??= new AudioContext());
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const { freq, dur, type } = NOTES[sound];
    const now = audioCtx.currentTime;
    const step = dur / freq.length;

    for (const [i, f] of freq.entries()) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + i * step);

      // Naik cepat lalu meluruh, supaya tidak ada bunyi 'klik' di ujungnya.
      gain.gain.setValueAtTime(0.0001, now + i * step);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * step + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * step + step);

      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * step);
      osc.stop(now + i * step + step);
    }
  } catch {
    // Peramban menolak audio. Permainan tidak boleh ikut berhenti karenanya.
  }
}
