import { honorificOf } from './avatars.ts';
import type { Leader, Review, Stats } from './types.ts';

/**
 * Narasi cadangan tanpa jaringan. Dipakai kalau Gemini gagal karena alasan apa
 * pun — timeout, rate limit, kuota habis, offline, atau JSON cacat.
 *
 * Pemilihannya deterministik atas kuadran lingkungan x ekonomi, jadi hasilnya
 * selalu bisa diprediksi dan diuji.
 */

type Quadrant = {
  title: string;
  narrative: (ctx: Ctx) => string;
  sdgReflection: (ctx: Ctx) => string;
};

type Ctx = {
  name: string;
  /** "Bapak" / "Ibu" */
  honorific: string;
  stats: Stats;
};

const GREEN_RICH: Quadrant = {
  title: 'Metropolis Seimbang 2050',
  narrative: (c) =>
    `Tahun 2050, Ecopolis disebut-sebut dalam forum iklim dunia bukan karena ukurannya, melainkan karena keberaniannya. Di bawah kepemimpinan ${c.honorific} ${c.name}, kota ini membuktikan hal yang lama dianggap mustahil: pertumbuhan ekonomi hingga indeks ${c.stats.economy} tidak harus dibayar dengan udara yang kotor. Indeks lingkungan bertahan di ${c.stats.environment}, dan anak-anak yang lahir di dekade ini tidak pernah tahu seperti apa rasanya langit berkabut asap.\n\nKereta ringan bergerak di antara koridor hijau, dan atap-atap pembangkit surya memantulkan cahaya pagi ke seluruh lembah. Tingkat kepuasan warga menetap di ${c.stats.satisfaction} — angka yang jarang dicapai kota mana pun. Para perencana dari ibu kota negara lain datang membawa buku catatan, bertanya hal yang sama berulang kali: bagaimana Anda meyakinkan semua orang bahwa keduanya bisa berjalan bersama?`,
  sdgReflection: (c) =>
    `Keseimbangan yang ${c.honorific} ${c.name} capai adalah inti dari SDG 11, yang menuntut kota tumbuh tanpa mengorbankan kelayakan hidup penghuninya. Dengan indeks lingkungan ${c.stats.environment} dan ekonomi ${c.stats.economy}, Ecopolis menunjukkan bahwa aksi iklim SDG 13 bukan penghambat pembangunan, melainkan fondasinya.`,
};

const GREEN_POOR: Quadrant = {
  title: 'Surga Hijau yang Sunyi',
  narrative: (c) =>
    `Udara Ecopolis tahun 2050 adalah yang terbersih di seluruh kawasan, dengan indeks lingkungan menembus ${c.stats.environment}. Hutan kota yang ${c.honorific} ${c.name} pertahankan kini menaungi sepertiga wilayah, dan sungai yang dahulu keruh kembali dihuni ikan. Bagi yang tinggal di dalamnya, kota ini terasa seperti kemenangan panjang atas keserakahan.\n\nNamun di balik kanopi itu, indeks ekonomi hanya ${c.stats.economy}. Kawasan industri yang pernah ditawarkan investor berdiri di kota sebelah, dan bersamanya pergi pula lapangan kerja bagi generasi muda. Setiap pagi, bus-bus mengangkut para sarjana keluar dari kota yang paling hijau di negeri ini — mencari pekerjaan di tempat yang langitnya tidak sejernih rumah mereka sendiri.`,
  sdgReflection: (c) =>
    `Capaian lingkungan ${c.stats.environment} adalah wujud nyata SDG 13, tetapi SDG 11 menuntut lebih dari sekadar udara bersih — kota harus mampu menghidupi warganya. Pelajaran dari Ecopolis 2050: kelestarian yang tidak disertai pekerjaan hanya menunda perpindahan masalah, bukan menyelesaikannya.`,
};

const BROWN_RICH: Quadrant = {
  title: 'Kota Metropol Polutan',
  narrative: (c) =>
    `Dari udara, Ecopolis tahun 2050 adalah pemandangan yang memukau: menara-menara kaca sejauh mata memandang, pelabuhan yang tidak pernah tidur, dan indeks ekonomi ${c.stats.economy} yang membuatnya menjadi mesin pertumbuhan paling ganas di kawasan. Kebijakan ${c.honorific} ${c.name} menghasilkan kemakmuran yang nyata dan terukur.\n\nYang tidak terlihat dari udara adalah indeks lingkungan yang jatuh ke ${c.stats.environment}. Masker bukan lagi alat kesehatan melainkan bagian dari pakaian sehari-hari. Klinik pernapasan dibuka di setiap kelurahan, dan tingkat kepuasan warga tertahan di ${c.stats.satisfaction} — sebab kemakmuran, ternyata, sulit dinikmati sambil menahan napas. Arsip kota menyimpan satu pertanyaan yang diajukan seorang murid pada tahun 2049: apakah kami kaya, atau hanya sibuk?`,
  sdgReflection: (c) =>
    `Ekonomi ${c.stats.economy} tanpa lingkungan yang layak adalah kegagalan SDG 11, yang mensyaratkan kota aman dan sehat untuk ditinggali, bukan sekadar produktif. Indeks lingkungan ${c.stats.environment} menjadi peringatan SDG 13 bahwa biaya iklim tidak hilang — ia hanya ditagihkan kepada generasi berikutnya.`,
};

const BROWN_POOR: Quadrant = {
  title: 'Kota di Ambang Krisis',
  narrative: (c) =>
    `Tahun 2050 tiba di Ecopolis tanpa perayaan. Indeks ekonomi tertahan di ${c.stats.economy} dan indeks lingkungan di ${c.stats.environment} — dua angka yang, ketika muncul bersamaan, membuat para perencana kota berbicara dengan hati-hati. Keputusan-keputusan yang diambil ${c.honorific} ${c.name} menuntut biaya di satu sisi tanpa sempat memetik hasil di sisi lain.\n\nPembangkit tua masih mengepul di tepi kota, tetapi listriknya tidak cukup untuk menarik industri baru. Warga yang bertahan menghadapi dua beban sekaligus: udara yang memburuk dan peluang kerja yang menyusut, dengan tingkat kepuasan di ${c.stats.satisfaction}. Di ruang rapat balai kota, peta lima petak itu masih terpasang di dinding — pengingat bahwa setiap petak dahulu pernah menawarkan dua jalan yang berbeda.`,
  sdgReflection: (c) =>
    `Ketika ekonomi dan lingkungan melemah bersamaan, SDG 11 dan SDG 13 gagal secara bersamaan pula — sebab keduanya bertumpu pada fondasi yang sama. Ecopolis 2050 menunjukkan bahwa menunda pilihan sulit bukanlah jalan tengah, melainkan cara tercepat kehilangan kedua-duanya.`,
};

function quadrant(stats: Stats): Quadrant {
  const green = stats.environment >= 50;
  const rich = stats.economy >= 50;
  if (green && rich) return GREEN_RICH;
  if (green) return GREEN_POOR;
  if (rich) return BROWN_RICH;
  return BROWN_POOR;
}

export function fallbackReview(leader: Leader, stats: Stats): Review {
  const ctx: Ctx = {
    name: leader.name,
    honorific: honorificOf(leader.avatar),
    stats,
  };
  const q = quadrant(stats);
  return {
    title: q.title,
    narrative: q.narrative(ctx),
    sdgReflection: q.sdgReflection(ctx),
    fallback: true,
  };
}
