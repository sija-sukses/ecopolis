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
  const animatedStats = useAnimatedStats(stats);

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
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        onToggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleMute]);

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
          title={muted ? 'Nyalakan suara (Tombol M)' : 'Matikan suara (Tombol M)'}
        >
          {muted ? 'Suara mati [M]' : 'Suara nyala [M]'}
        </button>
      </div>

      {/* Perubahan dibacakan pembaca layar, supaya dampak pilihan terdengar
          dan tidak hanya terlihat. */}
      <div className="hud__bars" aria-live="polite">
        {KEYS.map((k) => {
          const d = deltas[k];
          const fillClass = [
            'stat__fill',
            d > 0 ? 'stat__fill--up' : d < 0 ? 'stat__fill--down' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div className="stat" key={k}>
              <span className="stat__name">{LABELS[k]}</span>
              <span className="stat__track">
                <span className={fillClass} style={{ width: `${stats[k]}%` }}>
                  {d !== 0 && <span key={`${round}-${k}`} className="stat__shimmer" aria-hidden="true" />}
                </span>
              </span>
              <span className="stat__num">
                {animatedStats[k]}
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
