'use client';

import { useEffect, useRef, useState } from 'react';

import { Avatar } from '@/components/avatars.tsx';
import { ROUNDS } from '@/lib/scenarios.ts';
import type { Stats, StatKey } from '@/lib/types.ts';

const LABELS: Record<StatKey, string> = {
  economy: 'Ekonomi',
  environment: 'Lingkungan',
  satisfaction: 'Kepuasan',
  energy: 'Energi',
};

const KEYS = Object.keys(LABELS) as StatKey[];

type Props = {
  stats: Stats;
  round: number;
  leaderName: string;
  avatar: string;
  muted: boolean;
  onToggleMute: () => void;
};

export function Hud({ stats, round, leaderName, avatar, muted, onToggleMute }: Props) {
  const deltas = useDeltas(stats);

  // Avatar ikut bereaksi terhadap kepuasan warga: melompat kecil kalau naik,
  // menggeleng kalau turun. Kuncinya ikut berganti supaya animasinya mengulang.
  const mood = deltas.satisfaction > 0 ? 'senang' : deltas.satisfaction < 0 ? 'kecewa' : '';

  return (
    <header className="hud">
      <div className="hud__top">
        <p className="hud__who">
          <Avatar
            key={`${avatar}-${mood}-${round}`}
            id={avatar}
            size={48}
            className={`hud__face${mood ? ` hud__face--${mood}` : ''}`}
          />
          <span>{leaderName}</span>
          <b>{round > ROUNDS ? 'Selesai' : `Ronde ${round} dari ${ROUNDS}`}</b>
        </p>
        <button
          type="button"
          className="hud__mute"
          onClick={onToggleMute}
          aria-pressed={muted}
          title={muted ? 'Nyalakan suara' : 'Matikan suara'}
        >
          {muted ? 'Suara mati' : 'Suara nyala'}
        </button>
      </div>

      {/* Perubahan dibacakan pembaca layar, supaya dampak pilihan terdengar
          dan tidak hanya terlihat. */}
      <div className="hud__bars" aria-live="polite">
        {KEYS.map((k) => {
          const d = deltas[k];
          return (
            <div className="stat" key={k}>
              <span className="stat__name">{LABELS[k]}</span>
              <span className="stat__track">
                <span className="stat__fill" style={{ width: `${stats[k]}%` }} />
              </span>
              <span className="stat__num">
                {stats[k]}
                {d !== 0 && (
                  <b className={d > 0 ? 'stat__delta stat__delta--up' : 'stat__delta stat__delta--down'}>
                    {d > 0 ? `+${d}` : d}
                  </b>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
}

/** Selisih terhadap nilai sebelumnya, ditahan sebentar lalu dilepas. */
function useDeltas(stats: Stats) {
  const prev = useRef<Stats>(stats);
  const [deltas, setDeltas] = useState<Stats>({
    economy: 0,
    environment: 0,
    satisfaction: 0,
    energy: 0,
  });

  useEffect(() => {
    const next = {
      economy: stats.economy - prev.current.economy,
      environment: stats.environment - prev.current.environment,
      satisfaction: stats.satisfaction - prev.current.satisfaction,
      energy: stats.energy - prev.current.energy,
    };
    prev.current = stats;
    if (KEYS.every((k) => next[k] === 0)) return;

    setDeltas(next);
    const t = setTimeout(
      () => setDeltas({ economy: 0, environment: 0, satisfaction: 0, energy: 0 }),
      2200,
    );
    return () => clearTimeout(t);
  }, [stats]);

  return deltas;
}
