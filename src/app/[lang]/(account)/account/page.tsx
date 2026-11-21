import { notFound } from "next/navigation";
import { AccountView } from "../../../../components/account/account-view";
import { isLocale } from "../../../../i18n/config";
import { getMessages } from "../../../../i18n/dictionaries";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <AccountView lang={lang} messages={await getMessages(lang)} />;
}
