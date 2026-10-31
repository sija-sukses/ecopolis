import { avatarOf } from './avatars.ts';
import type { AssetId } from './types.ts';

export type PollutionLevel = 'bersih' | 'sedang' | 'parah';
export type WaterTurbidity = 'jernih' | 'sedang' | 'parah';

export type RiverPalette = {
  top: string;
  mid: string;
  deep: string;
  currentMain: string;
  currentAlt: string;
  foam: string;
  waterfallTop: string;
  waterfallLeft: string;
  waterfallRight: string;
  cloudTop: string;
  cloudLeft: string;
  cloudRight: string;
};

/**
 * Menghitung tingkat polusi udara kota berdasarkan keberadaan PLTU Batu Bara
 * dan Kawasan Industri:
 * - 'bersih': tidak ada keduanya
 * - 'sedang': salah satu terbangun (PLTU saja atau Industri saja)
 * - 'parah': keduanya terbangun (PLTU + Industri)
 */
export function getPollutionLevel(plots: (AssetId | null)[]): PollutionLevel {
  const hasPltu = plots.includes('pltu');
  const hasIndustri = plots.includes('industri');
  if (hasPltu && hasIndustri) return 'parah';
  if (hasPltu || hasIndustri) return 'sedang';
  return 'bersih';
}

/**
 * Menghitung tingkat kekeruhan air sungai berdasarkan keberadaan Kawasan
 * Industri dan TPA Terbuka:
 * - 'jernih': tidak ada keduanya (sungai biru sian jernih & air terjun bersih)
 * - 'sedang': Kawasan Industri terbangun (air keruh sedang kehijauan-coklat)
 * - 'parah': TPA Terbuka terbangun (air lumpur limbah coklat tua pekat)
 */
export function getWaterTurbidity(plots: (AssetId | null)[]): WaterTurbidity {
  const hasTpa = plots.includes('tpa');
  const hasIndustri = plots.includes('industri');
  if (hasTpa) return 'parah';
  if (hasIndustri) return 'sedang';
  return 'jernih';
}

/**
 * Palet warna air sungai, air terjun berundak, dan kabut awan bawah sesuai
 * tingkat kekeruhan.
 */
export function getRiverPalette(plots: (AssetId | null)[]): RiverPalette {
  const turbidity = getWaterTurbidity(plots);
  if (turbidity === 'parah') {
    return {
      top: '#5c3f24',
      mid: '#472f19',
      deep: '#33200f',
      currentMain: '#8a6847',
      currentAlt: '#705134',
      foam: '#9c7c5c',
      waterfallTop: '#6b4a2b',
      waterfallLeft: '#52371e',
      waterfallRight: '#3d2713',
      cloudTop: '#dfd5c8',
      cloudLeft: '#c7b8a6',
      cloudRight: '#ab9984',
    };
  }
  if (turbidity === 'sedang') {
    return {
      top: '#8f884a',
      mid: '#766f39',
      deep: '#5c5628',
      currentMain: '#b8b27d',
      currentAlt: '#9e9860',
      foam: '#c9c497',
      waterfallTop: '#9c9556',
      waterfallLeft: '#7d763e',
      waterfallRight: '#635c2c',
      cloudTop: '#ecebd8',
      cloudLeft: '#d9d7be',
      cloudRight: '#bfbca0',
    };
  }
  return {
    top: 'var(--river-top)',
    mid: 'var(--river-mid)',
    deep: 'var(--river-deep)',
    currentMain: '#ffffff',
    currentAlt: '#bfe8ff',
    foam: '#ffffff',
    waterfallTop: '#7fd6ff',
    waterfallLeft: '#4eb8f2',
    waterfallRight: '#2f97d6',
    cloudTop: '#ffffff',
    cloudLeft: '#edf3ff',
    cloudRight: '#d4e1fc',
  };
}

export type TolVehicleKind =
  | 'car-blue'
  | 'car-white'
  | 'car-yellow'
  | 'bus-green'
  | 'van-delivery';

