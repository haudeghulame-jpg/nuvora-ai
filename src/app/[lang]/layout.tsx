import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDirection, isLocale, locales } from "../../i18n/config";
import { getMessages } from "../../i18n/dictionaries";

type LangParams = Promise<{ lang: string }>;

// Only /ar, /fr and /en exist; any other first segment is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: LangParams;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return {};
  }
  const messages = await getMessages(lang);
  return {
    title: messages.meta.title,
    description: messages.meta.description,
  };
}

// Root layout: sets the language and the text direction (right to left for
// Arabic, left to right for French and English) on the page itself.
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: LangParams;
}>) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  return (
    <html lang={lang} dir={getDirection(lang)}>
      <body>{children}</body>
    </html>
  );
}
