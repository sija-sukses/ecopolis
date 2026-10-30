import { memo } from 'react';
import {
  TOL_VEHICLE_ASSETS,
  type TolVehicleKind,
} from '@/lib/city-effects.ts';

type LaneVehicleSpec = {
  id: string;
  kind: TolVehicleKind;
  lane: 'se' | 'nw';
  animClass: string;
  scale: number;
};

/**
 * Konfigurasi kendaraan dinamis di kedua lajur Jalan Tol Dalam Kota:
 * - Lajur 'nw' (sisi dalam/kanan, mengalir dari tenggara ke barat-laut):
 *   Van pengiriman nir-emisi, mobil putih kompak, dan mobil biru elektrik.
 * - Lajur 'se' (sisi luar/kiri, mengalir dari barat-laut ke tenggara):
 *   Mobil kuning cerah, bus umum listrik hijau miniatur, dan mobil biru elektrik.
 * Semua kendaraan tersusun rapi mengikuti kurva lajur tanpa kotak kargo liar.
 */
const HIGHWAY_VEHICLES: LaneVehicleSpec[] = [
  // Lajur 2 (Belakang / Arah Barat-Laut) - dirender lebih dulu sesuai painter's algorithm
  {
    id: 'nw-van',
    kind: 'van-delivery',
    lane: 'nw',
    animClass: 'tol-mover tol-mover--nw-1',
    scale: 0.74,
  },
  {
    id: 'nw-white',
    kind: 'car-white',
    lane: 'nw',
    animClass: 'tol-mover tol-mover--nw-2',
    scale: 0.72,
  },
  {
    id: 'nw-blue',
    kind: 'car-blue',
    lane: 'nw',
    animClass: 'tol-mover tol-mover--nw-3',
    scale: 0.72,
  },
  // Lajur 1 (Depan / Arah Tenggara)
  {
    id: 'se-yellow',
    kind: 'car-yellow',
    lane: 'se',
    animClass: 'tol-mover tol-mover--se-1',
    scale: 0.72,
  },
  {
    id: 'se-bus',
    kind: 'bus-green',
    lane: 'se',
    animClass: 'tol-mover tol-mover--se-2',
    scale: 0.76,
  },
  {
    id: 'se-blue',
    kind: 'car-blue',
    lane: 'se',
    animClass: 'tol-mover tol-mover--se-3',
    scale: 0.72,
  },
];

/**
 * Lapisan Kendaraan Tol Dinamis Terpisah (Decoupled Transparent Vehicle Asset Layer).
 * Dirender sebagai layer independen yang di-memoize menggunakan aset SVG transparan
 * (`/assets/vehicles/*.svg`) agar pergerakan kendaraan tol di atas canvas peta
 * berjalan mulus dengan komposisi GPU tanpa pernah me-render ulang seluruh pulau.
 */
export const TolTrafficLayer = memo(function TolTrafficLayer({
  plotX,
  plotY,
  buildingLift,
  buildingScale,
  animate = false,
}: {
  plotX: number;
  plotY: number;
  buildingLift: number;
  buildingScale: number;
  animate?: boolean;
}) {
  return (
    <g
      transform={`translate(${plotX} ${plotY})`}
      data-testid="tol-traffic-layer"
      pointerEvents="none"
    >
      <g className={animate ? 'drop' : undefined}>
        <g transform={`translate(0 ${-buildingLift}) scale(${buildingScale})`}>
          {HIGHWAY_VEHICLES.map((v) => {
            const asset = TOL_VEHICLE_ASSETS[v.kind];
            const orientTransform =
              v.lane === 'se'
                ? `scale(${v.scale})`
                : `scale(-${v.scale}, ${v.scale})`;

            return (
              <g
                key={v.id}
                className={v.animClass}
                data-vehicle-id={v.id}
                data-vehicle-lane={v.lane}
                data-vehicle-asset={asset.src}
              >
                <g transform={orientTransform}>
                  <image
                    href={asset.src}
                    x={-asset.width / 2}
                    y={-asset.height * 0.65}
                    width={asset.width}
                    height={asset.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>
              </g>
            );
          })}
        </g>
      </g>
    </g>
  );
});
