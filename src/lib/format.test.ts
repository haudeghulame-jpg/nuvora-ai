import { describe, expect, it } from "vitest";
import { locales } from "../i18n/config";
import { formatDate, formatDateTime } from "./format";

const date = new Date("2026-12-31T09:05:00.000Z");
const easternDigits = /[٠-٩۰-۹]/;

describe("date formatting", () => {
  it("uses Western digits in every language, Arabic included", () => {
    for (const locale of locales) {
      expect(easternDigits.test(formatDate(date, locale)), locale).toBe(false);
      expect(easternDigits.test(formatDateTime(date, locale)), locale).toBe(
        false,
      );
      expect(formatDate(date, locale)).toMatch(/2026/);
    }
  });

  it("shows the time in 24-hour form", () => {
    expect(formatDateTime(date, "en")).toMatch(/09:05/);
  });
});
