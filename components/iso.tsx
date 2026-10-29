import type { AssetId } from '@/lib/types.ts';

/**
 * Sistem isometrik bersama untuk landing page dan peta permainan.
 *
 * Satu ubin = 128 x 64 (rasio 2:1). Semua bangunan digambar pada unit yang sama,
 * jadi duduknya selalu pas di petak tanpa penyesuaian manual.
 *
 * Bangunan ditulis sekali sebagai <symbol> dan dipakai ulang lewat <use>, supaya
 * halaman tetap ringan walau kota muncul di beberapa tempat.
 */

export const TILE_W = 128;
export const TILE_H = 64;

/**
 * Posisi lima petak dalam koordinat ubin isometrik yang tersebar luas di atas
 * pulau terapung, diurutkan dari belakang ke depan (menurut u + v) agar urutan
 * tumpukan (painter's algorithm) selalu akurat dan tidak ada bangunan yang
 * saling menutupi.
 */
export const PLOT_TILES: [number, number][] = [
  [-0.2, 0.6], // Petak 0 (Ronde 1 - Energi): Dataran rumput barat-laut
  [-0.6, 2.8], // Petak 1 (Ronde 2 - Transportasi): Sayap padang rumput barat
  [2.8, 0.5],  // Petak 2 (Ronde 3 - Lahan/Hutan): Kaki ngarai terakota timur
  [1.2, 2.9],  // Petak 3 (Ronde 4 - Sampah): Lembah tengah tepi sungai
  [3.1, 2.7],  // Petak 4 (Ronde 5 - Hunian): Semenanjung pesisir tenggara
];

/** Proyeksi koordinat ubin ke koordinat layar. */
export function iso(tx: number, ty: number): [number, number] {
  return [(tx - ty) * (TILE_W / 2), (tx + ty) * (TILE_H / 2)];
}

const PACK = 1;

export const PLOT_POS = PLOT_TILES.map(([x, y]) => {
  const [sx, sy] = iso(x, y);
  return [sx * PACK, sy * PACK] as [number, number];
});

const HW = TILE_W / 2;
const HH = TILE_H / 2;

/** Titik layar isometrik `x,y` untuk koordinat ubin `(u, v)` dengan tinggi `lift`. */
function pt(u: number, v: number, lift = 0) {
  return `${(u - v) * HW},${(u + v) * HH - lift}`;
}

/** Belah ketupat alas satu ubin, diperkecil oleh `inset`. */
function diamond(inset = 0, lift = 0) {
  const w = HW - inset;
  const h = HH - inset / 2;
  return `${0},${-h - lift} ${w},${-lift} ${0},${h - lift} ${-w},${-lift}`;
}

