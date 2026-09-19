/* ---------------- lib/date.js ----------------
 * `new Date().toISOString().split('T')[0]` gives the UTC calendar date, not
 * the user's local one. For anyone east of UTC (e.g. IST, UTC+5:30), the
 * first several hours after local midnight still report *yesterday's* UTC
 * date — which is wrong for a daily-log app where "today" needs to match
 * the user's actual day. Use this everywhere "today" or "this date" is
 * needed instead of toISOString().
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
