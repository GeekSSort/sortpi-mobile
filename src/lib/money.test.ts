import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addMoney, compareMoney, formatBDT, groupBD, mulMoney, subMoney } from './money.ts';

test('Bangladeshi grouping', () => {
  assert.equal(groupBD('184326'), '1,84,326');
  assert.equal(groupBD('100000'), '1,00,000');
  assert.equal(groupBD('999'), '999');
  assert.equal(groupBD('12345678'), '1,23,45,678');
});

test('format keeps the paisa and rounds half up', () => {
  assert.equal(formatBDT('184326.5'), '৳1,84,326.50');
  assert.equal(formatBDT('0.125'), '৳0.13');
  assert.equal(formatBDT('2.675'), '৳2.68'); // a float would give 2.67
  assert.equal(formatBDT('-1500'), '-৳1,500.00');
  assert.equal(formatBDT(null), '৳0.00');
  assert.equal(formatBDT('45.1234', { dp: 4, symbol: false }), '45.1234');
});

test('arithmetic never touches floats', () => {
  assert.equal(addMoney('0.1', '0.2'), '0.3');
  assert.equal(subMoney('300', '299.99'), '0.01');
  assert.equal(mulMoney('19.99', '3.000'), '59.97');
  assert.equal(compareMoney('10.00', '9.9999') > 0, true);
});
