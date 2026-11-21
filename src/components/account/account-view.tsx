"use client";

import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/dictionaries";
import { localizePath } from "../../i18n/routing";
import { getProfilePlan } from "../../lib/accounts/profile";
import { ensureProfile, logout } from "../../lib/firebase/actions";
import { getFirebaseDb } from "../../lib/firebase/client";
import { formatDate } from "../../lib/format";
import {
  parsePaymentRequest,
  type PaymentRequestView,
} from "../../lib/payments/parse";
import { useAuth } from "./auth-provider";
import { UnavailableNotice } from "./unavailable-notice";

function RequestsList({
  uid,
  lang,
  messages,
}: {
  uid: string;
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.account;
  const [requests, setRequests] = useState<PaymentRequestView[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    // Only the user's own requests; the rules allow nothing else.
    return onSnapshot(
      query(collection(db, "paymentRequests"), where("userId", "==", uid)),
      (snapshot) => {
        const list: PaymentRequestView[] = [];
        snapshot.forEach((item) => {
          const parsed = parsePaymentRequest(
            item.id,
            item.data({ serverTimestamps: "estimate" }),
          );
          if (parsed) list.push(parsed);
        });
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setRequests(list);
      },
      () => setFailed(true),
    );
  }, [uid]);

  if (failed) return <p role="alert">{t.loadError}</p>;
  if (requests === null) return <p>{messages.auth.loading}</p>;
  if (requests.length === 0) return <p className="text-sm">{t.noRequests}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <li
          key={request.id}
          className="rounded-md border border-neutral-300 p-3 text-sm"
        >
          <p className="font-medium">
            {t.plans[request.planId]} · {request.amountMru}{" "}
            {messages.subscribe.currency} ·{" "}
            {messages.subscribe.methods[request.methodId]}
          </p>
          <p dir="ltr" className="text-start">
            {request.transactionReference}
          </p>
          <p>{formatDate(request.createdAt, lang)}</p>
          <p className="font-medium">{t.statuses[request.status]}</p>
          {request.status === "rejected" ? (
            <p className="mt-1">{t.rejectedNotice}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AccountView({
  lang,
  messages,
}: {
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.account;
  const auth = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  if (auth.status === "unconfigured") {
    return <UnavailableNotice text={messages.auth.unavailable} />;
  }
  if (auth.status === "loading") return <p>{messages.auth.loading}</p>;
  if (auth.status === "signedOut") {
    return (
      <div className="flex flex-col gap-3">
        <p>{t.signedOut}</p>
        <Link
          href={localizePath("/login", lang)}
          className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          {t.goLogin}
        </Link>
      </div>
    );
  }

  const { user, profile, profileState } = auth;

  if (profileState === "loading") return <p>{messages.auth.loading}</p>;
  if (profileState === "error") return <p role="alert">{t.loadError}</p>;

  if (profileState === "missing" || !profile) {
    return (
      <div className="flex flex-col gap-3">
        <p>{t.profileMissing}</p>
        {retryFailed ? (
          <p role="alert">{messages.auth.errors.generic}</p>
        ) : null}
        <button
          type="button"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            setRetryFailed(false);
            try {
              await ensureProfile(user);
            } catch {
              setRetryFailed(true);
            } finally {
              setRetrying(false);
            }
          }}
          className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {t.retryProfile}
        </button>
      </div>
    );
  }

  // An expired paid plan counts as Free, whatever is stored.
  const plan = getProfilePlan(profile, new Date());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>

      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="font-medium">{t.name}</dt>
          <dd>{profile.displayName}</dd>
        </div>
        <div>
          <dt className="font-medium">{t.email}</dt>
          <dd dir="ltr" className="text-start">
            {profile.email}
          </dd>
        </div>
        <div>
          <dt className="font-medium">{t.currentPlan}</dt>
          <dd>{t.plans[plan]}</dd>
        </div>
        <div>
          <dt className="font-medium">{t.expiresOn}</dt>
          <dd>
            {plan !== "free" && profile.planExpiresAt
              ? formatDate(profile.planExpiresAt, lang)
              : t.noExpiry}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <Link
          href={localizePath("/subscribe", lang)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          {t.subscribeCta}
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md border border-neutral-900 px-4 py-2"
        >
          {messages.auth.logout}
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.requestsTitle}</h2>
        <RequestsList
          key={user.uid}
          uid={user.uid}
          lang={lang}
          messages={messages}
        />
      </section>
    </div>
  );
}