type BoxProps = {
  /** Tinggi kotak dalam satuan layar. */
  h: number;
  /** Seberapa jauh sisi kotak ditarik ke dalam dari tepi ubin. */
  inset?: number;
  /** Mengangkat seluruh kotak, untuk menumpuk satu kotak di atas yang lain. */
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

/**
 * Balok isometrik pada rentang ubin `[u1, u2] x [v1, v2]` dengan ketebalan `h`
 * dan tinggi dasar `lift`. Digunakan untuk menyusun lapisan pantai berundak,
 * padang rumput mint, tebing ngarai terakota, dan sungai.
 */
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

/* Warna diambil dari token CSS, jadi satu perubahan tema mengubah seluruh kota. */
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
 * Satu petak: fondasi bangunan berundak di atas padang rumput pulau terapung.
 */
export const PAD_H = 16;

export function PlotPad() {
  return (
    <g>
      <Box h={PAD_H - 4} inset={8} top={C.isleTop} left={C.soilLeft} right={C.soilRight} />
      <Box h={PAD_H} inset={12} top={C.meadowTop} left={C.mintL} right={C.mintR} />
      <polygon points={diamond(20, PAD_H)} fill={C.grassTop} />
    </g>
  );
}

/** Bangunan digambar untuk alas setebal 14, jadi digeser naik sebanyak sisanya. */
export const BUILDING_LIFT = PAD_H - 14;

/** Bangunan diperkecil agar proporsional dengan pulau luas dan memiliki ruang
    negatif yang lega di sekeliling tiap petak. */
export const BUILDING_SCALE = 0.72;

/**
 * Menempatkan sesuatu di atas permukaan ubin.
 */
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
      {/* Bayangan lembut di atas rumput */}
      <polygon points="0,-5 12,0 0,5 -12,0" fill={C.mintR} />
      {/* Batang kayu isometrik */}
      <polygon points="-3,0 0,2 0,-9 -3,-11" fill={C.trunkL} />
      <polygon points="3,0 0,2 0,-9 3,-11" fill={C.trunkR} />
      {/* Tajuk pinus tingkat bawah */}
      <polygon points="0,-28 -14,-8 0,-2" fill={left} />
      <polygon points="0,-28 14,-8 0,-2" fill={right} />
      <polygon points="0,-28 -14,-8 0,-13 14,-8" fill={top} />
      {/* Tajuk pinus tingkat tengah */}
      <polygon points="0,-40 -11,-19 0,-14" fill={left} />
      <polygon points="0,-40 11,-19 0,-14" fill={right} />
      <polygon points="0,-40 -11,-19 0,-23 11,-19" fill={top} />
      {/* Puncak pohon pinus */}
      <polygon points="0,-50 -8,-31 0,-27" fill={left} />
      <polygon points="0,-50 8,-31 0,-27" fill={right} />
      <polygon points="0,-50 -8,-31 0,-34 8,-31" fill={top} />
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
  tone?: 'terra' | 'canyon' | 'stone';
}) {
  const top = tone === 'terra' ? C.terraTop : tone === 'canyon' ? C.canyonTop : C.stoneTop;
  const left = tone === 'terra' ? C.terraL : tone === 'canyon' ? C.canyonL : C.stoneL;
  const right = tone === 'terra' ? C.terraR : tone === 'canyon' ? C.canyonR : C.stoneR;
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

/**
 * Pulau terapung isometrik low-poly yang luas dan organik:
 * - Lapisan pesisir berundak (buih air, teras pasir oker hangat, tebing tanah,
 *   dan hamparan padang rumput hijau mint lembut)
 * - Zona ngarai batu terakota hangat di punggung timur-utara dengan gua mata air
 * - Aliran sungai biru langit berkelok yang bermuara menjadi air terjun pesisir
 * - Jembatan batu dan jaringan jalan tanah oker yang menghubungkan 5 petak
 * - Pohon-pohon pinus minimalis yang tersebar di ruang terbuka
 */
export function IslandTerrain() {
  return (
    <g>
      {/* =====================================================================
          1. LAPISAN DASAR AIR & BUIH PESISIR (Stepped Coastline Base)
          ===================================================================== */}
      {/* Aura air di bawah pulau terapung */}
      <polygon
        points={`${pt(-1.68, -0.88, -36)} ${pt(4.35, -1.25, -36)} ${pt(4.55, 3.95, -36)} ${pt(1.95, 4.35, -36)} ${pt(-0.15, 4.15, -36)} ${pt(-1.85, 3.85, -36)}`}
        fill={C.waterAura}
      />
      {/* Buih putih organik yang memeluk garis pantai berundak */}
      <polygon
        points={`${pt(-1.52, -0.72, -34)} ${pt(4.15, -1.08, -34)} ${pt(4.38, 1.65, -34)} ${pt(4.25, 3.82, -34)} ${pt(2.05, 4.18, -34)} ${pt(0.05, 3.98, -34)} ${pt(-1.62, 3.75, -34)}`}
        fill={C.foam}
      />

      {/* Riak air minimalis dan batu karang pesisir (sea stacks) */}
      <polygon points={`${pt(-1.95, 2.1, -34)} ${pt(-1.65, 2.1, -34)} ${pt(-1.65, 2.22, -34)} ${pt(-1.95, 2.22, -34)}`} fill={C.foam} />
      <polygon points={`${pt(-1.55, 4.05, -34)} ${pt(-0.95, 4.05, -34)} ${pt(-0.95, 4.16, -34)} ${pt(-1.55, 4.16, -34)}`} fill={C.foam} />
      <polygon points={`${pt(2.85, 4.05, -34)} ${pt(3.55, 4.05, -34)} ${pt(3.55, 4.16, -34)} ${pt(2.85, 4.16, -34)}`} fill={C.foam} />
      <polygon points={`${pt(4.45, 2.15, -34)} ${pt(4.56, 2.15, -34)} ${pt(4.56, 2.75, -34)} ${pt(4.45, 2.75, -34)}`} fill={C.foam} />
      {/* Karang kecil di lepas pantai barat & selatan */}
      <RockCrop u={-1.68} v={2.65} lift={-34} w={0.32} d={0.32} h={16} tone="terra" />
      <RockCrop u={-1.35} v={3.92} lift={-34} w={0.22} d={0.22} h={12} tone="canyon" />
      <RockCrop u={4.32} v={1.85} lift={-34} w={0.26} d={0.26} h={14} tone="terra" />

      {/* =====================================================================
          2. TERAS PANTAI BERUNDAK OKER HANGAT (Stepped Coastal Sand Terraces)
          ===================================================================== */}
      {/* Sayap pantai utara & barat-laut */}
      <IsoSlab u1={-1.38} v1={-0.68} u2={1.25} v2={1.75} h={16} lift={-34} top={C.isleTop} left={C.soilLeft} right={C.soilRight} />
      {/* Sayap pantai timur & ngarai */}
      <IsoSlab u1={0.85} v1={-0.98} u2={4.18} v2={1.85} h={16} lift={-34} top={C.isleTop} left={C.soilLeft} right={C.soilRight} />
      {/* Sayap pantai barat-jauh */}
      <IsoSlab u1={-1.52} v1={1.38} u2={0.55} v2={3.82} h={16} lift={-34} top={C.isleTop} left={C.soilLeft} right={C.soilRight} />
      {/* Sayap pantai tengah-selatan */}
      <IsoSlab u1={0.18} v1={1.45} u2={2.25} v2={3.92} h={16} lift={-34} top={C.isleTop} left={C.soilLeft} right={C.soilRight} />
      {/* Sayap pantai semenanjung tenggara */}
      <IsoSlab u1={2.15} v1={1.52} u2={4.22} v2={3.82} h={16} lift={-34} top={C.isleTop} left={C.soilLeft} right={C.soilRight} />

      {/* =====================================================================
          3. DARATAN UTAMA RUMPUT HIJAU MINT & ALIRAN SUNGAI BERKELOK
          ===================================================================== */}
      {/* Sayap padang rumput barat-laut (tempat Petak 0) */}
      <IsoSlab u1={-1.22} v1={-0.52} u2={1.18} v2={1.62} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />
      {/* Teras rumput bertingkat di sudut paling utara */}
      <IsoSlab u1={-1.16} v1={-0.46} u2={-0.62} v2={0.08} h={8} lift={0} top={C.grassTop} left={C.grassL} right={C.grassR} />

      {/* Aliran Sungai Biru Langit Berkelok (5 segmen berundak membentuk kurva S) */}
      <IsoSlab u1={1.14} v1={-0.18} u2={1.68} v2={0.62} h={13} lift={-18} top={C.riverTop} left={C.riverMid} right={C.riverDeep} />
      <IsoSlab u1={1.32} v1={0.48} u2={1.86} v2={1.22} h={13} lift={-18} top={C.riverTop} left={C.riverMid} right={C.riverDeep} />
      <IsoSlab u1={1.56} v1={1.08} u2={2.12} v2={1.88} h={13} lift={-18} top={C.riverTop} left={C.riverMid} right={C.riverDeep} />
      <IsoSlab u1={1.78} v1={1.76} u2={2.42} v2={2.82} h={13} lift={-18} top={C.riverTop} left={C.riverMid} right={C.riverDeep} />
      <IsoSlab u1={1.92} v1={2.68} u2={2.42} v2={3.72} h={13} lift={-18} top={C.riverTop} left={C.riverMid} right={C.riverDeep} />

      {/* Garis buih mengikuti kelokan aliran sungai */}
      <polygon points={`${pt(1.36, 0.02, -4.5)} ${pt(1.44, 0.02, -4.5)} ${pt(1.44, 0.52, -4.5)} ${pt(1.36, 0.52, -4.5)}`} fill={C.foam} />
      <polygon points={`${pt(1.56, 0.58, -4.5)} ${pt(1.64, 0.58, -4.5)} ${pt(1.64, 1.15, -4.5)} ${pt(1.56, 1.15, -4.5)}`} fill={C.foam} />
      <polygon points={`${pt(2.04, 1.95, -4.5)} ${pt(2.12, 1.95, -4.5)} ${pt(2.12, 2.68, -4.5)} ${pt(2.04, 2.68, -4.5)}`} fill={C.foam} />
      <polygon points={`${pt(2.16, 2.82, -4.5)} ${pt(2.24, 2.82, -4.5)} ${pt(2.24, 3.48, -4.5)} ${pt(2.16, 3.48, -4.5)}`} fill={C.foam} />

      {/* Sayap kaki ngarai timur (tempat Petak 2, mengikuti tepi timur sungai) */}
      <IsoSlab u1={1.68} v1={-0.35} u2={3.96} v2={0.52} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />
      <IsoSlab u1={1.86} v1={0.48} u2={3.96} v2={1.18} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />
      <IsoSlab u1={2.12} v1={1.12} u2={3.96} v2={1.78} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />

      {/* =====================================================================
          4. ZONA NGARAI BATU TERAKOTA HANGAT (Warm Terracotta Rock Canyon)
          ===================================================================== */}
      {/* Sabuk tebing terakota tingkat pertama di sepanjang punggung timur-laut */}
      <IsoSlab u1={0.88} v1={-0.88} u2={3.88} v2={-0.08} h={22} lift={0} top={C.terraTop} left={C.terraL} right={C.terraR} />
      {/* Mulut gua mata air sungai pada dinding tebing ngarai */}
      <polygon
        points={`${pt(1.22, -0.07, 0)} ${pt(1.56, -0.07, 0)} ${pt(1.56, -0.07, 15)} ${pt(1.22, -0.07, 15)}`}
        fill={C.ink}
      />
      {/* Air terjun kecil yang keluar dari mulut gua ngarai */}
      <polygon
        points={`${pt(1.26, -0.06, -5)} ${pt(1.52, -0.06, -5)} ${pt(1.52, -0.06, 9)} ${pt(1.26, -0.06, 9)}`}
        fill={C.riverTop}
      />
      <polygon
        points={`${pt(1.22, -0.04, -4.2)} ${pt(1.56, -0.04, -4.2)} ${pt(1.56, 0.14, -4.2)} ${pt(1.22, 0.14, -4.2)}`}
        fill={C.foam}
      />
      {/* Mesa oker hangat tingkat kedua di atas tebing terakota */}
      <IsoSlab u1={1.02} v1={-0.82} u2={2.45} v2={-0.18} h={18} lift={22} top={C.canyonTop} left={C.canyonL} right={C.canyonR} />
      <IsoSlab u1={2.58} v1={-0.82} u2={3.76} v2={-0.16} h={14} lift={22} top={C.canyonTop} left={C.canyonL} right={C.canyonR} />
      {/* Puncak batu ngarai tingkat ketiga */}
      <IsoSlab u1={1.25} v1={-0.74} u2={2.05} v2={-0.32} h={14} lift={40} top={C.warmTop} left={C.warmL} right={C.warmR} />
      <IsoSlab u1={2.88} v1={-0.72} u2={3.52} v2={-0.32} h={12} lift={36} top={C.terraTop} left={C.terraL} right={C.terraR} />
      {/* Tebing ngarai samping timur di belakang Petak 2 */}
      <IsoSlab u1={3.56} v1={-0.08} u2={3.96} v2={1.22} h={16} lift={0} top={C.terraTop} left={C.terraL} right={C.terraR} />
      <IsoSlab u1={3.64} v1={0.08} u2={3.92} v2={0.86} h={12} lift={16} top={C.canyonTop} left={C.canyonL} right={C.canyonR} />

      {/* =====================================================================
          5. SAYAP BARAT, LEMBAH TENGAH, AIR TERJUN & SEMENANJUNG TENGGARA
          ===================================================================== */}
      {/* Sayap padang rumput barat-jauh (tempat Petak 1) */}
      <IsoSlab u1={-1.35} v1={1.45} u2={0.42} v2={3.62} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />
      {/* Teras rumput rendah di ujung barat */}
      <IsoSlab u1={-1.32} v1={1.58} u2={-1.02} v2={2.22} h={7} lift={0} top={C.grassTop} left={C.grassL} right={C.grassR} />

      {/* Air terjun pesisir selatan yang jatuh dari bibir sungai ke laut */}
      <polygon
        points={`${pt(1.94, 3.72, -34)} ${pt(2.38, 3.72, -34)} ${pt(2.38, 3.72, -5)} ${pt(1.94, 3.72, -5)}`}
        fill={C.riverTop}
      />
      <polygon
        points={`${pt(2.04, 3.72, -34)} ${pt(2.26, 3.72, -34)} ${pt(2.26, 3.72, -5)} ${pt(2.04, 3.72, -5)}`}
        fill={C.foam}
      />
      {/* Kolam buih di bawah air terjun selatan */}
      <polygon
        points={`${pt(1.82, 3.68, -33.5)} ${pt(2.52, 3.68, -33.5)} ${pt(2.52, 4.08, -33.5)} ${pt(1.82, 4.08, -33.5)}`}
        fill={C.foam}
      />

      {/* Sayap lembah tengah-selatan (tempat Petak 3, mengikuti kelokan barat sungai) */}
      <IsoSlab u1={0.28} v1={1.08} u2={1.56} v2={1.88} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />
      <IsoSlab u1={0.28} v1={1.76} u2={1.78} v2={2.82} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />
      <IsoSlab u1={0.28} v1={2.68} u2={1.92} v2={3.72} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />

      {/* Sayap semenanjung pesisir tenggara (tempat Petak 4) */}
      <IsoSlab u1={2.42} v1={1.72} u2={4.04} v2={3.62} h={18} lift={-18} top={C.mintTop} left={C.mintL} right={C.mintR} />

      {/* =====================================================================
          6. JARINGAN JALAN TANAH OKER & JEMBATAN BATU (Dirt Path & Bridge)
          ===================================================================== */}
      {/* Jalur Barat: menghubungkan Petak 0 (-0.2, 0.6) ke Petak 1 (-0.6, 2.8) */}
      <polygon
        points={`${pt(-0.72, 0.48, 0.4)} ${pt(-0.1, 0.48, 0.4)} ${pt(-0.1, 0.72, 0.4)} ${pt(-0.72, 0.72, 0.4)}`}
        fill={C.pathTop}
      />
      <polygon
        points={`${pt(-0.72, 0.48, 0.4)} ${pt(-0.48, 0.48, 0.4)} ${pt(-0.48, 2.8, 0.4)} ${pt(-0.72, 2.8, 0.4)}`}
        fill={C.pathTop}
      />

      {/* Jalur Tengah-Utara: dari Petak 0 (-0.2, 0.6) menuju persimpangan jembatan */}
      <polygon
        points={`${pt(-0.2, 0.48, 0.4)} ${pt(0.68, 0.48, 0.4)} ${pt(0.68, 0.72, 0.4)} ${pt(-0.2, 0.72, 0.4)}`}
        fill={C.pathTop}
      />
      <polygon
        points={`${pt(0.44, 0.48, 0.4)} ${pt(0.68, 0.48, 0.4)} ${pt(0.68, 1.66, 0.4)} ${pt(0.44, 1.66, 0.4)}`}
        fill={C.pathTop}
      />
      <polygon
        points={`${pt(0.44, 1.42, 0.4)} ${pt(1.56, 1.42, 0.4)} ${pt(1.56, 1.66, 0.4)} ${pt(0.44, 1.66, 0.4)}`}
        fill={C.pathTop}
      />

      {/* Cabang Selatan: dari persimpangan tengah menuju Petak 3 (1.2, 2.9) */}
      <polygon
        points={`${pt(1.08, 1.42, 0.4)} ${pt(1.32, 1.42, 0.4)} ${pt(1.32, 2.9, 0.4)} ${pt(1.08, 2.9, 0.4)}`}
        fill={C.pathTop}
      />

      {/* Jembatan Batu Low-Poly menyeberangi Sungai Tengah */}
      <IsoSlab u1={1.48} v1={1.34} u2={2.22} v2={1.74} h={5} lift={0} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      {/* Pagar pembatas jembatan */}
      <IsoSlab u1={1.52} v1={1.34} u2={2.18} v2={1.41} h={4} lift={5} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      <IsoSlab u1={1.52} v1={1.67} u2={2.18} v2={1.74} h={4} lift={5} top={C.smoke} left={C.stoneL} right={C.stoneR} />

      {/* Jalur Timur: dari ujung timur jembatan ke Petak 2 (2.8, 0.5) & Petak 4 (3.1, 2.7) */}
      <polygon
        points={`${pt(2.18, 1.42, 0.4)} ${pt(3.22, 1.42, 0.4)} ${pt(3.22, 1.66, 0.4)} ${pt(2.18, 1.66, 0.4)}`}
        fill={C.pathTop}
      />
      {/* Cabang ke Petak 2 (Utara-Timur) */}
      <polygon
        points={`${pt(2.68, 0.5, 0.4)} ${pt(2.92, 0.5, 0.4)} ${pt(2.92, 1.66, 0.4)} ${pt(2.68, 1.66, 0.4)}`}
        fill={C.pathTop}
      />
      {/* Cabang ke Petak 4 (Tenggara) */}
      <polygon
        points={`${pt(2.98, 1.42, 0.4)} ${pt(3.22, 1.42, 0.4)} ${pt(3.22, 2.7, 0.4)} ${pt(2.98, 2.7, 0.4)}`}
        fill={C.pathTop}
      />

      {/* Titik simpul jalan (stepping nodes) khas estetika flat-vector */}
      {[
        [-0.6, 0.6],
        [0.56, 0.6],
        [0.56, 1.54],
        [1.2, 1.54],
        [2.8, 1.54],
        [3.1, 1.54],
      ].map(([nu, nv], idx) => (
        <polygon
          key={idx}
          points={`${pt(nu - 0.09, nv - 0.09, 0.6)} ${pt(nu + 0.09, nv - 0.09, 0.6)} ${pt(nu + 0.09, nv + 0.09, 0.6)} ${pt(nu - 0.09, nv + 0.09, 0.6)}`}
          fill={C.pathNode}
        />
      ))}

      {/* =====================================================================
          7. POHON PINUS & BATU LATAR BELAKANG (Background Flora & Rocks)
          ===================================================================== */}
      {/* Bongkahan batu terakota kecil di kaki ngarai utara */}
      <RockCrop u={2.05} v={-0.02} lift={0} w={0.22} d={0.22} h={10} tone="canyon" />

      {/* Rumpun pohon pinus di teras paling utara (jauh di luar jangkauan Petak 0) */}
      <PineTree u={-0.98} v={-0.28} lift={8} scale={0.92} tone="pine" />
      <PineTree u={-0.74} v={-0.32} lift={8} scale={0.76} tone="leaf" />
      <PineTree u={0.62} v={-0.28} lift={0} scale={0.86} tone="pine" />
      <PineTree u={0.82} v={-0.16} lift={0} scale={0.72} tone="leaf" />

      {/* Pohon pinus di teras barat (jauh di luar jangkauan Petak 0 dan Petak 1) */}
      <PineTree u={-1.18} v={1.76} lift={7} scale={0.9} tone="pine" />
      <PineTree u={-1.16} v={2.06} lift={7} scale={0.74} tone="leaf" />
    </g>
  );
}

/**
 * Elemen lanskap latar depan (pohon pinus pesisir selatan & batu tepi pantai)
 * yang memiliki kedalaman isometrik (u + v) di depan petak bangunan.
 */
export function IslandForeground() {
  return (
    <g>
      <RockCrop u={3.72} v={1.42} lift={0} w={0.24} d={0.24} h={11} tone="terra" />
      <RockCrop u={0.48} v={3.46} lift={0} w={0.22} d={0.22} h={9} tone="canyon" />
      <PineTree u={-1.12} v={3.42} lift={0} scale={0.84} tone="pine" />
      <PineTree u={0.22} v={3.45} lift={0} scale={0.82} tone="leaf" />
      <PineTree u={1.72} v={3.48} lift={0} scale={0.74} tone="pine" />
      <PineTree u={3.82} v={1.85} lift={0} scale={0.88} tone="leaf" />
      <PineTree u={3.84} v={3.34} lift={0} scale={0.86} tone="pine" />
      <PineTree u={2.48} v={3.44} lift={0} scale={0.76} tone="leaf" />
    </g>
  );
}

/**
 * Bidang persegi panjang pada salah satu sisi tegak sebuah kotak, dinyatakan
 * dalam pecahan sisi itu. Dipakai untuk jendela dan pintu, supaya keduanya
 * benar-benar menempel pada bidangnya alih-alih melayang di depannya.
 */
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

/**
 * Panel surya: bidang miring navy dengan kisi 3x3 sejajar tepi di atas dua kaki.
 *
 * Garis kisi dihitung dengan interpolasi bilinear di antara keempat sisi
 * panel, bukan menghubungkan sudut berseberangan, supaya hasilnya terbaca
 * sebagai kisi 3x3 yang rapi dan bukan bintang.
 */
function SolarPanel() {
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
      {/* Sisi tebal panel, supaya tidak terbaca sebagai genangan air. */}
      <polygon points={`${-w},3.5 0,${front + 3.5} ${w},3.5 0,${3.5 - back}`} fill={C.solarDark} />
      <polygon
        points={`${-w},0 0,${front} ${w},0 0,${-back}`}
        fill={C.solar}
        stroke={C.solarLine}
        strokeWidth="1.1"
      />
      {/* Kisi tiga kali tiga sejajar keempat sisi panel. */}
      {line(`${p(1 / 3, 0)} ${p(1 / 3, 1)}`)}
      {line(`${p(2 / 3, 0)} ${p(2 / 3, 1)}`)}
      {line(`${p(0, 1 / 3)} ${p(1, 1 / 3)}`)}
      {line(`${p(0, 2 / 3)} ${p(1, 2 / 3)}`)}
    </g>
  );
}

