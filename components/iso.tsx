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

/** Panel surya: bidang miring navy dengan kisi putih, di atas dua kaki. */
function SolarPanel() {
  const w = 30;
  const front = 13;
  const back = 21;
  const line = (p: string, sw = 1.5) => (
    <polyline points={p} stroke={C.solarLine} strokeWidth={sw} fill="none" />
  );
  return (
    <g>
      <rect x="-13" y="-1" width="5" height="15" fill={C.stoneR} />
      <rect x="8" y="-1" width="5" height="15" fill={C.stoneR} />
      {/* Sisi tebal panel, supaya tidak terbaca sebagai genangan air. */}
      <polygon points={`${-w},4 0,${front + 4} ${w},4 0,${4 - back}`} fill={C.solarDark} />
      <polygon points={`${-w},0 0,${front} ${w},0 0,${-back}`} fill={C.solar} />
      {/* Kisi tiga kali tiga: penanda panel surya yang paling cepat dikenali. */}
      {line(`${-w},0 ${w},0`)}
      {line(`0,${-back} 0,${front}`)}
      {line(`${-w / 3},${-back / 3 - front / 3 + front / 3} ${(2 * w) / 3},${front / 3 + back / 3 - back / 3}`, 0)}
      {line(`${-w * 0.66},${-back * 0.34} ${w * 0.34},${front * 0.66}`, 1.2)}
      {line(`${-w * 0.34},${-back * 0.66} ${w * 0.66},${front * 0.34}`, 1.2)}
      {line(`${-w * 0.66},${back * 0.34} ${w * 0.34},${-front * 0.66}`, 1.2)}
      {line(`${-w * 0.34},${back * 0.66} ${w * 0.66},${-front * 0.34}`, 1.2)}
    </g>
  );
}

function Plts() {
  return (
    <g>
      {/* Tiga baris panel menghadap satu arah, plus kotak inverter putih. */}
      <g transform={at(-0.3, 0.3, 14)}>
        <SolarPanel />
      </g>
      <g transform={at(0, 0, 14)}>
        <SolarPanel />
      </g>
      <g transform={at(0.3, -0.3, 14)}>
        <SolarPanel />
      </g>
      <g transform={at(-0.3, -0.3, 14)}>
        <Box h={22} inset={46} top={C.smoke} left={C.steelL} right={C.steelR} />
      </g>
      <circle cx="46" cy="-66" r="16" fill={C.sun} />
    </g>
  );
}

function Pltu() {
  const w = 64 - 22;
  const d = 32 - 11;
  return (
    <g>
      {/* Gedung boiler bata merah, dengan jendela pita di sisinya. */}
      <Box h={36} inset={22} lift={14} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
      <g transform="translate(0 -14)">
        <polygon points={facePoints('left', w, d, 36, 0.18, 0.82, 0.4, 0.66)} fill={C.glass} />
        <polygon points={facePoints('right', w, d, 36, 0.18, 0.82, 0.4, 0.66)} fill={C.glass} />
      </g>
      {/* Dua cerobong tinggi bergaris putih: siluet PLTU yang paling dikenali. */}
      <g transform={at(-0.17, 0.17, 50)}>
        <Box h={74} inset={48} top={C.coalLight} left={C.coal} right={C.coal} />
        <rect x="-16" y="-56" width="32" height="7" fill={C.smoke} />
        <rect x="-16" y="-34" width="32" height="7" fill={C.smoke} />
        <circle cx="0" cy="-86" r="13" fill={C.smoke} opacity="0.9" />
        <circle cx="15" cy="-102" r="10" fill={C.smoke} opacity="0.6" />
        <circle cx="-5" cy="-114" r="8" fill={C.smoke} opacity="0.4" />
      </g>
      <g transform={at(0.18, -0.18, 50)}>
        <Box h={56} inset={50} top={C.coalLight} left={C.coal} right={C.coal} />
        <rect x="-14" y="-42" width="28" height="6" fill={C.smoke} />
      </g>
      {/* Timbunan batu bara di depan: hitam, rendah, tidak bisa tertukar. */}
      <g transform={at(0.1, 0.34, 14)}>
        <Box h={16} inset={44} top={C.coalLight} left={C.coal} right={C.coal} />
        <Box h={12} inset={54} lift={16} top={C.coalLight} left={C.coal} right={C.coal} />
      </g>
    </g>
  );
}

