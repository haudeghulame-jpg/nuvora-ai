// Turns a Firebase error into one of our own message keys, so each language
// shows its own text and the screen never shows raw Firebase codes.
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailInUse"
  | "weakPassword"
  | "tooManyRequests"
  | "network"
  | "generic";

export function authErrorKey(error: unknown): AuthErrorKey {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    // The same message for "no such user" and "wrong password", so the screen
    // does not reveal which emails are registered.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "invalidCredentials";
    case "auth/email-already-in-use":
      return "emailInUse";
    case "auth/weak-password":
      return "weakPassword";
    case "auth/too-many-requests":
      return "tooManyRequests";
    case "auth/network-request-failed":
      return "network";
    default:
      return "generic";
  }
}