function Plts() {
  return (
    <g>
      {/* Tiga baris panel menghadap satu arah, gardu inverter putih, dan turbin angin di belakang. */}
      <g transform={at(-0.28, 0.28, 14)}>
        <SolarPanel />
      </g>
      <g transform={at(0.02, 0.02, 14)}>
        <SolarPanel />
      </g>
      <g transform={at(0.3, -0.26, 14)}>
        <SolarPanel />
      </g>
      {/* Gardu inverter dan baterai penyimpanan. */}
      <g transform={at(-0.3, -0.26, 14)}>
        <Box h={22} inset={46} top={C.smoke} left={C.steelL} right={C.steelR} />
        <polygon points={facePoints('left', 18, 9, 22, 0.2, 0.8, 0.45, 0.72)} fill={C.leafTop} />
      </g>
      <g transform={at(-0.1, -0.38, 14)}>
        <Box h={15} inset={51} top={C.steelTop} left={C.steelL} right={C.steelR} />
      </g>
      {/* Turbin angin ramping di sudut belakang sesuai referensi PLTS. */}
      <g transform={at(0.08, -0.36, 14)}>
        <rect x="-2" y="-48" width="4" height="48" fill={C.smoke} />
        <circle cx="0" cy="-48" r="3" fill={C.steelL} />
        <polygon points="0,-48 -2,-66 2,-66" fill={C.smoke} />
        <polygon points="0,-48 15,-39 13,-36" fill={C.smoke} />
        <polygon points="0,-48 -15,-39 -13,-36" fill={C.smoke} />
      </g>
      <circle cx="44" cy="-64" r="14" fill={C.sun} />
    </g>
  );
}

