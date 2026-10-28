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

/**
 * Menempatkan sesuatu di atas permukaan ubin.
 *
 * `u` dan `v` adalah satuan ubin pada dua sumbu isometrik, `lift` adalah
 * tinggi permukaan yang ditumpanginya. Tanpa ini, offset ditulis dengan
 * menebak dalam piksel layar dan sub-bangunan tampak melayang lepas dari
 * atapnya: pada bidang isometrik, bergeser mendatar sejauh dx selalu berarti
 * bergeser menurun dx/2 juga.
 */
function at(u: number, v: number, lift = 0) {
  return `translate(${(u - v) * HW} ${(u + v) * HH - lift})`;
}

function Pltu() {
  return (
    <g>
      <Box h={42} inset={24} lift={14} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      {/* Dua cerobong bergaris, penanda PLTU yang paling dikenali. */}
      <g transform={at(-0.18, 0.18, 56)}>
        <Box h={62} inset={44} top={C.smoke} left={C.stoneL} right={C.stoneR} />
        <rect x="-9" y="-70" width="18" height="11" rx="3" fill={C.warmR} />
        <circle cx="0" cy="-82" r="12" fill={C.smoke} opacity="0.85" />
        <circle cx="13" cy="-98" r="9" fill={C.smoke} opacity="0.55" />
        <circle cx="-6" cy="-110" r="7" fill={C.smoke} opacity="0.4" />
      </g>
      <g transform={at(0.2, -0.2, 56)}>
        <Box h={46} inset={46} top={C.smoke} left={C.stoneL} right={C.stoneR} />
        <rect x="-7" y="-53" width="14" height="9" rx="3" fill={C.warmR} />
      </g>
    </g>
  );
}

function Plts() {
  return (
    <g>
      {/* Tiga baris panel miring menghadap satu arah. */}
      {[
        [-0.3, 0.3],
        [0, 0],
        [0.3, -0.3],
      ].map(([u, v], i) => (
        <g key={i} transform={at(u, v, 14)}>
          <polygon points="-30,2 0,17 30,2 0,-13" fill={C.stoneL} />
          <polygon points="-30,-6 0,9 30,-6 0,-21" fill={C.glass} />
          <rect x="-3" y="4" width="6" height="12" fill={C.stoneR} />
        </g>
      ))}
      <circle cx="34" cy="-62" r="17" fill={C.sun} />
    </g>
  );
}

function Tol() {
  return (
    <g>
      {/* Dua pilar menopang satu dek jalan yang melintasi petak. */}
      <g transform={at(-0.3, 0.3, 14)}>
        <Box h={44} inset={46} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
      <g transform={at(0.3, -0.3, 14)}>
        <Box h={44} inset={46} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
      <g transform={at(0, 0, 58)}>
        <polygon points="-60,0 0,30 60,0 0,-30" fill={C.stoneTop} />
        <polygon points="-60,0 0,30 0,38 -60,8" fill={C.stoneL} />
        <polygon points="60,0 0,30 0,38 60,8" fill={C.stoneR} />
        {/* Marka jalan, sejajar sumbu isometrik. */}
        <polygon points="-34,-1 -18,7 -10,3 -26,-5" fill={C.smoke} />
        <polygon points="10,9 26,17 34,13 18,5" fill={C.smoke} />
      </g>
    </g>
  );
}

function Brt() {
  return (
    <g>
      {/* Halte beratap terang, dengan satu bus listrik menunggu di depannya. */}
      <Box h={30} inset={24} lift={14} top={C.glass} left={C.stoneL} right={C.stoneR} />
      <g transform={at(0, 0, 44)}>
        <polygon points={diamond(16)} fill={C.smoke} />
      </g>
      <g transform={at(0.28, -0.1, 14)}>
        <Box h={28} inset={40} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <rect x="-14" y="-24" width="28" height="8" rx="3" fill={C.glass} />
      </g>
    </g>
  );
}

