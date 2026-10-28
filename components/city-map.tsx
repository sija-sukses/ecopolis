import type { AssetId } from '@/lib/types.ts';
import { BUILDING_LIFT, BUILDING_SCALE, Building, PLOT_POS, PlotPad } from './iso.tsx';

/**
 * Peta lima petak. Satu elemen <svg> dengan viewBox, jadi skalanya mengikuti
 * lebar kontainer dari 375px sampai 1920px tanpa satu breakpoint pun dan tanpa
 * aset yang bisa terpotong.
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
  return (
    <svg
        className={className}
      viewBox="-148 -136 296 284"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {/* Buih putih yang melingkupi pulau, seperti pada referensi. */}
      <ellipse cx="0" cy="94" rx="130" ry="44" fill="var(--isle-foam)" />
      {PLOT_POS.map(([x, y], i) => {
        const asset = plots[i];
        return (
          // Posisi petak dan animasi jatuhnya sengaja dipisah ke dua elemen.
          // CSS transform menimpa atribut transform pada elemen SVG, jadi
          // menganimasikan keduanya di satu elemen akan menghapus posisi
          // petaknya dan menumpuk seluruh kota di titik asal.
          <g key={i} transform={`translate(${x} ${y})`}>
            <g
              className={animate && asset ? 'drop' : undefined}
              style={animate && asset ? { animationDelay: `${0.12 * i + 0.3}s` } : undefined}
            >
              <PlotPad />
              {asset && (
                <g transform={`translate(0 ${-BUILDING_LIFT}) scale(${BUILDING_SCALE})`}>
                  <Building id={asset} />
                </g>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
