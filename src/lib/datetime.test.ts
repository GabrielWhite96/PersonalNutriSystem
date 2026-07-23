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

  it("builds daily bounds using the Brazil calendar day", () => {
    const bounds = getLocalDayBounds("2026-07-03");

    expect(getLocalDateKey(bounds.start)).toBe("2026-07-03");
    expect(getLocalDateKey(bounds.end)).toBe("2026-07-03");
    // Brazil is UTC-3 (or -2 in DST): midnight BRT = 03:00 UTC
    expect(bounds.startIso).toBe("2026-07-03T03:00:00.000Z");
    expect(bounds.endIso).toBe("2026-07-04T02:59:59.999Z");
  });

  it("keeps meals after 21h BRT on the same local day", () => {
    // 21:30 BRT on July 16 = 00:30 UTC on July 17
    const lateMeal = "2026-07-17T00:30:00.000Z";

    expect(getLocalDateKey(lateMeal)).toBe("2026-07-16");

    const july16 = getLocalDayBounds("2026-07-16");
    const july17 = getLocalDayBounds("2026-07-17");

    expect(lateMeal >= july16.startIso && lateMeal <= july16.endIso).toBe(true);
    expect(lateMeal >= july17.startIso && lateMeal <= july17.endIso).toBe(false);
  });

  it("classifies the McDonald's dinner timestamp as July 16 in Brazil", () => {
    const formats = [
      "2026-07-17T00:55:00.000Z",
      "2026-07-17T00:55:00+00:00",
      "2026-07-17 00:55:00+00",
      "2026-07-17 00:55:00+00:00",
    ];

    for (const eatenAt of formats) {
      expect(getLocalDateKey(eatenAt)).toBe("2026-07-16");
    }
  });

  it("formats Brazil wall-clock time from UTC timestamps", () => {
    const date = new Date("2026-07-03T11:30:00.000Z"); // 08:30 BRT

    expect(getLocalDateKey(date)).toBe("2026-07-03");
    expect(toDateTimeLocalInputValue(date)).toBe("2026-07-03T08:30");
  });
});
