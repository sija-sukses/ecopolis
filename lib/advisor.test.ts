import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPolicyProjection,
  localAdvisorReply,
  quickPromptsFor,
  type AdvisorContext,
} from './advisor.ts';

const baseContext: AdvisorContext = {
  leader: { name: 'Althof', avatar: 'rian' },
  round: 1,
  stats: { economy: 50, environment: 30, satisfaction: 55, energy: 65 },
  choices: [],
};

test('saran ronde menyebut nama pemimpin dan skenario aktif', () => {
  const res = localAdvisorReply({
    ...baseContext,
    question: 'Apa saran strategi untuk ronde 1?',
  });
  assert.equal(res.fallback, true);
  assert.match(res.reply, /Bapak Althof/);
  assert.match(res.reply, /PLTS Surya/);
});

test('pertanyaan indikator menyebutkan sektor terlemah dan terkuat', () => {
  const res = localAdvisorReply({
    ...baseContext,
    question: 'Indikator mana yang paling kritis?',
  });
  assert.match(res.reply, /Lingkungan \(30\)/);
  assert.match(res.reply, /Energi \(65\)/);
});

test('pertanyaan prediksi 2050 memetakan kuadran kota dengan benar', () => {
  const res = localAdvisorReply({
    ...baseContext,
    question: 'Prediksi nasib kotaku di 2050',
  });
  assert.match(res.reply, /Kota Metropol Polutan/);
});

test('quickPromptsFor menyesuaikan dengan status pemain dan ronde', () => {
  const onboard = quickPromptsFor(1, false);
  const playing = quickPromptsFor(3, true);
  const finished = quickPromptsFor(6, true);
  assert.equal(onboard.length, 3);
  assert.match(playing[0], /Ronde 3/);
  assert.match(finished[0], /Evaluasi/);
});

test('pertanyaan audit sektor menghasilkan diagnosa 4 indikator dan rekomendasi mitigasi', () => {
  const res = localAdvisorReply({
    ...baseContext,
    question: '📊 Audit Cepat Sektor Kritis',
  });
  assert.equal(res.fallback, true);
  assert.match(res.reply, /Hasil Audit Tata Ruang 2050/);
  assert.match(res.reply, /Ekonomi: 50\/100/);
  assert.match(res.reply, /Lingkungan: 30\/100/);
  assert.match(res.reply, /KRITIS/);
});

test('quickPromptsFor memunculkan protokol kontinjensi saat kondisi kritis', () => {
  const crisisPrompts = quickPromptsFor(2, true, true);
  assert.equal(crisisPrompts[0], '🚨 Rencana Kontinjensi Darurat');
});

test('pertanyaan rencana darurat menghasilkan instruksi protokol kontinjensi', () => {
  const res = localAdvisorReply({
    ...baseContext,
    question: '🚨 Rencana Kontinjensi Darurat',
  });
  assert.equal(res.fallback, true);
  assert.match(res.reply, /PROTOKOL KONTINJENSI DARURAT/);
  assert.match(res.reply, /Lingkungan berada di zona kritis/);
});

test('getPolicyProjection menghasilkan analisis taktis sesuai ronde dan opsi', () => {
  const proj1 = getPolicyProjection(1, 'a', { economy: 50, environment: 30, satisfaction: 50, energy: 50 });
  assert.match(proj1, /Peringatan/);
  assert.match(proj1, /memangkas lingkungan/);

  const proj2 = getPolicyProjection(1, 'b', { economy: 50, environment: 50, satisfaction: 50, energy: 50 });
  assert.match(proj2, /Fondasi energi bersih/);
});