function Tol() {
  return (
    <g>
      {/* Dua pilar beton menopang satu dek jalan dengan marka putih. */}
      <g transform={at(-0.3, 0.3, 14)}>
        <Box h={46} inset={48} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
      <g transform={at(0.3, -0.3, 14)}>
        <Box h={46} inset={48} top={C.stoneTop} left={C.stoneL} right={C.stoneR} />
      </g>
      <g transform={at(0, 0, 60)}>
        <polygon points="-62,0 0,31 0,39 -62,8" fill={C.stoneR} />
        <polygon points="62,0 0,31 0,39 62,8" fill={C.stoneL} />
        <polygon points="-62,0 0,31 62,0 0,-31" fill={C.asphalt} />
        {[-0.58, -0.18, 0.22, 0.62].map((k) => (
          <polygon
            key={k}
            points={`${k * 62 - 9},${k * 31 - 4.5} ${k * 62 + 9},${k * 31 + 4.5} ${
              k * 62 + 13
            },${k * 31 + 2.5} ${k * 62 - 5},${k * 31 - 6.5}`}
            fill={C.asphaltLine}
          />
        ))}
        {/* Satu mobil kecil, supaya skalanya terbaca. */}
        <g transform="translate(20 10)">
          <Box h={11} inset={54} top={C.smoke} left={C.steelL} right={C.steelR} />
          <polygon points="-10,-11 0,-6 10,-11 0,-16" fill={C.glass} />
        </g>
      </g>
    </g>
  );
}

function Brt() {
  return (
    <g>
      {/* Halte panjang berdinding kaca dengan atap putih. */}
      <Box h={26} inset={24} lift={14} top={C.glass} left={C.steelL} right={C.steelR} />
      <g transform={at(0, 0, 40)}>
        <polygon points={diamond(18)} fill={C.smoke} />
      </g>
      {/* Bus listrik biru dua ruas dengan deretan jendela. */}
      <g transform={at(0.26, -0.12, 14)}>
        <Box h={24} inset={40} top={C.bus} left={C.bus} right={C.busDark} />
        <polygon points={facePoints('right', 24, 12, 24, 0.12, 0.88, 0.45, 0.78)} fill={C.glass} />
        <polygon points={facePoints('left', 24, 12, 24, 0.12, 0.88, 0.45, 0.78)} fill={C.glass} />
      </g>
      <g transform={at(-0.04, 0.18, 14)}>
        <Box h={22} inset={44} top={C.bus} left={C.bus} right={C.busDark} />
        <polygon points={facePoints('right', 20, 10, 22, 0.14, 0.86, 0.45, 0.78)} fill={C.glass} />
      </g>
    </g>
  );
}

function Industri() {
  return (
    <g>
      {/* Blok pabrik bata dengan jendela pita. */}
      <Box h={34} inset={24} lift={14} top={C.brickTop} left={C.brickLeft} right={C.brickRight} />
      <g transform="translate(0 -14)">
        <polygon points={facePoints('left', 40, 20, 34, 0.15, 0.85, 0.42, 0.68)} fill={C.glass} />
      </g>
      {/* Dua tangki baja dan pipa penghubungnya. */}
      <g transform={at(0.22, -0.2, 48)}>
        <Box h={40} inset={50} top={C.steelTop} left={C.steelL} right={C.steelR} />
        <rect x="-14" y="-30" width="28" height="5" fill={C.steelR} />
      </g>
      <g transform={at(0.36, 0.04, 48)}>
        <Box h={30} inset={52} top={C.steelTop} left={C.steelL} right={C.steelR} />
      </g>
      {/* Peti kemas bertumpuk di halaman. */}
      <g transform={at(-0.28, 0.28, 14)}>
        <Box h={14} inset={48} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <Box h={13} inset={50} lift={14} top={C.warmTop} left={C.warmL} right={C.warmR} />
      </g>
    </g>
  );
}

function Hutan() {
  const round = (s: number) => (
    <g transform={`scale(${s})`}>
      <rect x="-5" y="-16" width="10" height="20" rx="4" fill={C.warmR} />
      <circle cx="0" cy="-32" r="22" fill={C.leafTop} />
      <circle cx="-13" cy="-21" r="15" fill={C.leafL} />
      <circle cx="14" cy="-23" r="14" fill={C.leafR} />
    </g>
  );
  const pine = (s: number) => (
    <g transform={`scale(${s})`}>
      <rect x="-4" y="-12" width="8" height="16" rx="3" fill={C.warmR} />
      <polygon points="-17,-12 0,-52 17,-12" fill={C.leafTop} />
      <polygon points="-13,-26 0,-62 13,-26" fill={C.leafR} />
    </g>
  );
  return (
    <g>
      {/* Kolam kecil memberi kontras warna di antara tajuk pohon. */}
      <g transform={at(0.12, 0.3, 14)}>
        <polygon points="-22,0 0,11 22,0 0,-11" fill={C.pond} />
      </g>
      <g transform={at(-0.3, 0.22, 14)}>{round(0.92)}</g>
      <g transform={at(0.3, -0.26, 14)}>{pine(0.8)}</g>
      <g transform={at(-0.04, -0.04, 14)}>{round(1.04)}</g>
    </g>
  );
}