export type TolVehicleAsset = {
  id: TolVehicleKind;
  label: string;
  src: string;
  spriteSymbol: string;
  width: number;
  height: number;
};

/**
 * Daftar aset kendaraan tol transparan (SVG terpisah & sprite sheet) agar
 * kendaraan dapat digerakkan secara dinamis di atas canvas peta tanpa
 * me-render ulang seluruh pulau.
 */
export const TOL_VEHICLE_ASSETS: Record<TolVehicleKind, TolVehicleAsset> = {
  'car-blue': {
    id: 'car-blue',
    label: 'Mobil Listrik Biru Kompak',
    src: '/assets/vehicles/car-blue.svg',
    spriteSymbol: '#tol-veh-car-blue',
    width: 34,
    height: 28,
  },
  'car-white': {
    id: 'car-white',
    label: 'Mobil Listrik Putih Kompak',
    src: '/assets/vehicles/car-white.svg',
    spriteSymbol: '#tol-veh-car-white',
    width: 34,
    height: 28,
  },
  'car-yellow': {
    id: 'car-yellow',
    label: 'Mobil Listrik Kuning Cerah',
    src: '/assets/vehicles/car-yellow.svg',
    spriteSymbol: '#tol-veh-car-yellow',
    width: 34,
    height: 28,
  },
  'bus-green': {
    id: 'bus-green',
    label: 'Bus Umum Listrik Hijau Miniatur',
    src: '/assets/vehicles/bus-green.svg',
    spriteSymbol: '#tol-veh-bus-green',
    width: 44,
    height: 34,
  },
  'van-delivery': {
    id: 'van-delivery',
    label: 'Van Pengiriman Nir-Emisi',
    src: '/assets/vehicles/van-delivery.svg',
    spriteSymbol: '#tol-veh-van-delivery',
    width: 38,
    height: 31,
  },
};

export type TolSpineSample = {
  t: number;
  u: number;
  v: number;
  lift: number;
  groundLift: number;
  angleDeg: number;
};

/**
 * Menghitung titik sampel kurva 3D jalan tol layang dalam kota (ramping naik
 * dari permukaan tanah, melengkung halus di atas pilar silinder, lalu melandai).
 */
export function sampleTolFlyoverSpine(t: number): TolSpineSample {
  const clamped = Math.max(0, Math.min(1, t));
  const inv = 1 - clamped;

  // Kurva Bézier kuadratik horizontal di ruang ubin (u, v)
  const u0 = -0.98;
  const v0 = -0.05;
  const uCtrl = 0.04;
  const vCtrl = -0.28;
  const u1 = 0.98;
  const v1 = 0.42;

  const u = inv * inv * u0 + 2 * inv * clamped * uCtrl + clamped * clamped * u1;
  const v = inv * inv * v0 + 2 * inv * clamped * vCtrl + clamped * clamped * v1;

  // Profil elevasi: tanjakan mulus dari tanah (14.8) ke dek layang tinggi (42.0) lalu melandai ke tanah (14.8)
  const groundLift = 14;
  const arch = Math.sin(Math.PI * clamped);
  const lift = groundLift + 0.8 + Math.pow(arch, 0.85) * 27.2;

  // Turunan kurva di layar untuk orientasi lajur kendaraan
  const du = 2 * inv * (uCtrl - u0) + 2 * clamped * (u1 - uCtrl);
  const dv = 2 * inv * (vCtrl - v0) + 2 * clamped * (v1 - vCtrl);
  const dx = (du - dv) * 64;
  const dy = (du + dv) * 32;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return { t: clamped, u, v, lift, groundLift, angleDeg };
}

/**
 * Tahap transisi petak pembangunan di Ecopolis:
 * [Petak Kosong / Paving] ('empty')
 * ↓ (User klik kartu kebijakan SDG)
 * [Aset Konstruksi: Crane + Pekerja + Rangka Gedung] ('construction')
 * ↓ (Timer berjalan / transisi round ~2.5 detik)
 * [Aset Peresmian: Walikota potong pita merah di karpet merah + Confetti] ('ceremony')
 * ↓ (Efek partikel confetti / suara peresmian selesai)
 * [Aset Gedung Jadi yang Beroperasi Penuh] ('operational')
 */
