import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fallbackReview } from './fallback.ts';
import { INITIAL_STATS } from './reducer.ts';
import type { Leader, Stats } from './types.ts';

const BUDI: Leader = { name: 'Budi', avatar: 'male' };
const SARI: Leader = { name: 'Sari', avatar: 'female' };

const stats = (economy: number, environment: number): Stats => ({
  ...INITIAL_STATS,
  economy,
  environment,
});

test('kuadran hijau dan kaya', () => {
  assert.equal(fallbackReview(BUDI, stats(70, 70)).title, 'Metropolis Seimbang 2050');
});

test('kuadran hijau tapi miskin', () => {
  assert.equal(fallbackReview(BUDI, stats(20, 80)).title, 'Surga Hijau yang Sunyi');
});

test('kuadran kaya tapi kotor', () => {
  assert.equal(fallbackReview(BUDI, stats(90, 15)).title, 'Kota Metropol Polutan');
});

test('kuadran krisis ganda', () => {
  assert.equal(fallbackReview(BUDI, stats(10, 10)).title, 'Kota di Ambang Krisis');
});

test('batas 50 dihitung sebagai sisi positif', () => {
  assert.equal(fallbackReview(BUDI, stats(50, 50)).title, 'Metropolis Seimbang 2050');
  assert.equal(fallbackReview(BUDI, stats(49, 50)).title, 'Surga Hijau yang Sunyi');
  assert.equal(fallbackReview(BUDI, stats(50, 49)).title, 'Kota Metropol Polutan');
});

test('selalu ditandai sebagai fallback', () => {
  assert.equal(fallbackReview(BUDI, INITIAL_STATS).fallback, true);
});

test('narasi menyebut nama pemimpin dan panggilan sesuai avatar', () => {
  assert.match(fallbackReview(BUDI, stats(70, 70)).narrative, /Bapak Budi/);
  assert.match(fallbackReview(SARI, stats(70, 70)).narrative, /Ibu Sari/);
});

test('narasi selalu dua paragraf dan tidak ada placeholder yang bocor', () => {
  for (const [eco, env] of [[70, 70], [20, 80], [90, 15], [10, 10]]) {
    const r = fallbackReview(SARI, stats(eco, env));
    assert.equal(r.narrative.split('\n\n').length, 2, `Kuadran ${eco}/${env} bukan dua paragraf`);
    assert.doesNotMatch(r.narrative, /undefined|NaN|\$\{/);
    assert.doesNotMatch(r.sdgReflection, /undefined|NaN|\$\{/);
    assert.match(r.sdgReflection, /SDG 11/);
    assert.match(r.sdgReflection, /SDG 13/);
  }
});

test('angka statistik yang benar muncul di narasi', () => {
  const r = fallbackReview(BUDI, stats(73, 64));
  assert.match(r.narrative, /73/);
  assert.match(r.narrative, /64/);
});
