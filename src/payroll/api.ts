import { api } from '@/api/session';

/** One person's wage for a period (OpenAPI `Payslip`). Money is text and absent without `hrm.view_salary`. */
export type Payslip = { id: string; employee_name: string; period_start: string; period_end: string; net_pay?: string; basic_salary?: string; allowances?: string; deductions?: string; is_paid: boolean; paid_at: string | null; payment_method?: string; voucher_no?: string };
export type PayrollRun = { id: string; period_start: string; period_end: string; status: string; total_amount?: string; posted_to_finance: boolean; payslips: Payslip[] };
export type PayMethod = 'CASH' | 'BANK' | 'MOBILE' | 'CHEQUE';

/** The months that have a run, as "YYYY-MM", newest first. Needs `hrm.view`. */
export const payrollMonths = async () => (await api.get<{ months: string[] }>('/hrm/payroll-runs/months/')).months;
/** The runs of one month ("YYYY-MM"), each with its payslips. */
export const payrollRuns = (month: string) => api.get<PayrollRun[]>('/hrm/payroll-runs/', { query: { month, limit: 100 } });
/** Settles one wage: writes the salary expense on the server. Refused on a payslip that is already paid. Needs `hrm.payroll`. */
export const payPayslip = (id: string, method: PayMethod) => api.post<Payslip>(`/hrm/payslips/${id}/pay/`, { payment_method: method });
/** Calculates a month's payslips for every active employee without paying them. Needs `hrm.payroll` and a head-office user. */
export const runPayroll = (b: { period_start: string; period_end: string }) => api.post<PayrollRun>('/hrm/payroll-runs/run/', { ...b, pay_now: false });