function Pltu() {
  const w = 64 - 24;
  const d = 32 - 12;
  return (
    <g>
      {/* Timbunan batu bara di sudut belakang dan jalur konveyor menuju boiler. */}
      <g transform={at(-0.08, -0.32, 14)}>
        <Box h={14} inset={44} top={C.coalLight} left={C.coal} right={C.coal} />
      </g>
      {/* Gedung boiler bata merah dengan atap miring industri dan jendela pita. */}
      <Box h={34} inset={24} lift={14} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
      <g transform={at(0, 0, 48)}>
        <polygon points={`-${w},0 0,${d} 0,${d - 10} -${w},-6`} fill={C.coal} />
        <polygon points={`${w},0 0,${d} 0,${d - 10} ${w},-6`} fill={C.coalLight} />
        <polygon points={`-${w},-6 0,${d - 10} ${w},-6 0,${-d - 4}`} fill={C.stoneR} />
      </g>
      <g transform="translate(0 -14)">
        <polygon points={facePoints('left', w, d, 34, 0.16, 0.84, 0.42, 0.68)} fill={C.glass} />
        <polygon points={facePoints('right', w, d, 34, 0.16, 0.84, 0.42, 0.68)} fill={C.glass} />
      </g>
      {/* Dua cerobong tinggi bergaris putih dan kepulan asap tebal. */}
      <g transform={at(-0.2, 0.14, 50)}>
        <Box h={70} inset={49} top={C.coalLight} left={C.coal} right={C.coal} />
        <rect x="-15" y="-54" width="30" height="6" fill={C.smoke} />
        <rect x="-15" y="-34" width="30" height="6" fill={C.smoke} />
        <circle cx="0" cy="-82" r="12" fill={C.smoke} opacity="0.9" />
        <circle cx="14" cy="-96" r="9.5" fill={C.smoke} opacity="0.65" />
        <circle cx="-4" cy="-108" r="7.5" fill={C.smoke} opacity="0.45" />
      </g>
      <g transform={at(0.14, -0.2, 50)}>
        <Box h={54} inset={51} top={C.coalLight} left={C.coal} right={C.coal} />
        <rect x="-13" y="-40" width="26" height="5.5" fill={C.smoke} />
        <circle cx="4" cy="-64" r="8" fill={C.smoke} opacity="0.55" />
      </g>
      {/* Tangki silinder baja di sisi kanan dan timbunan batu bara hitam di depan. */}
      <g transform={at(0.32, 0.08, 14)}>
        <Box h={26} inset={51} top={C.steelTop} left={C.steelL} right={C.steelR} />
      </g>
      <g transform={at(-0.08, 0.34, 14)}>
        <Box h={15} inset={44} top={C.coalLight} left={C.coal} right={C.coal} />
        <Box h={11} inset={53} lift={15} top={C.coalLight} left={C.coal} right={C.coal} />
      </g>
    </g>
  );
}

