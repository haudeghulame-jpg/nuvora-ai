"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "../i18n/config";
import { localizePath } from "../i18n/routing";

// Links to the same page in each language. Works without extra JavaScript
// logic: each language is a real link, and the current one is marked.
export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {locales.map((locale) => {
          const isCurrent = locale === current;
          return (
            <li key={locale}>
              <Link
                href={localizePath(pathname, locale)}
                lang={locale}
                hrefLang={locale}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:border-neutral-900"
                }
              >
                {localeLabels[locale]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
