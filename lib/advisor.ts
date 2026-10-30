import { honorificOf } from './avatars.ts';
import { scenarioFor, ROUNDS } from './scenarios.ts';
import type { Choice, Leader, StatKey, Stats } from './types.ts';

export type AdvisorMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type AdvisorContext = {
  leader: Leader | null;
  round: number;
  stats: Stats;
  choices: Choice[];
};

export type AdvisorPayload = AdvisorContext & {
  question: string;
  history?: AdvisorMessage[];
};

export type AdvisorReply = {
  reply: string;
  fallback: boolean;
};

const STAT_NAMES: Record<StatKey, string> = {
  economy: 'Ekonomi',
  environment: 'Lingkungan',
  satisfaction: 'Kepuasan Warga',
  energy: 'Energi',
};

function salutation(leader: Leader | null): string {
  if (!leader) return 'Wali Kota';
  return `${honorificOf(leader.avatar)} ${leader.name}`;
}

function extremeStats(stats: Stats): { lowest: StatKey; highest: StatKey } {
  const keys: StatKey[] = ['economy', 'environment', 'satisfaction', 'energy'];
  let lowest: StatKey = keys[0];
  let highest: StatKey = keys[0];
  for (const k of keys) {
    if (stats[k] < stats[lowest]) lowest = k;
    if (stats[k] > stats[highest]) highest = k;
  }
  return { lowest, highest };
}

function forecastQuadrant(stats: Stats): string {
  const green = stats.environment >= 50;
  const rich = stats.economy >= 50;
  if (green && rich) return 'Metropolis Seimbang 2050 (ekonomi kuat & lingkungan terjaga)';
  if (green && !rich) return 'Surga Hijau yang Sunyi (udara bersih, namun kas daerah tertekan)';
  if (!green && rich) return 'Kota Metropol Polutan (industri pesat, namun krisis ekologis)';
  return 'Kota di Ambang Krisis (ekonomi dan lingkungan sama-sama tertekan)';
}

export function quickPromptsFor(round: number, hasLeader: boolean): string[] {
  if (!hasLeader) {
    return [
      'Bagaimana cara menang di Ecopolis?',
      'Apa saja 4 indikator kota?',
      'Kenapa tidak ada pilihan sempurna?',
    ];
  }
  if (round > ROUNDS) {
    return [
      'Evaluasi hasil akhir kotaku',
      'Kebijakan mana yang paling berdampak?',
      'Bagaimana cara memperbaiki skor ini?',
    ];
  }
  return [
    `Saran strategi untuk Ronde ${round}?`,
    'Indikator mana yang paling kritis?',
    'Prediksi nasib kotaku di 2050',
  ];
}

