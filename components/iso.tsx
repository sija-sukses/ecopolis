import { avatarOf } from '@/lib/avatars.ts';
import {
  CEREMONY_ANCHOR,
  getPollutionLevel,
  getRiverPalette,
  getWaterTurbidity,
  sampleTolFlyoverSpine,
  type PollutionLevel,
} from '@/lib/city-effects.ts';
import type { AssetId } from '@/lib/types.ts';

/**
 * Sistem isometrik kota Ecopolis yang luas dan terintegrasi.
 *
 * Satu ubin = 128 x 64 (rasio 2:1). Pulau dirancang membentang luas dengan
 * Balai Kota (City Hall) dan model 3D Walikota di jantung kota, dikelilingi
 * 5 kawasan organik (tanpa kotak petak kaku) yang langsung memunculkan efek
 * nyata di seluruh penjuru kota sesuai keputusan kebijakan pemain.
 */

export const TILE_W = 128;
export const TILE_H = 64;

/**
 * Koordinat pusat 5 kawasan pembangunan di sekeliling Balai Kota (0.95, 1.75),
 * diurutkan dari belakang ke depan (menurut u + v) agar urutan tumpukan
 * (painter's algorithm) selalu akurat dan tidak ada elemen yang bertabrakan:
 * - Kawasan 0 (Energi): Punggung barat-laut (-0.75, -0.15)
 * - Kawasan 1 (Transportasi): Koridor sabuk barat kota (-1.15, 2.25)
 * - Kawasan 2 (Lahan Utara): Lembah timur-laut di kaki ngarai (3.65, 0.35)
 * - Kawasan 3 (Sampah): Lembah hilir tepi sungai selatan (0.55, 3.85)
 * - Kawasan 4 (Hunian): Semenanjung pesisir tenggara (3.65, 3.25)
 */
export const PLOT_TILES: [number, number][] = [
  [-0.75, -0.15],
  [-1.15, 2.25],
  [3.65, 0.35],
  [0.55, 3.85],
  [3.65, 3.25],
];

/** Proyeksi koordinat ubin ke koordinat layar. */
export function iso(tx: number, ty: number): [number, number] {
  return [(tx - ty) * (TILE_W / 2), (tx + ty) * (TILE_H / 2)];
}

export const PLOT_POS = PLOT_TILES.map(([x, y]) => iso(x, y));

const HW = TILE_W / 2;
const HH = TILE_H / 2;

/** Titik layar isometrik `x,y` untuk koordinat ubin `(u, v)` dengan tinggi `lift`. */
function pt(u: number, v: number, lift = 0) {
  return `${(u - v) * HW},${(u + v) * HH - lift}`;
}

function ptXY(u: number, v: number, lift = 0): [number, number] {
  return [(u - v) * HW, (u + v) * HH - lift];
}

