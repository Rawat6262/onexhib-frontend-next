import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Homepage entry point for AI search.
 *
 * WHY A BAND AND NOT A SEARCH BOX
 * The endpoint is signed-in only and costs OpenAI credit per call. Putting a
 * live input here would invite guests to type a sentence and then be told to
 * log in — the worst order to do those two things in — and would put the
 * cheapest possible trigger in front of the most expensive endpoint on the
 * site. So this explains the capability and links to /ai-search, where the form
 * checks the session before it will submit anything.
 *
 * It sits directly under the hero because discovery is the problem it solves:
 * nothing else on the page suggests you can describe what you want in a
 * sentence instead of working through filters.
 *
 * A Server Component — no JavaScript ships for it.
 */
export default function AiSearchBand() {
  return (
    <section aria-labelledby="ai-band-heading" className="mx-auto mt-16 w-full max-w-6xl px-4 sm:mt-20 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-[#131C55]/15 bg-[#131C55] dark:border-blue-400/20 dark:bg-gray-900">
        <div className="flex flex-col gap-6 p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-blue-400/15 dark:text-blue-300">
              <Sparkles size={12} aria-hidden="true" />
              New
            </span>
            <h2
              id="ai-band-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-[28px] dark:text-gray-50"
            >
              Search exhibitions in plain English
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-white/80 dark:text-gray-400">
              Describe what you are looking for — an industry, a country, a month, or all three — and
              OneXhib finds the matching trade shows. No filters to work through.
            </p>

            {/* Real examples, not invented capabilities: each of these maps to
                filters the endpoint actually supports. */}
            <ul className="mt-4 flex list-none flex-wrap gap-2">
              {[
                "Technology exhibitions in Germany in November",
                "Manufacturing trade shows in India",
                "What is on in Dubai next month?",
              ].map((example) => (
                <li
                  key={example}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/75 dark:border-gray-700 dark:text-gray-400"
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/ai-search"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#131C55] transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none lg:self-auto dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400"
          >
            Try AI search
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
