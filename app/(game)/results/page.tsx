import type { Metadata } from 'next';

import { ResultsView } from '@/components/results-view.tsx';

export const metadata: Metadata = {
  title: 'Laporan 2050 — Ecopolis',
  description: 'Wujud kota Anda pada tahun 2050, hasil dari lima keputusan kebijakan iklim.',
};

export default function ResultsPage() {
  return <ResultsView />;
}
