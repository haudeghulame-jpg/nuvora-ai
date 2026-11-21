// Subscription plans. Prices and durations live here, in one place, and are
// meant to become editable from the admin dashboard later (not in components).
// There are exactly three plans. Renewal is manual: nothing renews by itself.
export const planIds = ["free", "plus", "pro"] as const;

export type PlanId = (typeof planIds)[number];

export type Plan = {
  id: PlanId;
  priceMru: number;
  // null means the plan never expires (Free).
  durationDays: number | null;
};

export const plans: Record<PlanId, Plan> = {
  free: { id: "free", priceMru: 0, durationDays: null },
  plus: { id: "plus", priceMru: 400, durationDays: 30 },
  pro: { id: "pro", priceMru: 1500, durationDays: 40 },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isPaidPlan(planId: PlanId): boolean {
  return plans[planId].priceMru > 0;
}

// Expiry date when a payment is approved at `approvedAt`: exactly 30 days for
// Plus and 40 days for Pro (computed in UTC, so daylight saving cannot move it).
// Free has no expiry.
export function computeExpiry(approvedAt: Date, planId: PlanId): Date | null {
  const days = plans[planId].durationDays;
  if (days === null) return null;
  return new Date(approvedAt.getTime() + days * MS_PER_DAY);
}

export type Subscription = {
  planId: PlanId;
  expiresAt: Date | null;
};

// The plan a user really has right now. A paid plan that has expired, or a
// paid plan with no expiry date, counts as Free until a new payment is approved.
export function getEffectivePlanId(
  subscription: Subscription | null,
  now: Date,
): PlanId {
  if (!subscription || !isPaidPlan(subscription.planId)) return "free";
  if (!subscription.expiresAt) return "free";
  return now.getTime() < subscription.expiresAt.getTime()
    ? subscription.planId
    : "free";
}
