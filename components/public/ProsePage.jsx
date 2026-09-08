import Breadcrumbs from "@/components/public/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, graph } from "@/lib/jsonld";

/**
 * Shell for the site's prose pages: About, Contact, Terms.
 *
 * WHY THESE LIVE IN (public) AND NOT ALONGSIDE THE PRIVACY POLICY
 * /privacy-policy and /delete-account predate the public site and render their
 * own standalone chrome (components/legal/LegalPageLayout.jsx) - centred logo,
 * no site header, no footer. That was right when they were the only public
 * URLs. It is wrong for trust pages: the whole point of an About or Contact
 * page is to look unmistakably like the same company as the rest of the site,
 * and to be reachable from the footer that carries every other public link.
 *
 * So these use the normal public layout - shared header, shared footer,
 * breadcrumbs - and the same measure and type scale as the legal pages
 * (max-w-3xl) so the two families still read as siblings.
 *
 * The BreadcrumbList JSON-LD is emitted here rather than in each page, so a
 * page cannot ship visible breadcrumbs without the matching structured data.
 */
export default function ProsePage({ title, intro, trail, children, aside }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd graph={graph(breadcrumbNode(trail))} />

      <Breadcrumbs trail={trail} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {title}
        </h1>
        {intro ? (
          <p className="mt-4 text-[17px] leading-relaxed text-gray-600 dark:text-gray-400">
            {intro}
          </p>
        ) : null}
      </header>

      {aside}

      <div className="mt-10 space-y-10">{children}</div>
    </div>
  );
}

/** One titled prose section. Mirrors Section in the legal layout. */
export function ProseSection({ title, id, children }) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </section>
  );
}
