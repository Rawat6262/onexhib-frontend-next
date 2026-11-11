import { Sparkles } from "lucide-react";

import Section from "@/components/public/Section";
import Rail, { RailItem } from "@/components/public/Rail";
import ServiceProviderCard from "@/components/public/ServiceProviderCard";
import { PUBLIC_ROUTES } from "@/lib/seo";
import { GENERAL_SUBCATEGORY } from "@/lib/service-taxonomy";

/**
 * Service providers an admin is featuring, on the home page - the services
 * counterpart of the featured exhibitions slider.
 *
 * `items` is getFeaturedServices() from lib/public-api.js: only listings still
 * inside their feature window, as public directory cards. Nothing featured (or
 * the backend unreachable) renders nothing, like the exhibitions slider - no
 * heading over an empty rail.
 *
 * The cards are the directory's own ServiceProviderCard, so each links to the
 * provider's public page; the "Featured" tag sits over the picture and takes no
 * clicks, so the whole card stays one link.
 */
export default function FeaturedServices({ items = [], className = "" }) {
  if (!items.length) return null;

  return (
    <Section
      id="featured-services"
      eyebrow="Exhibition services"
      title="Featured service providers"
      intro="Stand builders, printers, logistics and other exhibition services we are highlighting right now."
      cta="All exhibition services"
      ctaHref={PUBLIC_ROUTES.services}
      className={className}
    >
      <Rail>
        {items.map((provider) => (
          <RailItem key={provider.id}>
            <div className="relative h-full">
              <ServiceProviderCard
                // "General" on a card says nothing; show the category instead,
                // as the services rail further down does.
                provider={{
                  ...provider,
                  subcategory:
                    provider.subcategory && provider.subcategory !== GENERAL_SUBCATEGORY ? provider.subcategory : provider.service,
                }}
              />
              <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ox-navy shadow-sm ring-1 ring-black/5 dark:bg-gray-950/90 dark:text-blue-200 dark:ring-white/10">
                <Sparkles size={12} aria-hidden="true" />
                Featured
              </span>
            </div>
          </RailItem>
        ))}
      </Rail>
    </Section>
  );
}
