import type { Locale } from "../i18n/config";

// Dates are always written with Western digits (0-9), also in Arabic. The
// "-u-nu-latn" part forces Latin digits for Arabic; without it browsers write
// Arabic-Indic digits.
const intlLocale: Record<Locale, string> = {
  ar: "ar-u-nu-latn",
  fr: "fr-FR",
  en: "en-GB",
};

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}
