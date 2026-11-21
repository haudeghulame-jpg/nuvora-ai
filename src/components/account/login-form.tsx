"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/dictionaries";
import { localizePath } from "../../i18n/routing";
import { authErrorKey } from "../../lib/firebase/auth-errors";
import { loginWithEmail } from "../../lib/firebase/actions";
import {
  hasErrors,
  validateLogin,
  type LoginErrors,
} from "../../lib/auth/validation";
import { useAuth } from "./auth-provider";
import { FormField } from "./form-field";
import { UnavailableNotice } from "./unavailable-notice";

export function LoginForm({
  lang,
  messages,
}: {
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.auth;
  const auth = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.status === "unconfigured") {
    return <UnavailableNotice text={t.unavailable} />;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      await loginWithEmail(values);
      router.push(localizePath("/account", lang));
    } catch (error) {
      setFormError(t.errors[authErrorKey(error)]);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.login.title}</h1>
      <FormField
        id="email"
        type="email"
        label={t.fields.email}
        value={values.email}
        onChange={(email) => setValues((current) => ({ ...current, email }))}
        error={errors.email ? t.errors[errors.email] : undefined}
        autoComplete="email"
        ltr
      />
      <FormField
        id="password"
        type="password"
        label={t.fields.password}
        value={values.password}
        onChange={(password) =>
          setValues((current) => ({ ...current, password }))
        }
        error={errors.password ? t.errors[errors.password] : undefined}
        autoComplete="current-password"
        ltr
      />
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
        {busy ? t.loading : t.login.submit}
      </button>
      <p className="text-sm">
        <Link
          href={localizePath("/forgot-password", lang)}
          className="underline"
        >
          {t.login.forgot}
        </Link>
      </p>
      <p className="text-sm">
        {t.login.noAccount}{" "}
        <Link href={localizePath("/register", lang)} className="underline">
          {t.login.goRegister}
        </Link>
      </p>
    </form>
  );
}
