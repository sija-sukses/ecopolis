import type { Metadata } from 'next';

import { Game } from '@/components/game.tsx';

export const metadata: Metadata = {
  title: 'Simulasi — Ecopolis',
  description: 'Lima keputusan kebijakan iklim yang menentukan wujud kota Anda di tahun 2050.',
};

export default function PlayPage() {
  return <Game />;
}
