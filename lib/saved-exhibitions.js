/**
 * Browser-side client for the saved-exhibitions API.
 *
 * All three calls go through the /api/* rewrite in next.config.mjs, so they
 * reach Express on the same origin and carry the httpOnly `uid` cookie that is
 * the real credential. `credentials: "include"` is set explicitly rather than
 * relied upon, because a same-origin default is easy to lose in a refactor.
 *
 * BACKEND CONTRACT — three details worth knowing, all verified against
 * Controller/saveExhibition.controller.js rather than assumed:
 *
 *  1. Save takes the EXHIBITION id; unsave takes the SAVE RECORD id. They are
 *     different objects, and passing one where the other belongs silently 404s.
 *  2. An empty list is returned as HTTP 404, not 200 with []. That is treated
 *     here as "nothing saved", because it is not an error for a new user.
 *  3. Each saved record embeds a full snapshot of the exhibition document at
 *     the moment it was saved — including `addedBy`, which is the organiser's
 *     EMAIL despite the name, and `email`. toSavedItem() drops both. The same
 *     allow-list rule as lib/public-api.js: a field reaches the UI only if it
 *     was named on purpose.
 *
 * Because the snapshot is frozen at save time, a record can outlive the
 * exhibition it describes (a duplicate that was later merged away, say). The
 * saved page therefore links by id and lets the detail route decide — a stale
 * entry 301s to its keeper or 404s, rather than being silently hidden here.
 */

const str = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));

/** Project one saved record, dropping the organiser contact fields. */
export function toSavedItem(record) {
  const snapshot = Array.isArray(record?.saveExhibition) ? record.saveExhibition[0] : null;
  if (!snapshot?._id) return null;
  return {
    // The id of the SAVE record — this is what unsave() needs.
    savedId: str(record._id),
    savedAt: record?.createdAt || null,
    id: str(snapshot._id),
    name: str(snapshot.exhibition_name),
    startDate: snapshot.starting_date || null,
    endDate: snapshot.ending_date || null,
    category: str(snapshot.category),
    venue: str(snapshot.venue),
    city: str(snapshot.city),
    state: str(snapshot.state),
    country: str(snapshot.country),
    // PII deliberately absent: addedBy, email, createdby.
  };
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, ok: res.ok, body };
}

/** Everything the signed-in user has saved. Returns [] when they have none. */
export async function fetchSaved(userId) {
  if (!userId) return { items: [], error: null };
  const { status, ok, body } = await request(`/api/saveexhibitions/${encodeURIComponent(userId)}`);

  // 404 is the backend's way of saying "none", not a failure.
  if (status === 404) return { items: [], error: null };
  if (status === 401) return { items: [], error: "signed-out" };
  if (!ok) return { items: [], error: "failed" };

  const rows = Array.isArray(body?.data) ? body.data : [];
  return { items: rows.map(toSavedItem).filter(Boolean), error: null };
}

/** Save one exhibition. `exhibitionId` is the exhibition's own id. */
export async function saveExhibition(userId, exhibitionId) {
  const { status, ok } = await request(`/api/saveexhibitions/${encodeURIComponent(userId)}`, {
    method: "POST",
    body: JSON.stringify({ id: exhibitionId }),
  });
  if (status === 401) return { ok: false, reason: "signed-out" };
  return { ok, reason: ok ? null : "failed" };
}

/** Remove one saved entry. `savedId` is the SAVE record's id, not the exhibition's. */
export async function unsaveExhibition(userId, savedId) {
  const { status, ok } = await request(`/api/unsave/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    body: JSON.stringify({ id: savedId }),
  });
  if (status === 401) return { ok: false, reason: "signed-out" };
  return { ok, reason: ok ? null : "failed" };
}
