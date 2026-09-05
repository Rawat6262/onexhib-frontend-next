// Every /api/admin/* list endpoint returns { data, total, page, limit, totalPages }
// and caps `limit` at 500 server-side (see docs/admin-api.md). Callers in this app
// want "give me everything" semantics, so this walks every page and merges the results.
export async function fetchAllPages(requestPage, pageSize = 500) {
  const first = await requestPage(1, pageSize);
  // Some list endpoints (e.g. /api/admin/signup) tack on extra top-level fields
  // (like sibling-collection counts) alongside data/total — carry those through.
  const { data, total = 0, ...extra } = first.data ?? {};
  let all = Array.isArray(data) ? data : [];

  const totalPages = Math.ceil(total / pageSize) || 1;
  for (let page = 2; page <= totalPages; page++) {
    const res = await requestPage(page, pageSize);
    all = all.concat(res.data?.data ?? []);
  }

  return { data: { ...extra, data: all, total, page: 1, limit: all.length, totalPages: 1 } };
}

/**
 * Page numbers for a pagination control, collapsing long ranges with "...".
 * Several views in the Vite app each carried an identical private copy.
 */
export function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}
