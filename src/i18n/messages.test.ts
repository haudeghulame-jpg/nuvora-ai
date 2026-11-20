import { describe, expect, it } from "vitest";
import ar from "../messages/ar.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

type Tree = { [key: string]: string | Tree };

const files: Record<string, Tree> = { ar, fr, en };

// "home.tagline" style keys for every text in a translation file.
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[path] = value;
    } else {
      Object.assign(result, flatten(value, path));
    }
  }
  return result;
}

describe("translation files", () => {
  const flat = Object.fromEntries(
    Object.entries(files).map(([locale, tree]) => [locale, flatten(tree)]),
  );

  it("have exactly the same keys in Arabic, French and English", () => {
    const arabicKeys = Object.keys(flat.ar).sort();
    expect(Object.keys(flat.fr).sort()).toEqual(arabicKeys);
    expect(Object.keys(flat.en).sort()).toEqual(arabicKeys);
  });

  it("contain no empty texts", () => {
    for (const [locale, texts] of Object.entries(flat)) {
      for (const [key, text] of Object.entries(texts)) {
        expect(text.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("use Western digits (0-9) only, including in Arabic", () => {
    // Arabic-Indic digits U+0660-0669 and Eastern Arabic-Indic U+06F0-06F9.
    const easternDigits = /[٠-٩۰-۹]/;
    for (const [locale, texts] of Object.entries(flat)) {
      for (const [key, text] of Object.entries(texts)) {
        expect(easternDigits.test(text), `${locale}:${key}`).toBe(false);
      }
    }
  });

  it("write the Arabic tagline in Arabic letters", () => {
    expect(/[؀-ۿ]/.test(flat.ar["home.tagline"])).toBe(true);
  });
});
