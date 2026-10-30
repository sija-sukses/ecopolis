'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { generateReview } from '@/app/actions/generateReview.ts';
import { CityMap, type ActivePlotTransition } from '@/components/city-map.tsx';
import { Hud } from '@/components/hud.tsx';
import { Onboarding } from '@/components/onboarding.tsx';
import { ScenarioCard } from '@/components/scenario-card.tsx';
import { DEFAULT_AVATAR } from '@/lib/avatars.ts';
import {
  CEREMONY_DURATION_MS,
  CONSTRUCTION_DURATION_MS,
  TOTAL_TRANSITION_MS,
} from '@/lib/city-effects.ts';
import { fallbackReview } from '@/lib/fallback.ts';
import { countFinishedSession, useGame } from '@/lib/game-context.tsx';
import { isFinished } from '@/lib/reducer.ts';
import { ROUNDS, scenarioFor } from '@/lib/scenarios.ts';
import { play } from '@/lib/sfx.ts';
import type { OptionId } from '@/lib/types.ts';

/** Selama animasi awal konstruksi, kartu dikunci sejenak agar tidak terklik ganda. */
const DROP_MS = 760;

export function Game() {
  const { state, dispatch, ready } = useGame();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [activeTransition, setActiveTransition] = useState<ActivePlotTransition | null>(null);
  const timersRef = useRef<number[]>([]);
  const asked = useRef(false);

  const done = isFinished(state);
  const scenario = scenarioFor(state.round);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Satu-satunya panggilan jaringan di seluruh permainan, dijalankan tepat
  // sekali. Kalau pemanggilannya sendiri gagal (juri sedang offline), narasi
  // cadangan dibangkitkan di sini juga, jadi permainan tidak pernah buntu.
  useEffect(() => {
    if (!ready || !state.leader || !done || busy || state.review || asked.current) return;
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
  }, [ready, done, busy, state, dispatch, router]);

  // Permainan sudah tamat dan laporannya ada: tempatnya di /results.
  useEffect(() => {
    if (ready && done && state.review) router.replace('/results');
  }, [ready, done, state.review, router]);

  // Kunci gulir layar selama simulasi berlangsung sampai kelima pertanyaan
  // terjawab semua, lalu buka kembali saat berpindah ke halaman laporan.
  useEffect(() => {
    if (done && state.review) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [done, state.review]);

  // Dukung ?autostart=1 untuk langsung memulai simulasi dari ronde pertama.
  useEffect(() => {
    if (!ready || state.leader) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      dispatch({ type: 'start', leader: { name: 'Budi', avatar: DEFAULT_AVATAR } });
    }
  }, [ready, state.leader, dispatch]);

  if (!ready) return <div className="stage stage--wait" aria-busy="true" />;

  if (!state.leader) {
    return (
      <div className="stage stage--onboard">
        <Onboarding />
      </div>
    );
  }

  function choose(option: OptionId) {
    if (busy || !scenario) return;
    const targetPlot = scenario.plot;
    const isFinalRound = scenario.round === ROUNDS;

    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    setBusy(true);
    setActiveTransition({ plotIndex: targetPlot, stage: 'construction' });
    play('construct', state.muted);
    dispatch({ type: 'choose', option });

    const ceremonyTimer = window.setTimeout(() => {
      setActiveTransition({ plotIndex: targetPlot, stage: 'ceremony' });
      play('ceremony', state.muted);
    }, CONSTRUCTION_DURATION_MS);

    const operationalTimer = window.setTimeout(() => {
      setActiveTransition(null);
    }, TOTAL_TRANSITION_MS);

    const unlockDelay = isFinalRound ? TOTAL_TRANSITION_MS : DROP_MS;
    const unlockTimer = window.setTimeout(() => {
      setBusy(false);
    }, unlockDelay);

    timersRef.current.push(ceremonyTimer, operationalTimer, unlockTimer);
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
            avatar={state.leader.avatar}
            satisfaction={state.stats.satisfaction}
            activeTransition={activeTransition}
            animate
            label={`Peta Ecopolis, ${state.plots.filter(Boolean).length} dari ${ROUNDS} kawasan terbangun.`}
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

