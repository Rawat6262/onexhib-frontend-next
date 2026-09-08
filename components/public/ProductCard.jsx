import Link from "next/link";
import CardMedia from "@/components/public/CardMedia";
import { productPath } from "@/lib/routes";
import { formatPrice, truncate } from "@/lib/format";

/**
 * One product listed by an exhibiting company.
 *
 * The price line only renders when the backend actually stored a positive
 * price — most products have none, and inventing "Price on request" as if it
 * were data would be a claim the record does not make.
 *
 * /api/allproducts does not populate the owning company, so the provider name
 * is genuinely unavailable here without an N+1 fetch. The company is named on
 * the product detail page instead, which fetches it once.
 */
export default function ProductCard({ product, className = "" }) {
  const { id, name, category, details, price, unit, image } = product;
  const priceLabel = formatPrice(price, unit);

  return (
    <article
      className={`ox-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600 ${className}`}
    >
      <CardMedia
        image={image}
        alt={image ? `${name} product image` : ""}
        label={name}
        aspect="aspect-square"
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        {category ? (
          <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
            {category}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-50">
          <Link href={productPath(name, id)} className="after:absolute after:inset-0 after:content-['']">
            {name}
          </Link>
        </h3>

        {details ? (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{truncate(details, 100)}</p>
        ) : null}

        {priceLabel ? (
          <p className="mt-auto pt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{priceLabel}</p>
        ) : null}
      </div>
    </article>
  );
}
