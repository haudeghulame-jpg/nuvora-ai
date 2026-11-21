import { describe, expect, it } from "vitest";
import { decidePaymentRequest, NOTE_MAX } from "./decision";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-12-01T09:30:00.000Z");

const pendingPlus = {
  userId: "user-1",
  planId: "plus" as const,
  amountMru: 400,
  transactionReference: "ab-12 34",
  status: "pending" as const,
};

const base = {
  decision: "approve" as const,
  adminUid: "admin-1",
  referenceAlreadyApproved: false,
  now,
};

describe("approving a payment", () => {
  it("activates Plus for exactly 30 days starting at approval", () => {
    const result = decidePaymentRequest({ ...base, request: pendingPlus });
    if (!result.ok) throw new Error("expected ok");
    expect(result.request.status).toBe("approved");
    expect(result.subscription?.plan).toBe("plus");
    expect(result.subscription?.planStartedAt).toEqual(now);
    expect(result.subscription?.planExpiresAt.getTime()).toBe(now.getTime() + 30 * DAY);
  });

  it("activates Pro for exactly 40 days", () => {
    const result = decidePaymentRequest({
      ...base,
      request: { ...pendingPlus, planId: "pro", amountMru: 1500 },
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.subscription?.plan).toBe("pro");
    expect(result.subscription?.planExpiresAt.getTime()).toBe(now.getTime() + 40 * DAY);
  });

  it("records who approved and when", () => {
    const result = decidePaymentRequest({ ...base, request: pendingPlus });
    if (!result.ok) throw new Error("expected ok");
    expect(result.request.decidedBy).toBe("admin-1");
    expect(result.request.decidedAt).toEqual(now);
  });

  it("returns the key that blocks a second approval of the same transaction", () => {
    const result = decidePaymentRequest({ ...base, request: pendingPlus });
    if (!result.ok) throw new Error("expected ok");
    expect(result.approvedReferenceKey).toBe("AB1234");
  });

  it("keeps a trimmed internal note, or null when empty", () => {
    const withNote = decidePaymentRequest({ ...base, request: pendingPlus, adminNote: "  checked in Bankily  " });
    if (!withNote.ok) throw new Error("expected ok");
    expect(withNote.request.adminNote).toBe("checked in Bankily");
    const without = decidePaymentRequest({ ...base, request: pendingPlus, adminNote: "   " });
    if (!without.ok) throw new Error("expected ok");
    expect(without.request.adminNote).toBeNull();
  });
});

describe("refusing to approve", () => {
  it("refuses a transaction that was already approved", () => {
    expect(
      decidePaymentRequest({ ...base, request: pendingPlus, referenceAlreadyApproved: true }),
    ).toEqual({ ok: false, error: "duplicateReference" });
  });

  it("refuses a request that is not pending", () => {
    for (const status of ["approved", "rejected"] as const) {
      expect(
        decidePaymentRequest({ ...base, request: { ...pendingPlus, status } }),
      ).toEqual({ ok: false, error: "notPending" });
    }
  });

  it("refuses an amount that does not match the plan price", () => {
    expect(
      decidePaymentRequest({ ...base, request: { ...pendingPlus, amountMru: 1 } }),
    ).toEqual({ ok: false, error: "invalidAmount" });
    expect(
      decidePaymentRequest({ ...base, request: { ...pendingPlus, amountMru: 900 } }),
    ).toEqual({ ok: false, error: "invalidAmount" });
  });

  it("refuses to approve the Free plan", () => {
    expect(
      decidePaymentRequest({
        ...base,
        request: { ...pendingPlus, planId: "free", amountMru: 0 },
      }),
    ).toEqual({ ok: false, error: "invalidPlan" });
  });

  it("refuses a note that is too long", () => {
    expect(
      decidePaymentRequest({ ...base, request: pendingPlus, adminNote: "x".repeat(NOTE_MAX + 1) }),
    ).toEqual({ ok: false, error: "noteTooLong" });
  });
});

describe("rejecting a payment", () => {
  it("changes only the request and leaves the user's plan alone", () => {
    const result = decidePaymentRequest({
      ...base,
      decision: "reject",
      request: pendingPlus,
      adminNote: "transfer not found",
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.request.status).toBe("rejected");
    expect(result.request.adminNote).toBe("transfer not found");
    expect(result.subscription).toBeNull();
    expect(result.approvedReferenceKey).toBeNull();
  });

  it("can reject a duplicate reference", () => {
    const result = decidePaymentRequest({
      ...base,
      decision: "reject",
      request: pendingPlus,
      referenceAlreadyApproved: true,
    });
    expect(result.ok).toBe(true);
  });

  it("cannot reject a request that was already decided", () => {
    expect(
      decidePaymentRequest({
        ...base,
        decision: "reject",
        request: { ...pendingPlus, status: "approved" },
      }),
    ).toEqual({ ok: false, error: "notPending" });
  });
});
