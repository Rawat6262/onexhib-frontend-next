import { ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/faq";

/**
 * FAQ accordion built on native <details>/<summary>.
 *
 * No JavaScript and no client component: the answers are present in the server
 * HTML whether or not a panel is open, so a crawler reads every one of them.
 * That is also what makes the FAQPage structured data in JsonLd.jsx legitimate
 * — the marked-up answers are genuinely on the page.
 */
export default function Faq() {
  return (
    <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {FAQ.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none [&::-webkit-details-marker]:hidden">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{q}</h3>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className="shrink-0 text-gray-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{a}</p>
        </details>
      ))}
    </div>
  );
}