function Tol() {
  return (
    <g>
      {/* Dua pilar beton proporsional menopang pita jalan layang, tidak menutupi seluruh petak. */}
      <g transform={at(-0.24, 0.12, 14)}>
        <Box h={24} inset={50} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
      <g transform={at(0.24, -0.12, 14)}>
        <Box h={24} inset={50} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
      {/* Dek jalan berupa pita memanjang dengan parapet beton dan marka putus-putus. */}
      <g transform={at(0, 0, 38)}>
        {/* Dinding samping gelagar beton */}
        <polygon points="-46,5 14,23 14,29 -46,11" fill={C.stoneL} />
        <polygon points="14,23 46,7 46,13 14,29" fill={C.stoneR} />
        {/* Permukaan aspal dua lajur */}
        <polygon points="-46,5 -14,-11 46,7 14,23" fill={C.asphalt} />
        {/* Pembatas beton tepi jalan */}
        <polygon points="-46,3 -14,-13 -12,-12 -44,4" fill={C.stoneTop} />
        <polygon points="12,22 44,6 46,7 14,23" fill={C.stoneTop} />
        {/* Marka putih tengah jalan */}
        {[-0.55, -0.18, 0.18, 0.55].map((t) => {
          const cx = t * 26;
          const cy = 6 + t * 8;
          return (
            <polygon
              key={t}
              points={`${cx - 5},${cy - 1.5} ${cx + 5},${cy + 1.5} ${cx + 7},${cy + 0.5} ${cx - 3},${cy - 2.5}`}
              fill={C.asphaltLine}
            />
          );
        })}
        {/* Satu mobil merah-bata dan satu mobil terang di atas dek jalan. */}
        <g transform="translate(-12 4)">
          <Box h={9} inset={55} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
          <polygon points="-7,-9 0,-5.5 7,-9 0,-12.5" fill={C.glass} />
        </g>
        <g transform="translate(14 10)">
          <Box h={10} inset={54} top={C.smoke} left={C.steelL} right={C.steelR} />
          <polygon points="-8,-10 0,-6 8,-10 0,-14" fill={C.glass} />
        </g>
      </g>
    </g>
  );
}

