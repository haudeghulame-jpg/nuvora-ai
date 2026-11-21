import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "../../components/language-switcher";
import { isLocale } from "../../i18n/config";
import { getMessages } from "../../i18n/dictionaries";
import { localizePath } from "../../i18n/routing";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }
  const messages = await getMessages(lang);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-3xl font-semibold">{messages.meta.title}</h1>
      <p className="max-w-md text-base">{messages.home.tagline}</p>
      <p className="max-w-md text-sm text-neutral-600">
        {messages.home.prototypeNotice}
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href={localizePath("/login", lang)} className="underline">
          {messages.auth.login.title}
        </Link>
        <Link href={localizePath("/register", lang)} className="underline">
          {messages.auth.register.title}
        </Link>
      </nav>
      <LanguageSwitcher current={lang} label={messages.language.label} />
    </main>
  );
}
