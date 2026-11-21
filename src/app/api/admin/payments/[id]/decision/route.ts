import { NextResponse } from "next/server";
import {
  NOTE_MAX,
  type Decision,
} from "../../../../../../lib/payments/decision";
import {
  applyDecision,
  type ApplyError,
} from "../../../../../../server/payments/apply-decision";
import { getAdminServices } from "../../../../../../server/firebase-admin";
import { createFirestoreStore } from "../../../../../../server/payments/firestore-store";

// POST /api/admin/payments/{id}/decision
// Body: { "decision": "approve" | "reject", "note"?: string }
// Header: Authorization: Bearer <Firebase ID token>
//
// The only way a payment is approved or rejected. The caller's identity comes
// from the verified Firebase token, and "is this an administrator" comes from
// the stored profile inside the transaction. Hiding buttons in the page is not
// what protects this.
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

const STATUS_BY_CODE: Record<ApplyError, number> = {
  forbidden: 403,
  notFound: 404,
  userMissing: 409,
  badData: 422,
  notPending: 409,
  duplicateReference: 409,
  invalidPlan: 422,
  invalidAmount: 422,
  noteTooLong: 400,
};

function fail(status: number, code: string) {
  return NextResponse.json({ ok: false, code }, { status, headers: NO_STORE });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9]{1,64}$/.test(id)) return fail(400, "badRequest");

  const services = getAdminServices();
  if (!services) return fail(503, "notConfigured");

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail(401, "unauthenticated");

  let adminUid: string;
  try {
    // The second argument also rejects tokens of revoked sessions.
    const decoded = await services.auth.verifyIdToken(token, true);
    adminUid = decoded.uid;
  } catch {
    return fail(401, "unauthenticated");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "badRequest");
  }
  const { decision, note } = (body ?? {}) as Record<string, unknown>;
  if (decision !== "approve" && decision !== "reject") {
    return fail(400, "badRequest");
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return fail(400, "badRequest");
  }
  if (typeof note === "string" && note.length > NOTE_MAX * 2) {
    return fail(400, "noteTooLong");
  }

  try {
    const outcome = await applyDecision(createFirestoreStore(services.db), {
      adminUid,
      requestId: id,
      decision: decision as Decision,
      note: typeof note === "string" ? note : null,
      now: new Date(),
    });
    if (!outcome.ok) {
      return fail(STATUS_BY_CODE[outcome.code], outcome.code);
    }
    return NextResponse.json(
      {
        ok: true,
        status: outcome.status,
        planExpiresAt: outcome.planExpiresAt?.toISOString() ?? null,
      },
      { headers: NO_STORE },
    );
  } catch {
    // Includes the database refusing to create an already existing approved
    // transaction key. Nothing is written when a transaction fails.
    return fail(500, "serverError");
  }
}
