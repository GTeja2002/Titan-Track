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

/** Returns the calendar date `deltaDays` away from `dateStr` (a 'YYYY-MM-DD'
 * string), as a local 'YYYY-MM-DD' string.
 *
 * Do NOT do this with `new Date(dateStr + 'T00:00:00')` + `.toISOString()`:
 * that parses as LOCAL midnight but formats as UTC, so anywhere east of UTC
 * (e.g. IST, UTC+5:30) local midnight is still the previous day in UTC and
 * every result comes back one day early.
 */
export function shiftDateString(dateStr, deltaDays) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + deltaDays);
  return getLocalDateString(d);
}
