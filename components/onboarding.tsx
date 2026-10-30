'use client';

import { useState } from 'react';

import { Avatar } from '@/components/avatars.tsx';
import { AVATARS, DEFAULT_AVATAR } from '@/lib/avatars.ts';
import type { AvatarId } from '@/lib/avatars.ts';
import { useGame } from '@/lib/game-context.tsx';
import { play } from '@/lib/sfx.ts';

const MAX = 20;

export function Onboarding() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>(DEFAULT_AVATAR);
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
        Nama dan avatar Anda muncul di papan indikator sepanjang permainan, lalu di laporan kota
        pada tahun 2050.
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
          {touched && !valid
            ? 'Isi nama lebih dulu, 1 sampai 20 huruf.'
            : `${trimmed.length}/${MAX} huruf`}
        </span>
      </label>

      <fieldset className="pick">
        <legend className="field__label">Pilih avatar</legend>
        <div className="pick__grid">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="pick__btn"
              aria-pressed={avatar === a.id}
              aria-label={`Karakter ${a.label}`}
              title={`Pilih avatar (${a.gender})`}
              onClick={() => {
                play('click', state.muted);
                setAvatar(a.id);
              }}
            >
              <Avatar id={a.id} size={64} className="pick__face" />
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
