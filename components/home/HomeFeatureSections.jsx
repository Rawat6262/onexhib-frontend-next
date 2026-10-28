import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import CardImage from "@/components/public/CardImage";
import Rail, { RailItem } from "@/components/public/Rail";
import ExhibitionCard from "@/components/public/ExhibitionCard";
import EmptyState from "@/components/public/EmptyState";
import { PUBLIC_ROUTES } from "@/lib/seo";
import { exhibitionPath, exhibitionsScopePath } from "@/lib/routes";

/**
 * Three large, picture-led sections for the home page (app/(public)/page.jsx):
 *
 *   OpenNow     - "Open this week" in display type with the week's first poster
 *                 laid over it, then this week's shows and the ones running today.
 *   ComingUp    - "Coming up" on a field of its own with three of the next
 *                 posters pinned around it like prints, then the upcoming list.
 *   HowItWorks  - Discover / Meet / List: three full-width photographs, each
 *                 verb held in the middle of the screen while its picture passes.
 *
 * All three are Server Components; every exhibition in them is in the initial
 * HTML. The rails reuse the shared ExhibitionCard, so cards look the same here
 * as everywhere else.
 */

const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const DISPLAY = "font-semibold tracking-[-0.045em] text-gray-900 dark:text-white";
const LEAD = "text-[clamp(19px,1.5vw,22px)] leading-snug text-gray-900 dark:text-gray-100";
const TEXT_LINK =
  "group inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-semibold text-[#131C55] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131C55] dark:text-blue-300";

/** A poster or logo; gone (not a broken-image icon) when a hotlinked file fails. */
function Poster({ image, sizes, alt = "" }) {
  if (!image?.url) return null;
  return (
    <CardImage
      fallback={null}
      src={image.url}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={!image.optimized}
      className="object-contain"
    />
  );
}

function RowHead({ title, cta, href }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h3 className="text-[clamp(19px,1.5vw,22px)] font-semibold text-gray-900 dark:text-white">{title}</h3>
      <Link href={href} className={TEXT_LINK}>
        {cta}
        <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    </div>
  );
}

function ExhibitionRail({ items }) {
  return (
    <Rail>
      {items.map((exhibition) => (
        <RailItem key={exhibition.id}>
          <ExhibitionCard exhibition={exhibition} className="h-full" />
        </RailItem>
      ))}
    </Rail>
  );
}

