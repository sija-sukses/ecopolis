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
  /** Avatar walikota yang tampil di mimbar Balai Kota. */
  avatar?: string;
  /** Nilai kepuasan warga (jika < 30, memicu aksi demo di depan Balai Kota). */
  satisfaction?: number;
};

export function CityMap({
  plots,
  label,
  className,
  animate = false,
  avatar = 'rian',
  satisfaction = 50,
}: Props) {
  const stagger = animate && plots.every(Boolean);
  return (
    <svg
      className={className}
      viewBox="-490 -115 980 510"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <IslandTerrain avatar={avatar} satisfaction={satisfaction} plots={plots} />
      {PLOT_POS.map(([x, y], i) => {
        const asset = plots[i];
        return (
          // Posisi kawasan dan animasi jatuhnya sengaja dipisah ke dua elemen.
          // CSS transform menimpa atribut transform pada elemen SVG, jadi
          // menganimasikan keduanya di satu elemen akan menghapus posisi
          // kawasannya dan menumpuk seluruh kota di titik asal.
          <g key={i} transform={`translate(${x} ${y})`}>
            <PlotPad built={Boolean(asset)} />
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
