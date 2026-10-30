import {
  resolvePlotStage,
  type PlotTransitionStage,
} from '@/lib/city-effects.ts';
import type { AssetId } from '@/lib/types.ts';
import {
  BUILDING_LIFT,
  BUILDING_SCALE,
  Building,
  ConstructionSite,
  IslandForeground,
  IslandTerrain,
  OpeningCeremony,
  PLOT_POS,
  PlotPad,
} from './iso.tsx';
import { MayorDynamicLayer } from './mayor-layer.tsx';
import { TolTrafficLayer } from './tol-traffic-layer.tsx';

/**
 * Peta lima petak di atas pulau terapung isometrik low-poly yang luas. Satu
 * elemen <svg> dengan viewBox, jadi skalanya mengikuti lebar kontainer dari
 * 375px sampai 1920px tanpa satu breakpoint pun dan tanpa aset yang terpotong.
 *
 * Mendukung alur transisi 4 tahap pada setiap petak:
 * 1. 'empty' -> Petak kosong / paving
 * 2. 'construction' -> Situs konstruksi aktif (crane kuning, perancah, pekerja, material)
 * 3. 'ceremony' -> Peresmian gedung (Walikota potong pita merah di karpet merah + confetti)
 * 4. 'operational' -> Gedung jadi yang beroperasi penuh
 */

export type ActivePlotTransition = {
  plotIndex: number;
  stage: PlotTransitionStage;
};

type Props = {
  plots: (AssetId | null)[];
  /** Kalimat yang dibacakan pembaca layar sebagai ganti gambar. */
  label: string;
  className?: string;
  /** Jatuhkan bangunan satu per satu saat pertama tampil. */
  animate?: boolean;
  /** Avatar walikota yang tampil di mimbar Balai Kota. */
  avatar?: string;
  /** Nilai kepuasan warga (jika < 30, memicu aksi demo di depan Balai Kota). */
  satisfaction?: number;
  /** Transisi konstruksi / peresmian yang sedang berlangsung pada salah satu petak. */
  activeTransition?: ActivePlotTransition | null;
};

export function CityMap({
  plots,
  label,
  className,
  animate = false,
  avatar = 'rian',
  satisfaction = 50,
  activeTransition = null,
}: Props) {
  const stagger = animate && plots.every(Boolean) && !activeTransition;
  const westPlotStage = resolvePlotStage(plots[1], activeTransition, 1);
  const hasTolOnWestPlot =
    plots[1] === 'tol' && (westPlotStage === 'ceremony' || westPlotStage === 'operational');
  const [tolPlotX, tolPlotY] = PLOT_POS[1];

  const ceremonyPlotIndex =
    activeTransition && activeTransition.stage === 'ceremony'
      ? activeTransition.plotIndex
      : null;

  return (
    <svg
      className={className}
      viewBox="-570 -145 1140 610"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <IslandTerrain plots={plots} />
      {PLOT_POS.map(([x, y], i) => {
        const asset = plots[i];
        const stage = resolvePlotStage(asset, activeTransition, i);
        return (
          // Posisi kawasan dan animasi jatuhnya sengaja dipisah ke dua elemen.
          // CSS transform menimpa atribut transform pada elemen SVG, jadi
          // menganimasikan keduanya di satu elemen akan menghapus posisi
          // kawasannya dan menumpuk seluruh kota di titik asal.
          <g
            key={i}
            transform={`translate(${x} ${y})`}
            data-plot-index={i}
            data-plot-stage={stage}
            data-plot-asset={asset ?? 'none'}
          >
            <PlotPad built={Boolean(asset)} />
            {asset && (
              <g
                key={`${asset}-${stage}`}
                className={animate ? 'drop' : undefined}
                style={stagger ? { animationDelay: `${0.08 * i}s` } : undefined}
              >
                <g transform={`translate(0 ${-BUILDING_LIFT}) scale(${BUILDING_SCALE})`}>
                  {stage === 'construction' ? (
                    <ConstructionSite id={asset} />
                  ) : stage === 'ceremony' ? (
                    <OpeningCeremony id={asset} />
                  ) : (
                    <Building id={asset} />
                  )}
                </g>
              </g>
            )}
          </g>
        );
      })}
      {hasTolOnWestPlot && (
        <TolTrafficLayer
          plotX={tolPlotX}
          plotY={tolPlotY}
          buildingLift={BUILDING_LIFT}
          buildingScale={BUILDING_SCALE}
          animate={animate}
        />
      )}
      <IslandForeground avatar={avatar} satisfaction={satisfaction} plots={plots} />
      <MayorDynamicLayer
        ceremonyPlotIndex={ceremonyPlotIndex}
        avatar={avatar}
        protesting={satisfaction < 30}
      />
    </svg>
  );
}

