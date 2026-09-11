import Link from "next/link";
import { CalendarDays, Building2, Wrench } from "lucide-react";

import ProsePage, { ProseSection } from "@/components/public/ProsePage";
import JsonLd from "@/components/seo/JsonLd";

import { PUBLIC_ROUTES, publicPageMetadata } from "@/lib/seo";
import { graph, softwareApplicationNode } from "@/lib/jsonld";
import { getCounts, getUpcomingExhibitions } from "@/lib/public-api";
import { SERVICE_CATEGORIES } from "@/lib/public-api";
import {
  BRAND_NAME,
  FOUNDED_ISO,
  FOUNDED_LABEL,
  LOCATION_LINE,
  PLAY_STORE_URL,
} from "@/lib/business";

/**
 * /about - who publishes this catalogue.
 *
 * Every factual claim here is either supplied by the business (lib/business.js)
 * or counted live from the catalogue. There are deliberately no statements
 * about users, traffic, partnerships, funding, team size, market position or
 * customer outcomes, because the product holds no data for any of them.
 *
 * The catalogue figures are fetched rather than written down so the page cannot
 * go stale into a false claim, and both fetchers fail soft - if the API is
 * unavailable the sentence about scale simply does not render.
 */

export const revalidate = 300;

export const metadata = publicPageMetadata({
  title: "About the exhibition discovery platform",
  description:
    "An exhibition and trade-show discovery platform connecting organisers, exhibitors and service providers. Founded 2024, based in Ludhiana, India.",
  path: "/about",
});

export default async function AboutPage() {
  const [counts, upcoming] = await Promise.all([
    getCounts(),
    getUpcomingExhibitions({ limit: 1 }),
  ]);

  const n = (v) => (typeof v === "number" && v > 0 ? v.toLocaleString("en-US") : null);
  const upcomingTotal = n(upcoming?.total);
  const exhibitionsTotal = n(counts?.exhibitions);

  const trail = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ];

  return (
    <>
      {/* The Android app is a real, verifiable property of this organisation and
          is linked visibly further down, so the node describes something the
          page actually states. It is modelled as a SoftwareApplication rather
          than stuffed into Organization.sameAs, which is for pages that
          identify the ORGANISATION, not one of its products. */}
      <JsonLd graph={graph(softwareApplicationNode())} />

      <ProsePage
        title={`About ${BRAND_NAME}`}
        intro="OneXhib brings exhibitions and trade shows from around the world into one place — with their dates, venues and categories, the companies exhibiting at them, and the products those companies bring."
        trail={trail}
      >
        <ProseSection id="what-we-do" title="What OneXhib does">
          <p>
            Exhibitions are how a great deal of business gets done, but finding the right one is
            harder than it should be. Event information is scattered across organiser websites,
            venue calendars and trade publications, each covering a slice of the picture and none
            of them comparable with the others.
          </p>
          <p>
            OneXhib is a discovery platform that pulls that information together. You can browse
            exhibitions by{" "}
            <Link href={PUBLIC_ROUTES.locations} className={link}>
              city and country
            </Link>{" "}
            or by{" "}
            <Link href={PUBLIC_ROUTES.categories} className={link}>
              industry
            </Link>
            , see when and where each one runs, and — where organisers have added them — the
            companies exhibiting and the products they are showcasing.
          </p>
          {upcomingTotal || exhibitionsTotal ? (
            <p>
              The catalogue currently holds{" "}
              {exhibitionsTotal ? (
                <strong className="font-semibold text-gray-900 dark:text-gray-100">
                  {exhibitionsTotal} exhibitions
                </strong>
              ) : null}
              {exhibitionsTotal && upcomingTotal ? ", of which " : null}
              {upcomingTotal ? (
                <strong className="font-semibold text-gray-900 dark:text-gray-100">
                  {upcomingTotal} are still to come
                </strong>
              ) : null}
              . These figures are counted from the live catalogue whenever this page is rebuilt,
              not written down.
            </p>
          ) : null}
        </ProseSection>

        <ProseSection id="who-its-for" title="Who it is for">
          <p>OneXhib serves three groups, and each has a different job to do on the platform.</p>
          <ul className="mt-4 list-none space-y-4">
            {[
              {
                icon: CalendarDays,
                title: "Organisers",
                body: "List an exhibition with its dates, venue, category and description, so the people looking for that event can find it.",
              },
              {
                icon: Building2,
                title: "Exhibitors",
                body: "Appear on the exhibitions you are taking part in, describe what your business does, and add the products you are showcasing.",
              },
              {
                icon: Wrench,
                title: "Service providers",
                body: `Offer the services exhibitors need to prepare for a show, across ${SERVICE_CATEGORIES.length} categories from stall fabrication to catalogue printing.`,
              },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#131C55]/10 text-[#131C55] dark:bg-blue-400/10 dark:text-blue-300">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">{title}</strong>
                  <span className="mt-0.5 block">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </ProseSection>

        <ProseSection id="browsing" title="Browsing without an account">
          <p>
            Every exhibition, company and product page on OneXhib is public. You do not need an
            account to browse the catalogue, search it, or open any listing — an account is only
            needed to add or manage your own listings.
          </p>
          <p>
            Start with{" "}
            <Link href={PUBLIC_ROUTES.exhibitions} className={link}>
              upcoming exhibitions
            </Link>
            , the{" "}
            <Link href={PUBLIC_ROUTES.companies} className={link}>
              companies exhibiting
            </Link>
            , the{" "}
            <Link href={PUBLIC_ROUTES.products} className={link}>
              products on show
            </Link>
            , or{" "}
            <Link href={PUBLIC_ROUTES.services} className={link}>
              exhibition services
            </Link>
            .
          </p>
        </ProseSection>

        <ProseSection id="app" title="On Android">
          <p>
            OneXhib is also available as an Android app on the Google Play Store.
          </p>
          <p>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              Get OneXhib on Google Play
            </a>
          </p>
        </ProseSection>

        <ProseSection id="company" title="The company">
          <p>
            OneXhib was founded on{" "}
            <time dateTime={FOUNDED_ISO}>{FOUNDED_LABEL}</time> and is based in {LOCATION_LINE}.
          </p>
          <p>
            For anything you cannot find here, the{" "}
            <Link href="/contact" className={link}>
              contact page
            </Link>{" "}
            has our email and phone number. Our{" "}
            <Link href="/terms" className={link}>
              terms of use
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className={link}>
              privacy policy
            </Link>{" "}
            set out how the platform may be used and how we handle your information.
          </p>
        </ProseSection>
      </ProsePage>
    </>
  );
}

const link =
  "font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300";
