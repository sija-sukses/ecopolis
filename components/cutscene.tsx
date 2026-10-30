'use client';

import { useEffect } from 'react';

import type { CutscenePhase } from '@/lib/city-effects.ts';

/**
 * Lapisan sinematik di atas layar permainan.
 *
 * Dua bagian terpisah:
 *
 * 1. **Iris hitam** berbentuk lingkaran yang tumbuh dari sudut kanan bawah.
 *    Ia menutup sebelum setiap pergantian keadaan, lalu membuka lagi sesudahnya.
 *    Selain sebagai transisi, iris inilah yang menyembunyikan momen Walikota
 *    berganti pose ke helm dan bingkai sinematik masuk, sehingga pergantiannya
 *    tidak terlihat kasar.
 *
 * 2. **Bingkai sinematik**: bilah hitam atas-bawah, satu baris keterangan, dan
 *    tombol lewati. Inilah yang memberi tahu penonton bahwa ia sedang menonton
 *    dan bukan sedang bermain.
 *
 * Lapisan ini tidak menggambar adegannya sendiri: adegannya adalah peta yang
 * sama, didekati kamera. Jadi dunianya tidak pernah terputus.
 */

type Props = {
  phase: CutscenePhase;
  /** Keterangan satu baris, misalnya "Peninjauan pembangunan PLTS Surya". */
  caption: string;
  onSkip: () => void;
};

/**
 * Iris menutup sebelum keadaan berganti dan membuka sesudahnya, jadi dua tahap
 * yang sama dipakai dua kali dengan arah berbeda.
 */
const IRIS: Partial<Record<CutscenePhase, 'close' | 'open'>> = {
  'iris-in': 'close',
  inspect: 'open',
  'iris-out': 'close',
  'zoom-out': 'open',
};

/** Tahap yang layarnya berada dalam mode sinematik penuh. */
const FRAMED: CutscenePhase[] = ['inspect', 'ceremony'];

export function Cutscene({ phase, caption, onSkip }: Props) {
  // Esc atau Spasi melewati adegan; klik di mana pun juga, lewat lapisan penangkap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const iris = IRIS[phase];
  const framed = FRAMED.includes(phase);
  const canSkip = phase !== 'zoom-out';

  return (
    <div className="cut" data-phase={phase}>
      <div
        className={`cut__iris${iris ? ` cut__iris--${iris}` : ''}`}
        aria-hidden="true"
      />

      {framed && (
        <>
          <div className="cut__bar cut__bar--top" aria-hidden="true" />
          <div className="cut__bar cut__bar--bottom" aria-hidden="true" />
          <p className="cut__caption" role="status">
            {caption}
          </p>
        </>
      )}

      {canSkip && (
        <>
          {/* Klik di mana pun melewati adegan. */}
          <button
            type="button"
            className="cut__catch"
            onClick={onSkip}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button type="button" className="cut__skip" onClick={onSkip}>
            Lewati [Spasi]
          </button>
        </>
      )}
    </div>
  );
}
