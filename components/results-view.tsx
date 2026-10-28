'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CityMap } from '@/components/city-map.tsx';
import { Avatar } from '@/components/avatars.tsx';
import { useGame } from '@/lib/game-context.tsx';
import { downloadCertificate } from '@/lib/pdf.ts';
import { play } from '@/lib/sfx.ts';
import type { StatKey } from '@/lib/types.ts';

const STATS: { key: StatKey; label: string; sdg: string; sdgName: string }[] = [
  { key: 'economy', label: 'Ekonomi', sdg: 'SDG 8', sdgName: 'Pekerjaan Layak dan Pertumbuhan Ekonomi' },
  { key: 'environment', label: 'Lingkungan', sdg: 'SDG 13', sdgName: 'Penanganan Perubahan Iklim' },
  { key: 'satisfaction', label: 'Kepuasan Warga', sdg: 'SDG 11', sdgName: 'Kota dan Permukiman Berkelanjutan' },
  { key: 'energy', label: 'Energi', sdg: 'SDG 9', sdgName: 'Industri, Inovasi, dan Infrastruktur' },
];

export function ResultsView() {
  const { state, dispatch, ready } = useGame();
  const router = useRouter();
  const mapBox = useRef<HTMLDivElement>(null);
  const [making, setMaking] = useState(false);

  const { leader, review, stats, choices, plots } = state;

  // Halaman ini tidak punya arti tanpa laporannya.
  useEffect(() => {
    if (ready && (!leader || !review)) router.replace('/play');
  }, [ready, leader, review, router]);

  if (!ready || !leader || !review) return <div className="stage stage--wait" aria-busy="true" />;

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

  return (
    <main className="result">

      <section className="result__hero shell">
        <div className="result__who">
          <Avatar id={leader.avatar} size={72} className="result__face" />
          <p>
            <span>Laporan kepemimpinan</span>
            <b>{leader.name}</b>
          </p>
        </div>

        <h1 className="result__title">{review.title}</h1>

        {review.fallback && (
          <p className="result__badge">Laporan Hasil Evaluasi Standar</p>
        )}

        <div className="result__map" ref={mapBox}>
          <CityMap
            plots={plots}
            animate
            label={`Kota Ecopolis pada 2050 dengan kelima petak terbangun: ${choices
              .map((c) => c.label)
              .join(', ')}.`}
          />
        </div>
      </section>

      <section className="result__story" aria-labelledby="cerita">
        <div className="shell">
          <h2 id="cerita">Ecopolis pada 2050</h2>
          {review.narrative.split('\n\n').map((p, i) => (
            <p className="result__para" key={i}>
              {p.trim()}
            </p>
          ))}
        </div>
      </section>

      <section className="result__sdg shell" aria-labelledby="sdg">
        <h2 id="sdg">Capaian dan SDG</h2>
        <p className="result__reflect">{review.sdgReflection}</p>

        <div className="sdgs">
          {STATS.map((s) => (
            <article className="sdg" key={s.key}>
              <b className="sdg__num">{stats[s.key]}</b>
              <span className="sdg__label">{s.label}</span>
              <span className="sdg__track">
                <span className="sdg__fill" style={{ width: `${stats[s.key]}%` }} />
              </span>
              <span className="sdg__tag">{s.sdg}</span>
              <span className="sdg__name">{s.sdgName}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="result__close shell">
        <h2>Kebijakan yang Anda ambil</h2>
        <ol className="result__list">
          {choices.map((c) => (
            <li key={c.round}>
              <b>Ronde {c.round}</b>
              <span>{c.label}</span>
            </li>
          ))}
        </ol>

        <div className="result__actions">
          <button className="btn" type="button" onClick={unduh} disabled={making}>
            {making ? 'Menyiapkan PDF' : 'Unduh laporan PDF'}
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
          <a className="result__home" href="/">
            Kembali ke beranda
          </a>
        </div>
      </section>
    </main>
  );
}
