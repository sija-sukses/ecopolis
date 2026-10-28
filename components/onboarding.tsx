'use client';

import { useState } from 'react';

import { useGame } from '@/lib/game-context.tsx';
import { play } from '@/lib/sfx.ts';
import type { Leader } from '@/lib/types.ts';

const MAX = 20;

export function Onboarding() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Leader['avatar']>('male');
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= MAX;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    play('click', state.muted);
    dispatch({ type: 'start', leader: { name: trimmed, avatar } });
  }

  return (
    <form className="onboard" onSubmit={submit} noValidate>
      <h1 className="onboard__title">Siapa yang memimpin?</h1>
      <p className="onboard__lead">
        Nama Anda dipakai di seluruh simulasi dan di laporan kota pada tahun 2050.
      </p>

      <label className="field">
        <span className="field__label">Nama pemimpin</span>
        <input
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX))}
          onBlur={() => setTouched(true)}
          maxLength={MAX}
          autoFocus
          autoComplete="off"
          aria-describedby="nama-bantuan"
          aria-invalid={touched && !valid}
        />
        <span className="field__help" id="nama-bantuan">
          {touched && !valid ? 'Isi nama lebih dulu, 1 sampai 20 huruf.' : `${trimmed.length}/${MAX} huruf`}
        </span>
      </label>

      <fieldset className="pick">
        <legend className="field__label">Avatar</legend>
        <div className="pick__row">
          {(['male', 'female'] as const).map((a) => (
            <button
              key={a}
              type="button"
              className="pick__btn"
              aria-pressed={avatar === a}
              onClick={() => {
                play('click', state.muted);
                setAvatar(a);
              }}
            >
              <Face avatar={a} />
              <span>{a === 'male' ? 'Bapak' : 'Ibu'}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <button className="btn" type="submit">
        Terapkan kebijakan pertama
      </button>
    </form>
  );
}

/** Avatar digambar datar, sewarna token halaman, agar sepadan dengan kotanya. */
export function Face({ avatar, size = 72 }: { avatar: Leader['avatar']; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="var(--field-warm)" />
      {avatar === 'female' ? (
        <path d="M10 36c0-16 8-24 22-24s22 8 22 24v6h-8V28H18v20h-8z" fill="var(--ink)" />
      ) : (
        <path d="M12 32c0-13 8-20 20-20s20 7 20 20v2h-8v-8H20v8h-8z" fill="var(--ink)" />
      )}
      <circle cx="32" cy="36" r="15" fill="var(--smoke)" />
      <circle cx="26" cy="34" r="2.6" fill="var(--ink)" />
      <circle cx="38" cy="34" r="2.6" fill="var(--ink)" />
      <path d="M26 43c3 3 9 3 12 0" stroke="var(--ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
