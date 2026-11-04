import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../api/client.ts';
import { byPerson, checkInBody, checkOutBody, clock12, describeTeamError, fullName, nextSteps, nowTime, presence, tally, type Attendance, type Staff } from './logic.ts';

const staff = (id: string, o: Partial<Staff> = {}): Staff => ({ id, first_name: 'A', last_name: id, phone: '', designation_name: '', department_name: '', branch_name: '', is_active: true, ...o });
const att = (employee: string, o: Partial<Attendance> = {}): Attendance => ({ id: `a-${employee}`, employee, date: '2026-11-04', status: 'PRESENT', check_in: '09:00:00', check_out: null, ...o });

test('where a person stands today', () => {
  assert.equal(presence(undefined), 'none');
  assert.equal(presence(att('x')), 'in');
  assert.equal(presence(att('x', { check_out: '17:00:00' })), 'out');
  assert.equal(presence(att('x', { status: 'ABSENT' })), 'absent');
  assert.equal(presence(att('x', { status: 'LEAVE' })), 'leave');
  assert.equal(presence(att('x', { status: 'HALF_DAY' })), 'half');
});

test('the later check-in wins when a person has two records', () => {
  const m = byPerson([att('x', { id: '1', check_in: '09:00:00' }), att('x', { id: '2', check_in: '13:00:00' })]);
  assert.equal(m.get('x')?.id, '2');
});

test('the day across active staff; people who left are not counted', () => {
  const people = [staff('1'), staff('2'), staff('3'), staff('4'), staff('5'), staff('6', { is_active: false })];
  const today = byPerson([att('1'), att('2', { check_out: '17:00:00' }), att('3', { status: 'ABSENT' }), att('4', { status: 'LEAVE' })]);
  assert.deepEqual(tally(people, today), { total: 5, in: 1, out: 1, absent: 1, leave: 1, none: 1 });
});

test('what can be done next follows where the person stands and the permission', () => {
  const may = ['hrm.attendance'];
  assert.deepEqual(nextSteps('none', may), { checkIn: true, absent: true, checkOut: false });
  assert.deepEqual(nextSteps('in', may), { checkIn: false, absent: false, checkOut: true });
  assert.deepEqual(nextSteps('out', may), { checkIn: false, absent: false, checkOut: false });
  assert.deepEqual(nextSteps('absent', may), { checkIn: true, absent: false, checkOut: false });
  assert.deepEqual(nextSteps('none', ['hrm.view']), { checkIn: false, absent: false, checkOut: false });
});

test('times in words, and the phone clock as the server time field', () => {
  assert.equal(clock12('09:05:00'), '9:05 am');
  assert.equal(clock12('17:30:00.123'), '5:30 pm');
  assert.equal(clock12('00:10:00'), '12:10 am');
  assert.equal(clock12('12:00:00'), '12:00 pm');
  assert.equal(clock12(null), '');
  assert.equal(nowTime(new Date(2026, 10, 4, 7, 5, 9)), '07:05:09');
});

test('the bodies carry the phone date and clock, and absent only when asked', () => {
  const now = new Date(2026, 10, 4, 9, 5, 0);
  assert.deepEqual(checkInBody('e1', { now }), { employee_id: 'e1', date: '2026-11-04', check_in: '09:05:00' });
  assert.deepEqual(checkInBody('e1', { now, absent: true }), { employee_id: 'e1', date: '2026-11-04', check_in: '09:05:00', status: 'ABSENT' });
  assert.deepEqual(checkOutBody('e1', new Date(2026, 10, 4, 17, 30, 0)), { employee_id: 'e1', date: '2026-11-04', check_out: '17:30:00' });
  assert.equal(fullName({ first_name: 'Karim', last_name: 'Mia' }), 'Karim Mia');
});

test('plain words for refusals', () => {
  assert.match(describeTeamError(new ApiError(404, 'NOT_FOUND', 'x')), /no check-in today/);
  assert.match(describeTeamError(new ApiError(0, 'NETWORK_ERROR', 'x')), /No connection/);
  assert.equal(describeTeamError(new ApiError(500, 'NEW', 'raw')), 'raw');
});