export function OpenNow({ thisWeek, ongoing, className = "" }) {
  const week = thisWeek.slice(0, 8);
  if (!week.length && !ongoing.items.length) return null;
  // A show that opened this week is also running today: list it once, in the
  // week's row, so the page never repeats the same heading (and card) twice.
  const weekIds = new Set(week.map((e) => e.id));
  const running = ongoing.items.filter((e) => !weekIds.has(e.id));
  const lead = week.find((e) => e.image?.url) || ongoing.items.find((e) => e.image?.url);

  return (
    <section aria-labelledby="open-heading" className={`overflow-hidden ${className}`}>
      <div className={`${WRAP} relative`}>
        <h2 id="open-heading" className={`${DISPLAY} ox-reveal text-[clamp(52px,10vw,150px)] leading-[0.88] whitespace-nowrap`}>
          <span className="block text-gray-500 dark:text-gray-400">Open</span>
          <span className="block">this week</span>
        </h2>

        {lead ? (
          <Link
            href={exhibitionPath(lead.name, lead.id)}
            aria-label={`Open this week: ${lead.name}`}
            className="ox-reveal relative mt-8 ml-auto block w-[62vw] max-w-[420px] rotate-[3deg] bg-white p-2 shadow-sm transition-transform duration-200 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-[#131C55] lg:absolute lg:top-[-2rem] lg:right-6 lg:mt-0 lg:w-[34vw] lg:rotate-[4deg] motion-reduce:transition-none dark:bg-gray-100"
          >
            <span className="relative block aspect-[4/3]">
              <Poster image={lead.image} alt={lead.name} sizes="(min-width: 1024px) 420px, 46vw" />
            </span>
          </Link>
        ) : null}

        {/* Below lg the poster sits under the heading instead of over it. */}
        <div className="mt-10 grid lg:grid-cols-12">
          <p className={`${LEAD} ox-reveal lg:col-span-5 lg:col-start-8`}>
            {week.length
              ? `${week.length === 8 ? "Eight or more" : week.length} ${week.length === 1 ? "exhibition opens" : "exhibitions open"} worldwide between now and Sunday. `
              : ""}
            {ongoing.total
              ? `${ongoing.total.toLocaleString("en-US")} ${ongoing.total === 1 ? "is" : "are"} running today, with visitors on the floor.`
              : "Nothing is running today; the week's openings are below."}
          </p>
        </div>
      </div>

      {week.length ? (
        <div className={`${WRAP} mt-14`}>
          <RowHead title="Opening this week" cta="See the full week" href={`${PUBLIC_ROUTES.exhibitions}/this-week`} />
          <div className="mt-6">
            <ExhibitionRail items={week} />
          </div>
        </div>
      ) : null}

      <div className={`${WRAP} mt-14`}>
        <RowHead title="Running today" cta="All ongoing exhibitions" href={exhibitionsScopePath("ongoing")} />
        <div className="mt-6">
          {running.length ? (
            <ExhibitionRail items={running} />
          ) : ongoing.items.length ? (
            <EmptyState>Everything running today is in the row above.</EmptyState>
          ) : (
            <EmptyState>No exhibitions are running right now. Browse what is coming up next.</EmptyState>
          )}
        </div>
      </div>
    </section>
  );
}

export function ComingUp({ upcoming, className = "" }) {
  const prints = upcoming.items.filter((e) => e.image?.url).slice(0, 3);
  const spots = [
    "left-[3%] top-[6%] w-[36vw] max-w-[280px] -rotate-[8deg] lg:left-[5%] lg:top-[10%] lg:w-[20vw]",
    "right-[3%] bottom-[16%] w-[36vw] max-w-[280px] rotate-[6deg] lg:right-[6%] lg:bottom-[12%] lg:w-[20vw]",
    "right-[30%] -top-12 hidden w-[13vw] max-w-[200px] -rotate-[3deg] lg:block",
  ];

  return (
    <section aria-labelledby="coming-heading" className={className}>
      <div className="relative isolate flex min-h-[78svh] items-center justify-center overflow-hidden bg-gray-100 lg:min-h-[100svh] dark:bg-white/[0.04]">
        {prints.map((e, i) => (
          <Link
            key={e.id}
            href={exhibitionPath(e.name, e.id)}
            aria-label={e.name}
            className={`absolute z-0 block bg-white p-2 shadow-sm transition-transform duration-200 hover:z-10 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-gray-100 ${spots[i]}`}
          >
            <span className="relative block aspect-[3/4]">
              <Poster image={e.image} alt={e.name} sizes="(min-width: 1024px) 300px, 36vw" />
            </span>
          </Link>
        ))}

        <h2
          id="coming-heading"
          className={`${DISPLAY} ox-reveal pointer-events-none relative z-[1] text-center text-[clamp(84px,14vw,210px)] leading-[0.85]`}
        >
          Coming
          <br />
          up
        </h2>

        <p className="absolute bottom-6 left-4 z-[1] max-w-[30ch] text-[17px] leading-relaxed text-gray-800 sm:left-6 lg:left-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] dark:text-gray-200">
          {upcoming.total
            ? `${upcoming.total.toLocaleString("en-US")} exhibitions on the calendar, from next week to next year.`
            : "The next exhibitions on the calendar."}
        </p>
      </div>

      <div className={`${WRAP} mt-14`}>
        <RowHead title="Next on the calendar" cta="All upcoming exhibitions" href={PUBLIC_ROUTES.exhibitions} />
        <div className="mt-6">
          {upcoming.items.length ? (
            <ExhibitionRail items={upcoming.items} />
          ) : (
            <EmptyState>Exhibition listings are temporarily unavailable. Please try again shortly.</EmptyState>
          )}
        </div>
      </div>
    </section>
  );
}

