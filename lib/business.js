/**
 * The single source of truth for OneXhib's real business details.
 *
 * GROUND RULE, same as lib/jsonld.js: every value here was supplied by the
 * business. Nothing is inferred, rounded, or filled in to look complete.
 * The About, Contact and Terms pages and the Organization JSON-LD all read
 * from this file, so a fact cannot say one thing in prose and another in
 * structured data.
 *
 * DELIBERATELY ABSENT - do not add these without being given them:
 *   registered office address (the locality below is not a registered address)
 *   a phone number - removed at the business's request on 2026-10-14; contact is
 *     by email and the /contact form, both of which reach CONTACT_EMAIL
 *   company registration / GST / VAT number
 *   LinkedIn, X, Facebook, Instagram or any other social profile
 *   office hours, response-time commitments, support departments
 *   team size, customer counts, funding, awards, certifications
 *
 * Anything omitted must stay omitted rather than be approximated. A schema
 * property with a plausible-but-wrong value is worse than no property.
 */

/** Trading / brand name, used in visible copy and schema `name`. */
export const BRAND_NAME = "OneXhib";

/** Legal entity, used for schema `legalName` and the Terms page. */
export const LEGAL_NAME = "Onexhib";

/**
 * Public contact address, cited by Contact, Terms, Privacy and the Organization
 * JSON-LD. The /contact form delivers to this same inbox (the backend's
 * CONTACT_MAIL, which defaults to it), so the address shown and the address
 * that receives messages cannot drift apart.
 */
export const CONTACT_EMAIL = "hello@onexhib.com";

/**
 * Public location. This is a locality, NOT a registered office address - the
 * pages describe it as "based in", never as a registered address.
 */
export const LOCATION = Object.freeze({
  locality: "Ludhiana",
  region: "Punjab",
  country: "India",
});

/** Human-readable one-liner for the same place. */
export const LOCATION_LINE = `${LOCATION.locality}, ${LOCATION.region}, ${LOCATION.country}`;

/** ISO 8601. Used for schema `foundingDate` and the About page. */
export const FOUNDED_ISO = "2024-08-12";

/** The same date written for people. */
export const FOUNDED_LABEL = "12 August 2024";

/** Governing jurisdiction for the Terms page. Country only - no court named. */
export const JURISDICTION = "India";

/** Official Android app. Modelled as a SoftwareApplication, never as sameAs. */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.onexhib";