export type PlotTransitionStage = 'empty' | 'construction' | 'ceremony' | 'operational';

/** Durasi fase konstruksi (ms) sebelum masuk ke prosesi peresmian. */
export const CONSTRUCTION_DURATION_MS = 1500;

/** Durasi fase peresmian gunting pita Walikota (ms) sebelum gedung beroperasi penuh. */
export const CEREMONY_DURATION_MS = 1500;

/** Total durasi transisi konstruksi + peresmian (3.0 detik). */
export const TOTAL_TRANSITION_MS = CONSTRUCTION_DURATION_MS + CEREMONY_DURATION_MS;

/**
 * Skala dan ketinggian kelompok bangunan di atas petak.
 *
 * Ditaruh di sini, bukan di `iso.tsx`, karena posisi Walikota di layar
 * terpisah harus diturunkan dari angka yang sama. Sebelumnya keduanya ditulis
 * terpisah dan offset Walikota ditebak dengan tangan, sehingga ia berdiri
 * jauh dari pita yang harus dipotongnya. `iso.tsx` mengekspor ulang keduanya.
 */
export const BUILDING_LIFT = -14;
export const BUILDING_SCALE = 0.88;

/** Jangkar halaman peresmian, dalam satuan ubin pada ruang bangunan. */
export const CEREMONY_ANCHOR = { u: 0.18, v: 0.72, lift: 4 };

/** Menerjemahkan titik di ruang bangunan ke offset relatif terhadap petak. */
export function buildingPointToPlot(u: number, v: number, lift = 0): [number, number] {
  const lx = (u - v) * 64;
  const ly = (u + v) * 32 - lift;
  return [BUILDING_SCALE * lx, -BUILDING_LIFT + BUILDING_SCALE * ly];
}

export type MayorPoseMode = 'idle' | 'ceremony' | 'inspection';

/**
 * Tahap sinematik saat sebuah kawasan dibangun.
 *
 * Kamera mendekat ke petaknya, layar ditutup iris hitam dari kanan bawah,
 * lalu dibuka lagi dalam mode sinematik: Walikota berhelm meninjau lokasi,
 * pekerja bekerja, dan berlanjut ke pemotongan pita. Indikator baru berubah
 * di tahap 'ceremony', supaya dampaknya terbaca sebagai hasil dari yang baru
 * saja ditonton, bukan terjadi di balik layar hitam.
 */
export type CutscenePhase =
  | 'zoom-in'
  | 'iris-in'
  | 'inspect'
  | 'ceremony'
  | 'iris-out'
  | 'zoom-out';

/** Lama tiap tahap dalam milidetik. */
export const CUTSCENE_TIMING: Record<CutscenePhase, number> = {
  'zoom-in': 700,
  'iris-in': 420,
  inspect: 1800,
  ceremony: 2200,
  'iris-out': 420,
  'zoom-out': 700,
};

export const CUTSCENE_ORDER: CutscenePhase[] = [
  'zoom-in',
  'iris-in',
  'inspect',
  'ceremony',
  'iris-out',
  'zoom-out',
];

export const CUTSCENE_TOTAL_MS = CUTSCENE_ORDER.reduce((n, p) => n + CUTSCENE_TIMING[p], 0);

/** Seberapa dekat kamera mendekat saat menyorot satu petak. */
export const CAMERA_ZOOM = 2.9;

/**
 * Titik tengah viewBox peta dalam koordinat ruang pengguna.
 * viewBox-nya "-570 -145 1140 610", jadi tengahnya (0, 160).
 * Harus ikut berubah kalau viewBox di `CityMap` diubah.
 */
const VIEW_CENTER: [number, number] = [0, 160];

