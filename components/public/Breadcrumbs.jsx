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
      <ol className="flex list-none flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        {trail.map(({ name, path }, i) => (
          <li key={path} className="flex items-center gap-1">
            {i === last ? (
              <span aria-current="page" className="line-clamp-1 text-gray-700 dark:text-gray-300">
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
