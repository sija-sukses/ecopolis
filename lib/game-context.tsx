'use client';

import { createContext, useContext, useEffect, useReducer, useState } from 'react';

import { initialState, isGameState, reducer } from './reducer.ts';
import type { Action, GameState } from './types.ts';

/**
 * Satu Context berisi satu useReducer. Tidak ada state manager eksternal:
 * state ini dangkal dan hanya punya enam aksi.
 *
 * State ditulis ke sessionStorage tiap kali berubah, karena Context mati saat
 * navigasi penuh dan saat halaman dimuat ulang. Tanpa ini, /results akan kosong
 * begitu juri menekan refresh.
 */

const KEY = 'ecopolis:game';
const COUNTER_KEY = 'ecopolis:selesai';

type Store = {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  /** false sampai sessionStorage selesai dibaca; mencegah kedipan isi lama. */
  ready: boolean;
};

const Ctx = createContext<Store | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isGameState(parsed)) dispatch({ type: 'restore', state: parsed });
      }
    } catch {
      // Jendela penyamaran, penyimpanan diblokir, atau isinya rusak: mulai baru.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Penyimpanan penuh atau diblokir. Permainan tetap jalan di memori.
    }
  }, [state, ready]);

  return <Ctx.Provider value={{ state, dispatch, ready }}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useGame dipakai di luar GameProvider');
  return store;
}

/** Penghitung sesi yang selesai, sesuai rencana analitik di PRD. */
export function countFinishedSession(): void {
  try {
    const n = Number(localStorage.getItem(COUNTER_KEY) ?? '0');
    localStorage.setItem(COUNTER_KEY, String((Number.isFinite(n) ? n : 0) + 1));
  } catch {
    // Tidak penting kalau gagal.
  }
}
