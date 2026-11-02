'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { generateReview } from '@/app/actions/generateReview.ts';
import { CityMap, type ActivePlotTransition } from '@/components/city-map.tsx';
import { Hud } from '@/components/hud.tsx';
import { Onboarding } from '@/components/onboarding.tsx';
import { ScenarioCard } from '@/components/scenario-card.tsx';
import { Cutscene } from '@/components/cutscene.tsx';
import { DEFAULT_AVATAR } from '@/lib/avatars.ts';
import {
  CONSTRUCTION_DURATION_MS,
  CUTSCENE_ORDER,
  CUTSCENE_TIMING,
  TOTAL_TRANSITION_MS,
  type CutscenePhase,
} from '@/lib/city-effects.ts';
import { fallbackReview } from '@/lib/fallback.ts';
import { countFinishedSession, useGame } from '@/lib/game-context.tsx';
import { isFinished } from '@/lib/reducer.ts';
import { ROUNDS, scenarioFor } from '@/lib/scenarios.ts';
import { play } from '@/lib/sfx.ts';
import type { AssetId, OptionId } from '@/lib/types.ts';

/**
 * Sinematik yang sedang berjalan.
 *
 * `asset` disimpan di sini karena petaknya belum masuk ke state: pilihan baru
 * di-dispatch pada tahap 'ceremony', supaya angka indikator berubah sebagai
 * hasil dari yang baru saja ditonton, bukan di balik layar hitam.
 */
type Cutscene = {
  plotIndex: number;
  asset: AssetId;
  option: OptionId;
  label: string;
  phase: CutscenePhase;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Game() {
  const { state, dispatch, ready } = useGame();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [activeTransition, setActiveTransition] = useState<ActivePlotTransition | null>(null);
  const [cutscene, setCutscene] = useState<Cutscene | null>(null);
  const pendingRef = useRef<OptionId | null>(null);
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

  function clearTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }

  /** Menerapkan pilihan yang ditahan, kalau belum sempat diterapkan. */
  function commitPending() {
    const option = pendingRef.current;
    if (!option) return;
    pendingRef.current = null;
    dispatch({ type: 'choose', option });
  }

  /** Mengakhiri sinematik di titik mana pun: dipakai tombol lewati, Esc, dan klik. */
  function endCutscene() {
    clearTimers();
    commitPending();
    setCutscene(null);
    setActiveTransition(null);
    setBusy(false);
  }

  function choose(option: OptionId) {
    if (busy || !scenario) return;
    const targetPlot = scenario.plot;
    const asset = scenario.options.find((o) => o.id === option)?.asset;
    if (!asset) return;
    const label = scenario.options.find((o) => o.id === option)?.label ?? '';

    clearTimers();
    setBusy(true);

    // Gerak dikurangi: lewati seluruh sinematik, pakai transisi peta yang lama.
    if (prefersReducedMotion()) {
      setActiveTransition({ plotIndex: targetPlot, stage: 'construction' });
      dispatch({ type: 'choose', option });
      const toCeremony = window.setTimeout(() => {
        setActiveTransition({ plotIndex: targetPlot, stage: 'ceremony' });
      }, CONSTRUCTION_DURATION_MS);
      const toDone = window.setTimeout(() => {
        setActiveTransition(null);
        setBusy(false);
      }, TOTAL_TRANSITION_MS);
      timersRef.current.push(toCeremony, toDone);
      return;
    }

    // Pilihan ditahan sampai tahap 'ceremony'.
    pendingRef.current = option;
    setActiveTransition({ plotIndex: targetPlot, stage: 'construction' });
    setCutscene({ plotIndex: targetPlot, asset, option, label, phase: 'zoom-in' });
    play('construct', state.muted);

    // Jadwalkan tiap tahap pada waktu kumulatifnya.
    let elapsed = 0;
    for (const phase of CUTSCENE_ORDER) {
      elapsed += CUTSCENE_TIMING[phase];
      const at = elapsed - CUTSCENE_TIMING[phase];
      if (phase === 'zoom-in') continue;

      const id = window.setTimeout(() => {
        if (phase === 'ceremony') {
          setActiveTransition({ plotIndex: targetPlot, stage: 'ceremony' });
          play('ceremony', state.muted);
        }
        if (phase === 'zoom-out') {
          // Pilihan baru diterapkan di sini, bukan saat peresmian: papan
          // indikator masih tersembunyi sepanjang adegan, jadi kalau angkanya
          // berubah lebih awal, animasi deltanya habis sebelum papan kembali.
          commitPending();
          setActiveTransition(null);
        }
        setCutscene((c) => (c ? { ...c, phase } : c));
      }, at);
      timersRef.current.push(id);
    }

    const endId = window.setTimeout(() => {
      setCutscene(null);
      setBusy(false);
    }, elapsed);
    timersRef.current.push(endId);
  }

  // Petak yang sedang dibangun belum masuk ke state sampai tahap 'ceremony',
  // jadi asetnya disuntikkan di sini supaya kamera punya sesuatu untuk disorot.
  const displayPlots = cutscene
    ? state.plots.map((a, i) => (i === cutscene.plotIndex ? cutscene.asset : a))
    : state.plots;

  // HUD dan kartu disembunyikan sepanjang adegan, dan baru kembali setelah
  // iris menutup lagi, supaya kemunculannya tidak terlihat mendadak.
  const hideUi =
    cutscene?.phase === 'inspect' ||
    cutscene?.phase === 'ceremony' ||
    cutscene?.phase === 'iris-out';
  const caption =
    cutscene?.phase === 'ceremony'
      ? `Peresmian ${cutscene.label}`
      : `Peninjauan pembangunan ${cutscene?.label ?? ''}`;

  return (
    <div className={`stage${hideUi ? ' stage--sinematik' : ''}`}>
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
            plots={displayPlots}
            avatar={state.leader.avatar}
            satisfaction={state.stats.satisfaction}
            activeTransition={activeTransition}
            cameraPlot={cutscene && cutscene.phase !== 'zoom-out' ? cutscene.plotIndex : null}
            mayorMode={cutscene?.phase === 'ceremony' ? 'ceremony' : 'inspection'}
            fill={hideUi}
            animate
            label={`Peta Ecopolis, ${displayPlots.filter(Boolean).length} dari ${ROUNDS} kawasan terbangun.`}
          />
        </div>

        <div className="stage__card">
          {scenario ? (
            <ScenarioCard key={scenario.round} scenario={scenario} onChoose={choose} busy={busy} />
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

      {cutscene && (
        <Cutscene phase={cutscene.phase} caption={caption} onSkip={endCutscene} />
      )}
    </div>
  );
}

