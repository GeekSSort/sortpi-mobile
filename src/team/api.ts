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

export type Lookup = { id: string; name: string };
/** One employee with the ids behind the names (checked live). Salary fields are present only for `hrm.view_salary`. */
export type Employee = { id: string; first_name: string; last_name: string; email: string; phone: string; department: string; department_name: string; designation: string; designation_name: string; branch: string; branch_name: string; date_of_joining: string; basic_salary?: string };

export const getEmployee = (id: string) => api.get<Employee>(`/hrm/employees/${id}/`);
export const listDepartments = (search?: string): Promise<Lookup[]> => api.get<Lookup[]>('/hrm/departments/', { query: { limit: 100, search } });
/** Job titles belong to a department; the server list is filtered here so the sheet shows only that department's. */
export const listDesignations = async (search?: string, departmentId?: string): Promise<Lookup[]> => {
  const rows = await api.get<(Lookup & { department: string })[]>('/hrm/designations/', { query: { limit: 100, search } });
  return departmentId ? rows.filter((r) => r.department === departmentId) : rows;
};
/** Needs `hrm.create`. */
export const createEmployee = (body: unknown) => api.post<{ id: string }>('/hrm/employees/', body);
/** Needs `hrm.update`. */
export const updateEmployee = (id: string, body: unknown) => api.patch<Employee>(`/hrm/employees/${id}/`, body);
/** Removes the person from the team (checked live: they are gone from every list). Needs `hrm.delete`. */
export const deleteEmployee = (id: string) => api.delete<void>(`/hrm/employees/${id}/`);