function Tpa() {
  return (
    <g>
      {/* Gundukan sampah bertingkat dengan serakan berwarna di lerengnya. */}
      <Box h={22} inset={20} lift={14} top={C.warmL} left={C.warmL} right={C.warmR} />
      <Box h={20} inset={32} lift={36} top={C.stoneL} left={C.stoneL} right={C.stoneR} />
      <Box h={16} inset={44} lift={56} top={C.warmTop} left={C.warmL} right={C.warmR} />
      {[
        [-20, -34, C.glass],
        [14, -30, C.leafTop],
        [-4, -52, C.warmR],
        [24, -46, C.smoke],
        [-26, -18, C.sun],
      ].map(([x, y, fill], i) => (
        <rect key={i} x={x as number} y={y as number} width="7" height="5" rx="1.5" fill={fill as string} />
      ))}
      {/* Satu truk sampah hijau di kaki gundukan. */}
      <g transform={at(-0.1, 0.36, 14)}>
        <Box h={18} inset={48} top={C.leafTop} left={C.leafL} right={C.leafR} />
        <polygon points={facePoints('right', 16, 8, 18, 0.1, 0.5, 0.5, 0.85)} fill={C.glass} />
      </g>
    </g>
  );
}

function Daurulang() {
  return (
    <g>
      {/* Hanggar pemilahan beratap hangat. */}
      <Box h={30} inset={24} lift={14} top={C.glass} left={C.steelL} right={C.steelR} />
      <g transform={at(0, 0, 44)}>
        <polygon points={diamond(18)} fill={C.warmTop} />
      </g>
      <g transform="translate(0 -14)">
        <polygon points={facePoints('left', 40, 20, 30, 0.2, 0.8, 0.45, 0.72)} fill={C.smoke} />
      </g>
      {/* Tiga bak pilah berwarna beda, berbaris di sumbu isometrik. */}
      {[
        [-0.3, C.leafTop, C.leafL],
        [0, C.sun, C.warmL],
        [0.3, C.bus, C.busDark],
      ].map(([u, top, side], i) => (
        <g key={i} transform={at(u as number, 0.34, 14)}>
          <Box h={19} inset={48} top={top as string} left={side as string} right={side as string} />
        </g>
      ))}
    </g>
  );
}

function Perumahan() {
  const house = (roof: string) => (
    <g>
      <Box h={20} inset={44} top={C.smoke} left={C.steelL} right={C.steelR} />
      <polygon points={facePoints('right', 20, 10, 20, 0.3, 0.7, 0.3, 0.7)} fill={C.glass} />
      <g transform="translate(0 -20)">
        <polygon points="-24,0 0,12 0,-2 -24,-14" fill={roof} />
        <polygon points="24,0 0,12 0,-2 24,-14" fill={roof} />
        <polygon points="-24,-14 0,-2 24,-14 0,-26" fill={C.warmTop} />
      </g>
    </g>
  );
  return (
    <g>
      {/* Empat rumah tapak, tersusun dua kali dua di atas petak. */}
      <g transform={at(-0.24, -0.24, 14)}>{house(C.brickLeft)}</g>
      <g transform={at(0.24, -0.24, 14)}>{house(C.warmL)}</g>
      <g transform={at(-0.24, 0.24, 14)}>{house(C.warmL)}</g>
      <g transform={at(0.24, 0.24, 14)}>{house(C.brickLeft)}</g>
    </g>
  );
}

function Apartemen() {
  const tower = (h: number, w: number, terraces: number[]) => (
    <g>
      <Box h={h} inset={64 - w} top={C.smoke} left={C.steelL} right={C.steelR} />
      {/* Deretan jendela di kedua sisi, lalu teras hijau tiap beberapa lantai. */}
      {[0.2, 0.46, 0.72].map((t) =>
        [0.16, 0.46, 0.76].map((s) => (
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
    </g>
  );
  return (
    <g>
      {/* Menara belakang lebih tinggi, jadi keduanya tetap terbaca. */}
      <g transform={at(-0.22, -0.22, 14)}>{tower(76, 22, [30, 58])}</g>
      <g transform={at(0.22, 0.22, 14)}>{tower(50, 20, [24])}</g>
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