function streamPath(coords: [number, number, number?][]) {
  return coords
    .map(([u, v, l = -4.6], i) => {
      const [x, y] = ptXY(u, v, l);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Belah ketupat alas satu ubin, diperkecil oleh `inset`. */
function diamond(inset = 0, lift = 0) {
  const w = HW - inset;
  const h = HH - inset / 2;
  return `${0},${-h - lift} ${w},${-lift} ${0},${h - lift} ${-w},${-lift}`;
}

type BoxProps = {
  h: number;
  inset?: number;
  lift?: number;
  top: string;
  left: string;
  right: string;
};

/** Satu kotak isometrik: tutup, sisi kiri, sisi kanan. Tanpa garis tepi. */
function Box({ h, inset = 0, lift = 0, top, left, right }: BoxProps) {
  const w = HW - inset;
  const d = HH - inset / 2;
  const y = -lift;
  return (
    <g>
      <polygon points={`${-w},${y} ${0},${y + d} ${0},${y + d - h} ${-w},${y - h}`} fill={left} />
      <polygon points={`${w},${y} ${0},${y + d} ${0},${y + d - h} ${w},${y - h}`} fill={right} />
      <polygon points={diamond(inset, lift + h)} fill={top} />
    </g>
  );
}

type SlabProps = {
  u1: number;
  v1: number;
  u2: number;
  v2: number;
  h: number;
  lift?: number;
  top: string;
  left: string;
  right: string;
};

/** Balok isometrik bebas pada rentang ubin `[u1, u2] x [v1, v2]`. */
function IsoSlab({ u1, v1, u2, v2, h, lift = 0, top, left, right }: SlabProps) {
  const topLift = lift + h;
  return (
    <g>
      {h > 0 && (
        <>
          <polygon
            points={`${pt(u1, v2, lift)} ${pt(u2, v2, lift)} ${pt(u2, v2, topLift)} ${pt(u1, v2, topLift)}`}
            fill={left}
          />
          <polygon
            points={`${pt(u2, v2, lift)} ${pt(u2, v1, lift)} ${pt(u2, v1, topLift)} ${pt(u2, v2, topLift)}`}
            fill={right}
          />
        </>
      )}
      <polygon
        points={`${pt(u1, v1, topLift)} ${pt(u2, v1, topLift)} ${pt(u2, v2, topLift)} ${pt(u1, v2, topLift)}`}
        fill={top}
      />
    </g>
  );
}

const C = {
  grassTop: 'var(--grass-top)',
  grassL: 'var(--grass-left)',
  grassR: 'var(--grass-right)',
  mintTop: 'var(--mint-top)',
  mintL: 'var(--mint-left)',
  mintR: 'var(--mint-right)',
  meadowTop: 'var(--meadow-top)',
  stoneTop: 'var(--stone-top)',
  stoneL: 'var(--stone-left)',
  stoneR: 'var(--stone-right)',
  warmTop: 'var(--warm-top)',
  warmL: 'var(--warm-left)',
  warmR: 'var(--warm-right)',
  canyonTop: 'var(--canyon-top)',
  canyonL: 'var(--canyon-left)',
  canyonR: 'var(--canyon-right)',
  terraTop: 'var(--terracotta-top)',
  terraL: 'var(--terracotta-left)',
  terraR: 'var(--terracotta-right)',
  leafTop: 'var(--leaf-top)',
  leafL: 'var(--leaf-left)',
  leafR: 'var(--leaf-right)',
  pineTop: 'var(--pine-top)',
  pineL: 'var(--pine-left)',
  pineR: 'var(--pine-right)',
  trunkL: 'var(--trunk-left)',
  trunkR: 'var(--trunk-right)',
  smoke: 'var(--smoke)',
  isleTop: 'var(--isle-top)',
  soilLeft: 'var(--isle-left)',
  soilRight: 'var(--isle-right)',
  foam: 'var(--isle-foam)',
  waterAura: 'var(--water-aura)',
  riverTop: 'var(--river-top)',
  riverMid: 'var(--river-mid)',
  riverDeep: 'var(--river-deep)',
  pathTop: 'var(--path-top)',
  pathEdge: 'var(--path-edge)',
  pathNode: 'var(--path-node)',
  solar: 'var(--solar)',
  solarDark: 'var(--solar-dark)',
  solarLine: 'var(--solar-line)',
  brickTop: 'var(--brick-top)',
  brickLeft: 'var(--brick-left)',
  brickRight: 'var(--brick-right)',
  coal: 'var(--coal)',
  coalLight: 'var(--coal-light)',
  steelTop: 'var(--steel-top)',
  steelL: 'var(--steel-left)',
  steelR: 'var(--steel-right)',
  asphalt: 'var(--asphalt)',
  asphaltLine: 'var(--asphalt-line)',
  bus: 'var(--bus)',
  busDark: 'var(--bus-dark)',
  pond: 'var(--pond)',
  glass: 'var(--glass)',
  sun: 'var(--sun)',
  ink: 'var(--ink)',
};

/**
 * Kawasan terintegrasi langsung dengan permukaan tanah pulau (lift = 0),
 * tanpa kotak fondasi kaku. Saat belum terbangun, hanya menampilkan hamparan
 * rumput alami yang lembut.
 */
export const PAD_H = 0;
export { BUILDING_LIFT, BUILDING_SCALE } from '@/lib/city-effects.ts';

export function PlotPad({ built = false }: { built?: boolean }) {
  if (built) return null;
  return (
    <g>
      {/* Bingkai petak konstruksi modular yang jelas dan rapi di atas dataran rumput */}
      <polygon points={diamond(10, 0.4)} fill="#b8eea4" opacity="0.88" />
      <polygon points={diamond(15, 0.7)} fill="#8cd668" opacity="0.92" />
      <polygon points={diamond(22, 1.0)} fill="#9be28b" opacity="0.95" />
      {/* Penanda sudut petak modular (corner markers) berwarna krem pasir */}
      <polygon points="0,-25 7,-21.5 4.5,-20.2 0,-22.5 -4.5,-20.2 -7,-21.5" fill={C.pathTop} />
      <polygon points="0,25 7,21.5 4.5,20.2 0,22.5 -4.5,20.2 -7,21.5" fill={C.pathTop} />
      <polygon points="-50,0 -43,-3.5 -40.5,-2.2 -45,0 -40.5,2.2 -43,3.5" fill={C.pathTop} />
      <polygon points="50,0 43,-3.5 40.5,-2.2 45,0 40.5,2.2 43,3.5" fill={C.pathTop} />
    </g>
  );
}

function at(u: number, v: number, lift = 0) {
  return `translate(${(u - v) * HW} ${(u + v) * HH - lift})`;
}

/** Pohon pinus low-poly minimalis dengan tiga faset pencahayaan datar. */
function PineTree({
  u,
  v,
  lift = 0,
  scale = 1,
  tone = 'pine',
}: {
  u: number;
  v: number;
  lift?: number;
  scale?: number;
  tone?: 'pine' | 'leaf';
}) {
  const top = tone === 'pine' ? C.pineTop : C.leafTop;
  const left = tone === 'pine' ? C.pineL : C.leafL;
  const right = tone === 'pine' ? C.pineR : C.leafR;
  return (
    <g transform={`${at(u, v, lift)} scale(${scale})`}>
      <polygon points="0,-5 12,0 0,5 -12,0" fill={C.mintR} opacity="0.75" />
      <polygon points="-3,0 0,2 0,-9 -3,-11" fill={C.trunkL} />
      <polygon points="3,0 0,2 0,-9 3,-11" fill={C.trunkR} />
      <polygon points="0,-28 -14,-8 0,-2" fill={left} />
      <polygon points="0,-28 14,-8 0,-2" fill={right} />
      <polygon points="0,-28 -14,-8 0,-13 14,-8" fill={top} />
      <polygon points="0,-40 -11,-19 0,-14" fill={left} />
      <polygon points="0,-40 11,-19 0,-14" fill={right} />
      <polygon points="0,-40 -11,-19 0,-23 11,-19" fill={top} />
      <polygon points="0,-50 -8,-31 0,-27" fill={left} />
      <polygon points="0,-50 8,-31 0,-27" fill={right} />
      <polygon points="0,-50 -8,-31 0,-34 8,-31" fill={top} />
    </g>
  );
}

/** Pohon rindang bulat untuk taman kota dan boulevard. */
function RoundTree({
  u,
  v,
  lift = 0,
  scale = 0.75,
}: {
  u: number;
  v: number;
  lift?: number;
  scale?: number;
}) {
  return (
    <g transform={`${at(u, v, lift)} scale(${scale})`}>
      <polygon points="0,-4 10,0 0,4 -10,0" fill={C.mintR} opacity="0.75" />
      <rect x="-3.5" y="-13" width="7" height="15" rx="2.5" fill={C.warmR} />
      <circle cx="0" cy="-26" r="15" fill={C.leafTop} />
      <circle cx="-9" cy="-18" r="10.5" fill={C.leafL} />
      <circle cx="10" cy="-19" r="10" fill={C.leafR} />
    </g>
  );
}

/** Pohon kanopi kubus 3D isometrik bergaya clay diorama sesuai referensi. */
function BlockTree({
  u,
  v,
  lift = 0,
  scale = 0.85,
  tone = 'bright',
}: {
  u: number;
  v: number;
  lift?: number;
  scale?: number;
  tone?: 'bright' | 'deep';
}) {
  const top = tone === 'bright' ? '#8ce868' : '#58c474';
  const left = tone === 'bright' ? '#62bd44' : '#3ca158';
  const right = tone === 'bright' ? '#49992e' : '#2b8042';
  return (
    <g transform={`${at(u, v, lift)} scale(${scale})`}>
      <polygon points="0,-5 12,0 0,5 -12,0" fill={C.mintR} opacity="0.75" />
      <Box h={11} inset={58} lift={0} top={C.trunkL} left={C.trunkL} right={C.trunkR} />
      <Box h={15} inset={46} lift={10} top={top} left={left} right={right} />
      <Box h={7} inset={52} lift={25} top={top} left={left} right={right} />
    </g>
  );
}

/** Bongkahan batu karang/ngarai low-poly tanpa garis tepi. */
function RockCrop({
  u,
  v,
  lift = 0,
  w = 0.28,
  d = 0.28,
  h = 14,
  tone = 'terra',
}: {
  u: number;
  v: number;
  lift?: number;
  w?: number;
  d?: number;
  h?: number;
  tone?: 'terra' | 'canyon' | 'stone' | 'amber' | 'sand';
}) {
  const top =
    tone === 'terra'
      ? '#e36d3e'
      : tone === 'canyon'
        ? '#f59c45'
        : tone === 'amber'
          ? '#f7b84b'
          : tone === 'sand'
            ? '#dcd3a2'
            : C.stoneTop;
  const left =
    tone === 'terra'
      ? '#c75428'
      : tone === 'canyon'
        ? '#de7c26'
        : tone === 'amber'
          ? '#df982b'
          : tone === 'sand'
            ? '#c4ba86'
            : C.stoneL;
  const right =
    tone === 'terra'
      ? '#a33e18'
      : tone === 'canyon'
        ? '#bd6014'
        : tone === 'amber'
          ? '#bf7a17'
          : tone === 'sand'
            ? '#aba06d'
            : C.stoneR;
  return (
    <IsoSlab
      u1={u - w / 2}
      v1={v - d / 2}
      u2={u + w / 2}
      v2={v + d / 2}
      h={h}
      lift={lift}
      top={top}
      left={left}
      right={right}
    />
  );
}

type WorkerAction = 'dig' | 'wipe' | 'patrol' | 'patrol-v' | 'lift' | 'wave' | 'water' | 'bob';
type WorkerTool =
  | 'shovel'
  | 'wiper'
  | 'wrench'
  | 'box'
  | 'watering'
  | 'flag'
  | 'clipboard'
  | 'rake'
  | 'placard'
  | 'none';
type WorkerHat =
  | 'helmet-yellow'
  | 'helmet-white'
  | 'cap-blue'
  | 'cap-green'
  | 'straw'
  | 'hair-dark';

const SHIRT_PALETTE: Record<string, { top: string; left: string; right: string; stripe?: boolean }> = {
  orange: { top: '#ff855e', left: '#ff6b3d', right: '#d9532a', stripe: true },
  yellow: { top: '#ffe180', left: '#ffd45e', right: '#e0b236', stripe: true },
  green: { top: '#68c982', left: '#4fb06a', right: '#3c9455' },
  blue: { top: '#528be3', left: '#2f6fd0', right: '#1f4f9e' },
  cyan: { top: '#8ed3f8', left: '#5bb4e5', right: '#3d92c4', stripe: true },
  white: { top: '#ffffff', left: '#eef1fb', right: '#cfd6ec' },
  warm: { top: '#f7c086', left: '#f5b06a', right: '#d98c45' },
  coal: { top: '#4f5573', left: '#3d4259', right: '#2b2f45' },
  red: { top: '#f05656', left: '#d93838', right: '#b52626' },
};

/**
 * Model manusia 3D low-poly isometrik berukuran miniatur yang sedang bekerja
 * atau beraktivitas sesuai kawasan di peta.
 */
function IsoWorker({
  u,
  v,
  lift = 14,
  shirt = 'orange',
  hat = 'helmet-yellow',
  tool = 'none',
  action = 'bob',
  scale = 1.05,
  delay = 0,
  flip = false,
}: {
  u: number;
  v: number;
  lift?: number;
  shirt?: keyof typeof SHIRT_PALETTE;
  hat?: WorkerHat;
  tool?: WorkerTool;
  action?: WorkerAction;
  scale?: number;
  delay?: number;
  flip?: boolean;
}) {
  const s = SHIRT_PALETTE[shirt] ?? SHIRT_PALETTE.orange;
  const mirror = flip ? ' scale(-1, 1)' : '';

  return (
    <g transform={`${at(u, v, lift)} scale(${scale})${mirror}`}>
      <g
        className={`worker worker--${action}`}
        style={delay ? { animationDelay: `${delay}s` } : undefined}
      >
        <polygon points="0,-2.4 5.2,0 0,2.4 -5.2,0" fill="rgba(22, 25, 58, 0.24)" />

        <g className="worker__body">
          {/* Kaki kiri & kanan (balok 3D isometrik) */}
          <polygon points="-2.6,0 -0.3,1.2 -0.3,-3.6 -2.6,-4.8" fill="#242a52" />
          <polygon points="-0.3,1.2 0.5,0.8 0.5,-4.0 -0.3,-3.6" fill="#16193a" />
          <polygon points="0.3,0.9 2.6,-0.3 2.6,-5.0 0.3,-3.8" fill="#242a52" />
          <polygon points="-0.4,0.5 0.3,0.9 0.3,-3.8 -0.4,-4.2" fill="#16193a" />

          {/* Badan / Torso kubus 3D isometrik */}
          <polygon points="-3.4,-4.4 0,-2.6 0,-8.8 -3.4,-10.6" fill={s.left} />
          <polygon points="3.4,-4.4 0,-2.6 0,-8.8 3.4,-10.6" fill={s.right} />
          <polygon points="0,-12.3 3.4,-10.6 0,-8.8 -3.4,-10.6" fill={s.top} />

          {s.stripe && (
            <>
              <polygon points="-3.4,-6.1 0,-4.3 0,-5.3 -3.4,-7.1" fill="#eef1fb" />
              <polygon points="3.4,-6.1 0,-4.3 0,-5.3 3.4,-7.1" fill="#cfd6ec" />
            </>
          )}

          {/* Kepala kubus 3D low-poly */}
          <polygon points="-2.5,-10.1 0,-8.8 0,-12.9 -2.5,-14.2" fill="#ebae82" />
          <polygon points="2.5,-10.1 0,-8.8 0,-12.9 2.5,-14.2" fill="#d4956a" />
          <polygon points="0,-15.5 2.5,-14.2 0,-12.9 -2.5,-14.2" fill="#f7c59f" />

          {hat === 'helmet-yellow' && (
            <g>
              <polygon points="0,-14.4 3.5,-12.7 0,-11.2 -3.5,-12.7" fill="#e0b236" />
              <polygon points="-2.8,-13.4 0,-12.1 0,-15.1 -2.8,-16.4" fill="#ffd45e" />
              <polygon points="2.8,-13.4 0,-12.1 0,-15.1 2.8,-16.4" fill="#e0b236" />
              <polygon points="0,-17.7 2.8,-16.4 0,-15.1 -2.8,-16.4" fill="#ffe896" />
            </g>
          )}
          {hat === 'helmet-white' && (
            <g>
              <polygon points="0,-14.4 3.5,-12.7 0,-11.2 -3.5,-12.7" fill="#cfd6ec" />
              <polygon points="-2.8,-13.4 0,-12.1 0,-15.1 -2.8,-16.4" fill="#eef1fb" />
              <polygon points="2.8,-13.4 0,-12.1 0,-15.1 2.8,-16.4" fill="#cfd6ec" />
              <polygon points="0,-17.7 2.8,-16.4 0,-15.1 -2.8,-16.4" fill="#ffffff" />
            </g>
          )}
          {hat === 'cap-blue' && (
            <g>
              <polygon points="-1.2,-13.2 3.8,-11.8 1.4,-10.9 -2.8,-12.6" fill="#1f4f9e" />
              <polygon points="-2.6,-13.4 0,-12.1 0,-14.9 -2.6,-16.2" fill="#2f6fd0" />
              <polygon points="2.6,-13.4 0,-12.1 0,-14.9 2.6,-16.2" fill="#1f4f9e" />
              <polygon points="0,-17.4 2.6,-16.2 0,-14.9 -2.6,-16.2" fill="#528be3" />
            </g>
          )}
          {hat === 'cap-green' && (
            <g>
              <polygon points="-1.2,-13.2 3.8,-11.8 1.4,-10.9 -2.8,-12.6" fill="#2f7d45" />
              <polygon points="-2.6,-13.4 0,-12.1 0,-14.9 -2.6,-16.2" fill="#4fb06a" />
              <polygon points="2.6,-13.4 0,-12.1 0,-14.9 2.6,-16.2" fill="#3c9455" />
              <polygon points="0,-17.4 2.6,-16.2 0,-14.9 -2.6,-16.2" fill="#68c982" />
            </g>
          )}
          {hat === 'straw' && (
            <g>
              <polygon points="0,-15.8 4.6,-13.5 0,-11.2 -4.6,-13.5" fill="#e08f45" />
              <polygon points="0,-16.2 4.3,-13.8 0,-11.5 -4.3,-13.8" fill="#f5b06a" />
              <polygon points="-2.3,-13.8 0,-12.6 0,-15.2 -2.3,-16.4" fill="#f2cf92" />
              <polygon points="2.3,-13.8 0,-12.6 0,-15.2 2.3,-16.4" fill="#ddb16e" />
              <polygon points="0,-17.5 2.3,-16.4 0,-15.2 -2.3,-16.4" fill="#fff3d6" />
            </g>
          )}
          {hat === 'hair-dark' && (
            <g>
              <polygon points="-2.6,-13.3 0,-12.0 0,-14.8 -2.6,-16.1" fill="#242a52" />
              <polygon points="2.6,-13.3 0,-12.0 0,-14.8 2.6,-16.1" fill="#16193a" />
              <polygon points="0,-17.3 2.6,-16.1 0,-14.8 -2.6,-16.1" fill="#2b3260" />
            </g>
          )}

          {/* Lengan dan peralatan kerja 3D */}
          <g className="worker__arm">
            <polygon points="1.8,-8.8 5.2,-6.4 4.4,-5.2 1.2,-7.4" fill={s.right} />
            <circle cx="4.8" cy="-5.8" r="1.1" fill="#ebae82" />

            {tool === 'shovel' && (
              <g>
                <line x1="2.2" y1="-8.2" x2="8.2" y2="-1.5" stroke="#8a5a3c" strokeWidth="1.3" strokeLinecap="round" />
                <polygon points="7.4,-2.4 10.6,-0.8 8.8,1.2 6.2,-0.6" fill="#777c97" />
                <polygon points="8.4,-1.4 10.4,-0.4 9.2,0.8 7.4,-0.2" fill="#2b2f45" />
              </g>
            )}

            {tool === 'rake' && (
              <g>
                <line x1="2.0" y1="-8.5" x2="8.8" y2="-1.2" stroke="#8a5a3c" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="7.2" y1="-0.4" x2="10.2" y2="-2.0" stroke="#777c97" strokeWidth="1.4" />
              </g>
            )}

            {tool === 'wiper' && (
              <g>
                <line x1="2.4" y1="-8.4" x2="9.6" y2="-1.8" stroke="#cfd6ec" strokeWidth="1.2" strokeLinecap="round" />
                <polygon points="8.0,-3.2 11.6,-1.2 10.6,0.2 7.0,-1.8" fill="#2f6fd0" />
              </g>
            )}

            {tool === 'wrench' && (
              <g>
                <line x1="4.4" y1="-6.0" x2="8.4" y2="-8.2" stroke="#aeb4c9" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8.8" cy="-8.5" r="1.5" fill="#777c97" />
                <circle className="worker__spark" cx="9.6" cy="-9.4" r="1.6" fill="#ffd45e" />
              </g>
            )}

            {tool === 'box' && (
              <g transform="translate(4.8 -4.8)">
                <polygon points="-2.8,-1.4 0,0 0,-3.4 -2.8,-4.8" fill="#e08f45" />
                <polygon points="2.8,-1.4 0,0 0,-3.4 2.8,-4.8" fill="#c9783a" />
                <polygon points="0,-6.2 2.8,-4.8 0,-3.4 -2.8,-4.8" fill="#f5b06a" />
              </g>
            )}

            {tool === 'watering' && (
              <g transform="translate(5.2 -5.0)">
                <polygon points="-2.2,-0.8 0,0.4 0,-2.6 -2.2,-3.8" fill="#3c9455" />
                <polygon points="2.2,-0.8 0,0.4 0,-2.6 2.2,-3.8" fill="#2f7d45" />
                <polygon points="0,-5.0 2.2,-3.8 0,-2.6 -2.2,-3.8" fill="#4fb06a" />
                <line x1="1.8" y1="-2.2" x2="4.4" y2="-3.6" stroke="#4fb06a" strokeWidth="1.2" />
                <g className="worker__drops">
                  <circle cx="5.2" cy="-2.2" r="0.85" fill="#8ec8f6" />
                  <circle cx="6.2" cy="-0.6" r="0.75" fill="#ffffff" />
                  <circle cx="4.6" cy="-0.2" r="0.75" fill="#8ec8f6" />
                </g>
              </g>
            )}

            {tool === 'flag' && (
              <g>
                <line x1="4.6" y1="-5.6" x2="4.6" y2="-15.8" stroke="#eef1fb" strokeWidth="1.2" />
                <polygon points="4.6,-15.8 10.2,-13.6 4.6,-11.4" fill="#ff6b3d" />
              </g>
            )}

            {tool === 'placard' && (
              <g>
                <line x1="4.4" y1="-5.4" x2="4.4" y2="-19.5" stroke="#8a5a3c" strokeWidth="1.3" />
                <polygon points="-1.5,-18.5 10.5,-16.5 10.5,-23.5 -1.5,-25.5" fill="#ffffff" stroke="#d93838" strokeWidth="0.9" />
                <line x1="0.5" y1="-22.2" x2="8.5" y2="-20.8" stroke="#d93838" strokeWidth="1.4" />
                <line x1="1.2" y1="-19.8" x2="7.5" y2="-18.8" stroke="#16193a" strokeWidth="1.1" />
              </g>
            )}

            {tool === 'clipboard' && (
              <g transform="translate(4.8 -6.4)">
                <polygon points="-1.6,0 1.8,-1.6 1.8,-5.2 -1.6,-3.6" fill="#ffffff" />
                <polygon points="-1.0,-1.2 1.2,-2.2 1.2,-4.2 -1.0,-3.2" fill="#8ec8f6" />
              </g>
            )}
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * Model 3D Walikota sesuai karakter avatar yang dipilih pemain:
 * - rian: Jas gelap + dasi hijau, rambut pirang di sisi, topi biru menghadap depan
 * - bima: Jaket hijau, janggut coklat tebal, topi snapback oranye-putih
 * - deni: Jas biru langit, kacamata hitam berlensa sian, rambut gimbal/topknot hitam
 * - lia: Blazer merah marun, rambut bob pirang mengapit wajah, kacamata biru
 * - maya: Baju hijau zamrud, rambut hitam bergelombang, kupluk (beanie) biru & anting sian
 * - siti: Tunik hijau zamrud, hijab merah muda (pink)
 */
function MayorModel({
  avatar,
  u,
  v,
  lift = 4,
  protesting = false,
}: {
  avatar: string;
  u: number;
  v: number;
  lift?: number;
  protesting?: boolean;
}) {
  const info = avatarOf(avatar);
  const id = info.id;

  const skin =
    id === 'deni'
      ? { top: '#a65e38', left: '#8c4a27', right: '#70381b' }
      : id === 'bima' || id === 'maya'
        ? { top: '#ebaa68', left: '#df944d', right: '#c47b35' }
        : { top: '#f9d2b2', left: '#ebae82', right: '#d4956a' };

  const suit =
    id === 'rian'
      ? { top: '#2b3252', left: '#1f243d', right: '#16193a' }
      : id === 'deni'
        ? { top: '#389ee0', left: '#2088c9', right: '#17699e' }
        : id === 'lia'
          ? { top: '#d43559', left: '#b82547', right: '#941b37' }
          : { top: '#2ea368', left: '#238755', right: '#1a6b42' };

  return (
    <g transform={`${at(u, v, lift)} scale(1.42)`}>
      {/* Podium karpet kehormatan Walikota */}
      <polygon points="0,-3.8 8.2,0 0,3.8 -8.2,0" fill="#b52626" />
      <polygon points="0,-3.0 6.8,0 0,3.0 -6.8,0" fill="#ffd45e" opacity="0.45" />

      <g className={protesting ? 'worker worker--wave' : 'worker worker--bob'}>
        <g className="worker__body">
          {/* Kaki celana formal Walikota */}
          <polygon points="-2.7,0 -0.3,1.2 -0.3,-3.8 -2.7,-5.0" fill="#16193a" />
          <polygon points="0.3,1.0 2.7,-0.2 2.7,-5.0 0.3,-3.8" fill="#242a52" />

          {/* Jas / Busana Walikota */}
          <polygon points="-3.6,-4.4 0,-2.5 0,-9.2 -3.6,-11.0" fill={suit.left} />
          <polygon points="3.6,-4.4 0,-2.5 0,-9.2 3.6,-11.0" fill={suit.right} />
          <polygon points="0,-12.8 3.6,-11.0 0,-9.2 -3.6,-11.0" fill={suit.top} />

          {/* Dasi hijau Rian & lencana emas Walikota */}
          {id === 'rian' && (
            <polygon points="-0.6,-8.6 0.6,-8.6 0.8,-4.5 0,-3.8 -0.8,-4.5" fill="#4fb06a" />
          )}
          <circle cx="-1.6" cy="-7.2" r="0.95" fill="#ffd45e" />

          {/* Kepala 3D Walikota */}
          <polygon points="-2.6,-10.2 0,-8.8 0,-13.2 -2.6,-14.6" fill={skin.left} />
          <polygon points="2.6,-10.2 0,-8.8 0,-13.2 2.6,-14.6" fill={skin.right} />
          <polygon points="0,-16.0 2.6,-14.6 0,-13.2 -2.6,-14.6" fill={skin.top} />

          {/* Mata piksel tegas menghadap warga */}
          <rect x="-1.8" y="-12.2" width="0.8" height="1.2" fill="#16193a" />
          <rect x="0.8" y="-12.2" width="0.8" height="1.2" fill="#16193a" />

          {/* Ciri khas masing-masing karakter dari gambar avatar */}
          {id === 'rian' && (
            <g>
              {/* Jambul rambut pirang & topi biru Rian */}
              <polygon points="-2.9,-12.2 -1.6,-11.5 -1.6,-13.8 -2.9,-14.4" fill="#ffd45e" />
              <polygon points="-1.4,-13.4 4.4,-11.8 1.8,-10.7 -3.0,-12.7" fill="#1f4f9e" />
              <polygon points="-2.8,-13.6 0,-12.2 0,-15.2 -2.8,-16.6" fill="#2f6fd0" />
              <polygon points="2.8,-13.6 0,-12.2 0,-15.2 2.8,-16.6" fill="#1f4f9e" />
              <polygon points="0,-17.9 2.8,-16.6 0,-15.2 -2.8,-16.6" fill="#528be3" />
            </g>
          )}

          {id === 'bima' && (
            <g>
              {/* Janggut coklat penuh & snapback oranye-putih Bima */}
              <polygon points="-2.7,-9.8 0,-8.4 2.7,-9.8 2.7,-11.4 0,-10.1 -2.7,-11.4" fill="#6e3b1e" />
              <rect x="-0.8" y="-10.3" width="1.6" height="0.7" fill="#ebaa68" />
              <polygon points="-2.8,-13.2 0,-11.9 2.8,-13.2 2.8,-14.4 0,-13.1 -2.8,-14.4" fill="#eef1fb" />
              <polygon points="-2.8,-14.3 0,-13.0 0,-15.5 -2.8,-16.8" fill="#d97724" />
              <polygon points="2.8,-14.3 0,-13.0 0,-15.5 2.8,-16.8" fill="#b85d14" />
              <polygon points="0,-18.0 2.8,-16.8 0,-15.5 -2.8,-16.8" fill="#f59338" />
            </g>
          )}

          {id === 'deni' && (
            <g>
              {/* Kacamata hitam berlensa sian & rambut gimbal atas Deni */}
              <rect x="-2.8" y="-12.7" width="5.6" height="1.6" fill="#16193a" />
              <rect x="-2.1" y="-12.4" width="1.6" height="1.0" fill="#38bdf8" />
              <rect x="0.5" y="-12.4" width="1.6" height="1.0" fill="#38bdf8" />
              <polygon points="-2.7,-13.6 0,-12.3 2.7,-13.6 0,-15.0" fill="#16193a" />
              <polygon points="-1.8,-14.8 0,-13.8 1.8,-14.8 1.8,-17.4 0,-18.4 -1.8,-17.4" fill="#16193a" />
            </g>
          )}

          {id === 'lia' && (
            <g>
              {/* Rambut bob pirang mengapit pipi & kacamata sian Lia */}
              <polygon points="-3.3,-9.8 -2.1,-9.2 -2.1,-14.4 -3.3,-15.0" fill="#f2b705" />
              <polygon points="3.3,-9.8 2.1,-9.2 2.1,-14.4 3.3,-15.0" fill="#d99e04" />
              <polygon points="-3.0,-13.6 0,-12.2 0,-15.2 -3.0,-16.6" fill="#f2b705" />
              <polygon points="3.0,-13.6 0,-12.2 0,-15.2 3.0,-16.6" fill="#d99e04" />
              <polygon points="0,-17.8 3.0,-16.6 0,-15.2 -3.0,-16.6" fill="#ffe169" />
              <rect x="-2.0" y="-12.4" width="4.0" height="1.1" fill="#2563eb" />
            </g>
          )}

          {id === 'maya' && (
            <g>
              {/* Rambut hitam panjang bergelombang, anting sian & beanie biru Maya */}
              <polygon points="-3.4,-8.8 -2.1,-8.2 -2.1,-14.0 -3.4,-14.6" fill="#16193a" />
              <polygon points="3.4,-8.8 2.1,-8.2 2.1,-14.0 3.4,-14.6" fill="#16193a" />
              <circle cx="-2.6" cy="-10.5" r="0.75" fill="#38bdf8" />
              <circle cx="2.6" cy="-10.5" r="0.75" fill="#38bdf8" />
              <polygon points="-2.8,-13.6 0,-12.3 0,-15.4 -2.8,-16.7" fill="#1d8cd8" />
              <polygon points="2.8,-13.6 0,-12.3 0,-15.4 2.8,-16.7" fill="#156ba8" />
              <polygon points="0,-18.0 2.8,-16.7 0,-15.4 -2.8,-16.7" fill="#38bdf8" />
            </g>
          )}

          {id === 'siti' && (
            <g>
              {/* Hijab merah muda (pink) 3D menutup kepala dan bahu Siti */}
              <polygon points="-3.3,-8.6 0,-6.8 3.3,-8.6 2.8,-11.0 0,-9.2 -2.8,-11.0" fill="#e04891" />
              <polygon points="-3.2,-9.8 -2.0,-9.2 -2.0,-14.4 -3.2,-15.0" fill="#e04891" />
              <polygon points="3.2,-9.8 2.0,-9.2 2.0,-14.4 3.2,-15.0" fill="#c4357a" />
              <polygon points="-2.9,-13.6 0,-12.2 0,-15.3 -2.9,-16.7" fill="#f26bb0" />
              <polygon points="2.9,-13.6 0,-12.2 0,-15.3 2.9,-16.7" fill="#d94b94" />
              <polygon points="0,-18.0 2.9,-16.7 0,-15.3 -2.9,-16.7" fill="#f794c8" />
            </g>
          )}

          {/* Lengan Walikota melambai menyapa warga */}
          <g className="worker__arm">
            <polygon points="2.0,-9.2 5.6,-11.8 4.8,-13.0 1.4,-10.4" fill={suit.right} />
            <circle cx="5.4" cy="-12.4" r="1.15" fill={skin.top} />
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * Emote marah mengambang di atas kerumunan warga yang sedang berdemo di depan
 * Balai Kota ketika kepuasan < 30.
 */
function AngryEmote({
  x,
  y,
  delay = 0,
  variant = 'face',
}: {
  x: number;
  y: number;
  delay?: number;
  variant?: 'face' | 'symbol';
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="emote-angry"
        style={delay ? { animationDelay: `${delay}s` } : undefined}
      >
        {/* Gelembung emote merah-oranye */}
        <rect
          x="-8.5"
          y="-15"
          width="17"
          height="12"
          rx="5"
          fill="#ff3b30"
          stroke="#ffffff"
          strokeWidth="1.2"
        />
        <polygon points="-2.2,-3 2.2,-3 0,0.8" fill="#ff3b30" />
        {variant === 'face' ? (
          <g>
            {/* Alis menukik marah & mulut cemberut */}
            <line x1="-4.8" y1="-11.5" x2="-1.5" y2="-9.8" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="4.8" y1="-11.5" x2="1.5" y2="-9.8" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="-2.8" cy="-8.5" r="1" fill="#ffd45e" />
            <circle cx="2.8" cy="-8.5" r="1" fill="#ffd45e" />
            <path d="M-3.2,-5.6 Q0,-7.6 3.2,-5.6" fill="none" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* Simbol seru & kilat kemarahan warga (!#) */}
            <line x1="-3.5" y1="-12.2" x2="-3.5" y2="-7.8" stroke="#ffd45e" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="-3.5" cy="-5.6" r="1" fill="#ffd45e" />
            <polyline points="1.5,-12.2 -0.2,-9.2 2.4,-9.2 0.8,-5.6" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </g>
    </g>
  );
}

/**
 * Balai Kota Ecopolis (City Hall) di pusat pulau (u=0.95, v=1.75), lengkap
 * dengan Alun-Alun Kota, tiang bendera Merah Putih, model 3D Walikota, dan
 * aksi demonstrasi warga jika kepuasan < 30.
 */
function CityHallSection({
  avatar,
  satisfaction,
}: {
  avatar: string;
  satisfaction: number;
}) {
  const protesting = satisfaction < 30;
  const [flagX, flagY] = ptXY(1.42, 1.88, 4);

  return (
    <g>
      {/* Alun-Alun Batu Balai Kota (Civic Plaza) */}
      <IsoSlab
        u1={0.22}
        v1={1.12}
        u2={1.68}
        v2={2.52}
        h={4}
        lift={0}
        top={C.stoneTop}
        left={C.stoneL}
        right={C.stoneR}
      />
      {/* Pola pelataran batu di depan Balai Kota */}
      <polygon
        points={`${pt(0.36, 1.72, 4.2)} ${pt(1.54, 1.72, 4.2)} ${pt(1.54, 2.42, 4.2)} ${pt(0.36, 2.42, 4.2)}`}
        fill={C.smoke}
        opacity="0.72"
      />
      {/* Karpet merah tangga masuk Balai Kota */}
      <polygon
        points={`${pt(0.84, 1.62, 4.4)} ${pt(1.08, 1.62, 4.4)} ${pt(1.08, 2.08, 4.4)} ${pt(0.84, 2.08, 4.4)}`}
        fill="#d93838"
      />

      {/* Sayap Kiri & Sayap Kanan Gedung Balai Kota */}
      <IsoSlab
        u1={0.32}
        v1={1.22}
        u2={0.76}
        v2={1.68}
        h={24}
        lift={4}
        top={C.smoke}
        left={C.steelL}
        right={C.steelR}
      />
      <IsoSlab
        u1={0.28}
        v1={1.18}
        u2={0.78}
        v2={1.72}
        h={4}
        lift={28}
        top={C.terraTop}
        left={C.terraL}
        right={C.terraR}
      />
      <IsoSlab
        u1={1.14}
        v1={1.22}
        u2={1.58}
        v2={1.68}
        h={24}
        lift={4}
        top={C.smoke}
        left={C.steelL}
        right={C.steelR}
      />
      <IsoSlab
        u1={1.12}
        v1={1.18}
        u2={1.62}
        v2={1.72}
        h={4}
        lift={28}
        top={C.terraTop}
        left={C.terraL}
        right={C.terraR}
      />

      {/* Gedung Utama Tengah Balai Kota & Menara Jam */}
      <IsoSlab
        u1={0.66}
        v1={1.16}
        u2={1.24}
        v2={1.72}
        h={34}
        lift={4}
        top={C.smoke}
        left={C.steelTop}
        right={C.steelL}
      />
      {/* Empat pilar serambi depan Balai Kota */}
      {[0.72, 0.86, 1.04, 1.18].map((pu) => (
        <IsoSlab
          key={pu}
          u1={pu - 0.03}
          v1={1.68}
          u2={pu + 0.03}
          v2={1.75}
          h={24}
          lift={4}
          top={C.smoke}
          left={C.smoke}
          right={C.steelL}
        />
      ))}
      {/* Atap terakota bertingkat & menara lonceng/jam Balai Kota */}
      <IsoSlab
        u1={0.62}
        v1={1.12}
        u2={1.28}
        v2={1.78}
        h={6}
        lift={38}
        top={C.terraTop}
        left={C.terraL}
        right={C.terraR}
      />
      <IsoSlab
        u1={0.78}
        v1={1.28}
        u2={1.12}
        v2={1.62}
        h={16}
        lift={44}
        top={C.smoke}
        left={C.steelTop}
        right={C.steelL}
      />
      <IsoSlab
        u1={0.74}
        v1={1.24}
        u2={1.16}
        v2={1.66}
        h={5}
        lift={60}
        top={C.warmTop}
        left={C.warmL}
        right={C.warmR}
      />
      {/* Jam emas Balai Kota di menara utama */}
      <g transform={at(0.95, 1.62, 52)}>
        <circle cx="0" cy="0" r="4.5" fill={C.sun} stroke={C.ink} strokeWidth="1" />
        <line x1="0" y1="0" x2="0" y2="-2.6" stroke={C.ink} strokeWidth="1" />
        <line x1="0" y1="0" x2="2" y2="0.8" stroke={C.ink} strokeWidth="1" />
      </g>

      {/* Pohon peneduh di sudut Alun-Alun Balai Kota */}
      <RoundTree u={0.28} v={2.36} lift={4} scale={0.58} />
      <RoundTree u={1.62} v={2.36} lift={4} scale={0.58} />

      {/* Tiang Bendera Merah Putih di halaman Balai Kota */}
      <g transform={`translate(${flagX} ${flagY})`}>
        <ellipse cx="0" cy="0" rx="4" ry="2" fill={C.stoneR} />
        <line x1="0" y1="0" x2="0" y2="-32" stroke={C.smoke} strokeWidth="1.6" />
        <circle cx="0" cy="-32" r="1.5" fill={C.sun} />
        <g className="worker__arm">
          <polygon points="0,-31 11,-29 11,-25.5 0,-27.5" fill="#e03131" />
          <polygon points="0,-27.5 11,-25.5 11,-22 0,-24" fill="#ffffff" />
        </g>
      </g>

      {/* Podium kehormatan Walikota di Balai Kota (figur Walikota dirender pada MayorDynamicLayer terpisah) */}
      <g transform={`${at(0.96, 1.96, 4.5)} scale(1.42)`}>
        <polygon points="0,-3.8 8.2,0 0,3.8 -8.2,0" fill="#b52626" />
        <polygon points="0,-3.0 6.8,0 0,3.0 -6.8,0" fill="#ffd45e" opacity="0.45" />
      </g>

      {/* Jika kepuasan warga < 30, muncul aksi demo warga beserta emote marah */}
      {protesting && (
        <g>
          {/* Spanduk tuntutan warga di barisan depan */}
          <g transform={at(0.75, 2.28, 4.5)}>
            <polygon
              points="-14,-11 14,-5 14,-13 -14,-19"
              fill="#ffffff"
              stroke="#d93838"
              strokeWidth="1.1"
            />
            <line x1="-10" y1="-15" x2="10" y2="-10.5" stroke="#d93838" strokeWidth="1.8" />
            <line x1="-8" y1="-12" x2="8" y2="-8.5" stroke="#16193a" strokeWidth="1.2" />
          </g>

          {/* Kerumunan 7 warga berdemo membawa poster dan mengacungkan tangan */}
          <IsoWorker u={0.56} v={2.18} lift={4.5} shirt="red" hat="hair-dark" tool="placard" action="wave" scale={0.98} />
          <IsoWorker u={0.78} v={2.26} lift={4.5} shirt="orange" hat="cap-blue" tool="flag" action="wave" scale={1.0} delay={0.2} />
          <IsoWorker u={1.02} v={2.32} lift={4.5} shirt="yellow" hat="hair-dark" tool="placard" action="wave" scale={1.02} delay={0.4} flip />
          <IsoWorker u={1.26} v={2.24} lift={4.5} shirt="red" hat="straw" tool="placard" action="wave" scale={0.98} delay={0.15} flip />
          <IsoWorker u={1.44} v={2.16} lift={4.5} shirt="blue" hat="cap-green" tool="flag" action="wave" scale={0.96} delay={0.35} flip />
          <IsoWorker u={0.68} v={2.44} lift={4.5} shirt="warm" hat="hair-dark" tool="placard" action="wave" scale={0.95} delay={0.5} />
          <IsoWorker u={1.18} v={2.46} lift={4.5} shirt="coal" hat="helmet-yellow" tool="flag" action="wave" scale={0.95} delay={0.65} flip />

          {/* Emote-emote marah kecil yang melayang di atas kerumunan pendemo */}
          {(() => {
            const [e1x, e1y] = ptXY(0.56, 2.18, 30);
            const [e2x, e2y] = ptXY(0.84, 2.26, 34);
            const [e3x, e3y] = ptXY(1.08, 2.32, 32);
            const [e4x, e4y] = ptXY(1.34, 2.22, 33);
            const [e5x, e5y] = ptXY(0.95, 2.48, 29);
            return (
              <>
                <AngryEmote x={e1x} y={e1y} delay={0} variant="face" />
                <AngryEmote x={e2x} y={e2y} delay={0.35} variant="symbol" />
                <AngryEmote x={e3x} y={e3y} delay={0.7} variant="face" />
                <AngryEmote x={e4x} y={e4y} delay={0.2} variant="symbol" />
                <AngryEmote x={e5x} y={e5y} delay={0.55} variant="face" />
              </>
            );
          })()}
        </g>
      )}
    </g>
  );
}

/**
 * Partikel visual asap kelabu halus yang mengebul / muncul secara periodik
 * dari cerobong (PLTU & Kawasan Industri) maupun tumpukan sampah (TPA),
 * tanpa menggunakan polygon hitam.
 */
function SmokePlume({
  x = 0,
  y = 0,
  scale = 1,
  variant = 'billow',
}: {
  x?: number;
  y?: number;
  scale?: number;
  variant?: 'billow' | 'periodic' | 'trash';
}) {
  if (variant === 'trash') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} className="smoke-emitter smoke-emitter--trash">
        <g className="smoke-puff smoke-puff--trash-1">
          <circle cx="0" cy="0" r="6.2" fill="#949bb4" opacity="0.85" />
          <circle cx="4.8" cy="-2.2" r="5.0" fill="#b9bcd0" opacity="0.85" />
          <circle cx="-4.2" cy="-1.8" r="4.4" fill="#d7dbe8" opacity="0.85" />
        </g>
        <g className="smoke-puff smoke-puff--trash-2">
          <circle cx="-3.2" cy="-4" r="5.8" fill="#8f93ad" opacity="0.82" />
          <circle cx="3.2" cy="-5.5" r="4.6" fill="#cfd6ec" opacity="0.82" />
        </g>
        <g className="smoke-puff smoke-puff--trash-3">
          <circle cx="2.2" cy="-3" r="5.4" fill="#949bb4" opacity="0.8" />
          <circle cx="-2.8" cy="-4.8" r="4.2" fill="#d7dbe8" opacity="0.8" />
        </g>
      </g>
    );
  }

  if (variant === 'periodic') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} className="smoke-emitter smoke-emitter--periodic">
        <g className="smoke-puff smoke-puff--per-1">
          <circle cx="0" cy="0" r="8.8" fill="#8f93ad" opacity="0.9" />
          <circle cx="6.4" cy="-2.8" r="7.2" fill="#aeb4c9" opacity="0.9" />
          <circle cx="-5.6" cy="-2.2" r="6.4" fill="#d7dbe8" opacity="0.9" />
        </g>
        <g className="smoke-puff smoke-puff--per-2">
          <circle cx="2.8" cy="-5" r="8.2" fill="#949bb4" opacity="0.88" />
          <circle cx="-4.8" cy="-6.8" r="6.8" fill="#cfd6ec" opacity="0.88" />
        </g>
        <g className="smoke-puff smoke-puff--per-3">
          <circle cx="-2.2" cy="-4" r="7.8" fill="#8f93ad" opacity="0.85" />
          <circle cx="4.6" cy="-6.2" r="6.2" fill="#d7dbe8" opacity="0.85" />
        </g>
      </g>
    );
  }

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="smoke-emitter smoke-emitter--billow">
      <g className="smoke-puff smoke-puff--1">
        <circle cx="0" cy="0" r="10.5" fill="#8f93ad" />
        <circle cx="7.2" cy="-3.2" r="8.4" fill="#aeb4c9" />
        <circle cx="-6.2" cy="-2.8" r="7.5" fill="#cfd6ec" />
      </g>
      <g className="smoke-puff smoke-puff--2">
        <circle cx="3.2" cy="-5" r="9.8" fill="#949bb4" />
        <circle cx="-5" cy="-7" r="8.0" fill="#b9bcd0" />
        <circle cx="6" cy="-8" r="6.8" fill="#eef1fb" />
      </g>
      <g className="smoke-puff smoke-puff--3">
        <circle cx="-2.5" cy="-4" r="9.2" fill="#8f93ad" />
        <circle cx="5.5" cy="-6.5" r="7.5" fill="#cfd6ec" />
      </g>
      <g className="smoke-puff smoke-puff--4">
        <circle cx="2" cy="-3" r="8.8" fill="#aeb4c9" />
        <circle cx="-4.5" cy="-5.5" r="7.2" fill="#eef1fb" />
      </g>
    </g>
  );
}

/**
 * Partikel polusi udara kota berdasarkan tingkat polusi:
 * - 'bersih': tidak ada partikel polusi
 * - 'sedang': salah satu dari PLTU Batu Bara atau Kawasan Industri aktif
 * - 'parah': keduanya (PLTU Batu Bara + Kawasan Industri) aktif bersamaan,
 *   memunculkan kepulan partikel asap kelabu ekstra pekat di udara kota
 */
function AtmospherePollution({
  level,
  plots,
}: {
  level: PollutionLevel;
  plots: (AssetId | null)[];
}) {
  if (level === 'bersih') return null;

  const isSevere = level === 'parah';
  const hasPltu = plots.includes('pltu');
  const hasIndustri = plots.includes('industri');

  return (
    <g className={`city-pollution city-pollution--${level}`} data-pollution={level} pointerEvents="none">
      {/* Kepulan partikel asap kelabu di langit atas PLTU */}
      {hasPltu && (
        <g transform="translate(-48 -96)">
          <SmokePlume x={0} y={0} scale={isSevere ? 1.25 : 0.9} variant="periodic" />
          {isSevere && <SmokePlume x={28} y={-8} scale={1.1} variant="billow" />}
        </g>
      )}

      {/* Kepulan partikel asap kelabu di langit atas Kawasan Industri */}
      {hasIndustri && (
        <g transform="translate(198 48)">
          <SmokePlume x={0} y={0} scale={isSevere ? 1.3 : 0.95} variant="periodic" />
          {isSevere && <SmokePlume x={36} y={6} scale={1.15} variant="billow" />}
        </g>
      )}

      {/* Saat polusi PARAH (PLTU + Industri keduanya aktif), partikel asap kelabu menyebar ke langit tengah kota */}
      {isSevere && (
        <>
          <g transform="translate(65 -42)">
            <SmokePlume x={0} y={0} scale={1.1} variant="periodic" />
          </g>
          <g transform="translate(132 -8)">
            <SmokePlume x={0} y={0} scale={1.05} variant="periodic" />
          </g>
          <g transform="translate(-8 -32)">
            <SmokePlume x={0} y={0} scale={0.95} variant="trash" />
          </g>
        </>
      )}
    </g>
  );
}

/**
 * Efek langsung berskala kota (City-Wide Consequences) yang muncul di seluruh
 * pulau berdasarkan kombinasi keputusan kebijakan pemain.
 */
function CityWideEffects({ plots }: { plots: (AssetId | null)[] }) {
  const hasPlts = plots.includes('plts');
  const hasTol = plots.includes('tol');
  const hasBrt = plots.includes('brt');
  const hasIndustri = plots.includes('industri');
  const hasHutan = plots.includes('hutan');
  const hasTpa = plots.includes('tpa');
  const hasPerumahan = plots.includes('perumahan');
  const hasApartemen = plots.includes('apartemen');
  const river = getRiverPalette(plots);

  return (
    <g>
      {/* Efek PLTS: Lampu jalan tenaga surya di sepanjang jalan protokol Balai Kota */}
      {hasPlts &&
        [
          [0.12, 0.92],
          [0.12, 1.58],
          [1.76, 1.58],
          [1.76, 2.38],
        ].map(([lu, lv], i) => (
          <g key={i} transform={at(lu, lv, 0.5)}>
            <line x1="0" y1="0" x2="0" y2="-16" stroke={C.steelR} strokeWidth="1.4" />
            <polygon points="-4,-16 4,-16 2,-18 -2,-18" fill={C.solar} />
            <circle cx="0" cy="-14.5" r="2.2" fill={C.sun} opacity="0.85" />
          </g>
        ))}

      {/* Efek TOL: Rambu portal elektronik & lampu koridor jalan tol menyambung ke pusat kota */}
      {hasTol && (
        <g>
          {[
            [-0.42, 1.56],
            [0.05, 1.56],
          ].map(([lu, lv], idx) => (
            <g key={idx} transform={at(lu, lv, 0.5)}>
              <ellipse cx="0" cy="0" rx="2.4" ry="1.3" fill="#64748b" />
              <line x1="0" y1="0" x2="0" y2="-14" stroke="#cbd5e1" strokeWidth="1.4" />
              <ellipse cx="2.2" cy="-14" rx="2.4" ry="1.1" fill="#f8fafc" />
              <ellipse cx="2.2" cy="-13.4" rx="1.8" ry="0.8" fill="#fef08a" opacity="0.9" />
            </g>
          ))}
        </g>
      )}

      {/* Efek BRT: Lajur biru khusus bus listrik & jalur sepeda hijau menyambung ke Balai Kota */}
      {hasBrt && (
        <g>
          <polygon
            points={`${pt(-0.65, 1.62, 0.7)} ${pt(0.22, 1.62, 0.7)} ${pt(0.22, 1.76, 0.7)} ${pt(-0.65, 1.76, 0.7)}`}
            fill={C.bus}
            opacity="0.85"
          />
          <polygon
            points={`${pt(-0.65, 1.76, 0.7)} ${pt(0.22, 1.76, 0.7)} ${pt(0.22, 1.84, 0.7)} ${pt(-0.65, 1.84, 0.7)}`}
            fill={C.leafTop}
          />
          <RoundTree u={-0.32} v={1.48} lift={0} scale={0.52} />
          <RoundTree u={-0.05} v={1.48} lift={0} scale={0.52} />
        </g>
      )}

      {/* Efek INDUSTRI: Tumpukan limbah kemasan & sampah hanyut mencemari tepian dan aliran sungai tengah */}
      {hasIndustri && (
        <g>
          {/* Tumpukan drum & sampah limbah di tepi sungai timur */}
          <TrashCluster u={2.56} v={0.74} lift={0} variant="industrial" />
          <TrashCluster u={2.48} v={1.08} lift={0} variant="mixed" />
          {/* Sampah polygon mengapung di aliran sungai tengah */}
          <RiverTrashItem u={2.12} v={0.68} lift={-4.6} kind="barrel" />
          <RiverTrashItem u={2.24} v={0.92} lift={-4.6} kind="plastic" />
          <RiverTrashItem u={2.04} v={1.15} lift={-4.6} kind="box" />
          <RiverTrashItem u={2.22} v={1.36} lift={-4.6} kind="plastic" />
        </g>
      )}

      {/* Efek HUTAN KOTA: Sabuk pepohonan hijau rindang tumbuh di sepanjang tepi sungai & kota */}
      {hasHutan && (
        <g>
          <RoundTree u={1.82} v={0.82} lift={0} scale={0.64} />
          <PineTree u={2.68} v={1.28} lift={0} scale={0.68} tone="pine" />
          <RoundTree u={1.78} v={2.48} lift={0} scale={0.62} />
          <PineTree u={2.72} v={2.18} lift={0} scale={0.66} tone="leaf" />
        </g>
      )}

      {/* Efek TPA TERBUKA: Tumpukan sampah meluber ke bantaran sungai & hanyut di hilir sungai selatan beserta asap kelabu halus */}
      {hasTpa && (
        <g>
          {/* Tumpukan sampah meluber di bantaran barat sungai dengan partikel asap kelabu halus */}
          <TrashCluster u={1.76} v={3.48} lift={0} variant="mixed" smoke />
          <TrashCluster u={1.68} v={3.82} lift={0} variant="bags" smoke />
          <TrashCluster u={1.84} v={4.12} lift={0} variant="mixed" />
          {/* Sampah polygon mengapung di sepanjang hilir sungai selatan */}
          <RiverTrashItem u={2.22} v={3.18} lift={-4.6} kind="plastic" />
          <RiverTrashItem u={2.36} v={3.46} lift={-4.6} kind="box" />
          <RiverTrashItem u={2.18} v={3.74} lift={-4.6} kind="bag" />
          <RiverTrashItem u={2.38} v={4.02} lift={-4.6} kind="plastic" />
          <RiverTrashItem u={2.24} v={4.32} lift={-4.6} kind="box" />
        </g>
      )}

      {/* Efek PERUMAHAN HORIZONTAL: Hilangnya daerah resapan memicu genangan banjir di pesisir */}
      {hasPerumahan && (
        <g>
          <polygon
            points={`${pt(2.72, 3.85, 0.6)} ${pt(3.55, 3.85, 0.6)} ${pt(3.75, 4.35, 0.6)} ${pt(2.65, 4.35, 0.6)}`}
            fill={river.mid}
            opacity="0.78"
          />
          <polygon
            className="water-ripple"
            points={`${pt(2.92, 3.98, 0.8)} ${pt(3.38, 3.98, 0.8)} ${pt(3.38, 4.22, 0.8)} ${pt(2.92, 4.22, 0.8)}`}
            fill="none"
            stroke={river.foam}
            strokeWidth="1.1"
          />
        </g>
      )}

      {/* Efek APARTEMEN VERTIKAL HIJAU: Taman resapan ekologis di tepi pantai tenggara */}
      {hasApartemen && (
        <g>
          <RoundTree u={2.88} v={3.92} lift={0} scale={0.6} />
          <PineTree u={3.18} v={4.08} lift={0} scale={0.64} tone="pine" />
        </g>
      )}
    </g>
  );
}

/**
 * Klaster awan putih low-poly isometrik 3D yang melayang lembut di udara sekitar pulau,
 * lengkap dengan jejak bayangan atmosferik diagonal.
 */
function IsoCloudCluster({
  u,
  v,
  lift,
  scale = 1,
  variant = 'stepped',
  speed = 'normal',
}: {
  u: number;
  v: number;
  lift: number;
  scale?: number;
  variant?: 'stepped' | 'wide' | 'twin' | 'cube';
  speed?: 'normal' | 'slow' | 'alt';
}) {
  const animClass =
    speed === 'slow'
      ? 'cloud-drift cloud-drift--slow'
      : speed === 'alt'
        ? 'cloud-drift cloud-drift--alt'
        : 'cloud-drift';

  return (
    <g transform={`${at(u, v, lift)} scale(${scale})`}>
      <g className={animClass}>
        {/* Jejak bayangan atmosferik lembut di belakang awan */}
        <polygon
          points="-56,-14 0,-42 42,-21 -14,7"
          fill="#adc0f2"
          opacity="0.32"
        />
        {variant === 'cube' && (
          <IsoSlab
            u1={-0.22}
            v1={-0.22}
            u2={0.22}
            v2={0.22}
            h={14}
            lift={0}
            top="#ffffff"
            left="#edf3ff"
            right="#d4e1fc"
          />
        )}
        {variant === 'twin' && (
          <>
            <IsoSlab
              u1={-0.38}
              v1={-0.18}
              u2={-0.04}
              v2={0.18}
              h={12}
              lift={0}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
            <IsoSlab
              u1={0.04}
              v1={-0.18}
              u2={0.38}
              v2={0.18}
              h={14}
              lift={2}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
          </>
        )}
        {variant === 'stepped' && (
          <>
            <IsoSlab
              u1={-0.52}
              v1={-0.32}
              u2={0.48}
              v2={0.32}
              h={14}
              lift={0}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
            <IsoSlab
              u1={-0.32}
              v1={-0.26}
              u2={0.28}
              v2={0.26}
              h={12}
              lift={14}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
            <IsoSlab
              u1={-0.58}
              v1={-0.12}
              u2={-0.18}
              v2={0.28}
              h={9}
              lift={14}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
          </>
        )}
        {variant === 'wide' && (
          <>
            <IsoSlab
              u1={-0.62}
              v1={-0.34}
              u2={0.56}
              v2={0.34}
              h={15}
              lift={0}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
            <IsoSlab
              u1={-0.36}
              v1={-0.28}
              u2={0.32}
              v2={0.28}
              h={14}
              lift={15}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
            <IsoSlab
              u1={0.12}
              v1={-0.22}
              u2={0.62}
              v2={0.26}
              h={10}
              lift={15}
              top="#ffffff"
              left="#edf3ff"
              right="#d4e1fc"
            />
          </>
        )}
      </g>
    </g>
  );
}

/**
 * Awan low-poly horizon tinggi di latar belakang langit atas.
 */
function DistantSkyCloud({
  startX,
  startY,
  scale = 1,
  speed = 'normal',
  opacity = 0.45,
}: {
  startX: number;
  startY: number;
  scale?: number;
  speed?: 'normal' | 'slow' | 'alt';
  opacity?: number;
}) {
  const animClass =
    speed === 'slow'
      ? 'sky-cloud-drift sky-cloud-drift--slow'
      : speed === 'alt'
        ? 'sky-cloud-drift sky-cloud-drift--alt'
        : 'sky-cloud-drift';

  return (
    <g transform={`translate(${startX} ${startY}) scale(${scale})`} opacity={opacity} pointerEvents="none">
      <g className={animClass}>
        <polygon points="-46,-6 -10,-24 46,-8 10,10" fill="#ffffff" />
        <polygon points="-10,-24 46,-8 46,0 -10,-16" fill="#d9e6fc" />
        <polygon points="-46,-6 -10,-16 -10,-24" fill="#edf3ff" />
        <polygon points="-22,-14 2,-26 30,-14 6,-2" fill="#ffffff" />
        <polygon points="2,-26 30,-14 30,-8 2,-20" fill="#d9e6fc" />
      </g>
    </g>
  );
}

/**
 * Elemen atmosfer terapung di sekeliling pulau utama: awan putih low-poly,
 * kubus tanah/batu satelit di berbagai ketinggian, serta pulau-pulau kecil
 * terapung sesuai gambar referensi.
 */
function FloatingAtmosphere() {
  return (
    <g>
      {/* Awan horizon tinggi di latar langit belakang */}
      <DistantSkyCloud startX={-380} startY={-92} scale={0.78} speed="slow" opacity={0.42} />
      <DistantSkyCloud startX={340} startY={-108} scale={0.72} speed="alt" opacity={0.38} />
      <DistantSkyCloud startX={90} startY={-124} scale={0.58} speed="normal" opacity={0.46} />

      {/* 1. Awan low-poly bertingkat di langit kiri-atas & kubus tanah melayang */}
      <IsoCloudCluster u={-2.35} v={1.65} lift={68} scale={0.95} variant="stepped" speed="slow" />
      <IsoCloudCluster u={-3.65} v={3.35} lift={8} scale={0.88} variant="stepped" speed="alt" />
      <g className="cloud-float cloud-float--alt">
        <RockCrop u={-3.15} v={2.95} lift={48} w={0.34} d={0.34} h={14} tone="sand" />
      </g>
      <IsoCloudCluster u={-1.78} v={0.85} lift={14} scale={0.92} variant="cube" speed="normal" />

      {/* 2. Awan low-poly besar di langit kanan-atas & kubus awan kecil */}
      <IsoCloudCluster u={3.15} v={-0.95} lift={146} scale={0.55} variant="cube" speed="alt" />
      <IsoCloudCluster u={4.45} v={-1.65} lift={122} scale={1.08} variant="wide" speed="slow" />

      {/* 3. Awan low-poly di sisi kanan-bawah */}
      <IsoCloudCluster u={6.18} v={-1.08} lift={-26} scale={0.92} variant="stepped" speed="normal" />
      <IsoCloudCluster u={5.52} v={-0.35} lift={-42} scale={0.48} variant="cube" speed="alt" />

      {/* 4. Pulau Satelit Kecil Kiri-Tengah dengan Pohon Kanopi Kubus */}
      <g className="isle-float isle-float--slow">
        <IsoSlab u1={-3.32} v1={3.68} u2={-2.68} v2={4.32} h={12} lift={-154} top="#9e4f1e" left="#8c4316" right="#6e320d" />
        <IsoSlab u1={-3.42} v1={3.58} u2={-2.58} v2={4.42} h={14} lift={-142} top="#c97a3e" left="#b5652b" right="#944d1b" />
        <IsoSlab u1={-3.48} v1={3.52} u2={-2.52} v2={4.48} h={10} lift={-128} top={C.mintTop} left={C.mintL} right={C.mintR} />
        <BlockTree u={-3.0} v={4.0} lift={-118} scale={0.88} tone="bright" />
      </g>

      {/* Kubus awan kembar di sela pulau kiri */}
      <IsoCloudCluster u={-1.68} v={3.92} lift={-112} scale={0.86} variant="twin" speed="alt" />
      <IsoCloudCluster u={-2.45} v={4.68} lift={-142} scale={0.48} variant="cube" speed="normal" />

      {/* 5. Pulau Satelit Kiri-Bawah dengan 3 Pohon Pinus & 2 Kubus Terakota/Amber */}
      <g className="isle-float">
        <IsoSlab u1={-1.15} v1={5.05} u2={-0.32} v2={5.88} h={14} lift={-168} top="#9e4f1e" left="#8c4316" right="#6e320d" />
        <IsoSlab u1={-1.28} v1={4.92} u2={-0.18} v2={6.02} h={16} lift={-154} top="#c97a3e" left="#b5652b" right="#944d1b" />
        <IsoSlab u1={-1.35} v1={4.85} u2={-0.12} v2={6.08} h={12} lift={-138} top={C.mintTop} left={C.mintL} right={C.mintR} />
        <PineTree u={-1.02} v={5.28} lift={-126} scale={0.88} tone="pine" />
        <PineTree u={-0.68} v={5.62} lift={-126} scale={0.82} tone="leaf" />
        <PineTree u={-0.52} v={5.18} lift={-126} scale={0.78} tone="pine" />
        <RockCrop u={-0.34} v={5.68} lift={-126} w={0.32} d={0.32} h={13} tone="terra" />
        <RockCrop u={-0.22} v={5.94} lift={-132} w={0.28} d={0.28} h={12} tone="amber" />
      </g>

      {/* 6. Pulau Satelit Kanan-Bawah dengan Pohon Kanopi Kubus */}
      <g className="isle-float isle-float--alt">
        <IsoSlab u1={5.78} v1={0.02} u2={6.38} v2={0.62} h={12} lift={-138} top="#9e4f1e" left="#8c4316" right="#6e320d" />
        <IsoSlab u1={5.68} v1={-0.08} u2={6.48} v2={0.72} h={14} lift={-126} top="#c97a3e" left="#b5652b" right="#944d1b" />
        <IsoSlab u1={5.62} v1={-0.14} u2={6.54} v2={0.78} h={10} lift={-112} top={C.mintTop} left={C.mintL} right={C.mintR} />
        <BlockTree u={6.08} v={0.32} lift={-102} scale={0.84} tone="bright" />
      </g>
    </g>
  );
}

/**
 * Penampang Tebing Tanah Liat, Strata Terakota, dan Bongkahan Batu Low-Poly
 * Berlapis-lapis di Bawah Pulau Utama yang Melayang di Udara.
 */
function FloatingCliffStrata() {
  return (
    <g>
      {/* Bayangan atmosfer lembut di bawah pulau utama */}
      <polygon
        points={`${pt(-1.85, -0.65, -82)} ${pt(4.85, -0.65, -82)} ${pt(4.85, 4.65, -82)} ${pt(-1.85, 4.65, -82)}`}
        fill="#99b1eb"
        opacity="0.28"
      />

      {/* Bongkahan batu & kubus tanah lepas (low-poly rocky debris) yang melayang di bawah tebing */}
      <RockCrop u={-1.15} v={4.68} lift={-78} w={0.24} d={0.24} h={10} tone="stone" />
      <RockCrop u={0.65} v={4.78} lift={-74} w={0.26} d={0.26} h={11} tone="terra" />
      <RockCrop u={3.45} v={4.72} lift={-76} w={0.24} d={0.24} h={10} tone="canyon" />
      <RockCrop u={4.98} v={2.85} lift={-72} w={0.24} d={0.24} h={10} tone="terra" />

      {/* =====================================================================
          LAPIS 4 (PALING BAWAH): GIGI BATU UMBER-TERAKOTA BERUNDAK (lift -72 s/d -46)
          ===================================================================== */}
      {/* Tonjolan batu bawah sepanjang tebing barat-daya (v = 4.55) */}
      <IsoSlab u1={-1.68} v1={3.75} u2={-0.88} v2={4.42} h={22} lift={-68} top="#944618" left="#853c12" right="#692d0b" />
      <IsoSlab u1={-0.38} v1={3.85} u2={0.58} v2={4.56} h={24} lift={-72} top="#944618" left="#853c12" right="#692d0b" />
      <IsoSlab u1={0.92} v1={3.92} u2={1.88} v2={4.58} h={22} lift={-68} top="#944618" left="#853c12" right="#692d0b" />
      <IsoSlab u1={2.72} v1={3.85} u2={3.68} v2={4.52} h={24} lift={-70} top="#944618" left="#853c12" right="#692d0b" />
      <IsoSlab u1={3.88} v1={3.75} u2={4.68} v2={4.45} h={20} lift={-64} top="#944618" left="#853c12" right="#692d0b" />

      {/* Tonjolan batu bawah sepanjang tebing tenggara (u = 4.85) */}
      <IsoSlab u1={4.15} v1={-0.35} u2={4.82} v2={0.65} h={22} lift={-66} top="#944618" left="#853c12" right="#692d0b" />
      <IsoSlab u1={4.18} v1={1.05} u2={4.86} v2={2.05} h={24} lift={-70} top="#944618" left="#853c12" right="#692d0b" />
      <IsoSlab u1={4.15} v1={2.45} u2={4.85} v2={3.45} h={22} lift={-68} top="#944618" left="#853c12" right="#692d0b" />

      {/* =====================================================================
          LAPIS 3: STRATA BATU TERAKOTA TUA BERUNDAK (lift -52 s/d -32)
          ===================================================================== */}
      <IsoSlab u1={-1.82} v1={1.35} u2={0.22} v2={4.38} h={20} lift={-52} top="#b55d28" left="#a14f1e" right="#823c13" />
      <IsoSlab u1={-0.18} v1={2.28} u2={2.04} v2={4.58} h={22} lift={-54} top="#b55d28" left="#a14f1e" right="#823c13" />
      <IsoSlab u1={2.58} v1={2.02} u2={4.84} v2={4.46} h={22} lift={-54} top="#b55d28" left="#a14f1e" right="#823c13" />
      <IsoSlab u1={2.32} v1={-0.48} u2={4.82} v2={2.04} h={20} lift={-52} top="#b55d28" left="#a14f1e" right="#823c13" />
      <IsoSlab u1={-1.76} v1={-0.72} u2={1.74} v2={2.28} h={18} lift={-50} top="#b55d28" left="#a14f1e" right="#823c13" />

      {/* =====================================================================
          LAPIS 2: STRATA TANAH LIAT COKLAT HANGAT (lift -34 s/d -16)
          ===================================================================== */}
      <IsoSlab u1={-1.86} v1={-0.76} u2={1.78} v2={2.32} h={18} lift={-34} top="#d18040" left="#bd6e30" right="#9c551f" />
      <IsoSlab u1={-1.94} v1={1.26} u2={0.26} v2={4.36} h={18} lift={-34} top="#d18040" left="#bd6e30" right="#9c551f" />
      <IsoSlab u1={-0.24} v1={2.24} u2={2.06} v2={4.62} h={18} lift={-34} top="#d18040" left="#bd6e30" right="#9c551f" />
      <IsoSlab u1={2.28} v1={-0.52} u2={4.88} v2={2.06} h={18} lift={-34} top="#d18040" left="#bd6e30" right="#9c551f" />
      <IsoSlab u1={2.58} v1={1.92} u2={4.92} v2={4.50} h={18} lift={-34} top="#d18040" left="#bd6e30" right="#9c551f" />

      {/* =====================================================================
          LAPIS 1: BIBIR TANAH SUBSOIL OKER HANGAT (lift -18 s/d -10)
          ===================================================================== */}
      <IsoSlab u1={-1.84} v1={-0.78} u2={1.78} v2={2.35} h={8} lift={-18} top="#e6a460" left="#d48e48" right="#b57232" />
      <IsoSlab u1={-1.92} v1={1.25} u2={0.25} v2={4.34} h={8} lift={-18} top="#e6a460" left="#d48e48" right="#b57232" />
      <IsoSlab u1={-0.25} v1={2.25} u2={2.04} v2={4.62} h={8} lift={-18} top="#e6a460" left="#d48e48" right="#b57232" />
      <IsoSlab u1={2.28} v1={-0.52} u2={4.88} v2={2.05} h={8} lift={-18} top="#e6a460" left="#d48e48" right="#b57232" />
      <IsoSlab u1={2.60} v1={1.92} u2={4.92} v2={4.48} h={8} lift={-18} top="#e6a460" left="#d48e48" right="#b57232" />
    </g>
  );
}

/**
 * Lanskap Pulau Kota Ecopolis yang Melayang di Udara (Floating Eco-City Diorama):
 * Menampilkan penampang tanah liat & terakota berlapis tebal di bawah pulau,
 * sungai diagonal dengan 3 kondisi lingkungan (jernih sian, keruh sedang
 * kehijauan-coklat, atau lumpur limbah coklat pekat penuh sampah) yang jatuh
 * sebagai air terjun berundak ke gumpalan awan low-poly di bawah tebing.
 */
export function IslandTerrain({
  plots = [null, null, null, null, null],
}: {
  plots?: (AssetId | null)[];
}) {
  const river = getRiverPalette(plots);
  const turbidity = getWaterTurbidity(plots);

  const mainStreamD = streamPath([
    [1.98, -0.22],
    [2.02, 0.62],
    [2.16, 1.52],
    [2.24, 2.48],
    [2.32, 3.55],
    [2.34, 4.58],
  ]);
  const westStreamD = streamPath([
    [1.86, -0.14],
    [1.90, 0.64],
    [2.04, 1.52],
    [2.12, 2.48],
    [2.18, 3.55],
    [2.20, 4.58],
  ]);
  const eastStreamD = streamPath([
    [2.10, -0.14],
    [2.14, 0.64],
    [2.28, 1.52],
    [2.36, 2.48],
    [2.44, 3.55],
    [2.46, 4.58],
  ]);

  const [springTopX, springTopY] = ptXY(2.04, -0.18, 8);
  const [springBotX, springBotY] = ptXY(2.04, -0.18, -4.5);
  const [fallTopX, fallTopY] = ptXY(2.32, 4.64, -4.5);
  const [fallBotX, fallBotY] = ptXY(2.32, 4.64, -76);
  const [fallLeftTopX, fallLeftTopY] = ptXY(2.16, 4.64, -4.5);
  const [fallLeftBotX, fallLeftBotY] = ptXY(2.16, 4.64, -74);
  const [fallRightTopX, fallRightTopY] = ptXY(2.48, 4.64, -4.5);
  const [fallRightBotX, fallRightBotY] = ptXY(2.48, 4.64, -74);

  return (
    <g data-water-turbidity={turbidity}>
      {/* =====================================================================
          1. AWAN LOW-POLY & PULAU SATELIT TERAPUNG DI SEKELILING PULAU UTAMA
          ===================================================================== */}
      <FloatingAtmosphere />

      {/* =====================================================================
          2. PENAMPANG TANAH LIAT, STRATA TERAKOTA & BATU TEBING PULAU UTAMA
          ===================================================================== */}
      <FloatingCliffStrata />

      {/* =====================================================================
          3. DATARAN RUMPUT HIJAU & SUNGAI DIAGONAL (3 KONDISI LINGKUNGAN)
          ===================================================================== */}
      {/* Daratan Barat-Laut & Pusat Kota (Kawasan 0 & Balai Kota) */}
      <IsoSlab u1={-1.82} v1={-0.78} u2={1.78} v2={2.35} h={10} lift={-10} top={C.mintTop} left={C.mintL} right={C.mintR} />
      {/* Sabuk Koridor Barat (Kawasan 1 - Transportasi) */}
      <IsoSlab u1={-1.92} v1={1.25} u2={0.25} v2={4.32} h={10} lift={-10} top={C.mintTop} left={C.mintL} right={C.mintR} />
      {/* Lembah Selatan Tepi Sungai (Kawasan 3 - Pengolahan Sampah) */}
      <IsoSlab u1={-0.25} v1={2.25} u2={2.04} v2={4.62} h={10} lift={-10} top={C.mintTop} left={C.mintL} right={C.mintR} />

      {/* Kanal Sungai Diagonal dari Terowongan Gunung ke Tebing Air Terjun Selatan */}
      <IsoSlab u1={1.74} v1={-0.32} u2={2.30} v2={0.75} h={13} lift={-18} top={river.top} left={river.mid} right={river.deep} />
      <IsoSlab u1={1.84} v1={0.62} u2={2.42} v2={1.65} h={13} lift={-18} top={river.top} left={river.mid} right={river.deep} />
      <IsoSlab u1={1.94} v1={1.52} u2={2.52} v2={2.62} h={13} lift={-18} top={river.top} left={river.mid} right={river.deep} />
      <IsoSlab u1={2.02} v1={2.48} u2={2.60} v2={3.68} h={13} lift={-18} top={river.top} left={river.mid} right={river.deep} />
      <IsoSlab u1={2.04} v1={3.52} u2={2.60} v2={4.62} h={13} lift={-18} top={river.top} left={river.mid} right={river.deep} />

      {/* Kondisi SEDANG (Moderately Polluted): Pantulan air kusam & serpihan organik halus mengapung */}
      {turbidity === 'sedang' && (
        <g opacity="0.78">
          <polygon points={`${pt(1.90, 0.42, -4.8)} ${pt(2.24, 0.42, -4.8)} ${pt(2.28, 0.88, -4.8)} ${pt(1.94, 0.88, -4.8)}`} fill="#6b6632" />
          <polygon points={`${pt(2.06, 2.15, -4.8)} ${pt(2.42, 2.15, -4.8)} ${pt(2.46, 2.68, -4.8)} ${pt(2.10, 2.68, -4.8)}`} fill="#6b6632" />
          <polygon points={`${pt(2.12, 3.45, -4.8)} ${pt(2.48, 3.45, -4.8)} ${pt(2.52, 4.05, -4.8)} ${pt(2.16, 4.05, -4.8)}`} fill="#6b6632" />
          {/* Serpihan dedaunan/organik kecil mengapung */}
          <polygon points={`${pt(2.02, 0.55, -4.6)} ${pt(2.10, 0.52, -4.6)} ${pt(2.12, 0.62, -4.6)} ${pt(2.04, 0.65, -4.6)}`} fill="#545222" />
          <polygon points={`${pt(2.22, 2.38, -4.6)} ${pt(2.32, 2.34, -4.6)} ${pt(2.34, 2.44, -4.6)} ${pt(2.24, 2.48, -4.6)}`} fill="#545222" />
          <polygon points={`${pt(2.26, 3.82, -4.6)} ${pt(2.36, 3.78, -4.6)} ${pt(2.38, 3.88, -4.6)} ${pt(2.28, 3.92, -4.6)}`} fill="#545222" />
        </g>
      )}

      {/* Kondisi PARAH (Heavily Polluted): Endapan lumpur limbah coklat pekat & sampah kardus/kubus memenuhi sungai */}
      {turbidity === 'parah' && (
        <g>
          <g opacity="0.65">
            <polygon points={`${pt(1.88, 0.25, -4.8)} ${pt(2.32, 0.25, -4.8)} ${pt(2.38, 1.48, -4.8)} ${pt(1.94, 1.48, -4.8)}`} fill={river.deep} />
            <polygon points={`${pt(2.02, 2.12, -4.8)} ${pt(2.52, 2.12, -4.8)} ${pt(2.58, 4.45, -4.8)} ${pt(2.10, 4.45, -4.8)}`} fill={river.deep} />
          </g>
          {/* Kubus kardus & limbah tambahan di hulu dan tengah sungai */}
          <RiverTrashItem u={1.98} v={0.34} lift={-4.6} kind="box" />
          <RiverTrashItem u={2.16} v={0.82} lift={-4.6} kind="bag" />
          <RiverTrashItem u={2.12} v={1.32} lift={-4.6} kind="box" />
          <RiverTrashItem u={2.26} v={2.24} lift={-4.6} kind="box" />
          <RiverTrashItem u={2.16} v={2.76} lift={-4.6} kind="plastic" />
        </g>
      )}

      {/* Arus air sungai berjalan (animated flowing water currents) */}
      <path d={westStreamD} className="river-current river-current--alt" fill="none" stroke={river.currentAlt} strokeWidth="2.2" strokeLinecap="round" />
      <path d={eastStreamD} className="river-current river-current--slow" fill="none" stroke={river.currentAlt} strokeWidth="2" strokeLinecap="round" />
      <path d={mainStreamD} className="river-current" fill="none" stroke={river.currentMain} strokeWidth="2.8" strokeLinecap="round" />

      {/* Daratan Timur-Laut Kaki Gunung Terakota (Kawasan 2 - Industri / Hutan Kota) */}
      <IsoSlab u1={2.30} v1={-0.52} u2={4.88} v2={2.05} h={10} lift={-10} top={C.mintTop} left={C.mintL} right={C.mintR} />
      {/* Daratan Semenanjung Tenggara (Kawasan 4 - Perumahan / Apartemen Hijau) */}
      <IsoSlab u1={2.60} v1={1.92} u2={4.92} v2={4.48} h={10} lift={-10} top={C.mintTop} left={C.mintL} right={C.mintR} />

      {/* =====================================================================
          4. AIR TERJUN BERUNDAK DI TEPI TEBING & GUMPALAN AWAN LOW-POLY DI BAWAHNYA
          ===================================================================== */}
      {/* Bibir buih air terjun di tepi tebing selatan */}
      <IsoSlab u1={2.04} v1={4.54} u2={2.60} v2={4.66} h={4} lift={-8} top={river.foam} left={river.waterfallTop} right={river.waterfallLeft} />
      {/* Undakan atas air terjun menuruni tebing */}
      <IsoSlab u1={2.04} v1={4.58} u2={2.60} v2={4.70} h={34} lift={-40} top={river.waterfallTop} left={river.waterfallLeft} right={river.waterfallRight} />
      {/* Undakan tengah (stepped cascade ledge) */}
      <IsoSlab u1={2.02} v1={4.62} u2={2.62} v2={4.76} h={8} lift={-46} top={river.foam} left={river.waterfallTop} right={river.waterfallLeft} />
      {/* Undakan bawah air terjun jatuh menuju gumpalan awan */}
      <IsoSlab u1={2.06} v1={4.66} u2={2.58} v2={4.78} h={36} lift={-80} top={river.waterfallTop} left={river.waterfallLeft} right={river.waterfallRight} />

      {/* Garis-garis buih arus air terjun vertikal beranimasi */}
      <line x1={fallLeftTopX} y1={fallLeftTopY} x2={fallLeftBotX} y2={fallLeftBotY} className="waterfall-stream waterfall-stream--alt" stroke={river.currentAlt} strokeWidth="2.6" strokeLinecap="round" />
      <line x1={fallTopX} y1={fallTopY} x2={fallBotX} y2={fallBotY} className="waterfall-stream" stroke={river.foam} strokeWidth="3.6" strokeLinecap="round" />
      <line x1={fallRightTopX} y1={fallRightTopY} x2={fallRightBotX} y2={fallRightBotY} className="waterfall-stream waterfall-stream--alt" stroke={river.currentAlt} strokeWidth="2.6" strokeLinecap="round" />

      {/* Gumpalan awan putih/keruh low-poly & kubus percikan air di dasar air terjun */}
      <g className="isle-float">
        <IsoSlab u1={1.88} v1={4.62} u2={2.76} v2={5.08} h={12} lift={-84} top={river.cloudTop} left={river.cloudLeft} right={river.cloudRight} />
        <IsoSlab u1={2.04} v1={4.66} u2={2.58} v2={4.98} h={10} lift={-74} top={river.foam} left={river.cloudTop} right={river.cloudLeft} />
        {/* Kubus-kubus percikan awan low-poly yang menyebar di sekitar dasar air terjun (sesuai referensi) */}
        <IsoSlab u1={1.58} v1={4.52} u2={1.82} v2={4.76} h={9} lift={-72} top={river.cloudTop} left={river.cloudLeft} right={river.cloudRight} />
        <IsoSlab u1={1.68} v1={4.88} u2={1.96} v2={5.16} h={10} lift={-86} top={river.cloudTop} left={river.cloudLeft} right={river.cloudRight} />
        <IsoSlab u1={2.12} v1={5.15} u2={2.44} v2={5.46} h={11} lift={-92} top={river.cloudTop} left={river.cloudLeft} right={river.cloudRight} />
        <IsoSlab u1={2.78} v1={4.82} u2={3.06} v2={5.10} h={9} lift={-82} top={river.cloudTop} left={river.cloudLeft} right={river.cloudRight} />
        {/* Jika sungai tercemar parah, kotak kardus & sampah ikut terjun dan mengotori awan di bawah */}
        {turbidity === 'parah' && (
          <>
            <RiverTrashItem u={2.28} v={4.72} lift={-56} kind="box" />
            <RiverTrashItem u={2.14} v={4.92} lift={-70} kind="box" />
            <RiverTrashItem u={2.48} v={4.88} lift={-71} kind="plastic" />
          </>
        )}
      </g>

      {/* Percikan kabut uap air terjun dinamis (waterfall impact mist & spray) */}
      <g transform={`translate(${fallBotX.toFixed(1)} ${(fallBotY + 2).toFixed(1)})`} pointerEvents="none">
        <ellipse cx="0" cy="0" rx="14" ry="7" fill={river.foam} className="waterfall-mist-pulse" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#ffffff" className="waterfall-mist-pulse waterfall-mist-pulse--delay" opacity="0.75" />
        <circle cx="-5" cy="-2" r="2.2" fill="#ffffff" className="waterfall-droplet--1" />
        <circle cx="6" cy="-3" r="1.8" fill="#ffffff" className="waterfall-droplet--2" />
        <circle cx="1" cy="-5" r="2.0" fill={river.foam} className="waterfall-droplet--3" />
      </g>

      {/* =====================================================================
          5. GUNUNG BATU TERAKOTA-ORANYE TIMUR LAUT & PORTAL TEROWONGAN SUNGAI
          ===================================================================== */}
      {/* Blok Masif Terakota Kiri (tempat keluarnya sungai dari Portal Terowongan) */}
      <IsoSlab u1={1.48} v1={-1.02} u2={3.08} v2={-0.18} h={24} lift={0} top="#d9623b" left="#bf4f2b" right="#9e3d1e" />
      <IsoSlab u1={1.58} v1={-0.96} u2={2.98} v2={-0.24} h={16} lift={24} top="#f29544" left="#de792b" right="#bd6018" />
      <IsoSlab u1={1.74} v1={-0.88} u2={2.78} v2={-0.34} h={12} lift={40} top="#f7ad5c" left="#e68938" right="#c76d22" />

      {/* Blok Masif Terakota Kanan (berundak memanjang di sisi timur-laut sesuai referensi) */}
      <IsoSlab u1={3.14} v1={-1.02} u2={4.86} v2={0.18} h={24} lift={0} top="#d9623b" left="#bf4f2b" right="#9e3d1e" />
      <IsoSlab u1={3.24} v1={-0.94} u2={4.76} v2={0.08} h={16} lift={24} top="#f29544" left="#de792b" right="#bd6018" />
      <IsoSlab u1={3.42} v1={-0.84} u2={4.58} v2={-0.06} h={10} lift={40} top="#f7ad5c" left="#e68938" right="#c76d22" />

      {/* Portal Terowongan Gelap & Buih Air Keluar dari Gunung Terakota */}
      <polygon points={`${pt(1.80, -0.17, -2)} ${pt(2.26, -0.17, -2)} ${pt(2.26, -0.17, 17)} ${pt(1.80, -0.17, 17)}`} fill="#16193a" />
      <polygon points={`${pt(1.85, -0.16, -5)} ${pt(2.21, -0.16, -5)} ${pt(2.21, -0.16, 10)} ${pt(1.85, -0.16, 10)}`} fill={river.top} />
      <line x1={springTopX} y1={springTopY} x2={springBotX} y2={springBotY} className="waterfall-stream" stroke={river.foam} strokeWidth="3.2" strokeLinecap="round" />
      <IsoSlab u1={1.84} v1={-0.18} u2={2.22} v2={0.04} h={3} lift={-5} top={river.foam} left={river.waterfallTop} right={river.waterfallLeft} />

      {/* =====================================================================
          6. JALUR PEDESTRIAN TANAH KREM & JEMBATAN BATU KANAL TENGAH
          ===================================================================== */}
      {/* Jalur Boulevard Utara-Selatan melewati Balai Kota */}
      <polygon points={`${pt(-0.85, -0.15, 0.4)} ${pt(-0.55, -0.15, 0.4)} ${pt(-0.55, 0.95, 0.4)} ${pt(-0.85, 0.95, 0.4)}`} fill={C.pathTop} />
      <polygon points={`${pt(-0.85, 0.72, 0.4)} ${pt(1.08, 0.72, 0.4)} ${pt(1.08, 0.98, 0.4)} ${pt(-0.85, 0.98, 0.4)}`} fill={C.pathTop} />
      <polygon points={`${pt(0.82, 0.72, 0.4)} ${pt(1.08, 0.72, 0.4)} ${pt(1.08, 3.85, 0.4)} ${pt(0.82, 3.85, 0.4)}`} fill={C.pathTop} />

      {/* Jalur Barat-Timur melintasi Balai Kota menuju Jembatan Batu */}
      <polygon points={`${pt(-1.15, 1.68, 0.4)} ${pt(1.98, 1.68, 0.4)} ${pt(1.98, 1.96, 0.4)} ${pt(-1.15, 1.96, 0.4)}`} fill={C.pathTop} />
      <polygon points={`${pt(-1.28, 1.68, 0.4)} ${pt(-1.02, 1.68, 0.4)} ${pt(-1.02, 2.55, 0.4)} ${pt(-1.28, 2.55, 0.4)}`} fill={C.pathTop} />

      {/* Jembatan Batu Halus (Subtle Stone Footbridge) melintasi kanal sungai diagonal */}
      <IsoSlab u1={1.84} v1={1.58} u2={2.62} v2={2.04} h={6} lift={0} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      <IsoSlab u1={1.88} v1={1.58} u2={2.58} v2={1.66} h={4.5} lift={6} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      <IsoSlab u1={1.88} v1={1.96} u2={2.58} v2={2.04} h={4.5} lift={6} top={C.smoke} left={C.stoneL} right={C.stoneR} />

      {/* Jalur Pedestrian Timur membagi plot konstruksi modular */}
      <polygon points={`${pt(2.56, 1.68, 0.4)} ${pt(3.78, 1.68, 0.4)} ${pt(3.78, 1.96, 0.4)} ${pt(2.56, 1.96, 0.4)}`} fill={C.pathTop} />
      <polygon points={`${pt(3.52, 0.35, 0.4)} ${pt(3.78, 0.35, 0.4)} ${pt(3.78, 3.25, 0.4)} ${pt(3.52, 3.25, 0.4)}`} fill={C.pathTop} />

      {/* Pohon-pohon lanskap alami (kombinasi PineTree, RoundTree, dan BlockTree sesuai referensi) */}
      <PineTree u={-1.62} v={-0.55} lift={0} scale={0.88} tone="pine" />
      <PineTree u={-1.35} v={-0.62} lift={0} scale={0.74} tone="leaf" />
      <BlockTree u={-1.68} v={0.62} lift={0} scale={0.82} tone="bright" />
      <PineTree u={0.75} v={-0.52} lift={0} scale={0.84} tone="pine" />
      <BlockTree u={1.15} v={-0.38} lift={0} scale={0.78} tone="bright" />
      <PineTree u={2.68} v={0.05} lift={0} scale={0.86} tone="pine" />
      <RoundTree u={2.88} v={0.42} lift={0} scale={0.68} />
      <PineTree u={4.62} v={0.42} lift={0} scale={0.84} tone="pine" />

      {/* =====================================================================
          7. EFEK LANGSUNG KEBIJAKAN DI SELURUH KOTA
          ===================================================================== */}
      <CityWideEffects plots={plots} />
    </g>
  );
}

/**
 * Elemen lanskap latar depan, Balai Kota di pusat kota, dan partikel polusi
 * udara di langit kota.
 */
export function IslandForeground({
  avatar = 'rian',
  satisfaction = 50,
  plots = [null, null, null, null, null],
}: {
  avatar?: string;
  satisfaction?: number;
  plots?: (AssetId | null)[];
}) {
  const pollutionLevel = getPollutionLevel(plots);
  return (
    <g>
      <CityHallSection avatar={avatar} satisfaction={satisfaction} />
      {/* Kubus terakota dekoratif & pepohonan di tepi pulau sesuai referensi */}
      <RockCrop u={4.55} v={1.82} lift={0} w={0.30} d={0.30} h={12} tone="terra" />
      <BlockTree u={4.68} v={1.38} lift={0} scale={0.76} tone="bright" />
      <BlockTree u={-1.68} v={3.42} lift={0} scale={0.80} tone="bright" />
      <PineTree u={-1.62} v={3.98} lift={0} scale={0.86} tone="pine" />
      <PineTree u={-0.22} v={4.38} lift={0} scale={0.82} tone="leaf" />
      <BlockTree u={1.58} v={3.52} lift={0} scale={0.74} tone="bright" />
      <PineTree u={1.76} v={4.32} lift={0} scale={0.78} tone="pine" />
      <PineTree u={2.88} v={4.22} lift={0} scale={0.82} tone="pine" />
      <BlockTree u={4.68} v={4.12} lift={0} scale={0.82} tone="bright" />
      <AtmospherePollution level={pollutionLevel} plots={plots} />
    </g>
  );
}

function facePoints(
  side: 'left' | 'right',
  w: number,
  d: number,
  h: number,
  s0: number,
  s1: number,
  t0: number,
  t1: number,
) {
  const sx = side === 'left' ? -1 : 1;
  const p = (s: number, t: number) => `${sx * w - sx * s * w},${s * d - t * h}`;
  return `${p(s0, t0)} ${p(s1, t0)} ${p(s1, t1)} ${p(s0, t1)}`;
}

function SolarPanel({ gleamDelay = 0 }: { gleamDelay?: number }) {
  const w = 26;
  const front = 11;
  const back = 18;
  const p = (u: number, v: number) => {
    const x = (u + v - 1) * w;
    const y = u * (1 - v) * front - (1 - u) * v * back;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const line = (pts: string, sw = 1.2) => (
    <polyline points={pts} stroke={C.solarLine} strokeWidth={sw} fill="none" />
  );
  return (
    <g>
      <rect x="-11" y="-1" width="4" height="13" fill={C.stoneR} />
      <rect x="7" y="-1" width="4" height="13" fill={C.stoneR} />
      <polygon points={`${-w},3.5 0,${front + 3.5} ${w},3.5 0,${3.5 - back}`} fill={C.solarDark} />
      <polygon
        points={`${-w},0 0,${front} ${w},0 0,${-back}`}
        fill={C.solar}
        stroke={C.solarLine}
        strokeWidth="1.1"
      />
      {line(`${p(1 / 3, 0)} ${p(1 / 3, 1)}`)}
      {line(`${p(2 / 3, 0)} ${p(2 / 3, 1)}`)}
      {line(`${p(0, 1 / 3)} ${p(1, 1 / 3)}`)}
      {line(`${p(0, 2 / 3)} ${p(1, 2 / 3)}`)}
      {/* Kilau refleksi surya lembut di atas kaca panel */}
      <polygon
        className="solar-gleam"
        points={`${-w},0 0,${front} ${w},0 0,${-back}`}
        fill="#ffffff"
        style={{ animationDelay: `${gleamDelay}s` }}
      />
    </g>
  );
}

/** Kawasan Ladang Surya & Energi Bersih Terbuka (tanpa matahari mengambang) */
function Plts() {
  return (
    <g>
      {/* Hamparan 5 deret panel surya membentang mengikuti kontur perbukitan barat-laut */}
      <g transform={at(-0.52, 0.36, 14)}>
        <SolarPanel gleamDelay={0} />
      </g>
      <g transform={at(-0.14, 0.36, 14)}>
        <SolarPanel gleamDelay={0.7} />
      </g>
      <g transform={at(0.24, 0.36, 14)}>
        <SolarPanel gleamDelay={1.4} />
      </g>
      <g transform={at(-0.28, -0.04, 14)}>
        <SolarPanel gleamDelay={2.1} />
      </g>
      <g transform={at(0.14, -0.04, 14)}>
        <SolarPanel gleamDelay={2.8} />
      </g>
      {/* Gardu inverter & bank baterai penyimpanan */}
      <g transform={at(-0.46, -0.34, 14)}>
        <Box h={22} inset={46} top={C.smoke} left={C.steelL} right={C.steelR} />
        <polygon points={facePoints('left', 18, 9, 22, 0.2, 0.8, 0.45, 0.72)} fill={C.leafTop} />
      </g>
      <g transform={at(-0.18, -0.42, 14)}>
        <Box h={16} inset={50} top={C.steelTop} left={C.steelL} right={C.steelR} />
      </g>
      {/* Dua turbin angin tinggi di punggung bukit dengan baling-baling berputar halus */}
      {[
        [0.12, -0.42],
        [0.46, -0.28],
      ].map(([tu, tv], i) => (
        <g key={i} transform={at(tu, tv, 14)}>
          <rect x="-2" y="-52" width="4" height="52" fill={C.smoke} />
          <g transform="translate(0 -52)">
            <g className={i === 0 ? 'wind-turbine-blades' : 'wind-turbine-blades wind-turbine-blades--alt'}>
              <polygon points="0,0 -2,-21 2,-21" fill={C.smoke} />
              <polygon points="0,0 18,10 16,13" fill={C.smoke} />
              <polygon points="0,0 -18,10 -16,13" fill={C.smoke} />
            </g>
            <circle cx="0" cy="0" r="3.2" fill={C.steelL} />
          </g>
        </g>
      ))}
      <IsoWorker u={-0.12} v={0.56} lift={14} shirt="cyan" hat="helmet-white" tool="wiper" action="wipe" />
      <IsoWorker u={0.38} v={0.28} lift={14} shirt="yellow" hat="helmet-white" tool="clipboard" action="patrol" delay={0.3} flip />
      <IsoWorker u={-0.48} v={-0.08} lift={14} shirt="blue" hat="helmet-yellow" tool="wrench" action="dig" delay={0.6} />
    </g>
  );
}

/** Kawasan Pembangkit Listrik Batu Bara (PLTU) & Lapangan Batu Bara */
function Pltu() {
  const w = 64 - 22;
  const d = 32 - 11;
  return (
    <g>
      {/* Bayangan PLTU jatuh ke arah belakang bangunan pembangkit */}
      <polygon
        points={`${pt(-0.72, -0.68, 14)} ${pt(0.18, -0.68, 14)} ${pt(0.18, 0.12, 14)} ${pt(-0.72, 0.12, 14)}`}
        fill={C.coalLight}
        opacity="0.32"
      />
      <g transform={at(-0.42, -0.36, 14)}>
        <Box h={16} inset={42} top={C.coalLight} left={C.coal} right={C.coal} />
      </g>
      <Box h={36} inset={22} lift={14} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
      <g transform={at(0, 0, 50)}>
        <polygon points={`-${w},0 0,${d} 0,${d - 10} -${w},-6`} fill={C.coal} />
        <polygon points={`${w},0 0,${d} 0,${d - 10} ${w},-6`} fill={C.coalLight} />
        <polygon points={`-${w},-6 0,${d - 10} ${w},-6 0,${-d - 4}`} fill={C.stoneR} />
      </g>
      <g transform="translate(0 -14)">
        <polygon points={facePoints('left', w, d, 36, 0.16, 0.84, 0.42, 0.68)} fill={C.glass} />
        <polygon points={facePoints('right', w, d, 36, 0.16, 0.84, 0.42, 0.68)} fill={C.glass} />
      </g>
      {/* Dua cerobong asap raksasa dengan animasi asap mengebul dinamis */}
      <g transform={at(-0.22, 0.14, 52)}>
        <Box h={72} inset={49} top={C.coalLight} left={C.coal} right={C.coal} />
        <rect x="-15" y="-56" width="30" height="6" fill={C.smoke} />
        <rect x="-15" y="-36" width="30" height="6" fill={C.smoke} />
        <SmokePlume x={0} y={-76} scale={1.15} variant="billow" />
      </g>
      <g transform={at(0.16, -0.2, 52)}>
        <Box h={56} inset={51} top={C.coalLight} left={C.coal} right={C.coal} />
        <rect x="-13" y="-42" width="26" height="5.5" fill={C.smoke} />
        <SmokePlume x={0} y={-60} scale={0.92} variant="billow" />
      </g>
      <g transform={at(0.42, 0.08, 14)}>
        <Box h={28} inset={49} top={C.steelTop} left={C.steelL} right={C.steelR} />
      </g>
      <g transform={at(-0.12, 0.44, 14)}>
        <Box h={16} inset={42} top={C.coalLight} left={C.coal} right={C.coal} />
        <Box h={12} inset={51} lift={16} top={C.coalLight} left={C.coal} right={C.coal} />
      </g>
      <IsoWorker u={-0.42} v={0.44} lift={14} shirt="orange" hat="helmet-yellow" tool="shovel" action="dig" />
      <IsoWorker u={0.28} v={0.44} lift={14} shirt="coal" hat="helmet-yellow" tool="box" action="lift" delay={0.35} flip />
      <IsoWorker u={0.48} v={-0.18} lift={14} shirt="blue" hat="helmet-white" tool="wrench" action="patrol-v" delay={0.7} />
    </g>
  );
}

/**
 * Pilar silinder beton (Cylindrical Pillar Stilt) bergaya 3D clay render
 * lengkap dengan bayangan kontak ambient occlusion dan kepala pilar (pier cap).
 */
function CylindricalPillarStilt({
  u,
  v,
  groundLift = 14,
  topLift,
  radius = 5.4,
}: {
  u: number;
  v: number;
  groundLift?: number;
  topLift: number;
  radius?: number;
}) {
  const [bx, by] = ptXY(u, v, groundLift);
  const h = Math.max(4, topLift - groundLift);
  const r = radius;
  const ry = radius * 0.52;

  return (
    <g transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}>
      {/* Bayangan kontak ambient occlusion halus di pangkal pilar silinder */}
      <ellipse cx="0" cy="0.8" rx={r * 1.85} ry={ry * 1.85} fill="#0f172a" opacity="0.22" />
      <ellipse cx="0" cy="0.4" rx={r * 1.35} ry={ry * 1.35} fill="#0f172a" opacity="0.30" />

      {/* Alas cincin beton silinder */}
      <ellipse cx="0" cy="0" rx={r * 1.15} ry={ry * 1.15} fill="#94a3b8" />
      <ellipse cx="0" cy="-1.2" rx={r * 1.12} ry={ry * 1.12} fill="#cbd5e1" />

      {/* Batang silinder beton vertikal (3-gradasi clay shading tanpa garis tepi kaku) */}
      <rect x={-r} y={-h} width={r * 2} height={h} fill="#cbd5e1" />
      <rect x={-r} y={-h} width={r * 0.82} height={h} fill="#f1f5f9" />
      <rect x={r * 0.25} y={-h} width={r * 0.75} height={h} fill="#94a3b8" />
      <ellipse cx="0" cy="0" rx={r} ry={ry} fill="#cbd5e1" />

      {/* Bayangan ambient occlusion di leher atas pilar tepat di bawah dek jembatan */}
      <rect x={-r} y={-h} width={r * 2} height={Math.min(5, h * 0.32)} fill="#475569" opacity="0.45" />

      {/* Kepala pilar beton melebar (Crosshead Pier Cap) penyangga girder jalan layang */}
      <polygon
        points={`${-r * 1.55},${-h + 2.5} ${0},${-h + 5.2} ${r * 1.55},${-h + 2.5} ${r * 1.25},${-h + 6.2} ${0},${-h + 8.5} ${-r * 1.25},${-h + 6.2}`}
        fill="#94a3b8"
      />
      <polygon
        points={`${-r * 1.65},${-h - 1.2} ${0},${-h + 2.2} ${r * 1.65},${-h - 1.2} ${0},${-h - 4.4}`}
        fill="#e2e8f0"
      />
    </g>
  );
}

/**
 * Lampu jalan miniatur (Overhead Miniature Streetlight) di sepanjang pembatas
 * beton jalan tol layang.
 */
function HighwayStreetlight({
  x,
  y,
  side,
}: {
  x: number;
  y: number;
  side: 'back' | 'front';
}) {
  const armDx = side === 'back' ? -5.5 : 5.5;
  const armDy = side === 'back' ? 2.8 : -2.8;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      {/* Dudukan tiang lampu pada parapet beton */}
      <ellipse cx="0" cy="0" rx="1.8" ry="1.0" fill="#64748b" />
      {/* Tiang lengkung logam halus */}
      <path
        d={`M 0,0 L 0,-11.5 Q 0,-14.2 ${armDx * 0.65},${-14.2 + armDy * 0.5} L ${armDx},${-13.8 + armDy}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      {/* Tudung lampu LED clay miniatur */}
      <ellipse
        cx={armDx}
        cy={-13.8 + armDy}
        rx="2.5"
        ry="1.3"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="0.5"
      />
      {/* Pendar cahaya lembut lampu jalan tol */}
      <ellipse
        cx={armDx}
        cy={-13.1 + armDy}
        rx="2.1"
        ry="1.0"
        fill="#fef08a"
        opacity="0.92"
      />
      <ellipse
        cx={armDx}
        cy={-12.5 + armDy}
        rx="4.2"
        ry="2.2"
        fill="#fef08a"
        opacity="0.22"
      />
    </g>
  );
}

/**
 * Koridor Jalan Tol Layang Dalam Kota (Elevated Urban Highway Flyover):
 * - Jalan tol beton layang ramping yang menanjak mulus dari permukaan tanah
 *   dan melengkung halus melintasi ubin diorama.
 * - Ditopang oleh tiang-tiang pilar silinder beton bersih di atas hamparan
 *   rumput hijau dan jalur pedestrian krem di bawah jembatan.
 * - Bayangan kontak ambient occlusion (AO) lembut di bawah jembatan layang.
 * - Permukaan aspal hitam arang halus dengan marka garis kuning dan garis
 *   putih putus-putus yang tajam, pembatas jalan beton (highway barriers),
 *   serta lampu jalan miniatur di sepanjang jalan layang.
 * - Kendaraan tol dirender pada layer dinamis terpisah (`TolTrafficLayer`)
 *   agar dapat bergerak tanpa me-render ulang pulau.
 */
function Tol() {
  const N = 18;
  const ts = Array.from({ length: N + 1 }, (_, i) => i / N);

  const roadXY = (t: number, offset: number, extraLift = 0): [number, number] => {
    const s = sampleTolFlyoverSpine(t);
    const u = s.u - offset * 0.24;
    const v = s.v + offset;
    const lift = s.lift + extraLift;
    return ptXY(u, v, lift);
  };

  const groundXY = (t: number, offset: number, lift = 14.3): [number, number] => {
    const s = sampleTolFlyoverSpine(t);
    const u = s.u - offset * 0.24;
    const v = s.v + offset;
    return ptXY(u, v, lift);
  };

  const polyPts = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const pathD = (pts: [number, number][]) =>
    pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');

  // 1. Bayangan Ambient Occlusion (AO) di atas rumput & jalur pedestrian di bawah flyover
  const shadowOuterPts: [number, number][] = [
    ...ts.map((t) => groundXY(t, -0.34, 14.2)),
    ...[...ts].reverse().map((t) => groundXY(t, 0.36, 14.2)),
  ];
  const shadowCorePts: [number, number][] = [
    ...ts.map((t) => groundXY(t, -0.24, 14.3)),
    ...[...ts].reverse().map((t) => groundXY(t, 0.26, 14.3)),
  ];

  // 2. Permukaan aspal arang gelap halus (offset -0.255 s/d +0.255)
  const asphaltPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, -0.255, 0)),
    ...[...ts].reverse().map((t) => roadXY(t, 0.255, 0)),
  ];

  // 3. Fasia dinding beton samping dek jalan layang (box-girder side profile)
  const deckSideFrontPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, 0.295, 0)),
    ...[...ts].reverse().map((t) => roadXY(t, 0.295, -5.8)),
  ];
  const deckSideUnderPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, 0.295, -5.8)),
    ...[...ts].reverse().map((t) => roadXY(t, 0.16, -7.2)),
  ];

  // Dinding penahan tanjakan (Ramp Abutment) di pangkal barat-laut & ujung tenggara
  const nwRampPts = ts.slice(0, 5);
  const nwAbutmentWall: [number, number][] = [
    ...nwRampPts.map((t) => roadXY(t, 0.295, -5.2)),
    ...[...nwRampPts].reverse().map((t) => groundXY(t, 0.295, 14.0)),
  ];
  const seRampPts = ts.slice(N - 4);
  const seAbutmentWall: [number, number][] = [
    ...seRampPts.map((t) => roadXY(t, 0.295, -5.2)),
    ...[...seRampPts].reverse().map((t) => groundXY(t, 0.295, 14.0)),
  ];

  // 4. Pembatas jalan beton belakang (Back/NE Concrete Highway Barrier)
  const backBarrierTopPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, -0.295, 3.6)),
    ...[...ts].reverse().map((t) => roadXY(t, -0.245, 3.6)),
  ];
  const backBarrierInnerPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, -0.245, 3.6)),
    ...[...ts].reverse().map((t) => roadXY(t, -0.245, 0)),
  ];

  // 5. Pembatas jalan beton depan (Front/SW Concrete Highway Barrier)
  const frontBarrierTopPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, 0.245, 3.0)),
    ...[...ts].reverse().map((t) => roadXY(t, 0.295, 3.0)),
  ];
  const frontBarrierOuterPts: [number, number][] = [
    ...ts.map((t) => roadXY(t, 0.295, 3.0)),
    ...[...ts].reverse().map((t) => roadXY(t, 0.295, 0)),
  ];

  // 6. Marka jalan: garis kuning tengah & garis putih putus-putus di kedua lajur
  const centerYellowD = pathD(ts.map((t) => roadXY(t, 0, 0.2)));
  const laneBackWhiteD = pathD(ts.map((t) => roadXY(t, -0.125, 0.2)));
  const laneFrontWhiteD = pathD(ts.map((t) => roadXY(t, 0.125, 0.2)));
  const edgeBackWhiteD = pathD(ts.map((t) => roadXY(t, -0.225, 0.15)));
  const edgeFrontWhiteD = pathD(ts.map((t) => roadXY(t, 0.225, 0.15)));

  // Posisi 3 pasang pilar silinder beton di bentang tengah jalan layang
  const pillarStops = [0.26, 0.50, 0.74];
  // Posisi lampu jalan miniatur di sepanjang kedua sisi jalan layang
  const lightStops = [0.16, 0.38, 0.62, 0.84];

  return (
    <g>
      {/* =====================================================================
          1. HAMPARAN RUMPUT HIJAU & JALUR PEDESTRIAN DI BAWAH JALAN LAYANG
          ===================================================================== */}
      {/* Hamparan rumput taman halus di dasar ubin jalan layang */}
      <polygon
        points={`${pt(-0.88, -0.68, 14)} ${pt(0.88, -0.68, 14)} ${pt(0.88, 0.82, 14)} ${pt(-0.88, 0.82, 14)}`}
        fill={C.mintTop}
        opacity="0.92"
      />
      {/* Jalur pedestrian krem bersih yang melintas di bawah bentang tengah flyover */}
      <polygon
        points={`${pt(-0.18, -0.66, 14.1)} ${pt(0.14, -0.66, 14.1)} ${pt(-0.08, 0.78, 14.1)} ${pt(-0.40, 0.78, 14.1)}`}
        fill={C.pathEdge}
      />
      <polygon
        points={`${pt(-0.15, -0.66, 14.2)} ${pt(0.11, -0.66, 14.2)} ${pt(-0.11, 0.78, 14.2)} ${pt(-0.37, 0.78, 14.2)}`}
        fill={C.pathTop}
      />
      {/* Cabang jalur pedestrian menuju plaza kota */}
      <polygon
        points={`${pt(-0.02, -0.08, 14.2)} ${pt(0.76, -0.08, 14.2)} ${pt(0.76, 0.14, 14.2)} ${pt(-0.06, 0.14, 14.2)}`}
        fill={C.pathTop}
      />

      {/* Pohon taman belakang di tepi jalur pedestrian */}
      <RoundTree u={-0.38} v={-0.54} lift={14} scale={0.56} />
      <RoundTree u={0.52} v={-0.38} lift={14} scale={0.58} />

      {/* =====================================================================
          2. BAYANGAN KONTAK AMBIENT OCCLUSION (AO) DI BAWAH JEMBATAN LAYANG
          ===================================================================== */}
      <polygon points={polyPts(shadowOuterPts)} fill="#0f172a" opacity="0.14" />
      <polygon points={polyPts(shadowCorePts)} fill="#0f172a" opacity="0.22" />

      {/* =====================================================================
          3. TIANG PILAR SILINDER BETON (CYLINDRICAL PILLAR STILTS)
          ===================================================================== */}
      {pillarStops.map((t) => {
        const s = sampleTolFlyoverSpine(t);
        const uBack = s.u - (-0.13) * 0.24;
        const vBack = s.v + -0.13;
        const uFront = s.u - 0.14 * 0.24;
        const vFront = s.v + 0.14;
        return (
          <g key={t}>
            <CylindricalPillarStilt
              u={uBack}
              v={vBack}
              groundLift={14.2}
              topLift={s.lift - 4.8}
              radius={4.8}
            />
            <CylindricalPillarStilt
              u={uFront}
              v={vFront}
              groundLift={14.2}
              topLift={s.lift - 4.8}
              radius={5.2}
            />
          </g>
        );
      })}

      {/* Dinding tumpuan tanjakan beton (Ramp Abutments) di kedua ujung */}
      <polygon points={polyPts(nwAbutmentWall)} fill="#94a3b8" />
      <polygon points={polyPts(seAbutmentWall)} fill="#94a3b8" />

      {/* =====================================================================
          4. DEK BETON JALAN LAYANG, ASPAL HITAM ARANG, MARKA & PEMBATAS BETON
          ===================================================================== */}
      {/* Sisi bawah & samping box-girder beton jalan layang */}
      <polygon points={polyPts(deckSideUnderPts)} fill="#64748b" />
      <polygon points={polyPts(deckSideFrontPts)} fill="#cbd5e1" />

      {/* Pembatas jalan beton sisi belakang (Rear Concrete Highway Barrier) */}
      <polygon points={polyPts(backBarrierInnerPts)} fill="#cbd5e1" />
      <polygon points={polyPts(backBarrierTopPts)} fill="#f8fafc" />

      {/* Lampu jalan miniatur sisi belakang */}
      {lightStops.map((t) => {
        const [lx, ly] = roadXY(t, -0.27, 3.6);
        return <HighwayStreetlight key={`b-${t}`} x={lx} y={ly} side="back" />;
      })}

      {/* Permukaan jalan raya aspal arang gelap halus (Dark Charcoal Smooth Asphalt) */}
      <polygon points={polyPts(asphaltPts)} fill="#1e293b" />

      {/* Garis bahu jalan putih tipis di kedua tepi dalam aspal */}
      <path d={edgeBackWhiteD} fill="none" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.65" />
      <path d={edgeFrontWhiteD} fill="none" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.65" />

      {/* Marka garis kuning pemisah arah di tengah jalan tol */}
      <path
        d={centerYellowD}
        fill="none"
        stroke="#facc15"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/* Marka garis putih putus-putus tajam di kedua lajur berkendara */}
      <path
        d={laneBackWhiteD}
        fill="none"
        stroke="#f8fafc"
        strokeWidth="1.25"
        strokeDasharray="5.5 6.5"
        strokeLinecap="round"
      />
      <path
        d={laneFrontWhiteD}
        fill="none"
        stroke="#f8fafc"
        strokeWidth="1.25"
        strokeDasharray="5.5 6.5"
        strokeLinecap="round"
      />

      {/* Pembatas jalan beton sisi depan (Front Concrete Highway Barrier) */}
      <polygon points={polyPts(frontBarrierOuterPts)} fill="#e2e8f0" />
      <polygon points={polyPts(frontBarrierTopPts)} fill="#f8fafc" />

      {/* Lampu jalan miniatur sisi depan */}
      {lightStops.map((t) => {
        const [lx, ly] = roadXY(t, 0.27, 3.0);
        return <HighwayStreetlight key={`f-${t}`} x={lx} y={ly} side="front" />;
      })}

      {/* Pepohonan bulat di taman depan bawah jalan layang */}
      <RoundTree u={-0.52} v={0.48} lift={14} scale={0.60} />
      <RoundTree u={0.28} v={0.62} lift={14} scale={0.56} />
    </g>
  );
}

/** Koridor Transit BRT Listrik Terpadu & Jalur Hijau Sepeda */
function Brt() {
  return (
    <g>
      {/* Koridor panjang aspal khusus bus & jalur hijau sepeda */}
      <g transform={at(0.08, 0.14, 14)}>
        <polygon points="-68,20 28,-28 60,-12 -36,36" fill={C.asphalt} />
        <polygon points="-64,24 32,-24 38,-21 -58,27" fill={C.bus} opacity="0.75" />
        <polygon points="-56,28 40,-20 45,-17.5 -51,30.5" fill={C.leafTop} />
        {[-8, -2, 4].map((offset) => (
          <polygon
            key={offset}
            points={`${-24 + offset},${10 + offset * 0.5} ${-15 + offset},${5.5 + offset * 0.5} ${-12 + offset},${7 + offset * 0.5} ${-21 + offset},${11.5 + offset * 0.5}`}
            fill={C.asphaltLine}
          />
        ))}
      </g>
      {/* Halte pusat BRT beratap panel surya */}
      <g transform={at(-0.18, -0.16, 14)}>
        <Box h={26} inset={28} top={C.glass} left={C.steelL} right={C.steelR} />
        <polygon points={facePoints('left', 36, 18, 26, 0.1, 0.9, 0.18, 0.82)} fill={C.glass} />
        <polygon points={facePoints('right', 36, 18, 26, 0.1, 0.9, 0.18, 0.82)} fill={C.glass} />
        <g transform={at(0, 0, 26)}>
          <Box h={4} inset={24} top={C.smoke} left={C.steelL} right={C.steelR} />
          <polygon points="-20,-5 0,5 20,-5 0,-15" fill={C.solar} />
        </g>
      </g>
      {/* Tiga armada bus listrik biru beroperasi lancar di koridor */}
      <g transform={at(0.32, -0.1, 15)}>
        <Box h={20} inset={44} top={C.bus} left={C.bus} right={C.busDark} />
        <polygon points={facePoints('right', 20, 10, 20, 0.12, 0.88, 0.42, 0.78)} fill={C.glass} />
        <polygon points={facePoints('left', 20, 10, 20, 0.12, 0.88, 0.42, 0.78)} fill={C.glass} />
      </g>
      <g transform={at(0.02, 0.18, 15)}>
        <Box h={19} inset={46} top={C.bus} left={C.bus} right={C.busDark} />
        <polygon points={facePoints('right', 18, 9, 19, 0.14, 0.86, 0.42, 0.78)} fill={C.glass} />
        <polygon points={facePoints('left', 18, 9, 19, 0.14, 0.86, 0.42, 0.78)} fill={C.glass} />
      </g>
      <RoundTree u={-0.52} v={0.08} lift={14} scale={0.58} />
      <RoundTree u={0.48} v={0.22} lift={14} scale={0.58} />
      <IsoWorker u={0.18} v={0.42} lift={14} shirt="blue" hat="cap-blue" tool="flag" action="wave" />
      <IsoWorker u={-0.28} v={0.38} lift={14} shirt="green" hat="hair-dark" tool="clipboard" action="patrol" delay={0.25} />
      <IsoWorker u={-0.42} v={0.12} lift={14} shirt="warm" hat="straw" tool="box" action="bob" delay={0.5} />
    </g>
  );
}

/** Kawasan Industri Berat & Gudang Logistik di Lembah Utara (tanpa polygon hitam, dengan asap kelabu periodik) */
function Industri() {
  return (
    <g>
      <g transform={at(-0.14, -0.06, 14)}>
        <Box h={34} inset={24} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
        <polygon points="-40,-34 0,-14 0,-24 -40,-42" fill={C.steelL} />
        <polygon points="40,-34 0,-14 0,-24 40,-42" fill={C.steelR} />
        <polygon points="-40,-42 0,-24 40,-42 0,-58" fill={C.steelTop} />
        <polygon points={facePoints('left', 40, 20, 34, 0.14, 0.86, 0.44, 0.72)} fill={C.glass} />
        <polygon points={facePoints('right', 40, 20, 34, 0.28, 0.72, 0.0, 0.55)} fill={C.coal} />
      </g>
      {/* Tiga silo baja industri & cerobong asap pabrik dengan kepulan asap kelabu periodik */}
      <g transform={at(0.32, -0.28, 14)}>
        <Box h={46} inset={50} top={C.steelTop} left={C.steelL} right={C.steelR} />
        <rect x="-14" y="-36" width="28" height="4" fill={C.steelR} />
        <SmokePlume x={0} y={-48} scale={0.78} variant="periodic" />
      </g>
      <g transform={at(0.46, 0.02, 14)}>
        <Box h={38} inset={51} top={C.steelTop} left={C.steelL} right={C.steelR} />
        <rect x="-13" y="-28" width="26" height="4" fill={C.steelR} />
      </g>
      <g transform={at(-0.46, -0.28, 14)}>
        <Box h={52} inset={52} top={C.coalLight} left={C.coal} right={C.coal} />
        <SmokePlume x={0} y={-56} scale={1.08} variant="periodic" />
      </g>
      {/* Lapangan peti kemas kargo */}
      <g transform={at(-0.34, 0.34, 14)}>
        <Box h={14} inset={46} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <Box h={13} inset={47} lift={14} top={C.warmTop} left={C.warmL} right={C.warmR} />
      </g>
      <g transform={at(0.06, 0.42, 14)}>
        <Box h={14} inset={48} top={C.bus} left={C.bus} right={C.busDark} />
      </g>
      <IsoWorker u={-0.12} v={0.46} lift={14} shirt="orange" hat="helmet-yellow" tool="box" action="lift" />
      <IsoWorker u={0.34} v={0.34} lift={14} shirt="blue" hat="helmet-white" tool="wrench" action="dig" delay={0.3} flip />
      <IsoWorker u={-0.44} v={0.08} lift={14} shirt="yellow" hat="helmet-yellow" tool="clipboard" action="patrol-v" delay={0.6} />
    </g>
  );
}

/** Kawasan Hutan Kota & Danau Resapan Ekologis di Lembah Utara */
function Hutan() {
  const round = (s: number) => (
    <g transform={`scale(${s})`}>
      <rect x="-4.5" y="-15" width="9" height="19" rx="3.5" fill={C.warmR} />
      <circle cx="0" cy="-31" r="20" fill={C.leafTop} />
      <circle cx="-12" cy="-21" r="14" fill={C.leafL} />
      <circle cx="13" cy="-22" r="13" fill={C.leafR} />
    </g>
  );
  const pine = (s: number) => (
    <g transform={`scale(${s})`}>
      <rect x="-4" y="-12" width="8" height="16" rx="3" fill={C.warmR} />
      <polygon points="-17,-12 0,-48 17,-12" fill={C.leafL} />
      <polygon points="-14,-24 0,-58 14,-24" fill={C.leafTop} />
      <polygon points="-10,-36 0,-66 10,-36" fill={C.leafR} />
    </g>
  );
  return (
    <g>
      <g transform={at(0.06, 0.16, 14)}>
        <polygon points="-42,0 0,21 42,0 0,-21" fill={C.warmTop} opacity="0.55" />
        <polygon points="-32,0 0,16 32,0 0,-16" fill={C.pond} />
        <polygon className="water-ripple" points="-16,0 0,8 16,0 0,-8" fill="none" stroke={C.foam} strokeWidth="1.2" />
        <polygon points="-12,5 5,-3.5 12,0 -5,8.5" fill={C.warmL} />
        <polygon points="-12,3 5,-5.5 12,-2 -5,6.5" fill={C.warmTop} />
      </g>
      <g transform={at(0.42, -0.06, 14)}>
        <Box h={13} inset={53} top={C.warmTop} left={C.warmL} right={C.warmR} />
        <polygon points="-15,-13 0,-5 15,-13 0,-24" fill={C.brickTop} />
      </g>
      {/* Rumpun pohon hutan kota yang lebat dan luas */}
      <g transform={at(-0.48, 0.28, 14)}>{round(0.95)}</g>
      <g transform={at(0.34, -0.38, 14)}>{pine(0.9)}</g>
      <g transform={at(-0.36, -0.32, 14)}>{round(0.88)}</g>
      <g transform={at(-0.04, -0.14, 14)}>{round(1.06)}</g>
      <g transform={at(0.24, 0.42, 14)}>{pine(0.78)}</g>
      <g transform={at(-0.52, -0.06, 14)}>{pine(0.76)}</g>
      <g transform={at(0.52, 0.24, 14)}>{round(0.78)}</g>
      <IsoWorker u={-0.18} v={0.42} lift={14} shirt="green" hat="straw" tool="watering" action="water" />
      <IsoWorker u={0.04} v={0.18} lift={16} shirt="warm" hat="hair-dark" tool="none" action="bob" delay={0.3} />
      <IsoWorker u={0.42} v={0.28} lift={14} shirt="blue" hat="cap-green" tool="none" action="patrol-v" delay={0.55} flip />
    </g>
  );
}

/** Klaster polygon 3D tumpukan sampah di daratan / bantaran sungai */
function TrashCluster({
  u,
  v,
  lift = 0,
  variant = 'mixed',
  smoke = false,
}: {
  u: number;
  v: number;
  lift?: number;
  variant?: 'mixed' | 'industrial' | 'bags';
  smoke?: boolean;
}) {
  return (
    <g transform={at(u, v, lift)}>
      {variant === 'industrial' ? (
        <>
          {/* Drum limbah oranye & kuning + kardus rusak */}
          <Box h={9} inset={55} top={C.sun} left={C.warmL} right={C.warmR} />
          <g transform="translate(9 4)">
            <Box h={7} inset={56} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
          </g>
          <g transform="translate(-8 5)">
            <Box h={5} inset={57} top={C.smoke} left={C.steelL} right={C.steelR} />
          </g>
          <polygon points="-13,3 -8,0 -3,3 -8,6" fill={C.glass} />
          <polygon points="3,8 8,5 12,8 7,11" fill={C.foam} />
        </>
      ) : variant === 'bags' ? (
        <>
          {/* Tumpukan kantong sampah plastik biru, putih & kardus */}
          <Box h={7} inset={55} top={C.bus} left={C.solar} right={C.riverDeep} />
          <g transform="translate(8 3.5)">
            <Box h={6} inset={56} top={C.foam} left={C.smoke} right={C.steelR} />
          </g>
          <g transform="translate(-7 4.5)">
            <Box h={5} inset={57} top={C.warmTop} left={C.warmL} right={C.warmR} />
          </g>
          <polygon points="-2,8 3,5 7,8 2,11" fill={C.sun} />
          <polygon points="-12,2 -7,-1 -3,2 -8,5" fill={C.brickTop} />
        </>
      ) : (
        <>
          {/* Campuran kardus, plastik, botol, dan karung sampah */}
          <Box h={8} inset={54} top={C.warmTop} left={C.warmL} right={C.warmR} />
          <g transform="translate(8 4)">
            <Box h={6} inset={56} top={C.glass} left={C.riverMid} right={C.riverDeep} />
          </g>
          <g transform="translate(-8 4)">
            <Box h={6} inset={56} top={C.foam} left={C.smoke} right={C.steelR} />
          </g>
          <polygon points="-3,8 2,5 7,8 2,11" fill={C.brickTop} />
          <polygon points="5,-2 9,-4 13,-2 9,0" fill={C.sun} />
        </>
      )}
      {smoke && <SmokePlume x={0} y={-9} scale={0.85} variant="trash" />}
    </g>
  );
}

/** Polygon sampah 3D yang mengapung & hanyut di atas aliran air sungai */
function RiverTrashItem({
  u,
  v,
  lift = -4.6,
  kind = 'plastic',
}: {
  u: number;
  v: number;
  lift?: number;
  kind?: 'plastic' | 'box' | 'barrel' | 'bag';
}) {
  return (
    <g transform={at(u, v, lift)}>
      {/* Riak buih kecil di sekitar sampah yang mengapung */}
      <polygon
        className="water-ripple"
        points="-10,0 0,-5 10,0 0,5"
        fill="none"
        stroke={C.foam}
        strokeWidth="0.9"
      />
      {kind === 'barrel' && (
        <>
          <Box h={5} inset={56} top={C.sun} left={C.brickLeft} right={C.brickRight} />
          <polygon points="5,2 9,0 12,2 8,4" fill={C.foam} />
        </>
      )}
      {kind === 'box' && (
        <>
          <Box h={4.5} inset={56} top={C.warmTop} left={C.warmL} right={C.warmR} />
          <polygon points="-8,2 -4,0 0,2 -4,4" fill={C.glass} />
        </>
      )}
      {kind === 'bag' && (
        <>
          <Box h={4.5} inset={56} top={C.foam} left={C.smoke} right={C.steelR} />
          <polygon points="4,2 8,0 11,2 7,4" fill={C.brickTop} />
        </>
      )}
      {kind === 'plastic' && (
        <>
          <polygon points="-6,0 -1,-3 4,0 -1,3" fill={C.foam} />
          <polygon points="1,2 6,-1 10,2 5,5" fill={C.sun} />
          <polygon points="-4,3 0,1 3,3 -1,5" fill={C.brickTop} />
        </>
      )}
    </g>
  );
}

/** Kawasan Gunung Sampah TPA Terbuka di Lembah Selatan (dengan asap kelabu halus periodik) */
function Tpa() {
  return (
    <g>
      {/* Tumpukan ceceran sampah 3D di sisi timur bukit TPA dengan asap halus */}
      <TrashCluster u={0.34} v={0.22} lift={14} variant="bags" smoke />
      {/* Dua bukit sampah terbuka raksasa dengan partikel asap kelabu halus secara periodik */}
      <g transform={at(-0.08, -0.08, 14)}>
        <Box h={22} inset={16} top={C.warmL} left={C.warmL} right={C.warmR} />
        <Box h={19} inset={28} lift={22} top={C.stoneL} left={C.stoneL} right={C.stoneR} />
        <Box h={15} inset={42} lift={41} top={C.warmTop} left={C.warmL} right={C.warmR} />
        {[
          [-26, -22, C.glass],
          [14, -20, C.leafTop],
          [-8, -38, C.brickTop],
          [20, -34, C.smoke],
          [-28, -10, C.sun],
          [8, -48, C.bus],
        ].map(([x, y, fill], i) => (
          <rect key={i} x={x as number} y={y as number} width="7.5" height="5.5" rx="1.5" fill={fill as string} />
        ))}
        <g transform="translate(4 -56)">
          <Box h={9} inset={56} top={C.sun} left={C.warmL} right={C.warmR} />
        </g>
        {/* Partikel asap kelabu halus muncul periodik dari puncak & lereng gunung sampah */}
        <SmokePlume x={2} y={-62} scale={1.15} variant="trash" />
        <SmokePlume x={-16} y={-38} scale={0.95} variant="trash" />
        <SmokePlume x={18} y={-28} scale={0.9} variant="trash" />
      </g>
      <g transform={at(-0.42, 0.22, 14)}>
        <Box h={15} inset={50} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
      </g>
      <g transform={at(0.06, 0.42, 14)}>
        <Box h={18} inset={46} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <g transform="translate(11 5.5)">
          <Box h={14} inset={54} top={C.smoke} left={C.steelL} right={C.steelR} />
        </g>
        <polygon points={facePoints('right', 18, 9, 18, 0.12, 0.52, 0.48, 0.84)} fill={C.glass} />
      </g>
      <IsoWorker u={-0.28} v={0.42} lift={14} shirt="yellow" hat="helmet-yellow" tool="rake" action="wipe" />
      <IsoWorker u={0.32} v={0.42} lift={14} shirt="orange" hat="helmet-yellow" tool="box" action="lift" delay={0.3} flip />
      <IsoWorker u={-0.02} v={0.56} lift={14} shirt="orange" hat="helmet-white" tool="flag" action="wave" delay={0.6} />
    </g>
  );
}

/** Kawasan Pusat Daur Ulang 3R & PLTSa Bersih */
function Daurulang() {
  return (
    <g>
      <g transform={at(-0.06, -0.08, 14)}>
        <Box h={32} inset={20} top={C.glass} left={C.leafL} right={C.leafR} />
        <polygon points={facePoints('left', 44, 22, 32, 0.18, 0.82, 0.38, 0.74)} fill={C.smoke} />
        <polygon points={facePoints('right', 44, 22, 32, 0.22, 0.78, 0.0, 0.56)} fill={C.coal} />
        <g transform={at(0, 0, 32)}>
          <polygon points={diamond(14)} fill={C.warmTop} />
          <polygon points="-24,-2 0,10 24,-2 0,-14" fill={C.solar} />
        </g>
      </g>
      {[
        [-0.36, C.leafTop, C.leafL],
        [0, C.sun, C.warmL],
        [0.36, C.bus, C.busDark],
      ].map(([u, top, side], i) => (
        <g key={i} transform={at(u as number, 0.36, 14)}>
          <Box h={19} inset={47} top={top as string} left={side as string} right={side as string} />
        </g>
      ))}
      <RoundTree u={-0.52} v={0.06} lift={14} scale={0.56} />
      <IsoWorker u={-0.18} v={0.46} lift={14} shirt="green" hat="helmet-white" tool="box" action="lift" />
      <IsoWorker u={0.18} v={0.46} lift={14} shirt="cyan" hat="cap-green" tool="wiper" action="wipe" delay={0.35} flip />
      <IsoWorker u={0.42} v={0.12} lift={14} shirt="white" hat="helmet-white" tool="clipboard" action="patrol-v" delay={0.65} />
    </g>
  );
}

/** Kawasan Perumahan Tapak Horizontal Padat (memakan lahan resapan tenggara) */
function Perumahan() {
  const house = (roofSide: string, roofTop: string) => (
    <g>
      <Box h={19} inset={45} top={C.smoke} left={C.steelL} right={C.steelR} />
      <polygon points={facePoints('left', 19, 9.5, 19, 0.34, 0.66, 0.0, 0.58)} fill={C.ink} />
      <polygon points={facePoints('right', 19, 9.5, 19, 0.26, 0.74, 0.32, 0.72)} fill={C.glass} />
      <g transform="translate(0 -19)">
        <polygon points="-22,1 0,12 0,-1.5 -22,-12.5" fill={roofSide} />
        <polygon points="22,1 0,12 0,-1.5 22,-12.5" fill={roofSide} />
        <polygon points="-22,-12.5 0,-1.5 22,-12.5 0,-23.5" fill={roofTop} />
      </g>
    </g>
  );
  return (
    <g>
      {/* Hamparan beton & jalan aspal menutup seluruh kawasan */}
      <polygon
        points={`${pt(-0.68, -0.58, 14)} ${pt(0.68, -0.58, 14)} ${pt(0.68, 0.68, 14)} ${pt(-0.68, 0.68, 14)}`}
        fill={C.stoneTop}
        opacity="0.55"
      />
      {/* Enam rumah tapak berderet rapat memenuhi semenanjung */}
      <g transform={at(-0.36, -0.34, 14)}>{house(C.brickLeft, C.brickTop)}</g>
      <g transform={at(0.06, -0.34, 14)}>{house(C.warmL, C.warmTop)}</g>
      <g transform={at(0.46, -0.34, 14)}>{house(C.brickLeft, C.brickTop)}</g>
      <g transform={at(-0.36, 0.22, 14)}>{house(C.warmL, C.warmTop)}</g>
      <g transform={at(0.06, 0.22, 14)}>{house(C.brickLeft, C.brickTop)}</g>
      <g transform={at(0.46, 0.22, 14)}>{house(C.warmL, C.warmTop)}</g>
      <IsoWorker u={-0.12} v={0.48} lift={14} shirt="warm" hat="straw" tool="wiper" action="wipe" />
      <IsoWorker u={0.26} v={0.48} lift={14} shirt="blue" hat="hair-dark" tool="none" action="patrol" delay={0.3} />
      <IsoWorker u={0.54} v={-0.02} lift={14} shirt="green" hat="cap-green" tool="watering" action="water" delay={0.6} flip />
    </g>
  );
}

/** Kawasan Apartemen Vertikal Hijau Hemat Lahan & Taman Resapan (warga di halaman, bukan di atas bangunan) */
function Apartemen() {
  const tower = (h: number, w: number, terraces: number[]) => (
    <g>
      <Box h={h} inset={64 - w} top={C.smoke} left={C.steelL} right={C.steelR} />
      {[0.18, 0.44, 0.7].map((t) =>
        [0.16, 0.44, 0.72].map((s) => (
          <g key={`${t}-${s}`}>
            <polygon points={facePoints('left', w, w / 2, h, s, s + 0.16, t, t + 0.12)} fill={C.glass} />
            <polygon points={facePoints('right', w, w / 2, h, s, s + 0.16, t, t + 0.12)} fill={C.glass} />
          </g>
        )),
      )}
      {terraces.map((t) => (
        <polygon
          key={t}
          points={`${-w - 3},${-t} 0,${-t + (w + 3) / 2} ${w + 3},${-t} 0,${-t - (w + 3) / 2}`}
          fill={C.leafTop}
        />
      ))}
      <polygon
        points={`${-w * 0.55},${-h} 0,${-h + w * 0.28} ${w * 0.55},${-h} 0,${-h - w * 0.28}`}
        fill={C.solar}
      />
    </g>
  );
  return (
    <g>
      <g transform={at(-0.22, -0.24, 14)}>{tower(78, 22, [30, 58])}</g>
      <g transform={at(0.24, 0.16, 14)}>{tower(54, 20, [26])}</g>
      <RoundTree u={-0.38} v={0.28} lift={14} scale={0.76} />
      <PineTree u={0.44} v={-0.22} lift={14} scale={0.68} tone="pine" />
      <IsoWorker u={-0.14} v={0.48} lift={14} shirt="green" hat="straw" tool="watering" action="water" />
      <IsoWorker u={0.22} v={0.54} lift={14} shirt="blue" hat="hair-dark" tool="box" action="patrol" delay={0.3} />
      <IsoWorker u={0.56} v={0.28} lift={14} shirt="warm" hat="cap-green" tool="none" action="bob" delay={0.55} flip />
    </g>
  );
}

const BUILDINGS: Record<AssetId, () => React.JSX.Element> = {
  pltu: Pltu,
  plts: Plts,
  tol: Tol,
  brt: Brt,
  industri: Industri,
  hutan: Hutan,
  tpa: Tpa,
  daurulang: Daurulang,
  perumahan: Perumahan,
  apartemen: Apartemen,
};

export const ASSET_IDS = Object.keys(BUILDINGS) as AssetId[];

export function Building({ id }: { id: AssetId }) {
  const Draw = BUILDINGS[id];
  return <Draw />;
}

/**
 * Pembatas jalan oranye-putih (Orange-and-White Striped Safety Barrier) &
 * kerucut lalu lintas miniatur (Traffic Cone) di sekeliling petak konstruksi.
 */
function SafetyBarrier({
  u,
  v,
  lift = 14,
  axis = 'u',
}: {
  u: number;
  v: number;
  lift?: number;
  axis?: 'u' | 'v';
}) {
  return (
    <g transform={at(u, v, lift)}>
      {axis === 'u' ? (
        <g>
          <rect x="-8" y="-3" width="1.8" height="4.5" fill="#475569" />
          <rect x="6" y="-3" width="1.8" height="4.5" fill="#475569" />
          <polygon points="-9,-5.8 9,3.2 9,0.2 -9,-8.8" fill="#ff6b3d" />
          <polygon points="-5,-3.8 -1,-1.8 -1,-4.8 -5,-6.8" fill="#ffffff" />
          <polygon points="2,-0.3 6,1.7 6,-1.3 2,-3.3" fill="#ffffff" />
        </g>
      ) : (
        <g>
          <rect x="-8" y="-3" width="1.8" height="4.5" fill="#475569" />
          <rect x="6" y="-3" width="1.8" height="4.5" fill="#475569" />
          <polygon points="-9,3.2 9,-5.8 9,-8.8 -9,0.2" fill="#ff6b3d" />
          <polygon points="-5,1.2 -1,-0.8 -1,-3.8 -5,-1.8" fill="#ffffff" />
          <polygon points="2,-2.3 6,-4.3 6,-7.3 2,-5.3" fill="#ffffff" />
        </g>
      )}
    </g>
  );
}

function TrafficCone({ u, v, lift = 14 }: { u: number; v: number; lift?: number }) {
  return (
    <g transform={at(u, v, lift)}>
      <polygon points="0,-1.8 3.6,0 0,1.8 -3.6,0" fill="#ea580c" />
      <polygon points="-2.2,0 0,-6.8 2.2,0" fill="#ff6b3d" />
      <polygon points="-1.4,-2.4 1.4,-2.4 1.0,-3.8 -1.0,-3.8" fill="#ffffff" />
    </g>
  );
}

/**
 * Tahap 2: Aset Konstruksi Gedung Ramah Lingkungan 3D Isometrik (`ConstructionSite`).
 *
 * Elemen Situs Konstruksi:
 * - Petak tanah persegi dikelilingi pembatas keselamatan garis oranye-putih & traffic cones.
 * - Rangka bangunan yang sedang didirikan dengan pilar beton modular terekspos,
 *   perancah kayu terang (light wooden scaffolding), dan balok silang baja.
 * - Tower crane konstruksi kuning cerah di sisi petak yang sedang mengangkat
 *   rangka panel surya (solar panel frame).
 * - Pekerja konstruksi miniatur dengan rompi keselamatan oranye neon dan helm
 *   kuning cerah yang memegang tablet digital dan alat teknik.
 * - Tumpukan material konstruksi rapi di atas rumput: palet eco-bricks,
 *   gulungan rumput turf (rolled turf grass), dan paket modul panel surya.
 */
export function ConstructionSite({ id }: { id?: AssetId }) {
  return (
    <g className="construction-site" data-testid="construction-site" data-building-id={id}>
      {/* Alas petak tanah konstruksi dengan bantalan kerikil & rumput */}
      <polygon
        points={`${pt(-0.68, -0.68, 14)} ${pt(0.68, -0.68, 14)} ${pt(0.68, 0.68, 14)} ${pt(-0.68, 0.68, 14)}`}
        fill="#d6d3c4"
        opacity="0.92"
      />
      <polygon
        points={`${pt(-0.56, -0.56, 14.3)} ${pt(0.56, -0.56, 14.3)} ${pt(0.56, 0.56, 14.3)} ${pt(-0.56, 0.56, 14.3)}`}
        fill="#cbd5e1"
        opacity="0.88"
      />

      {/* 1. Tumpukan Material Rapi di Atas Rumput (Eco-Bricks, Rolled Turf Grass, Solar Modules) */}
      {/* Palet Eco-Bricks terakota ramah lingkungan */}
      <g transform={at(-0.48, 0.42, 14.4)}>
        <Box h={2.5} inset={52} top="#d9a066" left="#b87d44" right="#96612e" />
        <Box h={6} inset={54} lift={2.5} top="#e07a5f" left="#c45b41" right="#a3462f" />
        <Box h={5} inset={56} lift={8.5} top="#e07a5f" left="#c45b41" right="#a3462f" />
      </g>
      {/* Gulungan Rumput Turf Hijau (Rolled Turf Grass Cylinders) */}
      <g transform={at(-0.24, 0.52, 14.4)}>
        <ellipse cx="-4" cy="0" rx="5.5" ry="2.8" fill="#4fb06a" />
        <ellipse cx="4" cy="1.2" rx="5.5" ry="2.8" fill="#68c982" />
        <ellipse cx="0" cy="-2.6" rx="5.5" ry="2.8" fill="#8ce868" />
        <circle cx="0" cy="-2.6" r="1.4" fill="#7d5236" />
      </g>
      {/* Paket Modul Panel Surya di Atas Palet */}
      <g transform={at(0.44, 0.36, 14.4)}>
        <Box h={2.5} inset={50} top="#d9a066" left="#b87d44" right="#96612e" />
        <Box h={5.5} inset={51} lift={2.5} top="#2f3b74" left="#3b82f6" right="#1d4ed8" />
        <polygon points="-10,-6.5 0,-1.5 10,-6.5 0,-11.5" fill="none" stroke="#93c5fd" strokeWidth="0.9" />
      </g>

      {/* 2. Rangka Gedung Eco-Modular (Pilar Beton, Lantai Bertingkat, Perancah Kayu & Balok Baja) */}
      <g transform={at(-0.04, -0.06, 14.5)}>
        {/* Pelat lantai dasar beton */}
        <Box h={5} inset={26} top="#e2e8f0" left="#cbd5e1" right="#94a3b8" />

        {/* 6 Pilar Beton Modular Terekspos (Exposed Concrete Modular Pillars) */}
        {[
          [-0.28, -0.28],
          [0.28, -0.28],
          [-0.28, 0.28],
          [0.28, 0.28],
          [0, -0.28],
          [0, 0.28],
        ].map(([pu, pv], idx) => (
          <g key={idx} transform={at(pu, pv, 5)}>
            <Box h={34} inset={59.5} top="#f1f5f9" left="#cbd5e1" right="#94a3b8" />
          </g>
        ))}

        {/* Pelat lantai tengah (mezzanine concrete deck) */}
        <Box h={3.5} inset={28} lift={20} top="#e2e8f0" left="#cbd5e1" right="#94a3b8" />
        {/* Taman vertikal modular sebagian terpasang di lantai 1 */}
        <Box h={8} inset={34} lift={12} top="#68c982" left="#4fb06a" right="#3c9455" />

        {/* Balok Silang Baja Biru-Abu (Steel Cross-Beams) di puncak rangka */}
        <Box h={3} inset={27} lift={36} top="#94a3b8" left="#64748b" right="#475569" />
        <line x1="-26" y1="-16" x2="0" y2="-32" stroke="#64748b" strokeWidth="1.6" />
        <line x1="-26" y1="-32" x2="0" y2="-16" stroke="#64748b" strokeWidth="1.6" />
        <line x1="0" y1="-16" x2="26" y2="-32" stroke="#475569" strokeWidth="1.6" />
        <line x1="0" y1="-32" x2="26" y2="-16" stroke="#475569" strokeWidth="1.6" />

        {/* Perancah Kayu Terang (Light Wooden Scaffolding) mengelilingi fasad kiri & kanan */}
        <g stroke="#d99b52" strokeWidth="1.4" strokeLinecap="round">
          {/* Tiang vertikal perancah kayu */}
          <line x1="-34" y1="-2" x2="-34" y2="-40" />
          <line x1="-18" y1="6" x2="-18" y2="-32" />
          <line x1="-2" y1="14" x2="-2" y2="-24" />
          <line x1="16" y1="6" x2="16" y2="-32" />
          <line x1="32" y1="-2" x2="32" y2="-40" />
          {/* Papan horizontal & palang diagonal perancah kayu */}
          <line x1="-34" y1="-15" x2="-2" y2="1" stroke="#eab676" strokeWidth="2" />
          <line x1="-34" y1="-28" x2="-2" y2="-12" stroke="#eab676" strokeWidth="2" />
          <line x1="-2" y1="1" x2="32" y2="-15" stroke="#c68642" strokeWidth="2" />
          <line x1="-2" y1="-12" x2="32" y2="-28" stroke="#c68642" strokeWidth="2" />
          <line x1="-34" y1="-15" x2="-18" y2="-20" />
          <line x1="-18" y1="-7" x2="-2" y2="-12" />
        </g>
      </g>

      {/* 3. Tower Crane Kuning Cerah (Compact Bright Yellow Construction Tower Crane) */}
      <g transform={at(0.46, -0.34, 14.5)}>
        {/* Pemberat beton dasar crane */}
        <Box h={7} inset={53} top="#64748b" left="#475569" right="#334155" />
        {/* Tiang mast kisi kuning vertikal */}
        <Box h={68} inset={59} lift={7} top="#fde047" left="#facc15" right="#eab308" />
        <g stroke="#ca8a04" strokeWidth="1.1">
          {[14, 26, 38, 50, 62].map((y) => (
            <line key={y} x1="-4.5" y1={-y} x2="4.5" y2={-(y + 6)} />
          ))}
        </g>
        {/* Kabin operator crane */}
        <Box h={9} inset={56} lift={64} top="#fef08a" left="#facc15" right="#ca8a04" />
        <rect x="-5" y="-71" width="5" height="4" fill="#bae6fd" />

        {/* Lengan Jib Crane Kuning & Kabel Pengangkat Panel Surya (Animated Hoist) */}
        <g className="crane-jib">
          {/* Counter-jib & pemberat belakang */}
          <polygon points="0,-76 18,-68 18,-73 0,-81" fill="#eab308" />
          <rect x="11" y="-71" width="6" height="6" rx="1" fill="#475569" />
          {/* Lengan jib utama memanjang ke atas rangka gedung */}
          <polygon points="0,-78 -54,-52 -54,-57 0,-83" fill="#facc15" />
          <polygon points="0,-83 -54,-57 -51,-59 2,-85" fill="#fef08a" />
          {/* Kabel baja penahan puncak menara crane */}
          <line x1="0" y1="-91" x2="-48" y2="-59" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="-91" x2="16" y2="-72" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="-2.5,-83 0,-92 2.5,-83" fill="#facc15" />

          {/* Troli & Kabel Hoist Mengangkat Rangka Panel Surya (Hoisting Solar Panel Frame) */}
          <g transform="translate(-38 -59)" className="crane-load">
            <rect x="-3" y="-2" width="6" height="3.5" rx="1" fill="#334155" />
            <line x1="0" y1="1.5" x2="0" y2="18" stroke="#475569" strokeWidth="1.3" />
            <circle cx="0" cy="18" r="2" fill="#f59e0b" />
            {/* Rangka Panel Surya yang Sedang Diangkat di Udara */}
            <g transform="translate(0 23)">
              <polygon points="-14,0 0,7 14,0 0,-7" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1.2" />
              <line x1="-7" y1="-3.5" x2="7" y2="3.5" stroke="#bfdbfe" strokeWidth="0.9" />
              <line x1="-7" y1="3.5" x2="7" y2="-3.5" stroke="#bfdbfe" strokeWidth="0.9" />
            </g>
          </g>
        </g>
      </g>

      {/* 4. Pembatas Keselamatan Oranye-Putih & Traffic Cones Mengelilingi Petak */}
      <SafetyBarrier u={-0.36} v={0.62} axis="u" />
      <SafetyBarrier u={0.18} v={0.62} axis="u" />
      <SafetyBarrier u={-0.62} v={0.26} axis="v" />
      <SafetyBarrier u={-0.62} v={-0.24} axis="v" />
      <TrafficCone u={-0.62} v={0.58} />
      <TrafficCone u={0.54} v={0.58} />
      <TrafficCone u={0.60} v={0.16} />
      <TrafficCone u={-0.58} v={-0.54} />

      {/* 5. Pekerja Konstruksi Berompi Oranye Neon & Helm Kuning Memegang Tablet & Alat Teknik */}
      <IsoWorker u={-0.16} v={0.44} lift={14.5} shirt="orange" hat="helmet-yellow" tool="clipboard" action="bob" scale={1.08} />
      <IsoWorker u={0.18} v={0.48} lift={14.5} shirt="orange" hat="helmet-yellow" tool="wrench" action="dig" scale={1.08} delay={0.2} flip />
      <IsoWorker u={-0.44} v={0.14} lift={14.5} shirt="orange" hat="helmet-yellow" tool="shovel" action="dig" scale={1.05} delay={0.45} />
    </g>
  );
}

/**
 * Partikel Confetti Geometris Berwarna-warni (Subtle Tiny Geometric Confetti)
 * yang melayang meriah saat peresmian gedung.
 */
function ConfettiBurst() {
  const pieces: { x: number; y: number; color: string; delay: number; shape: 'diamond' | 'rect' | 'circle' }[] = [
    { x: -38, y: -64, color: '#f43f5e', delay: 0, shape: 'diamond' },
    { x: -22, y: -76, color: '#facc15', delay: 0.1, shape: 'rect' },
    { x: -6, y: -68, color: '#22c55e', delay: 0.2, shape: 'circle' },
    { x: 12, y: -78, color: '#38bdf8', delay: 0.06, shape: 'diamond' },
    { x: 28, y: -64, color: '#a855f7', delay: 0.16, shape: 'rect' },
    { x: -30, y: -44, color: '#fb923c', delay: 0.26, shape: 'circle' },
    { x: 24, y: -46, color: '#4ade80', delay: 0.22, shape: 'diamond' },
    { x: 2, y: -52, color: '#f43f5e', delay: 0.14, shape: 'rect' },
    { x: -16, y: -50, color: '#38bdf8', delay: 0.28, shape: 'diamond' },
    { x: 36, y: -54, color: '#facc15', delay: 0.04, shape: 'circle' },
    { x: -26, y: -28, color: '#facc15', delay: 0.12, shape: 'diamond' },
    { x: -8, y: -32, color: '#f43f5e', delay: 0.24, shape: 'rect' },
  ];

  return (
    <g className="ceremony-confetti" pointerEvents="none">
      {pieces.map((p, idx) => (
        <g
          key={idx}
          transform={`translate(${p.x} ${p.y})`}
          className="confetti-piece"
          style={{ animationDelay: `${p.delay}s` }}
        >
          {p.shape === 'diamond' && <polygon points="0,-3.8 3.1,0 0,3.8 -3.1,0" fill={p.color} />}
          {p.shape === 'rect' && <rect x="-2.8" y="-1.9" width="5.6" height="3.8" rx="0.9" fill={p.color} />}
          {p.shape === 'circle' && <circle cx="0" cy="0" r="2.6" fill={p.color} />}
        </g>
      ))}
    </g>
  );
}

/**
 * Tahap 3: Aset Peresmian Gedung Baru 3D Isometrik (`OpeningCeremony`).
 *
 * Menampilkan:
 * - Latar Belakang: Fasilitas ramah lingkungan baru dengan jendela kaca surya,
 *   dinding taman vertikal hijau (vertical green garden walls), serta cahaya
 *   lampu interior hangat yang menyambut.
 * - Latar Depan: Jalur karpet merah peresmian menuju tangga pintu masuk gedung,
 *   dua tiang pembatas perak (silver stanchion posts) yang membentangkan pita
 *   satin merah cerah (vibrant red satin ribbon), staf kota & warga yang
 *   bertepuk tangan merayakan, serta partikel confetti geometris di udara.
 * - Figur Walikota berjas navy dan berselempang merah yang memegang gunting
 *   emas bergerak secara dinamis ke titik pita ini melalui `MayorDynamicLayer`.
 */
export function OpeningCeremony({ id }: { id: AssetId }) {
  return (
    <g className="opening-ceremony" data-testid="opening-ceremony" data-building-id={id}>
      {/* Gedung utama di latar belakang */}
      <Building id={id} />

      {/*
        Prosesi peresmian sengaja diturunkan ke tanah di depan-kiri petak,
        bukan di atas petaknya.

        Sebelumnya ada paviliun kaca yang digambar tepat di atas gedung
        aslinya, lalu karpet, pita, Walikota, dan kerumunan semuanya ditumpuk
        di satu ubin yang sama, sehingga saling menimpa. Satu ubin memang tidak
        cukup untuk menampung gedung sekaligus acaranya. Sekarang gedungnya
        berdiri di atas petak, acaranya berlangsung di halaman depannya, persis
        seperti peresmian sungguhan.
      */}
      <g transform={at(CEREMONY_ANCHOR.u, CEREMONY_ANCHOR.v, CEREMONY_ANCHOR.lift)}>
        {/* Pendar cahaya hangat lampu penyambutan di halaman */}
        <ellipse cx="-2" cy="2" rx="40" ry="18" fill="#fef08a" opacity="0.3" />

        {/* Alas bingkai emas karpet merah */}
        <polygon points="-26,2 2,-12 24,-1 -4,13" fill="#fbbf24" />
        {/* Karpet satin merah menyala */}
        <polygon points="-22,2 2,-10 20,-1 -4,11" fill="#dc2626" />

        {/* Dua Tiang Pembatas Perak & Pita Satin Merah di ujung karpet */}
        <ellipse cx="-16" cy="-1" rx="3" ry="1.5" fill="#64748b" />
        <line x1="-16" y1="-1" x2="-16" y2="-15" stroke="#f1f5f9" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="-16" cy="-15.5" r="2.2" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.7" />

        <ellipse cx="10" cy="5" rx="3" ry="1.5" fill="#64748b" />
        <line x1="10" y1="5" x2="10" y2="-9" stroke="#f1f5f9" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="10" cy="-9.5" r="2.2" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.7" />

        {/* Pita Satin Merah yang Direntangkan di Antara Kedua Tiang */}
        <path
          d="M -16,-13 Q -3,-8 10,-7"
          fill="none"
          stroke="#ef4444"
          strokeWidth="3.4"
          strokeLinecap="round"
          className="ceremony-ribbon"
        />
        {/* Simpul Pita Merah-Emas di Tengah */}
        <polygon points="-7.5,-12.5 -3,-9.5 -7.5,-6.5" fill="#f43f5e" />
        <polygon points="1.5,-12.5 -3,-9.5 1.5,-6.5" fill="#f43f5e" />
        <circle cx="-3" cy="-9.5" r="2.2" fill="#fbbf24" stroke="#fef08a" strokeWidth="0.6" />
      </g>

      {/* Warga bersorak mengapit karpet, juga di tanah, bukan di atas petak */}
      <IsoWorker u={-0.16} v={0.92} lift={2} shirt="blue" hat="hair-dark" tool="none" action="wave" scale={1.12} />
      <IsoWorker u={0.62} v={1.1} lift={2} shirt="green" hat="cap-green" tool="flag" action="wave" scale={1.12} delay={0.15} flip />
      <IsoWorker u={0.04} v={1.26} lift={2} shirt="warm" hat="hair-dark" tool="none" action="bob" scale={1.08} delay={0.3} />

      {/* Efek Partikel Confetti Geometris Berterbangan */}
      <ConfettiBurst />
    </g>
  );
}

