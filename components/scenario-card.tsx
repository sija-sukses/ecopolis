'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [selected, setSelected] = useState<OptionId | null>(null);

  // Fokus berpindah ke judul saat kartu pertama kali dimuat.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const chooseOption = useCallback(
    (option: OptionId) => {
      if (busy || selected !== null) return;
      setSelected(option);
      onChoose(option);
    },
    [busy, selected, onChoose],
  );

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
        chooseOption('a');
      } else if (k === 'b' || k === '2') {
        e.preventDefault();
        chooseOption('b');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, chooseOption]);

  return (
    // key membuat kartu dipasang ulang tiap ronde, jadi animasi masuknya
    // berjalan lagi tanpa pustaka animasi apa pun.
    <article className="card" key={scenario.round}>
      <h2 className="card__title" ref={heading} tabIndex={-1}>
        {scenario.title}
      </h2>
      <p className="card__ctx">{scenario.context}</p>

      <div className="card__opts">
        {scenario.options.map((o) => {
          const isSelected = selected === o.id;
          const isDimmed = selected !== null && !isSelected;
          return (
            <button
              key={o.id}
              type="button"
              className={`opt${isSelected ? ' opt--selected' : isDimmed ? ' opt--dimmed' : ''}`}
              disabled={busy || selected !== null}
              onClick={() => chooseOption(o.id)}
            >
              <span className="opt__row">
                <PolicyIcon asset={o.asset} />
                <span className="opt__copy">
                  <b>{o.label}</b>
                  <span>{o.blurb}</span>
                </span>
                <span className="opt__key" aria-hidden="true">
                  {isSelected ? '✓' : o.id.toUpperCase()}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="card__hint">
        <span className="card__hint-full">
          Tekan tombol <b>[A]</b> atau <b>[B]</b> di keyboard, atau klik langsung pilihan Anda.
        </span>
        <span className="card__hint-compact" aria-hidden="true">
          Ketuk salah satu pilihan di atas untuk membangun kota.
        </span>
      </p>
    </article>
  );
}
