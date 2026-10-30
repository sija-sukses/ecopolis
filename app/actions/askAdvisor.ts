'use server';

import { localAdvisorReply, type AdvisorPayload, type AdvisorReply } from '@/lib/advisor.ts';
import { honorificOf } from '@/lib/avatars.ts';
import { scenarioFor } from '@/lib/scenarios.ts';

const TIMEOUT_MS = 4500;

const rawModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
const MODEL = rawModel.replace(/^models\//, '');
const FALLBACK_MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
  },
  required: ['reply'],
};

function buildAdvisorPrompt(payload: AdvisorPayload): string {
  const { leader, round, stats, choices, question, history = [] } = payload;
  const who = leader ? `${honorificOf(leader.avatar)} ${leader.name}` : 'Wali Kota';
  const scenario = scenarioFor(round);
  const decisions =
    choices.length > 0
      ? choices.map((c) => `Ronde ${c.round}: ${c.label}`).join(', ')
      : 'Belum ada proyek dibangun';

  const recentChat = history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Wali Kota' : 'TARA'}: ${m.text}`)
    .join('\n');

  return [
    'Anda adalah TARA (Tata Ruang & Analisis), Staf Ahli AI pendamping Wali Kota di game simulasi iklim Ecopolis.',
    `Sapa pengguna dengan "${who}".`,
    `Status permainan: ${scenario ? `Ronde ${round} dari 5 (${scenario.title})` : 'Simulasi selesai (Menuju 2050)'}.`,
    scenario
      ? `Pilihan di ronde ini: Opsi A "${scenario.options[0].label}" vs Opsi B "${scenario.options[1].label}".`
      : '',
    `Indikator kota saat ini (0-100): Ekonomi=${stats.economy}, Lingkungan=${stats.environment}, Kepuasan=${stats.satisfaction}, Energi=${stats.energy}.`,
    `Kebijakan yang sudah diambil: ${decisions}.`,
    recentChat ? `Percakapan sebelumnya:\n${recentChat}` : '',
    `Pertanyaan Wali Kota: "${question}"`,
    '',
    'Jawab dalam Bahasa Indonesia yang cerdas, taktis, ramah, dan ringkas (maksimal 3 kalimat pendek agar nyaman dibaca dan didengarkan lewat fitur suara). Kaitkan langsung dengan angka indikator kota saat ini.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function requestGemini(model: string, key: string, prompt: string) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    },
  );
}

export async function askAdvisor(payload: AdvisorPayload): Promise<AdvisorReply> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return localAdvisorReply(payload);

  try {
    const prompt = buildAdvisorPrompt(payload);
    let res = await requestGemini(MODEL, key, prompt);
    if (res.status === 404 && MODEL !== FALLBACK_MODEL) {
      res = await requestGemini(FALLBACK_MODEL, key, prompt);
    }

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') throw new Error('Respons tanpa teks');

    const parsed = JSON.parse(text);
    if (typeof parsed?.reply !== 'string' || !parsed.reply.trim()) {
      throw new Error('Bentuk JSON tidak sesuai');
    }

    return {
      reply: parsed.reply.trim(),
      fallback: false,
    };
  } catch (err) {
    console.error('[askAdvisor] jatuh ke asisten lokal:', err);
    return localAdvisorReply(payload);
  }
}
