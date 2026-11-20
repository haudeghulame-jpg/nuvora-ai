// Supported languages and their text direction.
// Arabic is the default language and is written right to left.
export const locales = ["ar", "fr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

// Remembers the language the visitor last chose.
export const localeCookieName = "NEXT_LOCALE";

// Each language written in itself, so a reader can always find their own.
export const localeLabels: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
};

export type Direction = "rtl" | "ltr";

const directions: Record<Locale, Direction> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): Direction {
  return directions[locale];
}