function Brt() {
  return (
    <g>
      {/* Lajur khusus bus di depan halte dengan zebra cross putih. */}
      <g transform={at(0.1, 0.16, 14)}>
        <polygon points="-44,8 8,-18 36,-4 -16,22" fill={C.asphalt} />
        {[-6, -1, 4].map((offset) => (
          <polygon
            key={offset}
            points={`${-22 + offset},${8 + offset * 0.5} ${-14 + offset},${4 + offset * 0.5} ${-11 + offset},${5.5 + offset * 0.5} ${-19 + offset},${9.5 + offset * 0.5}`}
            fill={C.asphaltLine}
          />
        ))}
      </g>
      {/* Halte kaca beratap putih dengan aksen panel surya di atapnya. */}
      <g transform={at(-0.14, -0.14, 14)}>
        <Box h={26} inset={30} top={C.glass} left={C.steelL} right={C.steelR} />
        <polygon points={facePoints('left', 34, 17, 26, 0.1, 0.9, 0.18, 0.82)} fill={C.glass} />
        <polygon points={facePoints('right', 34, 17, 26, 0.1, 0.9, 0.18, 0.82)} fill={C.glass} />
        <g transform={at(0, 0, 26)}>
          <Box h={4} inset={26} top={C.smoke} left={C.steelL} right={C.steelR} />
          <polygon points="-18,-5 0,4 18,-5 0,-14" fill={C.solar} />
        </g>
      </g>
      {/* Bus listrik biru gandeng dua ruas dengan deretan jendela kaca. */}
      <g transform={at(0.24, -0.06, 15)}>
        <Box h={20} inset={44} top={C.bus} left={C.bus} right={C.busDark} />
        <polygon points={facePoints('right', 20, 10, 20, 0.12, 0.88, 0.42, 0.78)} fill={C.glass} />
        <polygon points={facePoints('left', 20, 10, 20, 0.12, 0.88, 0.42, 0.78)} fill={C.glass} />
      </g>
      <g transform={at(-0.02, 0.2, 15)}>
        <Box h={19} inset={46} top={C.bus} left={C.bus} right={C.busDark} />
        <polygon points={facePoints('right', 18, 9, 19, 0.14, 0.86, 0.42, 0.78)} fill={C.glass} />
        <polygon points={facePoints('left', 18, 9, 19, 0.14, 0.86, 0.42, 0.78)} fill={C.glass} />
      </g>
    </g>
  );
}

