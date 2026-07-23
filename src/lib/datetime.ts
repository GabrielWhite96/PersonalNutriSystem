import { format, parseISO, subDays, type FormatOptions } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** App calendar day is always Brazil time — avoids UTC shifting meals after 21h. */
export const APP_TIMEZONE = "America/Sao_Paulo";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (DATE_KEY_RE.test(value)) {
    return fromZonedTime(`${value}T00:00:00`, APP_TIMEZONE);
  }
  // PostgREST may return "2026-07-17 00:55:00+00" — normalize before parsing.
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return parseISO(value);
}

export function formatDateValue(
  value: string | Date,
  pattern: string,
  options?: FormatOptions,
): string {
  const date = parseDateValue(value);
  return format(toZonedTime(date, APP_TIMEZONE), pattern, options);
}

export function getLocalDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : parseDateValue(value);
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
}

export function getTodayDateKey(): string {
  return getLocalDateKey(new Date());
}

export function getLocalDayBounds(dateKey: string) {
  const start = fromZonedTime(`${dateKey}T00:00:00.000`, APP_TIMEZONE);
  const end = fromZonedTime(`${dateKey}T23:59:59.999`, APP_TIMEZONE);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getPastDaysBounds(days: number) {
  const safeDays = Math.max(1, days);
  const endKey = getTodayDateKey();
  const end = fromZonedTime(`${endKey}T23:59:59.999`, APP_TIMEZONE);
  const startKey = formatInTimeZone(
    subDays(fromZonedTime(`${endKey}T12:00:00`, APP_TIMEZONE), safeDays - 1),
    APP_TIMEZONE,
    "yyyy-MM-dd",
  );
  const start = fromZonedTime(`${startKey}T00:00:00.000`, APP_TIMEZONE);
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
  const normalized = value.length === 16 ? `${value}:00` : value;
  return fromZonedTime(normalized, APP_TIMEZONE).toISOString();
}

export function formatNowInAppTimezone(pattern = "yyyy-MM-dd HH:mm:ss xxx"): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, pattern);
}
