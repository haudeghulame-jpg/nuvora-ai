import { describe, expect, it } from "vitest";
import {
  buildPaymentRequest,
  NEW_PAYMENT_REQUEST_FIELDS,
  validatePaymentRequestInput,
} from "./request";

const stamp = new Date("2026-12-01T00:00:00.000Z");

describe("validatePaymentRequestInput", () => {
  it("accepts Plus or Pro with Bankily or Sedad and a reference", () => {
    for (const planId of ["plus", "pro"]) {
      for (const methodId of ["bankily", "sedad"]) {
        expect(
          validatePaymentRequestInput({ planId, methodId, reference: "123456" }),
        ).toEqual({});
      }
    }
  });

  it("refuses the Free plan, unknown plans and unknown methods", () => {
    expect(
      validatePaymentRequestInput({ planId: "free", methodId: "bankily", reference: "123456" }),
    ).toEqual({ planId: "invalid" });
    expect(
      validatePaymentRequestInput({ planId: "max", methodId: "bankily", reference: "123456" }),
    ).toEqual({ planId: "invalid" });
    expect(
      validatePaymentRequestInput({ planId: "plus", methodId: "masrvi", reference: "123456" }),
    ).toEqual({ methodId: "invalid" });
  });

  it("requires a valid transaction reference", () => {
    expect(
      validatePaymentRequestInput({ planId: "plus", methodId: "sedad", reference: "" }),
    ).toEqual({ reference: "required" });
    expect(
      validatePaymentRequestInput({ planId: "plus", methodId: "sedad", reference: "1" }),
    ).toEqual({ reference: "invalid" });
  });
});

describe("buildPaymentRequest", () => {
  it("creates a pending request with the price taken from the plan table", () => {
    const plus = buildPaymentRequest(
      "uid-1",
      { planId: "plus", methodId: "bankily", reference: " 123 456 " },
      stamp,
    );
    expect(plus).toEqual({
      userId: "uid-1",
      planId: "plus",
      methodId: "bankily",
      amountMru: 400,
      transactionReference: "123 456",
      status: "pending",
      createdAt: stamp,
      updatedAt: stamp,
    });
    const pro = buildPaymentRequest(
      "uid-1",
      { planId: "pro", methodId: "sedad", reference: "ABCD1234" },
      stamp,
    );
    expect(pro.amountMru).toBe(1500);
  });

  it("has exactly the agreed fields and no image or file field", () => {
    const request = buildPaymentRequest(
      "uid-1",
      { planId: "pro", methodId: "sedad", reference: "ABCD1234" },
      stamp,
    );
    expect(Object.keys(request).sort()).toEqual([...NEW_PAYMENT_REQUEST_FIELDS].sort());
    expect(Object.keys(request).join(" ")).not.toMatch(/image|receipt|file|photo/i);
  });

  it("refuses invalid input instead of guessing", () => {
    expect(() =>
      buildPaymentRequest("uid-1", { planId: "free", methodId: "sedad", reference: "ABCD" }, stamp),
    ).toThrow();
  });
});
