/** Returns the date (YYYY-MM-DD, UTC) of the most recent Sunday on/before `date`. */
export function mostRecentSunday(date: Date = new Date()): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return toDateString(d);
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateLong(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
