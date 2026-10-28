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

    case 'reset':
      return { ...initialState, muted: state.muted };
  }
}
