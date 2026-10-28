import type { Metadata, Viewport } from 'next';
import { Chivo } from 'next/font/google';
import './globals.css';

const chivo = Chivo({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-chivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ecopolis. Simulator Kebijakan Iklim',
  description:
    'Pelajari lima persoalan iklim Indonesia, lalu pimpin sebuah kota lewat lima keputusan kebijakan dan lihat wujudnya di tahun 2050.',
};

export const viewport: Viewport = {
  themeColor: '#c3cef6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
