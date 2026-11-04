import { api } from '@/api/session';

import type { Attendance, Staff, checkInBody, checkOutBody } from './logic';

/** Everyone on the staff list (a shop's team fits one page of 200). Needs `hrm.view`. Salary fields are never read here. */
export const listStaff = () => api.get<Staff[]>('/hrm/employees/', { query: { limit: 200 } });
/** One day's attendance records. Needs `hrm.view`. */
export const attendanceOn = (date: string) => api.get<Attendance[]>('/hrm/attendance/', { query: { date_from: date, date_to: date, limit: 200 } });
/**
 * Marks a person in (or absent). Needs `hrm.attendance`. Checked live: repeating it returns the same record, and `date` is required.
 * The server stamps UTC clock time when no time is sent (6 hours off in Dhaka), so the body always carries the phone's own time.
 */
export const checkIn = (body: ReturnType<typeof checkInBody>) => api.post<Attendance>('/hrm/attendance/check-in/', body);
/** Marks a person out. Checked live: a second call moves the time, so the screen offers it only while they are in. */
export const checkOut = (body: ReturnType<typeof checkOutBody>) => api.post<Attendance>('/hrm/attendance/check-out/', body);
