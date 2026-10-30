'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CityMap } from '@/components/city-map.tsx';
import { Avatar } from '@/components/avatars.tsx';
import { PolicyIcon } from '@/components/policy-icon.tsx';
import { honorificOf } from '@/lib/avatars.ts';
import { useGame } from '@/lib/game-context.tsx';
import { downloadCertificate, downloadStoryCard } from '@/lib/pdf.ts';
import { SCENARIOS } from '@/lib/scenarios.ts';
import { play } from '@/lib/sfx.ts';
import type { AssetId, OptionId, StatKey } from '@/lib/types.ts';

const STATS: { key: StatKey; label: string; sdg: string; sdgName: string }[] = [
  { key: 'economy', label: 'Ekonomi', sdg: 'SDG 8', sdgName: 'Pekerjaan Layak dan Pertumbuhan Ekonomi' },
  { key: 'environment', label: 'Lingkungan', sdg: 'SDG 13', sdgName: 'Penanganan Perubahan Iklim' },
  { key: 'satisfaction', label: 'Kepuasan Warga', sdg: 'SDG 11', sdgName: 'Kota dan Permukiman Berkelanjutan' },
  { key: 'energy', label: 'Energi', sdg: 'SDG 9', sdgName: 'Industri, Inovasi, dan Infrastruktur' },
];

function findChoiceMeta(round: number, option: OptionId): { asset: AssetId | null; scenarioTitle: string } {
  const sc = SCENARIOS.find((s) => s.round === round);
  const opt = sc?.options.find((o) => o.id === option);
  return {
    asset: opt?.asset ?? null,
    scenarioTitle: sc?.title ?? `Ronde ${round}`,
  };
}

function computeQuadrant(economy: number, environment: number): { grade: string; label: string } {
  if (economy >= 45 && environment >= 45) {
    return { grade: 'A', label: 'Kota Hijau Seimbang' };
  }
  if (economy >= 45) {
    return { grade: 'B', label: 'Industri Pesat, Alam Tertekan' };
  }
  if (environment >= 45) {
    return { grade: 'B', label: 'Lestari namun Defisit Ekonomi' };
  }
  return { grade: 'C', label: 'Kota dalam Tekanan Ganda' };
}

export function ResultsView() {
  const { state, dispatch, ready } = useGame();
  const router = useRouter();
  const mapBox = useRef<HTMLDivElement>(null);
  const [making, setMaking] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { leader, review, stats, choices, plots } = state;

  // Halaman ini tidak punya arti tanpa laporannya.
  useEffect(() => {
    if (ready && (!leader || !review)) router.replace('/play');
  }, [ready, leader, review, router]);

  if (!ready || !leader || !review) return <div className="stage stage--wait" aria-busy="true" />;

  const honorific = honorificOf(leader.avatar);
  const quadrant = computeQuadrant(stats.economy, stats.environment);
  const avgScore = Math.round(
    (stats.economy + stats.environment + stats.satisfaction + stats.energy) / 4,
  );

  async function unduh() {
    setMaking(true);
    play('click', state.muted);
    try {
      await downloadCertificate(
        state,
        mapBox.current?.querySelector('svg') ?? null,
        document.querySelector<HTMLImageElement>('img.result__face'),
      );
    } finally {
      setMaking(false);
    }
  }

  async function bagikanStory() {
    setSharing(true);
    play('click', state.muted);
    try {
      await downloadStoryCard(
        state,
        mapBox.current?.querySelector('svg') ?? null,
        document.querySelector<HTMLImageElement>('img.result__face'),
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="result">
      <section className="result__hero shell" aria-label="Dossier kepemimpinan Ecopolis 2050">
        <div className="result__dossier">
          <div className="result__stage">
            <div className="result__stage-top">
              <span className="result__grade">
                <b>Kelas {quadrant.grade}</b> · {quadrant.label}
              </span>
              <span className="result__avg">Rata-rata {avgScore}/100</span>
            </div>

            <div className="result__map" ref={mapBox}>
              <CityMap
                plots={plots}
                avatar={leader.avatar}
                satisfaction={stats.satisfaction}
                animate
                label={`Kota Ecopolis pada 2050 dengan kelima kawasan terbangun: ${choices
                  .map((c) => c.label)
                  .join(', ')}.`}
              />
            </div>

            <div className="result__mini-stats" aria-label="Ringkasan indikator kota">
              {STATS.map((s) => (
                <div className="result__mini-stat" key={s.key}>
                  <div className="result__mini-head">
                    <span>{s.label}</span>
                    <b>{stats[s.key]}</b>
                  </div>
                  <span className="result__mini-track">
                    <span
                      className="result__mini-fill"
                      style={{ width: `${stats[s.key]}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="result__brief">
            <div className="result__who-row">
              <div className="result__who">
                <Avatar id={leader.avatar} size={68} className="result__face" />
                <p>
                  <span>Dossier Kepemimpinan 2050</span>
                  <b>
                    {honorific} {leader.name}
                  </b>
                </p>
              </div>
              <span className="result__badge">
                {review.fallback ? 'Evaluasi Standar' : 'Evaluasi AI 2050'}
              </span>
            </div>

            <h1 className="result__title">{review.title}</h1>

            <div className="result__story-box" aria-label="Ecopolis pada 2050">
              {review.narrative.split('\n\n').map((p, i) => (
                <p className="result__para" key={i}>
                  {p.trim()}
                </p>
              ))}
            </div>

            <div className="result__actions">
              <button className="btn" type="button" onClick={unduh} disabled={making}>
                {making ? 'Menyiapkan PDF...' : 'Unduh laporan PDF'}
              </button>
              <button
                className="btn btn--paper"
                type="button"
                onClick={bagikanStory}
                disabled={sharing}
              >
                {sharing ? 'Menyiapkan gambar...' : 'Simpan kartu Story (PNG)'}
              </button>
              <button
                className="btn btn--ink"
                type="button"
                onClick={() => {
                  play('click', state.muted);
                  dispatch({ type: 'reset' });
                  router.push('/play');
                }}
              >
                Main lagi
              </button>
              <Link className="result__home" href="/">
                Kembali ke beranda
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="result__bottom shell">
        <section className="result__sdg" aria-labelledby="sdg">
          <div className="result__panel-head">
            <span className="result__kicker">Dampak Pembangunan Berkelanjutan</span>
            <h2 id="sdg">Capaian dan SDG</h2>
            <p className="result__reflect">{review.sdgReflection}</p>
          </div>

          <div className="sdgs">
            {STATS.map((s) => (
              <article className="sdg" key={s.key}>
                <div className="sdg__top">
                  <span className="sdg__tag">{s.sdg}</span>
                  <b className="sdg__num">{stats[s.key]}</b>
                </div>
                <span className="sdg__label">{s.label}</span>
                <span className="sdg__track">
                  <span className="sdg__fill" style={{ width: `${stats[s.key]}%` }} />
                </span>
                <span className="sdg__name">{s.sdgName}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="result__close" aria-labelledby="jejak-kebijakan">
          <div className="result__panel-head">
            <span className="result__kicker">Rekam Jejak 5 Ronde</span>
            <h2 id="jejak-kebijakan">Kebijakan yang Anda ambil</h2>
          </div>

          <ol className="result__list">
            {choices.map((c) => {
              const meta = findChoiceMeta(c.round, c.option);
              return (
                <li key={c.round}>
                  {meta.asset && <PolicyIcon asset={meta.asset} />}
                  <div className="result__choice-copy">
                    <small>
                      Ronde {c.round} · {meta.scenarioTitle}
                    </small>
                    <span>{c.label}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
