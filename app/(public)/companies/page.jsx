import Breadcrumbs from "@/components/public/Breadcrumbs";
import CompanyCard from "@/components/public/CompanyCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { companyPath } from "@/lib/routes";
import { getCompanies } from "@/lib/public-api";

/**
 * Company directory: /companies
 *
 * Targets "exhibition companies", "find companies", "discover businesses".
 *
 * The plural path is safe alongside the authenticated /companies/[id] route
 * because the dashboard has no index page at /companies — only the [id] child.
 * Public company detail lives at the singular /company/[slug].
 *
 * Always paginated: /api/allcompanies returns every record when page and limit
 * are omitted.
 */

export const revalidate = 300;

const PER_PAGE = 24;
const TITLE = "Companies exhibiting at trade shows and exhibitions";
const DESCRIPTION =
  "Browse the companies listed on OneXhib — what each business does, where it is based, and the exhibitions and products it is associated with.";

const readPage = (sp) => {
  const v = sp?.page;
  return Math.max(1, Number(Array.isArray(v) ? v[0] : v) || 1);
};

export async function generateMetadata({ searchParams }) {
  const page = readPage(await searchParams);
  if (page > 1) {
    // Paged views canonicalise to page 1 and stay out of the index; their links
    // are still followed so deeper company pages are discovered.
    return pageMetadata({
      title: `Companies — page ${page}`,
      description: DESCRIPTION,
      path: PUBLIC_ROUTES.companies,
      robots: NOINDEX_FOLLOW,
    });
  }
  return publicPageMetadata({ title: TITLE, description: DESCRIPTION, path: PUBLIC_ROUTES.companies });
}

export default async function CompaniesPage({ searchParams }) {
  const page = readPage(await searchParams);
  const { items, total, totalPages } = await getCompanies({ page, limit: PER_PAGE });

  const trail = [
    { name: "Home", path: "/" },
    { name: "Companies", path: PUBLIC_ROUTES.companies },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(items.map((c) => companyPath(c.name, c.id)), { name: "Companies on OneXhib" })
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Companies on OneXhib
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          Businesses listed against the exhibitions they take part in. Each company page shows what
          the business does and the products it has added.
        </p>
        {total ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {total.toLocaleString("en-US")} {total === 1 ? "company" : "companies"} listed
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        {items.length ? (
          <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((company) => (
              <li key={company.id}>
                <CompanyCard company={company} className="h-full" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No companies are listed yet. Check back soon.</EmptyState>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => (p > 1 ? `${PUBLIC_ROUTES.companies}?page=${p}` : PUBLIC_ROUTES.companies)}
      />
    </div>
  );
}
