import type { Scenario } from './types.ts';

/**
 * Lima dilema kebijakan. Data murni — menambah ronde cukup menambah satu entri
 * di sini, tidak ada kode yang perlu diubah.
 *
 * Penyeimbangan: tidak ada opsi yang unggul di semua statistik. Jalur "serba
 * hijau" menamatkan permainan dengan ekonomi ~10, jalur "serba ekonomi"
 * menamatkannya dengan lingkungan ~0 — dua ekstrem sengaja berakhir krisis,
 * karena di situlah pelajaran tradeoff-nya.
 */
export const SCENARIOS: Scenario[] = [
  {
    round: 1,
    plot: 0,
    title: 'Pembangunan Sumber Energi Pertama',
    context:
      'Ecopolis baru berdiri dan belum punya pasokan listrik sendiri. Anggaran tahun pertama hanya cukup untuk satu pembangkit.',
    options: [
      {
        id: 'a',
        label: 'PLTU Batu Bara',
        blurb: 'Murah, cepat beroperasi, dan langsung menyalakan roda industri.',
        effects: { economy: 18, environment: -14, satisfaction: -12, energy: 20 },
        asset: 'pltu',
      },
      {
        id: 'b',
        label: 'PLTS Surya',
        blurb: 'Investasi awal berat, tapi bersih dan murah untuk seterusnya.',
        effects: { economy: -10, environment: 16, satisfaction: 8, energy: 14 },
        asset: 'plts',
      },
    ],
  },
  {
    round: 2,
    plot: 1,
    title: 'Krisis Kemacetan Kota',
    context:
      'Jumlah kendaraan naik dua kali lipat dalam tiga tahun. Warga mulai berdemo menuntut solusi transportasi.',
    options: [
      {
        id: 'a',
        label: 'Jalan Tol Dalam Kota',
        blurb: 'Macet langsung terurai sementara, namun memicu banjir kendaraan pribadi.',
        effects: { economy: 15, environment: -10, satisfaction: -6, energy: -8 },
        asset: 'tol',
      },
      {
        id: 'b',
        label: 'BRT Listrik Terpadu',
        blurb: 'Memaksa warga berpindah ke angkutan umum, dan menambah beban listrik.',
        effects: { economy: -8, environment: 12, satisfaction: 10, energy: -12 },
        asset: 'brt',
      },
    ],
  },
  {
    round: 3,
    plot: 2,
    title: 'Perebutan Lahan Kosong Utara',
    context:
      'Tersisa satu hamparan lahan luas di utara kota. Investor dan kelompok lingkungan mengajukan proposal yang saling bertolak belakang.',
    options: [
      {
        id: 'a',
        label: 'Kawasan Industri',
        blurb: 'Puluhan ribu lapangan kerja, tapi udara dan air ikut menanggungnya.',
        effects: { economy: 22, environment: -14, satisfaction: -12, energy: -12 },
        asset: 'industri',
      },
      {
        id: 'b',
        label: 'Hutan Kota',
        blurb: 'Paru-paru kota dan ruang publik, tanpa satu rupiah pendapatan.',
        effects: { economy: -6, environment: 18, satisfaction: 14 },
        asset: 'hutan',
      },
    ],
  },
  {
    round: 4,
    plot: 3,
    title: 'Gunung Sampah di Pinggir Kota',
    context:
      'Produksi sampah mencapai 900 ton per hari. Tempat pembuangan lama sudah melebihi kapasitas dan mulai mencemari sungai.',
    options: [
      {
        id: 'a',
        label: 'Perluas TPA Terbuka',
        blurb: 'Solusi termurah yang bisa dijalankan pekan depan.',
        effects: { economy: 10, environment: -12, satisfaction: -16 },
        asset: 'tpa',
      },
      {
        id: 'b',
        label: 'Pusat Daur Ulang & PLTSa',
        blurb: 'Sampah jadi listrik, tapi biaya pembangunannya besar.',
        effects: { economy: -10, environment: 14, satisfaction: 8, energy: 10 },
        asset: 'daurulang',
      },
    ],
  },
  {
    round: 5,
    plot: 4,
    title: 'Satu Juta Warga Baru',
    context:
      'Keputusan terakhir Anda sebagai pemimpin: menampung gelombang urbanisasi tanpa menghancurkan apa yang sudah dibangun.',
    options: [
      {
        id: 'a',
        label: 'Perumahan Horizontal',
        blurb: 'Rumah tapak terjangkau yang disukai warga, dengan ongkos lahan besar.',
        effects: { economy: 14, environment: -10, satisfaction: 10, energy: -8 },
        asset: 'perumahan',
      },
      {
        id: 'b',
        label: 'Apartemen Vertikal Hijau',
        blurb: 'Hemat lahan dan efisien, meski warga harus menyesuaikan diri.',
        effects: { economy: -6, environment: 12, satisfaction: -4, energy: -4 },
        asset: 'apartemen',
      },
    ],
  },
];

export const ROUNDS = SCENARIOS.length;

export const PLOT_COUNT = ROUNDS;

export function scenarioFor(round: number): Scenario | undefined {
  return SCENARIOS.find((s) => s.round === round);
}
