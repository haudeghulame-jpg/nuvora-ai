import { notFound } from "next/navigation";
import { RegisterForm } from "../../../../components/account/register-form";
import { isLocale } from "../../../../i18n/config";
import { getMessages } from "../../../../i18n/dictionaries";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <RegisterForm lang={lang} messages={await getMessages(lang)} />;
}
