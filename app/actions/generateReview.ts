'use server';

import type { Review, ReviewPayload } from '@/lib/types.ts';
import { fallbackReview } from '@/lib/fallback.ts';

/**
 * Satu-satunya pemanggilan jaringan di seluruh permainan, dijalankan tepat
 * sekali saat ronde terakhir selesai.
 *
 * Fungsi ini tidak pernah melempar error. Kegagalan apa pun — timeout, rate
 * limit, kuota habis, offline, kunci salah, JSON cacat — berakhir di narasi
 * cadangan lokal, supaya permainan tidak pernah berhenti di depan juri.
 */

const TIMEOUT_MS = 4000;

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    narrative: { type: 'string' },
    sdgReflection: { type: 'string' },
  },
  required: ['title', 'narrative', 'sdgReflection'],
} as const;

function buildPrompt({ leader, stats, choices }: ReviewPayload): string {
  const decisions = choices
    .map((c) => `Ronde ${c.round}: memilih "${c.label}"`)
    .join('\n');

  return [
    'Anda adalah Kepala Evaluator Iklim AI untuk kota Ecopolis pada tahun 2050.',
    '',
    `Nama pemimpin: ${leader.name}`,
    `Panggilan: ${leader.avatar === 'female' ? 'Ibu' : 'Bapak'}`,
    `Statistik akhir — Ekonomi: ${stats.economy}, Lingkungan: ${stats.environment}, Kepuasan Warga: ${stats.satisfaction}, Energi: ${stats.energy} (skala 0-100).`,
    '',
    'Kebijakan yang diambil:',
    decisions,
    '',
    'Tulis evaluasi dengan ketentuan berikut:',
    '1. "title": judul dramatis 3-5 kata yang menggambarkan kota pada 2050.',
    '2. "narrative": dua paragraf bergaya naratif dramatis tentang bagaimana kota berkembang hingga 2050 berdasarkan kebijakan di atas. Sebut nama pemimpin dan kaitkan dengan angka statistiknya. Pisahkan kedua paragraf dengan dua baris baru.',
    '3. "sdgReflection": dua kalimat edukatif yang mengaitkan hasil ini dengan SDG 11 (Kota dan Permukiman Berkelanjutan) dan SDG 13 (Penanganan Perubahan Iklim).',
    '',
    'SELURUH output harus dalam Bahasa Indonesia yang baik dan natural.',
  ].join('\n');
}

export async function generateReview(payload: ReviewPayload): Promise<Review> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fallbackReview(payload.leader, payload.stats);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(payload) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 1,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      },
    );

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') throw new Error('Respons tanpa teks');

    const parsed = JSON.parse(text);
    if (
      typeof parsed?.title !== 'string' ||
      typeof parsed?.narrative !== 'string' ||
      typeof parsed?.sdgReflection !== 'string'
    ) {
      throw new Error('Bentuk JSON tidak sesuai');
    }

    return {
      title: parsed.title,
      narrative: parsed.narrative,
      sdgReflection: parsed.sdgReflection,
      fallback: false,
    };
  } catch (err) {
    console.error('[generateReview] jatuh ke narasi lokal:', err);
    return fallbackReview(payload.leader, payload.stats);
  }
}
