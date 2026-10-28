import type { AvatarId } from './avatars.ts';

export type StatKey = 'economy' | 'environment' | 'satisfaction' | 'energy';

export type Stats = Record<StatKey, number>;

/** Setiap aset punya satu komponen SVG di components/assets. */
export type AssetId =
  | 'pltu'
  | 'plts'
  | 'tol'
  | 'brt'
  | 'industri'
  | 'hutan'
  | 'tpa'
  | 'daurulang'
  | 'perumahan'
  | 'apartemen';

export type OptionId = 'a' | 'b';

export type Option = {
  id: OptionId;
  label: string;
  blurb: string;
  /** Delta per statistik. Kunci yang tidak disebut berarti 0. */
  effects: Partial<Stats>;
  asset: AssetId;
};

export type Scenario = {
  round: number;
  /** Indeks plot di peta, 0..4. */
  plot: number;
  title: string;
  context: string;
  options: [Option, Option];
};

export type Leader = {
  name: string;
  avatar: AvatarId;
};

export type Choice = {
  round: number;
  option: OptionId;
  label: string;
};

export type Review = {
  title: string;
  narrative: string;
  sdgReflection: string;
  /** true → tampilkan badge "Laporan Hasil Evaluasi Standar". */
  fallback: boolean;
};

export type GameState = {
  leader: Leader | null;
  /** 1..5 saat bermain; ROUNDS + 1 berarti selesai. */
  round: number;
  stats: Stats;
  choices: Choice[];
  plots: (AssetId | null)[];
  muted: boolean;
  review: Review | null;
};

export type Action =
  | { type: 'start'; leader: Leader }
  | { type: 'choose'; option: OptionId }
  | { type: 'review'; review: Review }
  | { type: 'mute'; muted: boolean }
  | { type: 'restore'; state: GameState }
  | { type: 'reset' };

export type ReviewPayload = {
  leader: Leader;
  stats: Stats;
  choices: Choice[];
};
