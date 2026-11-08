import assert from 'node:assert/strict';
import { test } from 'node:test';

import { accuracy, evaluate, matcherAnswer, precision } from './eval.ts';
import { TOOLS } from './plan.ts';
import { TESTSET } from './testset.ts';
import { HOLDOUT } from './testset-holdout.ts';

test('the test sets are well formed: known lookups, no repeated question, every kind of question present', () => {
  const ids = new Set<string>([...TOOLS.map((t) => t.id), 'none']);
  const seen = new Set<string>();
  for (const w of [...TESTSET, ...HOLDOUT]) {
    assert.ok(ids.has(w.tool), `${w.q}: unknown lookup ${w.tool}`);
    assert.ok(!seen.has(w.q), `question written twice: ${w.q}`);
    seen.add(w.q);
  }
  for (const layer of ['clean', 'banglish', 'noisy', 'command', 'advice', 'action', 'trade'] as const) assert.ok(TESTSET.some((w) => w.layer === layer), layer);
  assert.ok(TESTSET.length >= 130 && HOLDOUT.length >= 50);
});

// These are floors, not goals: the word matcher must not get worse. Raise them when it gets better (and write a NEW held-out set when the old one has been tuned on).
test('the word matcher keeps its score on the tuned set', () => {
  const r = evaluate(TESTSET, matcherAnswer);
  assert.ok(accuracy(r.overall) >= 0.97, `accuracy ${accuracy(r.overall)}`);
  assert.ok(precision(r.overall) >= 0.99, `precision ${precision(r.overall)}`);
});

test('the word matcher keeps its score on phrasing it was not tuned on', () => {
  const r = evaluate(HOLDOUT, matcherAnswer);
  assert.ok(accuracy(r.overall) >= 0.7, `accuracy ${accuracy(r.overall)}`);
  assert.ok(precision(r.overall) >= 0.83, `precision ${precision(r.overall)}`);
});

test('advice and actions never become a lookup', () => {
  const r = evaluate([...TESTSET, ...HOLDOUT].filter((w) => w.layer === 'action'), matcherAnswer);
  const answered = r.failures.filter((f) => f.verdict === 'wrong');
  // the held-out set has two known misses ("baki khata e tolo", "stock ta update koro"); the tuned set has none
  assert.ok(answered.length <= 2, answered.map((f) => f.case.q).join(' | '));
});
