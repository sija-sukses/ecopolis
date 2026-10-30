import { memo } from 'react';
import {
  getMayorAsset,
  getMayorWorldPosition,
  type MayorPoseMode,
} from '@/lib/city-effects.ts';
import { avatarOf } from '@/lib/avatars.ts';

type Props = {
  /** Indeks petak (0..4) yang sedang dalam tahap peresmian gunting pita, atau null jika di Balai Kota. */
  ceremonyPlotIndex?: number | null;
  /** ID avatar pemimpin terpilih. */
  avatar?: string;
  /** Apakah warga sedang berdemo (kepuasan < 30). */
  protesting?: boolean;
};

type CharacterConfig = {
  id: string;
  label: string;
  skin: { top: string; left: string; right: string };
  suit: { top: string; left: string; right: string };
  eyes: string;
};

function getCharacterConfig(avatar: string): CharacterConfig {
  const info = avatarOf(avatar);
  switch (info.id) {
    case 'bima':
      return {
        id: 'bima',
        label: 'Bima',
        skin: { top: '#fbbf24', left: '#f59e0b', right: '#d97706' },
        suit: { top: '#0a7a5a', left: '#065f46', right: '#044331' },
        eyes: '#1e293b',
      };
    case 'deni':
      return {
        id: 'deni',
        label: 'Deni',
        skin: { top: '#a65e38', left: '#8c4a27', right: '#70381b' },
        suit: { top: '#38bdf8', left: '#0284c7', right: '#0369a1' },
        eyes: '#0f172a',
      };
    case 'lia':
      return {
        id: 'lia',
        label: 'Lia',
        skin: { top: '#fde0c6', left: '#f3be96', right: '#df9e70' },
        suit: { top: '#e11d48', left: '#be123c', right: '#9f1239' },
        eyes: '#1e293b',
      };
    case 'maya':
      return {
        id: 'maya',
        label: 'Maya',
        skin: { top: '#fbbf24', left: '#f59e0b', right: '#d97706' },
        suit: { top: '#22c55e', left: '#15803d', right: '#166534' },
        eyes: '#0f172a',
      };
    case 'siti':
      return {
        id: 'siti',
        label: 'Siti',
        skin: { top: '#fde0c6', left: '#f3be96', right: '#df9e70' },
        suit: { top: '#059669', left: '#047857', right: '#065f46' },
        eyes: '#1e293b',
      };
    case 'rian':
    default:
      return {
        id: 'rian',
        label: 'Rian',
        skin: { top: '#fde0c6', left: '#f3be96', right: '#df9e70' },
        suit: { top: '#334155', left: '#1e293b', right: '#0f172a' },
        eyes: '#1e293b',
      };
  }
}

/**
 * Fitur kepala dan aksesoris khas masing-masing dari 6 avatar Walikota:
 * - Rian: Topi baseball biru terbalik + jambul pirang
 * - Bima: Snapback oranye-beige + janggut & kumis cokelat lebat
 * - Deni: Rambut gimbal kuncir atas + kacamata hitam dengan glare sian
 * - Lia: Rambut bob pirang rapi + kacamata biru + bibir koral
 * - Maya: Kupluk beanie sian + rambut bergelombang + anting teal
 * - Siti: Hijab pink menjuntai anggun + rona pipi manis + tunik hijau
 */