function Industri() {
  return (
    <g>
      {/* Blok pabrik bertingkat di atas satu alas beton. */}
      <Box h={40} inset={23} lift={14} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      <g transform={at(-0.2, 0.04, 54)}>
        <Box h={30} inset={38} top={C.warmTop} left={C.warmL} right={C.warmR} />
      </g>
      <g transform={at(0.1, -0.1, 54)}>
        <Box h={46} inset={38} top={C.warmTop} left={C.warmL} right={C.warmR} />
        <circle cx="0" cy="-62" r="11" fill={C.smoke} opacity="0.7" />
        <circle cx="12" cy="-76" r="8" fill={C.smoke} opacity="0.45" />
      </g>
      <g transform={at(0.06, 0.28, 54)}>
        <Box h={22} inset={42} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      </g>
    </g>
  );
}

function Hutan() {
  const tree = (s: number) => (
    <g transform={`scale(${s})`}>
      <rect x="-5" y="-18" width="10" height="22" rx="4" fill={C.warmR} />
      <circle cx="0" cy="-36" r="25" fill={C.leafTop} />
      <circle cx="-15" cy="-24" r="17" fill={C.leafL} />
      <circle cx="16" cy="-26" r="16" fill={C.leafR} />
    </g>
  );
  return (
    <g>
      <g transform={at(-0.3, 0.25, 14)}>{tree(0.9)}</g>
      <g transform={at(0.3, -0.25, 14)}>{tree(0.8)}</g>
      <g transform={at(0, 0, 14)}>{tree(1.05)}</g>
    </g>
  );
}

function Tpa() {
  return (
    <g>
      {/* Gundukan sampah bertingkat, makin ke atas makin kecil. */}
      <Box h={24} inset={20} lift={14} top={C.warmL} left={C.warmL} right={C.warmR} />
      <Box h={22} inset={31} lift={38} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      <Box h={18} inset={42} lift={60} top={C.warmTop} left={C.warmL} right={C.warmR} />
      <g transform={at(0, 0, 78)}>
        <circle cx="-12" cy="-5" r="6" fill={C.glass} />
        <circle cx="9" cy="-9" r="5" fill={C.leafTop} />
        <circle cx="-2" cy="-16" r="4" fill={C.warmR} />
        <circle cx="20" cy="2" r="4" fill={C.smoke} />
      </g>
    </g>
  );
}

function Daurulang() {
  return (
    <g>
      {/* Hanggar pemilahan beratap hangat, dengan tiga bak di depannya. */}
      <Box h={32} inset={24} lift={14} top={C.glass} left={C.stoneL} right={C.stoneR} />
      <g transform={at(0, 0, 46)}>
        <polygon points={diamond(18)} fill={C.warmTop} />
      </g>
      {[
        [-0.3, C.leafTop],
        [0, C.sun],
        [0.3, C.warmR],
      ].map(([u, fill], i) => (
        <g key={i} transform={at(u as number, 0.34, 14)}>
          <Box h={20} inset={46} top={fill as string} left={C.stoneL} right={C.stoneR} />
        </g>
      ))}
    </g>
  );
}

function Perumahan() {
  const house = (roof: string) => (
    <g>
      <Box h={24} inset={42} top={C.smoke} left={C.stoneL} right={C.stoneR} />
      <g transform="translate(0 -24)">
        <polygon points="-23,0 0,11 23,0 0,-11" fill={roof} />
      </g>
    </g>
  );
  return (
    <g>
      {/* Empat rumah tapak, tersusun dua kali dua di atas petak. */}
      <g transform={at(-0.22, -0.22, 14)}>{house(C.warmR)}</g>
      <g transform={at(0.22, -0.22, 14)}>{house(C.warmTop)}</g>
      <g transform={at(-0.22, 0.22, 14)}>{house(C.warmTop)}</g>
      <g transform={at(0.22, 0.22, 14)}>{house(C.warmR)}</g>
    </g>
  );
}

function Apartemen() {
  const tower = (h: number, terraces: number[]) => (
    <g>
      <Box h={h} inset={38} top={C.glass} left={C.stoneL} right={C.stoneR} />
      {terraces.map((t) => (
        <polygon key={t} points={`-26,${-t} 0,${-t + 13} 26,${-t} 0,${-t - 13}`} fill={C.leafTop} />
      ))}
    </g>
  );
  return (
    <g>
      {/* Menara belakang lebih tinggi, jadi keduanya tetap terbaca. */}
      <g transform={at(-0.2, -0.2, 14)}>{tower(74, [22, 44, 64])}</g>
      <g transform={at(0.2, 0.2, 14)}>{tower(50, [20, 38])}</g>
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
