import type { AssetId } from '@/lib/types.ts';
import {
  BUILDING_LIFT,
  BUILDING_SCALE,
  Building,
  IslandForeground,
  IslandTerrain,
  PLOT_POS,
  PlotPad,
} from './iso.tsx';

/**
 * Peta lima petak di atas pulau terapung isometrik low-poly yang luas. Satu
 * elemen <svg> dengan viewBox, jadi skalanya mengikuti lebar kontainer dari
 * 375px sampai 1920px tanpa satu breakpoint pun dan tanpa aset yang terpotong.
 *
 * Komponen server: animasi jatuhnya bangunan dikerjakan CSS, bukan JavaScript,
 * supaya landing page tidak perlu memuat pustaka animasi sama sekali.
 */

type Props = {
  plots: (AssetId | null)[];
  /** Kalimat yang dibacakan pembaca layar sebagai ganti gambar. */
  label: string;
  className?: string;
  /** Jatuhkan bangunan satu per satu saat pertama tampil. */
  animate?: boolean;
};

export function CityMap({ plots, label, className, animate = false }: Props) {
  const stagger = animate && plots.every(Boolean);
  return (
    <svg
      className={className}
      viewBox="-380 -76 756 400"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <IslandTerrain />
      {PLOT_POS.map(([x, y], i) => {
        const asset = plots[i];
        return (
          // Posisi petak dan animasi jatuhnya sengaja dipisah ke dua elemen.
          // CSS transform menimpa atribut transform pada elemen SVG, jadi
          // menganimasikan keduanya di satu elemen akan menghapus posisi
          // petaknya dan menumpuk seluruh kota di titik asal.
          <g key={i} transform={`translate(${x} ${y})`}>
            <PlotPad />
            {asset && (
              <g
                className={animate ? 'drop' : undefined}
                style={stagger ? { animationDelay: `${0.08 * i}s` } : undefined}
              >
                <g transform={`translate(0 ${-BUILDING_LIFT}) scale(${BUILDING_SCALE})`}>
                  <Building id={asset} />
                </g>
              </g>
            )}
          </g>
        );
      })}
      <IslandForeground />
    </svg>
  );
}
