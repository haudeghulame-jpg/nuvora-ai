import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildPaymentRequest,
  type NewPaymentRequestInput,
} from "../src/lib/payments/request";
import {
  anonymous,
  asUser,
  clearData,
  closeAll,
  contextFor,
  expectDenied,
  loadRules,
} from "./helpers";

async function seedProfile(uid: string, extra: Record<string, unknown> = {}) {
  await setDoc(doc(contextFor({ kind: "owner" }), "users", uid), {
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

async function seedRequest(
  id: string,
  userId: string,
  over: Record<string, unknown> = {},
) {
  await setDoc(doc(contextFor({ kind: "owner" }), "paymentRequests", id), {
    userId,
    planId: "plus",
    methodId: "bankily",
    amountMru: 400,
    transactionReference: "AB1234",
    status: "pending",
    createdAt: new Date("2026-11-02T00:00:00Z"),
    updatedAt: new Date("2026-11-02T00:00:00Z"),
    ...over,
  });
}

const input: NewPaymentRequestInput = {
  planId: "plus",
  methodId: "bankily",
  reference: "AB1234",
};

const newRequest = (
  uid: string,
  over: Record<string, unknown> = {},
  from = input,
) => ({
  ...buildPaymentRequest(uid, from, serverTimestamp()),
  ...over,
});

beforeAll(loadRules);
beforeEach(async () => {
  await clearData();
  await seedProfile("alice");
  await seedProfile("bob");
  await seedProfile("admin1", { role: "admin" });
});
afterAll(closeAll);

describe("creating a payment request", () => {
  it("accepts Plus and Pro with Bankily or Sedad at the exact price", async () => {
    const db = asUser("alice");
    for (const planId of ["plus", "pro"] as const) {
      for (const methodId of ["bankily", "sedad"] as const) {
        await addDoc(
          collection(db, "paymentRequests"),
          newRequest("alice", {}, { planId, methodId, reference: "REF-1234" }),
        );
      }
    }
    const mine = await getDocs(
      query(collection(db, "paymentRequests"), where("userId", "==", "alice")),
    );
    expect(mine.size).toBe(4);
  });

  it("stores the request as pending with the plan price, and no image field", async () => {
    const ref = await addDoc(
      collection(asUser("alice"), "paymentRequests"),
      newRequest(
        "alice",
        {},
        { planId: "pro", methodId: "sedad", reference: "ZX9999" },
      ),
    );
    const stored = (await getDoc(ref)).data();
    expect(stored).toMatchObject({
      status: "pending",
      amountMru: 1500,
      userId: "alice",
    });
    expect(Object.keys(stored ?? {}).join(" ")).not.toMatch(
      /image|receipt|file/i,
    );
  });

  it("refuses signed-out users and requests for another user", async () => {
    await expectDenied(
      addDoc(collection(anonymous(), "paymentRequests"), newRequest("alice")),
    );
    await expectDenied(
      addDoc(collection(asUser("bob"), "paymentRequests"), newRequest("alice")),
    );
  });

  it("refuses any status other than pending", async () => {
    const db = asUser("alice");
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { status: "approved" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { status: "rejected" }),
      ),
    );
  });

  it("refuses an amount that does not match the plan, including 900", async () => {
    const db = asUser("alice");
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { amountMru: 1 }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { amountMru: 900 }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { amountMru: 1500 }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { amountMru: 400 }, { ...input, planId: "pro" }),
      ),
    );
  });

  it("refuses the Free plan, unknown plans and unknown payment methods", async () => {
    const db = asUser("alice");
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { planId: "free", amountMru: 0 }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { planId: "max" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { methodId: "masrvi" }),
      ),
    );
  });

  it("refuses image or other extra fields and decision fields", async () => {
    const db = asUser("alice");
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { receiptImage: "data:image/png;base64,AAAA" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { decidedBy: "admin1" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { adminNote: "ok" }),
      ),
    );
  });

  it("refuses a missing or malformed transaction reference", async () => {
    const db = asUser("alice");
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { transactionReference: "" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { transactionReference: "12" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { transactionReference: "<script>x</script>" }),
      ),
    );
    await expectDenied(
      addDoc(
        collection(db, "paymentRequests"),
        newRequest("alice", { transactionReference: 123456 }),
      ),
    );
  });

  it("refuses a request time that is not the server time", async () => {
    await expectDenied(
      addDoc(
        collection(asUser("alice"), "paymentRequests"),
        newRequest("alice", { createdAt: new Date("2020-01-01") }),
      ),
    );
  });

  it("refuses a suspended user and a user without a profile", async () => {
    await seedProfile("carol", { accountStatus: "suspended" });
    await expectDenied(
      addDoc(
        collection(asUser("carol"), "paymentRequests"),
        newRequest("carol"),
      ),
    );
    await expectDenied(
      addDoc(
        collection(asUser("ghost"), "paymentRequests"),
        newRequest("ghost"),
      ),
    );
  });
});