export function localAdvisorReply(payload: AdvisorPayload): AdvisorReply {
  const { leader, round, stats, choices, question } = payload;
  const who = salutation(leader);
  const q = question.toLowerCase();
  const { lowest, highest } = extremeStats(stats);
  const currentScenario = scenarioFor(round);

  if (q.includes('energi') || q.includes('pltu') || q.includes('plts') || q.includes('batu bara') || q.includes('surya')) {
    return {
      reply: `${who}, di sektor energi: PLTU Batu Bara mendongkrak Ekonomi (+20) dan Energi (+25) secara instan, tetapi memangkas Lingkungan (-25). Sebaliknya, PLTS Surya menjaga Lingkungan (+20) dan Kepuasan (+10) dengan biaya awal Ekonomi (-15). Saat ini Energi kota berada di angka ${stats.energy} dan Lingkungan di ${stats.environment}.`,
      fallback: true,
    };
  }

  if (q.includes('mobilitas') || q.includes('macet') || q.includes('tol') || q.includes('brt') || q.includes('bus') || q.includes('transportasi')) {
    return {
      reply: `${who}, untuk mobilitas: Tol Lingkar Dalam mempercepat logistik (Ekonomi +15) namun menambah emisi (Lingkungan -20). Bus Listrik BRT membutuhkan subsidi (Ekonomi -10, Energi -5), tetapi warga sangat menyukainya (Kepuasan +20, Lingkungan +15).`,
      fallback: true,
    };
  }

  if (q.includes('lahan') || q.includes('industri') || q.includes('pabrik') || q.includes('hutan') || q.includes('resapan') || q.includes('banjir')) {
    return {
      reply: `${who}, dilema lahan kosong menentukan paru-paru kota: Kawasan Industri memberi lonjakan Ekonomi terbesar (+25) namun menguras Lingkungan (-20) dan Energi (-15). Hutan Kota memulihkan Lingkungan (+25) dan Kepuasan (+15), meski menahan kas Ekonomi (-15).`,
      fallback: true,
    };
  }

  if (q.includes('sampah') || q.includes('tpa') || q.includes('daur ulang') || q.includes('limbah') || q.includes('kompos')) {
    return {
      reply: `${who}, soal krisis sampah: Perluasan TPA Terbuka menghemat anggaran (Ekonomi +10), tetapi merusak Lingkungan (-25) dan memicu protes warga (Kepuasan -15). Pusat Daur Ulang memakan biaya Ekonomi (-10), namun menyelamatkan Lingkungan (+20) dan Kepuasan (+15).`,
      fallback: true,
    };
  }

  if (q.includes('hunian') || q.includes('perumahan') || q.includes('apartemen') || q.includes('rusun') || q.includes('permukiman')) {
    return {
      reply: `${who}, di ronde hunian: Perumahan Tapak disukai pasar cepat (Ekonomi +15, Kepuasan +5) tapi menghabiskan lahan resapan (Lingkungan -20, Energi -10). Apartemen Hijau menjaga Lingkungan (+15), Kepuasan (+15), dan efisiensi Energi (+10) dengan beban APBD (Ekonomi -15).`,
      fallback: true,
    };
  }

  if (q.includes('2050') || q.includes('prediksi') || q.includes('nasib') || q.includes('masa depan') || q.includes('evaluasi') || q.includes('hasil')) {
    const picked = choices.length > 0 ? choices.map((c) => c.label).join(', ') : 'belum ada proyek terbangun';
    return {
      reply: `Berdasarkan indikator saat ini (Ekonomi ${stats.economy}, Lingkungan ${stats.environment}, Kepuasan ${stats.satisfaction}, Energi ${stats.energy}) serta kebijakan (${picked}), Ecopolis sedang mengarah menjadi "${forecastQuadrant(stats)}". Sektor terlemah Anda adalah ${STAT_NAMES[lowest]} (${stats[lowest]}).`,
      fallback: true,
    };
  }

  if (q.includes('kritis') || q.includes('indikator') || q.includes('statistik') || q.includes('kondisi') || q.includes('skor')) {
    return {
      reply: `Laporan indikator terkini untuk ${who}: Ekonomi ${stats.economy}, Lingkungan ${stats.environment}, Kepuasan Warga ${stats.satisfaction}, dan Energi ${stats.energy}. Sektor paling kuat adalah ${STAT_NAMES[highest]} (${stats[highest]}), sedangkan yang paling membutuhkan perhatian adalah ${STAT_NAMES[lowest]} (${stats[lowest]}).`,
      fallback: true,
    };
  }

  if (currentScenario && (q.includes('saran') || q.includes('strategi') || q.includes('ronde') || q.includes('pilih') || q.includes('bantu'))) {
    const [optA, optB] = currentScenario.options;
    const needGreen = stats.environment <= stats.economy;
    const rec = needGreen ? optB : optA;
    return {
      reply: `${who}, pada Ronde ${round} (${currentScenario.title}), Anda memilih antara "${optA.label}" atau "${optB.label}". Karena ${STAT_NAMES[lowest]} Anda berada di angka ${stats[lowest]}, saya menyarankan mempertimbangkan "${rec.label}" agar neraca kota tetap seimbang hingga 2050.`,
      fallback: true,
    };
  }

  if (currentScenario) {
    return {
      reply: `Siap, ${who}! Kita berada di Ronde ${round} (${currentScenario.title}). Kondisi kota: Ekonomi ${stats.economy}, Lingkungan ${stats.environment}, Kepuasan ${stats.satisfaction}, Energi ${stats.energy}. Perhatikan sektor ${STAT_NAMES[lowest]} (${stats[lowest]}) sebelum mengetuk palu kebijakan berikutnya.`,
      fallback: true,
    };
  }

  return {
    reply: `Halo ${who}! Saya TARA, Staf Ahli AI Ecopolis. Tugas Anda adalah menyeimbangkan Ekonomi, Lingkungan, Kepuasan Warga, dan Energi dalam 5 ronde pembangunan menuju tahun 2050. Tanyakan apa saja lewat ketikan atau tombol suara!`,
    fallback: true,
  };
}
