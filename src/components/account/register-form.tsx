"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/dictionaries";
import { localizePath } from "../../i18n/routing";
import { authErrorKey } from "../../lib/firebase/auth-errors";
import { registerWithEmail } from "../../lib/firebase/actions";
import {
  hasErrors,
  validateRegistration,
  type FieldError,
  type RegistrationErrors,
} from "../../lib/auth/validation";
import { useAuth } from "./auth-provider";
import { FormField } from "./form-field";
import { UnavailableNotice } from "./unavailable-notice";

export function RegisterForm({
  lang,
  messages,
}: {
  lang: Locale;
  messages: Messages;
}) {
  const t = messages.auth;
  const auth = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.status === "unconfigured") {
    return <UnavailableNotice text={t.unavailable} />;
  }

  const fieldError = (key: keyof typeof values) => {
    const code: FieldError | undefined = errors[key];
    return code ? t.errors[code] : undefined;
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateRegistration(values);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      await registerWithEmail(values);
      router.push(localizePath("/account", lang));
    } catch (error) {
      setFormError(t.errors[authErrorKey(error)]);
      setBusy(false);
    }
  }

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.register.title}</h1>
      <FormField
        id="name"
        label={t.fields.name}
        value={values.name}
        onChange={set("name")}
        error={fieldError("name")}
        autoComplete="name"
      />
      <FormField
        id="email"
        type="email"
        label={t.fields.email}
        value={values.email}
        onChange={set("email")}
        error={fieldError("email")}
        autoComplete="email"
        ltr
      />
      <FormField
        id="password"
        type="password"
        label={t.fields.password}
        hint={t.passwordHint}
        value={values.password}
        onChange={set("password")}
        error={fieldError("password")}
        autoComplete="new-password"
        ltr
      />
      <FormField
        id="confirmPassword"
        type="password"
        label={t.fields.confirmPassword}
        value={values.confirmPassword}
        onChange={set("confirmPassword")}
        error={fieldError("confirmPassword")}
        autoComplete="new-password"
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
        {busy ? t.loading : t.register.submit}
      </button>
      <p className="text-sm">
        {t.register.haveAccount}{" "}
        <Link href={localizePath("/login", lang)} className="underline">
          {t.register.goLogin}
        </Link>
      </p>
    </form>
  );
}
