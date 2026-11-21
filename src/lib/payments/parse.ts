import { paymentMethodIds, type PaymentMethodId } from "../../config/payment-methods";
import { planIds, type PlanId } from "../../config/plans";
import { paymentStatuses, type PaymentStatus } from "./request";

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
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

// A stored payment request, as the screens show it.
export type PaymentRequestView = {
  id: string;
  userId: string;
  planId: PlanId;
  methodId: PaymentMethodId;
  amountMru: number;
  transactionReference: string;
  status: PaymentStatus;
  createdAt: Date;
};

export function parsePaymentRequest(
  id: string,
  data: Record<string, unknown>,
): PaymentRequestView | null {
  const { userId, planId, methodId, amountMru, transactionReference, status } =
    data;
  if (typeof userId !== "string") return null;
  if (!isOneOf(planIds, planId)) return null;
  if (!isOneOf(paymentMethodIds, methodId)) return null;
  if (typeof amountMru !== "number") return null;
  if (typeof transactionReference !== "string") return null;
  if (!isOneOf(paymentStatuses, status)) return null;
  if (!isDateLike(data.createdAt)) return null;
  return {
    id,
    userId,
    planId,
    methodId,
    amountMru,
    transactionReference,
    status,
    createdAt: data.createdAt.toDate(),
  };
}
