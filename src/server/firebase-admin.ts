import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Firebase Admin access. Import this file only from server code
// (route handlers), never from a component that runs in the browser.
//
// The service account is read from the FIREBASE_SERVICE_ACCOUNT_JSON
// environment variable. It is a secret: it is never committed, never sent to
// the browser and never logged. When it is missing or unreadable this returns
// null and the caller answers "not configured" instead of pretending.
export type AdminServices = { auth: Auth; db: Firestore };

export function getAdminServices(): AdminServices | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const app =
      getApps()[0] ??
      initializeApp({ credential: cert(JSON.parse(raw) as object) });
    return { auth: getAuth(app), db: getFirestore(app) };
  } catch {
    // Do not print the error: it could contain parts of the secret.
    return null;
  }
}