const STAGES = [
  {
    verb: "Discover",
    src: "/home/messe-frankfurt-grounds.jpg",
    alt: "Messe Frankfurt's exhibition grounds and the city towers behind them",
    pos: "object-[50%_55%]",
    text: "Search by name, industry, venue, city or country, and open the shows worth your time.",
  },
  {
    verb: "Meet",
    src: "/home/ifa-berlin-stand.jpg",
    alt: "An exhibitor's stand at IFA Berlin",
    pos: "object-[40%_50%]",
    text: "See which companies are exhibiting and what they bring, so you arrive knowing who you want to meet.",
  },
  {
    verb: "List",
    src: "/home/messe-frankfurt-hall-3.jpg",
    alt: "The wave roof of Hall 3 at Messe Frankfurt",
    pos: "object-[70%_60%]",
    text: "Organisers, exhibitors and service providers list their shows, companies, products and services for free.",
    action: { href: "/signup", label: "List yours" },
  },
];

export function HowItWorks({ className = "" }) {
  return (
    <section aria-labelledby="how-heading" className={className}>
      <h2 id="how-heading" className="sr-only">
        How OneXhib works
      </h2>
      {STAGES.map((s) => (
        // overflow-clip, not overflow-hidden: hidden would make this panel a
        // scroll container and stop the verb below from sticking.
        <div key={s.verb} className="relative isolate h-[90svh] overflow-clip lg:h-[100svh]">
          <Image src={s.src} alt={s.alt} fill sizes="100vw" className={`ox-drift -z-10 object-cover ${s.pos}`} />
          {/* A neutral scrim so white type holds on every part of every photograph. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/45" />
          {/* Sticky within a box that stops above the sentence: the verb holds the
              middle of the screen while its photograph passes, then leaves with it. */}
          <div className="absolute inset-x-0 top-0 bottom-40">
            <div className="sticky top-[34svh] mt-[30svh] flex justify-center">
              <h3 className="text-[clamp(72px,17vw,300px)] leading-none font-semibold tracking-[-0.05em] text-white">{s.verb}</h3>
            </div>
          </div>
          <div className={`${WRAP} absolute inset-x-0 bottom-0 pb-8`}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <p className="max-w-[34ch] text-[clamp(17px,1.5vw,22px)] leading-snug text-white">{s.text}</p>
              {s.action ? (
                <Link
                  href={s.action.href}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#131C55] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                >
                  {s.action.label}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Credit lines for the open-licence photographs (CC BY-SA requires them). */
export function PhotoCredits({ className = "" }) {
  const credits = [
    ["Festhalle Frankfurt and Messe grounds", "Paul Colin Hennig", "https://commons.wikimedia.org/w/index.php?curid=194757954"],
    ["Laurastar booth at IFA Berlin 2025", "Laurastar SA", "https://commons.wikimedia.org/w/index.php?curid=190110033"],
    ["Wave roof of Hall 3 at the Frankfurt Messe", "Paul Colin Hennig", "https://commons.wikimedia.org/w/index.php?curid=195629802"],
  ];
  return (
    <p className={`${WRAP} text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 ${className}`}>
      Photographs:{" "}
      {credits.map(([title, by, href], i) => (
        <span key={href}>
          <a href={href} className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white" rel="noopener noreferrer" target="_blank">
            {title}
          </a>{" "}
          by {by}
          {i < credits.length - 1 ? "; " : ""}
        </span>
      ))}
      , all{" "}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
        CC BY-SA 4.0
      </a>
      , via Wikimedia Commons.
    </p>
  );
}
