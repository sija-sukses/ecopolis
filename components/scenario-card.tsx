'use client';

import { useEffect, useRef } from 'react';

import type { OptionId, Scenario } from '@/lib/types.ts';

type Props = {
  scenario: Scenario;
  onChoose: (option: OptionId) => void;
  /** Mengunci kartu selama animasi bangunan jatuh. */
  busy: boolean;
};

export function ScenarioCard({ scenario, onChoose, busy }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);

  // Fokus berpindah ke judul tiap ronde baru, supaya pengguna papan ketik dan
  // pembaca layar tahu kartunya berganti.
  useEffect(() => {
    heading.current?.focus();
  }, [scenario.round]);

  return (
    // key membuat kartu dipasang ulang tiap ronde, jadi animasi masuknya
    // berjalan lagi tanpa pustaka animasi apa pun.
    <article className="card" key={scenario.round}>
      <h2 className="card__title" ref={heading} tabIndex={-1}>
        {scenario.title}
      </h2>
      <p className="card__ctx">{scenario.context}</p>

      <div className="card__opts">
        {scenario.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="opt"
            disabled={busy}
            onClick={() => onChoose(o.id)}
          >
            <b>{o.label}</b>
            <span>{o.blurb}</span>
          </button>
        ))}
      </div>

      <p className="card__hint">
        Dampaknya baru terlihat di indikator setelah Anda memilih.
      </p>
    </article>
  );
}
