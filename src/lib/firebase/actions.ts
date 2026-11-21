import type { User } from "firebase/auth";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { buildNewProfile } from "../accounts/profile";
import {
  normalizeEmail,
  normalizeName,
} from "../auth/validation";
import {
  buildPaymentRequest,
  validatePaymentRequestInput,
  type NewPaymentRequestInput,
} from "../payments/request";
import { getFirebaseAuth, getFirebaseDb } from "./client";

// Everything the browser does with Firebase lives here. None of it can grant a
// plan or a role: the Firestore rules refuse that, and approvals happen only on
// the server.
function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("firebase-not-configured");
  return auth;
}

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error("firebase-not-configured");
  return db;
}

// Creates users/{uid} as an active Free user. The rules accept nothing else.
export async function ensureProfile(user: User, displayName?: string) {
  const db = requireDb();
  const email = user.email ?? "";
  let name = normalizeName(displayName ?? user.displayName ?? "");
  if (name.length < 2) name = (email.split("@")[0] ?? "").padEnd(2, "_");
  await setDoc(
    doc(db, "users", user.uid),
    buildNewProfile({ uid: user.uid, displayName: name, email }, serverTimestamp()),
  );
}

export async function registerWithEmail(input: {
  name: string;
  email: string;
  password: string;
}) {
  const auth = requireAuth();
  await setPersistence(auth, browserLocalPersistence);
  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizeEmail(input.email),
    input.password,
  );
  try {
    await updateProfile(credential.user, {
      displayName: normalizeName(input.name),
    });
  } catch {
    // Not critical: the name is also stored in the profile document.
  }
  await ensureProfile(credential.user, input.name);
}

export async function loginWithEmail(input: { email: string; password: string }) {
  const auth = requireAuth();
  // Keeps the user signed in after the browser is closed.
  await setPersistence(auth, browserLocalPersistence);
  await signInWithEmailAndPassword(auth, normalizeEmail(input.email), input.password);
}

export async function logout() {
  await signOut(requireAuth());
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(requireAuth(), normalizeEmail(email));
}

// Sends a pending payment request for the signed-in user. The amount comes
// from the plan table, and the Firestore rules check it again.
export async function createPaymentRequest(
  userId: string,
  input: NewPaymentRequestInput,
) {
  const errors = validatePaymentRequestInput(input);
  if (Object.keys(errors).length > 0) throw new Error("invalid-payment-request");
  await addDoc(
    collection(requireDb(), "paymentRequests"),
    buildPaymentRequest(userId, input, serverTimestamp()),
  );
}

export type DecisionResponse = { ok: true } | { ok: false; code: string };

// Asks the server to approve or reject. The server verifies the token and the
// administrator's stored role; nothing here decides anything.
export async function sendDecision(
  user: User,
  requestId: string,
  decision: "approve" | "reject",
  note: string,
): Promise<DecisionResponse> {
  try {
    const token = await user.getIdToken();
    const response = await fetch(`/api/admin/payments/${requestId}/decision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ decision, note }),
    });
    const body = (await response.json()) as { ok?: boolean; code?: string };
    if (body.ok) return { ok: true };
    return { ok: false, code: body.code ?? "generic" };
  } catch {
    return { ok: false, code: "generic" };
  }
}
