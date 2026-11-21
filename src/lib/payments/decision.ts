import {
  computeExpiry,
  isPaidPlan,
  plans,
  type PlanId,
} from "../../config/plans";
import { referenceKey } from "./reference";
import type { PaymentRequest } from "./request";

// The administrator's decision on a payment request. This is the only place
// that decides what an approval changes. It is a pure function: the server
// route reads the data, calls this, and writes the result in one transaction.
// Nothing here can run in the browser with any effect, because the browser
// cannot write these fields (see firestore.rules).
export type Decision = "approve" | "reject";

export const NOTE_MAX = 500;

export type DecisionError =
  | "notPending"
  | "duplicateReference"
  | "invalidPlan"
  | "invalidAmount"
  | "noteTooLong";

export type DecisionResult =
  | { ok: false; error: DecisionError }
  | {
      ok: true;
      request: {
        status: "approved" | "rejected";
        decidedBy: string;
        decidedAt: Date;
        adminNote: string | null;
        updatedAt: Date;
      };
      // Present only on approval: the user's new subscription.
      subscription: {
        plan: PlanId;
        planStartedAt: Date;
        planExpiresAt: Date;
        updatedAt: Date;
      } | null;
      // Present only on approval: the key to record so this transaction can
      // never be approved a second time.
      approvedReferenceKey: string | null;
    };

export function decidePaymentRequest(args: {
  request: Pick<
    PaymentRequest,
    "userId" | "planId" | "amountMru" | "transactionReference" | "status"
  >;
  decision: Decision;
  adminUid: string;
  adminNote?: string | null;
  // True when another request with the same transaction was already approved.
  referenceAlreadyApproved: boolean;
  now: Date;
}): DecisionResult {
  const { request, decision, adminUid, now } = args;

  if (request.status !== "pending") return { ok: false, error: "notPending" };

  const note = (args.adminNote ?? "").trim();
  if (note.length > NOTE_MAX) return { ok: false, error: "noteTooLong" };
  const adminNote = note.length > 0 ? note : null;

  if (decision === "reject") {
    // A rejection changes only the request. The user stays on their plan.
    return {
      ok: true,
      request: {
        status: "rejected",
        decidedBy: adminUid,
        decidedAt: now,
        adminNote,
        updatedAt: now,
      },
      subscription: null,
      approvedReferenceKey: null,
    };
  }

  if (!isPaidPlan(request.planId)) return { ok: false, error: "invalidPlan" };
  if (request.amountMru !== plans[request.planId].priceMru) {
    return { ok: false, error: "invalidAmount" };
  }
  if (args.referenceAlreadyApproved)
    return { ok: false, error: "duplicateReference" };

  const planExpiresAt = computeExpiry(now, request.planId);
  if (!planExpiresAt) return { ok: false, error: "invalidPlan" };

  return {
    ok: true,
    request: {
      status: "approved",
      decidedBy: adminUid,
      decidedAt: now,
      adminNote,
      updatedAt: now,
    },
    subscription: {
      plan: request.planId,
      // The period starts only now, at approval, never at submission.
      planStartedAt: now,
      planExpiresAt,
      updatedAt: now,
    },
    approvedReferenceKey: referenceKey(request.transactionReference),
  };
}
