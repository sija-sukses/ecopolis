import { honorificOf } from './avatars.ts';
import { scenarioFor, ROUNDS } from './scenarios.ts';
import type { Choice, Leader, OptionId, StatKey, Stats } from './types.ts';

export type AdvisorMessage = {
  role: 'user' | 'assistant';
  text: string;
  fallback?: boolean;
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

export const OUT_OF_SCOPE_REPLY =
  'Maaf, saya hanya dapat membantu topik Ecopolis dan pembangunan berkelanjutan.';

const ADVISOR_TOPIC =
  /\b(ecopolis|kota|wali kota|ronde|skenario|kebijakan|strategi|indikator|skor|audit|darurat|kontinjensi|krisis|ekonomi|kepuasan|energi|lingkungan|iklim|sustainab\w*|berkelanjutan|sdg|emisi|karbon|polusi|hijau|ekologi|biodiversitas|konservasi|sampah|limbah|daur ulang|kompos|transportasi|mobilitas|brt|bus|tol|pltu|plts|surya|batu bara|industri|hutan|resapan|banjir|tpa|hunian|perumahan|apartemen|permukiman|tata ruang|2050)\b/i;

export function isAdvisorTopic(question: string): boolean {
  return ADVISOR_TOPIC.test(question.trim());
}

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

export function quickPromptsFor(round: number, hasLeader: boolean, isCrisis = false): string[] {
  if (!hasLeader) {
    return [
      'Bagaimana cara menang di Ecopolis?',
      'Apa saja 4 indikator kota?',
      'Kenapa tidak ada pilihan sempurna?',
    ];
  }
  if (isCrisis) {
    return [
      '🚨 Rencana Kontinjensi Darurat',
      `Saran strategi untuk Ronde ${round}?`,
      '📊 Audit Cepat Sektor Kritis',
      'Prediksi nasib kotaku di 2050',
    ];
  }
  if (round > ROUNDS) {
    return [
      'Evaluasi hasil akhir kotaku',
      '📊 Audit Cepat Sektor Kritis',
      'Kebijakan mana yang paling berdampak?',
      'Bagaimana cara memperbaiki skor ini?',
    ];
  }
  return [
    `Saran strategi untuk Ronde ${round}?`,
    '📊 Audit Cepat Sektor Kritis',
    'Indikator mana yang paling kritis?',
    'Prediksi nasib kotaku di 2050',
  ];
}

export function localAdvisorReply(payload: AdvisorPayload): AdvisorReply {
  const { leader, round, stats, choices, question } = payload;
  if (!isAdvisorTopic(question)) return { reply: OUT_OF_SCOPE_REPLY, fallback: true };

  const who = salutation(leader);
  const q = question.toLowerCase();
  const { lowest, highest } = extremeStats(stats);
  const currentScenario = scenarioFor(round);

  if (q.includes('darurat') || q.includes('kontinjensi') || q.includes('krisis')) {
    return {
      reply: `🚨 PROTOKOL KONTINJENSI DARURAT ECOPOLIS:\nSektor ${STAT_NAMES[lowest]} berada di zona kritis (${stats[lowest]}/100)! Jika angka ini menyentuh 0, stabilitas kota runtuh sebelum 2050.\nInstruksi TARA: Pada kebijakan berikutnya, dahulukan opsi yang memberikan pemulihan instan pada ${STAT_NAMES[lowest]} dan hindari proyek yang memperparah defisit.`,
      fallback: true,
    };
  }

  if (q.includes('audit') || q.includes('diagnosis')) {
    const health = (val: number) => (val >= 60 ? 'AMAN' : val >= 40 ? 'WASPADA' : 'KRITIS');
    return {
      reply: `📊 Hasil Audit Tata Ruang 2050 untuk ${who}:\n• 💼 Ekonomi: ${stats.economy}/100 [${health(stats.economy)}]\n• 🌳 Lingkungan: ${stats.environment}/100 [${health(stats.environment)}]\n• 👥 Kepuasan: ${stats.satisfaction}/100 [${health(stats.satisfaction)}]\n• ⚡ Energi: ${stats.energy}/100 [${health(stats.energy)}]\nPrioritas mitigasi: Sektor ${STAT_NAMES[lowest]} (${stats[lowest]}) membutuhkan intervensi mendesak agar stabilitas kota tidak kolaps.`,
      fallback: true,
    };
  }

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

export function getPolicyProjection(
  round: number,
  optionId: OptionId,
  stats?: Stats,
): string {
  const current = stats ?? { economy: 50, environment: 50, satisfaction: 50, energy: 50 };

  if (round === 1) {
    if (optionId === 'a') {
      return current.environment <= 40
        ? '⚠️ Peringatan: Menambah listrik (+20) & kas (+18), namun memangkas lingkungan (-14) yang sudah tertekan.'
        : '💡 Mendongkrak industri (+18 Ekonomi, +20 Energi) dengan mengorbankan kualitas udara kota (-14).';
    }
    return current.economy <= 35
      ? '⚠️ Beban APBD awal cukup berat (-10 Ekonomi), tetapi menyelamatkan skor hijau kota (+16 Lingkungan, +14 Energi).'
      : '💡 Pilihan berkelanjutan: Fondasi energi bersih jangka panjang (+16 Lingkungan, +8 Kepuasan) dengan biaya awal terkontrol.';
  }

  if (round === 2) {
    if (optionId === 'a') {
      return current.environment <= 35
        ? '⚠️ Mempercepat logistik (+15), namun berisiko memicu kabut polusi lanjutan dari lonjakan emisi knalpot (-10).'
        : '💡 Solusi cepat mengurai kemacetan (+15 Ekonomi), namun menambah emisi bahan bakar fosil (-10 Lingkungan).';
    }
    return current.energy <= 35
      ? '⚠️ Armada bus listrik menambah beban jaringan listrik (-12), tetapi sangat disukai warga (+10 Kepuasan, +12 Lingkungan).'
      : '💡 Mengalihkan warga ke angkutan umum modern (+12 Lingkungan, +10 Kepuasan) dengan subsidi armada (-8 Ekonomi).';
  }

  if (round === 3) {
    if (optionId === 'a') {
      return current.environment <= 40
        ? '⚠️ Krisis Ekologi: Memberi lonjakan kas tertinggi (+22 Ekonomi), namun memicu degradasi lingkungan dan air berat (-14).'
        : '💡 Akselerasi lapangan kerja dan investasi masif (+22 Ekonomi) dengan konsekuensi polusi industri dan beban energi (-12).';
    }
    return current.economy <= 35
      ? '⚠️ Menahan pendapatan daerah (-6 Ekonomi), namun menjadi benteng paru-paru kota terbaik (+18 Lingkungan, +14 Kepuasan).'
      : '💡 Melindungi ruang terbuka hijau (+18 Lingkungan, +14 Kepuasan) sekaligus meredam risiko banjir dan panas perkotaan.';
  }

  if (round === 4) {
    if (optionId === 'a') {
      return current.satisfaction <= 40
        ? '⚠️ Bahaya Demo: Hemat anggaran (+10), namun gunungan sampah memicu penolakan keras warga (-16 Kepuasan) dan pencemaran tanah (-12).'
        : '💡 Solusi pragmatis berbiaya murah (+10 Ekonomi), namun mewariskan timbunan sampah kronis ke generasi 2050.';
    }
    return current.economy <= 35
      ? '⚠️ Biaya fasilitas daur ulang menekan kas (-10 Ekonomi), namun mengonversi limbah menjadi energi (+10) dan udara bersih (+14).'
      : '💡 Transformasi ekonomi sirkular modern: Memulihkan lingkungan (+14) dan menambah pasokan energi listrik sampah (+10).';
  }

  if (round === 5) {
    if (optionId === 'a') {
      return current.environment <= 40
        ? '⚠️ Ekspansi horizontal mengorbankan sisa ruang terbuka (-10 Lingkungan), meski sangat diminati pasar (+14 Ekonomi, +10 Kepuasan).'
        : '💡 Memenuhi impian rumah tapak warga (+10 Kepuasan, +14 Ekonomi), dengan konsekuensi boros lahan dan energi (-8).';
    }
    return current.satisfaction <= 40
      ? '⚠️ Warga perlu adaptasi gaya hidup hunian vertikal (-4 Kepuasan), namun menyelamatkan tata ruang hijau kota (+12 Lingkungan).'
      : '💡 Tata ruang metropolis modern: Efisiensi lahan maksimal dan ramah ekologi (+12 Lingkungan) dengan penyesuaian sosial warga.';
  }

  return '💡 Analisis AI: Timbang keseimbangan antara pertumbuhan ekonomi dan kelestarian ekosistem sebelum menetapkan kebijakan.';
}
