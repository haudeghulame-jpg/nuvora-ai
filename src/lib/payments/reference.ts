// Transaction reference numbers typed by the user from their payment app.
// Only Western digits 0-9 and Latin letters are accepted, plus space, dash,
// underscore and slash inside the reference. Length 4 to 40.
export type ReferenceError = "required" | "invalid";

const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _/-]{2,38}[A-Za-z0-9]$/;

export function cleanReference(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateReference(raw: string): ReferenceError | null {
  const value = cleanReference(raw);
  if (value.length === 0) return "required";
  return REFERENCE_PATTERN.test(value) ? null : "invalid";
}

// The key used to detect an already approved transaction. "ab-12 34" and
// "AB1234" are the same transfer, so the key keeps only upper-case letters and
// digits. Always computed on the server from the stored reference, never taken
// from the browser.
export function referenceKey(raw: string): string {
  return cleanReference(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
