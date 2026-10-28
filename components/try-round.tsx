'use client';

import { useState } from 'react';

import { applyEffects, INITIAL_STATS } from '@/lib/reducer.ts';
import { SCENARIOS } from '@/lib/scenarios.ts';
import type { AssetId, OptionId, StatKey } from '@/lib/types.ts';
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

export function TryRound() {
  const [picked, setPicked] = useState<OptionId | null>(null);

  const option = ROUND_ONE.options.find((o) => o.id === picked);
  const stats = option ? applyEffects(INITIAL_STATS, option.effects) : INITIAL_STATS;
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
          {KEYS.map((k) => (
            <div className="bar" key={k}>
              <span className="bar__name">{LABELS[k]}</span>
              <span className="bar__track">
                <span className="bar__fill" style={{ width: `${stats[k]}%` }} />
              </span>
              <span className="bar__num">{stats[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
