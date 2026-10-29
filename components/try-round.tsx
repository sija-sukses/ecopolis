'use client';

import { useEffect, useRef, useState } from 'react';

import { applyEffects, INITIAL_STATS } from '@/lib/reducer.ts';
import { SCENARIOS } from '@/lib/scenarios.ts';
import type { AssetId, OptionId, StatKey, Stats } from '@/lib/types.ts';
import { CityMap } from './city-map.tsx';

/**
 * Satu keputusan ronde 1 yang benar-benar bisa dicoba di landing page, memakai
 * data dan rumus yang sama persis dengan permainannya.
 *
 * Tanpa JavaScript, kedua pilihan tetap terbaca lengkap beserta dampaknya dan
 * indikator berdiri di angka awal 50 — tidak ada isi yang hilang.
 */

const LABELS: Record<StatKey, string> = {
  economy: 'Ekonomi',
  environment: 'Lingkungan',
  satisfaction: 'Kepuasan',
  energy: 'Energi',
};

const KEYS = Object.keys(LABELS) as StatKey[];

const ROUND_ONE = SCENARIOS[0];

/** Menganimasikan angka indikator secara halus mengikuti gerak batang progres. */
function useAnimatedStats(target: Stats): Stats {
  const [display, setDisplay] = useState<Stats>(target);
  const currentRef = useRef<Stats>(target);
  const { economy, environment, satisfaction, energy } = target;

  useEffect(() => {
    const from = { ...currentRef.current };
    if (
      from.economy === economy &&
      from.environment === environment &&
      from.satisfaction === satisfaction &&
      from.energy === energy
    ) {
      return;
    }

    const duration = 560;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const next: Stats = {
        economy: Math.round(from.economy + (economy - from.economy) * ease),
        environment: Math.round(from.environment + (environment - from.environment) * ease),
        satisfaction: Math.round(from.satisfaction + (satisfaction - from.satisfaction) * ease),
        energy: Math.round(from.energy + (energy - from.energy) * ease),
      };
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [economy, environment, satisfaction, energy]);

  return display;
}

export function TryRound() {
  const [picked, setPicked] = useState<OptionId | null>(null);

  const option = ROUND_ONE.options.find((o) => o.id === picked);
  const stats = option ? applyEffects(INITIAL_STATS, option.effects) : INITIAL_STATS;
  const animatedStats = useAnimatedStats(stats);
  const plots: (AssetId | null)[] = [option ? option.asset : null, null, null, null, null];

  return (
    <div className="tryout__grid">
      <div>
        <h2 className="enter">Coba satu keputusan</h2>
        <p className="tryout__ctx enter enter--2">{ROUND_ONE.context}</p>

        <div className="tryout__opts enter enter--3">
          {ROUND_ONE.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="opt"
              aria-pressed={picked === o.id}
              onClick={() => setPicked(o.id)}
            >
              <b>{o.label}</b>
              <span>{o.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tryout__panel">
        <CityMap
          className="tryout__city"
          plots={plots}
          animate
          label={
            option
              ? `Petak pertama Ecopolis terisi ${option.label}.`
              : 'Lima petak Ecopolis, semuanya masih kosong.'
          }
        />

        <div className="bars" aria-live="polite">
          {KEYS.map((k) => {
            const delta = stats[k] - INITIAL_STATS[k];
            const fillClass = [
              'bar__fill',
              delta > 0 ? 'bar__fill--up' : delta < 0 ? 'bar__fill--down' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div className="bar" key={k}>
                <span className="bar__name">{LABELS[k]}</span>
                <span className="bar__track">
                  <span className={fillClass} style={{ width: `${stats[k]}%` }}>
                    {picked && <span key={picked} className="bar__shimmer" aria-hidden="true" />}
                  </span>
                </span>
                <span className="bar__num">
                  {animatedStats[k]}
                  {delta !== 0 && (
                    <b
                      className={
                        delta > 0 ? 'bar__delta bar__delta--up' : 'bar__delta bar__delta--down'
                      }
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </b>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
