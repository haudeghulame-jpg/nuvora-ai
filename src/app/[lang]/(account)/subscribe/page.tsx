import { notFound } from "next/navigation";
import { SubscribeFlow } from "../../../../components/account/subscribe-flow";
import { isLocale } from "../../../../i18n/config";
import { getMessages } from "../../../../i18n/dictionaries";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <SubscribeFlow lang={lang} messages={await getMessages(lang)} />;
}