function Industri() {
  return (
    <g>
      {/* Gudang pabrik bata merah dengan atap pelana baja dan jendela pita. */}
      <g transform={at(-0.08, -0.04, 14)}>
        <Box h={32} inset={28} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
        <polygon points="-36,-32 0,-14 0,-24 -36,-40" fill={C.steelL} />
        <polygon points="36,-32 0,-14 0,-24 36,-40" fill={C.steelR} />
        <polygon points="-36,-40 0,-24 36,-40 0,-54" fill={C.steelTop} />
        <polygon points={facePoints('left', 36, 18, 32, 0.14, 0.86, 0.44, 0.72)} fill={C.glass} />
        <polygon points={facePoints('right', 36, 18, 32, 0.28, 0.72, 0.0, 0.55)} fill={C.coal} />
      </g>
      {/* Dua tangki silo baja tinggi dan pipa penghubungnya di sisi kanan. */}
      <g transform={at(0.26, -0.22, 14)}>
        <Box h={44} inset={50} top={C.steelTop} left={C.steelL} right={C.steelR} />
        <rect x="-14" y="-34" width="28" height="4" fill={C.steelR} />
      </g>
      <g transform={at(0.36, 0.04, 14)}>
        <Box h={36} inset={51} top={C.steelTop} left={C.steelL} right={C.steelR} />
        <rect x="-13" y="-26" width="26" height="4" fill={C.steelR} />
      </g>
      {/* Tumpukan peti kemas warna-warni di halaman logistik depan. */}
      <g transform={at(-0.28, 0.28, 14)}>
        <Box h={14} inset={48} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <Box h={13} inset={49} lift={14} top={C.warmTop} left={C.warmL} right={C.warmR} />
      </g>
      <g transform={at(0.04, 0.34, 14)}>
        <Box h={13} inset={50} top={C.bus} left={C.bus} right={C.busDark} />
      </g>
    </g>
  );
}

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
      {/* Jalur taman melingkari kolam tengah dan jembatan kayu hangat. */}
      <g transform={at(0.06, 0.16, 14)}>
        <polygon points="-32,0 0,16 32,0 0,-16" fill={C.warmTop} opacity="0.55" />
        <polygon points="-24,0 0,12 24,0 0,-12" fill={C.pond} />
        {/* Jembatan taman kecil di atas kolam */}
        <polygon points="-10,4 4,-3 10,0 -4,7" fill={C.warmL} />
        <polygon points="-10,2 4,-5 10,-2 -4,5" fill={C.warmTop} />
      </g>
      {/* Gazebo kecil di tepi timur taman sesuai referensi taman kota. */}
      <g transform={at(0.32, -0.04, 14)}>
        <Box h={12} inset={54} top={C.warmTop} left={C.warmL} right={C.warmR} />
        <polygon points="-13,-12 0,-5 13,-12 0,-22" fill={C.brickTop} />
      </g>
      {/* Pohon-pohon rimbun dan pohon jarum menaungi sekeliling petak. */}
      <g transform={at(-0.32, 0.2, 14)}>{round(0.9)}</g>
      <g transform={at(0.24, -0.3, 14)}>{pine(0.84)}</g>
      <g transform={at(-0.22, -0.24, 14)}>{round(0.82)}</g>
      <g transform={at(-0.02, -0.06, 14)}>{round(1.02)}</g>
      <g transform={at(0.18, 0.34, 14)}>{pine(0.7)}</g>
    </g>
  );
}

function Tpa() {
  return (
    <g>
      {/* Genangan air lindi di kaki bukit sampah. */}
      <g transform={at(0.28, 0.18, 14)}>
        <polygon points="-16,0 0,8 16,0 0,-8" fill={C.pond} />
      </g>
      {/* Gundukan sampah bertingkat dengan serakan sampah warna-warni di lerengnya. */}
      <g transform={at(-0.04, -0.06, 14)}>
        <Box h={20} inset={20} top={C.warmL} left={C.warmL} right={C.warmR} />
        <Box h={18} inset={32} lift={20} top={C.stoneL} left={C.stoneL} right={C.stoneR} />
        <Box h={14} inset={44} lift={38} top={C.warmTop} left={C.warmL} right={C.warmR} />
        {[
          [-22, -20, C.glass],
          [12, -18, C.leafTop],
          [-6, -36, C.brickTop],
          [18, -32, C.smoke],
          [-24, -8, C.sun],
          [6, -46, C.bus],
        ].map(([x, y, fill], i) => (
          <rect
            key={i}
            x={x as number}
            y={y as number}
            width="7"
            height="5"
            rx="1.5"
            fill={fill as string}
          />
        ))}
        {/* Buldoser kuning di puncak lereng sampah. */}
        <g transform="translate(4 -52)">
          <Box h={9} inset={56} top={C.sun} left={C.warmL} right={C.warmR} />
        </g>
      </g>
      {/* Gudang seng kecil di sudut kiri dan truk sampah hijau di depan. */}
      <g transform={at(-0.32, 0.18, 14)}>
        <Box h={14} inset={52} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
      </g>
      <g transform={at(0.02, 0.34, 14)}>
        <Box h={17} inset={48} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <g transform="translate(10 5)">
          <Box h={13} inset={55} top={C.smoke} left={C.steelL} right={C.steelR} />
        </g>
        <polygon points={facePoints('right', 16, 8, 17, 0.12, 0.52, 0.48, 0.84)} fill={C.glass} />
      </g>
    </g>
  );
}

