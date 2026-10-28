'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { generateReview } from '@/app/actions/generateReview.ts';
import { CityMap } from '@/components/city-map.tsx';
import { Hud } from '@/components/hud.tsx';
import { Onboarding } from '@/components/onboarding.tsx';
import { ScenarioCard } from '@/components/scenario-card.tsx';
import { fallbackReview } from '@/lib/fallback.ts';
import { countFinishedSession, useGame } from '@/lib/game-context.tsx';
import { isFinished } from '@/lib/reducer.ts';
import { ROUNDS, scenarioFor } from '@/lib/scenarios.ts';
import { play } from '@/lib/sfx.ts';
import type { OptionId } from '@/lib/types.ts';

/** Selama animasi bangunan jatuh, kartu dikunci agar tidak terklik dua kali. */
const DROP_MS = 760;

export function Game() {
  const { state, dispatch, ready } = useGame();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);

  const done = isFinished(state);
  const scenario = scenarioFor(state.round);

  // Satu-satunya panggilan jaringan di seluruh permainan, dijalankan tepat
  // sekali. Kalau pemanggilannya sendiri gagal (juri sedang offline), narasi
  // cadangan dibangkitkan di sini juga, jadi permainan tidak pernah buntu.
  useEffect(() => {
    if (!ready || !state.leader || !done || state.review || asked.current) return;
    asked.current = true;
    play('done', state.muted);

    const payload = { leader: state.leader, stats: state.stats, choices: state.choices };
    const leader = state.leader;

    generateReview(payload)
      .catch(() => fallbackReview(leader, payload.stats))
      .then((review) => {
        dispatch({ type: 'review', review });
        countFinishedSession();
        router.push('/results');
      });
  }, [ready, done, state, dispatch, router]);

  // Permainan sudah tamat dan laporannya ada: tempatnya di /results.
  useEffect(() => {
    if (ready && done && state.review) router.replace('/results');
  }, [ready, done, state.review, router]);

  if (!ready) return <div className="stage stage--wait" aria-busy="true" />;

  if (!state.leader) {
    return (
      <div className="stage stage--onboard">
        <Onboarding />
      </div>
    );
  }

  function choose(option: OptionId) {
    if (busy) return;
    setBusy(true);
    play('drop', state.muted);
    dispatch({ type: 'choose', option });
    setTimeout(() => setBusy(false), DROP_MS);
  }

  return (
    <div className="stage">
      <Hud
        stats={state.stats}
        round={state.round}
        leaderName={state.leader.name}
        avatar={state.leader.avatar}
        muted={state.muted}
        onToggleMute={() => dispatch({ type: 'mute', muted: !state.muted })}
      />

      <div className="stage__grid">
        <div className="stage__map">
          <CityMap
            plots={state.plots}
            animate
            label={`Peta Ecopolis, ${state.plots.filter(Boolean).length} dari ${ROUNDS} petak terbangun.`}
          />
        </div>

        <div className="stage__card">
          {scenario ? (
            <ScenarioCard scenario={scenario} onChoose={choose} busy={busy} />
          ) : (
            <div className="analyzing" role="status">
              <h2 className="analyzing__title">Menganalisis dampak masa depan</h2>
              <p>
                Kebijakan Anda sedang ditimbang untuk menyusun laporan kota Ecopolis pada tahun
                2050.
              </p>
              <span className="analyzing__bar" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
