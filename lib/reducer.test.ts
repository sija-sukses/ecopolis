import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyEffects, initialState, isFinished, reducer, INITIAL_STATS } from './reducer.ts';
import { ROUNDS, SCENARIOS } from './scenarios.ts';
import type { GameState, Leader, OptionId } from './types.ts';

const LEADER: Leader = { name: 'Budi', avatar: 'rian' };

const started = () => reducer(initialState, { type: 'start', leader: LEADER });

/** Mainkan satu permainan penuh dengan memilih opsi yang sama tiap ronde. */
function playAll(option: OptionId): GameState {
  let s = started();
  for (let i = 0; i < ROUNDS; i++) s = reducer(s, { type: 'choose', option });
  return s;
}

test('statistik tidak pernah melewati 100', () => {
  assert.equal(applyEffects({ ...INITIAL_STATS, economy: 95 }, { economy: 20 }).economy, 100);
});

test('statistik tidak pernah turun di bawah 0', () => {
  assert.equal(applyEffects({ ...INITIAL_STATS, environment: 5 }, { environment: -20 }).environment, 0);
});

test('kunci efek yang tidak disebut dianggap nol', () => {
  const out = applyEffects(INITIAL_STATS, { economy: 10 });
  assert.equal(out.economy, 60);
  assert.equal(out.energy, 50);
});

test('permainan mulai di ronde 1 dengan semua statistik 50', () => {
  const s = started();
  assert.equal(s.round, 1);
  assert.deepEqual(s.stats, INITIAL_STATS);
  assert.equal(s.leader?.name, 'Budi');
  assert.equal(s.plots.filter(Boolean).length, 0);
});

test('memilih menaikkan ronde dan mengisi plot sesuai skenario', () => {
  const s = reducer(started(), { type: 'choose', option: 'b' });
  assert.equal(s.round, 2);
  assert.equal(s.choices.length, 1);
  assert.equal(s.plots[SCENARIOS[0].plot], SCENARIOS[0].options[1].asset);
});

test('memilih menerapkan efek opsi yang benar', () => {
  const s = reducer(started(), { type: 'choose', option: 'a' });
  const fx = SCENARIOS[0].options[0].effects;
  assert.equal(s.stats.economy, 50 + (fx.economy ?? 0));
  assert.equal(s.stats.environment, 50 + (fx.environment ?? 0));
});

test('lima ronde mengisi kelima plot dan menamatkan permainan', () => {
  const s = playAll('a');
  assert.equal(s.round, ROUNDS + 1);
  assert.equal(s.choices.length, ROUNDS);
  assert.equal(s.plots.filter(Boolean).length, ROUNDS);
  assert.ok(isFinished(s));
});

test('memilih setelah ronde terakhir tidak mengubah apa pun', () => {
  const done = playAll('a');
  assert.deepEqual(reducer(done, { type: 'choose', option: 'a' }), done);
});

test('memilih tanpa pemimpin diabaikan', () => {
  assert.deepEqual(reducer(initialState, { type: 'choose', option: 'a' }), initialState);
});

test('setiap plot skenario unik, jadi tidak ada bangunan yang tertimpa', () => {
  const plots = SCENARIOS.map((s) => s.plot);
  assert.equal(new Set(plots).size, SCENARIOS.length);
});

test('tidak ada opsi yang unggul di semua statistik', () => {
  for (const s of SCENARIOS) {
    const [a, b] = s.options;
    const keys = ['economy', 'environment', 'satisfaction', 'energy'] as const;
    const aWinsAll = keys.every((k) => (a.effects[k] ?? 0) >= (b.effects[k] ?? 0));
    const bWinsAll = keys.every((k) => (b.effects[k] ?? 0) >= (a.effects[k] ?? 0));
    assert.ok(!aWinsAll && !bWinsAll, `Ronde ${s.round} punya pilihan yang selalu benar`);
  }
});

test('reset mengosongkan permainan tapi mempertahankan setelan mute', () => {
  const muted = reducer(playAll('a'), { type: 'mute', muted: true });
  const s = reducer(muted, { type: 'reset' });
  assert.equal(s.muted, true);
  assert.equal(s.round, 1);
  assert.equal(s.leader, null);
  assert.equal(s.review, null);
});

test('start mengosongkan permainan sebelumnya', () => {
  const s = reducer(playAll('a'), { type: 'start', leader: { name: 'Sari', avatar: 'lia' } });
  assert.equal(s.round, 1);
  assert.equal(s.choices.length, 0);
  assert.equal(s.leader?.name, 'Sari');
});
