'use client';

import { useEffect, useRef } from 'react';

import { PolicyIcon } from '@/components/policy-icon.tsx';
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

  // Pintasan papan ketik ala konsol game: A / 1 untuk opsi A, B / 2 untuk opsi B.
  useEffect(() => {
    if (busy) return;
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
      const k = e.key.toLowerCase();
      if (k === 'a' || k === '1') {
        e.preventDefault();
        onChoose('a');
      } else if (k === 'b' || k === '2') {
        e.preventDefault();
        onChoose('b');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onChoose]);

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
            <span className="opt__row">
              <PolicyIcon asset={o.asset} />
              <span className="opt__copy">
                <b>{o.label}</b>
                <span>{o.blurb}</span>
              </span>
              <span className="opt__key" aria-hidden="true">
                {o.id.toUpperCase()}
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="card__hint">
        Tekan tombol <b>[A]</b> atau <b>[B]</b> di keyboard, atau klik langsung pilihan Anda.
      </p>
    </article>
  );
}
