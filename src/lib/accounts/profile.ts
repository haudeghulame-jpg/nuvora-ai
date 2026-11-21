import { getEffectivePlanId, type PlanId } from "../../config/plans";
import { normalizeEmail, normalizeName } from "../auth/validation";

// The user profile stored in Firestore at users/{uid}. The password is never
// stored here: Firebase Authentication keeps it.
export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const accountStatuses = ["active", "suspended"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export type UserProfile<Stamp = Date> = {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  plan: PlanId;
  accountStatus: AccountStatus;
  // Subscription dates. They are set only by the server after an administrator
  // approves a payment; they start empty, and Free has no expiry.
  planStartedAt: Stamp | null;
  planExpiresAt: Stamp | null;
  createdAt: Stamp;
  updatedAt: Stamp;
};

// Every field a brand-new profile has. The Firestore rules accept a profile
// creation only when it matches this shape exactly, so a user cannot register
// as an administrator or on a paid plan.
export const NEW_PROFILE_FIELDS = [
  "uid",
  "displayName",
  "email",
  "role",
  "plan",
  "accountStatus",
  "planStartedAt",
  "planExpiresAt",
  "createdAt",
  "updatedAt",
] as const;

// The only fields a user may change on their own profile afterwards.
export const USER_EDITABLE_PROFILE_FIELDS = [
  "displayName",
  "updatedAt",
] as const;

export function buildNewProfile<Stamp>(
  input: { uid: string; displayName: string; email: string },
  stamp: Stamp,
): UserProfile<Stamp> {
  return {
    uid: input.uid,
    displayName: normalizeName(input.displayName),
    email: normalizeEmail(input.email),
    role: "user",
    plan: "free",
    accountStatus: "active",
    planStartedAt: null,
    planExpiresAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

// What the user really has right now: an expired paid plan counts as Free.
export function getProfilePlan(
  profile: Pick<UserProfile, "plan" | "planExpiresAt">,
  now: Date,
): PlanId {
  return getEffectivePlanId(
    { planId: profile.plan, expiresAt: profile.planExpiresAt },
    now,
  );
}

// Decided from the stored profile on the server, never from anything the
// browser says about itself.
export function isActiveAdmin(
  profile: Pick<UserProfile, "role" | "accountStatus"> | null,
): boolean {
  return (
    profile !== null &&
    profile.role === "admin" &&
    profile.accountStatus === "active"
  );
}
