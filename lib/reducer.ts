import type { Action, GameState, Stats } from './types.ts';
import { PLOT_COUNT, ROUNDS, scenarioFor } from './scenarios.ts';

export const STAT_MIN = 0;
export const STAT_MAX = 100;

export const INITIAL_STATS: Stats = {
  economy: 50,
  environment: 50,
  satisfaction: 50,
  energy: 50,
};

export const initialState: GameState = {
  leader: null,
  round: 1,
  stats: INITIAL_STATS,
  choices: [],
  plots: Array<null>(PLOT_COUNT).fill(null),
  muted: false,
  review: null,
};

const clamp = (n: number) => Math.min(STAT_MAX, Math.max(STAT_MIN, n));

export function applyEffects(stats: Stats, effects: Partial<Stats>): Stats {
  return {
    economy: clamp(stats.economy + (effects.economy ?? 0)),
    environment: clamp(stats.environment + (effects.environment ?? 0)),
    satisfaction: clamp(stats.satisfaction + (effects.satisfaction ?? 0)),
    energy: clamp(stats.energy + (effects.energy ?? 0)),
  };
}

export const isFinished = (state: GameState) => state.round > ROUNDS;

/**
 * Pemeriksa bentuk untuk state yang dibaca kembali dari sessionStorage.
 * Isinya datang dari luar program, jadi tidak pernah dipercaya begitu saja:
 * satu entri cacat membuat seluruh pemulihan dibatalkan.
 */
export function isGameState(v: unknown): v is GameState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;

  const stats = s.stats as Record<string, unknown> | undefined;
  const statsOk =
    typeof stats === 'object' &&
    stats !== null &&
    (['economy', 'environment', 'satisfaction', 'energy'] as const).every(
      (k) => typeof stats[k] === 'number' && stats[k] >= STAT_MIN && stats[k] <= STAT_MAX,
    );

  const leaderOk =
    s.leader === null ||
    (typeof s.leader === 'object' &&
      s.leader !== null &&
      typeof (s.leader as Record<string, unknown>).name === 'string');

  return (
    statsOk &&
    leaderOk &&
    typeof s.round === 'number' &&
    s.round >= 1 &&
    s.round <= ROUNDS + 1 &&
    Array.isArray(s.plots) &&
    s.plots.length === PLOT_COUNT &&
    Array.isArray(s.choices) &&
    typeof s.muted === 'boolean'
  );
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'start':
      return { ...initialState, muted: state.muted, leader: action.leader };

    case 'choose': {
      const scenario = scenarioFor(state.round);
      // Ronde habis, atau nama pemimpin belum diisi: abaikan.
      if (!scenario || !state.leader) return state;

      const option = scenario.options.find((o) => o.id === action.option);
      if (!option) return state;

      const plots = [...state.plots];
      plots[scenario.plot] = option.asset;

      return {
        ...state,
        round: state.round + 1,
        stats: applyEffects(state.stats, option.effects),
        choices: [
          ...state.choices,
          { round: scenario.round, option: option.id, label: option.label },
        ],
        plots,
      };
    }

    case 'review':
      return { ...state, review: action.review };

    case 'mute':
      return { ...state, muted: action.muted };

    case 'restore':
      return action.state;

    case 'reset':
      return { ...initialState, muted: state.muted };
  }
}
