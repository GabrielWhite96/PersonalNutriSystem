import { endOfDay, format, parse, parseISO, startOfDay, subDays, type FormatOptions } from "date-fns";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) return value;
  return DATE_KEY_RE.test(value) ? parse(value, "yyyy-MM-dd", new Date()) : parseISO(value);
}

export function formatDateValue(
  value: string | Date,
  pattern: string,
  options?: FormatOptions,
): string {
  return format(parseDateValue(value), pattern, options);
}

export function getLocalDateKey(value: string | Date): string {
  return formatDateValue(value, "yyyy-MM-dd");
}

export function getTodayDateKey(): string {
  return getLocalDateKey(new Date());
}

export function getLocalDayBounds(dateKey: string) {
  const date = parseDateValue(dateKey);
  const start = startOfDay(date);
  const end = endOfDay(date);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getPastDaysBounds(days: number) {
  const safeDays = Math.max(1, days);
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, safeDays - 1));
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function toDateTimeLocalInputValue(value: string | Date): string {
  return formatDateValue(value, "yyyy-MM-dd'T'HH:mm");
}

export function fromDateTimeLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}
