"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/dictionaries";
import { localizePath } from "../../i18n/routing";
import { authErrorKey } from "../../lib/firebase/auth-errors";
import { requestPasswordReset } from "../../lib/firebase/actions";
import { validateEmail } from "../../lib/auth/validation";
import { useAuth } from "./auth-provider";
import { FormField } from "./form-field";
import { UnavailableNotice } from "./unavailable-notice";

export function ForgotForm({
  lang,
  messages,
}: {
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.auth;
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (auth.status === "unconfigured") {
    return <UnavailableNotice text={t.unavailable} />;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const problem = validateEmail(email);
    setFieldError(problem ? t.errors[problem] : undefined);
    if (problem) return;

    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      const key = authErrorKey(error);
      // An unknown email gets the same answer as a known one, so the screen
      // does not reveal who is registered.
      if (key === "invalidCredentials") {
        setSent(true);
      } else {
        setFormError(t.errors[key]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.forgot.title}</h1>
      <p className="text-sm">{t.forgot.intro}</p>
      <FormField
        id="email"
        type="email"
        label={t.fields.email}
        value={email}
        onChange={setEmail}
        error={fieldError}
        autoComplete="email"
        ltr
      />
      {sent ? (
        <p role="status" className="text-sm">
          {t.forgot.sent}
        </p>
      ) : null}
      {formError ? (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || auth.status === "loading"}
        className="rounded-md bg-neutral-900 px-4 py-2 text-base font-medium text-white disabled:opacity-60"
      >
        {busy ? t.loading : t.forgot.submit}
      </button>
      <p className="text-sm">
        <Link href={localizePath("/login", lang)} className="underline">
          {t.forgot.back}
        </Link>
      </p>
    </form>
  );
}
