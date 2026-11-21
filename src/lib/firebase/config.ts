// Public Firebase web settings. These identify the project and are meant to be
// visible in the browser; they are NOT secrets. Security comes from the
// Firestore rules and from server-side checks, not from hiding these.
//
// Each variable is written out in full (not looked up by a computed name) so
// Next.js can insert the value at build time.
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

// False until the owner creates the Firebase project and sets the variables.
// The interface uses this to say honestly that accounts are not available yet.
export function isFirebaseConfigured(): boolean {
  return getFirebaseWebConfig() !== null;
}