function CharacterHeadFeatures({
  id,
  skin,
}: {
  id: string;
  skin: { top: string; left: string; right: string };
}) {
  switch (id) {
    case 'rian':
      return (
        <g data-feature="rian-head">
          {/* Topi Baseball Biru Terbalik */}
          <polygon points="-5.4,-26.6 0,-24.0 0,-30.2 -5.4,-32.8" fill="#2563eb" />
          <polygon points="5.4,-26.6 0,-24.0 0,-30.2 5.4,-32.8" fill="#1e40af" />
          <polygon points="0,-35.4 5.4,-32.8 0,-30.2 -5.4,-32.8" fill="#3b82f6" />
          <rect x="-1.8" y="-31.5" width="3.6" height="2.4" rx="0.8" fill="#1e3a8a" />
          {/* Jambul rambut pirang menyembul di dahi kiri */}
          <polygon points="-5.8,-24.5 -2.4,-23.0 -2.4,-27.2 -5.8,-28.0" fill="#facc15" />
          <polygon points="-5.8,-24.5 -3.6,-23.5 -3.6,-21.5 -5.8,-22.8" fill="#eab308" />
        </g>
      );
    case 'bima':
      return (
        <g data-feature="bima-head">
          {/* Snapback Oranye & Panel Beige */}
          <polygon points="-5.6,-26.8 0,-24.2 0,-30.6 -5.6,-33.2" fill="#d97706" />
          <polygon points="5.6,-26.8 0,-24.2 0,-30.6 5.6,-33.2" fill="#b45309" />
          <polygon points="0,-35.6 5.6,-33.2 0,-30.6 -5.6,-33.2" fill="#f59e0b" />
          <polygon points="-5.7,-27.2 0,-24.5 5.7,-27.2 5.7,-29.2 0,-26.5 -5.7,-29.2" fill="#fef3c7" />
          {/* Janggut & Kumis Cokelat Tebal */}
          <polygon points="-5.4,-19.6 0,-16.8 5.4,-19.6 5.4,-22.4 0,-20.0 -5.4,-22.4" fill="#78350f" />
          <polygon points="-4.2,-19.6 0,-17.2 4.2,-19.6 4.2,-21.0 0,-18.8 -4.2,-21.0" fill="#5c2709" />
          <rect x="-1.4" y="-20.5" width="2.8" height="1.1" fill={skin.left} />
        </g>
      );
    case 'deni':
      return (
        <g data-feature="deni-head">
          {/* Rambut Gimbal Kuncir Atas & Samping */}
          <polygon points="-5.4,-27.0 0,-24.4 0,-30.4 -5.4,-33.0" fill="#0f172a" />
          <polygon points="5.4,-27.0 0,-24.4 0,-30.4 5.4,-33.0" fill="#0f172a" />
          <polygon points="0,-35.2 5.4,-33.0 0,-30.4 -5.4,-33.0" fill="#1e293b" />
          <rect x="-2.4" y="-39.2" width="4.8" height="4.8" rx="2.2" fill="#0f172a" />
          <rect x="-1.8" y="-35.2" width="3.6" height="1.6" fill="#1e293b" />
          <rect x="-5.8" y="-27.0" width="1.6" height="6.2" rx="0.8" fill="#0f172a" />
          <rect x="4.2" y="-27.0" width="1.6" height="6.2" rx="0.8" fill="#0f172a" />
          {/* Kacamata Hitam Futuristik & Glare Sian */}
          <rect x="-5.4" y="-23.8" width="10.8" height="2.8" rx="0.8" fill="#0f172a" />
          <rect x="-4.2" y="-23.2" width="3.4" height="1.6" fill="#38bdf8" />
          <rect x="0.8" y="-23.2" width="3.4" height="1.6" fill="#38bdf8" />
          <line x1="-3.6" y1="-23.0" x2="-1.4" y2="-21.8" stroke="#ffffff" strokeWidth="0.7" />
          <line x1="1.4" y1="-23.0" x2="3.6" y2="-21.8" stroke="#ffffff" strokeWidth="0.7" />
        </g>
      );
    case 'lia':
      return (
        <g data-feature="lia-head">
          {/* Rambut Bob Pirang Rapi Menutup Pipi */}
          <polygon points="-6.2,-19.6 -4.2,-18.2 -4.2,-29.2 -6.2,-30.6" fill="#facc15" />
          <polygon points="6.2,-19.6 4.2,-18.2 4.2,-29.2 6.2,-30.6" fill="#eab308" />
          <polygon points="-5.8,-27.2 0,-24.5 0,-30.5 -5.8,-33.2" fill="#facc15" />
          <polygon points="5.8,-27.2 0,-24.5 0,-30.5 5.8,-33.2" fill="#eab308" />
          <polygon points="0,-35.6 5.8,-33.2 0,-30.5 -5.8,-33.2" fill="#fef08a" />
          {/* Kacamata Modern Bingkai Biru */}
          <rect x="-5.0" y="-23.6" width="10.0" height="2.6" rx="0.8" fill="#0284c7" />
          <rect x="-3.8" y="-23.1" width="3.0" height="1.6" fill="#f8fafc" />
          <rect x="0.8" y="-23.1" width="3.0" height="1.6" fill="#f8fafc" />
          <rect x="-1.2" y="-18.8" width="2.4" height="1.0" fill="#e11d48" />
        </g>
      );
    case 'maya':
      return (
        <g data-feature="maya-head">
          {/* Rambut Hitam Bergelombang Panjang */}
          <polygon points="-6.4,-17.4 -4.2,-16.0 -4.2,-28.4 -6.4,-30.0" fill="#0f172a" />
          <polygon points="6.4,-17.4 4.2,-16.0 4.2,-28.4 6.4,-30.0" fill="#0f172a" />
          {/* Anting Bulat Sian di Kedua Telinga */}
          <circle cx="-5.2" cy="-20.5" r="1.3" fill="#14b8a6" stroke="#0d9488" strokeWidth="0.4" />
          <circle cx="5.2" cy="-20.5" r="1.3" fill="#14b8a6" stroke="#0d9488" strokeWidth="0.4" />
          {/* Beanie (Kupluk) Biru Sian */}
          <polygon points="-5.6,-27.0 0,-24.4 0,-31.0 -5.6,-33.6" fill="#0284c7" />
          <polygon points="5.6,-27.0 0,-24.4 0,-31.0 5.6,-33.6" fill="#0369a1" />
          <polygon points="0,-36.0 5.6,-33.6 0,-31.0 -5.6,-33.6" fill="#38bdf8" />
          <polygon points="-5.8,-27.4 0,-24.7 5.8,-27.4 5.8,-29.0 0,-26.3 -5.8,-29.0" fill="#38bdf8" />
        </g>
      );
    case 'siti':
      return (
        <g data-feature="siti-head">
          {/* Hijab Pink Menutup Kepala & Bahu */}
          <polygon points="-6.6,-16.8 0,-13.4 6.6,-16.8 5.6,-21.8 0,-18.2 -5.6,-21.8" fill="#db2777" />
          <polygon points="-6.2,-19.4 -4.0,-18.0 -4.0,-28.4 -6.2,-30.0" fill="#db2777" />
          <polygon points="6.2,-19.4 4.0,-18.0 4.0,-28.4 6.2,-30.0" fill="#c2185b" />
          <polygon points="-5.8,-27.2 0,-24.5 0,-31.2 -5.8,-33.8" fill="#f472b6" />
          <polygon points="5.8,-27.2 0,-24.5 0,-31.2 5.8,-33.8" fill="#db2777" />
          <polygon points="0,-36.4 5.8,-33.8 0,-31.2 -5.8,-33.8" fill="#f9a8d4" />
          {/* Rona Pipi Manis (Blush Pink) */}
          <circle cx="-3.4" cy="-20.5" r="1.1" fill="#f472b6" opacity="0.85" />
          <circle cx="3.4" cy="-20.5" r="1.1" fill="#f472b6" opacity="0.85" />
          <rect x="-1.2" y="-18.8" width="2.4" height="0.9" fill="#e11d48" />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Komponen Figur Walikota 3D Isometrik yang disesuaikan secara dinamis
 * dengan profil avatar yang dipilih pengguna (`rian`, `bima`, `deni`, `lia`, `maya`, `siti`).
 */
export function MayorFigurine({
  avatar = 'rian',
  mode = 'idle',
}: {
  avatar?: string;
  mode?: MayorPoseMode;
}) {
  const cfg = getCharacterConfig(avatar);
  const { id, skin, suit, eyes } = cfg;
  const isCeremony = mode === 'ceremony';
  const isRian = id === 'rian';

  return (
    <g
      className="mayor-figurine"
      data-avatar={id}
      data-mode={mode}
      style={{ filter: 'drop-shadow(0px 3px 6px rgba(15,23,42,0.32))' }}
    >
      {/* 1. Alas/Bayangan sesuai mode */}
      {!isCeremony ? (
        <g data-part="podium">
          {/* Karpet podium kehormatan merah & emas di Balai Kota */}
          <polygon points="0,-5.4 12,0 0,5.4 -12,0" fill="#b52626" />
          <polygon points="0,-4.2 9.6,0 0,4.2 -9.6,0" fill="#ffd45e" opacity="0.48" />
          <ellipse cx="0" cy="1.8" rx="9" ry="4" fill="#0f172a" opacity="0.24" />
        </g>
      ) : (
        <g data-part="ceremony-shadow">
          {/* Bayangan lembut di atas karpet merah peresmian */}
          <ellipse cx="0" cy="3" rx="14" ry="6.5" fill="#0f172a" opacity="0.28" />
        </g>
      )}

      {/* 2. Kaki celana formal & sepatu pantofel */}
      <g data-part="legs">
        <polygon points="-5.0,0 -0.6,2.1 -0.6,-7.4 -5.0,-9.4" fill="#0f172a" />
        <polygon points="0.6,2.0 5.0,-0.1 5.0,-9.4 0.6,-7.4" fill="#1e293b" />
        <ellipse cx="-3.0" cy="1.0" rx="2.8" ry="1.5" fill="#090d16" />
        <ellipse cx="3.0" cy="0.8" rx="2.8" ry="1.5" fill="#090d16" />
      </g>

      {/* 3. Jas / Busana Karakter Walikota */}
      <g data-part="torso">
        <polygon points="-7.2,-8.1 0,-4.3 0,-18.5 -7.2,-22.1" fill={suit.left} />
        <polygon points="7.2,-8.1 0,-4.3 0,-18.5 7.2,-22.1" fill={suit.right} />
        <polygon points="0,-25.5 7.2,-22.1 0,-18.5 -7.2,-22.1" fill={suit.top} />

        {/* Kemeja kerah putih formal */}
        <polygon points="-2.1,-21.2 0,-19.6 2.1,-21.2 0,-14.1" fill="#f8fafc" />
        {isRian && (
          <polygon points="-0.8,-19.6 0.8,-19.6 1.1,-12.6 0,-11.3 -1.1,-12.6" fill="#22c55e" />
        )}

        {/* Selempang Kehormatan Merah Walikota (Honorary Red Sash) */}
        <polygon points="-6.0,-21.7 -3.1,-23.1 6.6,-10.0 4.0,-8.2" fill="#ef4444" />
        <polygon points="-5.2,-21.3 -3.8,-22.1 5.8,-9.4 4.6,-8.6" fill="#fca5a5" opacity="0.65" />
        {/* Medali Emas Walikota */}
        <circle cx="-3.3" cy="-15.9" r="2.0" fill="#fbbf24" stroke="#fef08a" strokeWidth="0.5" />
      </g>

      {/* 4. Kepala 3D Clay & Mata */}
      <g data-part="head">
        <polygon points="-5.1,-20.1 0,-17.3 0,-26.2 -5.1,-28.8" fill={skin.left} />
        <polygon points="5.1,-20.1 0,-17.3 0,-26.2 5.1,-28.8" fill={skin.right} />
        <polygon points="0,-31.4 5.1,-28.8 0,-26.2 -5.1,-28.8" fill={skin.top} />

        {/* Mata */}
        <rect x="-3.3" y="-23.9" width="1.4" height="2.2" rx="0.5" fill={eyes} />
        <rect x="1.9" y="-23.9" width="1.4" height="2.2" rx="0.5" fill={eyes} />

        {/* Ciri khas masing-masing avatar */}
        <CharacterHeadFeatures id={id} skin={skin} />
      </g>

      {/* 5. Lengan & Alat Sesuai Mode */}
      {!isCeremony ? (
        <g data-part="arms-idle">
          {/* Lengan Kiri Santun Menempel di Sisi Tubuh */}
          <polygon points="-6.4,-18.6 -4.8,-11.2 -2.6,-11.2 -4.4,-19.2" fill={suit.left} />
          <circle cx="-3.8" cy="-10.6" r="1.8" fill={skin.top} />

          {/* Lengan Kanan Mengangkat & Melambai Menyapa Warga */}
          <g className="worker__arm">
            <polygon points="4.2,-18.0 10.2,-22.6 8.6,-24.8 2.8,-20.2" fill={suit.right} />
            <circle cx="9.8" cy="-23.8" r="2.0" fill={skin.top} />
          </g>
        </g>
      ) : (
        <g data-part="arms-ceremony">
          {/* Kedua Lengan Memegang Gunting Seremonial Emas */}
          <polygon points="-6.8,-19.2 -1.5,-13.8 -0.2,-15.6 -5.2,-21.0" fill={suit.left} />
          <polygon points="6.8,-19.2 10.8,-14.2 8.8,-12.4 4.8,-17.4" fill={suit.right} />
          <circle cx="9.8" cy="-13.2" r="2.1" fill={skin.left} />
          <circle cx="-1.0" cy="-14.4" r="2.0" fill={skin.top} />

          {/* Gunting Seremonial Emas Raksasa (Oversized Golden Ceremonial Scissors) */}
          <g transform="translate(8.5 -12.5) rotate(-14)" className="mayor-scissors">
            {/* Bilah Gunting Emas Atas & Bawah Aktif Memotong Pita */}
            <polygon points="0,-1.2 15.5,-6.8 14.2,-2.2 0,1.2" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
            <polygon points="0,1.2 15.8,4.6 14.0,0.4 0,-1.2" fill="#eab308" stroke="#a16207" strokeWidth="0.6" />
            {/* Poros Permata Merah */}
            <circle cx="2.2" cy="0" r="1.6" fill="#dc2626" stroke="#fef08a" strokeWidth="0.6" />
            {/* Gagang Cincin Emas Kembar */}
            <ellipse cx="-4.2" cy="-2.8" rx="3.8" ry="2.5" fill="none" stroke="#facc15" strokeWidth="1.8" />
            <ellipse cx="-4.2" cy="2.8" rx="3.8" ry="2.5" fill="none" stroke="#eab308" strokeWidth="1.8" />
            {/* Kilau Bintang Emas di Ujung Gunting */}
            <polygon points="16.5,-5.5 18,-8.5 19.5,-5.5 22.5,-4 19.5,-2.5 18,0.5 16.5,-2.5 13.5,-4" fill="#fef9c3" />
          </g>
        </g>
      )}
    </g>
  );
}

/**
 * Layer Figur Walikota Transparan & Dinamis (`MayorDynamicLayer`).
 *
 * Dipisahkan menjadi layer independen yang di-memoize dengan aset SVG transparan
 * (`/assets/mayor/mayor-idle-[avatar].svg` & `/assets/mayor/mayor-ceremony-[avatar].svg`)
 * dan rendering vektor 3D clay langsung, sehingga figur Walikota dapat bergerak secara
 * dinamis dari mimbar Balai Kota menuju karpet merah peresmian gedung di petak
 * mana pun tanpa me-render ulang seluruh pulau.
 */
export const MayorDynamicLayer = memo(function MayorDynamicLayer({
  ceremonyPlotIndex = null,
  avatar = 'rian',
  protesting = false,
}: Props) {
  const pos = getMayorWorldPosition(ceremonyPlotIndex);
  const info = avatarOf(avatar);
  const asset = getMayorAsset(pos.mode, info.id);
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
      data-mayor-avatar={info.id}
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
        <MayorFigurine avatar={info.id} mode={pos.mode} />
      </g>
    </g>
  );
});
