import { planIds } from "../../config/plans";
import { accountStatuses, userRoles, type UserProfile } from "./profile";

// A Firestore date. The real type has toDate(); tests can pass a plain object.
type DateLike = { toDate(): Date };

function isDateLike(value: unknown): value is DateLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DateLike).toDate === "function"
  );
}

function isOneOf<T extends string>(
  list: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (list as readonly string[]).includes(value)
  );
}

// Reads a stored profile document into a typed profile. Returns null when the
// document is not shaped like a profile, so the screen never trusts bad data.
export function parseProfile(
  data: Record<string, unknown>,
): UserProfile | null {
  const {
    uid,
    displayName,
    email,
    role,
    plan,
    accountStatus,
    planStartedAt,
    planExpiresAt,
    createdAt,
    updatedAt,
  } = data;

  if (typeof uid !== "string" || typeof displayName !== "string") return null;
  if (typeof email !== "string") return null;
  if (!isOneOf(userRoles, role)) return null;
  if (!isOneOf(planIds, plan)) return null;
  if (!isOneOf(accountStatuses, accountStatus)) return null;
  if (!isDateLike(createdAt) || !isDateLike(updatedAt)) return null;
  if (planStartedAt != null && !isDateLike(planStartedAt)) return null;
  if (planExpiresAt != null && !isDateLike(planExpiresAt)) return null;

  return {
    uid,
    displayName,
    email,
    role,
    plan,
    accountStatus,
    planStartedAt: isDateLike(planStartedAt) ? planStartedAt.toDate() : null,
    planExpiresAt: isDateLike(planExpiresAt) ? planExpiresAt.toDate() : null,
    createdAt: createdAt.toDate(),
    updatedAt: updatedAt.toDate(),
  };
}
