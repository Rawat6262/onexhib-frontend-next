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
export default function ServiceProviderCard({
  provider,
  priority = false,
  /*
   * Defaults to true so a caller that knows nothing about the page's organisation
   * still shows the provider everything it has. ServiceDirectory, which does know,
   * turns it off wherever the speciality is already stated above the grid.
   */
  showSpeciality = true,
}) {
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
        {/*
          THE NAME, CLAMPED TO TWO LINES WITH THE SPACE FOR TWO ALWAYS RESERVED.

          This is what makes a row of cards line up. Business names run from "AANYA
          GRAPHICS" to "Angad Flex Printing 3D Letters Acrylic Letters", so a name
          that wrapped pushed its own location line down and nothing across the row
          agreed any more - the grid read as four independent columns rather than one
          table.

          min-h-9.5 is two lines at this size (text-sm x leading-snug ~ 19px), so a
          one-line name reserves the second line rather than collapsing. Clamping at
          two keeps the worst case from doing the same thing in reverse.

          Plain React text. A provider-supplied string never goes near an HTML sink.
        */}
        <h3 className="line-clamp-2 min-h-9.5 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50">
          {name}
        </h3>
        {/*
          THE SPECIALITY, only when the page is not already organised by it.

          The card used to print it unconditionally, which put "Catalog Printing" on
          all 132 cards inside a section headed CATALOG PRINTING - the exact mistake
          the note here warned about for the category, repeated one level down. When
          the grid is grouped, the heading says it once; when the page holds a single
          speciality, every card shares it. Either way it is noise on the card.

          It comes from the taxonomy, never from provider free text - lib/public-api.js
          pulls any value that is not a real subcategory of the listing's category back
          to the neutral one - so this line cannot be used to write arbitrary text onto
          a public page.
        */}
        {showSpeciality && provider.subcategory ? (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-[#131C55] dark:text-blue-300">
            {provider.subcategory}
          </p>
        ) : null}
        {/*
          THE LOCATION SITS ON THE CARD'S FLOOR, not under whatever precedes it.

          mt-auto takes up the slack inside the flex column, so the location of every
          card in a row shares one baseline whether or not the card above it has a
          speciality line. Together with the reserved two lines for the name, that is
          the whole alignment fix: two fixed blocks and one that floats to the bottom.

          Clamped to one line, because "Channapatna, Karnataka, India" wrapping on a
          narrow column would reintroduce the ragged edge this is removing.
        */}
        <p className="mt-auto flex items-start gap-1.5 pt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          <span className="line-clamp-1">{place || "Location not stated"}</span>
        </p>
      </div>
    </Link>
  );
}
