import { notFound } from "next/navigation";
import { ForgotForm } from "../../../../components/account/forgot-form";
import { isLocale } from "../../../../i18n/config";
import { getMessages } from "../../../../i18n/dictionaries";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ForgotForm lang={lang} messages={await getMessages(lang)} />;
}
