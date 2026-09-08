import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import CardMedia from "@/components/public/CardMedia";
import { companyPath } from "@/lib/routes";
import { truncate } from "@/lib/format";

/**
 * One exhibiting company.
 *
 * Note what is NOT here: email, phone and pincode. /api/allcompanies returns
 * all three to any anonymous caller, and lib/public-api.js drops them before
 * they ever reach a component. Do not add them back.
 */
export default function CompanyCard({ company, className = "" }) {
  const { id, name, nature, about, address, image } = company;

  return (
    <article
      className={`ox-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-[#131C55]/30 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600 ${className}`}
    >
      <CardMedia
        image={image}
        alt={image ? `${name} company logo` : ""}
        label={name}
        aspect="aspect-[16/9]"
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        {nature ? (
          <p className="line-clamp-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#131C55] dark:text-blue-300">
            <Building2 size={12} aria-hidden="true" />
            {nature}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-50">
          <Link href={companyPath(name, id)} className="after:absolute after:inset-0 after:content-['']">
            {name}
          </Link>
        </h3>

        {about ? (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{truncate(about, 110)}</p>
        ) : null}

        {address ? (
          <p className="mt-auto flex items-start gap-2 pt-1 text-sm text-gray-500 dark:text-gray-500">
            <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
            <span className="line-clamp-1">{address}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
