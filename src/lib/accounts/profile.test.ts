import { describe, expect, it } from "vitest";
import {
  buildNewProfile,
  getProfilePlan,
  isActiveAdmin,
  NEW_PROFILE_FIELDS,
} from "./profile";

const now = new Date("2026-12-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("buildNewProfile", () => {
  const profile = buildNewProfile(
    { uid: "uid-1", displayName: "  Ali   Ben ", email: " Ali@Example.com " },
    now,
  );

  it("starts as an active Free user, never an administrator", () => {
    expect(profile.role).toBe("user");
    expect(profile.plan).toBe("free");
    expect(profile.accountStatus).toBe("active");
  });

  it("starts without subscription dates", () => {
    expect(profile.planStartedAt).toBeNull();
    expect(profile.planExpiresAt).toBeNull();
  });

  it("keeps the Firebase uid and cleans name and email", () => {
    expect(profile.uid).toBe("uid-1");
    expect(profile.displayName).toBe("Ali Ben");
    expect(profile.email).toBe("ali@example.com");
  });

  it("has exactly the agreed fields and no password", () => {
    expect(Object.keys(profile).sort()).toEqual([...NEW_PROFILE_FIELDS].sort());
    expect(Object.keys(profile)).not.toContain("password");
  });

  it("stamps creation and update with the same time", () => {
    expect(profile.createdAt).toBe(now);
    expect(profile.updatedAt).toBe(now);
  });
});

describe("getProfilePlan", () => {
  it("keeps a paid plan until it expires, then falls back to Free", () => {
    const active = { plan: "plus" as const, planExpiresAt: new Date(now.getTime() + DAY) };
    expect(getProfilePlan(active, now)).toBe("plus");
    const expired = { plan: "plus" as const, planExpiresAt: new Date(now.getTime() - DAY) };
    expect(getProfilePlan(expired, now)).toBe("free");
  });
});

describe("isActiveAdmin", () => {
  it("is true only for an active administrator", () => {
    expect(isActiveAdmin({ role: "admin", accountStatus: "active" })).toBe(true);
    expect(isActiveAdmin({ role: "admin", accountStatus: "suspended" })).toBe(false);
    expect(isActiveAdmin({ role: "user", accountStatus: "active" })).toBe(false);
    expect(isActiveAdmin(null)).toBe(false);
  });
});
