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

export function getPollutionLevel(plots: (AssetId | null)[]): PollutionLevel {
  const hasPltu = plots.includes('pltu');
  const hasIndustri = plots.includes('industri');
  if (hasPltu && hasIndustri) return 'parah';
  if (hasPltu || hasIndustri) return 'sedang';
  return 'bersih';
}

export function getWaterTurbidity(plots: (AssetId | null)[]): WaterTurbidity {
  const hasTpa = plots.includes('tpa');
  const hasIndustri = plots.includes('industri');
  if (hasTpa) return 'parah';
  if (hasIndustri) return 'sedang';
  return 'jernih';
}

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

export function sampleTolFlyoverSpine(t: number): TolSpineSample {
  const clamped = Math.max(0, Math.min(1, t));
  const inv = 1 - clamped;

  const u0 = -0.98;
  const v0 = -0.05;
  const uCtrl = 0.04;
  const vCtrl = -0.28;
  const u1 = 0.98;
  const v1 = 0.42;

  const u = inv * inv * u0 + 2 * inv * clamped * uCtrl + clamped * clamped * u1;
  const v = inv * inv * v0 + 2 * inv * clamped * vCtrl + clamped * clamped * v1;

  const groundLift = 14;
  const arch = Math.sin(Math.PI * clamped);
  const lift = groundLift + 0.8 + Math.pow(arch, 0.85) * 27.2;

  const du = 2 * inv * (uCtrl - u0) + 2 * clamped * (u1 - uCtrl);
  const dv = 2 * inv * (vCtrl - v0) + 2 * clamped * (v1 - vCtrl);
  const dx = (du - dv) * 64;
  const dy = (du + dv) * 32;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return { t: clamped, u, v, lift, groundLift, angleDeg };
}

export type PlotTransitionStage = 'empty' | 'construction' | 'ceremony' | 'operational';

export const CONSTRUCTION_DURATION_MS = 1500;

export const CEREMONY_DURATION_MS = 1500;

export const TOTAL_TRANSITION_MS = CONSTRUCTION_DURATION_MS + CEREMONY_DURATION_MS;

export const BUILDING_LIFT = -14;
export const BUILDING_SCALE = 0.88;

export const CEREMONY_ANCHOR = { u: 0.18, v: 0.72, lift: 4 };

export function buildingPointToPlot(u: number, v: number, lift = 0): [number, number] {
  const lx = (u - v) * 64;
  const ly = (u + v) * 32 - lift;
  return [BUILDING_SCALE * lx, -BUILDING_LIFT + BUILDING_SCALE * ly];
}

export type MayorPoseMode = 'idle' | 'ceremony' | 'inspection';

export type CutscenePhase =
  | 'zoom-in'
  | 'iris-in'
  | 'inspect'
  | 'ceremony'
  | 'iris-out'
  | 'zoom-out';

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

export const CAMERA_ZOOM = 2.9;

const VIEW_CENTER: [number, number] = [0, 16];


export function getPlotCameraTransform(
  plotIndex: number | null,
  isMobile = false,
  scale?: number,
  fill = false,
): string {
  if (plotIndex === null || plotIndex < 0 || plotIndex >= PLOT_TILE_COORDS.length) {
    return 'translate(0px, 0px) scale(1)';
  }
  const [u, v] = PLOT_TILE_COORDS[plotIndex];
  const px = (u - v) * 64;
  const py = (u + v) * 32;

  if (isMobile && fill) {
    const actualScale = scale ?? 1.4;
    const focalX = px - 25;
    const focalY = py + 4;
    const [cx] = VIEW_CENTER;
    const targetCy = 130;
    return `translate(${(cx - actualScale * focalX).toFixed(2)}px, ${(targetCy - actualScale * focalY).toFixed(2)}px) scale(${actualScale})`;
  }

  const actualScale = scale ?? (isMobile ? 3.1 : CAMERA_ZOOM);
  const focalX = px;
  const focalY = isMobile ? py - 14 : py + 4;
  const cx = isMobile ? -35 : VIEW_CENTER[0];
  const targetCy = isMobile ? 115 : VIEW_CENTER[1];

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

export const MAYOR_ASSETS: Record<MayorPoseMode, MayorAssetSpec> = {
  inspection: {
    mode: 'inspection',
    label: 'Walikota Ecopolis Meninjau Pembangunan dengan Helm Proyek',
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

export function getMayorAsset(mode: MayorPoseMode, avatar?: string): MayorAssetSpec {
  const info = avatarOf(avatar ?? 'rian');
  const base = MAYOR_ASSETS[mode];
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

const PLOT_TILE_COORDS: [number, number][] = [
  [-0.75, -0.15],
  [-1.15, 2.25],
  [3.65, 0.35],
  [0.55, 3.85],
  [3.65, 3.25],
];

const CITY_HALL_MAYOR_TILE: [number, number] = [0.96, 1.96];

export type MayorWorldPosition = {
  x: number;
  y: number;
  mode: MayorPoseMode;
  plotIndex: number | null;
};

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
    const inspecting = mode === 'inspection';

    if (inspecting) {
      const [dx, dy] = buildingPointToPlot(0.62, -0.1, 4);
      return {
        x: Number((plotX + dx).toFixed(1)),
        y: Number((plotY + dy).toFixed(1)),
        mode: 'inspection',
        plotIndex: ceremonyPlotIndex,
      };
    }

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


