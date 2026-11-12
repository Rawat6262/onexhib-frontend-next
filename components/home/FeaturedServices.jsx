import Section from "@/components/public/Section";
import FeaturedSlider from "@/components/public/FeaturedSlider";
import { PUBLIC_ROUTES } from "@/lib/seo";
import { GENERAL_SUBCATEGORY } from "@/lib/service-taxonomy";

/**
 * Service providers an admin is featuring, near the bottom of the home page
 * just above the services rail, in the same slider as the featured
 * exhibitions at the top, so the two spotlights read as one design.
 *
 * `items` is getFeaturedServices() from lib/public-api.js: only listings still
 * inside their feature window. Nothing featured (or the backend unreachable)
 * renders nothing - no heading over an empty slider. Each slide links to the
 * provider's public page.
 */
export default function FeaturedServices({ items = [], className = "" }) {
  if (!items.length) return null;

  // "General" says nothing on a slide; the speciality tile then simply drops out.
  const slides = items.map((s) => ({ ...s, subcategory: s.subcategory === GENERAL_SUBCATEGORY ? null : s.subcategory }));

  return (
    <Section
      id="featured-services"
      eyebrow="Spotlight"
      title="Featured services"
      intro="Stand builders, printers, logistics and other exhibition services worth knowing about."
      cta="All exhibition services"
      ctaHref={PUBLIC_ROUTES.services}
      className={className}
    >
      <FeaturedSlider items={slides} kind="service" />
    </Section>
  );
}
