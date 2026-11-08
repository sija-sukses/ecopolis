'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, FileDown, Home, MapPin, RotateCcw, Share2 } from 'lucide-react';

import { CityMap } from '@/components/city-map.tsx';
import { Avatar } from '@/components/avatars.tsx';
import { Reveal } from '@/components/motion/reveal.tsx';
import { PolicyIcon } from '@/components/policy-icon.tsx';
import { honorificOf } from '@/lib/avatars.ts';
import { useGame } from '@/lib/game-context.tsx';
import { downloadCertificate, downloadStoryCard } from '@/lib/pdf.ts';
import { SCENARIOS } from '@/lib/scenarios.ts';
import { play } from '@/lib/sfx.ts';
import type { AssetId, OptionId, StatKey } from '@/lib/types.ts';
import { useInView } from '@/lib/use-in-view.ts';

const STATS: { key: StatKey; label: string; shortLabel: string; sdg: string; sdgName: string }[] = [
  { key: 'economy', label: 'Ekonomi', shortLabel: 'Eko', sdg: 'SDG 8', sdgName: 'Pekerjaan Layak dan Pertumbuhan Ekonomi' },
  { key: 'environment', label: 'Lingkungan', shortLabel: 'Ling', sdg: 'SDG 13', sdgName: 'Penanganan Perubahan Iklim' },
  { key: 'satisfaction', label: 'Kepuasan Warga', shortLabel: 'Warga', sdg: 'SDG 11', sdgName: 'Kota dan Permukiman Berkelanjutan' },
  { key: 'energy', label: 'Energi', shortLabel: 'Energi', sdg: 'SDG 9', sdgName: 'Industri, Inovasi, dan Infrastruktur' },
];

function statusTone(value: number): 'good' | 'warn' | 'bad' {
  if (value >= 60) return 'good';
  if (value >= 35) return 'warn';
  return 'bad';
}

function CountUpNumber({ value, active = true }: { value: number; active?: boolean }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!active) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    let rafId = 0;
    const duration = 760;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, active]);

  return <>{active ? display : 0}</>;
}

