import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildNewProfile } from "../src/lib/accounts/profile";
import {
  anonymous,
  asUser,
  clearData,
  closeAll,
  contextFor,
  expectDenied,
  loadRules,
} from "./helpers";

// Prepares stored data with the rules switched off, like the server would.
async function seedProfile(uid: string, extra: Record<string, unknown> = {}) {
  const db = contextFor({ kind: "owner" });
  await setDoc(doc(db, "users", uid), {
    uid,
    displayName: `User ${uid}`,
    email: `${uid}@example.com`,
    role: "user",
    plan: "free",
    accountStatus: "active",
    planStartedAt: null,
    planExpiresAt: null,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    ...extra,
  });
}

const newProfile = (uid: string, over: Record<string, unknown> = {}) => ({
  ...buildNewProfile(
    { uid, displayName: "Aicha Mint", email: `${uid}@example.com` },
    serverTimestamp(),
  ),
  ...over,
});

beforeAll(loadRules);
beforeEach(clearData);
afterAll(closeAll);

describe("creating a profile", () => {
  it("lets a new user create their own Free, active, non-admin profile", async () => {
    await setDoc(doc(asUser("alice"), "users", "alice"), newProfile("alice"));
    const stored = await getDoc(doc(asUser("alice"), "users", "alice"));
    expect(stored.data()).toMatchObject({ role: "user", plan: "free", accountStatus: "active" });
  });

  it("refuses signed-out creation and creation for another uid", async () => {
    await expectDenied(setDoc(doc(anonymous(), "users", "alice"), newProfile("alice")));
    await expectDenied(setDoc(doc(asUser("mallory"), "users", "alice"), newProfile("alice")));
  });

  it("refuses to register as an administrator", async () => {
    await expectDenied(
      setDoc(doc(asUser("mallory"), "users", "mallory"), newProfile("mallory", { role: "admin" })),
    );
  });

  it("refuses to register on a paid plan or with subscription dates", async () => {
    const db = asUser("mallory");
    await expectDenied(setDoc(doc(db, "users", "mallory"), newProfile("mallory", { plan: "pro" })));
    await expectDenied(
      setDoc(doc(db, "users", "mallory"), newProfile("mallory", { planExpiresAt: new Date("2030-01-01") })),
    );
    await expectDenied(
      setDoc(doc(db, "users", "mallory"), newProfile("mallory", { planStartedAt: new Date() })),
    );
  });

  it("refuses a suspended status, extra fields and a wrong email", async () => {
    const db = asUser("mallory");
    await expectDenied(
      setDoc(doc(db, "users", "mallory"), newProfile("mallory", { accountStatus: "suspended" })),
    );
    await expectDenied(
      setDoc(doc(db, "users", "mallory"), newProfile("mallory", { isAdmin: true })),
    );
    await expectDenied(
      setDoc(doc(db, "users", "mallory"), newProfile("mallory", { email: "someone-else@example.com" })),
    );
  });

  it("refuses dates that are not the server time", async () => {
    await expectDenied(
      setDoc(
        doc(asUser("mallory"), "users", "mallory"),
        newProfile("mallory", { createdAt: new Date("2020-01-01") }),
      ),
    );
  });

  it("refuses an empty or oversized name", async () => {
    const db = asUser("mallory");
    await expectDenied(setDoc(doc(db, "users", "mallory"), newProfile("mallory", { displayName: "A" })));
    await expectDenied(
      setDoc(doc(db, "users", "mallory"), newProfile("mallory", { displayName: "x".repeat(81) })),
    );
  });
});

describe("reading profiles", () => {
  it("lets the owner read their own profile", async () => {
    await seedProfile("alice");
    expect((await getDoc(doc(asUser("alice"), "users", "alice"))).exists()).toBe(true);
  });

  it("hides a profile from signed-out visitors and other users", async () => {
    await seedProfile("alice");
    await seedProfile("bob");
    await expectDenied(getDoc(doc(anonymous(), "users", "alice")));
    await expectDenied(getDoc(doc(asUser("bob"), "users", "alice")));
  });

  it("lets an active administrator read other profiles, but not a normal user list", async () => {
    await seedProfile("admin1", { role: "admin" });
    await seedProfile("alice");
    expect((await getDoc(doc(asUser("admin1"), "users", "alice"))).exists()).toBe(true);
    expect((await getDocs(collection(asUser("admin1"), "users"))).size).toBe(2);
    await expectDenied(getDocs(collection(asUser("alice"), "users")));
  });

  it("gives no power to a suspended administrator", async () => {
    await seedProfile("admin2", { role: "admin", accountStatus: "suspended" });
    await seedProfile("alice");
    await expectDenied(getDoc(doc(asUser("admin2"), "users", "alice")));
  });
});

describe("updating a profile", () => {
  it("lets the owner change only their display name", async () => {
    await seedProfile("alice");
    await updateDoc(doc(asUser("alice"), "users", "alice"), {
      displayName: "Aicha Mint Ahmed",
      updatedAt: serverTimestamp(),
    });
    const stored = await getDoc(doc(asUser("alice"), "users", "alice"));
    expect(stored.data()?.displayName).toBe("Aicha Mint Ahmed");
  });

  it("refuses to change role, plan, status or subscription dates", async () => {
    await seedProfile("alice");
    const ref = () => doc(asUser("alice"), "users", "alice");
    await expectDenied(updateDoc(ref(), { role: "admin", updatedAt: serverTimestamp() }));
    await expectDenied(updateDoc(ref(), { plan: "pro", updatedAt: serverTimestamp() }));
    await expectDenied(updateDoc(ref(), { accountStatus: "suspended", updatedAt: serverTimestamp() }));
    await expectDenied(
      updateDoc(ref(), { planExpiresAt: new Date("2030-01-01"), updatedAt: serverTimestamp() }),
    );
    await expectDenied(updateDoc(ref(), { planStartedAt: new Date(), updatedAt: serverTimestamp() }));
  });

  it("refuses to sneak a forbidden change in next to an allowed one", async () => {
    await seedProfile("alice");
    await expectDenied(
      updateDoc(doc(asUser("alice"), "users", "alice"), {
        displayName: "New Name",
        role: "admin",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses to change someone else's profile or the email", async () => {
    await seedProfile("alice");
    await seedProfile("bob");
    await expectDenied(
      updateDoc(doc(asUser("bob"), "users", "alice"), { displayName: "Hacked", updatedAt: serverTimestamp() }),
    );
    await expectDenied(
      updateDoc(doc(asUser("alice"), "users", "alice"), { email: "x@example.com", updatedAt: serverTimestamp() }),
    );
  });

  it("gives even an administrator no way to edit a profile from the browser", async () => {
    await seedProfile("admin1", { role: "admin" });
    await seedProfile("alice");
    await expectDenied(
      updateDoc(doc(asUser("admin1"), "users", "alice"), { plan: "pro", updatedAt: serverTimestamp() }),
    );
  });

  it("refuses to delete a profile", async () => {
    await seedProfile("alice");
    await expectDenied(deleteDoc(doc(asUser("alice"), "users", "alice")));
  });
});