/**
 * Transform CSS untuk mendekatkan kamera ke satu petak.
 *
 * Dipasang sebagai inline style pada `<g>` pembungkus yang **tidak punya
 * atribut transform sendiri**: pada elemen SVG, transform CSS menimpa atribut
 * transform, dan mencampur keduanya di satu elemen pernah menumpuk seluruh
 * kota di titik asal.
 */
export function getPlotCameraTransform(
  plotIndex: number | null,
  isMobile = false,
  scale?: number,
): string {
  if (plotIndex === null || plotIndex < 0 || plotIndex >= PLOT_TILE_COORDS.length) {
    return 'translate(0px, 0px) scale(1)';
  }
  const [u, v] = PLOT_TILE_COORDS[plotIndex];
  const px = (u - v) * 64;
  // Dibidik sedikit di atas pusat petak, karena bangunan menjulang ke atas.
  const py = (u + v) * 32 + 4;

  const actualScale = scale ?? (isMobile ? 1.4 : CAMERA_ZOOM);
  // Di mobile portrait, walikota berdiri di sebelah kiri petak (px - 49).
  // Pusatkan bidikan di tengah-tengah antara walikota dan gedung (px - 25).
  const focalX = isMobile ? px - 25 : px;
  const focalY = py;

  const [cx, cy] = VIEW_CENTER;
  // Di mobile, bilah keterangan & tombol lewati berada di bagian bawah,
  // jadi naikkan titik tengah sedikit (cy = 130) agar gedung & walikota
  // berada pas di jendela pandang atas yang bebas halangan.
  const targetCy = isMobile ? 130 : cy;

  return `translate(${(cx - actualScale * focalX).toFixed(2)}px, ${(targetCy - actualScale * focalY).toFixed(2)}px) scale(${actualScale})`;
}

export type MayorAssetSpec = {
  mode: MayorPoseMode;
  label: string;
  src: string;
  spriteSymbol: string;
  width: number;
  height: number;
};

/**
 * Aset transparan terpisah untuk figur Walikota (SVG & Sprite Sheet) agar
 * dapat digerakkan secara dinamis di atas canvas peta tanpa me-render ulang
 * seluruh pulau.
 */
export const MAYOR_ASSETS: Record<MayorPoseMode, MayorAssetSpec> = {
  inspection: {
    mode: 'inspection',
    label: 'Walikota Ecopolis Meninjau Pembangunan dengan Helm Proyek',
    // Pose ini digambar langsung sebagai vektor di MayorFigurine, bukan dari
    // berkas tersendiri, jadi src-nya menunjuk ke berkas idle sebagai cadangan.
    src: '/assets/mayor/mayor-idle.svg',
    spriteSymbol: '/assets/mayor/mayor-sprite.svg#mayor-idle',
    width: 72,
    height: 60,
  },
  idle: {
    mode: 'idle',
    label: 'Walikota Ecopolis di Mimbar Balai Kota',
    src: '/assets/mayor/mayor-idle.svg',
    spriteSymbol: '/assets/mayor/mayor-sprite.svg#mayor-idle',
    width: 72,
    height: 60,
  },
  ceremony: {
    mode: 'ceremony',
    label: 'Walikota Ecopolis Memotong Pita Merah Peresmian Gedung',
    src: '/assets/mayor/mayor-ceremony.svg',
    spriteSymbol: '/assets/mayor/mayor-sprite.svg#mayor-cut-ribbon',
    width: 78,
    height: 65,
  },
};

/**
 * Mendapatkan spesifikasi aset Walikota sesuai mode pose dan avatar pilihan pemain.
 */
export function getMayorAsset(mode: MayorPoseMode, avatar?: string): MayorAssetSpec {
  const info = avatarOf(avatar ?? 'rian');
  const base = MAYOR_ASSETS[mode];
  // Hanya idle dan ceremony yang punya berkas per avatar.
  const fileMode = mode === 'inspection' ? 'idle' : mode;
  return {
    mode,
    label: `${base.label} (${info.label})`,
    src: `/assets/mayor/mayor-${fileMode}-${info.id}.svg`,
    spriteSymbol: `/assets/mayor/mayor-sprite.svg#mayor-${fileMode}-${info.id}`,
    width: base.width,
    height: base.height,
  };
}

