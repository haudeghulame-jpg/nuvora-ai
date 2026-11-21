import { planIds, type PlanId } from "../../config/plans";
import {
  accountStatuses,
  isActiveAdmin,
  userRoles,
} from "../../lib/accounts/profile";
import {
  decidePaymentRequest,
  type Decision,
  type DecisionError,
} from "../../lib/payments/decision";
import { referenceKey } from "../../lib/payments/reference";
import { paymentStatuses, type PaymentStatus } from "../../lib/payments/request";

// Server-side application of an administrator's decision. It talks to the
// database only through the small DecisionStore interface, so the Firestore
// version (firestore-store.ts) and the in-memory test version behave the same.
export type StoreData = Record<string, unknown>;

export interface StoreTransaction {
  get(path: string): Promise<StoreData | null>;
  update(path: string, data: StoreData): void;
  // Must fail if the document already exists.
  create(path: string, data: StoreData): void;
}

export interface DecisionStore {
  runTransaction<T>(run: (tx: StoreTransaction) => Promise<T>): Promise<T>;
}

export type ApplyError =
  | "forbidden"
  | "notFound"
  | "userMissing"
  | "badData"
  | DecisionError;

export type ApplyOutcome =
  | { ok: true; status: "approved" | "rejected"; planExpiresAt: Date | null }
  | { ok: false; code: ApplyError };

type StoredRequest = {
  userId: string;
  planId: PlanId;
  amountMru: number;
  transactionReference: string;
  status: PaymentStatus;
};

function isOneOf<T extends string>(
  list: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

// A stored value is only used after its shape was checked.
function parseRequest(data: StoreData): StoredRequest | null {
  const { userId, planId, amountMru, transactionReference, status } = data;
  if (typeof userId !== "string" || !/^[A-Za-z0-9]{1,128}$/.test(userId)) {
    return null;
  }
  if (!isOneOf(planIds, planId)) return null;
  if (typeof amountMru !== "number") return null;
  if (typeof transactionReference !== "string") return null;
  if (!isOneOf(paymentStatuses, status)) return null;
  return { userId, planId, amountMru, transactionReference, status };
}

export async function applyDecision(
  store: DecisionStore,
  args: {
    adminUid: string;
    requestId: string;
    decision: Decision;
    note?: string | null;
    now: Date;
  },
): Promise<ApplyOutcome> {
  return store.runTransaction(async (tx): Promise<ApplyOutcome> => {
    // 1. The caller must be an active administrator according to the stored
    //    profile. Anything the browser claims about itself is ignored.
    const adminData = await tx.get(`users/${args.adminUid}`);
    const admin =
      adminData &&
      isOneOf(userRoles, adminData.role) &&
      isOneOf(accountStatuses, adminData.accountStatus)
        ? { role: adminData.role, accountStatus: adminData.accountStatus }
        : null;
    if (!isActiveAdmin(admin)) return { ok: false, code: "forbidden" };

    // 2. Read everything first (a transaction must read before it writes).
    const requestPath = `paymentRequests/${args.requestId}`;
    const requestData = await tx.get(requestPath);
    if (!requestData) return { ok: false, code: "notFound" };
    const request = parseRequest(requestData);
    if (!request) return { ok: false, code: "badData" };

    const userPath = `users/${request.userId}`;
    const userData = await tx.get(userPath);
    if (!userData) return { ok: false, code: "userMissing" };

    const key = referenceKey(request.transactionReference);
    if (key.length === 0) return { ok: false, code: "badData" };
    const keyPath = `approvedReferences/${key}`;
    const alreadyApproved = (await tx.get(keyPath)) !== null;

    // 3. Decide (pure logic, tested separately).
    const result = decidePaymentRequest({
      request,
      decision: args.decision,
      adminUid: args.adminUid,
      adminNote: args.note,
      referenceAlreadyApproved: alreadyApproved,
      now: args.now,
    });
    if (!result.ok) return { ok: false, code: result.error };

    // 4. Write, all in the same transaction.
    tx.update(requestPath, { ...result.request });
    if (result.subscription) {
      tx.update(userPath, { ...result.subscription });
    }
    if (result.approvedReferenceKey) {
      tx.create(keyPath, {
        requestId: args.requestId,
        userId: request.userId,
        approvedBy: args.adminUid,
        approvedAt: args.now,
      });
    }
    return {
      ok: true,
      status: result.request.status,
      planExpiresAt: result.subscription?.planExpiresAt ?? null,
    };
  });
}