function Daurulang() {
  return (
    <g>
      {/* Hanggar pemilahan hijau-baja beratap hangat dengan panel surya di atapnya. */}
      <g transform={at(-0.06, -0.08, 14)}>
        <Box h={30} inset={24} top={C.glass} left={C.leafL} right={C.leafR} />
        <polygon points={facePoints('left', 40, 20, 30, 0.18, 0.82, 0.38, 0.74)} fill={C.smoke} />
        <polygon points={facePoints('right', 40, 20, 30, 0.22, 0.78, 0.0, 0.56)} fill={C.coal} />
        <g transform={at(0, 0, 30)}>
          <polygon points={diamond(18)} fill={C.warmTop} />
          <polygon points="-22,-2 0,9 22,-2 0,-13" fill={C.solar} />
        </g>
      </g>
      {/* Tiga bak pilah berwarna beda (hijau, kuning, biru), berbaris rapi di halaman depan. */}
      {[
        [-0.3, C.leafTop, C.leafL],
        [0, C.sun, C.warmL],
        [0.3, C.bus, C.busDark],
      ].map(([u, top, side], i) => (
        <g key={i} transform={at(u as number, 0.32, 14)}>
          <Box h={18} inset={48} top={top as string} left={side as string} right={side as string} />
        </g>
      ))}
    </g>
  );
}

function Perumahan() {
  const house = (roofSide: string, roofTop: string) => (
    <g>
      <Box h={20} inset={44} top={C.smoke} left={C.steelL} right={C.steelR} />
      <polygon points={facePoints('left', 20, 10, 20, 0.34, 0.66, 0.0, 0.58)} fill={C.ink} />
      <polygon points={facePoints('right', 20, 10, 20, 0.26, 0.74, 0.32, 0.72)} fill={C.glass} />
      <g transform="translate(0 -20)">
        <polygon points="-23,1 0,12.5 0,-1.5 -23,-13" fill={roofSide} />
        <polygon points="23,1 0,12.5 0,-1.5 23,-13" fill={roofSide} />
        <polygon points="-23,-13 0,-1.5 23,-13 0,-24.5" fill={roofTop} />
      </g>
    </g>
  );
  return (
    <g>
      {/* Jalan lingkungan bersilang di tengah klaster perumahan. */}
      <g transform={at(0, 0, 14)}>
        <polygon points="-50,-25 50,25 42,29 -58,-21" fill={C.stoneTop} opacity="0.65" />
        <polygon points="-50,25 50,-25 58,-21 -42,29" fill={C.stoneTop} opacity="0.65" />
      </g>
      {/* Empat rumah tapak beratap pelana, tersusun dua kali dua di atas petak. */}
      <g transform={at(-0.25, -0.25, 14)}>{house(C.brickLeft, C.brickTop)}</g>
      <g transform={at(0.25, -0.25, 14)}>{house(C.warmL, C.warmTop)}</g>
      <g transform={at(-0.25, 0.25, 14)}>{house(C.warmL, C.warmTop)}</g>
      <g transform={at(0.25, 0.25, 14)}>{house(C.brickLeft, C.brickTop)}</g>
    </g>
  );
}

function Apartemen() {
  const tower = (h: number, w: number, terraces: number[]) => (
    <g>
      <Box h={h} inset={64 - w} top={C.smoke} left={C.steelL} right={C.steelR} />
      {/* Deretan jendela di kedua sisi, lalu sabuk teras hijau tiap beberapa lantai. */}
      {[0.18, 0.44, 0.7].map((t) =>
        [0.16, 0.44, 0.72].map((s) => (
          <g key={`${t}-${s}`}>
            <polygon
              points={facePoints('left', w, w / 2, h, s, s + 0.16, t, t + 0.12)}
              fill={C.glass}
            />
            <polygon
              points={facePoints('right', w, w / 2, h, s, s + 0.16, t, t + 0.12)}
              fill={C.glass}
            />
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
      {/* Panel surya atap pada puncak menara hijau. */}
      <polygon
        points={`${-w * 0.55},${-h} 0,${-h + w * 0.28} ${w * 0.55},${-h} 0,${-h - w * 0.28}`}
        fill={C.solar}
      />
    </g>
  );
  return (
    <g>
      {/* Menara belakang lebih tinggi, menara depan lebih rendah, plus pohon taman di halaman. */}
      <g transform={at(-0.2, -0.22, 14)}>{tower(76, 22, [30, 58])}</g>
      <g transform={at(0.22, 0.18, 14)}>{tower(52, 20, [25])}</g>
      <g transform={at(-0.24, 0.28, 14)}>
        <rect x="-3" y="-10" width="6" height="12" rx="2" fill={C.warmR} />
        <circle cx="0" cy="-18" r="11" fill={C.leafTop} />
        <circle cx="-6" cy="-14" r="8" fill={C.leafL} />
      </g>
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

/**
 * Satu bangunan, digambar langsung.
 *
 * Sempat dipakai <symbol> + <use> agar bisa dipakai ulang, tapi viewport milik
 * <symbol> memotong bangunan yang menjulang keluar darinya, dan satu halaman
 * hanya memuat satu peta berisi lima bangunan: indirection-nya tidak menghemat
 * apa pun dan hanya menambah cara untuk gagal.
 */
export function Building({ id }: { id: AssetId }) {
  const Draw = BUILDINGS[id];
  return <Draw />;
}
