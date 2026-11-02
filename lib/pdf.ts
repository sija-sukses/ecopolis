import type { GameState, StatKey } from './types.ts';

/**
 * Sertifikat PDF digambar dengan primitif jsPDF, bukan tangkapan layar.
 *
 * html2canvas sengaja tidak dipakai: ia merender ulang CSS dengan mesinnya
 * sendiri dan pecah pada gradien, backdrop-filter, dan warna oklch. Hasilnya
 * pun raster, sehingga teksnya tidak bisa diseleksi.
 *
 * jsPDF di-import secara dinamis, jadi tidak satu byte pun masuk bundle awal.
 *
 * Seluruh tata letaknya memakai koordinat tetap yang dihitung di muka (lihat
 * konstanta Y di bawah). Versi sebelumnya menghitung posisi batang indikator
 * dari tinggi gambar peta, sehingga begitu petanya tinggi, keempat batang
 * terdorong keluar halaman dan menabrak baris kaki. Sekarang tidak ada satu
 * pun posisi yang bergantung pada tinggi isi; isinya yang dipaskan ke kotak.
 */

const STAT_LABELS: Record<StatKey, string> = {
  economy: 'Ekonomi',
  environment: 'Lingkungan',
  satisfaction: 'Kepuasan Warga',
  energy: 'Energi',
};

/* Semua satuan milimeter, A4 lanskap. */
const W = 297;
const H = 210;
const M = 14;

/* Kartu terang di dalam bidang ink. */
const CARD = { x: M, y: M, w: W - M * 2, h: H - M * 2 };
const PAD = 12;
const L = CARD.x + PAD;
const R = CARD.x + CARD.w - PAD;

/* Kolom kiri untuk peta dan indikator, kolom kanan untuk narasi. */
const COL_L_W = 94;
const COL_R_X = L + 106;
const COL_R_W = R - COL_R_X;

/* Baris-baris yang posisinya dikunci. */
const Y = {
  brand: 38,
  tagline: 44,
  face: 50,
  name: 64,
  band: 70,
  mapBottom: 140,
  stat0: 150,
  statStep: 8,
  titleTop: 78,
  narrative: 99,
  narrativeMax: 146,
  sdgTop: 152,
  sdgH: 22,
  footer1: 181,
  footer2: 188,
};

const FACE = 20;
const BAR_X = L + 32;
const BAR_W = 46;

type Rgb = [number, number, number];

function token(name: string, fallback: Rgb): Rgb {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Menggambar sebuah sumber gambar ke canvas lalu mengembalikannya sebagai PNG. */
async function rasterise(src: string, w: number, h: number, crisp: boolean) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('gambar gagal dimuat'));
    img.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.imageSmoothingEnabled = !crisp;
  g.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

/**
 * Menyalin peta SVG di halaman menjadi PNG.
 *
 * Warnanya memakai custom property CSS, yang tidak ikut terbawa ketika SVG
 * dilepas dari dokumen. Jadi setiap `var(--x)` diganti nilai nyatanya lebih
 * dulu, dibaca dari dokumen yang sedang tampil: tokennya tetap satu sumber,
 * tidak disalin ke dalam JavaScript.
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
    const ratio = box.height > 0 ? box.height / box.width : 1;
    return await rasterise(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`,
      pxWidth,
      Math.round(pxWidth * ratio),
      false,
    );
  } catch {
    return null;
  }
}

/** Avatar dibaca dari berkasnya sendiri, dengan penghalusan dimatikan. */
async function faceToPng(el: HTMLImageElement): Promise<string | null> {
  try {
    const res = await fetch(el.currentSrc || el.src);
    const text = await res.text();
    return await rasterise(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
      160,
      160,
      true,
    );
  } catch {
    return null;
  }
}

