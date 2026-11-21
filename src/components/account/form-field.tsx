// One labelled input with an optional hint and error. Email, password and
// transaction fields are always written left to right, also on Arabic pages.
export function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  hint,
  autoComplete,
  ltr = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  error?: string;
  hint?: string;
  autoComplete?: string;
  ltr?: boolean;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        dir={ltr ? "ltr" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="rounded-md border border-neutral-300 px-3 py-2 text-base text-start focus:border-neutral-900 focus:outline-none"
      />
      {hint ? (
        <p id={hintId} className="text-xs text-neutral-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
