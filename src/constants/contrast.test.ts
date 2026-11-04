import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contrast, over } from './contrast.ts';
import { Colors } from './palette.ts';

const NORMAL_TEXT = 4.5;

for (const mode of ['light', 'dark'] as const) {
  const c = Colors[mode];
  const solid = (k: string) => over((c as Record<string, string>)[k]!, c.card);
  test(`${mode}: text and its backgrounds keep readable contrast (WCAG AA 4.5 to 1)`, () => {
    const pairs: [string, string][] = [
      ['text', 'canvas'], ['text', 'card'], ['textSecondary', 'card'], ['textSecondary', 'canvas'], ['textMuted', 'card'], ['textMuted', 'canvas'],
      ['brandText', 'card'], ['brandText', 'brandSoft'], ['onBrand', 'brand'], ['onBrand', 'go'],
      ['success', 'successSoft'], ['danger', 'dangerSoft'], ['warning', 'warningSoft'], ['danger', 'card'], ['positive', 'card'], ['success', 'card'], ['warning', 'card'],
      ['textSecondary', 'successSoft'], ['textSecondary', 'dangerSoft'], ['textSecondary', 'warningSoft'],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(solid(fg), solid(bg));
      assert.ok(ratio >= NORMAL_TEXT, `${mode}: ${fg} on ${bg} is ${ratio.toFixed(2)}, below ${NORMAL_TEXT}`);
    }
  });
}

import { PayColors } from './palette.ts';

for (const mode of ['light', 'dark'] as const) {
  for (const [name, c] of Object.entries(PayColors)) {
    test(`${name} payment tile is readable in ${mode} mode`, () => {
      assert.ok(contrast(c.ink[mode], Colors[mode].card) >= 4.5, `${name} ink on card`);
      assert.ok(contrast('#ffffff', c.fill) >= 4.5, `white on ${name} fill`);
    });
  }
}
