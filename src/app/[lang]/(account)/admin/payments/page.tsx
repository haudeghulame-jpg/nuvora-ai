import { notFound } from "next/navigation";
import { AdminPayments } from "../../../../../components/account/admin-payments";
import { isLocale } from "../../../../../i18n/config";
import { getMessages } from "../../../../../i18n/dictionaries";

export default async function AdminPaymentsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <AdminPayments lang={lang} messages={await getMessages(lang)} />;
}
