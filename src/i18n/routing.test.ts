import { describe, expect, it } from "vitest";
import {
  getLocaleFromPathname,
  localizePath,
  resolveLocaleRedirect,
  stripLocale,
} from "./routing";

describe("getLocaleFromPathname", () => {
  it("reads the language prefix", () => {
    expect(getLocaleFromPathname("/ar")).toBe("ar");
    expect(getLocaleFromPathname("/fr/study")).toBe("fr");
    expect(getLocaleFromPathname("/en/a/b")).toBe("en");
  });

  it("returns null without a supported prefix", () => {
    expect(getLocaleFromPathname("/")).toBeNull();
    expect(getLocaleFromPathname("/study")).toBeNull();
    expect(getLocaleFromPathname("/de/study")).toBeNull();
    expect(getLocaleFromPathname("/arx")).toBeNull();
  });
});

describe("stripLocale", () => {
  it("removes the language prefix", () => {
    expect(stripLocale("/fr/study")).toBe("/study");
    expect(stripLocale("/ar/a/b")).toBe("/a/b");
  });

  it("maps a bare language path to the root", () => {
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/en/")).toBe("/");
  });

  it("leaves paths without a prefix unchanged", () => {
    expect(stripLocale("/study")).toBe("/study");
    expect(stripLocale("/")).toBe("/");
    expect(stripLocale("")).toBe("/");
  });
});

describe("localizePath", () => {
  it("keeps the same page when switching language", () => {
    expect(localizePath("/ar/study", "fr")).toBe("/fr/study");
    expect(localizePath("/fr/study", "en")).toBe("/en/study");
  });

  it("switches the home page of one language to another", () => {
    expect(localizePath("/ar", "en")).toBe("/en");
    expect(localizePath("/fr/", "ar")).toBe("/ar");
  });

  it("adds a prefix to an unprefixed path", () => {
    expect(localizePath("/study", "ar")).toBe("/ar/study");
    expect(localizePath("/", "fr")).toBe("/fr");
  });
});

describe("resolveLocaleRedirect", () => {
  it("sends unprefixed paths to Arabic by default", () => {
    expect(resolveLocaleRedirect("/", undefined)).toBe("/ar");
    expect(resolveLocaleRedirect("/study", undefined)).toBe("/ar/study");
  });

  it("uses the remembered language when it is valid", () => {
    expect(resolveLocaleRedirect("/", "fr")).toBe("/fr");
    expect(resolveLocaleRedirect("/study", "en")).toBe("/en/study");
  });

  it("falls back to Arabic when the remembered language is invalid", () => {
    expect(resolveLocaleRedirect("/", "de")).toBe("/ar");
    expect(resolveLocaleRedirect("/", "")).toBe("/ar");
  });

  it("does not redirect paths that already have a language", () => {
    expect(resolveLocaleRedirect("/fr", "en")).toBeNull();
    expect(resolveLocaleRedirect("/ar/study", undefined)).toBeNull();
  });

  it("does not treat a lookalike segment as a language", () => {
    expect(resolveLocaleRedirect("/arx", undefined)).toBe("/ar/arx");
  });
});
