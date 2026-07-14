import { describe, expect, it } from "vitest";
import {
  fromDateTimeLocalInputValue,
  getLocalDateKey,
  getLocalDayBounds,
  toDateTimeLocalInputValue,
} from "@/lib/datetime";

describe("datetime helpers", () => {
  it("keeps local datetime-local values stable through ISO conversion", () => {
    const restoredIso = fromDateTimeLocalInputValue("2026-07-03T15:45");

    expect(toDateTimeLocalInputValue(restoredIso)).toBe("2026-07-03T15:45");
  });

  it("builds daily bounds using the local calendar day", () => {
    const bounds = getLocalDayBounds("2026-07-03");

    expect(getLocalDateKey(bounds.start)).toBe("2026-07-03");
    expect(getLocalDateKey(bounds.end)).toBe("2026-07-03");
  });

  it("formats local Date instances consistently", () => {
    const date = new Date(2026, 6, 3, 8, 30, 0);

    expect(getLocalDateKey(date)).toBe("2026-07-03");
    expect(toDateTimeLocalInputValue(date)).toBe("2026-07-03T08:30");
  });
});
