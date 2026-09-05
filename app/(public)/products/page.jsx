import Breadcrumbs from "@/components/public/Breadcrumbs";
import ProductCard from "@/components/public/ProductCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata, pageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { breadcrumbNode, graph, itemListNode } from "@/lib/jsonld";
import { productPath } from "@/lib/routes";
import { getProducts } from "@/lib/public-api";

/**
 * Product directory: /products
 *
 * Targets "exhibition products", "find products", "discover products".
 *
 * The company behind each product is deliberately absent from the cards:
 * /api/allproducts does not populate product.createdBy, and resolving it per
 * card would be an N+1 of one request per product. The owning company is named
 * on the product detail page, which fetches it once.
 *
 * Always paginated — this endpoint returns every record without page/limit.
 */

export const revalidate = 300;

const PER_PAGE = 24;
const TITLE = "Products showcased at exhibitions and trade shows";
const DESCRIPTION =
  "Browse products listed by companies exhibiting on OneXhib, with categories, descriptions and the business behind each one.";

const readPage = (sp) => {
  const v = sp?.page;
  return Math.max(1, Number(Array.isArray(v) ? v[0] : v) || 1);
};

export async function generateMetadata({ searchParams }) {
  const page = readPage(await searchParams);
  if (page > 1) {
    return pageMetadata({
      title: `Products — page ${page}`,
      description: DESCRIPTION,
      path: PUBLIC_ROUTES.products,
      robots: NOINDEX_FOLLOW,
    });
  }
  return publicPageMetadata({ title: TITLE, description: DESCRIPTION, path: PUBLIC_ROUTES.products });
}

export default async function ProductsPage({ searchParams }) {
  const page = readPage(await searchParams);
  const { items, total, totalPages } = await getProducts({ page, limit: PER_PAGE });

  const trail = [
    { name: "Home", path: "/" },
    { name: "Products", path: PUBLIC_ROUTES.products },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          itemListNode(items.map((p) => productPath(p.name, p.id)), { name: "Products on OneXhib" })
        )}
      />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          Products on OneXhib
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          What exhibiting companies are showcasing, from machinery and components to consumer goods.
        </p>
        {total ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {total.toLocaleString("en-US")} {total === 1 ? "product" : "products"} listed
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        {items.length ? (
          <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} className="h-full" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No products are listed yet. Check back soon.</EmptyState>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => (p > 1 ? `${PUBLIC_ROUTES.products}?page=${p}` : PUBLIC_ROUTES.products)}
      />
    </div>
  );
}
