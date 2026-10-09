import Link from "next/link";
import { MapPin } from "lucide-react";

import CardMedia from "@/components/public/CardMedia";
import { servicePath } from "@/lib/routes";

/**
 * One service provider in the directory grid.
 *
 * IT LINKS TO THE PROVIDER PAGE. It deliberately did not, while there was no
 * such page: a record holds only two things beyond this card — the street
 * address and the mobile number — and both are withheld from the public shape by
 * lib/public-api.js, because a phone number on a crawlable page is what
 * address-harvesters collect. The detail page exists now and keeps that rule:
 * it is public and indexable, and those two fields sit behind a session in
 * ServiceContactPanel.
 *
 * THE IMAGE IS THE POINT. All but a couple of providers carry one, and they are
 * all on Cloudinary, so each goes through next/image's optimiser
 * (`optimized: true` from toPublicImage). A directory of names and towns reads
 * as a spreadsheet; the image is what makes a stall builder or a print shop
 * recognisable at a glance.
 * CardMedia draws a branded initials placeholder for the handful without one,
 * so the grid never has a hole in it.
 */
export default function ServiceProviderCard({ provider, priority = false }) {
  const name = provider.name || "Service provider";
  const place = [provider.city, provider.state, provider.country].filter(Boolean).join(", ");

  return (
    <Link
      href={servicePath(name, provider.id)}
      className="ox-card flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-[#131C55]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
    >
      <CardMedia
        image={provider.image}
        /* The provider's own name, not "image of ...": a screen reader reaching
           this card needs to know whose listing it is, and the heading below is
           the same string, so the alt stays short rather than duplicating the
           location too. */
        alt={name}
        label={name}
        aspect="aspect-[4/3]"
        /* Only the first row is eager. With up to 132 providers on a page, the
           rest load as they scroll - which is next/image's default and the
           reason this page can carry that many images at all. */
        priority={priority}
        sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
      />

      <div className="flex flex-1 flex-col p-4">
        {/* Plain React text. A provider-supplied string never goes near an HTML sink. */}
        <h3 className="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50">
          {name}
        </h3>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          {place || "Location not stated"}
        </p>
      </div>
    </Link>
  );
}
