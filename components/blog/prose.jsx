import Link from "next/link";

/**
 * Typography primitives for blog post bodies.
 *
 * WHY POSTS ARE JSX AND NOT MDX
 * The posts were .mdx. MDX v3.1.1 (the latest) emits its own jsx() calls that
 * import react/jsx-runtime WITHOUT the "react-server" export condition, even
 * though the compiled module lands in Next's RSC layer. React then throws from
 * inside its server runtime - the "recentlyCreatedOwnerStacks" TypeError, which
 * is the symptom of exactly the misconfiguration React's own guard describes.
 * `next build` prerenders the posts through a path that sidesteps it, so only
 * `next dev` broke, which is the worse failure: invisible in CI, blocking for
 * anyone actually working on the site.
 *
 * Four config routes were tried - the mdx-components file extension, forcing
 * the production runtime, jsx: true so SWC compiles the JSX, and checking for a
 * newer loader (3.1.1 is current). None fixed it; the incompatibility is
 * upstream.
 *
 * So the posts are plain Server Components now. They render identically in dev
 * and production, drop three dependencies and all the loader plumbing, and cost
 * only slightly more ceremony to author. These primitives keep that ceremony
 * small and hold the type scale in one place, exactly as the MDX component map
 * did - the styling below is carried over from it unchanged.
 */

export const P = (props) => (
  <p className="mt-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400" {...props} />
);

export const H2 = (props) => (
  <h2
    className="mt-10 scroll-mt-24 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
    {...props}
  />
);

export const H3 = (props) => (
  <h3
    className="mt-8 scroll-mt-24 text-[17px] font-semibold text-gray-900 dark:text-gray-100"
    {...props}
  />
);

export const UL = (props) => (
  <ul
    className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400"
    {...props}
  />
);

export const B = (props) => (
  <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
);

export const Quote = (props) => (
  <blockquote
    className="mt-5 border-l-2 border-gray-200 pl-4 text-[15px] italic leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400"
    {...props}
  />
);

/** Internal link. External hrefs get a new tab and rel, as the MDX map did. */
export function A({ href = "", children, ...rest }) {
  const cls =
    "font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] dark:text-blue-300 dark:focus-visible:outline-blue-300";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

/**
 * A data table. Wide tables scroll inside their own box rather than pushing the
 * page sideways on a phone - the same rule the rest of the site follows.
 *
 * `head` is an array of column labels; `rows` an array of cell arrays. Passing
 * data rather than markup keeps a post's table readable as data in the source.
 */
export function Table({ head, rows, caption }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`border-b border-gray-200 px-3 py-2 font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100 ${
                  i > 0 ? "text-right tabular-nums" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells) => (
            <tr key={String(cells[0])}>
              {cells.map((c, i) => (
                <td
                  key={i}
                  className={`border-b border-gray-100 px-3 py-2 text-gray-600 dark:border-gray-900 dark:text-gray-400 ${
                    i > 0 ? "text-right tabular-nums" : ""
                  }`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
