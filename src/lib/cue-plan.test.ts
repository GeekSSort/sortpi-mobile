import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cuePlan, type Cue } from './cue-plan.ts';

const CUES: Cue[] = ['tap', 'added', 'found', 'again', 'missing', 'success', 'warning'];

test('silent does nothing, for every cue', () => {
  for (const cue of CUES) assert.deepEqual(cuePlan('silent', cue), { sound: null, vibrate: null });
});

test('vibration only vibrates, for every cue', () => {
  for (const cue of CUES) {
    const plan = cuePlan('vibration', cue);
    assert.equal(plan.sound, null, cue);
    assert.ok(plan.vibrate !== null, cue);
  }
});

test('sound plays a sound for every cue except a plain tap, which keeps its tiny vibration', () => {
  for (const cue of CUES.filter((c) => c !== 'tap')) {
    const plan = cuePlan('sound', cue);
    assert.ok(plan.sound !== null, cue);
    assert.equal(plan.vibrate, null, cue);
  }
  assert.deepEqual(cuePlan('sound', 'tap'), { sound: null, vibrate: 8 });
});

test('a repeat scan, a missing code, a finished payment and a new item do not sound alike', () => {
  const names = (['added', 'again', 'missing', 'success'] as Cue[]).map((c) => cuePlan('sound', c).sound);
  assert.equal(new Set(names).size, 4);
});

test('a repeat scan does not vibrate like a new item or a miss', () => {
  const v = (c: Cue) => JSON.stringify(cuePlan('vibration', c).vibrate);
  assert.notEqual(v('again'), v('found'));
  assert.notEqual(v('again'), v('missing'));
});
