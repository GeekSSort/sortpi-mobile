import assert from 'node:assert/strict';
import { test } from 'node:test';

import { employeeBody, validateEmployee, type EmployeeForm } from './employee.ts';

const ok: EmployeeForm = { first: ' Rahim ', last: 'Uddin', phone: '01711111111', email: 'rahim@example.com', departmentId: 'd', designationId: 'g', branchId: 'b', joined: '2026-11-08', salary: '' };

test('a complete form has no errors', () => {
  assert.deepEqual(validateEmployee(ok), {});
});

test('each missing or wrong field is named', () => {
  const e = validateEmployee({ ...ok, first: '', last: ' ', email: 'nope', departmentId: '', designationId: '', branchId: '', joined: '8/11/2026', salary: 'abc' });
  assert.deepEqual(Object.keys(e).sort(), ['branchId', 'departmentId', 'designationId', 'email', 'first', 'joined', 'last', 'salary']);
  assert.ok(validateEmployee({ ...ok, joined: '2026-13-45' }).joined);
});

test('the body uses the server field names and trims', () => {
  const b = employeeBody(ok, false);
  assert.equal(b.first_name, 'Rahim');
  assert.equal(b.department_id, 'd');
  assert.equal('basic_salary' in b, false);
  assert.equal(employeeBody({ ...ok, salary: '15000' }, true).basic_salary, '15000');
  assert.equal('basic_salary' in employeeBody({ ...ok, salary: '15000' }, false), false);
});
