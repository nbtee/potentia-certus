/**
 * Returns the first day of the month for a given date as YYYY-MM-DD.
 */
export function getMonthStart(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Returns the last day of the month for a given date as YYYY-MM-DD.
 */
export function getMonthEnd(date: Date): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, '0');
  const d = String(last.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a date into "MMM YYYY" (e.g. "Mar 2026").
 */
export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Navigate forward or backward by N months from a Date.
 * Returns a new Date on the 1st of the resulting month.
 */
export function navigateMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Returns a Date representing the 1st of the current month.
 */
export function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
