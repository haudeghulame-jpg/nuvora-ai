"use client";

import Link from "next/link";
import { useState } from "react";
import {
  paymentMethodIds,
  paymentMethods,
  type PaymentMethodId,
} from "../../config/payment-methods";
import { plans, type PlanId } from "../../config/plans";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/dictionaries";
import { localizePath } from "../../i18n/routing";
import { createPaymentRequest } from "../../lib/firebase/actions";
import { validateReference } from "../../lib/payments/reference";
import { useAuth } from "./auth-provider";
import { FormField } from "./form-field";
import { UnavailableNotice } from "./unavailable-notice";

const paidPlans: PlanId[] = ["plus", "pro"];

export function SubscribeFlow({
  lang,
  messages,
}: {
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.subscribe;
  const auth = useAuth();
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [methodId, setMethodId] = useState<PaymentMethodId | null>(null);
  const [reference, setReference] = useState("");
  const [referenceError, setReferenceError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (auth.status === "unconfigured") {
    return <UnavailableNotice text={messages.auth.unavailable} />;
  }
  if (auth.status === "loading") return <p>{messages.auth.loading}</p>;
  if (auth.status === "signedOut") {
    return (
      <div className="flex flex-col gap-3">
        <p>{t.signInRequired}</p>
        <Link
          href={localizePath("/login", lang)}
          className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          {t.goLogin}
        </Link>
      </div>
    );
  }

  const { user } = auth;

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="text-base font-medium">
          {t.success}
        </p>
        <Link
          href={localizePath("/account", lang)}
          className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          {t.seeRequests}
        </Link>
      </div>
    );
  }

  const plan = planId ? plans[planId] : null;
  const method = methodId ? paymentMethods[methodId] : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!planId || !methodId) return;
    setFormError(null);
    const problem = validateReference(reference);
    setReferenceError(
      problem === "required"
        ? messages.auth.errors.required
        : problem
          ? t.referenceInvalid
          : undefined,
    );
    if (problem) return;

    setBusy(true);
    try {
      await createPaymentRequest(user.uid, { planId, methodId, reference });
      setDone(true);
    } catch {
      setFormError(t.submitFailed);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="text-sm">{t.intro}</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">{t.choosePlan}</legend>
        {paidPlans.map((id) => (
          <label
            key={id}
            className="flex items-center gap-3 rounded-md border border-neutral-300 p-3"
          >
            <input
              type="radio"
              name="plan"
              checked={planId === id}
              onChange={() => setPlanId(id)}
            />
            <span>
              {messages.account.plans[id]} · {plans[id].priceMru} {t.currency} ·{" "}
              {plans[id].durationDays} {t.daysUnit}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">{t.chooseMethod}</legend>
        {paymentMethodIds.map((id) => (
          <label
            key={id}
            className="flex items-center gap-3 rounded-md border border-neutral-300 p-3"
          >
            <input
              type="radio"
              name="method"
              checked={methodId === id}
              onChange={() => setMethodId(id)}
            />
            <span>{t.methods[id]}</span>
          </label>
        ))}
      </fieldset>

      {plan && method && methodId && planId ? (
        <>
          <dl className="flex flex-col gap-2 rounded-md border border-neutral-900 p-4 text-sm">
            <div>
              <dt className="font-medium">{t.summary.plan}</dt>
              <dd>{messages.account.plans[planId]}</dd>
            </div>
            <div>
              <dt className="font-medium">{t.summary.price}</dt>
              <dd>
                {plan.priceMru} {t.currency}
              </dd>
            </div>
            <div>
              <dt className="font-medium">{t.summary.duration}</dt>
              <dd>
                {plan.durationDays} {t.daysUnit}
              </dd>
            </div>
            <div>
              <dt className="font-medium">{t.summary.method}</dt>
              <dd>{t.methods[methodId]}</dd>
            </div>
            <div>
              <dt className="font-medium">{t.summary.account}</dt>
              <dd dir="ltr" className="text-start text-lg font-semibold">
                {method.accountNumber}
              </dd>
            </div>
          </dl>

          <p className="text-sm">{t.transferInstruction}</p>

          <FormField
            id="reference"
            label={t.referenceLabel}
            hint={t.referenceHint}
            value={reference}
            onChange={setReference}
            error={referenceError}
            ltr
          />

          {formError ? (
            <p role="alert" className="text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-neutral-900 px-4 py-2 text-base font-medium text-white disabled:opacity-60"
          >
            {busy ? t.submitting : t.submit}
          </button>
        </>
      ) : null}
    </form>
  );
}