/** Koordinat ubin 5 petak pembangunan di pulau Ecopolis. */
const PLOT_TILE_COORDS: [number, number][] = [
  [-0.75, -0.15],
  [-1.15, 2.25],
  [3.65, 0.35],
  [0.55, 3.85],
  [3.65, 3.25],
];

/** Koordinat ubin podium kehormatan Walikota di depan Balai Kota. */
const CITY_HALL_MAYOR_TILE: [number, number] = [0.96, 1.96];

export type MayorWorldPosition = {
  x: number;
  y: number;
  mode: MayorPoseMode;
  plotIndex: number | null;
};

/**
 * Menghitung posisi layar isometrik `(x, y)` untuk layer dinamis Walikota.
 * - Saat tidak ada peresmian (`ceremonyPlotIndex === null`), Walikota berdiri
 *   di podium Balai Kota.
 * - Saat suatu petak sedang dalam tahap `'ceremony'`, Walikota bergerak secara
 *   dinamis ke depan karpet merah pintu masuk gedung yang diresmikan.
 */
export function getMayorWorldPosition(
  ceremonyPlotIndex: number | null,
  mode: MayorPoseMode = 'ceremony',
): MayorWorldPosition {
  if (
    ceremonyPlotIndex !== null &&
    ceremonyPlotIndex >= 0 &&
    ceremonyPlotIndex < PLOT_TILE_COORDS.length
  ) {
    const [pu, pv] = PLOT_TILE_COORDS[ceremonyPlotIndex];
    const plotX = (pu - pv) * 64;
    const plotY = (pu + pv) * 32;
    // Saat meninjau, Walikota berdiri di tepi lokasi agar tidak menutupi
    // crane dan perancah; saat peresmian ia maju ke karpet merah.
    const inspecting = mode === 'inspection';

    if (inspecting) {
      // Meninjau dari tepi lokasi, agar tidak menutupi crane dan perancah.
      const [dx, dy] = buildingPointToPlot(0.62, -0.1, 4);
      return {
        x: Number((plotX + dx).toFixed(1)),
        y: Number((plotY + dy).toFixed(1)),
        mode: 'inspection',
        plotIndex: ceremonyPlotIndex,
      };
    }

    // Berdiri tepat di ujung karpet merah, di sebelah kiri pitanya. Diturunkan
    // dari jangkar yang sama dengan karpetnya, bukan ditebak.
    const [ax, ay] = buildingPointToPlot(
      CEREMONY_ANCHOR.u,
      CEREMONY_ANCHOR.v,
      CEREMONY_ANCHOR.lift,
    );
    return {
      x: Number((plotX + ax + BUILDING_SCALE * -21).toFixed(1)),
      y: Number((plotY + ay + BUILDING_SCALE * 1).toFixed(1)),
      mode: 'ceremony',
      plotIndex: ceremonyPlotIndex,
    };
  }

  const [cu, cv] = CITY_HALL_MAYOR_TILE;
  return {
    x: Number(((cu - cv) * 64).toFixed(1)),
    y: Number(((cu + cv) * 32 - 4.5).toFixed(1)),
    mode: 'idle',
    plotIndex: null,
  };
}

/**
 * Menentukan tahap visual suatu petak berdasarkan keberadaan aset dan status
 * transisi aktif pada petak tersebut.
 */
export function resolvePlotStage(
  asset: AssetId | null,
  activeTransition?: { plotIndex: number; stage: PlotTransitionStage } | null,
  plotIndex?: number,
): PlotTransitionStage {
  if (!asset) return 'empty';
  if (
    activeTransition &&
    typeof plotIndex === 'number' &&
    activeTransition.plotIndex === plotIndex &&
    (activeTransition.stage === 'construction' || activeTransition.stage === 'ceremony')
  ) {
    return activeTransition.stage;
  }
  return 'operational';
}


