import { describe, expect, it } from "vitest";
import { parsePaymentRequest } from "./parse";

const stored = {
  userId: "u1",
  planId: "pro",
  methodId: "sedad",
  amountMru: 1500,
  transactionReference: "AB1234",
  status: "pending",
  createdAt: { toDate: () => new Date("2026-12-01T00:00:00.000Z") },
};

describe("parsePaymentRequest", () => {
  it("reads a stored request", () => {
    expect(parsePaymentRequest("r1", stored)).toMatchObject({
      id: "r1",
      planId: "pro",
      amountMru: 1500,
      status: "pending",
    });
  });

  it("rejects data that is not a valid request", () => {
    expect(parsePaymentRequest("r1", { ...stored, planId: "free2" })).toBeNull();
    expect(parsePaymentRequest("r1", { ...stored, methodId: "masrvi" })).toBeNull();
    expect(parsePaymentRequest("r1", { ...stored, status: "done" })).toBeNull();
    expect(parsePaymentRequest("r1", { ...stored, createdAt: null })).toBeNull();
    expect(parsePaymentRequest("r1", {})).toBeNull();
  });
});
