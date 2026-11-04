/** Today's date as the server's filters read it, yyyy-mm-dd, in the phone's own time zone (not UTC, which can be a day off in the evening). */
export function localDateISO(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
