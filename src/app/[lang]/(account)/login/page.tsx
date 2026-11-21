import { notFound } from "next/navigation";
import { LoginForm } from "../../../../components/account/login-form";
import { isLocale } from "../../../../i18n/config";
import { getMessages } from "../../../../i18n/dictionaries";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <LoginForm lang={lang} messages={await getMessages(lang)} />;
}