export async function downloadCertificate(
  state: GameState,
  mapSvg: SVGSVGElement | null,
  faceImg: HTMLImageElement | null = null,
) {
  const { leader, stats, review, choices } = state;
  if (!leader || !review) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const ink = token('--ink', [22, 25, 58]);
  const bg = token('--bg', [195, 206, 246]);
  const accent = token('--accent', [255, 107, 61]);
  const grass = token('--field-grass', [134, 196, 90]);
  const paper: Rgb = [255, 255, 255];

  doc.setFillColor(...ink);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...bg);
  doc.rect(CARD.x, CARD.y, CARD.w, CARD.h, 'F');

  /* ---- Kepala ---- */
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ECOPOLIS', L, Y.brand);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Sertifikat Pemimpin Kota dan Laporan 2050', L, Y.tagline);

  const facePng = faceImg ? await faceToPng(faceImg) : null;
  if (facePng) {
    doc.setFillColor(...paper);
    doc.circle(L + FACE / 2, Y.face + FACE / 2, FACE / 2, 'F');
    doc.addImage(facePng, 'PNG', L, Y.face, FACE, FACE);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(leader.name, facePng ? L + FACE + 7 : L, Y.name, { maxWidth: COL_L_W + 54 });

  /* ---- Kolom kiri: peta, dipaskan ke dalam kotak tetap ---- */
  const mapPng = mapSvg ? await mapToPng(mapSvg, 700) : null;
  if (mapPng) {
    const boxH = Y.mapBottom - Y.band;
    const props = doc.getImageProperties(mapPng);
    const scale = Math.min(COL_L_W / props.width, boxH / props.height);
    const w = props.width * scale;
    const h = props.height * scale;
    doc.addImage(mapPng, 'PNG', L + (COL_L_W - w) / 2, Y.band + (boxH - h) / 2, w, h);
  }

  /* ---- Kolom kiri: empat indikator ---- */
  doc.setFontSize(9);
  (Object.keys(STAT_LABELS) as StatKey[]).forEach((k, i) => {
    const y = Y.stat0 + i * Y.statStep;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ink);
    doc.text(STAT_LABELS[k], L, y);

    doc.setFillColor(...paper);
    doc.roundedRect(BAR_X, y - 3.1, BAR_W, 4.4, 2.2, 2.2, 'F');

    const fill = (stats[k] / 100) * BAR_W;
    if (fill > 0.6) {
      doc.setFillColor(...ink);
      // Jari-jari ikut lebar isian, supaya nilai kecil tidak jadi lingkaran.
      const r = Math.min(2.2, fill / 2);
      doc.roundedRect(BAR_X, y - 3.1, fill, 4.4, r, r, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.text(String(stats[k]), L + COL_L_W, y, { align: 'right' });
  });

  /* ---- Kolom kanan: judul dari AI ---- */
  doc.setFillColor(...accent);
  doc.roundedRect(COL_R_X, Y.titleTop, COL_R_W, 13, 3, 3, 'F');
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(review.title, COL_R_X + 5, Y.titleTop + 8.6, { maxWidth: COL_R_W - 10 });

  /* ---- Kolom kanan: narasi, ukurannya diturunkan sampai muat ---- */
  const paras = review.narrative
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const room = Y.narrativeMax - Y.narrative;

  let size = 9.5;
  let lead = 4.6;
  let blocks: string[][] = [];
  for (const candidate of [9.5, 9, 8.5, 8]) {
    size = candidate;
    lead = candidate * 0.49;
    doc.setFontSize(size);
    blocks = paras.map((p) => doc.splitTextToSize(p, COL_R_W) as string[]);
    const total = blocks.reduce((n, l) => n + l.length, 0) * lead + (blocks.length - 1) * 3;
    if (total <= room) break;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  let ty = Y.narrative;
  for (const block of blocks) {
    for (const line of block) {
      // Pagar terakhir: apa pun yang tersisa berhenti di batas bawahnya.
      if (ty > Y.narrativeMax) break;
      doc.text(line, COL_R_X, ty);
      ty += lead;
    }
    ty += 3;
  }

  /* ---- Kolom kanan: refleksi SDG ---- */
  doc.setFillColor(...grass);
  doc.roundedRect(COL_R_X, Y.sdgTop, COL_R_W, Y.sdgH, 3, 3, 'F');
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SDG 11 & 13', COL_R_X + 5, Y.sdgTop + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.text(
    (doc.splitTextToSize(review.sdgReflection, COL_R_W - 10) as string[]).slice(0, 4),
    COL_R_X + 5,
    Y.sdgTop + 11,
  );

  /* ---- Kaki ---- */
  doc.setTextColor(...ink);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Kebijakan', L, Y.footer1);
  doc.setFont('helvetica', 'normal');
  doc.text(
    (
      doc.splitTextToSize(choices.map((c) => c.label).join('  ·  '), R - L - 24) as string[]
    ).slice(0, 1),
    L + 24,
    Y.footer1,
  );
  doc.text(
    review.fallback
      ? 'Laporan Hasil Evaluasi Standar  ·  Ecopolis untuk INVOFEST 2026'
      : 'Laporan dibangkitkan AI  ·  Ecopolis untuk INVOFEST 2026',
    L,
    Y.footer2,
  );

  const safe =
    leader.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'pemimpin';
  doc.save(`ecopolis-${safe}-2050.pdf`);
}

function drawRoundedRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  const ok = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
  return ok ? img : null;
}

/**
 * Menghasilkan Kartu Story Sosial Media (1080 × 1350 PNG) berisi pulau 2050,
 * avatar pemimpin, gelar kota, dan skor 4 indikator untuk diunduh atau
 * dibagikan lewat Web Share API.
 */
