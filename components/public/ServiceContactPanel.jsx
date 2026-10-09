"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, MapPin, Phone } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getExhibitionServiceContact } from "@/models/service.model";

/**
 * The one gated thing on a provider page: street address and mobile number.
 *
 * WHY THESE TWO FIELDS ARE BEHIND A SESSION. A service record holds eight
 * meaningful fields and the page above already shows six — name, category,
 * country, state, city, image. The address and the phone number are the
 * remainder, and putting them in the public HTML would mean publishing ~500
 * providers' phone numbers on crawlable pages. That is precisely what
 * address-harvesters collect, and they are the providers' numbers, not ours. The
 * page stays public and indexable; reaching a provider takes an account.
 *
 * FETCHED, NOT RENDERED-AND-HIDDEN. The details never enter the page source for
 * a signed-out visitor — they are requested after sign-in is confirmed, from an
 * endpoint that requires the session cookie. A CSS-hidden or
 * `{signedIn && ...}`-guarded value rendered on the server would still sit in
 * the RSC payload for anyone who opened view-source, which is not a gate at all.
 *
 * THE SIGNED-OUT PROMPT IS THE SERVER-RENDERED DEFAULT, including while auth is
 * still resolving. This was briefly the other way round — "loading" rendered an
 * empty shell so a signed-in visitor would not see a "Sign in" box flash — and
 * that was the wrong trade. Auth resolves from localStorage after mount, so the
 * server HTML is ALWAYS the loading state: an empty shell there meant every
 * crawler, and every visitor before hydration, saw a blank box with nothing
 * saying what was in it or how to get at it. The prompt is the honest default;
 * the cost is one frame of it for a signed-in user, which is the smaller harm.
 */
export default function ServiceContactPanel({ serviceId }) {
  const { status } = useAuth();
  const pathname = usePathname();

  const [contact, setContact] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authed" || !serviceId) return;

    // Guards against a stale response landing after the user has navigated to
    // another provider, which would show one provider's number under another's
    // name.
    let alive = true;

    setError("");
    getExhibitionServiceContact(serviceId)
      .then(({ data }) => {
        if (alive) setContact(data?.contact || null);
      })
      .catch((err) => {
        /*
         * A 401 here means the session expired. It is NOT reported in this panel:
         * the global axios interceptor in AuthProvider already signs the user out
         * and sends them to /login, so a message rendered here would be replaced
         * mid-read by a navigation.
         */
        if (!alive || err?.response?.status === 401) return;
        setError(err?.response?.data?.message || "Could not load contact details.");
      });

    return () => {
      alive = false;
    };
  }, [status, serviceId]);

  // "loading" falls through to the prompt below — see the note at the top.
  if (status !== "authed") {
    return (
      <div className={shell}>
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <Lock size={15} className="text-gray-400" aria-hidden="true" />
          Contact details
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Sign in to see this provider&apos;s address and phone number.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {/* Returns the visitor to this provider rather than a dashboard — they
              came here to reach this supplier, and losing their place is the
              quickest way to lose them at the sign-in step. */}
          <Link
            href={`/login?next=${encodeURIComponent(pathname || "")}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#131C55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E1B6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#131C55]/40 hover:text-[#131C55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131C55] motion-reduce:transition-none dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shell}>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (!contact) {
    return <div className={shell} aria-busy="true" />;
  }

  return (
    <div className={shell}>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contact details</h2>
      <dl className="mt-3 space-y-3">
        {contact.address ? (
          <div className="flex items-start gap-2.5">
            <dt className="mt-0.5 shrink-0">
              <MapPin size={15} className="text-gray-400" aria-hidden="true" />
              <span className="sr-only">Address</span>
            </dt>
            <dd className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {contact.address}
            </dd>
          </div>
        ) : null}

        {contact.mobile_number ? (
          <div className="flex items-start gap-2.5">
            <dt className="mt-0.5 shrink-0">
              <Phone size={15} className="text-gray-400" aria-hidden="true" />
              <span className="sr-only">Phone</span>
            </dt>
            <dd className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {/* tel: is what makes this one tap on a phone, which is the device
                  most of this directory is read on. The href is built from the
                  digits alone - a stored number can carry spaces and brackets
                  that some dialers refuse. */}
              <a
                href={`tel:${String(contact.mobile_number).replace(/[^\d+]/g, "")}`}
                className="font-semibold text-[#131C55] underline-offset-4 hover:underline dark:text-blue-300"
              >
                {contact.mobile_number}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

// Fixed min-height so the card does not resize when the details arrive, which
// would shift everything below it (the loading states share this shell).
const shell =
  "min-h-44 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/60";
