export type GuideStep = 1 | 2 | 3 | 'done';

/** Which tip the first-sale guide shows, from where the person is in making a sale. */
export function guideStep(o: { mode: 'scan' | 'pay' | 'done'; cartEmpty: boolean }): GuideStep {
  if (o.mode === 'done') return 'done';
  if (o.mode === 'pay') return 3;
  return o.cartEmpty ? 1 : 2;
}
