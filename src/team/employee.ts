import { isAmountText } from '../customers/logic.ts';

export type EmployeeForm = { first: string; last: string; phone: string; email: string; departmentId: string; designationId: string; branchId: string; joined: string; salary: string };
export type EmployeeErrors = Partial<Record<keyof EmployeeForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What is missing or wrong, in the words the screen shows. The server needs a name, an email, a department, a designation, a branch and a joining date. */
export function validateEmployee(f: EmployeeForm): EmployeeErrors {
  const e: EmployeeErrors = {};
  if (!f.first.trim()) e.first = 'Enter the first name.';
  if (!f.last.trim()) e.last = 'Enter the last name.';
  if (!EMAIL.test(f.email.trim())) e.email = 'Enter an email like name@example.com.';
  if (!f.departmentId) e.departmentId = 'Choose a department.';
  if (!f.designationId) e.designationId = 'Choose a job title.';
  if (!f.branchId) e.branchId = 'Choose a branch.';
  if (!DAY.test(f.joined.trim()) || Number.isNaN(Date.parse(f.joined.trim()))) e.joined = 'Enter the date as 2026-11-08.';
  if (f.salary.trim() && !isAmountText(f.salary)) e.salary = 'Enter an amount like 15000.';
  return e;
}

/** Body for POST and PATCH /hrm/employees/ (checked live: the links are `department_id`, `designation_id` and `branch_id`). The salary is sent only when the person may set it and typed one. */
export function employeeBody(f: EmployeeForm, mayPay: boolean) {
  return {
    first_name: f.first.trim(),
    last_name: f.last.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    department_id: f.departmentId,
    designation_id: f.designationId,
    branch_id: f.branchId,
    date_of_joining: f.joined.trim(),
    ...(mayPay && f.salary.trim() ? { basic_salary: f.salary.trim() } : {}),
  };
}
