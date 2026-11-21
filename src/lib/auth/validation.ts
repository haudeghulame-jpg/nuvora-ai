// Form validation for registration, login and password reset. Pure functions:
// they return error codes (not text) so each language can show its own message.
export type FieldError =
  "required" | "invalid" | "tooShort" | "tooLong" | "mismatch";

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegistrationErrors = Partial<
  Record<keyof RegistrationInput, FieldError>
>;

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const EMAIL_MAX = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Trims and collapses inner whitespace so "  Ali   Ben " becomes "Ali Ben".
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateName(name: string): FieldError | null {
  const value = normalizeName(name);
  if (value.length === 0) return "required";
  if (value.length < NAME_MIN) return "tooShort";
  if (value.length > NAME_MAX) return "tooLong";
  return null;
}

export function validateEmail(email: string): FieldError | null {
  const value = normalizeEmail(email);
  if (value.length === 0) return "required";
  if (value.length > EMAIL_MAX || !EMAIL_PATTERN.test(value)) return "invalid";
  return null;
}

// Passwords are never trimmed or changed: spaces may be part of them.
export function validateNewPassword(password: string): FieldError | null {
  if (password.length === 0) return "required";
  if (password.length < PASSWORD_MIN) return "tooShort";
  if (password.length > PASSWORD_MAX) return "tooLong";
  return null;
}

export function validateRegistration(
  input: RegistrationInput,
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  const password = validateNewPassword(input.password);
  if (password) errors.password = password;
  if (input.confirmPassword.length === 0) {
    errors.confirmPassword = "required";
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "mismatch";
  }
  return errors;
}

export type LoginInput = { email: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginInput, FieldError>>;

// Login only checks that both fields are filled in. Whether the password is
// right is decided by Firebase, never by this code.
export function validateLogin(input: LoginInput): LoginErrors {
  const errors: LoginErrors = {};
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  if (input.password.length === 0) errors.password = "required";
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
