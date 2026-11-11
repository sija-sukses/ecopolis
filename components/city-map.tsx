'use client';

import { useEffect, useState } from 'react';
import {
  getPlotCameraTransform,
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

export type ActivePlotTransition = {
  plotIndex: number;
  stage: PlotTransitionStage;
};

type Props = {
  plots: (AssetId | null)[];
  label: string;
  className?: string;
  animate?: boolean;
  avatar?: string;
  satisfaction?: number;
  activeTransition?: ActivePlotTransition | null;
  cameraPlot?: number | null;
  mayorMode?: 'inspection' | 'ceremony';
  fill?: boolean;
};

export function CityMap({
  plots,
  label,
  className,
  animate = false,
  avatar = 'rian',
  satisfaction = 50,
  activeTransition = null,
  cameraPlot = null,
  mayorMode = 'ceremony',
  fill = false,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 900);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const stagger = animate && plots.every(Boolean) && !activeTransition;
  const westPlotStage = resolvePlotStage(plots[1], activeTransition, 1);
  const hasTolOnWestPlot =
    plots[1] === 'tol' && (westPlotStage === 'ceremony' || westPlotStage === 'operational');
  const [tolPlotX, tolPlotY] = PLOT_POS[1];

  const mayorPlotIndex = activeTransition ? activeTransition.plotIndex : null;

  const mobileViewBox = '-450 -170 830 570';
  const defaultViewBox = '-570 -190 1140 610';

  return (
    <svg
      className={className}
      viewBox={fill ? defaultViewBox : isMobile ? mobileViewBox : defaultViewBox}
      preserveAspectRatio={fill ? 'xMidYMid slice' : 'xMidYMid meet'}
      role="img"
      aria-label={label}
    >
      <g
        className="city-camera"
        data-camera-plot={cameraPlot === null ? 'kota' : String(cameraPlot)}
        style={{
          transformBox: 'view-box',
          transformOrigin: '0 0',
          transform: getPlotCameraTransform(cameraPlot, isMobile, undefined, fill),
        }}
      >
      <IslandTerrain plots={plots} />
      {PLOT_POS.map(([x, y], i) => {
        const asset = plots[i];
        const stage = resolvePlotStage(asset, activeTransition, i);
        return (
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
        ceremonyPlotIndex={mayorPlotIndex}
        plotMode={mayorMode}
        avatar={avatar}
        protesting={satisfaction < 30}
      />
      </g>
    </svg>
  );
}

