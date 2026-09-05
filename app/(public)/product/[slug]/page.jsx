import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";

import Breadcrumbs from "@/components/public/Breadcrumbs";
import CardMedia from "@/components/public/CardMedia";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, productNode } from "@/lib/jsonld";
import { companyPath, exhibitionPath, productPath } from "@/lib/routes";
import { idFromSlug, isCanonicalSlug } from "@/lib/slug";
import { formatPrice, truncate } from "@/lib/format";
import { getCompanyById, getExhibitionById, getProductById } from "@/lib/public-api";

/**
 * Public product detail: /product/[slug]
 *
 * Singular, for the same collision reason as the other detail routes.
 *
 * Unlike the products listing, this page can afford to resolve the owning
 * company (one extra request per page view, ISR-cached), which is what makes it
 * useful: product, the business selling it, and the exhibition where you can
 * see it, linked together.
 */

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function load(slugParam) {
  const id = idFromSlug(slugParam);
  if (!id) return null;
  const product = await getProductById(id);
  return product?.name ? product : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: true } };

  const description =
    truncate(product.details, 155) ||
    `${product.name}${product.category ? ` — ${product.category}` : ""}, listed on OneXhib.`;

  return publicPageMetadata({
    title: [product.name, product.category].filter(Boolean).join(" — "),
    description,
    path: productPath(product.name, product.id),
    images: product.image ? [product.image.url] : undefined,
  });
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) notFound();

  if (!isCanonicalSlug(slug, product.name, product.id)) {
    permanentRedirect(productPath(product.name, product.id));
  }

  // product.createdBy is the company; product.exhibitionid the exhibition.
  // Both fail soft to null, so a missing reference just hides its link.
  const [company, exhibition] = await Promise.all([
    product.companyId ? getCompanyById(product.companyId) : Promise.resolve(null),
    product.exhibitionId ? getExhibitionById(product.exhibitionId) : Promise.resolve(null),
  ]);

  const path = productPath(product.name, product.id);
  const priceLabel = formatPrice(product.price, product.unit);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Products", path: PUBLIC_ROUTES.products },
    { name: product.name, path },
  ];

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        graph={graph(
          breadcrumbNode(trail),
          productNode(product, { path, brandName: company?.name })
        )}
      />

      <Breadcrumbs trail={trail} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          {product.image ? (
            <div className="relative aspect-square w-full">
              <Image
                src={product.image.url}
                alt={`${product.name} product image`}
                fill
                priority
                sizes="(min-width: 1024px) 512px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <CardMedia image={null} label={product.name} aspect="aspect-square" alt="" />
          )}
        </div>

        <div>
          {product.category ? (
            <p className="inline-flex rounded-full bg-[#131C55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
              {product.category}
            </p>
          ) : null}

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            {product.name}
          </h1>

          {/* Rendered only when a real positive price exists — most products
              have none, and "Price on request" would be a fabricated claim. */}
          {priceLabel ? (
            <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{priceLabel}</p>
          ) : null}

          {product.details ? (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Details</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                {product.details}
              </p>
            </div>
          ) : null}

          {company || exhibition ? (
            <dl className="mt-8 space-y-3 border-t border-gray-200 pt-6 text-[15px] dark:border-gray-800">
              {company ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-gray-500 dark:text-gray-500">Listed by</dt>
                  <dd>
                    <Link
                      href={companyPath(company.name, company.id)}
                      className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                    >
                      {company.name}
                    </Link>
                  </dd>
                </div>
              ) : null}

              {exhibition ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-gray-500 dark:text-gray-500">Showcased at</dt>
                  <dd>
                    <Link
                      href={exhibitionPath(exhibition.name, exhibition.id)}
                      className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
                    >
                      {exhibition.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </article>
  );
}
