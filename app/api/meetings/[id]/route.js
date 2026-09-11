import { NextResponse } from "next/server";

/**
 * Status changes for one meeting, bridged to /app/status/:meetingId.
 *
 * Same reasoning as the sibling route: the Express endpoint is outside the
 * /api/* rewrite, so the browser cannot call it directly. The caller's cookie
 * is forwarded and Express authorises; nothing is decided here.
 *
 * The status value is checked against the model's enum before forwarding —
 * not as a security measure, since the controller validates it too, but so an
 * obvious typo fails fast with a clear message instead of a generic 400.
 *
 * Contract: PATCH /api/meetings/<meetingId>  { status, statusRemark? }
 */

export const dynamic = "force-dynamic";

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
const ALLOWED = new Set(["pending", "accepted", "rejected", "cancelled", "completed"]);
const MAX_REMARK = 500;

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return NextResponse.json({ success: false, message: "A valid meeting id is required." }, { status: 400 });
  }
  if (!BACKEND_URL) {
    return NextResponse.json({ success: false, message: "Unavailable." }, { status: 503 });
  }

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const status = String(payload?.status || "").toLowerCase();
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ success: false, message: "Unknown status." }, { status: 400 });
  }

  const body = { status };
  const remark = typeof payload?.statusRemark === "string" ? payload.statusRemark.trim() : "";
  if (remark) body.statusRemark = remark.slice(0, MAX_REMARK);

  try {
    const res = await fetch(`${BACKEND_URL}/app/status/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        cookie: request.headers.get("cookie") || "",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const out = await res.json().catch(() => null);
    return NextResponse.json(out ?? { success: res.ok }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Unavailable." }, { status: 502 });
  }
}
