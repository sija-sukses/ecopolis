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

/** Posisi lima petak dalam koordinat ubin, tersusun seperti mata dadu lima. */
export const PLOT_TILES: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [1, 2],
];

/** Proyeksi koordinat ubin ke koordinat layar. */
export function iso(tx: number, ty: number): [number, number] {
  return [(tx - ty) * (TILE_W / 2), (tx + ty) * (TILE_H / 2)];
}

/**
 * Petak dirapatkan 0.82x dari jarak ubin penuh. Bangunan tetap seukuran
 * aslinya, jadi tepinya saling bersinggungan sedikit dan kota terbaca padat,
 * bukan sebagai lima benda yang berjauhan.
 *
 * PLOT_TILES sudah urut dari belakang ke depan (menurut tx + ty), jadi
 * bangunan depan selalu menimpa yang belakang dengan benar.
 */
const PACK = 1;

export const PLOT_POS = PLOT_TILES.map(([x, y]) => {
  const [sx, sy] = iso(x, y);
  return [sx * PACK, sy * PACK] as [number, number];
});

const HW = TILE_W / 2;
const HH = TILE_H / 2;

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

/* Warna diambil dari token CSS, jadi satu perubahan tema mengubah seluruh kota. */
const C = {
  grassTop: 'var(--grass-top)',
  grassL: 'var(--grass-left)',
  grassR: 'var(--grass-right)',
  stoneTop: 'var(--stone-top)',
  stoneL: 'var(--stone-left)',
  stoneR: 'var(--stone-right)',
  warmTop: 'var(--warm-top)',
  warmL: 'var(--warm-left)',
  warmR: 'var(--warm-right)',
  leafTop: 'var(--leaf-top)',
  leafL: 'var(--leaf-left)',
  leafR: 'var(--leaf-right)',
  smoke: 'var(--smoke)',
  soilLeft: 'var(--isle-left)',
  soilRight: 'var(--isle-right)',
  glass: 'var(--glass)',
  sun: 'var(--sun)',
  ink: 'var(--ink)',
};

/**
 * Satu petak: balok rumput setebal PAD_H dengan sisi tanah.
 *
 * Kelima petak inilah pulaunya. Tidak ada slab besar di bawahnya, karena
 * susunan lima petak hanya mengisi lima dari sembilan sel, sehingga slab
 * persegi selalu menyisakan tanah kosong yang terbaca sebagai piring hampa.
 */
export const PAD_H = 24;

export function PlotPad() {
  return <Box h={PAD_H} top={C.grassTop} left={C.soilLeft} right={C.soilRight} />;
}

/** Bangunan digambar untuk alas setebal 14, jadi digeser naik sebanyak sisanya. */
export const BUILDING_LIFT = PAD_H - 14;

/** Bangunan digambar seukuran ubin penuh lalu dikecilkan sebesar ini, supaya
    tetap ada ruang kosong di sekeliling tiap petak. */
export const BUILDING_SCALE = 0.85;

function Pltu() {
  return (
    <g>
      <Box h={42} inset={24} lift={14} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      {/* Dua cerobong bergaris, penanda PLTU yang paling dikenali. */}
      <g transform="translate(-20 -30)">
        <Box h={62} inset={44} top={C.smoke} left={C.stoneL} right={C.stoneR} />
        <rect x="-8" y="-100" width="16" height="10" rx="3" fill={C.warmR} />
      </g>
      <g transform="translate(18 -20)">
        <Box h={46} inset={46} top={C.smoke} left={C.stoneL} right={C.stoneR} />
        <rect x="-7" y="-74" width="14" height="9" rx="3" fill={C.warmR} />
      </g>
      <circle cx="-20" cy="-104" r="12" fill={C.smoke} opacity="0.85" />
      <circle cx="-4" cy="-118" r="9" fill={C.smoke} opacity="0.6" />
      <circle cx="-32" cy="-124" r="7" fill={C.smoke} opacity="0.45" />
    </g>
  );
}