describe("reading payment requests", () => {
  beforeEach(async () => {
    await seedRequest("r1", "alice");
    await seedRequest("r2", "bob");
  });

  it("lets a user read only their own", async () => {
    expect(
      (await getDoc(doc(asUser("alice"), "paymentRequests", "r1"))).exists(),
    ).toBe(true);
    await expectDenied(getDoc(doc(asUser("alice"), "paymentRequests", "r2")));
    const mine = await getDocs(
      query(
        collection(asUser("alice"), "paymentRequests"),
        where("userId", "==", "alice"),
      ),
    );
    expect(mine.size).toBe(1);
  });

  it("refuses listing everyone's requests, and any signed-out read", async () => {
    await expectDenied(getDocs(collection(asUser("alice"), "paymentRequests")));
    await expectDenied(getDoc(doc(anonymous(), "paymentRequests", "r1")));
  });

  it("lets an administrator list and read all requests", async () => {
    const all = await getDocs(collection(asUser("admin1"), "paymentRequests"));
    expect(all.size).toBe(2);
    expect(
      (await getDoc(doc(asUser("admin1"), "paymentRequests", "r2"))).exists(),
    ).toBe(true);
  });
});

describe("deciding a payment request from the browser", () => {
  beforeEach(async () => {
    await seedRequest("r1", "alice");
  });

  it("refuses the user approving their own request", async () => {
    await expectDenied(
      updateDoc(doc(asUser("alice"), "paymentRequests", "r1"), {
        status: "approved",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses even an administrator writing a decision from the browser", async () => {
    // Decisions are written only by the server, after it verifies the admin.
    await expectDenied(
      updateDoc(doc(asUser("admin1"), "paymentRequests", "r1"), {
        status: "approved",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses changing amount or reference, and deleting", async () => {
    await expectDenied(
      updateDoc(doc(asUser("alice"), "paymentRequests", "r1"), {
        amountMru: 1,
      }),
    );
    await expectDenied(
      updateDoc(doc(asUser("alice"), "paymentRequests", "r1"), {
        transactionReference: "OTHER1",
      }),
    );
    await expectDenied(
      deleteDoc(doc(asUser("alice"), "paymentRequests", "r1")),
    );
    await expectDenied(
      deleteDoc(doc(asUser("admin1"), "paymentRequests", "r1")),
    );
  });

  it("refuses another user touching the request", async () => {
    await expectDenied(
      updateDoc(doc(asUser("bob"), "paymentRequests", "r1"), {
        status: "rejected",
      }),
    );
  });
});

describe("approved transaction references and unknown collections", () => {
  it("are closed to everyone in the browser, even administrators", async () => {
    await setDoc(
      doc(contextFor({ kind: "owner" }), "approvedReferences", "AB1234"),
      { requestId: "r1" },
    );
    for (const db of [anonymous(), asUser("alice"), asUser("admin1")]) {
      await expectDenied(getDoc(doc(db, "approvedReferences", "AB1234")));
      await expectDenied(
        setDoc(doc(db, "approvedReferences", "ZZ9999"), { requestId: "x" }),
      );
    }
  });

  it("deny reading and writing any collection that is not listed", async () => {
    await expectDenied(
      setDoc(doc(asUser("admin1"), "settings", "paymentAccounts"), {
        bankily: "x",
      }),
    );
    await expectDenied(
      getDoc(doc(asUser("admin1"), "settings", "paymentAccounts")),
    );
  });
});

describe("sanity", () => {
  it("lets the test setup, with rules off, write data the rules would refuse", async () => {
    // Proves the denials above come from the rules and not from a broken setup.
    await seedRequest("r9", "alice", { status: "approved" });
    expect(
      (await getDoc(doc(asUser("alice"), "paymentRequests", "r9"))).data()
        ?.status,
    ).toBe("approved");
  });
});
