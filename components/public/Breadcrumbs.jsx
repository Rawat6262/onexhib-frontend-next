import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Visible breadcrumb trail. Pair it with breadcrumbNode() from lib/jsonld.js
 * on the same page, passing the identical trail — structured breadcrumbs should
 * describe navigation the user can actually see and click.
 *
 * `trail` is [{ name, path }]; the final entry renders as plain text because a
 * link to the current page is noise.
 */
export default function Breadcrumbs({ trail }) {
  if (!trail?.length) return null;
  const last = trail.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="inline-flex max-w-full list-none flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-[13px] text-gray-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
        {trail.map(({ name, path }, i) => (
          <li key={path} className="flex items-center gap-1">
            {i === last ? (
              <span aria-current="page" className="line-clamp-1 font-medium text-gray-900 dark:text-gray-100">
                {name}
              </span>
            ) : (
              <>
                <Link
                  href={path}
                  className="underline-offset-4 transition hover:text-[#131C55] hover:underline motion-reduce:transition-none dark:hover:text-white"
                >
                  {name}
                </Link>
                <ChevronRight size={14} aria-hidden="true" className="text-gray-300 dark:text-gray-600" />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