function Plts() {
  return (
    <g>
      {/* Tiga baris panel miring menghadap satu arah. */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${(i - 1) * 30} ${(i - 1) * 15 - 6})`}>
          <polygon points="-34,2 0,19 34,2 0,-15" fill={C.stoneL} />
          <polygon points="-34,-6 0,11 34,-6 0,-23" fill={C.glass} />
          <rect x="-3" y="4" width="6" height="14" fill={C.stoneR} />
        </g>
      ))}
      <circle cx="40" cy="-70" r="18" fill={C.sun} />
    </g>
  );
}

function Tol() {
  return (
    <g>
      {/* Jalan layang melintasi petak, ditopang dua pilar. */}
      <g transform="translate(0 -46)">
        <polygon points={diamond(7)} fill={C.stoneTop} />
        <polygon points={`${-(HW - 14)},0 0,${HH - 7} 0,${HH + 3} ${-(HW - 14)},10`} fill={C.stoneL} />
        <polygon points={`${HW - 14},0 0,${HH - 7} 0,${HH + 3} ${HW - 14},10`} fill={C.stoneR} />
        <polygon points="-56,0 0,28 56,0 0,-28" fill={C.stoneTop} />
        <polygon points="-30,-2 -14,6 0,-1 -16,-9" fill={C.smoke} />
        <polygon points="14,6 30,14 44,7 28,-1" fill={C.smoke} />
      </g>
      <Box h={46} inset={26} lift={10} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      <g transform="translate(-34 18)">
        <Box h={40} inset={28} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
    </g>
  );
}

function Brt() {
  return (
    <g>
      {/* Halte memanjang dengan satu bus listrik di depannya. */}
      <Box h={30} inset={24} lift={14} top={C.glass} left={C.stoneL} right={C.stoneR} />
      <g transform="translate(0 -40)">
        <polygon points={diamond(20)} fill={C.smoke} />
      </g>
      <g transform="translate(6 24)">
        <Box h={30} inset={35} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <rect x="-16" y="-24" width="32" height="9" rx="3" fill={C.glass} />
      </g>
    </g>
  );
}

function Industri() {
  return (
    <g>
      {/* Tiga blok pabrik dengan atap gergaji. */}
      <Box h={44} inset={23} lift={14} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      <g transform="translate(-30 -58)">
        <Box h={34} inset={36} top={C.warmTop} left={C.warmL} right={C.warmR} />
      </g>
      <g transform="translate(14 -50)">
        <Box h={52} inset={37} top={C.warmTop} left={C.warmL} right={C.warmR} />
      </g>
      <g transform="translate(40 -36)">
        <Box h={30} inset={39} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      </g>
      <circle cx="14" cy="-118" r="12" fill={C.smoke} opacity="0.75" />
      <circle cx="30" cy="-132" r="8" fill={C.smoke} opacity="0.5" />
    </g>
  );
}

function Hutan() {
  const tree = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-16" width="10" height="20" rx="4" fill={C.warmR} />
      <circle cx="0" cy="-34" r="26" fill={C.leafTop} />
      <circle cx="-16" cy="-22" r="18" fill={C.leafL} />
      <circle cx="17" cy="-24" r="17" fill={C.leafR} />
    </g>
  );
  return (
    <g>
      <g transform="translate(0 -14)">
        {tree(-32, 12, 0.85)}
        {tree(30, 16, 0.78)}
        {tree(-2, -6, 1.05)}
      </g>
    </g>
  );
}

function Tpa() {
  return (
    <g>
      {/* Gundukan sampah bertingkat dengan serakan di puncaknya. */}
      <Box h={24} inset={20} lift={14} top={C.warmL} left={C.warmL} right={C.warmR} />
      <Box h={22} inset={31} lift={38} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      <Box h={18} inset={42} lift={60} top={C.warmTop} left={C.warmL} right={C.warmR} />
      <circle cx="-14" cy="-92" r="6" fill={C.glass} />
      <circle cx="10" cy="-96" r="5" fill={C.leafTop} />
      <circle cx="-2" cy="-104" r="4" fill={C.warmR} />
      <circle cx="26" cy="-86" r="4" fill={C.smoke} />
    </g>
  );
}

function Daurulang() {
  return (
    <g>
      {/* Hanggar pemilahan dengan tiga bak terpisah di depannya. */}
      <Box h={32} inset={24} lift={14} top={C.glass} left={C.stoneL} right={C.stoneR} />
      <g transform="translate(0 -42)">
        <polygon points={diamond(20)} fill={C.warmTop} />
      </g>
      {[
        [-36, 20, C.leafTop],
        [-6, 34, C.sun],
        [24, 24, C.warmR],
      ].map(([x, y, fill], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <Box h={22} inset={43} top={fill as string} left={C.stoneL} right={C.stoneR} />
        </g>
      ))}
    </g>
  );
}

function Perumahan() {
  const house = (x: number, y: number, roof: string) => (
    <g transform={`translate(${x} ${y})`}>
      <Box h={26} inset={39} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      <g transform="translate(0 -26)">
        <polygon points="-26,0 0,13 26,0 0,-13" fill={roof} />
      </g>
    </g>
  );
  return (
    <g>
      {house(-32, 8, C.warmR)}
      {house(2, 24, C.warmTop)}
      {house(32, 4, C.warmR)}
      {house(0, -10, C.warmTop)}
    </g>
  );
}

function Apartemen() {
  return (
    <g>
      {/* Dua menara dengan teras hijau di tiap lantai. */}
      <g transform="translate(-22 6)">
        <Box h={74} inset={37} top={C.glass} left={C.stoneL} right={C.stoneR} />
        {[22, 42, 62].map((t) => (
          <polygon key={t} points={`-27,${-t} 0,${-t + 13} 27,${-t} 0,${-t - 13}`} fill={C.leafTop} />
        ))}
      </g>
      <g transform="translate(26 20)">
        <Box h={52} inset={40} top={C.glass} left={C.stoneL} right={C.stoneR} />
        {[20, 38].map((t) => (
          <polygon key={t} points={`-24,${-t} 0,${-t + 12} 24,${-t} 0,${-t - 12}`} fill={C.leafTop} />
        ))}
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

/** Semua bangunan sebagai <symbol>, ditulis sekali per halaman. */
export function IsoSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        {ASSET_IDS.map((id) => {
          const Building = BUILDINGS[id];
          return (
            <symbol key={id} id={`b-${id}`} overflow="visible">
              <Building />
            </symbol>
          );
        })}
      </defs>
    </svg>
  );
}

/** Satu bangunan, dipanggil dari sprite. */
export function Building({ id }: { id: AssetId }) {
  return <use href={`#b-${id}`} />;
}
