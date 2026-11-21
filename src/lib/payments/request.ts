import { paymentMethodIds, type PaymentMethodId } from "../../config/payment-methods";
import { isPaidPlan, planIds, plans, type PlanId } from "../../config/plans";
import { cleanReference, validateReference, type ReferenceError } from "./reference";

// A payment request is stored at paymentRequests/{id}. There are no images and
// no receipt files: only the transaction reference typed by the user.
export const paymentStatuses = ["pending", "approved", "rejected"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export type NewPaymentRequestInput = {
  planId: string;
  methodId: string;
  reference: string;
};

export type PaymentRequestErrors = {
  planId?: "invalid";
  methodId?: "invalid";
  reference?: ReferenceError;
};

export type PaymentRequest<Stamp = Date> = {
  userId: string;
  planId: PlanId;
  methodId: PaymentMethodId;
  amountMru: number;
  transactionReference: string;
  status: PaymentStatus;
  createdAt: Stamp;
  updatedAt: Stamp;
};

// Fields of a request when the user creates it. The decision fields
// (decidedBy, decidedAt, adminNote) are added later by the server only.
export const NEW_PAYMENT_REQUEST_FIELDS = [
  "userId",
  "planId",
  "methodId",
  "amountMru",
  "transactionReference",
  "status",
  "createdAt",
  "updatedAt",
] as const;

function isPaidPlanId(value: string): value is PlanId {
  return (planIds as readonly string[]).includes(value) && isPaidPlan(value as PlanId);
}

function isMethodId(value: string): value is PaymentMethodId {
  return (paymentMethodIds as readonly string[]).includes(value);
}

export function validatePaymentRequestInput(
  input: NewPaymentRequestInput,
): PaymentRequestErrors {
  const errors: PaymentRequestErrors = {};
  if (!isPaidPlanId(input.planId)) errors.planId = "invalid";
  if (!isMethodId(input.methodId)) errors.methodId = "invalid";
  const reference = validateReference(input.reference);
  if (reference) errors.reference = reference;
  return errors;
}

// Builds a new pending request. The amount always comes from the plan table,
// never from the form. Call it only after validatePaymentRequestInput passed.
export function buildPaymentRequest<Stamp>(
  userId: string,
  input: NewPaymentRequestInput,
  stamp: Stamp,
): PaymentRequest<Stamp> {
  if (!isPaidPlanId(input.planId) || !isMethodId(input.methodId)) {
    throw new Error("Invalid payment request input");
  }
  return {
    userId,
    planId: input.planId,
    methodId: input.methodId,
    amountMru: plans[input.planId].priceMru,
    transactionReference: cleanReference(input.reference),
    status: "pending",
    createdAt: stamp,
    updatedAt: stamp,
  };
}
