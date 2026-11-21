import { describe, expect, it } from "vitest";
import {
  applyDecision,
  type DecisionStore,
  type StoreData,
  type StoreTransaction,
} from "./apply-decision";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-12-01T09:30:00.000Z");

// A simple in-memory stand-in for the database. It checks that a created
// document does not already exist, like Firestore does.
class MemoryStore implements DecisionStore {
  docs = new Map<string, StoreData>();

  async runTransaction<T>(run: (tx: StoreTransaction) => Promise<T>) {
    const tx: StoreTransaction = {
      get: async (path) => {
        const doc = this.docs.get(path);
        return doc ? { ...doc } : null;
      },
      update: (path, data) => {
        const doc = this.docs.get(path);
        if (!doc) throw new Error(`missing ${path}`);
        this.docs.set(path, { ...doc, ...data });
      },
      create: (path, data) => {
        if (this.docs.has(path)) throw new Error(`exists ${path}`);
        this.docs.set(path, { ...data });
      },
    };
    return run(tx);
  }
}

function setup() {
  const store = new MemoryStore();
  store.docs.set("users/admin1", { role: "admin", accountStatus: "active" });
  store.docs.set("users/user1", {
    role: "user",
    accountStatus: "active",
    plan: "free",
  });
  store.docs.set("users/user2", {
    role: "user",
    accountStatus: "active",
    plan: "free",
  });
  const request = (
    userId: string,
    reference: string,
    over: StoreData = {},
  ) => ({
    userId,
    planId: "plus",
    methodId: "bankily",
    amountMru: 400,
    transactionReference: reference,
    status: "pending",
    ...over,
  });
  store.docs.set("paymentRequests/r1", request("user1", "AB-12 34"));
  store.docs.set("paymentRequests/r2", request("user2", "ab1234"));
  return { store, request };
}

const approve = (
  store: DecisionStore,
  requestId: string,
  adminUid = "admin1",
) => applyDecision(store, { adminUid, requestId, decision: "approve", now });

describe("who may decide", () => {
  it("refuses a normal user and changes nothing", async () => {
    const { store } = setup();
    const before = JSON.stringify([...store.docs]);
    expect(await approve(store, "r1", "user1")).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(JSON.stringify([...store.docs])).toBe(before);
  });

  it("refuses a suspended administrator and an unknown account", async () => {
    const { store } = setup();
    store.docs.set("users/admin2", {
      role: "admin",
      accountStatus: "suspended",
    });
    expect(await approve(store, "r1", "admin2")).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(await approve(store, "r1", "ghost")).toEqual({
      ok: false,
      code: "forbidden",
    });
  });
});

describe("approval", () => {
  it("activates the plan for exactly 30 days and records the decision", async () => {
    const { store } = setup();
    const outcome = await approve(store, "r1");
    expect(outcome).toEqual({
      ok: true,
      status: "approved",
      planExpiresAt: new Date(now.getTime() + 30 * DAY),
    });
    expect(store.docs.get("paymentRequests/r1")).toMatchObject({
      status: "approved",
      decidedBy: "admin1",
      decidedAt: now,
    });
    expect(store.docs.get("users/user1")).toMatchObject({
      plan: "plus",
      planStartedAt: now,
      planExpiresAt: new Date(now.getTime() + 30 * DAY),
    });
    expect(store.docs.get("approvedReferences/AB1234")).toMatchObject({
      requestId: "r1",
      approvedBy: "admin1",
    });
  });

  it("gives Pro exactly 40 days", async () => {
    const { store, request } = setup();
    store.docs.set(
      "paymentRequests/r3",
      request("user1", "PRO-9999", { planId: "pro", amountMru: 1500 }),
    );
    const outcome = await approve(store, "r3");
    expect(outcome).toMatchObject({
      ok: true,
      planExpiresAt: new Date(now.getTime() + 40 * DAY),
    });
  });

  it("blocks the same transaction from being approved twice, however it is written", async () => {
    const { store } = setup();
    expect((await approve(store, "r1")).ok).toBe(true);
    const second = await approve(store, "r2"); // "ab1234" is the same transfer
    expect(second).toEqual({ ok: false, code: "duplicateReference" });
    expect(store.docs.get("users/user2")).toMatchObject({ plan: "free" });
    expect(store.docs.get("paymentRequests/r2")).toMatchObject({
      status: "pending",
    });
  });

  it("cannot approve a request twice", async () => {
    const { store } = setup();
    await approve(store, "r1");
    expect(await approve(store, "r1")).toEqual({
      ok: false,
      code: "notPending",
    });
  });

  it("refuses a request whose amount does not match the plan price", async () => {
    const { store, request } = setup();
    store.docs.set(
      "paymentRequests/r4",
      request("user1", "CHEAP-1111", { amountMru: 1 }),
    );
    expect(await approve(store, "r4")).toEqual({
      ok: false,
      code: "invalidAmount",
    });
    expect(store.docs.get("users/user1")).toMatchObject({ plan: "free" });
  });
});

describe("rejection", () => {
  it("rejects with a note and leaves the user's plan and references alone", async () => {
    const { store } = setup();
    const outcome = await applyDecision(store, {
      adminUid: "admin1",
      requestId: "r1",
      decision: "reject",
      note: "transfer not found",
      now,
    });
    expect(outcome).toEqual({
      ok: true,
      status: "rejected",
      planExpiresAt: null,
    });
    expect(store.docs.get("paymentRequests/r1")).toMatchObject({
      status: "rejected",
      adminNote: "transfer not found",
    });
    expect(store.docs.get("users/user1")).toEqual({
      role: "user",
      accountStatus: "active",
      plan: "free",
    });
    expect(
      [...store.docs.keys()].some((k) => k.startsWith("approvedReferences/")),
    ).toBe(false);
  });
});

describe("missing or damaged data", () => {
  it("reports a missing request, a missing user and bad stored data", async () => {
    const { store, request } = setup();
    expect(await approve(store, "nope")).toEqual({
      ok: false,
      code: "notFound",
    });
    store.docs.set("paymentRequests/r5", request("ghostuser", "GHOST-1234"));
    expect(await approve(store, "r5")).toEqual({
      ok: false,
      code: "userMissing",
    });
    store.docs.set("paymentRequests/r6", { userId: "user1", planId: "max" });
    expect(await approve(store, "r6")).toEqual({ ok: false, code: "badData" });
  });
});
