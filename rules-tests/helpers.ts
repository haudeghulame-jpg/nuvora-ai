import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

// Helpers for testing firestore.rules against the local Firestore emulator.
// Nothing here talks to a real Firebase project.
export const PROJECT_ID = "demo-nuvora";

function emulatorHostAndPort(): { host: string; port: number } {
  const value = process.env.FIRESTORE_EMULATOR_HOST;
  if (!value) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run these tests with `firebase emulators:exec`.",
    );
  }
  const [host, port] = value.split(":");
  return { host, port: Number(port) };
}

const apps: FirebaseApp[] = [];
let counter = 0;

type Who =
  // No sign-in at all.
  | { kind: "anonymous" }
  // A signed-in user, as the rules see them (uid and email only: the rules
  // never trust any role claim).
  | { kind: "user"; uid: string; email?: string }
  // Rules switched off: only for preparing test data.
  | { kind: "owner" };

export function contextFor(who: Who): Firestore {
  const app = initializeApp(
    { projectId: PROJECT_ID, apiKey: "fake-api-key" },
    `rules-test-${counter++}`,
  );
  apps.push(app);
  const db = getFirestore(app);
  const { host, port } = emulatorHostAndPort();

  if (who.kind === "anonymous") {
    connectFirestoreEmulator(db, host, port);
  } else if (who.kind === "owner") {
    connectFirestoreEmulator(db, host, port, { mockUserToken: "owner" });
  } else {
    connectFirestoreEmulator(db, host, port, {
      mockUserToken: {
        sub: who.uid,
        user_id: who.uid,
        email: who.email ?? `${who.uid}@example.com`,
        email_verified: true,
      },
    });
  }
  return db;
}

export const anonymous = () => contextFor({ kind: "anonymous" });
export const asUser = (uid: string, email?: string) =>
  contextFor({ kind: "user", uid, email });

export async function loadRules(): Promise<void> {
  const { host, port } = emulatorHostAndPort();
  const content = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
  const response = await fetch(
    `http://${host}:${port}/emulator/v1/projects/${PROJECT_ID}:securityRules`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: { files: [{ name: "firestore.rules", content }] },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Could not load the rules: ${response.status} ${await response.text()}`);
  }
}

export async function clearData(): Promise<void> {
  const { host, port } = emulatorHostAndPort();
  await fetch(
    `http://${host}:${port}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

export async function closeAll(): Promise<void> {
  await Promise.all(apps.splice(0).map((app) => deleteApp(app)));
}

// Passes only when the request was refused for lack of permission. Any other
// outcome (success, or a different error) fails the test.
export async function expectDenied(request: Promise<unknown>): Promise<void> {
  try {
    await request;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "permission-denied") return;
    throw new Error(`Expected permission-denied but got: ${String(error)}`);
  }
  throw new Error("Expected the request to be denied, but it succeeded.");
}
