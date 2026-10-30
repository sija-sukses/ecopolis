import { memo } from 'react';
import {
  MAYOR_ASSETS,
  getMayorWorldPosition,
} from '@/lib/city-effects.ts';

type Props = {
  /** Indeks petak (0..4) yang sedang dalam tahap peresmian gunting pita, atau null jika di Balai Kota. */
  ceremonyPlotIndex?: number | null;
  /** ID avatar pemimpin terpilih. */
  avatar?: string;
  /** Apakah warga sedang berdemo (kepuasan < 30). */
  protesting?: boolean;
};

/**
 * Layer Figur Walikota Transparan & Dinamis (`MayorDynamicLayer`).
 *
 * Dipisahkan menjadi layer independen yang di-memoize dengan aset SVG transparan
 * (`/assets/mayor/mayor-idle.svg` & `/assets/mayor/mayor-ceremony.svg`) sehingga
 * figur Walikota dapat bergerak secara dinamis dari mimbar Balai Kota menuju
 * karpet merah peresmian gedung di petak mana pun tanpa me-render ulang pulau.
 */
export const MayorDynamicLayer = memo(function MayorDynamicLayer({
  ceremonyPlotIndex = null,
  avatar = 'rian',
  protesting = false,
}: Props) {
  const pos = getMayorWorldPosition(ceremonyPlotIndex);
  const asset = MAYOR_ASSETS[pos.mode];
  const isCeremony = pos.mode === 'ceremony';

  return (
    <g
      className="mayor-dynamic-layer"
      transform={`translate(${pos.x} ${pos.y})`}
      style={{
        transition: 'transform 560ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      data-testid="mayor-dynamic-layer"
      data-mayor-mode={pos.mode}
      data-mayor-plot={pos.plotIndex !== null ? String(pos.plotIndex) : 'city-hall'}
      data-mayor-avatar={avatar}
      data-mayor-asset={asset.src}
      pointerEvents="none"
    >
      <g
        className={
          isCeremony
            ? 'mayor-sprite mayor-sprite--ceremony'
            : protesting
              ? 'worker worker--wave'
              : 'worker worker--bob'
        }
      >
        <image
          href={asset.src}
          x={-asset.width / 2}
          y={-asset.height * 0.8}
          width={asset.width}
          height={asset.height}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>
  );
});
