import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Section from "@/components/public/Section";
import Rail, { RailItem } from "@/components/public/Rail";
import ServiceProviderCard from "@/components/public/ServiceProviderCard";
import { PUBLIC_ROUTES } from "@/lib/seo";
import { serviceCategoryPath } from "@/lib/routes";
import { GENERAL_SUBCATEGORY } from "@/lib/service-taxonomy";

/**
 * Exhibition services on the home page: a slider of providers, then the
 * busiest service categories as quick links into the directory.
 *
 * `directory` is getServiceDirectory() from lib/services.js - the same data the
 * /exhibition-services pages render, already stripped of owner ids, so nothing
 * here is new to the public.
 *
 * WHICH PROVIDERS. Round-robin across categories, listings with a picture
 * first, so the slider shows the range of services (stands, printing,
 * logistics...) rather than twelve printers in a row because printing happens
 * to be the biggest category.
 */
const MAX_PROVIDERS = 12;

function pickProviders(categories) {
  const queues = categories
    .filter((c) => c.count > 0 && c.slug)
    .map((c) =>
      [...c.providers]
        .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)))
        // The card's speciality line: the provider's own speciality, or the
        // category when they have none ("General" on every card says nothing).
        .map((p) => ({
          ...p,
          subcategory: p.subcategory && p.subcategory !== GENERAL_SUBCATEGORY ? p.subcategory : c.name,
        }))
    );
  const picked = [];
  const seen = new Set();
  for (let round = 0; picked.length < MAX_PROVIDERS; round++) {
    let added = false;
    for (const queue of queues) {
      const provider = queue[round];
      if (!provider || seen.has(provider.id)) continue;
      seen.add(provider.id);
      picked.push(provider);
      added = true;
      if (picked.length === MAX_PROVIDERS) break;
    }
    if (!added) break;
  }
  // Pictures first across the whole row, so the slider opens on its best cards.
  return picked.sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)));
}

export default function HomeServices({ directory, className = "" }) {
  const providers = pickProviders(directory?.categories || []);
  // Nothing listed yet: no section, rather than an empty slider under a heading.
  if (!providers.length) return null;

  const topCategories = directory.categories
    .filter((c) => c.count > 0 && c.slug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <Section
      id="services"
      eyebrow="Exhibition services"
      title="Services for your stand"
      intro="Stall fabrication, printing, furniture and LED rental, logistics, staffing and more, from providers who work at exhibitions."
      cta={directory.total ? `All ${directory.total.toLocaleString("en-US")} service providers` : "All exhibition services"}
      ctaHref={PUBLIC_ROUTES.services}
      className={className}
    >
      <Rail>
        {providers.map((provider) => (
          <RailItem key={provider.id}>
            <ServiceProviderCard provider={provider} />
          </RailItem>
        ))}
      </Rail>

      {topCategories.length ? (
        <ul className="mt-6 flex list-none flex-wrap gap-2">
          {topCategories.map((c) => (
            <li key={c.slug}>
              <Link
                href={serviceCategoryPath(c.slug)}
                className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pr-1.5 pl-3.5 text-[13px] font-medium text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] hover:shadow-sm motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-400/40 dark:hover:text-white"
              >
                {c.name}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 tabular-nums dark:bg-gray-800 dark:text-gray-400">
                  {c.count}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={PUBLIC_ROUTES.services}
              className="group inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 text-[13px] font-semibold text-[#131C55] hover:underline dark:text-blue-300"
            >
              Every category
              <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </li>
        </ul>
      ) : null}
    </Section>
  );
}
