import { defaultLocale, isLocale, type Locale } from "./config";

// Pure helpers for language-prefixed paths such as /ar, /fr/study, /en.

export function getLocaleFromPathname(pathname: string): Locale | null {
  const firstSegment = pathname.split("/")[1];
  return isLocale(firstSegment) ? firstSegment : null;
}

// "/fr/study" -> "/study", "/fr" -> "/", "/study" -> "/study".
export function stripLocale(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) {
    return pathname === "" ? "/" : pathname;
  }
  const rest = pathname.slice(locale.length + 1);
  return rest === "" ? "/" : rest;
}

// Same page, different language: "/fr/study" + "en" -> "/en/study".
export function localizePath(pathname: string, locale: Locale): string {
  const rest = stripLocale(pathname);
  return rest === "/" ? `/${locale}` : `/${locale}${rest}`;
}

// Where a request without a language prefix should be sent.
// Uses the remembered language when valid, otherwise Arabic (the default).
// Returns null when the path already has a supported language prefix.
export function resolveLocaleRedirect(
  pathname: string,
  preferred: string | undefined,
): string | null {
  if (getLocaleFromPathname(pathname)) {
    return null;
  }
  const locale = isLocale(preferred) ? preferred : defaultLocale;
  return localizePath(pathname, locale);
}
