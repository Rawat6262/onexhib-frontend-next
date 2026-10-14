import { ROLES } from "@/lib/auth";

/**
 * The four account types a person can choose for themselves, described in the
 * words a visitor would use rather than the backend enum.
 *
 * ADMIN is absent on purpose: it is never self-selectable (the backend refuses
 * it), so listing it would be an option that can only fail.
 *
 * `workspace` says whether the type has a dashboard of its own. Visitor and
 * Exhibitor do not, which is exactly why they land on /welcome rather than in
 * the organiser/services area.
 */
export const ACCOUNT_TYPES = [
  {
    value: ROLES.VISITOR,
    label: "Visitor",
    summary: "Discover exhibitions and plan which ones to attend.",
    perks: ["Browse and search every exhibition", "Explore companies and products", "Join the Community"],
    workspace: false,
  },
  {
    value: ROLES.EXHIBITOR,
    label: "Exhibitor",
    summary: "You take a stand at exhibitions to show your company.",
    perks: ["Find shows that fit your industry", "Research organisers and venues", "Join the Community"],
    workspace: false,
  },
  {
    value: ROLES.ORGANISER,
    label: "Organiser",
    summary: "You run exhibitions or trade shows.",
    perks: ["List and manage your exhibitions", "An organiser dashboard", "Everything a visitor gets"],
    workspace: true,
  },
  {
    value: ROLES.EXHIBITION_SERVICE,
    label: "Service provider",
    summary: "You offer services to exhibitions — stands, logistics, AV and more.",
    perks: ["List your services in the directory", "A services dashboard", "Everything a visitor gets"],
    workspace: true,
  },
];

export function accountTypeFor(role) {
  return ACCOUNT_TYPES.find((t) => t.value === role) || null;
}