function findChoiceMeta(
  round: number,
  option: OptionId,
): {
  asset: AssetId | null;
  scenarioTitle: string;
  plot: number | null;
  effects: { key: StatKey; label: string; delta: number }[];
} {
  const sc = SCENARIOS.find((s) => s.round === round);
  const opt = sc?.options.find((o) => o.id === option);
  const effects: { key: StatKey; label: string; delta: number }[] = [];
  if (opt?.effects) {
    for (const s of STATS) {
      const d = opt.effects[s.key];
      if (typeof d === 'number' && d !== 0) {
        effects.push({ key: s.key, label: s.shortLabel, delta: d });
      }
    }
  }
  return {
    asset: opt?.asset ?? null,
    scenarioTitle: sc?.title ?? `Ronde ${round}`,
    plot: sc?.plot ?? null,
    effects,
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

function EvaluationStamp({
  grade,
  label,
}: {
  grade: string;
  label: string;
}) {
  const isA = grade === 'A';
  const isC = grade === 'C';
  const stampTheme = isA
    ? 'eval-stamp--a'
    : isC
      ? 'eval-stamp--c'
      : 'eval-stamp--b';

  const statusText = isA
    ? 'KOTA BERKELANJUTAN'
    : isC
      ? 'PERLU RESTRUKTURISASI'
      : label.toUpperCase().includes('INDUSTRI')
        ? 'INDUSTRI PESAT'
        : 'TRANSISI IKLIM';

  return (
    <div
      className={`eval-stamp ${stampTheme}`}
      role="img"
      aria-label={`Cap Dinas Resmi: Kelas ${grade} - ${label}`}
    >
      <div className="eval-stamp__inner">
        <span className="eval-stamp__agency">★ PEMERINTAH ECOPOLIS ★</span>
        <div className="eval-stamp__center">
          <span className="eval-stamp__grade">KELAS {grade}</span>
          <span className="eval-stamp__status">{statusText}</span>
        </div>
        <span className="eval-stamp__date">EVALUASI RESMI 2050</span>
      </div>
    </div>
  );
}

export function ResultsView() {
  const { state, dispatch, ready } = useGame();
  const router = useRouter();
  const mapBox = useRef<HTMLDivElement>(null);
  const [making, setMaking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [focusedRound, setFocusedRound] = useState<number | null>(null);

  const [sdgRef, sdgInView] = useInView<HTMLElement>({ once: true, amount: 0.2 });
  const [closeRef, closeInView] = useInView<HTMLElement>({ once: true, amount: 0.2 });

  const { leader, review, stats, choices, plots } = state;

  // Halaman ini tidak punya arti tanpa laporannya.
  useEffect(() => {
    if (ready && (!leader || !review)) router.replace('/play');
  }, [ready, leader, review, router]);

  // Efek suara stempel cap dinas resmi saat dossier terbuka
  useEffect(() => {
    if (ready && leader && review) {
      const timer = setTimeout(() => {
        play('stamp', state.muted);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [ready, leader, review, state.muted]);

  if (!ready || !leader || !review) return <div className="stage stage--wait" aria-busy="true" />;

  const honorific = honorificOf(leader.avatar);
  const quadrant = computeQuadrant(stats.economy, stats.environment);
  const avgScore = Math.round(
    (stats.economy + stats.environment + stats.satisfaction + stats.energy) / 4,
  );

  const focusedChoice = focusedRound !== null ? choices.find((c) => c.round === focusedRound) : undefined;
  const focusedMeta =
    focusedChoice !== undefined ? findChoiceMeta(focusedChoice.round, focusedChoice.option) : null;
  const focusedPlot = focusedMeta?.plot ?? null;

  async function unduh() {
    setMaking(true);
    setFocusedRound(null);
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
    setFocusedRound(null);
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
        <header className="result__masthead result-reveal result-reveal--1">
          <div className="result__who">
            <Avatar id={leader.avatar} size={64} className="result__face" />
            <div className="result__who-copy">
              <span className="result__eyebrow">
                Laporan Evaluasi 2050 · {review.fallback ? 'Evaluasi Standar' : 'Evaluasi AI'}
              </span>
              <b className="result__leader-name">
                {honorific} {leader.name}
              </b>
              <span className="result__quadrant-tag">
                <b>Kelas {quadrant.grade}</b> · {quadrant.label}
              </span>
            </div>
          </div>

          <div className="result__masthead-right">
            <EvaluationStamp grade={quadrant.grade} label={quadrant.label} />
            <div
              className="result__score-hero"
              aria-label={`Skor rata-rata indeks kota ${avgScore} dari 100`}
            >
              <span className="result__score-label">Indeks Kota</span>
              <b className="result__score-num">
                <CountUpNumber value={avgScore} />
                <small>/100</small>
              </b>
            </div>
          </div>
        </header>

        <div className="result__dossier">
          <div className="result__stage result-reveal result-reveal--2">
            <div className="result__stage-top">
              <span className="result__section-label">Diorama Tata Kota 2050</span>
              <span className="result__stage-sub">
                {focusedRound === null
                  ? '5 kawasan terbangun'
                  : `Fokus Kawasan · Ronde ${focusedRound}`}
              </span>
            </div>

            <div className="result__map" ref={mapBox}>
              <CityMap
                plots={plots}
                avatar={leader.avatar}
                satisfaction={stats.satisfaction}
                cameraPlot={focusedPlot}
                animate
                label={`Kota Ecopolis pada 2050 dengan kelima kawasan terbangun: ${choices
                  .map((c) => c.label)
                  .join(', ')}.`}
              />
            </div>

            <div className="result__plot-bar" role="group" aria-label="Sorot kawasan bangunan per ronde">
              <button
                type="button"
                className={`result__plot-pill${focusedRound === null ? ' result__plot-pill--active' : ''}`}
                aria-pressed={focusedRound === null}
                onClick={() => {
                  play('click', state.muted);
                  setFocusedRound(null);
                }}
              >
                Semua
              </button>
              {choices.map((c) => {
                const active = focusedRound === c.round;
                return (
                  <button
                    key={c.round}
                    type="button"
                    className={`result__plot-pill${active ? ' result__plot-pill--active' : ''}`}
                    aria-pressed={active}
                    title={`Ronde ${c.round}: ${c.label}`}
                    onClick={() => {
                      play('click', state.muted);
                      setFocusedRound(active ? null : c.round);
                    }}
                  >
                    R{c.round}
                  </button>
                );
              })}
            </div>

            <div className="result__inspector" aria-live="polite">
              {focusedChoice && focusedMeta ? (
                <div className="result__inspector-active">
                  {focusedMeta.asset && <PolicyIcon asset={focusedMeta.asset} />}
                  <div className="result__inspector-copy">
                    <small>
                      Ronde {focusedChoice.round} · {focusedMeta.scenarioTitle}
                    </small>
                    <b>{focusedChoice.label}</b>
                  </div>
                  {focusedMeta.effects.length > 0 && (
                    <div className="result__inspector-deltas">
                      {focusedMeta.effects.map((ef) => (
                        <span
                          key={ef.key}
                          className={`result__delta-pill ${
                            ef.delta > 0 ? 'result__delta-pill--up' : 'result__delta-pill--down'
                          }`}
                        >
                          {ef.delta > 0 ? `+${ef.delta}` : ef.delta} {ef.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="result__inspector-idle">
                  <MapPin size={15} strokeWidth={2.2} aria-hidden="true" />
                  <span>
                    Menampilkan seluruh pulau. Pilih <b>R1–R5</b> di atas untuk menginspeksi kawasan dan dampak kebijakannya.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="result__brief result-reveal result-reveal--2">
            <div className="result__brief-main">
              <span className="result__section-label">Tinjauan Eksekutif 2050</span>
              <h1 className="result__title">{review.title}</h1>

              <div className="result__story-box" aria-label="Ecopolis pada 2050">
                {review.narrative.split('\n\n').map((p, i) => (
                  <p className="result__para" key={i}>
                    {p.trim()}
                  </p>
                ))}
              </div>
            </div>

            <Reveal variant="blur-in" duration={500} className="result__sdg-synthesis">
              <span className="result__section-label">Sintesis Pembangunan Berkelanjutan</span>
              <p className="result__reflect">{review.sdgReflection}</p>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="result__bottom shell">
        <section
          ref={sdgRef}
          data-io-reveal=""
          data-variant="slide-up"
          data-in-view={sdgInView ? 'true' : 'false'}
          className="result__sdg"
          aria-labelledby="sdg"
        >
          <div className="result__panel-head">
            <span className="result__section-label">Matriks Kinerja & Target Global</span>
            <h2 id="sdg">Capaian Indikator & SDG</h2>
          </div>

          <div className="sdgs">
            {STATS.map((s, idx) => {
              const val = stats[s.key];
              const tone = statusTone(val);
              return (
                <article
                  className={`sdg sdg--${tone}`}
                  key={s.key}
                  data-io-reveal=""
                  data-variant="scale-up"
                  data-in-view={sdgInView ? 'true' : 'false'}
                  style={{ '--io-delay': `${idx * 55}ms` } as React.CSSProperties}
                >
                  <div className="sdg__top">
                    <span className="sdg__label">{s.label}</span>
                    <span className="sdg__tag">{s.sdg}</span>
                  </div>
                  <b className="sdg__num">
                    <CountUpNumber value={val} active={sdgInView} />
                    <small>/100</small>
                  </b>
                  <span className="sdg__track">
                    <span
                      className={`sdg__fill sdg__fill--${tone}`}
                      style={{
                        width: `${val}%`,
                        animationDelay: `${180 + idx * 60}ms`,
                      }}
                    />
                  </span>
                  <span className="sdg__name">{s.sdgName}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section
          ref={closeRef}
          data-io-reveal=""
          data-variant="slide-up"
          data-in-view={closeInView ? 'true' : 'false'}
          className="result__close"
          aria-labelledby="jejak-kebijakan"
          style={{ '--io-duration': '360ms' } as React.CSSProperties}
        >
          <div className="result__panel-head">
            <span className="result__section-label">Rekam Jejak 5 Ronde · Ketuk untuk sorot peta</span>
            <h2 id="jejak-kebijakan">Keputusan Kebijakan</h2>
          </div>

          <ol className="result__list">
            {choices.map((c, idx) => {
              const meta = findChoiceMeta(c.round, c.option);
              const isSelected = focusedRound === c.round;
              const cappedIdx = Math.min(idx, 4);
              return (
                <li
                  key={c.round}
                  data-io-reveal=""
                  data-variant="slide-up"
                  data-in-view={closeInView ? 'true' : 'false'}
                  className={`result__choice-item${isSelected ? ' result__choice-item--active' : ''}`}
                  style={
                    {
                      '--io-delay': `${cappedIdx * 55}ms`,
                      '--io-duration': '360ms',
                    } as React.CSSProperties
                  }
                >
                  <button
                    type="button"
                    className="result__choice-btn py-2"
                    aria-pressed={isSelected}
                    onClick={() => {
                      play('click', state.muted);
                      const next = isSelected ? null : c.round;
                      setFocusedRound(next);
                      if (next !== null) {
                        mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                  >
                    {meta.asset && <PolicyIcon asset={meta.asset} />}
                    <div className="result__choice-copy">
                      <div className="result__choice-eyebrow">
                        <span className="result__choice-round">R{c.round}</span>
                        <small>{meta.scenarioTitle}</small>
                      </div>
                      <span className="result__choice-title">{c.label}</span>
                      {meta.effects.length > 0 && (
                        <div className="result__choice-deltas" aria-label="Dampak indikator">
                          {meta.effects.map((ef) => (
                            <span
                              key={ef.key}
                              className={`result__delta-pill ${
                                ef.delta > 0 ? 'result__delta-pill--up' : 'result__delta-pill--down'
                              }`}
                            >
                              {ef.delta > 0 ? `+${ef.delta}` : ef.delta} {ef.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="result__choice-pin" aria-hidden="true">
                      <MapPin size={15} strokeWidth={2.2} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <nav className="result-dock result-reveal result-reveal--5" aria-label="Menu aksi laporan 2050">
        <div className="result-dock__inner">
          <Link
            href="/"
            className="result-dock__item"
            onClick={() => play('click', state.muted)}
          >
            <Home size={19} strokeWidth={2.3} aria-hidden="true" />
            <span>Beranda</span>
          </Link>

          <button
            type="button"
            className="result-dock__item"
            onClick={unduh}
            disabled={making}
            aria-label="Unduh laporan PDF"
          >
            <FileDown size={19} strokeWidth={2.3} aria-hidden="true" />
            <span>{making ? 'Proses...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            className="result-dock__item"
            onClick={bagikanStory}
            disabled={sharing}
            aria-label="Simpan atau bagikan kartu Story"
          >
            <Share2 size={19} strokeWidth={2.3} aria-hidden="true" />
            <span>{sharing ? 'Proses...' : 'Story'}</span>
          </button>

          <button
            type="button"
            className="result-dock__item result-dock__item--tara"
            onClick={() => {
              play('click', state.muted);
              window.dispatchEvent(
                new CustomEvent('ecopolis:ask-tara', {
                  detail:
                    'Bedah hasil evaluasi kota 2050 saya dan jelaskan sektor mana yang paling perlu diperbaiki.',
                }),
              );
            }}
            aria-label="Bedah evaluasi kota bersama AI TARA"
          >
            <span className="result-dock__tara-icon" aria-hidden="true">
              <Bot size={19} strokeWidth={2.3} />
              <small>AI</small>
            </span>
            <span>TARA</span>
          </button>

          <button
            type="button"
            className="result-dock__cta"
            onClick={() => {
              play('click', state.muted);
              dispatch({ type: 'reset' });
              router.push('/play');
            }}
          >
            <RotateCcw size={17} strokeWidth={2.5} aria-hidden="true" />
            <span>Main Lagi</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
