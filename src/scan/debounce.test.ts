import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextRead, type LastRead } from './debounce.ts';

const run = (reads: [string, number][]) => {
  let last: LastRead = { code: '', at: 0 };
  return reads.map(([code, t]) => {
    const r = nextRead(last, code, t);
    last = r.last;
    return r.accept;
  });
};

test('a code held in view adds once, however long', () => {
  const held: [string, number][] = Array.from({ length: 30 }, (_, i) => ['A', 1000 + i * 100]); // 3 seconds of reads
  const accepted = run(held).filter(Boolean).length;
  assert.equal(accepted, 1);
});

test('the same code counts again after it left the view', () => {
  assert.deepEqual(run([['A', 1000], ['A', 1100], ['A', 3000]]), [true, false, true]);
});

test('a different code counts straight away', () => {
  assert.deepEqual(run([['A', 1000], ['B', 1100], ['A', 1200]]), [true, true, true]);
});

test('empty reads are ignored', () => {
  assert.deepEqual(run([['', 1000]]), [false]);
});
