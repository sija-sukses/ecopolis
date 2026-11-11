'use client';

import { useEffect } from 'react';

import type { CutscenePhase } from '@/lib/city-effects.ts';

type Props = {
  phase: CutscenePhase;
  caption: string;
  onSkip: () => void;
};

type IrisMode = 'in-close' | 'in-open' | 'out-close' | 'out-open';

const IRIS: Partial<Record<CutscenePhase, IrisMode>> = {
  'iris-in': 'in-close',
  inspect: 'in-open',
  'iris-out': 'out-close',
  'zoom-out': 'out-open',
};


const FRAMED: CutscenePhase[] = ['inspect', 'ceremony'];

export function Cutscene({ phase, caption, onSkip }: Props) {
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
