import assert from 'node:assert/strict';
import test from 'node:test';

import { localAdvisorReply, quickPromptsFor, type AdvisorContext } from './advisor.ts';

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
