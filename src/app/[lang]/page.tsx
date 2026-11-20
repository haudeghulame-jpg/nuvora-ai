import { notFound } from "next/navigation";
import { LanguageSwitcher } from "../../components/language-switcher";
import { isLocale } from "../../i18n/config";
import { getMessages } from "../../i18n/dictionaries";

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
      <LanguageSwitcher current={lang} label={messages.language.label} />
    </main>
  );
}
