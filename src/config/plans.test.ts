import { describe, expect, it } from "vitest";
import { paymentMethods, paymentMethodIds } from "./payment-methods";
import {
  computeExpiry,
  getEffectivePlanId,
  isPaidPlan,
  planIds,
  plans,
} from "./plans";

const DAY = 24 * 60 * 60 * 1000;

describe("plans", () => {
  it("has exactly three plans: free, plus and pro", () => {
    expect([...planIds]).toEqual(["free", "plus", "pro"]);
    expect(Object.keys(plans).sort()).toEqual(["free", "plus", "pro"]);
  });

  it("uses the agreed prices and has no 900 MRU plan", () => {
    expect(plans.free.priceMru).toBe(0);
    expect(plans.plus.priceMru).toBe(400);
    expect(plans.pro.priceMru).toBe(1500);
    const prices = Object.values(plans).map((plan) => plan.priceMru);
    expect(prices).not.toContain(900);
  });

  it("uses the agreed durations: free never expires, plus 30 days, pro 40", () => {
    expect(plans.free.durationDays).toBeNull();
    expect(plans.plus.durationDays).toBe(30);
    expect(plans.pro.durationDays).toBe(40);
  });

  it("treats only plus and pro as paid", () => {
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("plus")).toBe(true);
    expect(isPaidPlan("pro")).toBe(true);
  });
});

describe("computeExpiry", () => {
  const approvedAt = new Date("2026-11-21T10:00:00.000Z");

  it("adds exactly 30 days for plus", () => {
    const expiry = computeExpiry(approvedAt, "plus");
    expect(expiry?.getTime()).toBe(approvedAt.getTime() + 30 * DAY);
    expect(expiry?.toISOString()).toBe("2026-12-21T10:00:00.000Z");
  });

  it("adds exactly 40 days for pro", () => {
    const expiry = computeExpiry(approvedAt, "pro");
    expect(expiry?.getTime()).toBe(approvedAt.getTime() + 40 * DAY);
    expect(expiry?.toISOString()).toBe("2026-12-31T10:00:00.000Z");
  });

  it("gives free no expiry date", () => {
    expect(computeExpiry(approvedAt, "free")).toBeNull();
  });

  it("does not change the date it was given", () => {
    const copy = approvedAt.getTime();
    computeExpiry(approvedAt, "pro");
    expect(approvedAt.getTime()).toBe(copy);
  });
});

describe("getEffectivePlanId", () => {
  const now = new Date("2026-12-01T00:00:00.000Z");

  it("is free without a subscription", () => {
    expect(getEffectivePlanId(null, now)).toBe("free");
  });

  it("keeps a paid plan before it expires", () => {
    const expiresAt = new Date(now.getTime() + DAY);
    expect(getEffectivePlanId({ planId: "plus", expiresAt }, now)).toBe("plus");
    expect(getEffectivePlanId({ planId: "pro", expiresAt }, now)).toBe("pro");
  });

  it("returns to free at the moment of expiry and after", () => {
    expect(getEffectivePlanId({ planId: "plus", expiresAt: now }, now)).toBe(
      "free",
    );
    const past = new Date(now.getTime() - DAY);
    expect(getEffectivePlanId({ planId: "pro", expiresAt: past }, now)).toBe(
      "free",
    );
  });

  it("treats a paid plan with no expiry date as free", () => {
    expect(getEffectivePlanId({ planId: "pro", expiresAt: null }, now)).toBe(
      "free",
    );
  });

  it("keeps free as free", () => {
    expect(getEffectivePlanId({ planId: "free", expiresAt: null }, now)).toBe(
      "free",
    );
  });
});

describe("payment methods", () => {
  it("supports only bankily and sedad", () => {
    expect([...paymentMethodIds]).toEqual(["bankily", "sedad"]);
  });

  it("shows the same receiving account for both", () => {
    expect(paymentMethods.bankily.accountNumber).toBe("43 73 14 59");
    expect(paymentMethods.sedad.accountNumber).toBe(
      paymentMethods.bankily.accountNumber,
    );
  });
});
