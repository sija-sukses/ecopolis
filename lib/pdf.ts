import type { GameState, StatKey } from './types.ts';

/**
 * Sertifikat PDF digambar dengan primitif jsPDF, bukan tangkapan layar.
 *
 * html2canvas sengaja tidak dipakai: ia merender ulang CSS dengan mesinnya
 * sendiri dan pecah pada gradien, backdrop-filter, dan warna oklch. Hasilnya
 * pun raster, sehingga teksnya tidak bisa diseleksi.
 *
 * jsPDF di-import secara dinamis, jadi tidak satu byte pun masuk bundle awal.
 */

const STAT_LABELS: Record<StatKey, string> = {
  economy: 'Ekonomi',
  environment: 'Lingkungan',
  satisfaction: 'Kepuasan Warga',
  energy: 'Energi',
};

/** mm, A4 lanskap. */
const W = 297;
const H = 210;
const M = 16;

type Rgb = [number, number, number];

function token(name: string, fallback: Rgb): Rgb {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Menyalin SVG peta menjadi PNG.
 *
 * Warna bangunan memakai custom property CSS, yang tidak ikut terbawa ketika
 * SVG dilepas dari dokumen. Jadi setiap `var(--x)` diganti nilai nyatanya
 * lebih dulu, dibaca dari dokumen yang sedang tampil: tokennya tetap satu
 * sumber, tidak disalin ke dalam JavaScript.
 */
async function mapToPng(svg: SVGSVGElement, pxWidth: number): Promise<string | null> {
  try {
    const root = getComputedStyle(document.documentElement);
    let markup = new XMLSerializer().serializeToString(svg);
    markup = markup.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      const value = root.getPropertyValue(name).trim();
      return value || 'none';
    });

    const box = svg.viewBox.baseVal;
    const ratio = box.height / box.width;
    const w = pxWidth;
    const h = Math.round(pxWidth * ratio);

    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    const img = new Image();
    img.width = w;
    img.height = h;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG gagal dimuat'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    if (!g) return null;
    g.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function downloadCertificate(state: GameState, svg: SVGSVGElement | null) {
  const { leader, stats, review, choices } = state;
  if (!leader || !review) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const ink = token('--ink', [22, 25, 58]);
  const bg = token('--bg', [195, 206, 246]);
  const accent = token('--accent', [255, 107, 61]);
  const grass = token('--field-grass', [134, 196, 90]);

  // Bidang ink penuh, lalu kartu terang di atasnya.
  doc.setFillColor(...ink);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...bg);
  doc.rect(M, M, W - M * 2, H - M * 2, 'F');

  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ECOPOLIS', M + 10, M + 14);
  doc.setFont('helvetica', 'normal');
  doc.text('Sertifikat Pemimpin Kota dan Laporan 2050', M + 10, M + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text(leader.name, M + 10, M + 38);

  const png = svg ? await mapToPng(svg, 700) : null;
  const mapW = 104;
  const mapX = M + 8;
  const mapY = M + 46;
  let mapH = 0;
  if (png) {
    const props = doc.getImageProperties(png);
    mapH = (props.height / props.width) * mapW;
    doc.addImage(png, 'PNG', mapX, mapY, mapW, mapH);
  }

  // Indikator akhir, sebagai batang yang bisa dibaca sekilas.
  let y = mapY + (mapH || 0) + 10;
  doc.setFontSize(9);
  (Object.keys(STAT_LABELS) as StatKey[]).forEach((k) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ink);
    doc.text(STAT_LABELS[k], mapX, y);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(mapX + 34, y - 3.2, 52, 4.4, 2.2, 2.2, 'F');
    doc.setFillColor(...ink);
    const fill = Math.max(2.4, (stats[k] / 100) * 52);
    doc.roundedRect(mapX + 34, y - 3.2, fill, 4.4, 2.2, 2.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(String(stats[k]), mapX + 90, y);
    y += 8;
  });

  // Kolom kanan: judul AI, narasi, dan refleksi SDG.
  const colX = M + 126;
  const colW = W - colX - M - 10;

  doc.setFillColor(...accent);
  doc.roundedRect(colX, M + 44, colW, 12, 3, 3, 'F');
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(review.title, colX + 5, M + 52, { maxWidth: colW - 10 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let ty = M + 64;
  for (const para of review.narrative.split('\n\n')) {
    const lines = doc.splitTextToSize(para.trim(), colW);
    doc.text(lines, colX, ty);
    ty += lines.length * 4.6 + 3.5;
  }

  doc.setFillColor(...grass);
  doc.roundedRect(colX, ty, colW, 26, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SDG 11 & 13', colX + 5, ty + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(review.sdgReflection, colW - 10), colX + 5, ty + 12.5);

  // Kaki: kebijakan yang diambil, dan asal laporannya.
  doc.setFontSize(7.5);
  doc.setTextColor(...ink);
  doc.text(
    `Kebijakan: ${choices.map((c) => c.label).join(' · ')}`,
    M + 10,
    H - M - 14,
    { maxWidth: W - M * 2 - 20 },
  );
  doc.text(
    review.fallback
      ? 'Laporan Hasil Evaluasi Standar · INVOFEST 2026'
      : 'Laporan dibangkitkan AI · INVOFEST 2026',
    M + 10,
    H - M - 8,
  );

  const safe = leader.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'pemimpin';
  doc.save(`ecopolis-${safe.toLowerCase()}-2050.pdf`);
}
