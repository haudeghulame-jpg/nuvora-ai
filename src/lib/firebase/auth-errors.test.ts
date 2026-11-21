import { describe, expect, it } from "vitest";
import { authErrorKey } from "./auth-errors";

describe("authErrorKey", () => {
  it("gives one message for unknown user and wrong password", () => {
    expect(authErrorKey({ code: "auth/user-not-found" })).toBe(
      "invalidCredentials",
    );
    expect(authErrorKey({ code: "auth/wrong-password" })).toBe(
      "invalidCredentials",
    );
    expect(authErrorKey({ code: "auth/invalid-credential" })).toBe(
      "invalidCredentials",
    );
  });

  it("maps the other known codes", () => {
    expect(authErrorKey({ code: "auth/email-already-in-use" })).toBe(
      "emailInUse",
    );
    expect(authErrorKey({ code: "auth/weak-password" })).toBe("weakPassword");
    expect(authErrorKey({ code: "auth/too-many-requests" })).toBe(
      "tooManyRequests",
    );
    expect(authErrorKey({ code: "auth/network-request-failed" })).toBe(
      "network",
    );
  });

  it("falls back to a generic message and never throws", () => {
    expect(authErrorKey({ code: "auth/something-new" })).toBe("generic");
    expect(authErrorKey(new Error("boom"))).toBe("generic");
    expect(authErrorKey(null)).toBe("generic");
    expect(authErrorKey("text")).toBe("generic");
  });
});
