import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCategoryRequest, buildUnitRequest, categoryProblem, defaultShortName, hasExactName, unitProblem } from './new-lookup.ts';

test('a category needs a name', () => {
  assert.match(categoryProblem('  ') ?? '', /name/);
  assert.equal(categoryProblem('Spices'), null);
  assert.deepEqual(buildCategoryRequest('  Spices '), { name: 'Spices' });
});

test('a unit needs a name and a short name of at most 10 characters', () => {
  assert.match(unitProblem({ name: '', shortName: 'kg', allowDecimal: true }) ?? '', /name for the unit/);
  assert.match(unitProblem({ name: 'Kilogram', shortName: '', allowDecimal: true }) ?? '', /short name/);
  assert.match(unitProblem({ name: 'Kilogram', shortName: 'abcdefghijk', allowDecimal: true }) ?? '', /at most 10/);
  assert.equal(unitProblem({ name: 'Kilogram', shortName: 'kg', allowDecimal: true }), null);
  assert.deepEqual(buildUnitRequest({ name: ' Kilogram ', shortName: ' kg ', allowDecimal: true }), { name: 'Kilogram', short_name: 'kg', allow_decimal: true });
});

test('the short name starts as the first 10 characters of the name', () => {
  assert.equal(defaultShortName(' Kilogram '), 'Kilogram');
  assert.equal(defaultShortName('Carton of twelve'), 'Carton of ');
});

test('an existing name is found ignoring case', () => {
  assert.equal(hasExactName([{ name: 'Piece' }], ' piece '), true);
  assert.equal(hasExactName([{ name: 'Piece' }], 'Kilogram'), false);
});
