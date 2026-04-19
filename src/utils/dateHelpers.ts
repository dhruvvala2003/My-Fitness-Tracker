function pad(n: number) { return String(n).padStart(2, '0'); }

function localStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): string {
  return localStr(new Date());
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function daysDiff(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getCurrentMonthDays(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) =>
    `${year}-${pad(month + 1)}-${pad(i + 1)}`
  );
}

export function getPast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return localStr(d);
  });
}

export function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
}

export function getWeekRangeLabel(): string {
  const days = getPast7Days();
  const start = days[0];
  const end = days[6];
  const year = new Date().getFullYear();
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}, ${year}`;
}

export function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