export async function downloadStoryCard(
  state: GameState,
  mapSvg: SVGSVGElement | null,
  faceImg: HTMLImageElement | null = null,
) {
  const { leader, stats, review, choices } = state;
  if (!leader || !review) return;

  const cw = 1080;
  const ch = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext('2d');
  if (!g) return;

  // Latar bingkai luar & kartu utama
  g.fillStyle = '#16193a';
  g.fillRect(0, 0, cw, ch);

  drawRoundedRect(g, 42, 54, cw - 84, ch - 96, 40, '#090b1c');
  drawRoundedRect(g, 42, 42, cw - 84, ch - 96, 40, '#c3cef6');

  // Lencana atas
  drawRoundedRect(g, 88, 86, 330, 44, 14, '#16193a');
  g.fillStyle = '#ffffff';
  g.font = '900 18px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('ECOPOLIS · KOTA 2050', 112, 109);

  // Avatar & Nama Pemimpin
  const facePng = faceImg ? await faceToPng(faceImg) : null;
  const faceLoaded = facePng ? await loadImage(facePng) : null;
  let nameX = 88;
  if (faceLoaded) {
    drawRoundedRect(g, 88, 152, 88, 88, 22, '#16193a');
    drawRoundedRect(g, 92, 156, 80, 80, 18, '#d8dff9');
    g.imageSmoothingEnabled = false;
    g.drawImage(faceLoaded, 96, 160, 72, 72);
    g.imageSmoothingEnabled = true;
    nameX = 194;
  }

  g.fillStyle = '#474e7d';
  g.font = '800 20px system-ui, sans-serif';
  g.fillText('LAPORAN KEPEMIMPINAN WALI KOTA', nameX, 174);

  g.fillStyle = '#16193a';
  g.font = '900 48px system-ui, sans-serif';
  g.fillText(leader.name, nameX, 218);

  // Pita Judul 2050
  drawRoundedRect(g, 88, 266, cw - 176, 78, 20, '#b83712');
  drawRoundedRect(g, 88, 258, cw - 176, 78, 20, '#ff6b3d');
  g.fillStyle = '#ffffff';
  g.font = '900 32px system-ui, sans-serif';
  g.fillText(review.title.toUpperCase(), 116, 298, cw - 232);

  // Peta Isometrik Kota 2050
  drawRoundedRect(g, 88, 362, cw - 176, 440, 28, '#d8dff9');
  const mapPng = mapSvg ? await mapToPng(mapSvg, 960) : null;
  const mapLoaded = mapPng ? await loadImage(mapPng) : null;
  if (mapLoaded) {
    const boxW = cw - 216;
    const boxH = 408;
    const scale = Math.min(boxW / mapLoaded.width, boxH / mapLoaded.height);
    const mw = mapLoaded.width * scale;
    const mh = mapLoaded.height * scale;
    g.drawImage(
      mapLoaded,
      88 + (cw - 176 - mw) / 2,
      362 + (440 - mh) / 2,
      mw,
      mh,
    );
  }

  // Grid 4 Indikator (2 × 2)
  const keys: StatKey[] = ['economy', 'environment', 'satisfaction', 'energy'];
  const cardW = (cw - 176 - 24) / 2;
  const cardH = 120;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 88 + col * (cardW + 24);
    const y = 828 + row * (cardH + 20);
    const val = stats[k];

    drawRoundedRect(g, x, y + 6, cardW, cardH, 20, '#090b1c');
    drawRoundedRect(g, x, y, cardW, cardH, 20, '#16193a');

    g.fillStyle = '#c9cde8';
    g.font = '800 18px system-ui, sans-serif';
    g.fillText(STAT_LABELS[k].toUpperCase(), x + 24, y + 36);

    g.fillStyle = '#ffffff';
    g.font = '900 38px system-ui, sans-serif';
    g.textAlign = 'right';
    g.fillText(`${val}/100`, x + cardW - 24, y + 40);
    g.textAlign = 'left';

    const barX = x + 24;
    const barY = y + 76;
    const barW = cardW - 48;
    drawRoundedRect(g, barX, barY, barW, 18, 9, '#242a52');
    if (val > 0) {
      const fillW = Math.max(18, (val / 100) * barW);
      drawRoundedRect(
        g,
        barX,
        barY,
        fillW,
        18,
        9,
        val >= 50 ? '#86c45a' : '#ff6b3d',
      );
    }
  }

  // Ringkasan Kebijakan & Kaki
  drawRoundedRect(g, 88, 1132, cw - 176, 124, 20, '#ffffff');
  g.fillStyle = '#16193a';
  g.font = '900 18px system-ui, sans-serif';
  g.fillText('5 KEBIJAKAN KOTA:', 114, 1166);

  g.fillStyle = '#474e7d';
  g.font = '700 19px system-ui, sans-serif';
  const summary = choices.map((c) => c.label).join('  ·  ');
  g.fillText(summary, 114, 1200, cw - 228);

  g.fillStyle = '#8a5b19';
  g.font = '900 16px system-ui, sans-serif';
  g.fillText('Simulator Kebijakan Iklim Ecopolis · INVOFEST 2026', 114, 1232);

  const safe =
    leader.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'pemimpin';
  const fileName = `ecopolis-story-${safe}-2050.png`;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) return;

  // Unduh langsung berkas PNG
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);

  // Jika perangkat mendukung Web Share API dengan berkas gambar, buka share sheet.
  try {
    const file = new File([blob], fileName, { type: 'image/png' });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `Ecopolis 2050 — ${review.title}`,
        text: `Inilah masa depan kota Ecopolis di bawah kepemimpinan ${leader.name}: "${review.title}"!`,
        files: [file],
      });
    }
  } catch {
    // Pengguna menutup dialog share; unduhan PNG tetap sudah tersimpan.
  }
}
