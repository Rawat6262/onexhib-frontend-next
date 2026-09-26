/**
 * Keyset-cursor list state for the social lists.
 *
 * WHY NOT lib/paginate.js
 * That helper walks page NUMBERS: it reads `total`, computes `totalPages` and
 * loops `page = 2..n`. The social endpoints have none of those fields. They
 * return an opaque `nextCursor` plus `hasMore`, and there is no way to ask for
 * "page 3" - the only way forward is the token the previous page handed back.
 * Reusing it would mean inventing numbers the backend never sends.
 *
 * THE CURSOR IS OPAQUE
 * It is base64url of an internal `<ISO>|<ObjectId>` pair, and that encoding is a
 * server-side contract. Nothing here parses it, decodes it, compares it or builds
 * one: it is carried back exactly as received. If the server ever changes the
 * format, this code does not notice, which is the point.
 *
 * NO CLIENT-SIDE SORTING
 * The server orders every page by (createdAt DESC, _id DESC) and the pages are
 * appended in arrival order, so the merged list is already in server order.
 * Re-sorting here would be guessing at a total order from a partial view, and it
 * would silently disagree with the server the moment two rows shared a
 * millisecond - which is exactly the case the server's _id tie-break exists for.
 */

/** The state every social list starts from. */
export function emptyList() {
  return { items: [], nextCursor: null, hasMore: false };
}

/**
 * Fold a page response into list state.
 *
 * `mode` is explicit rather than inferred from whether a cursor was sent,
 * because "first page" and "refresh" are the same operation to the server and
 * different operations here: one starts empty, the other replaces what is on
 * screen. Guessing from the presence of a cursor would make a refresh append to
 * the list it was meant to replace.
 *
 * DEDUPLICATION, AND WHY FIRST WINS
 * A row can legitimately appear on two adjacent pages: the cursor walks strictly
 * older rows, but a row can be edited between requests, and the notification and
 * feed lists are live. When an id repeats, the copy ALREADY IN THE LIST is kept
 * and the newcomer is dropped.
 *
 * Keeping the first copy holds the list's position stable - the row does not jump
 * to the bottom on the next page load, and React keeps its existing element
 * rather than unmounting and remounting it, which would lose focus or an open
 * menu inside that row. The trade-off is that a field edited server-side between
 * the two requests is not picked up until the list is refreshed; that is a stale
 * value for a moment, against a row visibly moving under the reader. There is no
 * source evidence that the second copy is ever more correct, so the stable
 * choice wins.
 *
 * @param {{items: Array, nextCursor: string|null, hasMore: boolean}} state
 * @param {{items?: Array, nextCursor?: string|null, hasMore?: boolean}} page
 * @param {"replace"|"append"} mode
 */
export function mergePage(state, page, mode = "append") {
  const base = state && Array.isArray(state.items) ? state : emptyList();
  const incoming = page && Array.isArray(page.items) ? page.items : [];

  const kept = mode === "replace" ? [] : base.items;

  const seen = new Set(kept.map((item) => String(item && item._id)));
  const added = [];
  for (const item of incoming) {
    if (!item || item._id === undefined || item._id === null) continue;
    const id = String(item._id);
    if (seen.has(id)) continue;   // first copy wins - see above
    seen.add(id);
    added.push(item);
  }

  return {
    // Concatenation only: the server's order within each page is preserved, and
    // pages are appended in the order they arrived.
    items: kept.concat(added),
    // Carried verbatim. `undefined` is normalised to null so callers can test
    // one falsy shape instead of two.
    nextCursor: page && page.nextCursor !== undefined ? page.nextCursor : null,
    hasMore: Boolean(page && page.hasMore),
  };
}

/**
 * Whether another page may be requested.
 *
 * BOTH conditions, not either. `hasMore` is the server's answer, and the cursor
 * is the only means of acting on it - a truthy `hasMore` with a null cursor would
 * otherwise send a request for the first page again and loop forever.
 * `loadingMore` is included so a double-click cannot issue two identical
 * requests.
 */
export function canLoadMore(state, loadingMore = false) {
  if (loadingMore) return false;
  if (!state) return false;
  return Boolean(state.hasMore) && typeof state.nextCursor === "string" && state.nextCursor.length > 0;
}

/**
 * Remove one row locally, for a delete the server has already confirmed.
 *
 * `hasMore` and `nextCursor` are untouched: they describe the server's remaining
 * rows, and deleting something already on screen tells us nothing new about what
 * lies beyond the cursor.
 */
export function removeItem(state, id) {
  const base = state && Array.isArray(state.items) ? state : emptyList();
  const target = String(id);
  return { ...base, items: base.items.filter((item) => String(item && item._id) !== target) };
}

/** Replace one row in place, for an edit the server has confirmed. */
export function replaceItem(state, id, next) {
  const base = state && Array.isArray(state.items) ? state : emptyList();
  const target = String(id);
  return {
    ...base,
    items: base.items.map((item) => (String(item && item._id) === target ? next : item)),
  };
}
