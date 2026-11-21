import { describe, expect, it } from "vitest";
import { parseProfile } from "./parse-profile";

const at = (iso: string) => ({ toDate: () => new Date(iso) });

const stored = {
  uid: "u1",
  displayName: "Ali",
  email: "ali@example.com",
  role: "user",
  plan: "plus",
  accountStatus: "active",
  planStartedAt: at("2026-12-01T00:00:00.000Z"),
  planExpiresAt: at("2026-12-31T00:00:00.000Z"),
  createdAt: at("2026-11-01T00:00:00.000Z"),
  updatedAt: at("2026-12-01T00:00:00.000Z"),
};

describe("parseProfile", () => {
  it("reads a complete profile and converts the dates", () => {
    const profile = parseProfile(stored);
    expect(profile?.plan).toBe("plus");
    expect(profile?.planExpiresAt).toEqual(
      new Date("2026-12-31T00:00:00.000Z"),
    );
  });

  it("accepts a Free profile without subscription dates", () => {
    const profile = parseProfile({
      ...stored,
      plan: "free",
      planStartedAt: null,
      planExpiresAt: null,
    });
    expect(profile?.planExpiresAt).toBeNull();
  });

  it("rejects unknown roles, plans and statuses", () => {
    expect(parseProfile({ ...stored, role: "owner" })).toBeNull();
    expect(parseProfile({ ...stored, plan: "max" })).toBeNull();
    expect(parseProfile({ ...stored, accountStatus: "banned" })).toBeNull();
  });

  it("rejects missing or malformed fields", () => {
    expect(parseProfile({})).toBeNull();
    expect(parseProfile({ ...stored, createdAt: "yesterday" })).toBeNull();
    expect(parseProfile({ ...stored, email: 5 })).toBeNull();
  });
});
