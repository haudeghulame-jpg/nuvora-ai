import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  getDirection,
  isLocale,
  localeLabels,
  locales,
} from "./config";

describe("language configuration", () => {
  it("supports Arabic, French and English", () => {
    expect([...locales]).toEqual(["ar", "fr", "en"]);
  });

  it("uses Arabic as the default language", () => {
    expect(defaultLocale).toBe("ar");
  });

  it("writes Arabic right to left and French and English left to right", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("en")).toBe("ltr");
  });

  it("accepts only supported languages", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("AR")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("has a label for every language", () => {
    for (const locale of locales) {
      expect(localeLabels[locale].length).toBeGreaterThan(0);
    }
  });
});
