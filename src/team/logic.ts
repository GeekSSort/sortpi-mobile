import { ApiError } from '../api/client.ts';
import { localDateISO } from '../lib/dates.ts';

export type Staff = { id: string; first_name: string; last_name: string; phone: string; designation_name: string; department_name: string; branch_name: string; is_active: boolean };
export type Attendance = { id: string; employee: string; date: string; status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY'; check_in: string | null; check_out: string | null };

export type Presence = 'none' | 'in' | 'out' | 'absent' | 'leave' | 'half';

export const fullName = (s: { first_name: string; last_name: string }): string => `${s.first_name} ${s.last_name}`.trim();

/** Where a person stands today: not marked yet, at work, gone home, absent, on leave, or a half day. */
export function presence(a: Attendance | undefined): Presence {
  if (!a) return 'none';
  if (a.status === 'ABSENT') return 'absent';
  if (a.status === 'LEAVE') return 'leave';
  if (a.status === 'HALF_DAY') return 'half';
  return a.check_out ? 'out' : 'in';
}

/** Today's records by person. If a person somehow has two, the later check-in wins. */
export function byPerson(rows: Attendance[]): Map<string, Attendance> {
  const out = new Map<string, Attendance>();
  for (const r of rows) {
    const had = out.get(r.employee);
    if (!had || (r.check_in ?? '') > (had.check_in ?? '')) out.set(r.employee, r);
  }
  return out;
}

export type Tally = { total: number; in: number; out: number; absent: number; leave: number; none: number };
/** How the day looks across the active staff. A half day counts as at work. */
export function tally(staff: Staff[], today: Map<string, Attendance>): Tally {
  const t: Tally = { total: 0, in: 0, out: 0, absent: 0, leave: 0, none: 0 };
  for (const s of staff.filter((x) => x.is_active)) {
    t.total += 1;
    const p = presence(today.get(s.id));
    if (p === 'in' || p === 'half') t.in += 1;
    else if (p === 'out') t.out += 1;
    else if (p === 'absent') t.absent += 1;
    else if (p === 'leave') t.leave += 1;
    else t.none += 1;
  }
  return t;
}

/** What a person may do next for someone: mark them in or absent while unmarked, mark them out while at work. */
export function nextSteps(p: Presence, perms: string[] | undefined) {
  const may = !!perms?.includes('hrm.attendance');
  return { checkIn: may && (p === 'none' || p === 'absent' || p === 'leave'), absent: may && p === 'none', checkOut: may && (p === 'in' || p === 'half') };
}

/** "9:05 am" from a server time ("09:05:00" or with fractions). */
export function clock12(time: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`;
}

/** The phone's own clock as the server's time field. The server stamps UTC when none is sent (6 hours off in Dhaka), so the phone always sends one. */
export function nowTime(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
}

export const checkInBody = (employeeId: string, o: { absent?: boolean; now?: Date } = {}) => ({ employee_id: employeeId, date: localDateISO(o.now ?? new Date()), check_in: nowTime(o.now), ...(o.absent ? { status: 'ABSENT' as const } : {}) });
export const checkOutBody = (employeeId: string, now: Date = new Date()) => ({ employee_id: employeeId, date: localDateISO(now), check_out: nowTime(now) });

export function describeTeamError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NOT_FOUND':
      return 'This person has no check-in today, or was not found.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Check it and try again.';
    default:
      return e.message || 'Could not save this.';
  }
}
