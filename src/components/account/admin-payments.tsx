"use client";

import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/dictionaries";
import { sendDecision } from "../../lib/firebase/actions";
import { getFirebaseDb } from "../../lib/firebase/client";
import { formatDateTime } from "../../lib/format";
import {
  parsePaymentRequest,
  type PaymentRequestView,
} from "../../lib/payments/parse";
import { useAuth } from "./auth-provider";
import { UnavailableNotice } from "./unavailable-notice";

function UserLabel({ uid }: { uid: string }) {
  const [label, setLabel] = useState(uid);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    let cancelled = false;
    getDoc(doc(db, "users", uid))
      .then((snapshot) => {
        const data = snapshot.data();
        if (!cancelled && data && typeof data.displayName === "string") {
          setLabel(`${data.displayName} (${String(data.email ?? "")})`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return <span dir="auto">{label}</span>;
}

function RequestCard({
  request,
  user,
  lang,
  messages,
}: {
  request: PaymentRequestView;
  user: User;
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.admin;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const result = await sendDecision(user, request.id, decision, note);
    if (!result.ok) {
      const known = t.errors as Record<string, string>;
      setError(known[result.code] ?? t.errors.generic);
      setBusy(false);
    }
    // On success the list updates by itself: the request is no longer pending.
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-neutral-300 p-4 text-sm">
      <dl className="flex flex-col gap-1">
        <div>
          <dt className="font-medium">{t.labels.user}</dt>
          <dd>
            <UserLabel uid={request.userId} />
          </dd>
        </div>
        <div>
          <dt className="font-medium">{t.labels.plan}</dt>
          <dd>{messages.account.plans[request.planId]}</dd>
        </div>
        <div>
          <dt className="font-medium">{t.labels.amount}</dt>
          <dd>
            {request.amountMru} {messages.subscribe.currency}
          </dd>
        </div>
        <div>
          <dt className="font-medium">{t.labels.method}</dt>
          <dd>{messages.subscribe.methods[request.methodId]}</dd>
        </div>
        <div>
          <dt className="font-medium">{t.labels.reference}</dt>
          <dd dir="ltr" className="text-start text-base font-semibold">
            {request.transactionReference}
          </dd>
        </div>
        <div>
          <dt className="font-medium">{t.labels.submitted}</dt>
          <dd>{formatDateTime(request.createdAt, lang)}</dd>
        </div>
      </dl>

      <p className="text-neutral-600">{t.verifyHint}</p>

      <input
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t.notePlaceholder}
        aria-label={t.notePlaceholder}
        maxLength={500}
        className="rounded-md border border-neutral-300 px-3 py-2 text-start"
      />

      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("approve")}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? t.working : t.approve}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("reject")}
          className="rounded-md border border-neutral-900 px-4 py-2 disabled:opacity-60"
        >
          {t.reject}
        </button>
      </div>
    </li>
  );
}

function PendingList({
  user,
  lang,
  messages,
}: {
  user: User;
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.admin;
  const [requests, setRequests] = useState<PaymentRequestView[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    // The rules let only an active administrator list other people's requests.
    return onSnapshot(
      query(
        collection(db, "paymentRequests"),
        where("status", "==", "pending"),
      ),
      (snapshot) => {
        const list: PaymentRequestView[] = [];
        snapshot.forEach((item) => {
          const parsed = parsePaymentRequest(
            item.id,
            item.data({ serverTimestamps: "estimate" }),
          );
          if (parsed) list.push(parsed);
        });
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        setRequests(list);
      },
      () => setFailed(true),
    );
  }, []);

  if (failed) return <p role="alert">{t.errors.forbidden}</p>;
  if (requests === null) return <p>{t.loading}</p>;
  if (requests.length === 0) return <p>{t.empty}</p>;

  return (
    <ul className="flex flex-col gap-4">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          user={user}
          lang={lang}
          messages={messages}
        />
      ))}
    </ul>
  );
}

// This screen only shows the list. What protects approvals is the server
// check and the Firestore rules, not whether this page is visible.
export function AdminPayments({
  lang,
  messages,
}: {
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.admin;
  const auth = useAuth();

  if (auth.status === "unconfigured") {
    return <UnavailableNotice text={messages.auth.unavailable} />;
  }
  if (auth.status === "loading") return <p>{t.loading}</p>;
  if (auth.status === "signedOut") return <p>{t.forbidden}</p>;
  if (auth.profileState === "loading") return <p>{t.loading}</p>;
  if (
    auth.profileState !== "ready" ||
    !auth.profile ||
    auth.profile.role !== "admin"
  ) {
    return <p>{t.forbidden}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <PendingList
        key={auth.user.uid}
        user={auth.user}
        lang={lang}
        messages={messages}
      />
    </div>
  );
}
