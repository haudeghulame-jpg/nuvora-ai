import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseWebConfig } from "./config";

// Browser-side Firebase. Created only when it is first needed and only when the
// project settings exist, so the site builds and runs without them.
function getClientApp(): FirebaseApp | null {
  const config = getFirebaseWebConfig();
  if (!config) return null;
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function getFirebaseAuth(): Auth | null {
  const app = getClientApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseDb(): Firestore | null {
  const app = getClientApp();
  return app ? getFirestore(app) : null;
}
